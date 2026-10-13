'use client';

import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  CalendarDays,
  Search,
  Download,
  X,
  LayoutGrid,
  Table as TableIcon,
  Clock,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { TransportRecord, VesselMapping } from '@/lib/types';
import { STAGES } from '@/lib/constants';
import {
  fmtDate,
  stageAge,
  totalLead,
  overdueDays,
  riskClass,
  dtSlaProfile,
  chronologyIssues,
} from '@/lib/calculations';

interface IssuesModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'chronology' | 'no_forecast';
  records: TransportRecord[];
  vesselMap: VesselMapping;
  refDate: Date;
  limits: Record<number, [number, number]>;
  contractSla: Record<number, number>;
  onSelectDt: (dt: string) => void;
}

export const IssuesModal: React.FC<IssuesModalProps> = ({
  isOpen,
  onClose,
  type,
  records,
  vesselMap,
  refDate,
  limits,
  contractSla,
  onSelectDt,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'done'>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Reset filters when opening/changing type
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setStatusFilter('all');
      setStageFilter('all');
    }
  }, [isOpen, type]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Pre-calculate chronology issues per record to avoid re-running repeatedly
  const issuesMap = useMemo(() => {
    const map = new Map<string, string[]>();
    if (type === 'chronology') {
      records.forEach(r => {
        map.set(r.dt, chronologyIssues(r));
      });
    }
    return map;
  }, [records, type]);

  // Counts for open vs done
  const openCount = useMemo(() => records.filter(r => r.status !== 7).length, [records]);
  const doneCount = useMemo(() => records.filter(r => r.status === 7).length, [records]);

  // Filtered list
  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter(r => {
      // Status filter (open vs done)
      if (statusFilter === 'open' && r.status === 7) return false;
      if (statusFilter === 'done' && r.status !== 7) return false;

      // Stage filter
      if (stageFilter !== 'all' && String(r.status) !== stageFilter) return false;

      // Search query
      if (q) {
        const matchDt = r.dt.toLowerCase().includes(q);
        const matchLocal = r.local.toLowerCase().includes(q) || (vesselMap[r.local] || '').toLowerCase().includes(q);
        const matchRoute = r.route.toLowerCase().includes(q);
        const matchSupplier = r.supplier.toLowerCase().includes(q);
        const matchExpedition = (r.expeditionType || '').toLowerCase().includes(q);
        const matchIssues = type === 'chronology' && (issuesMap.get(r.dt) || []).some(iss => iss.toLowerCase().includes(q));

        if (!matchDt && !matchLocal && !matchRoute && !matchSupplier && !matchExpedition && !matchIssues) {
          return false;
        }
      }

      return true;
    });
  }, [records, search, statusFilter, stageFilter, vesselMap, type, issuesMap]);

  // Export to Excel function
  const handleExportExcel = () => {
    const isChrono = type === 'chronology';
    const filename = isChrono
      ? `DTs_Inversao_Cronologica_SAP_${new Date().toISOString().slice(0, 10)}.xlsx`
      : `DTs_Sem_Previsao_SAP_${new Date().toISOString().slice(0, 10)}.xlsx`;

    const exportRows = filteredRecords.map(r => {
      const stage = STAGES.find(s => s.id === r.status);
      const stageName = stage ? `${stage.id} — ${stage.short}` : String(r.status);
      const ageVal = r.status === 7 ? totalLead(r) : stageAge(r, refDate);
      const rowData: Record<string, any> = {
        'Nº Transporte (DT)': r.dt,
        'Status SAP': r.status,
        'Etapa': stageName,
        'Local Org.': r.local,
        'Navio / Destino': vesselMap[r.local] || r.local,
        'Rota': r.route,
        'Itinerário Completo': r.itineraryDescription,
        'Tipo Transporte': r.type,
        'Tipo de Expedição': r.expeditionType || 'Não informado',
        'Fornecedor': r.supplier,
        'Criado em': fmtDate(r.created),
        'Fim Previsto': fmtDate(r.forecastEnd) || 'Sem previsão',
        'Fim Atual': fmtDate(r.actualEnd) || '—',
        'Aging / Lead Time (dias)': ageVal !== null ? ageVal : '',
      };

      if (isChrono) {
        const issues = issuesMap.get(r.dt) || [];
        rowData['Qtd Inconsistências'] = issues.length;
        rowData['Inconsistências Cronológicas'] = issues.join(' | ');
      } else {
        rowData['Problema'] = 'Campo FimPrevTransp. vazio no SAP';
      }

      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    const sheetName = isChrono ? 'Inversões Cronológicas' : 'Sem Previsão';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, filename);
  };

  if (!isOpen) return null;

  const isChrono = type === 'chronology';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-100 rounded-3xl border border-slate-200 shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10 shadow-xs">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl grid place-items-center shadow-md shrink-0 ${
                isChrono ? 'bg-amber-500 text-white' : 'bg-mro-blue text-white'
              }`}
            >
              {isChrono ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <CalendarDays className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base sm:text-lg font-black text-mro-navy">
                  {isChrono ? 'DTs com Inversão Cronológica SAP' : 'DTs sem Previsão de Entrega (SAP)'}
                </h3>
                <span
                  className={`text-xs font-black px-2.5 py-0.5 rounded-full border shadow-2xs ${
                    isChrono
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : 'bg-blue-50 text-blue-900 border-blue-300'
                  }`}
                >
                  {filteredRecords.length}{' '}
                  {filteredRecords.length === 1 ? 'DT encontrada' : 'DTs encontradas'}
                </span>
              </div>
              <p className="text-xs text-mro-muted mt-0.5 line-clamp-1 max-w-2xl">
                {isChrono
                  ? 'DTs onde a sequência de marcos operacionais no SAP apresenta inconsistências (ex.: carregamento anterior à criação).'
                  : 'DTs onde a data prevista de conclusão ("FimPrevTransp.") não foi preenchida no SAP.'}
              </p>
            </div>
          </div>

          {/* Modal Action Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar DT, navio, rota..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white w-48 sm:w-60 focus:outline-none focus:border-mro-blue shadow-2xs"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            {/* Export to Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
              title={`Exportar ${filteredRecords.length} DTs para planilha Excel (.xlsx)`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Excel</span>
            </button>

            {/* View Mode Toggle */}
            <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-100 text-xs font-bold">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  viewMode === 'grid'
                    ? 'bg-white shadow-xs text-mro-navy font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Visualização em Grade de Cartões"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  viewMode === 'table'
                    ? 'bg-white shadow-xs text-mro-navy font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Visualização em Tabela Detalhada"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors ml-1 cursor-pointer"
              title="Fechar (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar: Status & Stages */}
        <div className="px-5 py-2.5 bg-white/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Status Scope Pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Status:</span>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-mro-navy text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              Todas ({records.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('open')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'open'
                  ? 'bg-mro-navy text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              Apenas Abertas ({openCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('done')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'done'
                  ? 'bg-mro-navy text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              Concluídas ({doneCount})
            </button>
          </div>

          {/* Stage Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Filtrar Etapa:</span>
            <select
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value)}
              className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-medium focus:outline-none focus:border-mro-blue"
            >
              <option value="all">Todas as etapas</option>
              {STAGES.map(s => (
                <option key={s.id} value={String(s.id)}>
                  {s.id} — {s.short}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Area: Grid or Table */}
        <div className="p-5 overflow-y-auto flex-1">
          {filteredRecords.length === 0 ? (
            <div className="py-20 text-center text-sm text-mro-muted bg-white rounded-2xl border border-dashed border-slate-300">
              <p className="font-semibold text-slate-600">Nenhuma DT encontrada para os critérios selecionados.</p>
              <p className="text-xs text-slate-400 mt-1">Tente ajustar a busca ou os filtros de etapa.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredRecords.map(r => {
                const stage = STAGES.find(s => s.id === r.status);
                const age = stageAge(r, refDate);
                const lead = totalLead(r);
                const rc = riskClass(r, refDate, limits);
                const profile = dtSlaProfile(r, refDate, contractSla);
                const issues = issuesMap.get(r.dt) || [];

                return (
                  <div
                    key={r.dt}
                    onClick={() => onSelectDt(r.dt)}
                    className="group bg-white rounded-2xl p-3.5 border border-mro-line shadow-card hover:shadow-card-hover transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: DT code & Stage Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-sm text-mro-navy tracking-tight group-hover:text-blue-600 transition-colors">
                          {r.dt}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[150px]">
                          {stage ? `${stage.id} — ${stage.short}` : `Etapa ${r.status}`}
                        </span>
                      </div>

                      {/* Aging / Lead Time and Destination */}
                      <div className="flex items-center justify-between mt-2 text-xs">
                        <span
                          className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md ${
                            rc === 'crit'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : rc === 'att'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {r.status === 7 ? `Lead: ${lead ?? '—'} d` : `Aging: ${age ?? '—'} d`}
                        </span>
                        <span
                          className="font-bold text-slate-700 text-[11px] truncate max-w-[140px]"
                          title={vesselMap[r.local] || r.local}
                        >
                          {vesselMap[r.local] || r.local}
                        </span>
                      </div>

                      {/* Meta Grid */}
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

                      {/* Specific Issue Diagnostic Box */}
                      {isChrono ? (
                        <div className="mt-2.5 p-2 bg-amber-50 border border-amber-200 rounded-xl text-[10px] space-y-1">
                          <div className="font-bold text-amber-900 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>
                              {issues.length}{' '}
                              {issues.length === 1
                                ? 'inconsistência cronológica:'
                                : 'inconsistências cronológicas:'}
                            </span>
                          </div>
                          <ul className="space-y-0.5 text-amber-950 font-medium pl-1">
                            {issues.slice(0, 3).map((iss, idx) => (
                              <li key={idx} className="leading-tight flex items-start gap-1">
                                <span className="text-amber-500 font-bold">•</span>
                                <span>{iss}</span>
                              </li>
                            ))}
                            {issues.length > 3 && (
                              <li className="text-[9px] font-bold text-amber-700 pt-0.5">
                                + {issues.length - 3} outra(s) inconsistência(s)
                              </li>
                            )}
                          </ul>
                        </div>
                      ) : (
                        <div className="mt-2.5 p-2 bg-amber-50 border border-amber-200 rounded-xl text-[10px] flex items-center justify-between">
                          <span className="text-amber-900 font-semibold flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            Previsão de Entrega:
                          </span>
                          <span className="text-amber-950 bg-amber-200 border border-amber-300 px-2 py-0.5 rounded-md font-bold">
                            Campo vazio no SAP (sem previsão)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="mt-3 pt-2 border-t border-dashed border-slate-200 flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            profile.overall === 'bad'
                              ? 'bg-red-500'
                              : profile.overall === 'good'
                              ? 'bg-emerald-500'
                              : 'bg-slate-300'
                          }`}
                        />
                        <span className="text-slate-500 font-medium">
                          {profile.overall === 'bad' ? 'Fora SLA' : profile.overall === 'good' ? 'No SLA' : 'SLA n/a'}
                        </span>
                      </div>
                      <span className="text-blue-600 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Ver detalhes <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4">Nº DT</th>
                      <th className="py-3 px-3">Etapa Atual</th>
                      <th className="py-3 px-3">Local / Destino</th>
                      <th className="py-3 px-3">Rota</th>
                      <th className="py-3 px-3">Expedição</th>
                      <th className="py-3 px-3">Criada em</th>
                      <th className="py-3 px-3">{isChrono ? 'Fim Previsto' : 'Previsão'}</th>
                      <th className="py-3 px-4">
                        {isChrono ? 'Inconsistência Cronológica SAP' : 'Diagnóstico'}
                      </th>
                      <th className="py-3 px-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.map(r => {
                      const stage = STAGES.find(s => s.id === r.status);
                      const issues = issuesMap.get(r.dt) || [];

                      return (
                        <tr
                          key={r.dt}
                          onClick={() => onSelectDt(r.dt)}
                          className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                        >
                          <td className="py-2.5 px-4 font-black text-mro-navy group-hover:text-blue-600">
                            {r.dt}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                              {stage ? `${stage.id} — ${stage.short}` : r.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">
                            {vesselMap[r.local] || r.local}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 truncate max-w-[140px]" title={r.itineraryDescription}>
                            {r.route || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {r.expeditionType || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {fmtDate(r.created)}
                          </td>
                          <td className="py-2.5 px-3">
                            {isChrono ? (
                              fmtDate(r.forecastEnd)
                            ) : (
                              <span className="text-amber-800 bg-amber-100 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                Sem previsão
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4">
                            {isChrono ? (
                              <div className="space-y-0.5 max-w-md">
                                {issues.slice(0, 2).map((iss, idx) => (
                                  <div key={idx} className="text-[11px] text-amber-900 font-medium flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span>{iss}</span>
                                  </div>
                                ))}
                                {issues.length > 2 && (
                                  <span className="text-[10px] text-amber-700 font-bold">
                                    +{issues.length - 2} mais...
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[11px]">
                                Campo FimPrevTransp. não informado no SAP
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                onSelectDt(r.dt);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                            >
                              Ver DT
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
