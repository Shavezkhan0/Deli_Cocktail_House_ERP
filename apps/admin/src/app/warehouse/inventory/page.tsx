"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { statusColor, STOCK_STATUS_COLORS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { flattenZodErrors } from "@/lib/validation";

type InventoryItem = {
  id: string;
  sku: string;
  itemName: string;
  category: string;
  subCategory?: string | null;
  brand?: string | null;
  vendor?: string | null;
  unit: string;
  openingStock: number;
  currentStock: number;
  maxLevel: number;
  status: string;
  expiryDate?: string | null;
  createdAt: string;
  updatedAt: string;
};

type CreateItemPayload = {
  sku?: string;
  itemName: string;
  category: string;
  unit: string;
  openingStock: number;
  maxLevel: number;
  subCategory?: string;
  brand?: string;
  vendor?: string;
  expiryDate?: string;
};

type UpdateItemPayload = {
  sku?: string;
  itemName: string;
  category: string;
  unit: string;
  openingStock: number;
  maxLevel: number;
  currentStock?: number;
  subCategory?: string;
  brand?: string;
  vendor?: string;
  expiryDate?: string;
};

const CATEGORIES = [
  { value: "SETUP", label: "Setup" },
  { value: "UNIFORM", label: "Uniform" },
  { value: "GLASSWARE", label: "Glassware" },
  { value: "DISPOSALS", label: "Disposals" },
  { value: "CONSUMABLE", label: "Consumable Item" },
  { value: "SYRUP", label: "Syrup" },
  { value: "BEVERAGE", label: "Beverage" },
  { value: "ENTERTAINMENT", label: "Entertainment" },
  { value: "CARTS", label: "Carts" },
  { value: "OTHER", label: "Other" },
] as const;

const SUBCATEGORIES: Record<string, { value: string; label: string }[]> = {
  SETUP: [
    { value: "ELECTRONIC", label: "Electric" },
    { value: "NON_ELECTRONIC", label: "Non Electric" },
  ],
  CONSUMABLE: [
    { value: "INGREDIENTS", label: "Ingredients" },
  ],
};

const UNITS = [
  { value: "PCS", label: "PCS" },
  { value: "BOX", label: "BOX" },
  { value: "CASES", label: "Cases" },
  { value: "SET", label: "Set" },
  { value: "PAIR", label: "Pair" },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  SETUP: "bg-sky-100 text-sky-700",
  UNIFORM: "bg-violet-100 text-violet-700",
  GLASSWARE: "bg-emerald-100 text-emerald-700",
  DISPOSALS: "bg-amber-100 text-amber-700",
  CONSUMABLE: "bg-rose-100 text-rose-700",
  SYRUP: "bg-pink-100 text-pink-700",
  BEVERAGE: "bg-cyan-100 text-cyan-700",
  ENTERTAINMENT: "bg-purple-100 text-purple-700",
  CARTS: "bg-orange-100 text-orange-700",
  OTHER: "bg-slate-100 text-slate-700",
};

function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "bg-indigo-100 text-indigo-700";
}

const nonNegativeInt = z
  .string()
  .trim()
  .min(1, "Required")
  .regex(/^\d+$/, "Must be a non-negative whole number")
  .transform((value) => Number(value));

const optionalInt = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (value === undefined || value === "") {
      return undefined;
    }
    return Number(value);
  })
  .refine(
    (value) => value === undefined || (Number.isInteger(value) && value >= 0),
    "Must be a non-negative whole number",
  );

const EXPIRY_CATEGORIES = ["CONSUMABLE", "SYRUP", "BEVERAGE"] as const;

const itemSchema = z
  .object({
    sku: z.string().trim().optional(),
    itemName: z.string().trim().min(1, "Item name is required"),
    brand: z.string().trim().optional(),
    vendor: z.string().trim().optional(),
    openingStock: nonNegativeInt,
    maxLevel: nonNegativeInt,
    currentStock: optionalInt,
    category: z.enum([
      "SETUP",
      "UNIFORM",
      "GLASSWARE",
      "DISPOSALS",
      "CONSUMABLE",
      "SYRUP",
      "BEVERAGE",
      "ENTERTAINMENT",
      "CARTS",
      "OTHER",
    ]),
    subCategory: z.string().trim().optional(),
    unit: z.enum(["PCS", "BOX", "CASES", "SET", "PAIR"]),
    expiryDate: z.string().trim().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.category === "SETUP" || values.category === "CONSUMABLE") {
      if (!values.subCategory?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["subCategory"],
          message: "Sub category is required for this category",
        });
      }
    }
  });

