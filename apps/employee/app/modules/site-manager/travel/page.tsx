"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, Plane, Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ErrorState, EmptyState } from "@/components/common/states";
import { formatCurrency, formatDate } from "@/lib/format";
import { apiFetch } from "@/lib/api";
import type { CrmEvent } from "@/modules/crm/types";

type TravelDetail = {
  id: string;
  eventId: string | null;
  from: string;
  to: string;
  travelDate: string;
  mode: string;
  amount: number | null;
  createdAt: string;
};

const TRAVEL_MODES = ["Car", "Train", "Flight", "Bus", "Other"];

export default function TravelPage() {
  const queryClient = useQueryClient();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [mode, setMode] = useState(TRAVEL_MODES[0]);
  const [amount, setAmount] = useState("");
  const [eventId, setEventId] = useState("");

  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: () => apiFetch<CrmEvent[]>("/api/employee/events"),
  });

  const { data: travel, isPending, isError, refetch } = useQuery({
    queryKey: ["travel"],
    queryFn: () => apiFetch<TravelDetail[]>("/api/employee/travel"),
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<TravelDetail>("/api/employee/travel", {
        method: "POST",
        body: {
          from,
          to,
          travelDate,
          mode,
          amount: amount === "" ? undefined : Number(amount),
          eventId: eventId || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Travel record added");
      setFrom("");
      setTo("");
      setTravelDate("");
      setMode(TRAVEL_MODES[0]);
      setAmount("");
      setEventId("");
      queryClient.invalidateQueries({ queryKey: ["travel"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const canSubmit =
    !mutation.isPending &&
    from.trim() !== "" &&
    to.trim() !== "" &&
    travelDate !== "";

  const eventMap = new Map((events ?? []).map((event) => [event.id, event]));

  return (
    <AppShell
      title="Travel"
      subtitle="Record travel details and claims."
      icon={<Plane className="size-5" />}
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2 lg:h-fit">
          <CardHeader>
            <CardTitle>New Trip</CardTitle>
            <CardDescription>Record a travel entry</CardDescription>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="travel-from">From</Label>
                <Input
                  id="travel-from"
                  placeholder="e.g. Mumbai"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="travel-to">To</Label>
                <Input
                  id="travel-to"
                  placeholder="e.g. Pune"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="travel-date">Travel Date</Label>
              <Input
                id="travel-date"
                type="date"
                value={travelDate}
                onChange={(event) => setTravelDate(event.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="travel-mode">Mode</Label>
              <Select
                value={mode}
                onValueChange={(value) => setMode(value ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRAVEL_MODES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="travel-amount">Amount (₹) (optional)</Label>
              <Input
                id="travel-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 850"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="travel-event">Related Event (optional)</Label>
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

            <Button type="submit" disabled={!canSubmit}>
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Add Travel
            </Button>
          </form>
        </Card>

        <div className="lg:col-span-3">
          {isPending ? (
            <div className="h-64 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
          ) : isError ? (
            <ErrorState message="Could not load your travel records" onRetry={refetch} />
          ) : travel && travel.length > 0 ? (
            <Card className="p-0">
              <div className="border-b border-white/10 px-6 py-4">
                <h3 className="text-base font-semibold tracking-tight text-white/90">
                  Travel History
                </h3>
                <p className="mt-0.5 text-xs text-white/60">
                  All your recorded trips.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-white/60">
                      <th className="px-6 py-3.5 font-semibold">Date</th>
                      <th className="px-6 py-3.5 font-semibold">Route</th>
                      <th className="px-6 py-3.5 font-semibold">Mode</th>
                      <th className="px-6 py-3.5 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {travel.map((record) => (
                      <tr
                        key={record.id}
                        className="transition-colors hover:bg-white/[0.04]"
                      >
                        <td className="whitespace-nowrap px-6 py-4 text-white/60">
                          {formatDate(record.travelDate)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-2 text-white/90">
                            {record.from}
                            <ArrowRight className="size-3.5 text-violet-400" />
                            {record.to}
                          </span>
                          {record.eventId && eventMap.get(record.eventId) ? (
                            <span className="mt-0.5 block text-xs text-violet-300/80">
                              {eventMap.get(record.eventId)?.eventName}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-6 py-4">
                          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/70">
                            {record.mode}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-semibold text-white/90">
                          {record.amount !== null
                            ? formatCurrency(record.amount)
                            : "—"}
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
                message="No travel records yet"
                sub="Trips you record will appear here."
              />
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
