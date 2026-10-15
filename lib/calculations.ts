import { TransportRecord, IngestionModel, RiskLevel, ParsedItinerary, DtSlaProfile, SlaState } from './types';
import { STAGES } from './constants';

export function parseDate(v: any): Date | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === 'number') {
    // Excel serial date to JS Date
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  const s = String(v).trim();
  if (!s) return null;
  
  // Try ISO parse
  let d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  
  // Try DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  if (m) {
    let y = +m[3];
    if (y < 100) y += 2000;
    d = new Date(y, +m[2] - 1, +m[1]);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function fmtDate(d: any): string {
  const dt = parseDate(d);
  return dt ? dt.toLocaleDateString('pt-BR') : '—';
}

export function isoDate(d: any): string {
  const dt = parseDate(d);
  if (!dt) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dayDiff(a: any, b: any): number | null {
  const da = parseDate(a);
  const db = parseDate(b);
  if (!da || !db) return null;
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

export function safeDuration(a: any, b: any): number | null {
  const d = dayDiff(a, b);
  return d === null || d < 0 ? null : d;
}

export function avg(arr: (number | null | undefined)[]): number | null {
  const valid = arr.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  return valid.length ? valid.reduce((s, v) => s + v, 0) / valid.length : null;
}

export function pct(n: number, d: number): string {
  return d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '0,0%';
}

export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr.filter(v => v !== null && v !== undefined && String(v).trim() !== ''))].sort((a, b) =>
    String(a).localeCompare(String(b), 'pt-BR', { numeric: true })
  );
}

export function countBy<T>(arr: T[], fn: (item: T) => string): Record<string, number> {
  const m: Record<string, number> = {};
  arr.forEach(x => {
    const k = fn(x) || 'Não informado';
    m[k] = (m[k] || 0) + 1;
  });
  return m;
}

export function parseTransportItinerary(raw: any): ParsedItinerary {
  const original = String(raw ?? '').trim();
  if (!original) {
    return { raw: '', origin: '', destination: '', display: '—', parsed: false };
  }
  let s = original;
  let truncated = false;
  const tIdx = s.indexOf('...');
  if (tIdx >= 0) {
    s = s.slice(0, tIdx).trim();
    truncated = true;
  }
  let origin = '';
  let destination = '';
  const byPara = s.match(/^(.*?)\s+PARA\s+(.*)$/i);
  if (byPara) {
    origin = (byPara[1] || '').replace(/[-–—]\s*$/, '').trim();
    destination = (byPara[2] || '').replace(/^[-–—]\s*/, '').trim();
  } else {
    const separators = [...s.matchAll(/\s+(?:->|→|-|–|—)\s+/g)];
    if (separators.length === 1) {
      const m = separators[0];
      const idx = m.index ?? 0;
      origin = s.slice(0, idx).trim();
      destination = s.slice(idx + m[0].length).trim();
    }
  }
  const parsed = Boolean(origin && destination);
  return {
    raw: original,
    origin,
    destination,
    display: parsed ? `${origin} → ${destination}` : original,
    parsed,
    truncated,
  };
}

export function stageStart(r: TransportRecord): Date | null {
  switch (r.status) {
    case 0: return r.created;
    case 1: return r.planEnd;
    case 2: return r.regDate;
    case 3: return r.loadStart;
    case 4: return r.loadEnd;
    case 5: return r.procDate;
    case 6: return r.actualStart || r.procDate;
    case 7: return r.actualEnd;
    default: return r.created;
  }
}

export function stageAge(r: TransportRecord, refDate: Date): number | null {
  if (r.status === 7) return 0;
  const start = stageStart(r);
  return safeDuration(start, refDate);
}

export function totalLead(r: TransportRecord): number | null {
  return safeDuration(r.created, r.actualEnd);
}

export function transitDuration(r: TransportRecord): number | null {
  return safeDuration(r.actualStart, r.actualEnd);
}

export function startDeviation(r: TransportRecord): number | null {
  if (!r.forecastStart || !r.actualStart) return null;
  return dayDiff(r.forecastStart, r.actualStart);
}

export function startOnTime(r: TransportRecord): boolean | null {
  const d = startDeviation(r);
  return d === null ? null : d <= 0;
}

export function chronologyIssues(r: TransportRecord): string[] {
  const ms: [string, Date | null][] = [
    ['Criação', r.created],
    ['Fim organização', r.planEnd],
    ['Registro', r.regDate],
    ['Início carregamento', r.loadStart],
    ['Fim carregamento', r.loadEnd],
    ['Processamento transporte', r.procDate],
    ['Início transporte', r.actualStart],
    ['Fim transporte', r.actualEnd],
  ];

  const out: string[] = [];
  for (let i = 0; i < ms.length - 1; i++) {
    const [nameA, dateA] = ms[i];
    if (!dateA) continue;
    for (let j = i + 1; j < ms.length; j++) {
      const [nameB, dateB] = ms[j];
      if (!dateB) continue;
      if (dateB.getTime() < dateA.getTime()) {
        out.push(`${nameB} (${fmtDate(dateB)}) anterior a ${nameA} (${fmtDate(dateA)})`);
      }
    }
  }
  return [...new Set(out)];
}

