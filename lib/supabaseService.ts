import { supabase, isSupabaseConfigured } from './supabaseClient';
import { TransportRecord, IngestionModel } from './types';
import { parseTransportItinerary, parseDate } from './calculations';

export interface SupabaseTransportRow {
  dt: string;
  status: number;
  local: string;
  route: string;
  itinerary_description: string;
  supplier: string;
  type: string;
  type_process: string;
  expedition_type: string;
  created_by: string;
  modified_by: string;
  container: string;
  seal: string;
  sling: string;
  denom: string;
  free_capacity: number;
  created: string | null;
  modified: string | null;
  plan_end: string | null;
  reg_date: string | null;
  load_start: string | null;
  load_end: string | null;
  proc_date: string | null;
  forecast_start: string | null;
  actual_start: string | null;
  forecast_end: string | null;
  actual_end: string | null;
  raw: any;
  updated_at?: string;
}

/**
 * Converte um registro TransportRecord do frontend para o formato do Supabase
 */
export function recordToSupabaseRow(r: TransportRecord): SupabaseTransportRow {
  return {
    dt: r.dt,
    status: Number(r.status) || 0,
    local: r.local || '',
    route: r.route || '',
    itinerary_description: r.itineraryDescription || '',
    supplier: r.supplier || '',
    type: r.type || '',
    type_process: r.typeProcess || '',
    expedition_type: r.expeditionType || '',
    created_by: r.createdBy || '',
    modified_by: r.modifiedBy || '',
    container: r.container || '',
    seal: r.seal || '',
    sling: r.sling || '',
    denom: r.denom || '',
    free_capacity: Number(r.freeCapacity) || 0,
    created: r.created ? r.created.toISOString() : null,
    modified: r.modified ? r.modified.toISOString() : null,
    plan_end: r.planEnd ? r.planEnd.toISOString() : null,
    reg_date: r.regDate ? r.regDate.toISOString() : null,
    load_start: r.loadStart ? r.loadStart.toISOString() : null,
    load_end: r.loadEnd ? r.loadEnd.toISOString() : null,
    proc_date: r.procDate ? r.procDate.toISOString() : null,
    forecast_start: r.forecastStart ? r.forecastStart.toISOString() : null,
    actual_start: r.actualStart ? r.actualStart.toISOString() : null,
    forecast_end: r.forecastEnd ? r.forecastEnd.toISOString() : null,
    actual_end: r.actualEnd ? r.actualEnd.toISOString() : null,
    raw: r.raw || [],
  };
}

/**
 * Converte um registro do Supabase para o formato TransportRecord do frontend
 */
export function supabaseRowToRecord(row: SupabaseTransportRow, index = 0): TransportRecord {
  const parsedItin = parseTransportItinerary(row.itinerary_description || row.route);

  return {
    _row: index + 2,
    raw: row.raw || [],
    dt: String(row.dt || ''),
    type: row.type || '',
    typeProcess: row.type_process || '',
    expeditionType: row.expedition_type || '',
    local: row.local || '',
    route: row.route || '',
    itineraryDescription: row.itinerary_description || '',
    parsedItinerary: parsedItin,
    supplier: row.supplier || '',
    createdBy: row.created_by || '',
    modifiedBy: row.modified_by || '',
    status: Number(row.status) || 0,
    created: parseDate(row.created),
    modified: parseDate(row.modified),
    planEnd: parseDate(row.plan_end),
    regDate: parseDate(row.reg_date),
    loadStart: parseDate(row.load_start),
    loadEnd: parseDate(row.load_end),
    procDate: parseDate(row.proc_date),
    forecastStart: parseDate(row.forecast_start),
    actualStart: parseDate(row.actual_start),
    forecastEnd: parseDate(row.forecast_end),
    actualEnd: parseDate(row.actual_end),
    container: row.container || '',
    sling: row.sling || '',
    seal: row.seal || '',
    denom: row.denom || '',
    freeCapacity: Number(row.free_capacity) || 0,
  };
}

/**
 * Busca todas as ordens de transporte do Supabase com suporte a paginação (> 1000 registros)
 */
