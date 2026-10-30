export interface CteRecord {
  id: string;
  cte: string;
  dt: string;
  vehicleType: string;
  vessel: string;
  emissionDate: string | null; // ISO YYYY-MM-DD
  originCity: string;
  destinationCity: string;
  freightValue: number | null;
  freightCostNumber: string;
  po: string;
  migo: string;
  netDue: string;
  originalStatus: string;
  errors: string;
  releaseForPayment: string;
  base: string;
  route: string;
  transportedValue: number | null;
  gtg: string;
  equal: string;
  statusKanban: string;
  kanbanOrder: number | null;
  flowType: string;
  kanbanSituation: string;
  detailNextAction: string;
  sourceSheet: 'BANCO DE DADOS' | 'TECNOLOG' | 'UPLOAD';
}

export interface CteKanbanBucket {
  id: number;
  key: string;
  name: string;
  description: string;
  isSpecial?: boolean; // Para "A Classificar" (ordem 99)
}

export interface CteFilterState {
  search: string; // Busca textual geral (DT ou CT-e)
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  dts: string[];
  ctes: string[];
  vessels: string[];
  bases: string[];
  originalStatuses: string[];
  kanbanStatuses: string[];
  flowTypes: string[];
  situations: string[];
  slaStatus: string[]; // 'within', 'warning', 'overdue', 'unconfigured'
}

export interface CteDtSummary {
  dt: string;
  vessel: string;
  base: string;
  ctes: CteRecord[];
  totalCtes: number;
  faturadosCount: number;
  recusadosCount: number;
  encerradosCount: number;
  pendentesCount: number;
  aClassificarCount: number;
  consolidatedStatus: string;
  consolidatedOrder: number;
  latestEmissionDate: string | null;
  totalFreightValue: number;
  hasErrors: boolean;
  errorsList: string[];
}

export interface CteMetrics {
  totalDtsDistinct: number;
  totalCtesDistinct: number;
  totalRecords: number;
  inProgressCount: number; // Em andamento (0, 1, 2, 4)
  faturadosCount: number; // 5
  encerradosCount: number; // 6
  recusadosCount: number; // 3
  pendentesCount: number; // (1, 2, 3, 4)
  aClassificarCount: number; // 99
  faturadosPct: string;
  pendenciasPct: string;
  avgDaysOpen: number | null;
  avgDaysToFaturado: number | null;
  slaWithinPct: string;
  slaOverduePct: string;
  slaStatusText: string;
}

export interface CteSlaConfig {
  stageId: number;
  stageName: string;
  targetDays: number | null; // null = Não parametrizado
  warningDays?: number | null;
  unit: 'dias';
  startMilestone: string; // ex: 'Data de emissão'
  endCondition: string; // ex: 'Mudança de status'
}

export interface CteIngestionModel {
  filename: string;
  uploadedAt: string;
  recordCount: number;
  records: CteRecord[];
}
