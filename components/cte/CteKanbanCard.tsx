'use client';

import React from 'react';
import {
  Ship,
  MapPin,
  Calendar,
  AlertTriangle,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { CteRecord, CteSlaConfig } from '@/lib/cteTypes';
import { getCteAgeDays, fmtDateBr, fmtMoney } from '@/lib/cteCalculations';
import { CTE_STATUS_COLORS, getCteRiskBorder } from '@/lib/cteDictionary';

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
  const borderColor = getCteRiskBorder(record.kanbanOrder, record.errors);
  const statusColor = CTE_STATUS_COLORS[record.statusKanban] || CTE_STATUS_COLORS['A Classificar'];

  // Avaliação do SLA
  let slaBadge = {
    text: 'SLA: A validar',
    color: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  };

  if (slaConfig && slaConfig.targetDays !== null && ageDays !== null) {
    if (ageDays <= slaConfig.targetDays) {
      slaBadge = {
        text: `Dentro do SLA (${ageDays}/${slaConfig.targetDays} d)`,
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
      };
    } else {
      const overdue = ageDays - slaConfig.targetDays;
      slaBadge = {
        text: `Fora do SLA (+${overdue} d)`,
        color: 'bg-red-50 text-red-700 border-red-200',
        dot: 'bg-red-500',
      };
    }
  }

  return (
    <div
      onClick={() => onSelect(record)}
      className={`p-3 bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer ${borderColor} flex flex-col justify-between`}
    >
      <div>
        {/* Topo do Card: DT e CT-e */}
        <div className="flex items-start justify-between gap-1.5 pb-1.5 border-b border-slate-100">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {record.dt ? `DT ${record.dt}` : 'Sem DT Vinculada'}
            </div>
            <div className="text-sm font-black text-mro-navy flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-mro-blue" />
              {record.cte ? `CT-e ${record.cte}` : 'CT-e Pendente'}
            </div>
          </div>

          {/* Aging ou Dias desde a emissão */}
          <div className="text-right">
            <span
              className={`text-sm font-black block leading-none ${
                ageDays !== null && ageDays > 15
                  ? 'text-red-600'
                  : ageDays !== null && ageDays > 7
                  ? 'text-amber-600'
                  : 'text-slate-700'
              }`}
            >
              {ageDays !== null ? `${ageDays} d` : '—'}
            </span>
            <span className="text-[9px] text-mro-muted">desde emissão</span>
          </div>
        </div>

        {/* Linha do Navio e Base */}
        <div className="mt-2 flex items-center justify-between text-xs gap-1">
          <div className="font-bold text-mro-navy flex items-center gap-1 truncate" title={`Navio: ${record.vessel || 'Não informado'}`}>
            <Ship className="w-3 h-3 text-mro-blue shrink-0" />
            <span className="truncate">{record.vessel || 'Navio não inf.'}</span>
          </div>
          {record.base && (
            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-0.5 shrink-0">
              <MapPin className="w-2.5 h-2.5 text-slate-400" />
              {record.base}
            </span>
          )}
        </div>

        {/* Metadados: Fluxo, Emissão, Valor */}
        <div className="mt-2 space-y-1 text-[10px] text-slate-600 bg-slate-50/70 p-2 rounded-lg border border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-semibold">Tipo de Fluxo:</span>
            <span className="font-bold text-mro-navy bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
              {record.flowType || 'Transporte'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-semibold">Data Emissão:</span>
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5 text-slate-400" />
              {fmtDateBr(record.emissionDate)}
            </span>
          </div>

          {record.freightValue !== null && record.freightValue > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Frete:</span>
              <span className="font-bold text-emerald-700">
                {fmtMoney(record.freightValue)}
              </span>
            </div>
          )}
        </div>

        {/* Status do SLA */}
        <div className="mt-2 flex items-center justify-between text-[10px]">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">SLA</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${slaBadge.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${slaBadge.dot}`} />
            {slaBadge.text}
          </span>
        </div>
      </div>

      {/* Rodapé do Card: Pendência ou Ocorrência */}
      <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200">
        {record.errors ? (
          <div className="bg-red-50/80 border border-red-200 rounded-lg p-1.5 flex items-start gap-1 text-[10px] text-red-700">
            <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
            <span className="line-clamp-2 leading-tight">
              <b>Pendência:</b> {record.errors}
            </span>
          </div>
        ) : (
          <div className="text-[10px] text-slate-600 line-clamp-1 leading-tight" title={record.detailNextAction}>
            <span className="text-slate-400 font-semibold">Ação:</span>{' '}
            <span className="font-medium text-slate-700">{record.detailNextAction || 'Sem pendência'}</span>
          </div>
        )}
      </div>
    </div>
  );
};
