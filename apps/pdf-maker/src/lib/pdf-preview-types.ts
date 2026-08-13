export type ClientPdfProposal = {
  id: string;
  eventName: string;
  eventDate: string;
  venue?: string | null;
  clientName?: string | null;
  guestCount?: number | null;
};

export type PdfBlock = {
  id: string;
  type: string;
  title: string;
  value?: string;
  description?: string;
  items?: unknown[];
};

export type PdfFunction = {
  id: string;
  functionId: string;
  name: string;
  category?: string;
  blocks: PdfBlock[];
  functionType?: string;
  pax?: string;
  bartenders?: number;
  butlers?: number;
  venue?: string;
  date?: string;
};

export type PdfSubItem = {
  name?: string | null;
  description?: string | null;
};
