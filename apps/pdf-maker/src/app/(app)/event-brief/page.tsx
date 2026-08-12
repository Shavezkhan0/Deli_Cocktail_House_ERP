"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  buildEventBriefPayload,
  DEFAULT_STANDARD_DELIVERABLES,
  DEFAULT_PLEASE_NOTE,
  STANDARD_DELIVERABLE_OPTIONS,
  PLEASE_NOTE_OPTIONS,
} from "@/lib/event-brief";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/form-field";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  LIBRARY,
  ICE_OPTIONS,
  ENTERTAINMENT_OPTIONS,
  FUNCTION_TYPES,
  PAX_QUICK_OPTIONS,
  UNIFORM_OPTIONS,
  BARSETUP_OPTIONS,
  calcStaffing,
} from "@/lib/dch-constants";

const OTHER_PAX = "__other__";
const OTHER_UNIFORM = "Other Uniform";
const OTHER_BAR_SETUP = "Other Bar Setup";
const NO_ICE = "no_ice";

const BAR_CONCEPT_OPTIONS = LIBRARY.map((item) => ({ value: item.id, label: item.name }));
const ICE_OPTION_ITEMS = ICE_OPTIONS.map((item) => ({ value: item.id, label: item.name }));
const ENTERTAINMENT_OPTION_ITEMS = ENTERTAINMENT_OPTIONS.map((item) => ({
  value: item.id,
  label: item.name,
}));

const functionSchema = z
  .object({
    functionType: z.string().min(1, "Select a function type"),
    pax: z.string().min(1, "Select a PAX"),
    paxCustom: z.string().optional(),
    date: z.string().optional(),
    venue: z.string().optional(),
    uniform: z.string().min(1, "Select a uniform"),
    uniformOther: z.string().optional(),
    barSetup: z.string().min(1, "Select a bar setup"),
    barSetupOther: z.string().optional(),
    barConcepts: z.array(z.string()),
    ice: z.array(z.string()),
    entertainment: z.array(z.string()),
    bartenders: z.string(),
    butlers: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.uniform === OTHER_UNIFORM && !data.uniformOther?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["uniformOther"],
        message: "Enter the uniform details",
      });
    }
    if (data.barSetup === OTHER_BAR_SETUP && !data.barSetupOther?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["barSetupOther"],
        message: "Enter the bar setup details",
      });
    }
  });

const eventBriefSchema = z
  .object({
    eventType: z.enum(["SINGLE", "DESTINATION"], {
      message: "Select an event type",
    }),
    venueMode: z.enum(["SAME", "DIFFERENT"], {
      message: "Select a venue mode",
    }),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional(),
    venue: z.string().optional(),
    clientName: z.string().min(1, "Client name is required"),
    eventName: z.string().min(1, "Event name is required"),
    standardDeliverables: z.array(z.string()),
    pleaseNote: z.array(z.string()),
    barCharges: z.string().optional(),
    coconutCharges: z.string().optional(),
    functions: z.array(functionSchema).min(1, "At least one function is required"),
  })
  .superRefine((data, ctx) => {
    if (data.eventType === "DESTINATION" && !data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date is required",
      });
    }

    const needsEventVenue = data.eventType === "SINGLE" || data.venueMode === "SAME";
    if (needsEventVenue && !data.venue?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["venue"],
        message: "Venue is required",
      });
    }

    if (data.eventType === "DESTINATION" && data.venueMode === "DIFFERENT") {
      data.functions.forEach((fn, index) => {
        if (!fn.venue?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["functions", index, "venue"],
            message: "Venue is required",
          });
        }
      });
    }

    if (
      data.eventType === "DESTINATION" &&
      data.startDate &&
      data.endDate &&
      data.endDate > data.startDate
    ) {
      const eventStartDate = data.startDate;
      const eventEndDate = data.endDate;
      data.functions.forEach((fn, index) => {
        if (
          fn.date &&
          (fn.date < eventStartDate || fn.date > eventEndDate)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["functions", index, "date"],
            message: "Date must be within the event dates",
          });
        }
      });
    }
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

type EventBriefValues = z.infer<typeof eventBriefSchema>;
type FunctionValues = z.infer<typeof functionSchema>;

const EVENT_TYPES = [
  { value: "SINGLE", label: "Single Event" },
  { value: "DESTINATION", label: "Destination Event" },
] as const;

const VENUE_MODES = [
  { value: "SAME", label: "Same Venue" },
  { value: "DIFFERENT", label: "Different Venue" },
] as const;

const createFunction = (): FunctionValues => ({
  functionType: "",
  pax: "",
  paxCustom: "",
  date: "",
  venue: "",
  uniform: "",
  uniformOther: "",
  barSetup: "",
  barSetupOther: "",
  barConcepts: [],
  ice: [],
  entertainment: [],
  bartenders: "0",
  butlers: "0",
});

