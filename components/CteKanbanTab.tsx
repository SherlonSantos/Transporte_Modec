'use client';

import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  FileText,
  Layers,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Clock,
  RotateCcw,
  Sparkles,
  Info,
  Download,
  Plus,
} from 'lucide-react';
import initialCteDataJson from '@/data/initialCteData.json';
import {
  CteRecord,
  CteFilterState,
  CteSlaConfig,
  CteIngestionModel,
  CteDtSummary,
} from '@/lib/cteTypes';
import { CTE_KANBAN_BUCKETS } from '@/lib/cteDictionary';
import {
  calculateCteMetrics,
  groupCtesByDt,
  getCteAgeDays,
  fmtDateBr,
} from '@/lib/cteCalculations';
import {
  loadCteModelFromStorage,
  saveCteModelToStorage,
  clearCteModelFromStorage,
  loadCteSlaConfigs,
  saveCteSlaConfigs,
} from '@/lib/cteStorage';
import { MultiSelectOption } from '@/components/MultiSelect';
import { CteKpis } from './cte/CteKpis';
import { CteFilters } from './cte/CteFilters';
import { CteKanbanCard } from './cte/CteKanbanCard';
import { CteDtCard } from './cte/CteDtCard';
import { CteCharts } from './cte/CteCharts';
import { CteTable } from './cte/CteTable';
import { CteDetailModal } from './cte/CteDetailModal';
import { CteUploadModal } from './cte/CteUploadModal';
import { CteSlaConfigModal } from './cte/CteSlaConfigModal';

