"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Pencil, Plus, Trash2, Wine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/form-field";
import { createEvent, updateEvent, type EventInput } from "@/app/(app)/events/actions";
import { DEFAULT_DELIVERABLES, DEFAULT_MIXERS } from "@/lib/constants";
import { FunctionDetailsDialog } from "@/components/events/function-details-dialog";
import {
  cloneItems,
  itemsToText,
  textToItems,
  FUNCTION_TEMPLATES,
  getFunctionTemplate,
  type TemplateItem,
} from "@/lib/function-templates";

export type BuilderEventFunction = {
  id: string;
  functionName: string;
  date: string;
  startTime?: string;
  endTime?: string;
  pax?: number | null;
  bartenders?: number | null;
  butlers?: number | null;
  siteManager?: string;
  theme?: string;
  description?: string;
  notes?: string;
  selectedCocktails: string[];
  sections: TemplateItem[];
};

export type BuilderFunction = {
  id?: string;
  functionName: string;
  date: string;
  startTime?: string;
  endTime?: string;
  pax?: string;
  bartenders?: string;
  butlers?: string;
  siteManager?: string;
  theme?: string;
  description?: string;
  notes?: string;
  selectedCocktails: string[];
  sections: TemplateItem[];
};

export type BuilderEvent = {
  id: string;
  eventName: string;
  startDate: string;
  endDate: string;
  venue: string;
  deliverables: string[];
  mixers: string[];
  functions: BuilderEventFunction[];
};

type EventBuilderProps = {
  mode: "create" | "edit";
  event?: BuilderEvent | null;
};

function emptyFunction(): BuilderFunction {
  return {
    functionName: "",
    date: "",
    startTime: "",
    endTime: "",
    pax: "",
    bartenders: "",
    butlers: "",
    siteManager: "",
    theme: "",
    description: "",
    notes: "",
    selectedCocktails: [],
    sections: [],
  };
}

function resolveSections(fn: {
  functionName: string;
  description?: string | null;
}): TemplateItem[] {
  const parsed = textToItems(fn.description ?? "");
  if (parsed.length > 0) {
    return parsed;
  }
  const template = getFunctionTemplate(fn.functionName);
  return template ? cloneItems(template.data) : [];
}

function toFunctionForm(fn: BuilderEventFunction): BuilderFunction {
  const sections =
    fn.sections.length > 0 ? fn.sections : resolveSections(fn);
  return {
    id: fn.id,
    functionName: fn.functionName,
    date: fn.date,
    startTime: fn.startTime ?? "",
    endTime: fn.endTime ?? "",
    pax: fn.pax != null ? String(fn.pax) : "",
    bartenders: fn.bartenders != null ? String(fn.bartenders) : "",
    butlers: fn.butlers != null ? String(fn.butlers) : "",
    siteManager: fn.siteManager ?? "",
    theme: fn.theme ?? "",
    description: fn.description ?? "",
    notes: fn.notes ?? "",
    selectedCocktails: fn.selectedCocktails,
    sections,
  };
}

function toNumber(value: string | undefined): number | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function toEventInput({
  dbId,
  form,
  deliverables,
  mixers,
  functions,
}: {
  dbId: string | null;
  form: {
    eventName: string;
    startDate: string;
    endDate: string;
    venue: string;
  };
  deliverables: string[];
  mixers: string[];
  functions: BuilderFunction[];
}): EventInput {
  return {
    id: dbId ?? undefined,
    eventName: form.eventName,
    startDate: form.startDate,
    endDate: form.endDate,
    venue: form.venue,
    deliverables,
    mixers,
    functions: functions.map((fn) => ({
      id: fn.id,
      functionName: fn.functionName,
      date: fn.date,
      startTime: fn.startTime,
      endTime: fn.endTime,
      pax: toNumber(fn.pax),
      bartenders: toNumber(fn.bartenders),
      butlers: toNumber(fn.butlers),
      siteManager: fn.siteManager,
      theme: fn.theme,
      description: fn.description,
      notes: fn.notes,
      templateData: {
        sections: fn.sections,
        selectedCocktails: fn.selectedCocktails,
      },
    })),
  };
}

