'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Layers,
  ArrowUpDown,
  Clock,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import initialCteDataJson from '@/data/initialCteData.json';
import {
  CteRecord,
  CteFilterState,
  CteSlaConfig,
  CteIngestionModel,
} from '@/lib/cteTypes';
import { CTE_KANBAN_BUCKETS } from '@/lib/cteDictionary';
import {
  calculateCteMetrics,
  groupCtesByDt,
  getCteAgeDays,
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

      {/* Kanban Board com Rolagem Horizontal (8 Buckets) */}
      <div className="overflow-x-auto pb-6">
        <div className="grid grid-cols-8 gap-3.5 min-w-[2600px] items-start">
          {CTE_KANBAN_BUCKETS.map(bucket => {
            const isDesc = sortOrders[bucket.id] !== 'asc';
            const itemsCount =
              viewMode === 'cte'
                ? bucketCteRecords[bucket.id]?.length || 0
                : bucketDtSummaries[bucket.id]?.length || 0;

            return (
              <div
                key={bucket.id}
                className="bg-slate-100/90 rounded-2xl border border-slate-200/90 min-h-[680px] max-h-[820px] flex flex-col shadow-xs"
              >
                {/* Cabeçalho do Bucket com Azul Escuro MRO */}
                <div className="p-3 bg-mro-navy text-white rounded-t-2xl shadow-xs">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-white/20 text-white text-[11px] font-black grid place-items-center shrink-0">
                        {bucket.id === 99 ? '?' : bucket.id}
                      </span>
                      <h4 className="font-black text-xs text-white truncate" title={bucket.name}>
                        {bucket.name}
                      </h4>
                    </div>

                    <span className="bg-white/20 text-white font-black text-xs px-2 py-0.5 rounded-full min-w-6 text-center">
                      {itemsCount}
                    </span>
                  </div>

                  <p className="text-[10px] text-blue-200/80 mt-1 line-clamp-1 leading-tight" title={bucket.description}>
                    {bucket.description}
                  </p>

                  {/* Ordenador do Bucket */}
                  <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px]">
                    <span className="text-blue-200/70 font-semibold uppercase tracking-wider text-[9px]">
                      {viewMode === 'cte' ? 'CT-es na etapa' : 'DTs na etapa'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleColumnSort(bucket.id)}
                      className="flex items-center gap-1 text-white/90 hover:text-white font-bold bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-md transition-colors"
                      title={isDesc ? 'Ordenado por maior tempo' : 'Ordenado por menor tempo'}
                    >
                      <ArrowUpDown className="w-2.5 h-2.5" />
                      <span>{isDesc ? 'Maior tempo' : 'Menor tempo'}</span>
                    </button>
                  </div>
                </div>

                {/* Conteúdo com Rolagem dos Cards */}
                <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1">
                  {viewMode === 'cte' ? (
                    bucketCteRecords[bucket.id] && bucketCteRecords[bucket.id].length > 0 ? (
                      bucketCteRecords[bucket.id].map(record => (
                        <CteKanbanCard
                          key={record.id}
                          record={record}
                          slaConfig={slaConfigs[bucket.id]}
                          onSelect={setSelectedRecord}
                        />
                      ))
                    ) : (
                      <div className="h-36 grid place-items-center text-center text-slate-400 text-xs">
                        Nenhum CT-e nesta etapa
                      </div>
                    )
                  ) : (
                    bucketDtSummaries[bucket.id] && bucketDtSummaries[bucket.id].length > 0 ? (
                      bucketDtSummaries[bucket.id].map(summary => (
                        <CteDtCard
                          key={summary.dt}
                          summary={summary}
                          onSelectCte={setSelectedRecord}
                        />
                      ))
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

      {/* Análises Gráficas (Distribuição, Evolução, Ranking, Motivos de Pendência) */}
      <CteCharts
        records={filteredRecords}
        onFilterStatus={handleFilterByStatus}
        onFilterVessel={handleFilterByVessel}
      />

      {/* Tabela Analítica Completa com Busca, Ordenação e Exportações Excel/PDF */}
      <CteTable
        records={filteredRecords}
        onSelectRecord={setSelectedRecord}
      />

      {/* Modais */}
      {/* 1. Modal de Detalhes do CT-e */}
      <CteDetailModal
        record={selectedRecord}
        allRecords={allRecords}
        onClose={() => setSelectedRecord(null)}
        onSelectRecord={setSelectedRecord}
      />

      {/* 2. Modal de Upload da Base de CT-e */}
      <CteUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onDataIngested={handleDataIngested}
      />

      {/* 3. Modal de Parâmetros de SLA por Etapa */}
      <CteSlaConfigModal
        isOpen={isSlaModalOpen}
        onClose={() => setIsSlaModalOpen(false)}
        configs={slaConfigs}
        onSaveConfigs={handleSaveSlaConfigs}
      />
    </div>
  );
};
