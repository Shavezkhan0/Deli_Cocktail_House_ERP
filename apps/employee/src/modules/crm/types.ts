export type EventStatus = "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";

export type CrmChecklistItem = {
  id: string;
  eventId: string;
  section: string;
  label: string;
  completed: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CrmEventInventory = {
  id: string;
  eventId: string;
  itemId: string;
  requiredQuantity: number;
  availableQuantity: number;
  reserveQuantity: number;
  issueQuantity: number;
  remarks: string;
  item: {
    id: string;
    sku: string;
    itemName: string;
    category: string;
    subCategory: string | null;
    brand: string | null;
    unit: string;
  };
};

export type CrmEvent = {
  id: string;
  eventName: string;
  eventCode: string;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  venue: string;
  pax: number;
  eventType: string;
  company: string;
  crm: string | null;
  crmEmployee?: {
    id: string;
    name: string;
    employeeId: string;
    designation: string;
  } | null;
  siteManager: string | null;
  siteSupervisor: string | null;
  butlerVendor: string | null;
  bartenders: number;
  maleButler: number;
  femaleButler: number;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  status: EventStatus;
  inventoryCost: number;
  staffCost: number;
  totalCost: number;
  inventory: CrmEventInventory[];
  crmChecklist: CrmChecklistItem[];
};

export const ACTIVE_EVENT_STATUSES: EventStatus[] = ["UPCOMING", "ONGOING"];
