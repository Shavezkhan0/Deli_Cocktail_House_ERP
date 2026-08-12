import type { Block } from "@/lib/functions";
import { LIBRARY, ICE_OPTIONS, ENTERTAINMENT_OPTIONS } from "@/lib/dch-constants";
import { standardDeliverables } from "@/lib/functions/standard-deliverables";
import { pleaseNote } from "@/lib/functions/please-note";

const OTHER_PAX = "__other__";
const OTHER_UNIFORM = "Other Uniform";
const OTHER_BAR_SETUP = "Other Bar Setup";

const DEFAULT_TEMPLATE_ID = "cocktail";

const FUNCTION_TYPE_TEMPLATES: Record<string, string> = {
  "Guest Welcome": "guest-welcome",
  "Welcome Lunch": "welcome-lunch",
  Lunch: "lunch",
  Dinner: "reception-after-party",
  Mehendi: "mehendi",
  Haldi: "haldi",
  Cocktail: "cocktail",
  "Cocktail Hour Followed by Reception": "reception-after-party",
  Wedding: "wedding",
  Baraat: "baraat",
  Sangeet: "sangeet",
  "After Party": "after-party",
  "Hangover Wake-up Call": "welcome-lunch",
  "Ring Ceremony": "jaimala-pheras",
  Custom: DEFAULT_TEMPLATE_ID,
};

export type EventBriefValues = {
  eventType: "SINGLE" | "DESTINATION";
  venueMode: "SAME" | "DIFFERENT";
  startDate: string;
  endDate?: string;
  venue?: string;
  clientName: string;
  eventName: string;
  standardDeliverables: string[];
  pleaseNote: string[];
  barCharges?: string;
  coconutCharges?: string;
  functions: {
    functionType: string;
    pax: string;
    paxCustom?: string;
    date?: string;
    venue?: string;
    uniform: string;
    uniformOther?: string;
    barSetup: string;
    barSetupOther?: string;
    barConcepts: string[];
    ice: string[];
    europeanButler?: string;
    entertainment: string[];
    bartenders: string;
    butlers: string;
  }[];
};

export type EventBriefFunction = EventBriefValues["functions"][number];

export type EventBriefTeamFlowRow = {
  id: string;
  date: string;
  functionType: string;
  venue?: string;
  pax: string;
  bartenders: number;
  butlers: number;
};

export type EventBriefPayload = {
  eventName: string;
  clientName: string;
  venue: string;
  eventType: "SINGLE" | "DESTINATION";
  startDate: string;
  endDate: string;
  functions: {
    functionType: string;
    templateId: string;
    blocks: Block[];
    pax: string;
    bartenders: string;
    butlers: string;
  }[];
  teamFlow: EventBriefTeamFlowRow[];
};

function listItemsFromBlocks(blocks: Block[]): string[] {
  return blocks.flatMap((block) =>
    block.type === "list"
      ? (block.items ?? []).filter((item): item is string => typeof item === "string")
      : [],
  );
}

export const DEFAULT_STANDARD_DELIVERABLES: string[] =
  listItemsFromBlocks(standardDeliverables.blocks);

export const DEFAULT_PLEASE_NOTE: string[] = listItemsFromBlocks(pleaseNote.blocks);

export const STANDARD_DELIVERABLE_OPTIONS = DEFAULT_STANDARD_DELIVERABLES.map(
  (item) => ({ value: item, label: item }),
);

export const PLEASE_NOTE_OPTIONS = DEFAULT_PLEASE_NOTE.map((item) => ({
  value: item,
  label: item,
}));

export function resolveFunctionTemplateId(functionType: string): string {
  const trimmed = functionType.trim();
  const matched = FUNCTION_TYPE_TEMPLATES[trimmed];
  if (matched) {
    return matched;
  }
  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || DEFAULT_TEMPLATE_ID;
}

