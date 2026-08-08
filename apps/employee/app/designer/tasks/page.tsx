"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, GripVertical, ListTodo } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorState, EmptyState } from "@/components/common/states";
import { EventStatusBadge } from "@/components/crm/event-status-badge";
import type { CrmEvent } from "@/lib/crm-types";
import { formatDate } from "@/lib/format";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type TaskStatus = "PENDING" | "IN_PROGRESS" | "DONE";

type EmployeeTask = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: TaskStatus;
};

const COLUMNS: {
  key: TaskStatus;
  label: string;
  headerClass: string;
  dotClass: string;
}[] = [
  {
    key: "PENDING",
    label: "Pending",
    headerClass: "bg-amber-500/15 text-amber-300",
    dotClass: "bg-amber-400",
  },
  {
    key: "IN_PROGRESS",
    label: "In Progress",
    headerClass: "bg-violet-500/15 text-violet-300",
    dotClass: "bg-violet-400",
  },
  {
    key: "DONE",
    label: "Done",
    headerClass: "bg-emerald-500/15 text-emerald-300",
    dotClass: "bg-emerald-400",
  },
];

function dueInfo(due: string | null): {
  label: string;
  tone: "danger" | "warning" | "neutral";
} | null {
  if (!due) {
    return null;
  }
  const dueDate = new Date(due);
  const today = new Date();
  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round(
    (startOfDay(dueDate).getTime() - startOfDay(today).getTime()) / 86400000,
  );

  if (diff < 0) return { label: `Overdue ${Math.abs(diff)}d`, tone: "danger" };
  if (diff === 0) return { label: "Due today", tone: "warning" };
  if (diff === 1) return { label: "Tomorrow", tone: "warning" };
  return { label: `${diff}d left`, tone: "neutral" };
}

function AssignedEventsSection({ events }: { events: CrmEvent[] }) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Assigned Events
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Checklist progress for events assigned to you.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => {
          const total = event.crmChecklist.length;
          const done = event.crmChecklist.filter((item) => item.completed).length;
          const progress = total > 0 ? Math.round((done / total) * 100) : 0;
          const allDone = total > 0 && done === total;
          return (
            <Link
              key={event.id}
              href={`/crm/events/${event.id}`}
              className="group rounded-xl bg-card p-5 ring-1 ring-foreground/10 transition-all duration-300 hover:-translate-y-0.5 hover:ring-violet-500/40 hover:shadow-[0_8px_40px_rgba(139,92,246,0.18)]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-violet-600">
                  {event.eventCode}
                </span>
                <EventStatusBadge status={event.status} />
              </div>
              <h3 className="mt-3 line-clamp-1 text-sm font-semibold tracking-tight text-foreground">
                {event.eventName}
              </h3>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {done} of {total} checklist tasks
                </span>
                {allDone ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                    <Check className="size-3.5" /> Complete
                  </span>
                ) : null}
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function DesignerTasksPage() {
  const queryClient = useQueryClient();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => apiFetch<EmployeeTask[]>("/api/employee/tasks"),
  });

  const { data: assignedEvents = [] } = useQuery({
    queryKey: ["crm-events"],
    queryFn: () => apiFetch<CrmEvent[]>("/api/employee/crm/events"),
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      apiFetch<EmployeeTask>(`/api/employee/tasks/${id}/status`, {
        method: "PATCH",
        body: { status },
      }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previous = queryClient.getQueryData<EmployeeTask[]>(["tasks"]);
      if (previous) {
        queryClient.setQueryData(
          ["tasks"],
          previous.map((task) =>
            task.id === id ? { ...task, status } : task,
          ),
        );
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["tasks"], context.previous);
      }
      toast.error("Could not update task status");
    },
    onSuccess: () => {
      toast.success("Task moved");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  function handleDrop(status: TaskStatus, taskId: string) {
    if (mutation.isPending) {
      return;
    }
    const task = data?.find((item) => item.id === taskId);
    if (!task || task.status === status) {
      return;
    }
    mutation.mutate({ id: taskId, status });
  }

  const tasks = data ?? [];
  const isDragging = draggingId !== null;

  return (
    <AppShell
      title="Task Board"
      subtitle="Drag tasks between columns to update their status."
      icon={<ListTodo className="size-5" />}
    >
      {!isPending && !isError ? (
        <AssignedEventsSection events={assignedEvents} />
      ) : null}

      {isPending ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-72 animate-pulse rounded-3xl border border-white/10 bg-white/5"
            />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message="Could not load your tasks" onRetry={refetch} />
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-3">
          {COLUMNS.map((column) => {
            const columnTasks = tasks.filter(
              (task) => task.status === column.key,
            );
            const isOver =
              isDragging && dragOverColumn === column.key;

            return (
              <div
                key={column.key}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverColumn(column.key);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const taskId = event.dataTransfer.getData("text/plain");
                  setDragOverColumn(null);
                  setDraggingId(null);
                  if (taskId) {
                    handleDrop(column.key, taskId);
                  }
                }}
                className={cn(
                  "flex min-h-64 flex-col gap-3 rounded-3xl border p-3 transition-colors duration-200",
                  isOver
                    ? "border-violet-500/50 bg-violet-500/10"
                    : "border-white/10 bg-white/[0.03]",
                )}
              >
                <div className="flex items-center justify-between px-1 pt-1">
                  <span
                    className={cn(
                      "flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                      column.headerClass,
                    )}
                  >
                    <span
                      className={cn("size-1.5 rounded-full", column.dotClass)}
                    />
                    {column.label}
                  </span>
                  <span className="text-xs font-semibold text-white/60">
                    {columnTasks.length}
                  </span>
                </div>

                {columnTasks.length > 0 ? (
                  columnTasks.map((task) => {
                    const due = dueInfo(task.dueDate);
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", task.id);
                          event.dataTransfer.effectAllowed = "move";
                          setDraggingId(task.id);
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDragOverColumn(null);
                        }}
                        className={cn(
                          "group cursor-grab rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur-xl transition-all duration-200 active:cursor-grabbing",
                          draggingId === task.id && "opacity-40",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-semibold text-white/90">
                            {task.title}
                          </h4>
                          <GripVertical className="size-4 shrink-0 text-white/30 transition-colors group-hover:text-white/60" />
                        </div>

                        {task.description ? (
                          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-white/60">
                            {task.description}
                          </p>
                        ) : null}

                        <div className="mt-3 flex items-center justify-between gap-2">
                          {task.dueDate ? (
                            <span className="flex items-center gap-1.5 text-[11px] text-white/60">
                              <CalendarDays className="size-3" />
                              {formatDate(task.dueDate)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-white/40">
                              No due date
                            </span>
                          )}
                          {due ? (
                            <Badge tone={due.tone} dot={false}>
                              {due.label}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-white/10 py-8">
                    <p className="text-xs text-white/40">No tasks</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isPending && !isError && tasks.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            message="You have no tasks assigned"
            sub="New tasks will appear here when assigned to you."
          />
        </Card>
      ) : null}
    </AppShell>
  );
}
