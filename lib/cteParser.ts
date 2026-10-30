import * as XLSX from 'xlsx';
import { CteRecord, CteIngestionModel } from './cteTypes';
import { classifyCteStatus } from './cteDictionary';

function parseExcelDate(v: any): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') {
    // Excel serial date to JS Date
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (!s) return null;

  // Se já for ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10);
  }

  // Tenta formato DD/MM/YYYY ou DD.MM.YYYY
  const m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  if (m) {
    let y = +m[3];
    if (y < 100) y += 2000;
    const mm = String(+m[2]).padStart(2, '0');
    const dd = String(+m[1]).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function normalizeHeaderName(h: string): string {
  return String(h || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.\-_/]/g, ' ')
    .replace(/\s+/g, ' ');
}

function findColValue(row: Record<string, any>, possibleNames: string[]): any {
  const normKeys = Object.keys(row).map(k => ({ original: k, norm: normalizeHeaderName(k) }));
  for (const name of possibleNames) {
    const target = normalizeHeaderName(name);
    const match = normKeys.find(k => k.norm === target || k.norm.includes(target));
    if (match && row[match.original] !== undefined && row[match.original] !== null) {
      return row[match.original];
    }
  }
  return undefined;
}

export function parseCteWorkbook(buffer: ArrayBuffer, filename: string): CteIngestionModel {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
  const sheetNames = wb.SheetNames;

  let bdRows: any[] = [];
  let tecRows: any[] = [];

  // Tenta encontrar aba de BANCO DE DADOS
  const bdName = sheetNames.find(n => n.toUpperCase().includes('BANCO') || n.toUpperCase().includes('DADOS'));
  if (bdName) {
    bdRows = XLSX.utils.sheet_to_json(wb.Sheets[bdName]);
  }

  // Tenta encontrar aba TECNOLOG
  const tecName = sheetNames.find(n => n.toUpperCase().includes('TECNO'));
  if (tecName) {
    tecRows = XLSX.utils.sheet_to_json(wb.Sheets[tecName]);
  }

  // Se nenhuma aba específica foi encontrada, usa a primeira aba da planilha
  if (bdRows.length === 0 && tecRows.length === 0 && sheetNames.length > 0) {
    bdRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetNames[0]]);
  }

  const parseRow = (r: any, sourceSheet: 'BANCO DE DADOS' | 'TECNOLOG' | 'UPLOAD', index: number): CteRecord | null => {
    const rawCte = findColValue(r, ['CT-E', 'CTE', 'NUMERO CTE', 'N CTE', 'CONHECIMENTO']);
    const rawDt = findColValue(r, ['DT', 'TRANSPORTE', 'N TRANSPORTE', 'NUMERO DT']);
    const rawStatus = findColValue(r, ['STATUS', 'STATUS ORIGINAL', 'SITUACAO']);
    const rawStatusKanban = findColValue(r, ['STATUS KANBAN', 'KANBAN STATUS', 'ETAPA KANBAN']);
    const rawOrdem = findColValue(r, ['ORDEM KANBAN', 'ORDEM']);

    const cte = rawCte !== undefined && rawCte !== null ? String(rawCte).trim() : '';
    const dt = rawDt !== undefined && rawDt !== null ? String(rawDt).trim() : '';
    const originalStatus = rawStatus !== undefined && rawStatus !== null ? String(rawStatus).trim() : '';
    const existingKanbanStatus = rawStatusKanban !== undefined && rawStatusKanban !== null ? String(rawStatusKanban).trim() : '';
    const existingOrder = rawOrdem !== undefined && rawOrdem !== null && !isNaN(Number(rawOrdem)) ? Number(rawOrdem) : null;

    // Se a linha for totalmente vazia de identificadores e status, descarta
    if (!cte && !dt && !originalStatus && !existingKanbanStatus) {
      return null;
    }

    const { kanbanStatus, order, situation, detailNextAction } = classifyCteStatus(
      originalStatus,
      existingKanbanStatus,
      existingOrder
    );

    const vehicleType = String(findColValue(r, ['Tipo Veículo', 'Tipo Veiculo', 'Veiculo']) || '').trim();
    const vessel = String(findColValue(r, ['Navio', 'Embarcação', 'Embarcacao', 'Unidade']) || '').trim();
    const emissionDate = parseExcelDate(findColValue(r, ['Data Emissão CT-e', 'Data Emissao', 'Data Emissao CT-e', 'Data']));
    const originCity = String(findColValue(r, ['Cidade de Origem', 'Origem']) || '').trim();
    const destinationCity = String(findColValue(r, ['Cidade de Destino', 'Destino']) || '').trim();
    
    const rawFreight = findColValue(r, ['Valor do Frete', 'Frete', 'Valor']);
    const freightValue = typeof rawFreight === 'number' ? rawFreight : (Number(rawFreight) || null);

    const freightCostNumber = String(findColValue(r, ['Nº CUSTO FRETE', 'Custo Frete', 'Custo']) || '').trim();
    const po = String(findColValue(r, ['PO', 'Pedido']) || '').trim();
    const migo = String(findColValue(r, ['MIGO', 'Folha de Registro', 'FR']) || '').trim();
    const netDue = String(findColValue(r, ['Vencimento liquido', 'Vencimento']) || '').trim();
    const errors = String(findColValue(r, ['ERROS', 'ERRO', 'MOTIVO ERRO']) || '').trim();
    const releaseForPayment = String(findColValue(r, ['LIBERAR P/ PGTO', 'Liberar Pagamento']) || '').trim();
    const base = String(findColValue(r, ['BASE', 'Localidade', 'Filial']) || '').trim();
    const route = String(findColValue(r, ['ROTA', 'Itinerario']) || '').trim();

    const rawTransported = findColValue(r, ['Valor Transportado', 'Valor Mercadoria']);
    const transportedValue = typeof rawTransported === 'number' ? rawTransported : (Number(rawTransported) || null);

    const gtg = String(findColValue(r, ['GTG']) || '').trim();
    const equal = String(findColValue(r, ['Igual?']) || '').trim();
    const flowType = String(findColValue(r, ['TIPO DE FLUXO', 'Fluxo']) || '').trim() || 'Não identificado';

    const rawSituacao = String(findColValue(r, ['SITUAÇÃO KANBAN', 'SITUACAO KANBAN']) || '').trim();
    const rawDetalhe = String(findColValue(r, ['DETALHE / PRÓXIMA AÇÃO', 'DETALHE', 'PROXIMA ACAO']) || '').trim();

    const id = `${cte || 'sem_cte'}_${dt || 'sem_dt'}_${sourceSheet}_${index}`;

    return {
      id,
      cte,
      dt,
      vehicleType,
      vessel,
      emissionDate,
      originCity,
      destinationCity,
      freightValue,
      freightCostNumber,
      po,
      migo,
      netDue,
      originalStatus,
      errors,
      releaseForPayment,
      base,
      route,
      transportedValue,
      gtg,
      equal,
      statusKanban: kanbanStatus,
      kanbanOrder: order,
      flowType,
      kanbanSituation: rawSituacao || situation,
      detailNextAction: rawDetalhe || detailNextAction,
      sourceSheet,
    };
  };

  const records: CteRecord[] = [];

  bdRows.forEach((r, i) => {
    const item = parseRow(r, 'BANCO DE DADOS', i);
    if (item) records.push(item);
  });

  tecRows.forEach((r, i) => {
    const item = parseRow(r, 'TECNOLOG', i);
    if (item) records.push(item);
  });

  return {
    filename,
    uploadedAt: new Date().toISOString(),
    recordCount: records.length,
    records,
  };
}
