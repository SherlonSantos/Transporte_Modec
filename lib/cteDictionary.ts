import { CteKanbanBucket, CteRecord } from './cteTypes';

export const CTE_KANBAN_BUCKETS: CteKanbanBucket[] = [
  {
    id: 0,
    key: 'aguardando_cte',
    name: 'Aguardando CT-e',
    description: 'Demandas aguardando emissão, recebimento ou novo CT-e',
  },
  {
    id: 1,
    key: 'em_analise',
    name: 'Em Análise',
    description: 'Documentos aguardando análise ou verificação',
  },
  {
    id: 2,
    key: 'pendencia_operacional',
    name: 'Pendência Operacional',
    description: 'Pendências documentais ou operacionais',
  },
  {
    id: 3,
    key: 'recusado',
    name: 'Recusado / Reprocessamento',
    description: 'CT-es recusados e processos que necessitam correção',
  },
  {
    id: 4,
    key: 'aguardando_pagamento',
    name: 'Aguardando Pagamento',
    description: 'Documentos encaminhados para pagamento manual',
  },
  {
    id: 5,
    key: 'faturado',
    name: 'Faturado',
    description: 'CT-es com processo de faturamento concluído',
  },
  {
    id: 6,
    key: 'encerrado',
    name: 'Encerrado',
    description: 'CT-es cancelados, substituídos ou encerrados',
  },
  {
    id: 99,
    key: 'a_classificar',
    name: 'A Classificar',
    description: 'Registros a revisar / fluxo EPCI / status não determinado',
    isSpecial: true,
  },
];

export interface CteDictionaryEntry {
  originalStatus: string;
  kanbanStatus: string;
  order: number;
  situation: string;
  ruleNextAction: string;
}

export const DEFAULT_CTE_DICTIONARY: Record<string, CteDictionaryEntry> = {
  'AG. CTE': {
    originalStatus: 'AG. CTE',
    kanbanStatus: 'Aguardando CT-e',
    order: 0,
    situation: 'Em andamento',
    ruleNextAction: 'Aguardando emissão do CT-e',
  },
  'AG. NOVO CTE': {
    originalStatus: 'AG. NOVO CTE',
    kanbanStatus: 'Aguardando CT-e',
    order: 0,
    situation: 'Em andamento',
    ruleNextAction: 'Aguardando nova emissão do CT-e',
  },
  'ERRO EM ANÁLISE': {
    originalStatus: 'ERRO EM ANÁLISE',
    kanbanStatus: 'Em Análise',
    order: 1,
    situation: 'Em andamento',
    ruleNextAction: 'Análise de erro',
  },
  'ERRO EM ANALISE': {
    originalStatus: 'ERRO EM ANALISE',
    kanbanStatus: 'Em Análise',
    order: 1,
    situation: 'Em andamento',
    ruleNextAction: 'Análise de erro',
  },
  'VERIFICAR': {
    originalStatus: 'VERIFICAR',
    kanbanStatus: 'Em Análise',
    order: 1,
    situation: 'Em andamento',
    ruleNextAction: 'Verificação pendente',
  },
  'ZT02 - ANALISAR': {
    originalStatus: 'ZT02 - ANALISAR',
    kanbanStatus: 'Em Análise',
    order: 1,
    situation: 'Em andamento',
    ruleNextAction: 'Tratar transação ZT02',
  },
  'FALTA COMPROVANTE EM ANEXO': {
    originalStatus: 'FALTA COMPROVANTE EM ANEXO',
    kanbanStatus: 'Pendência Operacional',
    order: 2,
    situation: 'Em andamento',
    ruleNextAction: 'Anexar comprovante',
  },
  'VENDA AGUARDANDO CHEGADA': {
    originalStatus: 'VENDA AGUARDANDO CHEGADA',
    kanbanStatus: 'Pendência Operacional',
    order: 2,
    situation: 'Em andamento',
    ruleNextAction: 'Aguardar chegada da venda',
  },
  'RECUSADO': {
    originalStatus: 'RECUSADO',
    kanbanStatus: 'Recusado / Reprocessamento',
    order: 3,
    situation: 'Reprocessamento',
    ruleNextAction: 'CT-e recusado; avaliar correção/reemissão',
  },
  'ENVIAR PARA PGTO MANUAL': {
    originalStatus: 'ENVIAR PARA PGTO MANUAL',
    kanbanStatus: 'Aguardando Pagamento',
    order: 4,
    situation: 'Em andamento',
    ruleNextAction: 'Encaminhar para pagamento manual',
  },
  'FATURADO PO DE TRANSPORTE': {
    originalStatus: 'FATURADO PO DE TRANSPORTE',
    kanbanStatus: 'Faturado',
    order: 5,
    situation: 'Concluído',
    ruleNextAction: 'Faturado pela PO de transporte',
  },
  'FATURADO PO DE VENDA': {
    originalStatus: 'FATURADO PO DE VENDA',
    kanbanStatus: 'Faturado',
    order: 5,
    situation: 'Concluído',
    ruleNextAction: 'Faturado pela PO de venda',
  },
  'CT-E CANCELADO': {
    originalStatus: 'CT-E CANCELADO',
    kanbanStatus: 'Encerrado',
    order: 6,
    situation: 'Encerrado',
    ruleNextAction: 'CT-e cancelado',
  },
  'CTE CANCELADO': {
    originalStatus: 'CTE CANCELADO',
    kanbanStatus: 'Encerrado',
    order: 6,
    situation: 'Encerrado',
    ruleNextAction: 'CT-e cancelado',
  },
  'SUBSTITUÍDO': {
    originalStatus: 'SUBSTITUÍDO',
    kanbanStatus: 'Encerrado',
    order: 6,
    situation: 'Encerrado',
    ruleNextAction: 'CT-e substituído',
  },
  'SUBSTITUIDO': {
    originalStatus: 'SUBSTITUIDO',
    kanbanStatus: 'Encerrado',
    order: 6,
    situation: 'Encerrado',
    ruleNextAction: 'CT-e substituído',
  },
  'EPCI': {
    originalStatus: 'EPCI',
    kanbanStatus: 'A Classificar',
    order: 99,
    situation: 'Revisar',
    ruleNextAction: 'EPCI é fluxo e não estágio: confirmar situação do CT-e',
  },
};

