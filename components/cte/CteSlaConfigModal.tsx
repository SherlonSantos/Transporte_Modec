'use client';

import React, { useState } from 'react';
import { X, SlidersHorizontal, Check, Clock, AlertTriangle, RotateCcw } from 'lucide-react';
import { CteSlaConfig } from '@/lib/cteTypes';
import { CTE_KANBAN_BUCKETS } from '@/lib/cteDictionary';

interface CteSlaConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  configs: Record<number, CteSlaConfig>;
  onSaveConfigs: (configs: Record<number, CteSlaConfig>) => void;
}

export const CteSlaConfigModal: React.FC<CteSlaConfigModalProps> = ({
  isOpen,
  onClose,
  configs,
  onSaveConfigs,
}) => {
  const [localConfigs, setLocalConfigs] = useState<Record<number, CteSlaConfig>>(() => {
    // Inicializa se vazio com os buckets padrão
    const initial: Record<number, CteSlaConfig> = { ...configs };
    CTE_KANBAN_BUCKETS.forEach(b => {
      if (!initial[b.id]) {
        initial[b.id] = {
          stageId: b.id,
          stageName: b.name,
          targetDays: null, // Padrão não parametrizado conforme solicitado no prompt
          warningDays: null,
          unit: 'dias',
          startMilestone: 'Data de Emissão do CT-e',
          endCondition: b.id === 5 ? 'Processo de Faturamento Concluído' : 'Transição de Etapa',
        };
      }
    });
    return initial;
  });

  if (!isOpen) return null;

  const handleUpdate = (stageId: number, field: keyof CteSlaConfig, value: any) => {
    setLocalConfigs(prev => ({
      ...prev,
      [stageId]: {
        ...prev[stageId],
        [field]: value,
      },
    }));
  };

  const handleSave = () => {
    onSaveConfigs(localConfigs);
    onClose();
  };

  const handleReset = () => {
    const cleared: Record<number, CteSlaConfig> = {};
    CTE_KANBAN_BUCKETS.forEach(b => {
      cleared[b.id] = {
        stageId: b.id,
        stageName: b.name,
        targetDays: null,
        warningDays: null,
        unit: 'dias',
        startMilestone: 'Data de Emissão do CT-e',
        endCondition: 'Transição de Etapa',
      };
    });
    setLocalConfigs(cleared);
  };

  return (
    <div
      className="fixed inset-0 bg-mro-navy/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-mro-line flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-mro-line flex items-center justify-between bg-mro-bg sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-mro-blue" />
            <div>
              <h3 className="font-bold text-base text-mro-navy">Parâmetros de SLA por Etapa (CT-e)</h3>
              <p className="text-xs text-mro-muted">
                Configure os prazos operacionais em dias para o semáforo de criticidade
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl text-xs text-blue-900 leading-relaxed">
            <p>
              <b>Regra de Auditoria:</b> Quando o campo de prazo previsto estiver em branco ou zerado, a etapa será tratada como <b>"Não parametrizado"</b> (ou <b>"A validar"</b>), garantindo integridade sem atribuir metas artificiais.
            </p>
          </div>

          <div className="space-y-3">
            {CTE_KANBAN_BUCKETS.filter(b => b.id !== 6).map(bucket => {
              const cfg = localConfigs[bucket.id] || {
                stageId: bucket.id,
                stageName: bucket.name,
                targetDays: null,
                unit: 'dias',
                startMilestone: 'Data de Emissão do CT-e',
                endCondition: 'Transição de Etapa',
              };

              return (
                <div
                  key={bucket.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="sm:w-1/2">
                    <div className="font-bold text-mro-navy flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-mro-navy text-white text-[10px] grid place-items-center font-black">
                        {bucket.id}
                      </span>
                      {bucket.name}
                    </div>
                    <span className="text-[11px] text-mro-muted block mt-0.5">
                      {bucket.description}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                        Meta SLA (Dias)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        placeholder="Não param."
                        value={cfg.targetDays !== null && cfg.targetDays !== undefined ? cfg.targetDays : ''}
                        onChange={e => {
                          const val = e.target.value === '' ? null : Math.max(1, parseInt(e.target.value, 10));
                          handleUpdate(bucket.id, 'targetDays', val);
                        }}
                        className="w-24 px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-mro-blue text-center bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                        Marco Inicial
                      </label>
                      <span className="inline-block px-2 py-1.5 text-[11px] bg-slate-200/70 text-slate-700 rounded-lg font-semibold">
                        Emissão CT-e
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-mro-line bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Limpar Parâmetros
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-mro-navy hover:bg-mro-navyDark text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Check className="w-4 h-4" />
              Salvar Parâmetros
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
