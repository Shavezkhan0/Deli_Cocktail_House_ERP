export interface TeamFlowRow {
  id: string;
  date: string;
  functionType: string;
  functionId: string;
  venue?: string;
  pax: string;
  bartenders: number;
  bartendersNote?: string;
  butlers: number;
}