'use client';

import React from 'react';
import {
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { CteRecord, CteSlaConfig } from '@/lib/cteTypes';
import { getCteAgeDays, fmtDateBr, fmtMoney } from '@/lib/cteCalculations';

interface CteKanbanCardProps {
  record: CteRecord;
  slaConfig?: CteSlaConfig;
  onSelect: (record: CteRecord) => void;
}

export const CteKanbanCard: React.FC<CteKanbanCardProps> = ({
  record,
  slaConfig,
  onSelect,
}) => {
  const ageDays = getCteAgeDays(record.emissionDate);

  // SLA Evaluation
  const hasSlaConfig = slaConfig && slaConfig.targetDays !== null && slaConfig.targetDays !== undefined;
  const isWithinSla = hasSlaConfig && ageDays !== null && ageDays <= (slaConfig?.targetDays || 0);
  const isOverdue = hasSlaConfig && ageDays !== null && ageDays > (slaConfig?.targetDays || 0);

  // Border Color conforme risco / SLA / status
  let borderColor = 'border-l-4 border-l-emerald-500';
  let agingColor = 'text-emerald-700';

  if (record.errors || record.kanbanOrder === 3 || isOverdue) {
    borderColor = 'border-l-4 border-l-red-500';
    agingColor = 'text-red-600';
  } else if (record.kanbanOrder === 2 || (ageDays !== null && ageDays > 10)) {
    borderColor = 'border-l-4 border-l-amber-500';
    agingColor = 'text-amber-600';
  } else if (record.kanbanOrder === 6) {
    borderColor = 'border-l-4 border-l-slate-400';
    agingColor = 'text-slate-600';
  }

  // SLA Chip Data (Padrão visual exato do Kanban de Transporte)
  let slaChip = {
    label: 'Sem base de SLA',
    detail: ageDays !== null ? `Tempo decorrido: ${ageDays} d` : 'Sem data de emissão',
    icon: '—',
    color: 'bg-slate-100 border-slate-200 text-slate-600',
  };

  if (hasSlaConfig && slaConfig) {
    if (isWithinSla) {
      slaChip = {
        label: 'Dentro do SLA',
        detail: `Etapa: ${ageDays} / ${slaConfig.targetDays} d`,
        icon: '✓',
        color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      };
    } else if (isOverdue) {
      const diff = (ageDays || 0) - (slaConfig.targetDays || 0);
      slaChip = {
        label: 'Fora do SLA',
        detail: `Etapa: ${ageDays} / ${slaConfig.targetDays} d (+${diff} d)`,
        icon: '!',
        color: 'bg-red-50 border-red-200 text-red-700',
      };
    }
  }

  // Etiqueta operacional no canto superior direito do Navio (modelo "LOAD" do Kanban de transporte)
  const pillLabel = (
    record.flowType && record.flowType !== 'Não identificado'
      ? record.flowType
      : record.kanbanSituation || 'TRANSPORTE'
  ).toUpperCase();

  return (
    <div
      onClick={() => onSelect(record)}
      className={`p-3 bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer ${borderColor} flex flex-col justify-between`}
    >
      <div>
        {/* 1. TOPO DO CARD: CT-e e DT destacados em destaque no mesmo nível + Aging */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <strong className="text-sm font-black text-mro-navy flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-mro-blue shrink-0" />
              {record.cte ? `CT-e ${record.cte}` : 'CT-e Pendente'}
            </strong>
            {record.dt ? (
              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100/90 border border-blue-300 text-xs font-black text-blue-900 shadow-2xs">
                DT {record.dt}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 italic">Sem DT</span>
            )}
          </div>

          <div className="text-right shrink-0">
            <span className={`text-sm font-black block leading-none ${agingColor}`}>
              {ageDays !== null ? `${ageDays} d` : '—'}
            </span>
            <span className="text-[9px] text-mro-muted">
              {record.kanbanOrder === 5 ? 'faturado' : 'na etapa'}
            </span>
          </div>
        </div>

        {/* 2. LINHA DA EMBARCAÇÃO / NAVIO + ETIQUETA OPERACIONAL (Padrão exato Kanban de Transporte) */}
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <div
            className="text-xs font-black text-mro-navy truncate"
            title={`Embarcação: ${record.vessel || 'Não informada'}`}
          >
            {record.vessel || 'Navio não informado'}
          </div>

          <span
            title={`Fluxo / Situação: ${pillLabel}`}
            className="shrink-0 inline-flex items-center justify-center px-2.5 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-2xs bg-blue-100 text-blue-800 border-blue-300"
          >
            {pillLabel}
          </span>
        </div>

        {/* 3. BLOCO DE SLA (Estrutura idêntica ao Kanban de Transporte) */}
        <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200 space-y-1.5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                SLA
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black border ${slaChip.color}`}
              >
                <span className="w-3.5 h-3.5 rounded-full bg-white/70 grid place-items-center text-[9px] font-black leading-none">
                  {slaChip.icon}
                </span>
                {slaChip.label}
              </span>
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">
              {slaChip.detail}
            </div>
          </div>
        </div>

        {/* 4. GRADE DE METADADOS (Padrão do Kanban de Transporte) */}
        <div className="mt-2.5 text-[10px] text-mro-muted border-t border-slate-100 pt-2 space-y-1.5">
          <div className="grid grid-cols-2 gap-x-2">
            <div className="truncate">
              Base: <b className="text-slate-700">{record.base || 'Não inf.'}</b>
            </div>
            <div className="truncate text-right">
              Emissão: <b className="text-slate-700">{fmtDateBr(record.emissionDate)}</b>
            </div>
          </div>

          {/* Destaque Tipo de Fluxo (idêntico a "Tipo de Expedição" do Kanban de transporte) */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 py-1 text-[10px]">
            <span className="text-slate-600 font-semibold">Tipo de Fluxo:</span>
            <span className="font-black text-mro-navy bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
              {record.flowType || 'Transporte'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-2 text-[9px] text-slate-400">
            <div className="truncate" title={`PO: ${record.po || '—'}`}>
              PO: <b className="text-slate-600">{record.po || '—'}</b>
            </div>
            <div className="truncate text-right" title={`Frete: ${record.freightValue ? fmtMoney(record.freightValue) : '—'}`}>
              Frete: <b className="text-slate-600">{record.freightValue ? fmtMoney(record.freightValue) : '—'}</b>
            </div>
          </div>
        </div>
      </div>

      {/* 5. RODAPÉ DO CARD: Pendência / Ocorrência ou Próxima Ação */}
      <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200">
        {record.errors ? (
          <div className="bg-red-50/90 border border-red-200 rounded-lg p-1.5 flex items-start gap-1.5 text-[10px] text-red-700">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
            <span className="line-clamp-2 leading-tight">
              <b>Pendência:</b> {record.errors}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[10px] text-mro-muted">
            <span className="truncate" title={record.detailNextAction}>
              Ação: <b className="text-slate-700">{record.detailNextAction || 'Sem pendência'}</b>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