export async function fetchRecordsFromSupabase(): Promise<TransportRecord[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const allRows: SupabaseTransportRow[] = [];
    const PAGE_SIZE = 1000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('transport_records')
        .select('*')
        .order('dt', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error('Erro ao buscar dados do Supabase:', error);
        return null;
      }

      if (data && data.length > 0) {
        allRows.push(...(data as SupabaseTransportRow[]));
        from += PAGE_SIZE;
        hasMore = data.length === PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }

    if (allRows.length === 0) return [];

    return allRows.map((row, idx) => supabaseRowToRecord(row, idx));
  } catch (err) {
    console.error('Falha na comunicação com o Supabase:', err);
    return null;
  }
}

/**
 * Salva ordens de transporte no Supabase. Por padrão, substitui integralmente a base anterior
 * para que o novo arquivo não se misture com registros legados.
 */
export async function saveRecordsToSupabase(
  records: TransportRecord[],
  filename = 'Upload Excel',
  replaceExisting = true
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, count: 0, error: 'Supabase não configurado nas variáveis de ambiente' };
  }

  try {
    // Deduplica por DT para evitar o erro PostgreSQL 21000 ("ON CONFLICT DO UPDATE command cannot affect row a second time")
    // que ocorre quando a planilha do SAP VT11 possui múltiplas linhas para o mesmo Nº de transporte.
    const rowMap = new Map<string, SupabaseTransportRow>();
    records.forEach(r => {
      const dt = String(r.dt || '').trim();
      if (dt) {
        rowMap.set(dt, recordToSupabaseRow(r));
      }
    });

    const rows = Array.from(rowMap.values());
    if (rows.length === 0) {
      return { success: false, count: 0, error: 'Nenhum registro com Nº de transporte válido foi encontrado.' };
    }

    // Se replaceExisting for verdadeiro, limpa todos os registros existentes antes de inserir a nova base
    if (replaceExisting) {
      const { error: delError } = await supabase
        .from('transport_records')
        .delete()
        .neq('dt', '');

      if (delError) {
        console.error('Erro ao limpar base antiga no Supabase:', delError);
        return { success: false, count: 0, error: `Falha ao substituir base antiga: ${delError.message}` };
      }
    }

    const BATCH_SIZE = 200;
    let upsertedCount = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('transport_records')
        .upsert(batch, { onConflict: 'dt' });

      if (error) {
        console.error(`Erro ao salvar lote ${i / BATCH_SIZE + 1} no Supabase:`, error);
        return { success: false, count: upsertedCount, error: error.message };
      }

      upsertedCount += batch.length;
    }

    // Registra log do upload
    try {
      await supabase.from('upload_logs').insert({
        filename,
        record_count: upsertedCount,
      });
    } catch (logErr) {
      console.warn('Erro ao gravar log de upload:', logErr);
    }

    return { success: true, count: upsertedCount };
  } catch (err: any) {
    console.error('Exceção ao persistir no Supabase:', err);
    return { success: false, count: 0, error: err.message || 'Erro inesperado' };
  }
}

/**
 * Busca o nome do último arquivo Excel importado no Supabase
 */
export async function fetchLatestUploadLog(): Promise<{ filename: string; uploadedAt: string } | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('upload_logs')
      .select('filename, uploaded_at')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return {
      filename: data.filename,
      uploadedAt: data.uploaded_at,
    };
  } catch {
    return null;
  }
}

/**
 * Busca configurações globais compartilhadas (Mapeamento de Navios, SLA)
 */
export async function fetchSystemSetting<T>(key: string): Promise<T | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('data')
      .eq('id', key)
      .maybeSingle();

    if (error || !data) return null;
    return data.data as T;
  } catch {
    return null;
  }
}

/**
 * Salva uma configuração global compartilhada no Supabase
 */
export async function saveSystemSetting(key: string, data: any): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const { error } = await supabase
      .from('system_settings')
      .upsert({ id: key, data, updated_at: new Date().toISOString() }, { onConflict: 'id' });

    return !error;
  } catch {
    return false;
  }
}
