'use client';

import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  LayoutDashboard,
  Award,
  Kanban,
  CalendarDays,
  Settings,
  Search,
  Filter,
  RefreshCw,
} from 'lucide-react';
import initialDataJson from '@/data/initialData.json';
import { Header } from '@/components/Header';
import { DashboardTab } from '@/components/DashboardTab';
import { SlaTab } from '@/components/SlaTab';
import { KanbanTab } from '@/components/KanbanTab';
import { ScheduleTab } from '@/components/ScheduleTab';
import { SettingsTab } from '@/components/SettingsTab';
import { DtDetailModal } from '@/components/DtDetailModal';
import { UploadModal } from '@/components/UploadModal';
import { IssuesModal } from '@/components/IssuesModal';
import { MultiSelect, MultiSelectOption } from '@/components/MultiSelect';
import { saveModelToStorage, loadModelFromStorage, clearModelFromStorage } from '@/lib/storage';
import {
  TransportRecord,
  IngestionModel,
  FilterState,
  VesselMapping,
  SemaphoreThresholds,
} from '@/lib/types';
import {
  STAGES,
  DEFAULT_LIMITS,
  DEFAULT_CONTRACT_SLA,
  DEFAULT_SEMAPHORE,
  INITIAL_VESSEL_MAP,
} from '@/lib/constants';
import {
  buildRecordsFromModel,
  unique,
  isoDate,
  fmtDate,
  stageAge,
  totalLead,
  overdueDays,
  currentStageSlaOk,
  finalSlaOk,
  chronologyIssues,
  slaFilterMatch,
} from '@/lib/calculations';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import {
  fetchRecordsFromSupabase,
  saveRecordsToSupabase,
  fetchSystemSetting,
  saveSystemSetting,
  fetchLatestUploadLog,
} from '@/lib/supabaseService';

