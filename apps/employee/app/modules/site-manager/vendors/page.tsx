"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Phone, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ErrorState, EmptyState } from "@/components/common/states";
import { formatDate } from "@/lib/format";
import { apiFetch } from "@/lib/api";
import type { CrmEvent } from "@/modules/crm/types";

type VendorContact = {
  id: string;
  name: string;
  phone: string;
  category: string;
  eventId: string | null;
  notes: string | null;
  createdAt: string;
};

export default function VendorsPage() {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("");
  const [eventId, setEventId] = useState("");
  const [notes, setNotes] = useState("");

  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: () => apiFetch<CrmEvent[]>("/api/employee/events"),
  });

  const { data: vendors, isPending, isError, refetch } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => apiFetch<VendorContact[]>("/api/employee/vendors"),
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<VendorContact>("/api/employee/vendors", {
        method: "POST",
        body: {
          name,
          phone,
          category,
          eventId: eventId || undefined,
          notes: notes || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Vendor added");
      setName("");
      setPhone("");
      setCategory("");
      setEventId("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const canSubmit =
    !mutation.isPending &&
    name.trim() !== "" &&
    phone.trim() !== "" &&
    category.trim() !== "";

  const eventMap = new Map((events ?? []).map((event) => [event.id, event]));

  return (
    <AppShell
      title="Vendors"
      subtitle="Manage your vendor contacts."
      icon={<Users className="size-5" />}
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2 lg:h-fit">
          <CardHeader title="Add Vendor" subtitle="Save a vendor contact" />
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
              <Label htmlFor="vendor-name">Name</Label>
              <Input
                id="vendor-name"
                placeholder="e.g. Metro Wine & Spirits"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="vendor-phone">Phone</Label>
              <Input
                id="vendor-phone"
                type="tel"
                placeholder="e.g. +91 98xxxxxx00"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="vendor-category">Category</Label>
              <Input
                id="vendor-category"
                placeholder="e.g. Liquor, Decor, Staffing"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="vendor-event">Related Event (optional)</Label>
              <Select
                id="vendor-event"
                value={eventId}
                onChange={(event) => setEventId(event.target.value)}
              >
                <option value="">None</option>
                {events?.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.eventName} — {event.eventCode}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="vendor-notes">Notes (optional)</Label>
              <Textarea
                id="vendor-notes"
                placeholder="Anything to remember about this vendor"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>

            <Button type="submit" disabled={!canSubmit}>
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Add Vendor
            </Button>
          </form>
        </Card>

        <div className="lg:col-span-3">
          {isPending ? (
            <div className="h-64 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
          ) : isError ? (
            <ErrorState message="Could not load your vendors" onRetry={refetch} />
          ) : vendors && vendors.length > 0 ? (
            <Card className="p-0">
              <div className="border-b border-white/10 px-6 py-4">
                <h3 className="text-base font-semibold tracking-tight text-white/90">
                  Vendor Contacts
                </h3>
                <p className="mt-0.5 text-xs text-white/60">
                  Contacts you have saved.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-white/60">
                      <th className="px-6 py-3.5 font-semibold">Name</th>
                      <th className="px-6 py-3.5 font-semibold">Category</th>
                      <th className="px-6 py-3.5 font-semibold">Contact</th>
                      <th className="px-6 py-3.5 font-semibold">Added</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {vendors.map((vendor) => (
                      <tr
                        key={vendor.id}
                        className="transition-colors hover:bg-white/[0.04]"
                      >
                        <td className="px-6 py-4">
                          <p className="font-medium text-white/90">
                            {vendor.name}
                          </p>
                          {vendor.notes ? (
                            <p className="mt-0.5 line-clamp-1 max-w-52 text-xs text-white/60">
                              {vendor.notes}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-6 py-4">
                          <span className="rounded-full bg-violet-500/15 px-2.5 py-1 text-[11px] font-semibold text-violet-300">
                            {vendor.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1.5 text-white/80">
                            <Phone className="size-3.5 text-white/40" />
                            {vendor.phone}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-white/60">
                          {formatDate(vendor.createdAt)}
                          {vendor.eventId && eventMap.get(vendor.eventId) ? (
                            <span className="block text-xs text-violet-300/80">
                              {eventMap.get(vendor.eventId)?.eventName}
                            </span>
                          ) : null}
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
                message="No vendors added yet"
                sub="Vendors you save will appear here."
              />
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