export function overdueDays(r: TransportRecord, refDate: Date): number | null {
  if (!r.forecastEnd) return null;
  const end = r.actualEnd || refDate;
  const d = dayDiff(r.forecastEnd, end);
  return d && d > 0 ? d : 0;
}

export function riskClass(r: TransportRecord, refDate: Date, limits: Record<number, [number, number]>): RiskLevel {
  if (r.status === 7) return 'ok';
  const age = stageAge(r, refDate);
  if (age === null) return 'ok';
  const [att, crit] = limits[r.status] || [1, 3];
  if (age >= crit) return 'crit';
  if (age >= att) return 'att';
  return 'ok';
}

export function stageDuration(r: TransportRecord, s: number): number | null {
  switch (Number(s)) {
    case 0: return safeDuration(r.created, r.planEnd);
    case 1: return safeDuration(r.planEnd, r.regDate);
    case 2: return safeDuration(r.regDate, r.loadStart);
    case 3: return safeDuration(r.loadStart, r.loadEnd);
    case 4: return safeDuration(r.loadEnd, r.procDate);
    case 5: return safeDuration(r.procDate, r.actualStart);
    case 6: return safeDuration(r.actualStart, r.actualEnd);
    default: return null;
  }
}

export function currentStageSlaOk(r: TransportRecord, refDate: Date, contractSla: Record<number, number>): boolean | null {
  if (r.status < 0 || r.status >= 7) return null;
  const age = stageAge(r, refDate);
  const sla = Number(contractSla[r.status]);
  if (age === null || !Number.isFinite(sla)) return null;
  return age <= sla;
}

export function finalSlaOk(r: TransportRecord, refDate: Date): boolean | null {
  if (!r.forecastEnd) return null;
  const end = r.actualEnd || refDate;
  return end.getTime() <= r.forecastEnd.getTime();
}

export function slaState(measured: number | null, sla: number | null): SlaState {
  if (measured === null || !Number.isFinite(measured) || sla === null || !Number.isFinite(sla)) {
    return { klass: 'neutral', icon: '•', label: 'Sem base de SLA' };
  }
  if (measured > sla) {
    return { klass: 'bad', icon: '×', label: 'Fora do SLA' };
  }
  return { klass: 'good', icon: '✓', label: 'Dentro do SLA' };
}

export function cumulativeSla(stage: number, contractSla: Record<number, number>): number | null {
  const upto = Math.min(Number(stage), 6);
  if (upto < 0) return null;
  let total = 0;
  for (let i = 0; i <= upto; i++) {
    const v = Number(contractSla?.[i]);
    if (!Number.isFinite(v)) return null;
    total += v;
  }
  return total;
}

export function cumulativeActualAtStage(r: TransportRecord, stage: number, refDate: Date): number | null {
  stage = Number(stage);
  if (stage === 7) {
    const lead = totalLead(r);
    return Number.isFinite(lead) && lead !== null && lead >= 0 ? lead : null;
  }
  if (stage > Number(r.status)) return null;
  let total = 0;
  for (let i = 0; i < stage; i++) {
    const d = stageDuration(r, i);
    if (!(Number.isFinite(d) && d !== null && d >= 0)) return null;
    total += d;
  }
  if (stage < Number(r.status)) {
    const d = stageDuration(r, stage);
    if (!(Number.isFinite(d) && d !== null && d >= 0)) return null;
    return total + d;
  }
  const age = stageAge(r, refDate);
  if (!(Number.isFinite(age) && age !== null && age >= 0)) return null;
  return total + age;
}

export function dtSlaProfile(r: TransportRecord, refDate: Date, contractSla: Record<number, number>): DtSlaProfile {
  let stageState: SlaState = { klass: 'neutral', icon: '•', label: 'Sem base de SLA' };
  let stageMeasured: number | null = null;
  let stageSla: number | null = null;

  if (Number(r.status) < 7) {
    stageMeasured = stageAge(r, refDate);
    stageSla = Number(contractSla?.[r.status]);
    stageState = slaState(stageMeasured, stageSla);
  }

  const globalMeasured = Number(r.status) === 7 ? totalLead(r) : cumulativeActualAtStage(r, r.status, refDate);
  const globalSla = Number(r.status) === 7 ? cumulativeSla(6, contractSla) : cumulativeSla(r.status, contractSla);
  const globalState = slaState(globalMeasured, globalSla);

  let overall: 'good' | 'bad' | 'neutral' = 'neutral';
  if (stageState.klass === 'bad' || globalState.klass === 'bad') overall = 'bad';
  else if (stageState.klass === 'good' || globalState.klass === 'good') overall = 'good';

  return { stageState, stageMeasured, stageSla, globalState, globalMeasured, globalSla, overall };
}

