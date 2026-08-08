import { ValidationError } from "./errors";

export interface CrmChecklistItemInput {
  section: string;
  label: string;
}

export const DEFAULT_CRM_CHECKLIST: readonly CrmChecklistItemInput[] = [
  { section: "Checklist Start", label: "Client & WhatsApp Group" },
  { section: "Checklist Start", label: "UPLOAD DETAILS ON WHATSAPP GROUP" },
  { section: "Checklist Start", label: "PC WILL ASSIGN CRM ON THE PROJECT" },
  {
    section: "Checklist Start",
    label: "CREATE THE CLIENT WHATSAPP GROUP USING THE CORRECT FORMAT",
  },
  {
    section: "Checklist Start",
    label:
      "ADD ALL RELEVANT TEAM MEMBERS TO THE GROUP (DIRECTORS, PROCESS COORDINATOR, SITE MANAGER, CRM HEAD, CRM)",
  },
  {
    section: "Checklist Start",
    label:
      "SEND THE WELCOME MESSAGE TO THE CLIENT AND INTRODUCE YOURSELF WITH SITE MANAGER",
  },
  {
    section: "Checklist Start",
    label: "CREATE CRM SHEET WITH EXISTING DETAILS",
  },
  {
    section: "Liquor & Alcohol Requirements",
    label: "HAVE YOU DISCUSSED LIQUOR LIST AND ITS BRANDS WITH CLIENT?",
  },
  {
    section: "Liquor & Alcohol Requirements",
    label: "IS ALCOHOL ALIGNED WITH EXPERIENTIAL STATIONS?",
  },
  {
    section: "Liquor & Alcohol Requirements",
    label:
      "IS THERE ANY JAPANESE ALCOHOL TO BE ADDED TO THE ALCOHOL LIST IF THE CLIENT HAS A JAPANESE BAR?",
  },
  {
    section: "Liquor & Alcohol Requirements",
    label: "SEND LIQUOR LIST TO CLIENT",
  },
  {
    section: "Liquor & Alcohol Requirements",
    label:
      "IS THERE ANY OTHER ALCOHOL SPECIFICALLY REQUIRED FOR ANY EXPERIENTIAL STATION AS PER THE CONTRACT / AS PER THE PDF?",
  },
  {
    section: "Liquor & Alcohol Requirements",
    label:
      "SEND REQUIRED DETAILS MESSAGE IN THE GROUP (LIKE - THEME, VENUE, START TIME, BAR SIZE)",
  },
  {
    section: "Liquor & Alcohol Requirements",
    label:
      "IF BEVERAGES AND GLASSWARE ARE PROVIDED BY THE HOTEL, YOU NEED TO SEND THEM THE REQUIREMENTS",
  },
  {
    section: "Liquor & Alcohol Requirements",
    label: "IF BEVERAGE BY DCH - CHECK THIS",
  },
  {
    section: "Liquor & Alcohol Requirements",
    label: "IF GLASSWARE BY DCH - CHECK THIS",
  },
  {
    section: "Bar Requirements",
    label:
      "CONFIRM WITH THE SITE MANAGER OR CLIENT ABOUT THE DRINKING CROWD SIZE, AND BASED ON THAT, SEND THE BAR REQUIREMENTS TO THE CLIENT OR PLANNER",
  },
  {
    section: "Bar Requirements",
    label:
      "CONFIRM WITH THE SITE MANAGER IF THE BAR SIZE IS OKAY AS PER HIM. TAKE A WRITTEN CONFIRMATION ON WHATSAPP FROM HIM",
  },
  {
    section: "Bar Requirements",
    label: "SEND TABLE REQUIREMENTS TO CLIENT (TO KEEP BAR ITEMS)",
  },
  {
    section: "Bar Requirements",
    label: "DID YOU CONFIRM THE BAR SET-UP TIMINGS WITH THE CLIENT?",
  },
  {
    section: "Cocktail & Mocktail Menu",
    label: "SEND THE DCH MASTER MENU FOR COCKTAILS SELECTION ON WHATSAPP GROUP",
  },
  {
    section: "Cocktail & Mocktail Menu",
    label: "GET THE COCKTAILS & MOCKTAILS CONFIRMED FROM THE CLIENT",
  },
  {
    section: "Cocktail & Mocktail Menu",
    label: "CLIENT APPROVED THE FINAL NUMBER OF DRINKS? (MAXIMUM 6 IN 1 MENU)",
  },
  {
    section: "Cocktail & Mocktail Menu",
    label:
      "CONFIRM COUPLE INITIALS, WEDDING HASHTAGS / COMPANY NAME TO BE INCLUDED IN THE MENU",
  },
  {
    section: "Cocktail & Mocktail Menu",
    label: "ASK IF THERE'S ANY THEME / LOGO THEY'D LIKE TO INCLUDE IN THE MENU",
  },
  {
    section: "Cocktail & Mocktail Menu",
    label:
      "ASK IF THE CLIENT LIKES CUSTOM-NAMED COCKTAILS OR GENERIC COCKTAIL NAMES",
  },
  {
    section: "Menu Information & Design",
    label: "DID YOU RECEIVE COMPLETE INFORMATION FROM THE CLIENT?",
  },
  {
    section: "Menu Information & Design",
    label: "SEND FINAL COMPLETE INFORMATION OF MENU TO THE DESIGNER USING FMS",
  },
  {
    section: "Menu Information & Design",
    label: "ARE MENUS BEING SENT ON WHATSAPP FOR PREPARATION?",
  },
  {
    section: "Menu Information & Design",
    label: "HAS THE FIRST DRAFT OF THE MENU BEEN SHARED TO THE CLIENT?",
  },
  {
    section: "Menu Information & Design",
    label: "CLIENT SHARED FEEDBACK OR EDITS, MENU EDITS BEEN MADE?",
  },
  {
    section: "Menu Information & Design",
    label: "CLIENT APPROVED THE FINAL MENU?",
  },
  {
    section: "Menu Information & Design",
    label:
      "HAVE YOU VERIFIED THE MENU TO CHECK IF THERE ARE ANY GRAMMATICAL MISTAKES?",
  },
  {
    section: "Menu Information & Design",
    label: "HAVE YOU SHARED THE FINAL MENU TO VENDOR WITH DEADLINE?",
  },
  {
    section: "Menu Information & Design",
    label:
      "HAVE YOU CONFIRMED WHERE THE MENU WILL BE DELIVERED AFTER IT IS PRINTED?",
  },
  {
    section: "Menu Information & Design",
    label: "ARE MENUS PRINTED AND READY FOR DISPATCH 1 DAY BEFORE THE EVENT?",
  },
  {
    section: "Menu Information & Design",
    label:
      "REQUEST BRIDE & GROOM FOR A SHORT STORY / JOKES ABOUT THEMSELVES IF THEY WANT NAMES ON THE MENU.",
  },
  {
    section: "Client Follow-up",
    label: "SEND A GENTLE REMINDER TO THE CLIENT WITH UPDATED CRM SHEET",
  },
  {
    section: "Client Follow-up",
    label:
      "DIRECTOR TO PERSONALLY MESSAGE CLIENT TO CHECK IF ALL COORDINATION IS GOING SMOOTHLY, MENU AND DESIGNS APPROVED, AND THEY ARE HAPPY WITH PROGRESS",
  },
  {
    section: "Purchasing",
    label: "ONE DAY BEFORE THE EVENT YOU NEED TO SHARE POF WITH SITE MANAGER",
  },
  { section: "Purchasing", label: "ALL PURCHASING DONE?" },
  { section: "Purchasing", label: "IF BARAAT YES - THEN PURCHASING DONE?" },
  {
    section: "MOM / Minutes of Meeting",
    label: "CREATE CRM - MOM (MINUTES OF MEETING)",
  },
  {
    section: "MOM / Minutes of Meeting",
    label: "UPDATE MOM IN GROUP 1 DAY BEFORE THE EVENT",
  },
  {
    section: "MOM / Minutes of Meeting",
    label:
      "DID YOU VERIFY FROM THE GODOWN MANAGER WHETHER THE MOM GIVEN DETAILS ARE AVAILABLE AT THE GODOWN OR NOT?",
  },
  {
    section: "MOM / Minutes of Meeting",
    label:
      "DID YOU INFORM THE PURCHASE DEPARTMENT IF THE ITEM WAS NOT AVAILABLE?",
  },
  {
    section: "Final Event Preparation",
    label: "HAVE YOU SHARED THE PDF TO SITE MANAGER 1 DAY BEFORE THE EVENT?",
  },
  {
    section: "Final Event Preparation",
    label:
      "IF THE EVENT IS OUTSIDE DELHI THEN SHARE E-WAY BILL DETAILS IN GROUP",
  },
  {
    section: "Final Event Preparation",
    label: "SEND MOM + POF + MENU (ONE DAY BEFORE EVENT)",
  },
  {
    section: "Final Event Preparation",
    label: "CRM ENSURE MENU AND ALL REACHED TO SITE",
  },
];

export function normalizeCrmSection(value: unknown): string {
  if (typeof value !== "string") {
    return "General";
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "General";
}

export function parseCrmChecklist(
  value: unknown,
): CrmChecklistItemInput[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  const isValidEntry = (
    entry: unknown,
  ): entry is { section: string; label: string } =>
    typeof entry === "object" &&
    entry !== null &&
    typeof (entry as { section?: unknown }).section === "string" &&
    typeof (entry as { label?: unknown }).label === "string";

  if (!Array.isArray(value) || !value.every(isValidEntry)) {
    throw new ValidationError(
      "CRM checklist must be an array of items with a section and label",
    );
  }

  return value
    .map((entry) => ({
      section: normalizeCrmSection(entry.section),
      label: entry.label.trim(),
    }))
    .filter((entry) => entry.label.length > 0);
}

export function toCrmChecklistCreateInput(
  items: readonly CrmChecklistItemInput[],
): { label: string; section: string; sortOrder: number }[] {
  return items.map((item, index) => ({
    label: item.label,
    section: item.section,
    sortOrder: index,
  }));
}
