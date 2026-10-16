export interface ParsedItinerary {
  raw: string;
  origin: string;
  destination: string;
  display: string;
  parsed: boolean;
  truncated?: boolean;
}

export interface TransportRecord {
  _row: number;
  raw: any[];
  dt: string;
  type: string;
  typeProcess: string;
  expeditionType: string;
  local: string;
  route: string;
  itineraryDescription: string;
  parsedItinerary: ParsedItinerary;
  supplier: string;
  createdBy: string;
  modifiedBy: string;
  status: number;
  created: Date | null;
  modified: Date | null;
  planEnd: Date | null;
  regDate: Date | null;
  loadStart: Date | null;
  loadEnd: Date | null;
  procDate: Date | null;
  forecastStart: Date | null;
  actualStart: Date | null;
  forecastEnd: Date | null;
  actualEnd: Date | null;
  container: string;
  sling: string;
  seal: string;
  denom: string;
  freeCapacity: number;
}

export interface IngestionModel {
  filename: string;
  headers: string[];
  rows: any[][];
  uploadedAt?: string;
}

export type RiskLevel = 'ok' | 'att' | 'crit';

export type SlaStatusType = 'good' | 'bad' | 'neutral';

export interface SlaState {
  klass: SlaStatusType;
  icon: string;
  label: string;
}

export interface DtSlaProfile {
  stageState: SlaState;
  stageMeasured: number | null;
  stageSla: number | null;
  globalState: SlaState;
  globalMeasured: number | null;
  globalSla: number | null;
  overall: SlaStatusType;
}

export interface FilterState {
  search: string;
  status: string;
  local?: string;
  locals: string[];
  route?: string;
  routes: string[];
  supplier?: string;
  suppliers: string[];
  expeditionType?: string;
  expeditionTypes: string[];
  type?: string;
  types: string[];
  slaFilter?: string;
  slaFilters: string[]; // ['any_bad' | 'stage_bad' | 'global_bad' | 'good']
  refDate: string; // YYYY-MM-DD
  createdFrom?: string; // YYYY-MM-DD
  createdTo?: string; // YYYY-MM-DD
  horizonDays: number;
  scheduleMode: 'end' | 'start';
  showDone: boolean;
}

export interface VesselMapping {
  [code: string]: string;
}

export interface SemaphoreThresholds {
  green: number;
  amber: number;
}
