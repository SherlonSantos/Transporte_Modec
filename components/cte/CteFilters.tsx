'use client';

import React from 'react';
import {
  Search,
  Filter,
  RotateCcw,
  SlidersHorizontal,
  FileSpreadsheet,
  Layers,
  FileText,
  Calendar,
  X,
} from 'lucide-react';
import { MultiSelect, MultiSelectOption } from '@/components/MultiSelect';
import { CteFilterState } from '@/lib/cteTypes';

interface CteFiltersProps {
  filters: CteFilterState;
  onChangeFilters: (newFilters: CteFilterState) => void;
  onResetFilters: () => void;
  viewMode: 'cte' | 'dt';
  onChangeViewMode: (mode: 'cte' | 'dt') => void;
  // Opções para os MultiSelects
  vesselOptions: MultiSelectOption[];
  baseOptions: MultiSelectOption[];
  statusKanbanOptions: MultiSelectOption[];
  originalStatusOptions: MultiSelectOption[];
  flowTypeOptions: MultiSelectOption[];
  situationOptions: MultiSelectOption[];
  slaOptions: MultiSelectOption[];
  // Ações
  onOpenUpload: () => void;
  onOpenSlaConfig: () => void;
  totalFilteredRecords: number;
  totalBaseRecords: number;
}

export const CteFilters: React.FC<CteFiltersProps> = ({
  filters,
  onChangeFilters,
  onResetFilters,
  viewMode,
  onChangeViewMode,
  vesselOptions,
  baseOptions,
  statusKanbanOptions,
  originalStatusOptions,
  flowTypeOptions,
  situationOptions,
  slaOptions,
  onOpenUpload,
  onOpenSlaConfig,
  totalFilteredRecords,
  totalBaseRecords,
}) => {
  const hasActiveFilters = Boolean(
    filters.search ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.vessels.length ||
    filters.bases.length ||
    filters.kanbanStatuses.length ||
    filters.originalStatuses.length ||
    filters.flowTypes.length ||
    filters.situations.length ||
    filters.slaStatus.length
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
      {/* Top Header dos Filtros com Alternador de Visão e Ações */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-mro-navy/5 text-mro-navy grid place-items-center">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-mro-navy">Filtros Dinâmicos Multi-Seleção</h3>
            <span className="text-[11px] text-mro-muted">
              Exibindo <b>{totalFilteredRecords.toLocaleString('pt-BR')}</b> de{' '}
              {totalBaseRecords.toLocaleString('pt-BR')} registros
            </span>
          </div>
        </div>

        {/* Alternador Visão por CT-e / Visão por DT + Ações */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-slate-100 p-0.5 rounded-xl flex items-center border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => onChangeViewMode('cte')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'cte'
                  ? 'bg-mro-navy text-white shadow-xs'
                  : 'text-slate-600 hover:text-mro-navy'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Visão por CT-e
            </button>
            <button
              type="button"
              onClick={() => onChangeViewMode('dt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'dt'
                  ? 'bg-mro-navy text-white shadow-xs'
                  : 'text-slate-600 hover:text-mro-navy'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Visão por DT
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenSlaConfig}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-mro-blue" />
            Configurar SLA
          </button>

          <button
            type="button"
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-mro-blue hover:bg-mro-blueLight text-white text-xs font-bold shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Carregar Base CT-e (Excel)
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors"
              title="Limpar todos os filtros ativos"
            >
              <X className="w-3.5 h-3.5" />
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Grid de Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3 pt-3">
        {/* Busca por DT ou CT-e */}
        <div>
          <label className="text-[10px] font-bold text-mro-muted uppercase block mb-1">
            Buscar DT ou CT-e
          </label>
          <div className="relative">
            <input
              type="text"
              value={filters.search}
              onChange={e => onChangeFilters({ ...filters, search: e.target.value })}
              placeholder="Digite o número..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-mro-blue focus:border-mro-blue"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Período de Emissão (De) */}
        <div>
          <label className="text-[10px] font-bold text-mro-muted uppercase block mb-1">
            Emissão De
          </label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={e => onChangeFilters({ ...filters, dateFrom: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-mro-blue text-slate-700"
          />
        </div>

        {/* Período de Emissão (Até) */}
        <div>
          <label className="text-[10px] font-bold text-mro-muted uppercase block mb-1">
            Emissão Até
          </label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={e => onChangeFilters({ ...filters, dateTo: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-mro-blue text-slate-700"
          />
        </div>

        {/* Status Kanban */}
        <MultiSelect
          label="Status Kanban"
          placeholder="Todos os status"
          options={statusKanbanOptions}
          selected={filters.kanbanStatuses}
          onChange={selected => onChangeFilters({ ...filters, kanbanStatuses: selected })}
        />

        {/* Embarcação / Navio */}
        <MultiSelect
          label="Embarcação (Navio)"
          placeholder="Todas as embarcações"
          options={vesselOptions}
          selected={filters.vessels}
          onChange={selected => onChangeFilters({ ...filters, vessels: selected })}
        />

        {/* Base Operacional */}
        <MultiSelect
          label="Base Operacional"
          placeholder="Todas as bases"
          options={baseOptions}
          selected={filters.bases}
          onChange={selected => onChangeFilters({ ...filters, bases: selected })}
        />

        {/* Status Original */}
        <MultiSelect
          label="Status Original SAP/Doc"
          placeholder="Todos os originais"
          options={originalStatusOptions}
          selected={filters.originalStatuses}
          onChange={selected => onChangeFilters({ ...filters, originalStatuses: selected })}
        />

        {/* Tipo de Fluxo */}
        <MultiSelect
          label="Tipo de Fluxo"
          placeholder="Todos os fluxos"
          options={flowTypeOptions}
          selected={filters.flowTypes}
          onChange={selected => onChangeFilters({ ...filters, flowTypes: selected })}
        />

        {/* Situação Kanban */}
        <MultiSelect
          label="Situação Operacional"
          placeholder="Todas as situações"
          options={situationOptions}
          selected={filters.situations}
          onChange={selected => onChangeFilters({ ...filters, situations: selected })}
        />

        {/* Situação do SLA */}
        <MultiSelect
          label="Situação do SLA"
          placeholder="Todas as situações"
          options={slaOptions}
          selected={filters.slaStatus}
          onChange={selected => onChangeFilters({ ...filters, slaStatus: selected })}
        />
      </div>
    </div>
  );
};