type ItemFormValues = {
  sku: string;
  itemName: string;
  brand: string;
  vendor: string;
  openingStock: string;
  maxLevel: string;
  currentStock: string;
  category: string;
  subCategory: string;
  unit: string;
  expiryDate: string;
};

const emptyForm: ItemFormValues = {
  sku: "",
  itemName: "",
  brand: "",
  vendor: "",
  openingStock: "",
  maxLevel: "",
  currentStock: "",
  category: "",
  subCategory: "",
  unit: "",
  expiryDate: "",
};

const features = tableFeatures({});

function Qty({ value }: { value: number }) {
  return (
    <span className="block text-right tabular-nums">{value.toLocaleString()}</span>
  );
}

function StatusBadge({ value }: { value: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent", statusColor(value, STOCK_STATUS_COLORS))}
    >
      {value}
    </Badge>
  );
}

function ItemActions({
  item,
  onEdit,
  onDelete,
}: {
  item: InventoryItem;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onEdit(item)}
        aria-label={`Edit ${item.itemName}`}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-destructive hover:text-destructive"
        onClick={() => onDelete(item)}
        aria-label={`Delete ${item.itemName}`}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

function toCreatePayload(data: z.infer<typeof itemSchema>): CreateItemPayload {
  return {
    ...(data.sku?.trim() ? { sku: data.sku.trim() } : {}),
    itemName: data.itemName,
    category: data.category,
    unit: data.unit,
    openingStock: data.openingStock,
    maxLevel: data.maxLevel,
    ...(data.subCategory?.trim()
      ? { subCategory: data.subCategory.trim() }
      : {}),
    ...(data.brand?.trim() ? { brand: data.brand.trim() } : {}),
    ...(data.vendor?.trim() ? { vendor: data.vendor.trim() } : {}),
    ...(EXPIRY_CATEGORIES.includes(
      data.category as (typeof EXPIRY_CATEGORIES)[number],
    ) && data.expiryDate
      ? { expiryDate: new Date(data.expiryDate).toISOString() }
      : {}),
  };
}

function toUpdatePayload(data: z.infer<typeof itemSchema>): UpdateItemPayload {
  return {
    ...(data.sku?.trim() ? { sku: data.sku.trim() } : {}),
    itemName: data.itemName,
    category: data.category,
    unit: data.unit,
    openingStock: data.openingStock,
    maxLevel: data.maxLevel,
    ...(data.currentStock !== undefined ? { currentStock: data.currentStock } : {}),
    ...(data.subCategory?.trim()
      ? { subCategory: data.subCategory.trim() }
      : {}),
    ...(data.brand?.trim() ? { brand: data.brand.trim() } : {}),
    ...(data.vendor?.trim() ? { vendor: data.vendor.trim() } : {}),
    ...(EXPIRY_CATEGORIES.includes(
      data.category as (typeof EXPIRY_CATEGORIES)[number],
    ) && data.expiryDate
      ? { expiryDate: new Date(data.expiryDate).toISOString() }
      : {}),
  };
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
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
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<ItemFormValues>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter]);

  const { data: items, isPending, isError, refetch } = useQuery({
    queryKey: ["warehouse-items"],
    queryFn: () => apiFetch<InventoryItem[]>("/api/items", { token }),
  });

  const createItem = useMutation({
    mutationFn: (payload: CreateItemPayload) =>
      apiFetch<InventoryItem>("/api/items", {
        method: "POST",
        body: payload,
        token,
      }),
    onSuccess: () => {
      toast.success("Item created");
      invalidateQueries();
      setOpen(false);
      setEditingItem(null);
      setForm(emptyForm);
      setErrors({});
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateItem = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateItemPayload;
    }) =>
      apiFetch<InventoryItem>(`/api/items/${id}`, {
        method: "PUT",
        body: payload,
        token,
      }),
    onSuccess: () => {
      toast.success("Item updated");
      invalidateQueries();
      setOpen(false);
      setEditingItem(null);
      setForm(emptyForm);
      setErrors({});
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/items/${id}`, {
        method: "DELETE",
        token,
      }),
    onSuccess: () => {
      toast.success("Item deleted");
      invalidateQueries();
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function invalidateQueries() {
    queryClient.invalidateQueries({ queryKey: ["warehouse-items"] });
    queryClient.invalidateQueries({ queryKey: ["warehouse-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["warehouse-events"] });
  }

  function startCreate() {
    setEditingItem(null);
    setForm(emptyForm);
    setErrors({});
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setEditingItem(null);
      setForm(emptyForm);
      setErrors({});
    }
  }

  function handleEdit(item: InventoryItem) {
    setEditingItem(item);
    setForm({
      sku: item.sku,
      itemName: item.itemName,
      brand: item.brand ?? "",
      vendor: item.vendor ?? "",
      openingStock: String(item.openingStock),
      maxLevel: String(item.maxLevel ?? 0),
      currentStock: String(item.currentStock),
      category: item.category,
      subCategory: item.subCategory ?? "",
      unit: item.unit,
      expiryDate: item.expiryDate ? item.expiryDate.slice(0, 10) : "",
    });
    setErrors({});
    setOpen(true);
  }

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return (items ?? []).filter((item) => {
      const matchesSearch =
        !query ||
        item.sku.toLowerCase().includes(query) ||
        item.itemName.toLowerCase().includes(query);
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = useMemo(
    () => filteredItems.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredItems, safePage, pageSize],
  );

  const columnHelper = createColumnHelper<typeof features, InventoryItem>();

  const columns = columnHelper.columns([
    columnHelper.accessor("sku", {
      header: "SKU",
      cell: (info) => (
        <span className="font-mono text-xs text-muted-foreground">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("itemName", {
      header: "Item Name",
      cell: (info) => (
        <span className="font-medium text-foreground">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("category", {
      header: "Category",
      cell: (info) => (
        <Badge
          variant="outline"
          className={cn("border-transparent", categoryColor(info.getValue()))}
        >
          {info.getValue()}
        </Badge>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => <StatusBadge value={info.getValue()} />,
    }),
    columnHelper.accessor("unit", {
      header: "Unit",
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
    }),
    columnHelper.accessor("maxLevel", {
      header: () => <div className="text-right">Max Level</div>,
      cell: (info) => <Qty value={info.getValue() ?? 0} />,
    }),
    columnHelper.accessor("openingStock", {
      header: () => <div className="text-right">Opening Stock</div>,
      cell: (info) => <Qty value={info.getValue()} />,
    }),
    columnHelper.accessor("currentStock", {
      header: () => <div className="text-right">Current Stock</div>,
      cell: (info) => <Qty value={info.getValue()} />,
    }),
    columnHelper.accessor("id", {
      header: () => <div className="text-right">Actions</div>,
      cell: (info) => (
        <ItemActions
          item={info.row.original}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
        />
      ),
    }),
  ]);

  const table = useTable({
    features,
    columns,
    data: paginatedItems,
  });

  const subCategoryOptions = SUBCATEGORIES[form.category] ?? [];

  function update<K extends keyof ItemFormValues>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = itemSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(flattenZodErrors(parsed.error));
      return;
    }

    setErrors({});

    if (editingItem) {
      updateItem.mutate({
        id: editingItem.id,
        payload: toUpdatePayload(parsed.data),
      });
    } else {
      createItem.mutate(toCreatePayload(parsed.data));
    }
  }

  const isSaving = createItem.isPending || updateItem.isPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Inventory
            </h1>
            <p className="text-white-85 text-sm">
              Browse all warehouse stock, available quantities and stock levels.
            </p>
          </div>

          <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button onClick={startCreate} />}>
            <Plus />
            Add Item
          </DialogTrigger>
          <DialogContent className="flex max-h-[85vh] flex-col gap-4 p-4 sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Inventory Item" : "Create New Inventory Item"}
              </DialogTitle>
              <DialogDescription>
                {editingItem
                  ? "Update the details for this inventory item."
                  : "Add a new item to the warehouse inventory."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
              <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto sm:grid-cols-2">
                <Field label="SKU" error={errors.sku} className="sm:col-span-2">
                  <Input
                    value={form.sku}
                    onChange={(event) => update("sku", event.target.value)}
                    placeholder="Leave blank to auto-generate (e.g., DCH1)"
                    aria-invalid={Boolean(errors.sku)}
                  />
                </Field>

                <Field
                  label="Item Name"
                  error={errors.itemName}
                  className="sm:col-span-2"
                >
                  <Input
                    value={form.itemName}
                    onChange={(event) => update("itemName", event.target.value)}
                    placeholder="e.g. Champagne Flute"
                    aria-invalid={Boolean(errors.itemName)}
                  />
                </Field>

                <Field label="Category" error={errors.category}>
                  <Select
                    value={form.category}
                    onValueChange={(value) =>
                      update("category", typeof value === "string" ? value : "")
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Sub Category" error={errors.subCategory}>
                  <Select
                    value={form.subCategory}
                    onValueChange={(value) =>
                      update("subCategory", typeof value === "string" ? value : "")
                    }
                    disabled={subCategoryOptions.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          subCategoryOptions.length === 0
                            ? "Not applicable"
                            : "Select sub category"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {subCategoryOptions.map((sub) => (
                        <SelectItem key={sub.value} value={sub.value}>
                          {sub.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Unit" error={errors.unit}>
                  <Select
                    value={form.unit}
                    onValueChange={(value) =>
                      update("unit", typeof value === "string" ? value : "")
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Brand" error={errors.brand}>
                  <Input
                    value={form.brand}
                    onChange={(event) => update("brand", event.target.value)}
                    placeholder="e.g. Libbey"
                    aria-invalid={Boolean(errors.brand)}
                  />
                </Field>

                <Field label="Vendor" error={errors.vendor}>
                  <Input
                    value={form.vendor}
                    onChange={(event) => update("vendor", event.target.value)}
                    placeholder="e.g. Metro Wholesale"
                    aria-invalid={Boolean(errors.vendor)}
                  />
                </Field>

                <Field label="Opening Stock" error={errors.openingStock}>
                  <Input
                    type="number"
                    min={0}
                    value={form.openingStock}
                    onChange={(event) => update("openingStock", event.target.value)}
                    placeholder="0"
                    aria-invalid={Boolean(errors.openingStock)}
                  />
                </Field>

                <Field label="Max Level" error={errors.maxLevel}>
                  <Input
                    type="number"
                    min={0}
                    value={form.maxLevel}
                    onChange={(event) => update("maxLevel", event.target.value)}
                    placeholder="0"
                    aria-invalid={Boolean(errors.maxLevel)}
                  />
                </Field>

                {editingItem ? (
                  <>
                    <Field label="Current Stock" error={errors.currentStock}>
                      <Input
                        type="number"
                        min={0}
                        value={form.currentStock}
                        onChange={(event) =>
                          update("currentStock", event.target.value)
                        }
                        placeholder="0"
                        aria-invalid={Boolean(errors.currentStock)}
                      />
                    </Field>
                  </>
                ) : null}

                {EXPIRY_CATEGORIES.includes(
                  form.category as (typeof EXPIRY_CATEGORIES)[number],
                ) ? (
                  <Field
                    label="Expiry Date"
                    error={errors.expiryDate}
                    className="sm:col-span-2"
                  >
                    <Input
                      type="date"
                      value={form.expiryDate}
                      onChange={(event) =>
                        update("expiryDate", event.target.value)
                      }
                      aria-invalid={Boolean(errors.expiryDate)}
                    />
                  </Field>
                ) : null}
              </div>

              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={isSaving}>
                  {isSaving
                    ? "Saving…"
                    : editingItem
                      ? "Update"
                      : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by SKU or item name…"
            className="w-full sm:max-w-xs"
          />
          <Select
            value={categoryFilter}
            onValueChange={(value) =>
              setCategoryFilter(typeof value === "string" ? value : "")
            }
          >
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {CATEGORIES.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="glass-card-global">
        <CardHeader className="border-b">
          <CardTitle className="text-white font-bold">All Items</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
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
                Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={columns.length}>
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError || !items ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-10 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-sm font-medium text-foreground">
                        Unable to load inventory
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Make sure the API is running and try again.
                      </p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        Try again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No items yet. Add your first inventory item.
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No items match your search/filter.
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
        {filteredItems.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-36" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 15, 25, 35, 50].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} per page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                Showing {paginatedItems.length} of {filteredItems.length} items
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {safePage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this item?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              disabled={deleteItem.isPending}
              onClick={() => {
                if (deleteTarget) {
                  deleteItem.mutate(deleteTarget.id);
                }
              }}
            >
              {deleteItem.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