export const CteKanbanTab: React.FC = () => {
  // Modelo de dados de CT-e (Inicialmente do JSON local, com restauração do IndexedDB)
  const [model, setModel] = useState<CteIngestionModel>(initialCteDataJson as CteIngestionModel);
  const [selectedRecord, setSelectedRecord] = useState<CteRecord | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSlaModalOpen, setIsSlaModalOpen] = useState(false);

  // Modo de exibição: 'cte' (por CT-e) ou 'dt' (consolidado por DT)
  const [viewMode, setViewMode] = useState<'cte' | 'dt'>('cte');

  // Quantidade visível inicial por bucket (40 cards por padrão para performance instantânea sem travar o browser)
  const [visibleCountByBucket, setVisibleCountByBucket] = useState<Record<number, number>>({});

  // Configurações de SLA
  const [slaConfigs, setSlaConfigs] = useState<Record<number, CteSlaConfig>>({});

  // Ordenação de cada coluna do Kanban (maior tempo primeiro vs menor tempo)
  const [sortOrders, setSortOrders] = useState<Record<number, 'desc' | 'asc'>>({});

  // Estado dos Filtros
  const [filters, setFilters] = useState<CteFilterState>({
    search: '',
    dateFrom: '',
    dateTo: '',
    dts: [],
    ctes: [],
    vessels: [],
    bases: [],
    originalStatuses: [],
    kanbanStatuses: [],
    flowTypes: [],
    situations: [],
    slaStatus: [],
  });

  // Limite por bucket: padrão 40 cards para garantir 60fps e zero travamento
  const getLimitForBucket = (bucketId: number) => visibleCountByBucket[bucketId] || 40;

  const handleShowMore = (bucketId: number) => {
    setVisibleCountByBucket(prev => ({
      ...prev,
      [bucketId]: (prev[bucketId] || 40) + 40,
    }));
  };

  // Resetar paginação ao alterar filtros ou modo de visão
  useEffect(() => {
    setVisibleCountByBucket({});
  }, [filters, viewMode]);

  // Carrega modelo persistido e preferências locais
  useEffect(() => {
    loadCteModelFromStorage().then(saved => {
      if (saved && saved.records && saved.records.length > 0) {
        setModel(saved);
      }
    });

    const savedSla = loadCteSlaConfigs();
    if (savedSla) {
      setSlaConfigs(savedSla);
    }

    try {
      const savedMode = localStorage.getItem('modec_cte_view_mode') as 'cte' | 'dt';
      if (savedMode === 'cte' || savedMode === 'dt') {
        setViewMode(savedMode);
      }
    } catch {}
  }, []);

  const handleChangeViewMode = (mode: 'cte' | 'dt') => {
    setViewMode(mode);
    try {
      localStorage.setItem('modec_cte_view_mode', mode);
    } catch {}
  };

  const handleSaveSlaConfigs = (newConfigs: Record<number, CteSlaConfig>) => {
    setSlaConfigs(newConfigs);
    saveCteSlaConfigs(newConfigs);
  };

  const handleDataIngested = async (newModel: CteIngestionModel) => {
    setModel(newModel);
    await saveCteModelToStorage(newModel);
  };

  const handleResetToInitial = async () => {
    if (confirm('Deseja restaurar a base de CT-es para a planilha padrão inicial?')) {
      await clearCteModelFromStorage();
      setModel(initialCteDataJson as CteIngestionModel);
    }
  };

  const handleToggleColumnSort = (bucketId: number) => {
    setSortOrders(prev => ({
      ...prev,
      [bucketId]: prev[bucketId] === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSetAllSort = (order: 'desc' | 'asc') => {
    const next: Record<number, 'desc' | 'asc'> = {};
    CTE_KANBAN_BUCKETS.forEach(b => {
      next[b.id] = order;
    });
    setSortOrders(next);
  };

  const isAllDesc = CTE_KANBAN_BUCKETS.every(b => (sortOrders[b.id] || 'desc') === 'desc');
  const isAllAsc = CTE_KANBAN_BUCKETS.every(b => sortOrders[b.id] === 'asc');

  // Base completa de registros
  const allRecords = model.records;

  // Opções para os MultiSelects derivadas da base completa
  const vesselOptions: MultiSelectOption[] = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach(r => {
      if (r.vessel) set.add(r.vessel);
    });
    return Array.from(set).sort().map(v => ({ value: v, label: v }));
  }, [allRecords]);

  const baseOptions: MultiSelectOption[] = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach(r => {
      if (r.base) set.add(r.base);
    });
    return Array.from(set).sort().map(b => ({ value: b, label: b }));
  }, [allRecords]);

  const statusKanbanOptions: MultiSelectOption[] = useMemo(() => {
    return CTE_KANBAN_BUCKETS.map(b => ({ value: b.name, label: b.name }));
  }, []);

  const originalStatusOptions: MultiSelectOption[] = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach(r => {
      if (r.originalStatus) set.add(r.originalStatus);
    });
    return Array.from(set).sort().map(s => ({ value: s, label: s }));
  }, [allRecords]);

  const flowTypeOptions: MultiSelectOption[] = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach(r => {
      if (r.flowType) set.add(r.flowType);
    });
    return Array.from(set).sort().map(f => ({ value: f, label: f }));
  }, [allRecords]);

  const situationOptions: MultiSelectOption[] = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach(r => {
      if (r.kanbanSituation) set.add(r.kanbanSituation);
    });
    return Array.from(set).sort().map(s => ({ value: s, label: s }));
  }, [allRecords]);

  const slaOptions: MultiSelectOption[] = useMemo(() => [
    { value: 'within', label: 'Dentro do SLA' },
    { value: 'overdue', label: 'Fora do SLA (Vencido)' },
    { value: 'unconfigured', label: 'Não parametrizado / A validar' },
  ], []);

  // Registros Filtrados
  const filteredRecords = useMemo(() => {
    const q = filters.search.trim().toLowerCase();

    return allRecords.filter(r => {
      // Busca geral
      if (q) {
        const matchDt = r.dt.toLowerCase().includes(q);
        const matchCte = r.cte.toLowerCase().includes(q);
        const matchVessel = r.vessel.toLowerCase().includes(q);
        if (!matchDt && !matchCte && !matchVessel) return false;
      }

      // Período de emissão
      if (filters.dateFrom && r.emissionDate && r.emissionDate < filters.dateFrom) return false;
      if (filters.dateTo && r.emissionDate && r.emissionDate > filters.dateTo) return false;

      // MultiSelects
      if (filters.vessels.length > 0 && !filters.vessels.includes(r.vessel)) return false;
      if (filters.bases.length > 0 && !filters.bases.includes(r.base)) return false;
      if (filters.kanbanStatuses.length > 0 && !filters.kanbanStatuses.includes(r.statusKanban)) return false;
      if (filters.originalStatuses.length > 0 && !filters.originalStatuses.includes(r.originalStatus)) return false;
      if (filters.flowTypes.length > 0 && !filters.flowTypes.includes(r.flowType)) return false;
      if (filters.situations.length > 0 && !filters.situations.includes(r.kanbanSituation)) return false;

      // Filtro de SLA
      if (filters.slaStatus.length > 0) {
        const cfg = r.kanbanOrder !== null ? slaConfigs[r.kanbanOrder] : undefined;
        const age = getCteAgeDays(r.emissionDate);
        let status = 'unconfigured';
        if (cfg && cfg.targetDays !== null && age !== null) {
          status = age <= cfg.targetDays ? 'within' : 'overdue';
        }
        if (!filters.slaStatus.includes(status)) return false;
      }

      return true;
    });
  }, [allRecords, filters, slaConfigs]);

  // Indicadores Gerenciais (KPIs)
  const metrics = useMemo(() => {
    return calculateCteMetrics(filteredRecords, slaConfigs);
  }, [filteredRecords, slaConfigs]);

  // Registros agrupados por DT para a visão DT
  const dtSummaries = useMemo(() => {
    if (viewMode !== 'dt') return [];
    return groupCtesByDt(filteredRecords);
  }, [filteredRecords, viewMode]);

  // Distribuição nos Buckets do Kanban (Visão CT-e)
  const bucketCteRecords = useMemo(() => {
    const map: Record<number, CteRecord[]> = {};
    CTE_KANBAN_BUCKETS.forEach(b => {
      map[b.id] = [];
    });

    filteredRecords.forEach(r => {
      const order = r.kanbanOrder ?? 99;
      if (map[order]) {
        map[order].push(r);
      } else {
        map[99].push(r);
      }
    });

    // Ordenação dentro de cada bucket
    CTE_KANBAN_BUCKETS.forEach(b => {
      const isAsc = sortOrders[b.id] === 'asc';
      map[b.id].sort((a, bRecord) => {
        const ageA = getCteAgeDays(a.emissionDate) ?? -1;
        const ageB = getCteAgeDays(bRecord.emissionDate) ?? -1;
        return isAsc ? ageA - ageB : ageB - ageA;
      });
    });

    return map;
  }, [filteredRecords, sortOrders]);

  // Distribuição nos Buckets do Kanban (Visão DT)
  const bucketDtSummaries = useMemo(() => {
    if (viewMode !== 'dt') return {};
    const map: Record<number, typeof dtSummaries> = {};
    CTE_KANBAN_BUCKETS.forEach(b => {
      map[b.id] = [];
    });

    dtSummaries.forEach(s => {
      const order = s.consolidatedOrder ?? 99;
      if (map[order]) {
        map[order].push(s);
      } else {
        map[99].push(s);
      }
    });

    return map;
  }, [dtSummaries, viewMode]);

  const handleResetFilters = () => {
    setFilters({
      search: '',
      dateFrom: '',
      dateTo: '',
      dts: [],
      ctes: [],
      vessels: [],
      bases: [],
      originalStatuses: [],
      kanbanStatuses: [],
      flowTypes: [],
      situations: [],
      slaStatus: [],
    });
  };

  const handleFilterByStatus = (statusName: string) => {
    setFilters(prev => ({
      ...prev,
      kanbanStatuses: [statusName],
    }));
  };

  const handleFilterByVessel = (vesselName: string) => {
    setFilters(prev => ({
      ...prev,
      vessels: [vesselName],
    }));
  };

  // Exportar dados de uma etapa específica para Excel
  const handleExportBucketExcel = (bucketId: number) => {
    const bucket = CTE_KANBAN_BUCKETS.find(b => b.id === bucketId);
    const records = bucketCteRecords[bucketId] || [];

    const rowsOut = records.map(r => ({
      'DT': r.dt,
      'CT-e': r.cte,
      'Status Kanban': r.statusKanban,
      'Status Original': r.originalStatus,
      'Embarcação / Navio': r.vessel,
      'Base Operacional': r.base,
      'Tipo de Fluxo': r.flowType,
      'Data de Emissão': fmtDateBr(r.emissionDate),
      'Aging (Dias)': getCteAgeDays(r.emissionDate) ?? '',
      'Valor Frete (R$)': r.freightValue ?? '',
      'PO': r.po,
      'MIGO': r.migo,
      'Pendências / Erros': r.errors,
      'Próxima Ação': r.detailNextAction,
      'Situação': r.kanbanSituation,
    }));

    const ws = XLSX.utils.json_to_sheet(rowsOut);
    const wb = XLSX.utils.book_new();
    const sheetName = (bucket ? `Etapa_${bucket.id}_${bucket.name}` : `Etapa_${bucketId}`).slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `kanban_faturamento_${sheetName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Barra de Título da Aba com Ações Rápidas */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-mro-line">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-mro-navy">
              Kanban de Faturamento & Gestão de CT-es
            </h2>
            <span className="bg-mro-green/20 text-emerald-900 border border-mro-green/40 text-[11px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-700" />
              Módulo Ativo
            </span>
          </div>
          <p className="text-xs text-mro-muted mt-0.5">
            Acompanhamento integrado de CT-es, pendências operacionais, conciliação e faturamento vinculado às DTs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToInitial}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
            title="Restaurar base de CT-es inicial"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Base Inicial
          </button>
        </div>
      </div>

      {/* Indicadores Gerenciais (KPIs do Topo) */}
      <CteKpis metrics={metrics} onFilterStatus={handleFilterByStatus} />

      {/* Barra de Filtros com MultiSelect e Alternador de Visão */}
      <CteFilters
        filters={filters}
        onChangeFilters={setFilters}
        onResetFilters={handleResetFilters}
        viewMode={viewMode}
        onChangeViewMode={handleChangeViewMode}
        vesselOptions={vesselOptions}
        baseOptions={baseOptions}
        statusKanbanOptions={statusKanbanOptions}
        originalStatusOptions={originalStatusOptions}
        flowTypeOptions={flowTypeOptions}
        situationOptions={situationOptions}
        slaOptions={slaOptions}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onOpenSlaConfig={() => setIsSlaModalOpen(true)}
        totalFilteredRecords={filteredRecords.length}
        totalBaseRecords={allRecords.length}
      />

      {/* Barra de Contexto e Ordenação Global (Padrão exato do Kanban de Transporte) */}
      <div className="space-y-2.5">
        <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-950 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            <b>Kanban de Faturamento:</b> O tempo no topo do cartão indica o aging desde a emissão ou tempo na etapa. As cores na borda lateral sinalizam o status de risco e cumprimento de prazos.
          </span>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Ordenar todas:
              </span>
              <button
                type="button"
                onClick={() => handleSetAllSort('desc')}
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
                type="button"
                onClick={() => handleSetAllSort('asc')}
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

            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> No prazo
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Atenção
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Crítico
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board com Rolagem Horizontal (8 Buckets) */}
      <div className="overflow-x-auto pb-6">
        <div className="grid grid-cols-8 gap-3.5 min-w-[2600px] items-start">
          {CTE_KANBAN_BUCKETS.map(bucket => {
            const isDesc = (sortOrders[bucket.id] || 'desc') !== 'asc';
            const allCteItems = bucketCteRecords[bucket.id] || [];
            const allDtItems = bucketDtSummaries[bucket.id] || [];
            const totalItemsCount = viewMode === 'cte' ? allCteItems.length : allDtItems.length;

            const limit = getLimitForBucket(bucket.id);
            const displayedCte = allCteItems.slice(0, limit);
            const displayedDt = allDtItems.slice(0, limit);
            const remainingCount = totalItemsCount - limit;

            return (
              <div
                key={bucket.id}
                className="bg-slate-100/90 rounded-2xl border border-slate-200/90 min-h-[680px] max-h-[820px] flex flex-col shadow-xs"
              >
                {/* Cabeçalho do Bucket com Fundo Claro / Branco e Clean (Padrão Kanban de Transporte) */}
                <div className="p-3 bg-white rounded-t-2xl border-b border-slate-200 sticky top-0 z-10 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h4 className="font-black text-xs text-mro-navy truncate" title={bucket.name}>
                        {bucket.id === 99 ? '?' : bucket.id} — {bucket.name}
                      </h4>
                    </div>

                    <span className="bg-mro-navy text-white text-[11px] font-black px-2 py-0.5 rounded-full min-w-6 text-center shrink-0 shadow-xs">
                      {totalItemsCount}
                    </span>
                  </div>

                  <p className="text-[10px] text-mro-muted mt-1 leading-tight line-clamp-2" title={bucket.description}>
                    {bucket.description}
                  </p>

                  {/* Controle de Ordenação da Coluna e Exportação Direta */}
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Aging:
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleColumnSort(bucket.id)}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportBucketExcel(bucket.id);
                        }}
                        title={`Exportar etapa "${bucket.name}" para Excel`}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Conteúdo com Rolagem dos Cards e Paginação Progressiva Fluida */}
                <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1">
                  {viewMode === 'cte' ? (
                    displayedCte.length > 0 ? (
                      <>
                        {displayedCte.map(record => (
                          <CteKanbanCard
                            key={record.id}
                            record={record}
                            slaConfig={slaConfigs[bucket.id]}
                            onSelect={setSelectedRecord}
                          />
                        ))}
                        {remainingCount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleShowMore(bucket.id)}
                            className="w-full py-2.5 bg-white hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 rounded-xl text-xs font-black text-mro-navy transition-all shadow-2xs hover:shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5 text-mro-blue" />
                            <span>Mostrar mais 40 ({remainingCount} restantes)</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="h-36 grid place-items-center text-center text-slate-400 text-xs">
                        Nenhum CT-e nesta etapa
                      </div>
                    )
                  ) : (
                    displayedDt.length > 0 ? (
                      <>
                        {displayedDt.map(summary => (
                          <CteDtCard
                            key={summary.dt}
                            summary={summary}
                            onSelectCte={setSelectedRecord}
                          />
                        ))}
                        {remainingCount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleShowMore(bucket.id)}
                            className="w-full py-2.5 bg-white hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 rounded-xl text-xs font-black text-mro-navy transition-all shadow-2xs hover:shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5 text-mro-blue" />
                            <span>Mostrar mais 40 ({remainingCount} restantes)</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="h-36 grid place-items-center text-center text-slate-400 text-xs">
                        Nenhuma DT consolidada nesta etapa
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gráficos Analíticos Integrados */}
      <CteCharts
        records={filteredRecords}
        onSelectStatus={handleFilterByStatus}
        onSelectVessel={handleFilterByVessel}
      />

      {/* Tabela Analítica e Exportação */}
      <CteTable records={filteredRecords} onSelectRecord={setSelectedRecord} />

      {/* Modal de Detalhamento do CT-e / DT */}
      <CteDetailModal
        record={selectedRecord}
        allRecords={allRecords}
        onClose={() => setSelectedRecord(null)}
        onSelectSiblingCte={setSelectedRecord}
      />

      {/* Modal de Upload de Nova Planilha de CT-es */}
      <CteUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onDataIngested={handleDataIngested}
      />

      {/* Modal de Parametrização de SLA por Etapa */}
      <CteSlaConfigModal
        isOpen={isSlaModalOpen}
        onClose={() => setIsSlaModalOpen(false)}
        currentConfigs={slaConfigs}
        onSave={handleSaveSlaConfigs}
      />
    </div>
  );
};