export function slaFilterMatch(r: TransportRecord, refDate: Date, filter: string, contractSla: Record<number, number>): boolean {
  if (!filter) return true;
  const p = dtSlaProfile(r, refDate, contractSla);
  if (filter === 'any_bad') return p.stageState.klass === 'bad' || p.globalState.klass === 'bad';
  if (filter === 'stage_bad') return p.stageState.klass === 'bad';
  if (filter === 'global_bad') return p.globalState.klass === 'bad';
  if (filter === 'good') return p.overall === 'good';
  return true;
}

export function addDays(d: Date | string, n: number): Date {
  const base = parseDate(d) || new Date();
  const res = new Date(base);
  res.setDate(res.getDate() + Number(n || 0));
  return res;
}

export function sameDay(a: any, b: any): boolean {
  const da = parseDate(a);
  const db = parseDate(b);
  if (!da || !db) return false;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function cleanDtValue(val: any): string {
  if (val === null || val === undefined) return '';
  let s = String(val).trim();
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      s = val.toString();
    } else {
      s = val.toFixed(0);
    }
  }
  // Remove sufixo decimal residual se houver (ex: "1154605.0")
  s = s.replace(/\.0+$/, '');
  return s;
}

export function normalizeHeader(h: string): string {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[º°]/g, 'o')
    .replace(/[.\-_/]/g, ' ')
    .replace(/\s+/g, ' ');
}

export function getValByHeader(headers: string[], row: any[], header: string, occ = 0): any {
  let found = -1;
  const cleanHeader = normalizeHeader(header);
  for (let i = 0; i < headers.length; i++) {
    const h = normalizeHeader(headers[i]);
    if (h === cleanHeader) {
      found++;
      if (found === occ) return row[i];
    }
  }
  return null;
}

export function buildRecordsFromModel(model: IngestionModel): TransportRecord[] {
  const { headers, rows } = model;
  return rows.map((row, i) => {
    const rawItin = getValByHeader(headers, row, 'Itinerário do transporte') ?? getValByHeader(headers, row, 'Itiner.transporte') ?? '';
    const parsedItin = parseTransportItinerary(rawItin);

    const rawDt =
      getValByHeader(headers, row, 'Nº transporte') ??
      getValByHeader(headers, row, 'N° transporte') ??
      getValByHeader(headers, row, 'N transporte') ??
      getValByHeader(headers, row, 'Transporte');

    const dt = cleanDtValue(rawDt);

    const r: TransportRecord = {
      _row: i + 2,
      raw: row,
      dt,
      type: String(getValByHeader(headers, row, 'Tipo de transporte', 0) ?? ''),
      typeProcess: String(getValByHeader(headers, row, 'Tipo proc.trnsp') ?? ''),
      expeditionType: String(getValByHeader(headers, row, 'Tipo de expedição') ?? ''),
      local: String(getValByHeader(headers, row, 'Local org.transporte') ?? ''),
      route: String(getValByHeader(headers, row, 'Itiner.transporte') ?? ''),
      itineraryDescription: String(rawItin),
      parsedItinerary: parsedItin,
      supplier: String(getValByHeader(headers, row, 'Fornecedor serviços') ?? ''),
      createdBy: String(getValByHeader(headers, row, 'Criado por') ?? ''),
      modifiedBy: String(getValByHeader(headers, row, 'Modificado por') ?? ''),
      status: Number(getValByHeader(headers, row, 'Status global trnsp.') ?? -1),
      created: parseDate(getValByHeader(headers, row, 'Criado em')),
      modified: parseDate(getValByHeader(headers, row, 'Modificado em')),
      planEnd: parseDate(getValByHeader(headers, row, 'Fim organização')),
      regDate: parseDate(getValByHeader(headers, row, 'Dta.atual registro')),
      loadStart: parseDate(getValByHeader(headers, row, 'Iníc.carregam.atual')),
      loadEnd: parseDate(getValByHeader(headers, row, 'Fim do carreg.atual')),
      procDate: parseDate(getValByHeader(headers, row, 'Dta.procmto.transp.')),
      forecastStart: parseDate(getValByHeader(headers, row, 'InícPrevTransp.') ?? getValByHeader(headers, row, 'Iníc.prev.transp.')),
      actualStart: parseDate(getValByHeader(headers, row, 'InícAtualTransp') ?? getValByHeader(headers, row, 'Início do transporte')),
      forecastEnd: parseDate(getValByHeader(headers, row, 'FimPrevTransp.')),
      actualEnd: parseDate(getValByHeader(headers, row, 'Fim atual trsp.') ?? getValByHeader(headers, row, 'Fim do transporte')),
      container: String(getValByHeader(headers, row, 'ID Container') ?? ''),
      sling: String(getValByHeader(headers, row, 'ID Eslinga') ?? ''),
      seal: String(getValByHeader(headers, row, 'ID Lacre') ?? ''),
      denom: String(getValByHeader(headers, row, 'Denomin.transporte') ?? ''),
      freeCapacity: Number(getValByHeader(headers, row, 'Capacidade livre') ?? 0),
    };
    return r;
  }).filter(r => Boolean(r.dt));
}