export default function Home() {
  const [model, setModel] = useState<IngestionModel>(initialDataJson as IngestionModel);
  const [supabaseRecords, setSupabaseRecords] = useState<TransportRecord[] | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState<string>('');
  const [uploadedAt, setUploadedAt] = useState<string | null>(null);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sla' | 'kanban' | 'schedule' | 'settings'>('dashboard');
  const [selectedDt, setSelectedDt] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeIssuesModal, setActiveIssuesModal] = useState<'chronology' | 'no_forecast' | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  // Settings state with localStorage persistence
  const [vesselMap, setVesselMap] = useState<VesselMapping>(INITIAL_VESSEL_MAP);
  const [limits, setLimits] = useState<Record<number, [number, number]>>(DEFAULT_LIMITS);
  const [contractSla, setContractSla] = useState<Record<number, number>>(DEFAULT_CONTRACT_SLA);
  const [semaphore, setSemaphore] = useState<SemaphoreThresholds>(DEFAULT_SEMAPHORE);

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: '',
    locals: [],
    routes: [],
    suppliers: [],
    expeditionTypes: [],
    types: [],
    slaFilters: [],
    refDate: isoDate(new Date()),
    createdFrom: '',
    createdTo: '',
    horizonDays: 14,
    scheduleMode: 'end',
    showDone: true,
  });

  // Load saved settings, tab, and persisted model from storage
  useEffect(() => {
    try {
      const savedTab = localStorage.getItem('modec_activeTab') as any;
      if (savedTab && ['dashboard', 'sla', 'kanban', 'schedule', 'settings'].includes(savedTab)) {
        setActiveTab(savedTab);
      }

      const savedMap = localStorage.getItem('modec_vesselMap');
      if (savedMap) setVesselMap(JSON.parse(savedMap));

      const savedLimits = localStorage.getItem('modec_limits');
      if (savedLimits) setLimits(JSON.parse(savedLimits));

      const savedContractSla = localStorage.getItem('modec_contractSla');
      if (savedContractSla) setContractSla(JSON.parse(savedContractSla));

      const savedSemaphore = localStorage.getItem('modec_semaphore');
      if (savedSemaphore) setSemaphore(JSON.parse(savedSemaphore));
    } catch (e) {
      console.error('Failed to load settings from localStorage', e);
    }

    // Restore persisted Excel model from IndexedDB as local cache
    loadModelFromStorage()
      .then(savedModel => {
        if (savedModel && savedModel.rows && savedModel.rows.length > 0) {
          setModel(savedModel);
          if (savedModel.uploadedAt) setUploadedAt(savedModel.uploadedAt);
        }
      })
      .catch(err => {
        console.error('Failed to load model from IndexedDB', err);
      });

    // Supabase Cloud Sync (if configured)
    if (isSupabaseConfigured) {
      setIsSyncingSupabase(true);
      fetchRecordsFromSupabase()
        .then(async dbRecords => {
          if (dbRecords && dbRecords.length > 0) {
            setSupabaseRecords(dbRecords);
            setIsRealtimeActive(true);
          } else {
            // First run: bootstrap Supabase with initial data
            const initialRecs = buildRecordsFromModel(initialDataJson as IngestionModel);
            await saveRecordsToSupabase(initialRecs, 'Carga Inicial (Histórico)');
            setSupabaseRecords(initialRecs);
            setIsRealtimeActive(true);
          }
        })
        .catch(err => {
          console.error('Erro ao conectar ao Supabase:', err);
        })
        .finally(() => {
          setIsSyncingSupabase(false);
        });

      // Sync shared system settings from cloud
      fetchLatestUploadLog().then(log => {
        if (log) {
          if (log.filename) setUploadedFilename(log.filename);
          if (log.uploadedAt) setUploadedAt(log.uploadedAt);
        }
      });
      fetchSystemSetting<VesselMapping>('vessel_map').then(m => {
        if (m) setVesselMap(m);
      });
      fetchSystemSetting<Record<number, [number, number]>>('limits').then(l => {
        if (l) setLimits(l);
      });
      fetchSystemSetting<Record<number, number>>('contract_sla').then(s => {
        if (s) setContractSla(s);
      });
      fetchSystemSetting<SemaphoreThresholds>('semaphore').then(sem => {
        if (sem) setSemaphore(sem);
      });
    }
  }, []);

  const handleTabChange = (tab: 'dashboard' | 'sla' | 'kanban' | 'schedule' | 'settings') => {
    setActiveTab(tab);
    try {
      localStorage.setItem('modec_activeTab', tab);
    } catch (e) {
      console.error('Failed to save active tab to localStorage', e);
    }
  };

  // Supabase Realtime subscription listener (live multi-user sync)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let debounceTimer: any = null;
    const channel = supabase
      .channel('transport_live_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transport_records' },
        () => {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(async () => {
            const [updated, latestLog] = await Promise.all([
              fetchRecordsFromSupabase(),
              fetchLatestUploadLog(),
            ]);
            if (updated && updated.length > 0) {
              setSupabaseRecords(updated);
              setIsRealtimeActive(true);
            }
            if (latestLog) {
              if (latestLog.filename) setUploadedFilename(latestLog.filename);
              if (latestLog.uploadedAt) setUploadedAt(latestLog.uploadedAt);
            }
          }, 1500);
        }
      )
      .subscribe(status => {
        setIsRealtimeActive(status === 'SUBSCRIBED');
      });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Build records from Supabase (cloud source of truth) or fallback to local model
  const records = useMemo(() => {
    if (supabaseRecords && supabaseRecords.length > 0) {
      return supabaseRecords;
    }
    return buildRecordsFromModel(model);
  }, [supabaseRecords, model]);

  // Derived filter options
  const uniqueLocals = useMemo(() => unique(records.map(r => r.local)), [records]);
  const uniqueRoutes = useMemo(() => unique(records.map(r => r.route)), [records]);
  const uniqueSuppliers = useMemo(() => unique(records.map(r => r.supplier)), [records]);
  const uniqueExpeditionTypes = useMemo(() => unique(records.map(r => r.expeditionType)), [records]);
  const uniqueTypes = useMemo(() => unique(records.map(r => r.type)), [records]);

  // Derived options formatted for MultiSelect
  const localOptions: MultiSelectOption[] = useMemo(() => {
    return uniqueLocals.map(l => ({
      value: l,
      label: vesselMap[l] ? `${vesselMap[l]} (${l})` : l,
    }));
  }, [uniqueLocals, vesselMap]);

  const routeOptions: MultiSelectOption[] = useMemo(() => {
    return uniqueRoutes.map(r => ({
      value: r,
      label: r,
    }));
  }, [uniqueRoutes]);

  const supplierOptions: MultiSelectOption[] = useMemo(() => {
    return uniqueSuppliers.map(s => ({
      value: s,
      label: s,
    }));
  }, [uniqueSuppliers]);

  const expeditionTypeOptions: MultiSelectOption[] = useMemo(() => {
    return uniqueExpeditionTypes.map(e => ({
      value: e,
      label: e ? `Tipo ${e}` : 'Não informado',
    }));
  }, [uniqueExpeditionTypes]);

  const typeOptions: MultiSelectOption[] = useMemo(() => {
    return uniqueTypes.map(t => ({
      value: t,
      label: t,
    }));
  }, [uniqueTypes]);

  const slaOptions: MultiSelectOption[] = useMemo(() => [
    { value: 'any_bad', label: 'Fora do SLA — qualquer' },
    { value: 'stage_bad', label: 'Fora do SLA — etapa' },
    { value: 'global_bad', label: 'Fora do SLA — global' },
    { value: 'good', label: 'Dentro do SLA' },
  ], []);

  // Latest upload date & time (or max modified date fallback)
  const lastUpdateDate = useMemo(() => {
    if (uploadedAt) {
      const parsed = new Date(uploadedAt);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const dates = records
      .map(r => r.modified || r.actualEnd || r.created)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime());
    return dates.length > 0 ? dates[0] : null;
  }, [records, uploadedAt]);

  // Reference Date Object
  const refDateObj = useMemo(() => {
    return filters.refDate ? new Date(filters.refDate + 'T23:59:59') : new Date();
  }, [filters.refDate]);

  // Chronology issues in entire base
  const chronologyRecords = useMemo(() => {
    return records.filter(r => chronologyIssues(r).length > 0);
  }, [records]);

  // Records missing forecast end date (sem previsão)
  const noForecastRecords = useMemo(() => {
    return records.filter(r => !r.forecastEnd);
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return records.filter(r => {
      if (q && !r.dt.toLowerCase().includes(q)) return false;
      if (filters.status !== '' && String(r.status) !== filters.status) return false;
      
      // Multi-select matching (conforme matchMulti do HTML v22)
      if (filters.locals.length > 0 && !filters.locals.includes(r.local)) return false;
      if (filters.routes.length > 0 && !filters.routes.includes(r.route)) return false;
      if (filters.suppliers.length > 0 && !filters.suppliers.includes(r.supplier)) return false;
      if (filters.expeditionTypes.length > 0 && !filters.expeditionTypes.includes(r.expeditionType)) return false;
      if (filters.types.length > 0 && !filters.types.includes(r.type)) return false;
      if (!filters.showDone && r.status === 7) return false;
      
      // Filtro de Criação (Criado em / Data de criação)
      if (filters.createdFrom || filters.createdTo) {
        const createdIso = isoDate(r.created);
        if (!createdIso) return false;
        if (filters.createdFrom && createdIso < filters.createdFrom) return false;
        if (filters.createdTo && createdIso > filters.createdTo) return false;
      }

      // SLA multi-selection
      if (filters.slaFilters.length > 0) {
        const matchesAny = filters.slaFilters.some(f => slaFilterMatch(r, refDateObj, f, contractSla));
        if (!matchesAny) return false;
      }

      return true;
    });
  }, [records, filters, refDateObj, contractSla]);

  // Selected DT record
  const selectedRecord = useMemo(() => {
    if (!selectedDt) return null;
    return records.find(r => r.dt === selectedDt) || null;
  }, [records, selectedDt]);

  // Handlers
  const handleSaveVesselMap = (newMap: VesselMapping) => {
    setVesselMap(newMap);
    localStorage.setItem('modec_vesselMap', JSON.stringify(newMap));
    if (isSupabaseConfigured) saveSystemSetting('vessel_map', newMap);
  };

  const handleSaveLimits = (newLimits: Record<number, [number, number]>) => {
    setLimits(newLimits);
    localStorage.setItem('modec_limits', JSON.stringify(newLimits));
    if (isSupabaseConfigured) saveSystemSetting('limits', newLimits);
  };

  const handleSaveContractSla = (newSla: Record<number, number>, newSem: SemaphoreThresholds) => {
    setContractSla(newSla);
    setSemaphore(newSem);
    localStorage.setItem('modec_contractSla', JSON.stringify(newSla));
    localStorage.setItem('modec_semaphore', JSON.stringify(newSem));
    if (isSupabaseConfigured) {
      saveSystemSetting('contract_sla', newSla);
      saveSystemSetting('semaphore', newSem);
    }
  };

  const handleResetSettings = () => {
    if (confirm('Restaurar parâmetros padrão de SLA, limites e mapeamento?')) {
      setVesselMap(INITIAL_VESSEL_MAP);
      setLimits(DEFAULT_LIMITS);
      setContractSla(DEFAULT_CONTRACT_SLA);
      setSemaphore(DEFAULT_SEMAPHORE);
      localStorage.removeItem('modec_vesselMap');
      localStorage.removeItem('modec_limits');
      localStorage.removeItem('modec_contractSla');
      localStorage.removeItem('modec_semaphore');
    }
  };

  const handleResetData = async () => {
    if (confirm('Deseja restaurar a base de dados inicial?')) {
      await clearModelFromStorage();
      const nowIso = new Date().toISOString();
      const initialRecs = buildRecordsFromModel(initialDataJson as IngestionModel);
      setModel(initialDataJson as IngestionModel);
      setUploadedFilename('Base Inicial (Histórico)');
      setUploadedAt(nowIso);
      if (isSupabaseConfigured) {
        setIsSyncingSupabase(true);
        setSupabaseRecords(initialRecs);
        await saveRecordsToSupabase(initialRecs, 'Restauração da Base Inicial', true);
        setIsSyncingSupabase(false);
      } else {
        setSupabaseRecords(null);
      }
    }
  };

  const handleExportExcel = () => {
    const rowsOut = filteredRecords.map(r => ({
      DT: r.dt,
      Status: r.status,
      Etapa: STAGES.find(s => s.id === r.status)?.name || `Status ${r.status}`,
      Local: r.local,
      Embarcação: vesselMap[r.local] || '',
      Itinerário: r.parsedItinerary.display || r.route,
      Fornecedor: r.supplier,
      'Criado por': r.createdBy,
      'Criado em': fmtDate(r.created),
      'Início Previsto': fmtDate(r.forecastStart),
      'Início Efetivo': fmtDate(r.actualStart),
      'Fim Previsto (SLA)': fmtDate(r.forecastEnd),
      'Fim Atual': fmtDate(r.actualEnd),
      'Aging Etapa (dias)': r.status === 7 ? '' : stageAge(r, refDateObj) ?? '',
      'Lead Time Total (dias)': totalLead(r) ?? '',
      'Atraso Entrega (dias)': overdueDays(r, refDateObj) ?? 0,
      'SLA Etapa (dias)': r.status < 7 ? contractSla[r.status] : '',
      'Dentro SLA Etapa':
        r.status < 7
          ? currentStageSlaOk(r, refDateObj, contractSla) === null
            ? ''
            : currentStageSlaOk(r, refDateObj, contractSla)
            ? 'Sim'
            : 'Não'
          : '',
      'Dentro Prazo Final': r.forecastEnd ? (finalSlaOk(r, refDateObj) ? 'Sim' : 'Não') : '',
    }));

    const ws = XLSX.utils.json_to_sheet(rowsOut);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Visao Filtrada');
    XLSX.writeFile(wb, `visao_transporte_modec_v22_${isoDate(new Date())}.xlsx`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-mro-bg">
      {/* Top Header */}
      <Header
        filename={uploadedFilename || model.filename || 'Base Histórica'}
        totalRecords={records.length}
        lastUpdate={lastUpdateDate}
        refDate={filters.refDate}
        isRealtimeActive={isRealtimeActive}
        chronologyIssuesCount={chronologyRecords.length}
        noForecastCount={noForecastRecords.length}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onReset={handleResetData}
        onExport={handleExportExcel}
        onOpenChronologyModal={() => setActiveIssuesModal('chronology')}
        onOpenNoForecastModal={() => setActiveIssuesModal('no_forecast')}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto px-6 py-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-mro-line pb-3 mb-6 overflow-x-auto">
          <button
            onClick={() => handleTabChange('dashboard')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'dashboard'
                ? 'bg-mro-navy text-white shadow-md'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-mro-line'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Painel Gerencial
          </button>

          <button
            onClick={() => handleTabChange('sla')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'sla'
                ? 'bg-mro-navy text-white shadow-md'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-mro-line'
            }`}
          >
            <Award className="w-4 h-4" />
            SLA & Desempenho
          </button>

          <button
            onClick={() => handleTabChange('kanban')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'kanban'
                ? 'bg-mro-navy text-white shadow-md'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-mro-line'
            }`}
          >
            <Kanban className="w-4 h-4" />
            Kanban por Etapas (Audax)
          </button>

          <button
            onClick={() => handleTabChange('schedule')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'schedule'
                ? 'bg-mro-navy text-white shadow-md'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-mro-line'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Programação / Agendamento
          </button>

          <button
            onClick={() => handleTabChange('settings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ml-auto ${
              activeTab === 'settings'
                ? 'bg-mro-navy text-white shadow-md'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-mro-line'
            }`}
          >
            <Settings className="w-4 h-4" />
            Configurações
          </button>
        </div>

        {/* Global Filter Bar */}
        {activeTab !== 'settings' && (
          <div className="p-4 bg-white rounded-2xl border border-mro-line shadow-card mb-6 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-3 text-xs items-end">
              {/* 1. Buscar DT */}
              <div>
                <label className="text-[10px] font-bold text-mro-muted uppercase block mb-1">Buscar DT</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Nº transporte..."
                    value={filters.search}
                    onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-8 pr-3 min-h-[34px] border border-slate-300 rounded-lg text-xs bg-white"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {/* Status Filter (only on non-Kanban tabs) */}
              {activeTab !== 'kanban' && (
                <div>
                  <label className="text-[10px] font-bold text-mro-muted uppercase block mb-1">Status Audax</label>
                  <select
                    value={filters.status}
                    onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-2.5 min-h-[34px] border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="">Todos</option>
                    {STAGES.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.id} — {s.short}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 2. Embarcação / Local (Multi-Select) */}
              <MultiSelect
                label="Embarcação / Local"
                placeholder="Todas"
                options={localOptions}
                selected={filters.locals}
                onChange={vals => setFilters(prev => ({ ...prev, locals: vals }))}
              />

              {/* 3. Itinerário (Multi-Select) */}
              <MultiSelect
                label="Itinerário"
                placeholder="Todos"
                options={routeOptions}
                selected={filters.routes}
                onChange={vals => setFilters(prev => ({ ...prev, routes: vals }))}
              />

              {/* 4. Fornecedor ou Tipo de Expedição (Kanban) (Multi-Select) */}
              {activeTab === 'kanban' ? (
                <MultiSelect
                  label="Tipo de Expedição"
                  placeholder="Todos"
                  options={expeditionTypeOptions}
                  selected={filters.expeditionTypes}
                  onChange={vals => setFilters(prev => ({ ...prev, expeditionTypes: vals }))}
                />
              ) : (
                <MultiSelect
                  label="Fornecedor"
                  placeholder="Todos"
                  options={supplierOptions}
                  selected={filters.suppliers}
                  onChange={vals => setFilters(prev => ({ ...prev, suppliers: vals }))}
                />
              )}

              {/* 5. Tipo de Transporte (Multi-Select) */}
              <MultiSelect
                label="Tipo Transporte"
                placeholder="Todos"
                options={typeOptions}
                selected={filters.types}
                onChange={vals => setFilters(prev => ({ ...prev, types: vals }))}
              />

              {/* 6. Filtro de SLA (Multi-Select) */}
              <MultiSelect
                label="Filtro de SLA"
                placeholder="Todas as DTs"
                options={slaOptions}
                selected={filters.slaFilters}
                onChange={vals => setFilters(prev => ({ ...prev, slaFilters: vals }))}
              />

              {/* Filtro de Criação (Criado em / Data de criação - Kanban) */}
              {activeTab === 'kanban' && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-mro-muted uppercase block mb-1">
                      Criado em (De)
                    </label>
                    <input
                      type="date"
                      value={filters.createdFrom || ''}
                      onChange={e => setFilters(prev => ({ ...prev, createdFrom: e.target.value }))}
                      className="w-full px-2.5 min-h-[34px] border border-slate-300 rounded-lg text-xs bg-white"
                      title="Filtrar DTs criadas a partir desta data"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-mro-muted uppercase block mb-1">
                      Criado em (Até)
                    </label>
                    <input
                      type="date"
                      value={filters.createdTo || ''}
                      onChange={e => setFilters(prev => ({ ...prev, createdTo: e.target.value }))}
                      className="w-full px-2.5 min-h-[34px] border border-slate-300 rounded-lg text-xs bg-white"
                      title="Filtrar DTs criadas até esta data"
                    />
                  </div>
                </>
              )}

              {/* 7. Data Referência */}
              <div>
                <label className="text-[10px] font-bold text-mro-muted uppercase block mb-1">Data Referência</label>
                <input
                  type="date"
                  value={filters.refDate}
                  onChange={e => setFilters(prev => ({ ...prev, refDate: e.target.value }))}
                  className="w-full px-2.5 min-h-[34px] border border-slate-300 rounded-lg text-xs bg-white"
                />
              </div>

              {/* 8. Exibir Concluídas / Janela Futura */}
              {activeTab === 'sla' || activeTab === 'schedule' ? (
                <div>
                  <label className="text-[10px] font-bold text-mro-muted uppercase block mb-1">Janela Futura</label>
                  <select
                    value={filters.horizonDays}
                    onChange={e => setFilters(prev => ({ ...prev, horizonDays: Number(e.target.value) }))}
                    className="w-full px-2.5 min-h-[34px] border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value={7}>7 dias</option>
                    <option value={14}>14 dias</option>
                    <option value={30}>30 dias</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-bold text-mro-muted uppercase block mb-1">Exibir Concluídas</label>
                  <select
                    value={filters.showDone ? 'yes' : 'no'}
                    onChange={e => setFilters(prev => ({ ...prev, showDone: e.target.value === 'yes' }))}
                    className="w-full px-2.5 min-h-[34px] border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="yes">Sim</option>
                    <option value="no">Não (Apenas Abertas)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Clear filters banner when active */}
            {(filters.search ||
              filters.status ||
              filters.locals.length > 0 ||
              filters.routes.length > 0 ||
              filters.suppliers.length > 0 ||
              filters.expeditionTypes.length > 0 ||
              filters.types.length > 0 ||
              filters.slaFilters.length > 0 ||
              filters.createdFrom ||
              filters.createdTo ||
              !filters.showDone) && (
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px]">
                <span className="text-slate-500 font-medium">
                  Filtros múltiplos ativos:{' '}
                  {[
                    filters.search ? `Busca "${filters.search}"` : null,
                    filters.locals.length ? `${filters.locals.length} locais` : null,
                    filters.routes.length ? `${filters.routes.length} rotas` : null,
                    filters.suppliers.length ? `${filters.suppliers.length} fornecedores` : null,
                    filters.expeditionTypes.length ? `${filters.expeditionTypes.length} expedições` : null,
                    filters.types.length ? `${filters.types.length} tipos` : null,
                    filters.slaFilters.length ? `${filters.slaFilters.length} SLA` : null,
                    filters.createdFrom && filters.createdTo
                      ? `Criado de ${fmtDate(filters.createdFrom)} até ${fmtDate(filters.createdTo)}`
                      : filters.createdFrom
                      ? `Criado a partir de ${fmtDate(filters.createdFrom)}`
                      : filters.createdTo
                      ? `Criado até ${fmtDate(filters.createdTo)}`
                      : null,
                    !filters.showDone ? 'ocultando concluídas' : null,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFilters(prev => ({
                      ...prev,
                      search: '',
                      status: '',
                      locals: [],
                      routes: [],
                      suppliers: [],
                      expeditionTypes: [],
                      types: [],
                      slaFilters: [],
                      createdFrom: '',
                      createdTo: '',
                      showDone: true,
                    }))
                  }
                  className="font-bold text-red-600 hover:text-red-700 hover:underline"
                >
                  Limpar todos os filtros
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab Views */}
        {activeTab === 'dashboard' && (
          <DashboardTab
            data={filteredRecords}
            allRecords={records}
            vesselMap={vesselMap}
            refDate={refDateObj}
            onSelectDt={setSelectedDt}
          />
        )}

        {activeTab === 'sla' && (
          <SlaTab
            data={filteredRecords}
            vesselMap={vesselMap}
            refDate={refDateObj}
            contractSla={contractSla}
            semaphore={semaphore}
            horizonDays={filters.horizonDays}
            onSelectDt={setSelectedDt}
          />
        )}

        {activeTab === 'kanban' && (
          <KanbanTab
            data={filteredRecords}
            vesselMap={vesselMap}
            refDate={refDateObj}
            limits={limits}
            contractSla={contractSla}
            onSelectDt={setSelectedDt}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleTab
            data={filteredRecords}
            vesselMap={vesselMap}
            refDate={refDateObj}
            horizonDays={filters.horizonDays}
            onSelectDt={setSelectedDt}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            localCodes={uniqueLocals}
            vesselMap={vesselMap}
            limits={limits}
            contractSla={contractSla}
            semaphore={semaphore}
            onSaveVesselMap={handleSaveVesselMap}
            onSaveLimits={handleSaveLimits}
            onSaveContractSla={handleSaveContractSla}
            onResetSettings={handleResetSettings}
          />
        )}
      </main>

      {/* DT Detail Modal */}
      <DtDetailModal
        record={selectedRecord}
        vesselMap={vesselMap}
        refDate={refDateObj}
        contractSla={contractSla}
        onClose={() => setSelectedDt(null)}
      />

      {/* Excel Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onDataIngested={async newModel => {
          const nowIso = newModel.uploadedAt || new Date().toISOString();
          const modelWithTimestamp = { ...newModel, uploadedAt: nowIso };
          setModel(modelWithTimestamp);
          setUploadedFilename(newModel.filename);
          setUploadedAt(nowIso);
          await saveModelToStorage(modelWithTimestamp);
          const newRecords = buildRecordsFromModel(modelWithTimestamp);
          setSupabaseRecords(newRecords);

          if (isSupabaseConfigured) {
            setIsSyncingSupabase(true);
            const res = await saveRecordsToSupabase(newRecords, newModel.filename, true);
            setIsSyncingSupabase(false);
            if (!res.success) {
              console.error('Falha ao persistir no Supabase:', res.error);
              alert(`Aviso: O arquivo foi carregado localmente, mas a sincronização com o banco de dados retornou: ${res.error}`);
            }
          }
        }}
      />

      {/* Issues Modal (Chronology Inversion / Missing Forecast) */}
      <IssuesModal
        isOpen={activeIssuesModal !== null}
        onClose={() => setActiveIssuesModal(null)}
        type={activeIssuesModal || 'chronology'}
        records={activeIssuesModal === 'chronology' ? chronologyRecords : noForecastRecords}
        vesselMap={vesselMap}
        refDate={refDateObj}
        limits={limits}
        contractSla={contractSla}
        onSelectDt={setSelectedDt}
      />
    </div>
  );
}