const selectClass =
  "flex h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";

export default function EventBriefPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<EventBriefValues>({
    resolver: zodResolver(eventBriefSchema),
    defaultValues: {
      eventType: "SINGLE",
      venueMode: "SAME",
      startDate: "",
      endDate: "",
      venue: "",
      clientName: "",
      eventName: "",
      standardDeliverables: [...DEFAULT_STANDARD_DELIVERABLES],
      pleaseNote: [...DEFAULT_PLEASE_NOTE],
      barCharges: "",
      coconutCharges: "",
      functions: [createFunction()],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "functions",
  });

  const eventType = useWatch({ control, name: "eventType" });
  const venueMode = useWatch({ control, name: "venueMode" });
  const startDate = useWatch({ control, name: "startDate" });
  const endDate = useWatch({ control, name: "endDate" });
  const functions = useWatch({ control, name: "functions" }) as FunctionValues[] | undefined;
  const standardDeliverables = useWatch({ control, name: "standardDeliverables" }) ?? [];
  const pleaseNote = useWatch({ control, name: "pleaseNote" }) ?? [];

  const updateStaffing = (index: number, pax: string) => {
    const staffing = calcStaffing(pax);
    setValue(`functions.${index}.bartenders`, staffing?.bartenders ?? "0");
    setValue(`functions.${index}.butlers`, staffing?.butlers ?? "0");
  };

  const updateIce = (index: number, values: string[]) => {
    setValue(`functions.${index}.ice`, values.includes(NO_ICE) ? [NO_ICE] : values, {
      shouldDirty: true,
    });
  };

  const selectEventType = (value: EventBriefValues["eventType"]) => {
    setValue("eventType", value, { shouldValidate: true });
    if (value === "SINGLE" && fields.length > 1) {
      remove(1);
    }
    if (value === "SINGLE") {
      setValue("venueMode", "SAME", { shouldValidate: true });
    }
  };

  const selectVenueMode = (value: EventBriefValues["venueMode"]) => {
    setValue("venueMode", value, { shouldValidate: true });
  };

  const onSubmit = async (values: EventBriefValues) => {
    setIsSubmitting(true);
    try {
      const payload = buildEventBriefPayload(values);
      const response = await fetch("/api/generate-brief-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { url?: string; message?: string };
      if (!response.ok || !result.url) {
        throw new Error(result.message ?? "Failed to generate the event brief.");
      }
      toast.success("Event brief saved. Opening PDF preview...");
      router.push(result.url);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save event brief",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSingle = eventType === "SINGLE";
  const hasMultipleDays = Boolean(
    eventType === "DESTINATION" && startDate && endDate && endDate > startDate,
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Make PDF</h1>
        <p className="text-sm text-muted-foreground">
          Fill in the event details to generate your proposal.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Event Brief</CardTitle>
            <CardDescription>
              Enter the basic details used across the PDF.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">Event Type</span>
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/40 p-1">
                {EVENT_TYPES.map((option) => {
                  const selected = eventType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => selectEventType(option.value)}
                      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                        selected
                          ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {errors.eventType ? (
                <p className="text-xs font-medium text-destructive">{errors.eventType.message}</p>
              ) : null}
            </div>

            {isSingle ? (
              <FormField label="Event Date" htmlFor="startDate" error={errors.startDate?.message}>
                <Input id="startDate" type="date" aria-invalid={Boolean(errors.startDate)} {...register("startDate")} />
              </FormField>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Event Start Date" htmlFor="startDate" error={errors.startDate?.message}>
                  <Input id="startDate" type="date" aria-invalid={Boolean(errors.startDate)} {...register("startDate")} />
                </FormField>
                <FormField label="Event End Date" htmlFor="endDate" error={errors.endDate?.message}>
                  <Input id="endDate" type="date" aria-invalid={Boolean(errors.endDate)} {...register("endDate")} />
                </FormField>
              </div>
            )}

            {!isSingle ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Venue</span>
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/40 p-1">
                  {VENUE_MODES.map((option) => {
                    const selected = venueMode === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => selectVenueMode(option.value)}
                        className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                          selected
                            ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                {errors.venueMode ? (
                  <p className="text-xs font-medium text-destructive">{errors.venueMode.message}</p>
                ) : null}
              </div>
            ) : null}

            {isSingle || venueMode === "SAME" ? (
              <FormField label="Venue" htmlFor="venue" error={errors.venue?.message}>
                <Input
                  id="venue"
                  placeholder="e.g. The Grand Ballroom"
                  aria-invalid={Boolean(errors.venue)}
                  {...register("venue")}
                />
              </FormField>
            ) : null}

            <FormField label="Client Name" htmlFor="clientName" error={errors.clientName?.message}>
              <Input
                id="clientName"
                placeholder="e.g. Sarah & John"
                aria-invalid={Boolean(errors.clientName)}
                {...register("clientName")}
              />
            </FormField>

            <FormField label="Event Name" htmlFor="eventName" error={errors.eventName?.message}>
              <Input
                id="eventName"
                placeholder="e.g. Summer Wedding"
                aria-invalid={Boolean(errors.eventName)}
                {...register("eventName")}
              />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Functions</CardTitle>
            <CardDescription>
              {isSingle
                ? "Single events include one function."
                : "Destination events can include multiple functions."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {errors.functions?.root?.message ? (
              <p className="text-xs font-medium text-destructive">{errors.functions.root.message}</p>
            ) : null}

            {fields.map((field, index) => {
              const fn = functions?.[index];
              return (
                <div key={field.id} className="flex flex-col gap-4 rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Function {index + 1}</p>
                    {!isSingle && fields.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="text-muted-foreground hover:text-red-500"
                        aria-label={`Remove function ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>

                  {!isSingle && hasMultipleDays ? (
                    <FormField
                      label="Date"
                      htmlFor={`functions.${index}.date`}
                      error={errors.functions?.[index]?.date?.message}
                    >
                      <Input
                        id={`functions.${index}.date`}
                        type="date"
                        min={startDate}
                        max={endDate}
                        aria-invalid={Boolean(errors.functions?.[index]?.date)}
                        {...register(`functions.${index}.date`)}
                      />
                    </FormField>
                  ) : null}

                  {!isSingle && venueMode === "DIFFERENT" ? (
                    <FormField
                      label="Venue"
                      htmlFor={`functions.${index}.venue`}
                      error={errors.functions?.[index]?.venue?.message}
                    >
                      <Input
                        id={`functions.${index}.venue`}
                        placeholder="e.g. The Grand Ballroom"
                        aria-invalid={Boolean(errors.functions?.[index]?.venue)}
                        {...register(`functions.${index}.venue`)}
                      />
                    </FormField>
                  ) : null}

                  <FormField
                    label="Function Type"
                    htmlFor={`functions.${index}.functionType`}
                    error={errors.functions?.[index]?.functionType?.message}
                  >
                    <select
                      id={`functions.${index}.functionType`}
                      className={selectClass}
                      aria-invalid={Boolean(errors.functions?.[index]?.functionType)}
                      {...register(`functions.${index}.functionType`)}
                    >
                      <option value="">Select a function</option>
                      {FUNCTION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField
                    label="PAX"
                    htmlFor={`functions.${index}.pax`}
                    error={errors.functions?.[index]?.pax?.message}
                  >
                    <select
                      id={`functions.${index}.pax`}
                      className={selectClass}
                      aria-invalid={Boolean(errors.functions?.[index]?.pax)}
                      {...register(`functions.${index}.pax`)}
                      onChange={(e) => {
                        const value = e.target.value;
                        setValue(`functions.${index}.pax`, value);
                        updateStaffing(
                          index,
                          value === OTHER_PAX
                            ? (functions?.[index]?.paxCustom ?? "")
                            : value
                        );
                      }}
                    >
                      <option value="">Select PAX</option>
                      {PAX_QUICK_OPTIONS.map((pax) => (
                        <option key={pax} value={pax}>
                          {pax}
                        </option>
                      ))}
                      <option value={OTHER_PAX}>Other PAX</option>
                    </select>
                    {fn?.pax === OTHER_PAX ? (
                      <Input
                        type="number"
                        placeholder="Enter PAX"
                        className="mt-2"
                        {...register(`functions.${index}.paxCustom`)}
                        onChange={(e) => {
                          setValue(`functions.${index}.paxCustom`, e.target.value);
                          updateStaffing(index, e.target.value);
                        }}
                      />
                    ) : null}
                  </FormField>

                  <FormField
                    label="Uniform"
                    htmlFor={`functions.${index}.uniform`}
                    error={errors.functions?.[index]?.uniform?.message}
                  >
                    <select
                      id={`functions.${index}.uniform`}
                      className={selectClass}
                      aria-invalid={Boolean(errors.functions?.[index]?.uniform)}
                      {...register(`functions.${index}.uniform`)}
                    >
                      <option value="">Select uniform</option>
                      {UNIFORM_OPTIONS.map((uniform) => (
                        <option key={uniform} value={uniform}>
                          {uniform}
                        </option>
                      ))}
                    </select>
                    {fn?.uniform === OTHER_UNIFORM ? (
                      <Input
                        placeholder="Specify uniform"
                        className="mt-2"
                        aria-invalid={Boolean(errors.functions?.[index]?.uniformOther)}
                        {...register(`functions.${index}.uniformOther`)}
                      />
                    ) : null}
                    {fn?.uniform === OTHER_UNIFORM && errors.functions?.[index]?.uniformOther ? (
                      <p className="text-xs font-medium text-destructive">
                        {errors.functions[index].uniformOther.message}
                      </p>
                    ) : null}
                  </FormField>

                  <FormField
                    label="Bar Setup"
                    htmlFor={`functions.${index}.barSetup`}
                    error={errors.functions?.[index]?.barSetup?.message}
                  >
                    <select
                      id={`functions.${index}.barSetup`}
                      className={selectClass}
                      aria-invalid={Boolean(errors.functions?.[index]?.barSetup)}
                      {...register(`functions.${index}.barSetup`)}
                    >
                      <option value="">Select bar setup</option>
                      {BARSETUP_OPTIONS.map((setup) => (
                        <option key={setup} value={setup}>
                          {setup}
                        </option>
                      ))}
                    </select>
                    {fn?.barSetup === OTHER_BAR_SETUP ? (
                      <Input
                        placeholder="Specify bar setup"
                        className="mt-2"
                        aria-invalid={Boolean(errors.functions?.[index]?.barSetupOther)}
                        {...register(`functions.${index}.barSetupOther`)}
                      />
                    ) : null}
                    {fn?.barSetup === OTHER_BAR_SETUP && errors.functions?.[index]?.barSetupOther ? (
                      <p className="text-xs font-medium text-destructive">
                        {errors.functions[index].barSetupOther.message}
                      </p>
                    ) : null}
                  </FormField>

                  <FormField label="Bar Concepts">
                    <MultiSelect
                      options={BAR_CONCEPT_OPTIONS}
                      value={fn?.barConcepts ?? []}
                      onChange={(values) =>
                        setValue(`functions.${index}.barConcepts`, values, { shouldDirty: true })
                      }
                      placeholder="Select bar concepts"
                    />
                  </FormField>

                  <FormField label="Ice">
                    <MultiSelect
                      options={ICE_OPTION_ITEMS}
                      value={fn?.ice ?? []}
                      onChange={(values) => updateIce(index, values)}
                      placeholder="Select ice options"
                    />
                  </FormField>

                  <FormField label="Entertainment">
                    <MultiSelect
                      options={ENTERTAINMENT_OPTION_ITEMS}
                      value={fn?.entertainment ?? []}
                      onChange={(values) =>
                        setValue(`functions.${index}.entertainment`, values, { shouldDirty: true })
                      }
                      placeholder="Select entertainment"
                    />
                  </FormField>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Bartenders"
                      htmlFor={`functions.${index}.bartenders`}
                      hint="Auto-calculated from PAX"
                    >
                      <Input
                        id={`functions.${index}.bartenders`}
                        disabled
                        value={fn?.bartenders ?? "0"}
                        className="bg-muted/50"
                      />
                    </FormField>
                    <FormField
                      label="Butlers"
                      htmlFor={`functions.${index}.butlers`}
                      hint="Auto-calculated from PAX"
                    >
                      <Input
                        id={`functions.${index}.butlers`}
                        disabled
                        value={fn?.butlers ?? "0"}
                        className="bg-muted/50"
                      />
                    </FormField>
                  </div>
                </div>
              );
            })}

            {!isSingle ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => append(createFunction())}
                className="w-full"
              >
                <Plus /> Add Function
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Footer & Deliverables</CardTitle>
            <CardDescription>
              Choose the standard deliverables and notes printed on the proposal.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <FormField label="Standard Bar Deliverables">
              <MultiSelect
                options={STANDARD_DELIVERABLE_OPTIONS}
                value={standardDeliverables}
                onChange={(values) =>
                  setValue("standardDeliverables", values, { shouldDirty: true })
                }
                placeholder="Select standard deliverables"
              />
            </FormField>

            <FormField label="Please Note">
              <MultiSelect
                options={PLEASE_NOTE_OPTIONS}
                value={pleaseNote}
                onChange={(values) =>
                  setValue("pleaseNote", values, { shouldDirty: true })
                }
                placeholder="Select please note items"
              />
            </FormField>

            <FormField
              label="Bar Charges"
              htmlFor="barCharges"
              hint="Optional extra bar-related charges"
            >
              <Input
                id="barCharges"
                placeholder="e.g. ₹50 per guest"
                {...register("barCharges")}
              />
            </FormField>

            <FormField
              label="Coconut Charges"
              htmlFor="coconutCharges"
              hint="Optional coconut-related charges"
            >
              <Input
                id="coconutCharges"
                placeholder="e.g. ₹25 per coconut"
                {...register("coconutCharges")}
              />
            </FormField>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Generating..." : "Generate PDF"}
        </Button>
      </form>
    </div>
  );
}
