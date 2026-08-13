"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Banknote, Loader2, ShoppingCart, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ErrorState, EmptyState } from "@/components/common/states";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { apiFetch } from "@/lib/api";
import type { CrmEvent } from "@/modules/crm/types";

type Sale = {
  id: string;
  eventId: string | null;
  itemName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  createdAt: string;
};

export default function SaleSheetPage() {
  const queryClient = useQueryClient();

  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [eventId, setEventId] = useState("");
  const [notes, setNotes] = useState("");

  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: () => apiFetch<CrmEvent[]>("/api/employee/events"),
  });

  const { data: sales, isPending, isError, refetch } = useQuery({
    queryKey: ["sales"],
    queryFn: () => apiFetch<Sale[]>("/api/employee/sales"),
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<Sale>("/api/employee/sales", {
        method: "POST",
        body: {
          itemName,
          quantity: Number(quantity),
          unitPrice: Number(unitPrice),
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          eventId: eventId || undefined,
          notes: notes || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Sale recorded");
      setItemName("");
      setQuantity("1");
      setUnitPrice("");
      setCustomerName("");
      setCustomerPhone("");
      setEventId("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const qty = Number(quantity);
  const price = Number(unitPrice);
  const previewAmount =
    Number.isFinite(qty) && Number.isFinite(price) && qty > 0 && price >= 0
      ? qty * price
      : null;

  const canSubmit =
    !mutation.isPending &&
    itemName.trim() !== "" &&
    qty > 0 &&
    Number.isInteger(qty) &&
    price >= 0 &&
    unitPrice !== "";

  const totalSales = (sales ?? []).length;
  const totalRevenue = (sales ?? []).reduce(
    (sum, sale) => sum + sale.amount,
    0,
  );

  return (
    <AppShell
      title="Sale Sheet"
      subtitle="Record sales and review your sales history."
      icon={<TrendingUp className="size-5" />}
    >
      {!isPending && !isError ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="flex items-center gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25">
              <ShoppingCart className="size-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wider text-white/60">
                Total Sales
              </p>
              <p className="text-2xl font-bold tracking-tight text-white">
                {totalSales}
              </p>
            </div>
          </Card>
          <Card className="flex items-center gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25">
              <Banknote className="size-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wider text-white/60">
                Total Revenue
              </p>
              <p className="text-2xl font-bold tracking-tight text-white">
                {formatCurrency(totalRevenue)}
              </p>
            </div>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2 lg:h-fit">
          <CardHeader title="Record a Sale" subtitle="Enter sale details" />
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
              <Label htmlFor="sale-item">Item</Label>
              <Input
                id="sale-item"
                placeholder="e.g. Signature Cocktail"
                value={itemName}
                onChange={(event) => setItemName(event.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sale-qty">Quantity</Label>
                <Input
                  id="sale-qty"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="sale-price">Unit Price (₹)</Label>
                <Input
                  id="sale-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 499"
                  value={unitPrice}
                  onChange={(event) => setUnitPrice(event.target.value)}
                  required
                />
              </div>
            </div>

            {previewAmount !== null ? (
              <p className="rounded-xl bg-violet-500/10 px-4 py-2.5 text-sm text-violet-200">
                Total:{" "}
                <span className="font-bold">{formatCurrency(previewAmount)}</span>
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sale-customer">Customer (optional)</Label>
                <Input
                  id="sale-customer"
                  placeholder="Name"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="sale-phone">Phone (optional)</Label>
                <Input
                  id="sale-phone"
                  type="tel"
                  placeholder="+91..."
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="sale-event">Related Event (optional)</Label>
              <Select
                id="sale-event"
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
              <Label htmlFor="sale-notes">Notes (optional)</Label>
              <Textarea
                id="sale-notes"
                placeholder="Anything to note about this sale"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>

            <Button type="submit" disabled={!canSubmit}>
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShoppingCart className="size-4" />
              )}
              Record Sale
            </Button>
          </form>
        </Card>

        <div className="lg:col-span-3">
          {isPending ? (
            <div className="h-64 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
          ) : isError ? (
            <ErrorState message="Could not load your sales" onRetry={refetch} />
          ) : sales && sales.length > 0 ? (
            <Card className="p-0">
              <div className="border-b border-white/10 px-6 py-4">
                <h3 className="text-base font-semibold tracking-tight text-white/90">
                  Sales History
                </h3>
                <p className="mt-0.5 text-xs text-white/60">
                  All sales you have recorded.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-white/60">
                      <th className="px-6 py-3.5 font-semibold">Date</th>
                      <th className="px-6 py-3.5 font-semibold">Item</th>
                      <th className="px-6 py-3.5 text-right font-semibold">Qty</th>
                      <th className="px-6 py-3.5 text-right font-semibold">
                        Unit Price
                      </th>
                      <th className="px-6 py-3.5 text-right font-semibold">
                        Amount
                      </th>
                      <th className="px-6 py-3.5 font-semibold">Customer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sales.map((sale) => (
                      <tr
                        key={sale.id}
                        className="transition-colors hover:bg-white/[0.04]"
                      >
                        <td className="whitespace-nowrap px-6 py-4 text-white/60">
                          {formatDateTime(sale.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-white/90">
                            {sale.itemName}
                          </p>
                          {sale.notes ? (
                            <p className="mt-0.5 line-clamp-1 max-w-40 text-xs text-white/60">
                              {sale.notes}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-6 py-4 text-right text-white/80">
                          {sale.quantity}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-white/60">
                          {formatCurrency(sale.unitPrice)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right font-semibold text-white/90">
                          {formatCurrency(sale.amount)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-white/80">
                            {sale.customerName ?? "—"}
                          </span>
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
                message="No sales recorded yet"
                sub="Sales you record will appear here."
              />
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
