'use client';

import React, { useState } from 'react';
import { Save, RotateCcw, Ship, Sliders, CheckCircle2 } from 'lucide-react';
import { VesselMapping, SemaphoreThresholds } from '@/lib/types';
import { STAGES } from '@/lib/constants';

interface SettingsTabProps {
  localCodes: string[];
  vesselMap: VesselMapping;
  limits: Record<number, [number, number]>;
  contractSla: Record<number, number>;
  semaphore: SemaphoreThresholds;
  onSaveVesselMap: (map: VesselMapping) => void;
  onSaveLimits: (limits: Record<number, [number, number]>) => void;
  onSaveContractSla: (sla: Record<number, number>, sem: SemaphoreThresholds) => void;
  onResetSettings: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  localCodes,
  vesselMap,
  limits,
  contractSla,
  semaphore,
  onSaveVesselMap,
  onSaveLimits,
  onSaveContractSla,
  onResetSettings,
}) => {
  const [localMapState, setLocalMapState] = useState<VesselMapping>({ ...vesselMap });
  const [limitsState, setLimitsState] = useState<Record<number, [number, number]>>({ ...limits });
  const [contractSlaState, setContractSlaState] = useState<Record<number, number>>({ ...contractSla });
  const [semGreen, setSemGreen] = useState<number>(semaphore.green);
  const [semAmber, setSemAmber] = useState<number>(semaphore.amber);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleSaveMap = () => {
    onSaveVesselMap(localMapState);
    showSuccess('Mapeamento de embarcações salvo com sucesso!');
  };

  const handleSaveLimits = () => {
    onSaveLimits(limitsState);
    showSuccess('Limites gerenciais de aging salvos com sucesso!');
  };

  const handleSaveContract = () => {
    if (semAmber > semGreen) {
      alert('A faixa amarela não pode ser maior que a faixa verde.');
      return;
    }
    onSaveContractSla(contractSlaState, { green: semGreen, amber: semAmber });
    showSuccess('SLA contratual e faixas de semáforo salvas!');
  };

  return (
    <div className="space-y-6">
      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Vessel Mapping */}
        <div className="p-5 bg-white rounded-2xl border border-mro-line shadow-card flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Ship className="w-4 h-4 text-mro-blue" />
            <h3 className="text-sm font-bold text-mro-navy">Mapeamento Local Org. → Embarcação MODEC</h3>
          </div>
          <p className="text-[11px] text-mro-muted mb-4 leading-relaxed">
            Como o SAP VT11 exporta códigos técnicos em <b>Local org.transporte</b>, cadastre abaixo o nome amigável da respectiva embarcação ou polo. As alterações ficam sincronizadas para todos os usuários.
          </p>

          <div className="space-y-2.5 overflow-y-auto max-h-[460px] pr-2 flex-1">
            {localCodes.map(code => (
              <div key={code} className="grid grid-cols-[100px_1fr] items-center gap-3 text-xs">
                <span className="font-bold text-mro-navy bg-mro-bg px-2.5 py-1.5 rounded-lg border border-mro-line text-center">
                  {code}
                </span>
                <input
                  type="text"
                  placeholder="Nome da embarcação (ex: FPSO Carioca MV30)"
                  value={localMapState[code] || ''}
                  onChange={e =>
                    setLocalMapState(prev => ({
                      ...prev,
                      [code]: e.target.value,
                    }))
                  }
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-mro-blue"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-mro-line mt-4">
            <button
              onClick={handleSaveMap}
              className="flex items-center gap-1.5 px-4 py-2 bg-mro-green text-mro-navy font-bold text-xs rounded-lg hover:bg-emerald-400 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Salvar Mapeamento
            </button>
          </div>
        </div>

        {/* Managerial Aging Limits */}
        <div className="p-5 bg-white rounded-2xl border border-mro-line shadow-card flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Sliders className="w-4 h-4 text-mro-blue" />
            <h3 className="text-sm font-bold text-mro-navy">Limites Gerenciais de Aging (Kanban)</h3>
          </div>
          <p className="text-[11px] text-mro-muted mb-4 leading-relaxed">
            Parâmetros em dias corridos para colorir as bordas dos cartões no Kanban (verde = normal, amarelo = atenção, vermelho = crítico).
          </p>

          <div className="space-y-2.5 overflow-y-auto max-h-[460px] pr-2 flex-1 text-xs">
            <div className="grid grid-cols-[1.5fr_1fr_1fr] items-center gap-3 font-bold text-[10px] text-mro-muted uppercase">
              <span>Etapa</span>
              <span>Atenção ≥ (dias)</span>
              <span>Crítico ≥ (dias)</span>
            </div>

            {STAGES.map(s => {
              const currentLimits = limitsState[s.id] || [1, 3];
              return (
                <div key={s.id} className="grid grid-cols-[1.5fr_1fr_1fr] items-center gap-3">
                  <span className="font-semibold text-mro-navy truncate">
                    {s.id} — {s.short}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={currentLimits[0]}
                    onChange={e =>
                      setLimitsState(prev => ({
                        ...prev,
                        [s.id]: [Number(e.target.value || 0), currentLimits[1]],
                      }))
                    }
                    className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                  <input
                    type="number"
                    min="0"
                    value={currentLimits[1]}
                    onChange={e =>
                      setLimitsState(prev => ({
                        ...prev,
                        [s.id]: [currentLimits[0], Number(e.target.value || 0)],
                      }))
                    }
                    className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-mro-line mt-4">
            <button
              onClick={handleSaveLimits}
              className="flex items-center gap-1.5 px-4 py-2 bg-mro-blue text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Salvar Limites do Kanban
            </button>
          </div>
        </div>
      </div>

      {/* Contractual SLA & Semaphore settings */}
      <div className="p-5 bg-white rounded-2xl border border-mro-line shadow-card">
        <h3 className="text-sm font-bold text-mro-navy">SLA Contratual Máximo e Faixas de Semáforo</h3>
        <p className="text-[11px] text-mro-muted mb-4">
          Defina o tempo máximo tolerável em dias corridos por etapa para fins de medição formal de desempenho.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Stage SLA */}
          <div className="space-y-2">
            <span className="font-bold text-[11px] text-mro-navy block mb-2">SLA Máximo por Etapa (dias)</span>
            {STAGES.filter(s => s.id < 7).map(s => (
              <div key={s.id} className="flex items-center justify-between gap-3">
                <span className="text-slate-700">
                  {s.id} — {s.name} {s.id === 6 && <span className="text-amber-600">(aprox.)</span>}
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={contractSlaState[s.id] ?? 1}
                  onChange={e =>
                    setContractSlaState(prev => ({
                      ...prev,
                      [s.id]: Number(e.target.value || 0),
                    }))
                  }
                  className="w-20 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-center"
                />
              </div>
            ))}
          </div>

          {/* Semaphore Thresholds */}
          <div className="space-y-3 bg-mro-bg p-4 rounded-xl border border-mro-line flex flex-col justify-between">
            <div>
              <span className="font-bold text-[11px] text-mro-navy block mb-2">Faixas de Semáforo (% de Aderência)</span>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Faixa Verde (Conforme) ≥
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={semGreen}
                      onChange={e => setSemGreen(Number(e.target.value || 0))}
                      className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-xs text-center"
                    />
                    <span>%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-amber-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Faixa Amarela (Atenção) ≥
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={semAmber}
                      onChange={e => setSemAmber(Number(e.target.value || 0))}
                      className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-xs text-center"
                    />
                    <span>%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-red-700 font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Faixa Vermelha (Crítico)
                  </span>
                  <span className="text-[11px] text-mro-muted">Abaixo de {semAmber}%</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveContract}
              className="mt-4 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-mro-navy text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition-colors w-full"
            >
              <Save className="w-3.5 h-3.5" />
              Salvar Parâmetros de SLA & Semáforo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
