"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  PackageX,
  RotateCw,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import {
  DamagedItemsTable,
  LostItemsTable,
  type DamagedItem,
  type LostItem,
} from "@/components/dashboard-list-view";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type Kind = "lost" | "damage";

const KIND_CARDS: {
  kind: Kind;
  label: string;
  icon: LucideIcon;
  accentClass: string;
}[] = [
  {
    kind: "lost",
    label: "Lost",
    icon: PackageX,
    accentClass: "bg-red-100 text-red-700",
  },
  {
    kind: "damage",
    label: "Damage",
    icon: AlertTriangle,
    accentClass: "bg-amber-100 text-amber-700",
  },
];

function SummaryCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="flex flex-col gap-2.5">
          <div className="h-3 w-28 animate-pulse rounded bg-muted" />
          <div className="h-8 w-16 animate-pulse rounded bg-muted" />
          <div className="h-3 w-12 animate-pulse rounded bg-muted" />
        </div>
        <div className="size-11 animate-pulse rounded-xl bg-muted" />
      </CardContent>
    </Card>
  );
}

export function LostAndDamageView({
  onBack,
}: {
  onBack: () => void;
}) {
  const { token } = useAuth();
  const [selectedKind, setSelectedKind] = useState<Kind | null>(null);

  const lostQuery = useQuery({
    queryKey: ["warehouse-lost-items"],
    queryFn: () => apiFetch<LostItem[]>("/api/warehouse/lost-items", { token }),
  });

  const damagedQuery = useQuery({
    queryKey: ["warehouse-damaged-items"],
    queryFn: () =>
      apiFetch<DamagedItem[]>("/api/warehouse/damaged-items", { token }),
  });

  const lostTotal = useMemo(() => {
    return (lostQuery.data ?? []).reduce(
      (sum, item) => sum + item.lostQuantity,
      0,
    );
  }, [lostQuery.data]);

  const damagedTotal = useMemo(() => {
    return (damagedQuery.data ?? []).reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
  }, [damagedQuery.data]);

  const totals: Record<Kind, number> = {
    lost: lostTotal,
    damage: damagedTotal,
  };

  const isPending = lostQuery.isPending || damagedQuery.isPending;
  const isError = lostQuery.isError || damagedQuery.isError;

  function retryAll() {
    lostQuery.refetch();
    damagedQuery.refetch();
  }

  const selected =
    KIND_CARDS.find((card) => card.kind === selectedKind) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Lost &amp; Damage
          </h2>
          <p className="text-sm text-muted-foreground">
            {selected
              ? selected.kind === "lost"
                ? "Items reported lost across events."
                : "Items reported damaged across events."
              : "Overview of lost and damaged items."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft />
          Back to Dashboard
        </Button>
      </div>

      {selected ? (
        <div className="flex flex-col gap-4">
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setSelectedKind(null)}
          >
            <ArrowLeft />
            Back to Lost &amp; Damage
          </Button>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>
                {selected.kind === "lost" ? "Lost Items" : "Damaged Items"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {selected.kind === "lost" ? (
                <Table>
                  <LostItemsTable
                    items={lostQuery.data ?? []}
                    isPending={lostQuery.isPending}
                    isError={lostQuery.isError}
                    onRetry={() => lostQuery.refetch()}
                  />
                </Table>
              ) : (
                <Table>
                  <DamagedItemsTable
                    items={damagedQuery.data ?? []}
                    isPending={damagedQuery.isPending}
                    isError={damagedQuery.isError}
                    onRetry={() => damagedQuery.refetch()}
                  />
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      ) : isPending ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <SummaryCardSkeleton key={index} />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <PackageX className="size-8 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Unable to load lost &amp; damage data
              </p>
              <p className="text-sm text-muted-foreground">
                Make sure the API is running and try again.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={retryAll}>
              <RotateCw />
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {KIND_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.kind}
                onClick={() => setSelectedKind(card.kind)}
                className="group relative cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-primary/25"
              >
                <CardContent className="relative flex items-start justify-between gap-4 p-5">
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-muted-foreground">
                      {card.label}
                    </p>
                    <p className="text-3xl font-bold tracking-tight tabular-nums text-foreground">
                      {totals[card.kind].toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">items</p>
                  </div>
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                      card.accentClass,
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
