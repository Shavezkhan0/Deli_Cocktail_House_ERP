"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  dispatchedQuantity: number;
  damagedQuantity: number;
  lostQuantity: number;
  minStockLevel: number;
  createdAt: string;
  updatedAt: string;
};

type CreateInventoryPayload = {
  name: string;
  category: string;
  totalQuantity: number;
  minStockLevel: number;
};

const CATEGORY_COLORS = [
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-indigo-100 text-indigo-700",
] as const;

function categoryColor(category: string): string {
  let hash = 0;
  for (const char of category) {
    hash = (hash + char.charCodeAt(0)) % 997;
  }
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
}

const nonNegativeInt = z
  .string()
  .trim()
  .min(1, "Required")
  .regex(/^\d+$/, "Must be a non-negative whole number")
  .transform((value) => Number(value));

const inventorySchema = z.object({
  name: z.string().trim().min(1, "Item name is required"),
  category: z.string().trim().min(1, "Category is required"),
  totalQuantity: nonNegativeInt,
  minStockLevel: nonNegativeInt,
});

type InventoryFormValues = {
  name: string;
  category: string;
  totalQuantity: string;
  minStockLevel: string;
};

const emptyForm: InventoryFormValues = {
  name: "",
  category: "",
  totalQuantity: "",
  minStockLevel: "",
};

const features = tableFeatures({});
const columnHelper = createColumnHelper<typeof features, InventoryItem>();
const EMPTY_ITEMS: InventoryItem[] = [];

const columns = columnHelper.columns([
  columnHelper.accessor("name", {
    header: "Item Name",
    cell: (info) => (
      <span className="font-medium text-foreground">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("category", {
    header: "Category",
    cell: (info) => {
      const category = info.getValue();
      return (
        <Badge
          variant="outline"
          className={cn("border-transparent", categoryColor(category))}
        >
          {category}
        </Badge>
      );
    },
  }),
  columnHelper.accessor("totalQuantity", {
    header: () => <div className="text-right">Total Stock</div>,
    cell: (info) => <Qty value={info.getValue()} />,
  }),
  columnHelper.accessor("availableQuantity", {
    header: () => <div className="text-right">Available</div>,
    cell: (info) => <Qty value={info.getValue()} />,
  }),
  columnHelper.accessor("reservedQuantity", {
    header: () => <div className="text-right">Reserved</div>,
    cell: (info) => <Qty value={info.getValue()} />,
  }),
  columnHelper.accessor("dispatchedQuantity", {
    header: () => <div className="text-right">Dispatched</div>,
    cell: (info) => <Qty value={info.getValue()} />,
  }),
  columnHelper.accessor("lostQuantity", {
    header: () => <div className="text-right">Lost</div>,
    cell: (info) => <Qty value={info.getValue()} />,
  }),
  columnHelper.accessor("damagedQuantity", {
    header: () => <div className="text-right">Damaged</div>,
    cell: (info) => <Qty value={info.getValue()} />,
  }),
]);

function Qty({ value }: { value: number }) {
  return (
    <span className="block text-right tabular-nums">{value.toLocaleString()}</span>
  );
}

function flattenZodErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (!out[key]) {
      out[key] = issue.message;
    }
  }
  return out;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function WarehouseInventoryPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<InventoryFormValues>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: items, isPending, isError } = useQuery({
    queryKey: ["warehouse-inventory"],
    queryFn: () =>
      apiFetch<InventoryItem[]>("/api/warehouse/inventory", { token }),
  });

  const createItem = useMutation({
    mutationFn: (payload: CreateInventoryPayload) =>
      apiFetch<InventoryItem>("/api/warehouse/inventory", {
        method: "POST",
        body: payload,
        token,
      }),
    onSuccess: () => {
      toast.success("Inventory item added");
      queryClient.invalidateQueries({ queryKey: ["warehouse-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-low-stock"] });
      setOpen(false);
      setForm(emptyForm);
      setErrors({});
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const table = useTable({
    features,
    columns,
    data: items ?? EMPTY_ITEMS,
  });

  function update<K extends keyof InventoryFormValues>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = inventorySchema.safeParse(form);
    if (!parsed.success) {
      setErrors(flattenZodErrors(parsed.error));
      return;
    }

    setErrors({});
    createItem.mutate({
      name: parsed.data.name,
      category: parsed.data.category,
      totalQuantity: parsed.data.totalQuantity,
      minStockLevel: parsed.data.minStockLevel,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Inventory List
        </h1>
        <p className="text-sm text-muted-foreground">
          Browse and manage all inventory items across the warehouse.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>All Items</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button />}>
              <Plus />
              Add New Item
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Item</DialogTitle>
                <DialogDescription>
                  Add a new item to the warehouse inventory.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Field label="Name" error={errors.name}>
                  <Input
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                    placeholder="e.g. Champagne Flute"
                    aria-invalid={Boolean(errors.name)}
                  />
                </Field>
                <Field label="Category" error={errors.category}>
                  <Input
                    value={form.category}
                    onChange={(event) => update("category", event.target.value)}
                    placeholder="e.g. Glassware"
                    aria-invalid={Boolean(errors.category)}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Total Qty" error={errors.totalQuantity}>
                    <Input
                      type="number"
                      min={0}
                      value={form.totalQuantity}
                      onChange={(event) =>
                        update("totalQuantity", event.target.value)
                      }
                      placeholder="0"
                      aria-invalid={Boolean(errors.totalQuantity)}
                    />
                  </Field>
                  <Field label="Min Stock Level" error={errors.minStockLevel}>
                    <Input
                      type="number"
                      min={0}
                      value={form.minStockLevel}
                      onChange={(event) =>
                        update("minStockLevel", event.target.value)
                      }
                      placeholder="0"
                      aria-invalid={Boolean(errors.minStockLevel)}
                    />
                  </Field>
                </div>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>
                    Cancel
                  </DialogClose>
                  <Button type="submit" disabled={createItem.isPending}>
                    {createItem.isPending ? "Adding…" : "Add Item"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isPending ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={columns.length}>
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError || !items ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Unable to load inventory. Make sure the API is running.
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No items yet. Add your first inventory item.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getAllCells().map((cell) => (
                      <TableCell key={cell.id}>
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
