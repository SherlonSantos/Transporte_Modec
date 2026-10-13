'use client';

import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Clock,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Maximize2,
  X,
  LayoutGrid,
  Table as TableIcon,
  Search,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { TransportRecord, VesselMapping } from '@/lib/types';
import { STAGES } from '@/lib/constants';
import {
  fmtDate,
  isoDate,
  stageAge,
  totalLead,
  overdueDays,
  riskClass,
  dtSlaProfile,
  startDeviation,
  transitDuration,
} from '@/lib/calculations';
import { InfoTooltip } from './InfoTooltip';

interface KanbanTabProps {
  data: TransportRecord[];
  vesselMap: VesselMapping;
  refDate: Date;
  limits: Record<number, [number, number]>;
  contractSla: Record<number, number>;
  onSelectDt: (dt: string) => void;
}

export const KanbanTab: React.FC<KanbanTabProps> = ({
  data,
  vesselMap,
  refDate,
  limits,
  contractSla,
  onSelectDt,
}) => {
  const [visibleCountByStage, setVisibleCountByStage] = useState<Record<number, number>>({});
  // Per-column sorting: default 'desc' (highest aging first)
  const [stageSortOrder, setStageSortOrder] = useState<Record<number, 'desc' | 'asc'>>({});

  // Expanded Stage Modal State
  const [expandedStageId, setExpandedStageId] = useState<number | null>(null);
  const [expandedSearch, setExpandedSearch] = useState<string>('');
  const [expandedViewMode, setExpandedViewMode] = useState<'grid' | 'table'>('grid');

  // Close expanded modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedStageId !== null) {
        setExpandedStageId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedStageId]);

  const getLimitForStage = (stageId: number) => visibleCountByStage[stageId] || 40;

  const handleShowMore = (stageId: number) => {
    setVisibleCountByStage(prev => ({
      ...prev,
      [stageId]: (prev[stageId] || 40) + 40,
    }));
  };

  const getSortOrder = (stageId: number): 'desc' | 'asc' => {
    return stageSortOrder[stageId] || 'desc';
  };

  const toggleColumnSort = (stageId: number) => {
    setStageSortOrder(prev => ({
      ...prev,
      [stageId]: (prev[stageId] || 'desc') === 'desc' ? 'asc' : 'desc',
    }));
  };

  const setAllSort = (order: 'desc' | 'asc') => {
    const next: Record<number, 'desc' | 'asc'> = {};
    STAGES.forEach(s => {
      next[s.id] = order;
    });
    setStageSortOrder(next);
  };

  const isAllDesc = STAGES.every(s => getSortOrder(s.id) === 'desc');
  const isAllAsc = STAGES.every(s => getSortOrder(s.id) === 'asc');

  const getRecordMetric = (r: TransportRecord, stageId: number): number | null => {
    return stageId === 7 ? totalLead(r) : stageAge(r, refDate);
  };

  // Export stage to Excel (.xlsx)
  const exportStageToExcel = (stageId: number, customRecords?: TransportRecord[]) => {
    const stageDef = STAGES.find(s => s.id === stageId);
    const stageCodeName = stageDef ? `${stageDef.id}_${stageDef.short.replace(/[^a-zA-Z0-9]/g, '_')}` : `Etapa_${stageId}`;
    const recordsToExport = customRecords || data.filter(r => r.status === stageId);

    const rowsOut = recordsToExport.map(r => {
      const p = dtSlaProfile(r, refDate, contractSla);
      const od = overdueDays(r, refDate);
      const dev = startDeviation(r);
      const transit = transitDuration(r);
      const vessel = vesselMap[r.local] ? `${vesselMap[r.local]}` : r.local || '';

      return {
        'DT': r.dt,
        'Status': r.status,
        'Etapa': stageDef?.name || `Etapa ${r.status}`,
        'Local': r.local,
        'Embarcação / Unidade': vessel,
        'Tipo de Expedição': r.expeditionType || '',
        'Tipo de Transporte': r.type || '',
        'Cód. Itinerário SAP': r.route || '',
        'Origem': r.parsedItinerary.origin || '',
        'Destino': r.parsedItinerary.destination || '',
        'Itinerário Completo': r.itineraryDescription || '',
        'Fornecedor': r.supplier || '',
        'Criado por': r.createdBy || '',
        'Criado em': fmtDate(r.created),
        'Início Previsto Transporte': fmtDate(r.forecastStart),
        'Início Efetivo Transporte': fmtDate(r.actualStart),
        'Desvio do Início (dias)': dev !== null ? dev : '',
        'Fim Previsto (SLA)': fmtDate(r.forecastEnd),
        'Fim Atual (Entrega)': fmtDate(r.actualEnd),
        'Aging Etapa (dias)': r.status === 7 ? '' : stageAge(r, refDate) ?? '',
        'Lead Time Total (dias)': totalLead(r) ?? '',
        'Atraso Entrega (dias)': od ?? 0,
        'SLA Etapa (dias)': p.stageSla ?? '',
        'Status SLA Etapa': r.status === 7 ? 'Concluída' : p.stageState.label,
        'Consumo SLA Etapa': p.stageMeasured !== null ? `${p.stageMeasured} / ${p.stageSla} d` : '',
        'Status SLA Global': p.globalState.klass === 'good' ? 'Dentro do SLA global' : p.globalState.klass === 'bad' ? 'Fora do SLA global' : 'Sem base',
        'Consumo SLA Global': p.globalMeasured !== null ? `${p.globalMeasured} / ${p.globalSla} d` : '',
        'Tempo Status 6 → 7 (dias)': transit !== null ? transit : '',
        'ID Container': r.container || '',
        'ID Eslinga': r.sling || '',
        'ID Lacre': r.seal || '',
        'Denominação': r.denom || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rowsOut);
    const wb = XLSX.utils.book_new();
    const sheetTitle = (stageDef ? `Etapa ${stageDef.id}` : `Etapa ${stageId}`).slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
    XLSX.writeFile(wb, `kanban_etapa_${stageCodeName}_${isoDate(refDate)}.xlsx`);
  };

  // Expanded stage definition and records
  const expandedStageDef = useMemo(() => {
    if (expandedStageId === null) return null;
    return STAGES.find(s => s.id === expandedStageId) || null;
  }, [expandedStageId]);

  const expandedStageRecords = useMemo(() => {
    if (expandedStageId === null) return [];
    const records = data.filter(r => r.status === expandedStageId);
    const q = expandedSearch.trim().toLowerCase();
    const filtered = q
      ? records.filter(r =>
          r.dt.toLowerCase().includes(q) ||
          (vesselMap[r.local] || r.local || '').toLowerCase().includes(q) ||
          r.route.toLowerCase().includes(q) ||
          r.expeditionType.toLowerCase().includes(q)
        )
      : records;

    const isDesc = getSortOrder(expandedStageId) === 'desc';
    return filtered.sort((a, b) => {
      const metricA = getRecordMetric(a, expandedStageId);
      const metricB = getRecordMetric(b, expandedStageId);

      if (metricA === null && metricB === null) return 0;
      if (metricA === null) return 1;
      if (metricB === null) return -1;

      return isDesc ? metricB - metricA : metricA - metricB;
    });
  }, [data, expandedStageId, expandedSearch, stageSortOrder, refDate, vesselMap]);

  // Stage statistics for the expanded view
  const stageStats = useMemo(() => {
    if (expandedStageId === null) return null;
    const stageRecords = data.filter(r => r.status === expandedStageId);
    const total = stageRecords.length;
    if (total === 0) return { total: 0, withinSla: 0, outOfSla: 0, avgAge: '0', delayed: 0 };

    let withinSla = 0;
    let outOfSla = 0;
    let sumAge = 0;
    let ageCount = 0;
    let delayed = 0;

    stageRecords.forEach(r => {
      const p = dtSlaProfile(r, refDate, contractSla);
      if (p.stageState.klass === 'good') withinSla++;
      else if (p.stageState.klass === 'bad') outOfSla++;

      const metric = getRecordMetric(r, expandedStageId);
      if (metric !== null) {
        sumAge += metric;
        ageCount++;
      }

      const od = overdueDays(r, refDate);
      if (od && od > 0) delayed++;
    });

    const avgAge = ageCount > 0 ? (sumAge / ageCount).toFixed(1) : '—';
    return { total, withinSla, outOfSla, avgAge, delayed };
  }, [data, expandedStageId, refDate, contractSla]);

  // Reusable Kanban Card Renderer
  const renderKanbanCard = (r: TransportRecord) => {
    const age = stageAge(r, refDate);
    const lead = totalLead(r);
    const risk = riskClass(r, refDate, limits);
    const od = overdueDays(r, refDate);
    const p = dtSlaProfile(r, refDate, contractSla);
    const vessel = vesselMap[r.local] ? `${vesselMap[r.local]}` : r.local || 'Não informado';

    const borderColor =
      risk === 'crit'
        ? 'border-l-4 border-l-red-500'
        : risk === 'att'
        ? 'border-l-4 border-l-amber-500'
        : 'border-l-4 border-l-emerald-500';

    const mainBadge =
      r.status === 7
        ? lead !== null
          ? `${lead} d`
          : '—'
        : age !== null
        ? `${age} d`
        : '—';

    const stageChipColor =
      p.stageState.klass === 'bad'
        ? 'bg-red-50 border-red-200 text-red-700'
        : p.stageState.klass === 'good'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
        : 'bg-slate-100 border-slate-200 text-slate-600';

    const globalChipColor =
      p.globalState.klass === 'bad'
        ? 'bg-red-50 border-red-200 text-red-700'
        : p.globalState.klass === 'good'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
        : 'bg-slate-100 border-slate-200 text-slate-600';

    const globalLabel =
      p.globalState.klass === 'good'
        ? 'Dentro do SLA global'
        : p.globalState.klass === 'bad'
        ? 'Fora do SLA global'
        : 'Sem base';

    const globalVerb = Number(r.status) === 7 ? 'Finalizado' : 'Acumulado';

    return (
      <div
        key={r.dt}
        onClick={() => onSelectDt(r.dt)}
        className={`p-3 bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer ${borderColor}`}
      >
        {/* Card Top: DT and Aging */}
        <div className="flex items-start justify-between gap-2">
          <strong className="text-sm font-black text-mro-navy">DT {r.dt}</strong>
          <div className="text-right">
            <span
              className={`text-sm font-black block leading-none ${
                risk === 'crit'
                  ? 'text-red-600'
                  : risk === 'att'
                  ? 'text-amber-600'
                  : 'text-emerald-700'
              }`}
            >
              {mainBadge}
            </span>
            <span className="text-[9px] text-mro-muted">
              {r.status === 7 ? 'lead faturamento' : 'na etapa'}
            </span>
          </div>
        </div>

        {/* Vessel / Unit */}
        <div className="text-xs font-black text-mro-navy mt-1 truncate">
          {vessel}
        </div>

        {/* SLA Block exactly as in v22 HTML */}
        <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200 space-y-1.5">
          {/* ETAPA row */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                ETAPA
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black border ${stageChipColor}`}
              >
                <span className="w-3.5 h-3.5 rounded-full bg-white/70 grid place-items-center text-[9px] font-black leading-none">
                  {r.status === 7 ? '✓' : p.stageState.icon}
                </span>
                {r.status === 7 ? 'Etapa final' : p.stageState.label}
              </span>
            </div>
            {r.status < 7 && p.stageState.klass !== 'neutral' && (
              <div className="text-[9px] text-slate-500 mt-0.5">
                Etapa: {p.stageMeasured} / {p.stageSla} d
              </div>
            )}
          </div>

          {/* GLOBAL row */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                GLOBAL
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black border ${globalChipColor}`}
              >
                <span className="w-3.5 h-3.5 rounded-full bg-white/70 grid place-items-center text-[9px] font-black leading-none">
                  {p.globalState.icon}
                </span>
                {globalLabel}
              </span>
            </div>
            {p.globalState.klass !== 'neutral' && (
              <div className="text-[9px] text-slate-500 mt-0.5">
                {globalVerb}: {p.globalMeasured} / {p.globalSla} d
              </div>
            )}
          </div>
        </div>

        {/* Metadata grid */}
        <div className="mt-2.5 text-[10px] text-mro-muted border-t border-slate-100 pt-2 space-y-1.5">
          <div className="grid grid-cols-2 gap-x-2">
            <div className="truncate" title={r.itineraryDescription}>
              Rota: <b className="text-slate-700">{r.route || '—'}</b>
            </div>
            <div className="truncate text-right">
              Criada: <b className="text-slate-700">{fmtDate(r.created)}</b>
            </div>
          </div>

          <div
            className="flex items-center justify-between bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 py-1 text-[10px]"
            title={`Tipo de Expedição SAP: ${r.expeditionType || 'Não informado'}`}
          >
            <span className="text-slate-600 font-semibold">Tipo de Expedição:</span>
            <span className="font-black text-mro-navy bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
              {r.expeditionType || 'Não informado'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-2 text-[9px] text-slate-400">
            <div className="truncate" title={`Tipo de Transporte: ${r.type || '—'}`}>
              Tipo Transp.: <b className="text-slate-600">{r.type || '—'}</b>
            </div>
            <div className="truncate text-right" title={`Fornecedor: ${r.supplier || '—'}`}>
              Forn.: <b className="text-slate-600">{r.supplier || '—'}</b>
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div
          className={`mt-2.5 pt-2 border-t border-dashed flex items-center justify-between text-[10px] transition-colors ${
            !r.forecastEnd
              ? 'border-amber-300 bg-amber-50/80 -mx-3 -mb-3 px-3 py-2 rounded-b-xl'
              : 'border-slate-200'
          }`}
        >
          <span className={!r.forecastEnd ? 'text-amber-900 font-semibold flex items-center gap-1' : 'text-mro-muted'}>
            {!r.forecastEnd && <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />}
            Prev.: <b className={!r.forecastEnd ? 'text-amber-950 font-bold' : ''}>{fmtDate(r.forecastEnd) || '—'}</b>
          </span>
          <span>
            {od && od > 0 ? (
              <strong className="text-red-600 font-bold">+{od} d atraso</strong>
            ) : r.forecastEnd ? (
              <span className="text-emerald-600 font-semibold">no prazo</span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-black text-[10px] bg-amber-200 text-amber-950 border border-amber-300 shadow-2xs">
                <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                Sem Previsão
              </span>
            )}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Legend & Sort Toolbar */}
      <div className="p-3 bg-white rounded-xl border border-mro-line shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-mro-navy">
          <Clock className="w-4 h-4 text-mro-blue shrink-0" />
          <span>
            <b>Kanban Operacional Audax:</b> O tempo no topo do cartão indica o <b>aging na etapa</b> (ou lead time total para faturadas). Os blocos de SLA indicam o status da <b>etapa atual</b> e o status <b>acumulado global</b>.
            <span className="text-blue-600 font-bold ml-1.5 hidden sm:inline">
              (Dica: clique no cabeçalho ou na quantidade para expandir todas as DTs ou exportar para Excel)
            </span>
          </span>
          <InfoTooltip
            title="Kanban de Transporte Audax"
            objective="Gerenciar visualmente o fluxo puxado ponta a ponta pelas 8 etapas, identificando acúmulo de cards, tempos de permanência (aging) e riscos contratuais de SLA."
            formula="Cada coluna agrupa DTs por Status (0 a 7). Cada card exibe Aging = refDate - Início_Status (ou Lead Time se status 7) e semáforos de SLA da etapa e global."
            align="left"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          {/* Quick Global Sort */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              Ordenar todas:
            </span>
            <button
              onClick={() => setAllSort('desc')}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                isAllDesc
                  ? 'bg-mro-navy text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
              title="Ordenar todas as colunas pelo Maior Aging primeiro"
            >
              <ArrowDownWideNarrow className="w-3 h-3" />
              Maior Aging
            </button>
            <button
              onClick={() => setAllSort('asc')}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                isAllAsc
                  ? 'bg-mro-navy text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
              title="Ordenar todas as colunas pelo Menor Aging primeiro"
            >
              <ArrowUpNarrowWide className="w-3 h-3" />
              Menor Aging
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> No prazo
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Atenção
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Crítico
            </span>
          </div>
        </div>
      </div>

      {/* Kanban Board Scrollable */}
      <div className="overflow-x-auto pb-6">
        <div className="grid grid-cols-8 gap-3.5 min-w-[2600px] items-start">
          {STAGES.map(s => {
            const currentOrder = getSortOrder(s.id);
            const isDesc = currentOrder === 'desc';

            const stageRecords = data
              .filter(r => r.status === s.id)
              .sort((a, b) => {
                const metricA = getRecordMetric(a, s.id);
                const metricB = getRecordMetric(b, s.id);

                if (metricA === null && metricB === null) return 0;
                if (metricA === null) return 1;
                if (metricB === null) return -1;

                return isDesc ? metricB - metricA : metricA - metricB;
              });

            const limit = getLimitForStage(s.id);
            const displayed = stageRecords.slice(0, limit);
            const remaining = stageRecords.length - displayed.length;

            return (
              <div
                key={s.id}
                className="bg-slate-100/80 rounded-2xl border border-slate-200 min-h-[650px] max-h-[calc(100vh-230px)] flex flex-col shadow-xs"
              >
                {/* Column Header - Clickable to expand */}
                <div className="p-3 bg-white rounded-t-2xl border-b border-slate-200 sticky top-0 z-10 shadow-xs">
                  <div
                    onClick={() => setExpandedStageId(s.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setExpandedStageId(s.id);
                      }
                    }}
                    title={`Clique para expandir a etapa "${s.name}" e visualizar todas as ${stageRecords.length} DTs`}
                    className="w-full text-left group hover:bg-blue-50/60 p-2 -m-1 rounded-xl transition-all cursor-pointer select-none"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h4 className="font-black text-xs text-mro-navy truncate group-hover:text-mro-blue transition-colors">
                          {s.id} — {s.short}
                        </h4>
                        <Maximize2 className="w-3.5 h-3.5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                      <span className="bg-mro-navy group-hover:bg-mro-blue group-hover:scale-105 text-white text-[11px] font-black px-2 py-0.5 rounded-full min-w-6 text-center shrink-0 transition-all shadow-xs">
                        {stageRecords.length}
                      </span>
                    </div>
                    <p className="text-[10px] text-mro-muted mt-1 leading-tight line-clamp-2">
                      {s.description}
                    </p>
                  </div>

                  {/* Per-column Sorting Control & Direct Excel Export */}
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Aging:
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleColumnSort(s.id)}
                        title={`Ordenar por ${isDesc ? 'Menor Aging (crescente)' : 'Maior Aging (decrescente)'}`}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black transition-all border ${
                          isDesc
                            ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                            : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
                        }`}
                      >
                        {isDesc ? (
                          <>
                            <ArrowDownWideNarrow className="w-3.5 h-3.5 text-amber-700" />
                            <span>Maior Aging ↓</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpNarrowWide className="w-3.5 h-3.5 text-blue-700" />
                            <span>Menor Aging ↑</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          exportStageToExcel(s.id, stageRecords);
                        }}
                        title={`Exportar ${stageRecords.length} DTs desta etapa para Excel (.xlsx)`}
                        className="p-1 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-colors shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="p-2.5 overflow-y-auto space-y-2.5 flex-1">
                  {displayed.map(r => renderKanbanCard(r))}

                  {/* Load more button */}
                  {remaining > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <button
                        onClick={() => handleShowMore(s.id)}
                        className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-300 text-mro-navy text-xs font-bold rounded-xl transition-colors shadow-xs"
                      >
                        Mostrar mais (+{remaining})
                      </button>
                      <button
                        onClick={() => setExpandedStageId(s.id)}
                        className="w-full py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-[11px] font-bold rounded-xl transition-colors border border-blue-200 flex items-center justify-center gap-1.5"
                      >
                        <Maximize2 className="w-3 h-3" />
                        Expandir todas as {stageRecords.length} DTs
                      </button>
                    </div>
                  )}

                  {displayed.length === 0 && (
                    <div className="py-12 text-center text-xs text-mro-muted">
                      Nenhuma DT nesta etapa
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* EXPANDED STAGE MODAL / FULLSCREEN VIEW */}
      {expandedStageDef && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-100 rounded-3xl border border-slate-200 shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-mro-navy text-white text-lg font-black grid place-items-center shadow-md shrink-0">
                  {expandedStageDef.id}
                </span>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base sm:text-lg font-black text-mro-navy">
                      {expandedStageDef.name}
                    </h3>
                    <span className="bg-blue-50 text-blue-800 border border-blue-200 text-xs font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                      {expandedStageRecords.length} {expandedStageRecords.length === 1 ? 'DT' : 'DTs'}
                    </span>
                  </div>
                  <p className="text-xs text-mro-muted mt-0.5 line-clamp-1 max-w-2xl">
                    {expandedStageDef.description}
                  </p>
                </div>
              </div>

              {/* Modal Controls */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Search within stage */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar DT, local, rota..."
                    value={expandedSearch}
                    onChange={e => setExpandedSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white w-48 sm:w-60 focus:outline-none focus:border-mro-blue"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>

                {/* Export Excel Button */}
                <button
                  type="button"
                  onClick={() => exportStageToExcel(expandedStageDef.id, expandedStageRecords)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                  title={`Exportar ${expandedStageRecords.length} DTs desta etapa para planilha Excel (.xlsx)`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar Excel</span>
                </button>

                {/* Sort toggle */}
                <button
                  onClick={() => toggleColumnSort(expandedStageDef.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    getSortOrder(expandedStageDef.id) === 'desc'
                      ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                      : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
                  }`}
                  title="Alterar ordenação por Aging nesta etapa"
                >
                  {getSortOrder(expandedStageDef.id) === 'desc' ? (
                    <>
                      <ArrowDownWideNarrow className="w-3.5 h-3.5 text-amber-700" />
                      <span>Maior Aging ↓</span>
                    </>
                  ) : (
                    <>
                      <ArrowUpNarrowWide className="w-3.5 h-3.5 text-blue-700" />
                      <span>Menor Aging ↑</span>
                    </>
                  )}
                </button>

                {/* View Mode Toggle: Grid vs Table */}
                <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-100 text-xs font-bold">
                  <button
                    onClick={() => setExpandedViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${
                      expandedViewMode === 'grid'
                        ? 'bg-white shadow-xs text-mro-navy font-black'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Visualização em Grade de Cartões"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setExpandedViewMode('table')}
                    className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${
                      expandedViewMode === 'table'
                        ? 'bg-white shadow-xs text-mro-navy font-black'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Visualização em Tabela Detalhada"
                  >
                    <TableIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setExpandedStageId(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors ml-1"
                  title="Fechar visualização expandida (ESC)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick KPI stats bar for this stage */}
            {stageStats && (
              <div className="px-5 py-2.5 bg-white/80 border-b border-slate-200 flex flex-wrap items-center gap-4 sm:gap-6 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Total na etapa:</span>
                  <strong className="text-mro-navy font-black">{stageStats.total} DTs</strong>
                  <InfoTooltip
                    title="Total na Etapa"
                    objective="Volume total de ordens de transporte atualmente retidas ou posicionadas nesta fase do processo operacional."
                    formula="COUNT(DTs onde Status == Etapa Atual)"
                    align="left"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-500">Dentro do SLA:</span>
                  <strong className="text-emerald-700 font-bold">{stageStats.withinSla}</strong>
                  <InfoTooltip
                    title="Dentro do SLA da Etapa"
                    objective="Quantidade de DTs cujo tempo de permanência nesta etapa ainda não ultrapassou o limite contratual acordado."
                    formula="COUNT(DTs onde Status == Etapa E Aging <= SLA_Contratual_Etapa)"
                    align="left"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-slate-500">Fora do SLA:</span>
                  <strong className="text-red-700 font-bold">{stageStats.outOfSla}</strong>
                  <InfoTooltip
                    title="Fora do SLA da Etapa"
                    objective="DTs cujo tempo de permanência nesta etapa estourou a meta contratual estipulada, demandando aceleração urgente."
                    formula="COUNT(DTs onde Status == Etapa E Aging > SLA_Contratual_Etapa)"
                    align="left"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-mro-blue" />
                  <span className="text-slate-500">Média de Aging:</span>
                  <strong className="text-slate-800 font-bold">{stageStats.avgAge} dias</strong>
                  <InfoTooltip
                    title="Média de Aging da Etapa"
                    objective="Tempo médio decorrido em dias que as cargas desta etapa estão aguardando movimentação ou avanço."
                    formula="AVG(Aging_DT) para todas as DTs ativas desta etapa"
                    align="left"
                  />
                </div>
                {stageStats.delayed > 0 && (
                  <div className="flex items-center gap-1.5 sm:ml-auto">
                    <span className="px-2.5 py-0.5 rounded-md bg-red-100 text-red-800 font-black text-[11px]">
                      {stageStats.delayed} com atraso previsto
                    </span>
                    <InfoTooltip
                      title="DTs com Atraso Previsto na Etapa"
                      objective="Indica quantas DTs desta etapa possuem previsão de fim (FimPrev) anterior à data de referência."
                      formula="COUNT(DTs onde Status == Etapa E FimPrev < refDate)"
                      align="right"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Content Area: Grid or Table */}
            <div className="p-5 overflow-y-auto flex-1">
              {expandedStageRecords.length > 0 ? (
                expandedViewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                    {expandedStageRecords.map(r => renderKanbanCard(r))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-black tracking-wider">
                          <tr>
                            <th className="py-3 px-3.5">DT</th>
                            <th className="py-3 px-3.5">Embarcação / Local</th>
                            <th className="py-3 px-3.5">Aging Etapa</th>
                            <th className="py-3 px-3.5">SLA Etapa</th>
                            <th className="py-3 px-3.5">SLA Global</th>
                            <th className="py-3 px-3.5">Tipo Expedição</th>
                            <th className="py-3 px-3.5">Rota</th>
                            <th className="py-3 px-3.5">Criada em</th>
                            <th className="py-3 px-3.5">Previsão Fim</th>
                            <th className="py-3 px-3.5 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {expandedStageRecords.map(r => {
                            const p = dtSlaProfile(r, refDate, contractSla);
                            const age = stageAge(r, refDate);
                            const lead = totalLead(r);
                            const od = overdueDays(r, refDate);
                            const vessel = vesselMap[r.local] || r.local || '—';
                            return (
                              <tr
                                key={r.dt}
                                onClick={() => onSelectDt(r.dt)}
                                className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                              >
                                <td className="py-2.5 px-3.5 font-black text-mro-navy">DT {r.dt}</td>
                                <td className="py-2.5 px-3.5 font-bold text-slate-700 truncate max-w-[200px]" title={vessel}>
                                  {vessel}
                                </td>
                                <td className="py-2.5 px-3.5 font-black text-slate-800">
                                  {r.status === 7 ? (lead !== null ? `${lead} d (lead)` : '—') : age !== null ? `${age} d` : '—'}
                                </td>
                                <td className="py-2.5 px-3.5">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    p.stageState.klass === 'good' ? 'bg-emerald-50 text-emerald-700' : p.stageState.klass === 'bad' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {p.stageState.icon} {p.stageState.label}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3.5">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    p.globalState.klass === 'good' ? 'bg-emerald-50 text-emerald-700' : p.globalState.klass === 'bad' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {p.globalState.icon} {p.globalState.klass === 'good' ? 'Dentro SLA' : p.globalState.klass === 'bad' ? 'Fora SLA' : 'Sem base'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3.5 font-bold text-slate-700">{r.expeditionType || '—'}</td>
                                <td className="py-2.5 px-3.5 text-slate-600 truncate max-w-[180px]" title={r.route}>
                                  {r.route || '—'}
                                </td>
                                <td className="py-2.5 px-3.5 text-slate-600">{fmtDate(r.created)}</td>
                                <td className="py-2.5 px-3.5 text-slate-600">{fmtDate(r.forecastEnd)}</td>
                                <td className="py-2.5 px-3.5 text-right font-bold">
                                  {od && od > 0 ? (
                                    <span className="text-red-600">+{od} d atraso</span>
                                  ) : r.forecastEnd ? (
                                    <span className="text-emerald-600">No prazo</span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              ) : (
                <div className="py-20 text-center text-slate-400">
                  Nenhuma DT encontrada com os critérios informados nesta etapa.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