function EditableList({
  title,
  description,
  items,
  onChange,
  placeholder,
}: {
  title: string;
  description: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  function updateItem(index: number, value: string) {
    onChange(items.map((item, i) => (i === index ? value : item)));
  }
  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }
  function addItem() {
    onChange([...items, ""]);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">
            No items yet. Click &quot;Add Item&quot; to add one.
          </p>
        ) : (
          items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={item}
                onChange={(event) => updateItem(index, event.target.value)}
                placeholder={placeholder}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove item ${index + 1}`}
                onClick={() => removeItem(index)}
              >
                <Trash2 />
              </Button>
            </div>
          ))
        )}
        <Button type="button" variant="outline" className="w-fit" onClick={addItem}>
          <Plus data-icon="inline-start" />
          Add Item
        </Button>
      </CardContent>
    </Card>
  );
}

function FunctionCard({
  index,
  fn,
  onChange,
  onRemove,
}: {
  index: number;
  fn: BuilderFunction;
  onChange: (patch: Partial<BuilderFunction>) => void;
  onRemove: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const template = getFunctionTemplate(fn.functionName);
  const previewText = fn.sections
    .slice(0, 3)
    .map((entry) => entry.label)
    .join(" · ");

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-base">Function {index + 1}</CardTitle>
          <CardDescription>
            Define a function segment such as a sangeet, reception, or any
            custom session.
          </CardDescription>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDetailsOpen(true)}
          >
            <Pencil data-icon="inline-start" />
            Edit Details
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove function ${index + 1}`}
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Function name"
          htmlFor={`functionName-${index}`}
          className="sm:col-span-2"
        >
          <Select
            value={template?.name}
            onValueChange={(value) => {
              const name = value ?? "";
              const selected = getFunctionTemplate(name);
              onChange({
                functionName: name,
                ...(selected
                  ? {
                      theme: "AS PER THEME",
                      sections: cloneItems(selected.data),
                      description: itemsToText(selected.data),
                    }
                  : {}),
              });
            }}
          >
            <SelectTrigger id={`functionName-${index}`} className="w-full">
              <SelectValue placeholder="Select a function" />
            </SelectTrigger>
            <SelectContent>
              {FUNCTION_TEMPLATES.map((template) => (
                <SelectItem key={template.id} value={template.name}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField
          label="Date"
          htmlFor={`functionDate-${index}`}
          className="sm:col-span-2"
        >
          <Input
            id={`functionDate-${index}`}
            type="date"
            value={fn.date}
            onChange={(event) => onChange({ date: event.target.value })}
          />
        </FormField>
        <FormField label="Start time" htmlFor={`startTime-${index}`}>
          <Input
            id={`startTime-${index}`}
            type="time"
            value={fn.startTime ?? ""}
            onChange={(event) => onChange({ startTime: event.target.value })}
          />
        </FormField>
        <FormField label="End time" htmlFor={`endTime-${index}`}>
          <Input
            id={`endTime-${index}`}
            type="time"
            value={fn.endTime ?? ""}
            onChange={(event) => onChange({ endTime: event.target.value })}
          />
        </FormField>
        <FormField
          label="Pax (guests)"
          hint="Expected number of guests."
          htmlFor={`pax-${index}`}
        >
          <Input
            id={`pax-${index}`}
            type="number"
            min={0}
            value={fn.pax ?? ""}
            onChange={(event) => onChange({ pax: event.target.value })}
            placeholder="e.g. 250"
          />
        </FormField>
        <FormField
          label="Theme"
          hint="Function theme, e.g. Copper & Gold."
          htmlFor={`theme-${index}`}
        >
          <Input
            id={`theme-${index}`}
            value={fn.theme ?? ""}
            onChange={(event) => onChange({ theme: event.target.value })}
            placeholder="e.g. Copper & Gold"
          />
        </FormField>
        <FormField
          label="Site manager"
          htmlFor={`siteManager-${index}`}
        >
          <Input
            id={`siteManager-${index}`}
            value={fn.siteManager ?? ""}
            onChange={(event) => onChange({ siteManager: event.target.value })}
          />
        </FormField>
        <FormField
          label="Bartenders"
          htmlFor={`bartenders-${index}`}
        >
          <Input
            id={`bartenders-${index}`}
            type="number"
            min={0}
            value={fn.bartenders ?? ""}
            onChange={(event) => onChange({ bartenders: event.target.value })}
            placeholder="e.g. 4"
          />
        </FormField>
        <FormField label="Butlers" htmlFor={`butlers-${index}`}>
          <Input
            id={`butlers-${index}`}
            type="number"
            min={0}
            value={fn.butlers ?? ""}
            onChange={(event) => onChange({ butlers: event.target.value })}
            placeholder="e.g. 6"
          />
        </FormField>
        <FormField
          label="Selected cocktails"
          hint="Comma-separated list of cocktails for this function."
          htmlFor={`selectedCocktails-${index}`}
          className="sm:col-span-2"
        >
          <Input
            id={`selectedCocktails-${index}`}
            value={fn.selectedCocktails.join(", ")}
            onChange={(event) =>
              onChange({
                selectedCocktails: event.target.value
                  .split(",")
                  .map((cocktail) => cocktail.trim())
                  .filter(Boolean),
              })
            }
            placeholder="e.g. Espresso Martini, Cosmopolitan"
          />
        </FormField>
        <FormField
          label="Details"
          hint="Loaded from the selected template. Click to edit the points for this function."
          className="sm:col-span-2"
        >
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className="flex w-full flex-col gap-1 rounded-lg border bg-muted/30 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
          >
            <span className="text-sm font-medium text-foreground">
              {template
                ? `Loaded from ${template.name} template`
                : "Custom details"}
            </span>
            <span className="line-clamp-2 text-sm text-muted-foreground">
              {previewText ||
                "No points yet. Click to open the editor and add details."}
            </span>
          </button>
        </FormField>
        <FormField
          label="Notes"
          htmlFor={`notes-${index}`}
          className="sm:col-span-2"
        >
          <Textarea
            id={`notes-${index}`}
            value={fn.notes ?? ""}
            onChange={(event) => onChange({ notes: event.target.value })}
            rows={3}
            placeholder="Any additional notes…"
          />
        </FormField>
      </CardContent>

      <FunctionDetailsDialog
        key={detailsOpen ? "details-open" : "details-closed"}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        functionName={fn.functionName}
        items={fn.sections}
        onSave={(sections) => {
          onChange({ sections, description: itemsToText(sections) });
          setDetailsOpen(false);
        }}
      />
    </Card>
  );
}

export function EventBuilder({ mode, event }: EventBuilderProps) {
  const router = useRouter();
  const [dbId, setDbId] = useState<string | null>(event?.id ?? null);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    eventName: event?.eventName ?? "",
    startDate: event?.startDate ?? "",
    endDate: event?.endDate ?? "",
    venue: event?.venue ?? "",
  });

  const [deliverables, setDeliverables] = useState<string[]>(() => {
    const saved = event?.deliverables;
    return saved && saved.length > 0 ? saved : DEFAULT_DELIVERABLES;
  });

  const [mixers, setMixers] = useState<string[]>(() => {
    const saved = event?.mixers;
    return saved && saved.length > 0 ? saved : DEFAULT_MIXERS;
  });

  const [functions, setFunctions] = useState<BuilderFunction[]>(() =>
    (event?.functions ?? []).map(toFunctionForm),
  );

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addFunction() {
    setFunctions((prev) => [...prev, emptyFunction()]);
  }

  function updateFunction(index: number, patch: Partial<BuilderFunction>) {
    setFunctions((prev) =>
      prev.map((fn, i) => (i === index ? { ...fn, ...patch } : fn)),
    );
  }

  function removeFunction(index: number) {
    setFunctions((prev) => prev.filter((_, i) => i !== index));
  }

  function validate(): boolean {
    if (!form.eventName.trim()) {
      toast.error("Event name is required.");
      return false;
    }
    if (!form.startDate || !form.endDate) {
      toast.error("Event dates are required.");
      return false;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      toast.error("End date cannot be before start date.");
      return false;
    }
    if (!form.venue.trim()) {
      toast.error("Venue is required.");
      return false;
    }
    const invalidFunction = functions.find(
      (fn) => !fn.functionName.trim() || !fn.date,
    );
    if (invalidFunction) {
      toast.error("Every function needs a name and a date.");
      return false;
    }
    return true;
  }

  async function handleSave() {
    if (!validate()) {
      return;
    }
    setIsSaving(true);
    try {
      const input = toEventInput({
        dbId,
        form,
        deliverables,
        mixers,
        functions,
      });
      if (dbId) {
        await updateEvent(input);
        toast.success("Event updated");
      } else {
        const result = await createEvent(input);
        setDbId(result.id);
        toast.success("Event created");
      }
      router.push("/");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save event",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
          <CardDescription>Basic details about the event.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Event name"
            htmlFor="eventName"
            className="sm:col-span-2"
          >
            <Input
              id="eventName"
              value={form.eventName}
              onChange={(event) => update("eventName", event.target.value)}
              placeholder="e.g. Sharma Wedding Reception"
              required
            />
          </FormField>
          <FormField label="Start date" htmlFor="startDate">
            <Input
              id="startDate"
              type="date"
              value={form.startDate}
              onChange={(event) => update("startDate", event.target.value)}
              required
            />
          </FormField>
          <FormField label="End date" htmlFor="endDate">
            <Input
              id="endDate"
              type="date"
              value={form.endDate}
              onChange={(event) => update("endDate", event.target.value)}
              required
            />
          </FormField>
          <FormField
            label="Venue"
            hint="Venue name, e.g. Westin, Sohna."
            htmlFor="venue"
            className="sm:col-span-2"
          >
            <Input
              id="venue"
              value={form.venue}
              onChange={(event) => update("venue", event.target.value)}
              placeholder="e.g. Westin, Sohna"
              required
            />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">
            Bar & Deliverables
          </h2>
          <p className="text-sm text-muted-foreground">
            Standard items served across all functions. Edit the lists freely.
          </p>
        </div>
        <EditableList
          title="STANDARD BAR DELIVERABLES ON ALL FUNCTIONS"
          description="Equipment and service items included on every function."
          items={deliverables}
          onChange={setDeliverables}
          placeholder="e.g. All Bar Equipment"
        />
        <EditableList
          title="MIXERS"
          description="Beverage mixers and ingredients included for each function."
          items={mixers}
          onChange={setMixers}
          placeholder="e.g. MONIN SYRUPS & ANGOSTURA BITTERS"
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Functions</CardTitle>
            <CardDescription>
              Add a function for each day or segment of the event. Functions
              are printed as a schedule table on the proposal PDF.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addFunction}
          >
            <Plus data-icon="inline-start" />
            Add Function
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {functions.length > 0 ? (
            functions.map((fn, index) => (
              <FunctionCard
                key={fn.id ?? `new-${index}`}
                index={index}
                fn={fn}
                onChange={(patch) => updateFunction(index, patch)}
                onRemove={() => removeFunction(index)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-muted/20 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Wine className="size-6" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">No functions yet</p>
                <p className="text-sm text-muted-foreground">
                  Add your first function to build the event schedule.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addFunction}
              >
                <Plus data-icon="inline-start" />
                Add Function
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="outline" size="lg" nativeButton={false} render={<Link href="/" />}>
          <ChevronLeft data-icon="inline-start" />
          Cancel
        </Button>
        <Button type="button" size="lg" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving…" : mode === "edit" ? "Save Changes" : "Create Event"}
        </Button>
      </div>
    </div>
  );
}
