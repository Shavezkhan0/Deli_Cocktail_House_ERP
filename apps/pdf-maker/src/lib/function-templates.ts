export type TemplateItem = {
  label: string;
  description?: string;
  items?: TemplateItem[];
};

export type FunctionTemplate = {
  id: string;
  name: string;
  data: TemplateItem[];
};

export const FUNCTION_TEMPLATES: FunctionTemplate[] = [
  {
    id: "mehendi",
    name: "MEHENDI",
    data: [
      { label: "BARTENDERS UNIFORM", description: "AS PER THEME" },
      { label: "BAR SETUP", description: "AS PER THEME" },
      {
        label: "SLUSHY MARGARITA BAR",
        description:
          "Indulge in frozen margaritas crafted made with exotic fruits like:-",
        items: [
          {
            label: "FROZEN MANGO MARGARITA",
            description:
              "A tropical frozen blend of ripe mangoes, tequila, triple sec, fresh lime juice, and ice for a smooth, refreshing sip.",
          },
          {
            label: "FROZEN BERRY MARGARITA",
            description:
              "A vibrant icy mix of mixed berries, tequila, triple sec, fresh lime juice, and ice with a sweet-tangy finish.",
          },
        ],
      },
      {
        label: "MOCKTAILS CURATED FROM FLAVOURS ACROSS INDIA",
        items: [
          { label: "Raw Mango & Curry Leaf" },
          { label: "Banarasi Paan Spritz" },
          { label: "Gur Margarita" },
          { label: "Kokum Spritz" },
        ],
      },
      {
        label: "WINTER DELIGHT",
        items: [
          {
            label: "APPLE CIDER HOT TODDY",
            description:
              "A comforting blend of warm apple cider, whisky, honey, fresh lemon juice, and seasonal spices, creating a rich and soothing winter warmer.",
          },
          {
            label: "ROSE INFUSED MULLED WINE",
            description:
              "A fragrant mix of red wine gently simmered with rose petals, citrus fruits, cinnamon, cloves, and aromatic spices for an elegant twist on the classic mulled wine.",
          },
        ],
      },
    ],
  },
  {
    id: "welcome-lunch",
    name: "WELCOME LUNCH",
    data: [
      { label: "BARTENDERS UNIFORM", description: "AS PER THEME" },
      { label: "BAR SETUP", description: "AS PER THEME" },
      { label: "APEROL MASCOT SERVING APEROL SPRITZ" },
      { label: "BLOODY MARY PASS AROUNDS" },
      { label: "DRINK GAMES", description: "Beer Pong, Amalfi Spritz Window" },
      {
        label: "MIMOSA ON WHEELS",
        description:
          "Indulge in a Mimosa Extravaganza! Our mobile mimosa bar offers fresh berries, a variety of juices, and a variety for to create your own unique mimosa.",
      },
      {
        label: "VINTAGE COLA BOTTLE BAR",
        description:
          "A perfect blend of retro charm and modern flavors, these eye-catching mocktails are served chilled in iconic cola bottles wrapped in vintage style napkins—invoking memories.",
        items: [
          {
            label: "KALA KHATTA FIZZ",
            description: "Classic street-style kala khatta with lemon, cumin salt, and soda.",
          },
          {
            label: "CITRUS PUNCH",
            description: "Fresh orange, lemon juice, mint, and a splash of soda.",
          },
          {
            label: "SPICED COLA REFRESHER",
            description: "Cola base with chaat masala, lime, and a hint of black salt.",
          },
        ],
      },
    ],
  },
];

export function getFunctionTemplate(
  value: string,
): FunctionTemplate | undefined {
  return FUNCTION_TEMPLATES.find(
    (template) => template.id === value || template.name === value,
  );
}

export type FunctionTemplateData = {
  sections?: TemplateItem[];
  selectedCocktails?: string[];
};

export function parseTemplateData(value: unknown): FunctionTemplateData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const data = value as Record<string, unknown>;
  const sections = Array.isArray(data.sections)
    ? (data.sections as TemplateItem[])
    : undefined;
  const selectedCocktails = Array.isArray(data.selectedCocktails)
    ? data.selectedCocktails.filter(
        (item): item is string => typeof item === "string",
      )
    : undefined;
  return {
    ...(sections ? { sections } : {}),
    ...(selectedCocktails ? { selectedCocktails } : {}),
  };
}

export function cloneItems(items: TemplateItem[]): TemplateItem[] {
  return items.map((item) => ({
    label: item.label,
    ...(item.description ? { description: item.description } : {}),
    ...(item.items ? { items: cloneItems(item.items) } : {}),
  }));
}

export function itemsToText(items: TemplateItem[]): string {
  return items
    .map(renderItem)
    .filter((line) => line.length > 0)
    .join("\n");
}

function renderItem(item: TemplateItem): string {
  const label = item.label.trim();
  const description = item.description?.trim();
  const children = item.items ?? [];

  if (children.length === 0) {
    return description ? `${label} - ${description}` : label;
  }

  const childLines = children
    .map(renderItem)
    .flatMap((text) => text.split("\n"))
    .map((line) => `• ${line}`);

  return [label && `${label}:`, description, ...childLines]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export function textToItems(value: string): TemplateItem[] {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const items: TemplateItem[] = [];
  for (const line of lines) {
    if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*")) {
      const label = line.replace(/^[•\-*]\s*/, "");
      const previous = items[items.length - 1];
      if (previous && !previous.items) {
        previous.items = [{ label }];
      } else {
        items.push({ label });
      }
    } else {
      items.push({ label: line });
    }
  }
  return items;
}

export type DescriptionBlock =
  | { type: "subheading"; text: string }
  | { type: "item"; text: string }
  | { type: "paragraph"; text: string };

export function parseDescription(description: string): DescriptionBlock[] {
  const lines = description
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks: DescriptionBlock[] = [];
  for (const line of lines) {
    if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*")) {
      blocks.push({ type: "item", text: line.replace(/^[•\-*]\s*/, "") });
    } else if (line === line.toUpperCase() && line.length > 2) {
      blocks.push({ type: "subheading", text: line });
    } else if (line.length > 1 && /[:：]-?$/.test(line)) {
      blocks.push({ type: "subheading", text: line });
    } else {
      blocks.push({ type: "paragraph", text: line });
    }
  }
  return blocks;
}