export function resolveFunctionPax(fn: EventBriefFunction): string {
  return fn.pax === OTHER_PAX ? (fn.paxCustom ?? "") : fn.pax;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function buildProposalBlocks(fn: EventBriefFunction): Block[] {
  const blocks: Block[] = [
    {
      id: `brief-type-${uid()}`,
      type: "simple",
      title: "Function Type",
      value: fn.functionType,
    },
    {
      id: `brief-pax-${uid()}`,
      type: "simple",
      title: "PAX",
      value: resolveFunctionPax(fn) || "—",
    },
  ];

  if (fn.date?.trim()) {
    blocks.push({
      id: `brief-date-${uid()}`,
      type: "simple",
      title: "Date",
      value: fn.date.trim(),
    });
  }

  if (fn.venue?.trim()) {
    blocks.push({
      id: `brief-venue-${uid()}`,
      type: "simple",
      title: "Venue",
      value: fn.venue.trim(),
    });
  }

  const uniformValue =
    fn.uniform === OTHER_UNIFORM && fn.uniformOther?.trim()
      ? `${fn.uniform}: ${fn.uniformOther.trim()}`
      : fn.uniform;
  if (uniformValue) {
    blocks.push({
      id: `brief-uniform-${uid()}`,
      type: "simple",
      title: "Uniform",
      value: uniformValue,
    });
  }

  const barSetupValue =
    fn.barSetup === OTHER_BAR_SETUP && fn.barSetupOther?.trim()
      ? `${fn.barSetup}: ${fn.barSetupOther.trim()}`
      : fn.barSetup;
  if (barSetupValue) {
    blocks.push({
      id: `brief-bar-setup-${uid()}`,
      type: "simple",
      title: "Bar Setup",
      value: barSetupValue,
    });
  }

  fn.barConcepts.forEach((conceptId) => {
    const concept = LIBRARY.find((item) => item.id === conceptId);
    if (!concept) {
      return;
    }
    blocks.push({
      id: `brief-concept-${concept.id}`,
      type: "text_with_subitems",
      title: concept.name,
      description: concept.desc,
      items: (concept.variants ?? []).map((variant) => ({ name: variant })),
    });
  });

  const iceNames = fn.ice
    .map((iceId) => ICE_OPTIONS.find((option) => option.id === iceId)?.name ?? iceId)
    .filter(Boolean);
  if (iceNames.length > 0) {
    blocks.push({
      id: `brief-ice-${uid()}`,
      type: "list",
      title: "Ice",
      items: iceNames,
    });
  }

  const entertainmentNames = fn.entertainment
    .map(
      (entertainmentId) =>
        ENTERTAINMENT_OPTIONS.find((option) => option.id === entertainmentId)?.name ??
        entertainmentId,
    )
    .filter(Boolean);
  if (entertainmentNames.length > 0) {
    blocks.push({
      id: `brief-entertainment-${uid()}`,
      type: "list",
      title: "Entertainment",
      items: entertainmentNames,
    });
  }

  blocks.push({
    id: `brief-staffing-${uid()}`,
    type: "simple",
    title: "Staffing",
    value: `${fn.bartenders || "0"} Bartenders / ${fn.butlers || "0"} Butlers`,
  });

  return blocks;
}

export function buildEventBriefPayload(values: EventBriefValues): EventBriefPayload {
  const eventFunctions: EventBriefPayload["functions"] = values.functions.map((fn) => ({
    functionType: fn.functionType,
    templateId: resolveFunctionTemplateId(fn.functionType),
    blocks: buildProposalBlocks(fn),
    pax: resolveFunctionPax(fn),
    bartenders: fn.bartenders,
    butlers: fn.butlers,
  }));

  const additionalChargeItems: string[] = [];
  if (values.barCharges?.trim()) {
    additionalChargeItems.push(`Bar Charges: ${values.barCharges.trim()}`);
  }
  if (values.coconutCharges?.trim()) {
    additionalChargeItems.push(`Coconut Charges: ${values.coconutCharges.trim()}`);
  }

  const standardDeliverablesFn: EventBriefPayload["functions"][number] = {
    functionType: "Standard Bar Deliverables",
    templateId: "standard-deliverables",
    blocks: [
      {
        id: "brief-standard-deliverables",
        type: "list",
        title: "",
        items: values.standardDeliverables,
      },
    ],
    pax: "",
    bartenders: "",
    butlers: "",
  };

  const pleaseNoteFn: EventBriefPayload["functions"][number] = {
    functionType: "Please Note",
    templateId: "please-note",
    blocks: [
      {
        id: "brief-please-note",
        type: "list",
        title: "Please Note",
        items: values.pleaseNote,
      },
    ],
    pax: "",
    bartenders: "",
    butlers: "",
  };

  const mixersFn: EventBriefPayload["functions"][number] = {
    functionType: "Mixers",
    templateId: "mixers",
    blocks: [],
    pax: "",
    bartenders: "",
    butlers: "",
  };

  const termsConditionsFn: EventBriefPayload["functions"][number] = {
    functionType: "Terms & Conditions",
    templateId: "terms-conditions",
    blocks: [],
    pax: "",
    bartenders: "",
    butlers: "",
  };

  const additionalChargesFn: EventBriefPayload["functions"][number] = {
    functionType: "Additional Charges",
    templateId: "additional-charges",
    blocks: [
      {
        id: "brief-additional-charges",
        type: "list",
        title: "Additional Charges",
        items: additionalChargeItems,
      },
    ],
    pax: "",
    bartenders: "",
    butlers: "",
  };

  const eventVenue =
    values.venue?.trim() ||
    values.functions.find((fn) => fn.venue?.trim())?.venue?.trim() ||
    "";

  return {
    eventName: values.eventName,
    clientName: values.clientName,
    venue: eventVenue,
    eventType: values.eventType,
    startDate: values.startDate,
    endDate: values.endDate || values.startDate,
    functions: [
      ...eventFunctions,
      ...(additionalChargeItems.length > 0 ? [additionalChargesFn] : []),
      standardDeliverablesFn,
      pleaseNoteFn,
      mixersFn,
      termsConditionsFn,
    ],
    teamFlow: values.functions.map((fn, index) => ({
      id: `row-${index + 1}`,
      date: fn.date?.trim() || values.startDate,
      functionType: fn.functionType,
      venue: fn.venue?.trim() || values.venue?.trim() || "",
      pax: resolveFunctionPax(fn),
      bartenders: Number.parseInt(fn.bartenders || "0", 10) || 0,
      butlers: Number.parseInt(fn.butlers || "0", 10) || 0,
    })),
  };
}
