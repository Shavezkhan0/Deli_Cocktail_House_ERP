"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Receipt, Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorState, EmptyState } from "@/components/common/states";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { apiFetch } from "@/lib/api";
import type { CrmEvent } from "@/modules/crm/types";

type ExpenseEntry = {
  id: string;
  eventId: string | null;
  amount: number;
  description: string;
  receiptUrl: string | null;
  status: string;
  createdAt: string;
};

const STATUS_TONE: Record<string, "warning" | "success" | "danger"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

export default function ExpensesPage() {
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [eventId, setEventId] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");

  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: () => apiFetch<CrmEvent[]>("/api/employee/events"),
  });

  const { data: expenses, isPending, isError, refetch } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => apiFetch<ExpenseEntry[]>("/api/employee/expenses"),
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<ExpenseEntry>("/api/employee/expenses", {
        method: "POST",
        body: {
          amount: Number(amount),
          description,
          eventId: eventId || undefined,
          receiptUrl: receiptUrl || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Expense submitted");
      setAmount("");
      setDescription("");
      setEventId("");
      setReceiptUrl("");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const canSubmit =
    !mutation.isPending && amount !== "" && description.trim() !== "";

  const eventMap = new Map((events ?? []).map((event) => [event.id, event]));

  return (
    <AppShell
      title="Expenses"
      subtitle="Submit and track your expense claims."
      icon={<Receipt className="size-5" />}
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2 lg:h-fit">
          <CardHeader>
            <CardTitle>New Expense</CardTitle>
            <CardDescription>Record an expense claim</CardDescription>
          </CardHeader>
          <form
            className="mt-5 flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (canSubmit) {
                mutation.mutate();
              }
            }}
          >
            <div>
              <Label htmlFor="expense-amount">Amount (₹)</Label>
              <Input
                id="expense-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 1500"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="expense-description">Description</Label>
              <Textarea
                id="expense-description"
                placeholder="What was this expense for?"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="expense-event">Related Event (optional)</Label>
              <Select
                value={eventId}
                onValueChange={(value) => setEventId(value ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {events?.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.eventName} — {event.eventCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="expense-receipt">Receipt URL (optional)</Label>
              <Input
                id="expense-receipt"
                type="url"
                placeholder="https://..."
                value={receiptUrl}
                onChange={(event) => setReceiptUrl(event.target.value)}
              />
            </div>

            <Button type="submit" disabled={!canSubmit}>
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Submit Expense
            </Button>
          </form>
        </Card>

        <div className="lg:col-span-3">
          {isPending ? (
            <div className="h-64 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
          ) : isError ? (
            <ErrorState message="Could not load your expenses" onRetry={refetch} />
          ) : expenses && expenses.length > 0 ? (
            <Card className="p-0">
              <div className="border-b border-white/10 px-6 py-4">
                <h3 className="text-base font-semibold tracking-tight text-white/90">
                  Expense History
                </h3>
                <p className="mt-0.5 text-xs text-white/60">
                  All your submitted claims.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-white/60">
                      <th className="px-6 py-3.5 font-semibold">Date</th>
                      <th className="px-6 py-3.5 font-semibold">Description</th>
                      <th className="px-6 py-3.5 font-semibold">Amount</th>
                      <th className="px-6 py-3.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {expenses.map((expense) => (
                      <tr
                        key={expense.id}
                        className="transition-colors hover:bg-white/[0.04]"
                      >
                        <td className="whitespace-nowrap px-6 py-4 text-white/60">
                          {formatDateTime(expense.createdAt)}
                        </td>
                        <td className="max-w-56 px-6 py-4">
                          <p className="truncate text-white/90">
                            {expense.description}
                          </p>
                          {expense.eventId && eventMap.get(expense.eventId) ? (
                            <p className="mt-0.5 text-xs text-violet-300/80">
                              {eventMap.get(expense.eventId)?.eventName}
                            </p>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-semibold text-white/90">
                          {formatCurrency(expense.amount)}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={STATUS_TONE[expense.status] === "danger" ? "destructive" : STATUS_TONE[expense.status] === "success" ? "default" : "secondary"}>
                            {expense.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card>
              <EmptyState
                message="No expenses submitted yet"
                sub="Your claims will show up here."
              />
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