/**
 * Normaliza string de status para consulta no dicionário
 */
export function normalizeStatusKey(s: string): string {
  return String(s || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Classifica um registro com base no status original e no status previamente gravado na planilha
 */
export function classifyCteStatus(
  originalStatus: string,
  existingKanbanStatus?: string,
  existingOrder?: number | null
): {
  kanbanStatus: string;
  order: number;
  situation: string;
  detailNextAction: string;
  isDivergent: boolean;
  calculatedStatus: string;
} {
  const norm = normalizeStatusKey(originalStatus);
  const match = DEFAULT_CTE_DICTIONARY[norm] || DEFAULT_CTE_DICTIONARY[originalStatus.trim().toUpperCase()];

  const calculatedStatus = match ? match.kanbanStatus : 'A Classificar';
  const calculatedOrder = match ? match.order : 99;
  const situation = match ? match.situation : 'Revisar';
  const detailNextAction = match ? match.ruleNextAction : 'Status não mapeado ou ausente';

  // Se já existe um STATUS KANBAN válido preenchido na planilha, prioriza-o
  if (existingKanbanStatus && existingKanbanStatus.trim()) {
    const isDivergent = match ? existingKanbanStatus.trim() !== calculatedStatus : false;
    let order = existingOrder !== null && existingOrder !== undefined ? existingOrder : calculatedOrder;
    if (order === null || isNaN(order)) {
      const bucket = CTE_KANBAN_BUCKETS.find(b => b.name.toLowerCase() === existingKanbanStatus.trim().toLowerCase());
      order = bucket ? bucket.id : calculatedOrder;
    }

    return {
      kanbanStatus: existingKanbanStatus.trim(),
      order,
      situation,
      detailNextAction,
      isDivergent,
      calculatedStatus,
    };
  }

  return {
    kanbanStatus: calculatedStatus,
    order: calculatedOrder,
    situation,
    detailNextAction,
    isDivergent: false,
    calculatedStatus,
  };
}

/**
 * Cores e badges para os status do Kanban de CT-e
 */
export const CTE_STATUS_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'Aguardando CT-e': {
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-300',
    dot: 'bg-sky-500',
  },
  'Em Análise': {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-300',
    dot: 'bg-blue-500',
  },
  'Pendência Operacional': {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
    dot: 'bg-amber-500',
  },
  'Recusado / Reprocessamento': {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-300',
    dot: 'bg-red-500',
  },
  'Aguardando Pagamento': {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-300',
    dot: 'bg-purple-500',
  },
  'Faturado': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    dot: 'bg-emerald-500',
  },
  'Encerrado': {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    dot: 'bg-slate-400',
  },
  'A Classificar': {
    bg: 'bg-amber-100/70',
    text: 'text-amber-900',
    border: 'border-amber-400',
    dot: 'bg-amber-600',
  },
};

/**
 * Cores dos cards com base no nível de atenção/criticidade (mantendo o mesmo padrão do Kanban de transporte)
 */
export function getCteRiskBorder(order: number | null, errors: string): string {
  if (order === 3 || (errors && errors.length > 0)) {
    // Recusado ou possui erro explícito
    return 'border-l-4 border-l-red-500';
  }
  if (order === 1 || order === 2 || order === 4 || order === 0) {
    // Pendente / Em andamento
    return 'border-l-4 border-l-amber-500';
  }
  if (order === 5) {
    // Faturado com sucesso
    return 'border-l-4 border-l-emerald-500';
  }
  if (order === 6) {
    // Encerrado / Cancelado
    return 'border-l-4 border-l-slate-400';
  }
  // A Classificar (99)
  return 'border-l-4 border-l-yellow-400';
}
