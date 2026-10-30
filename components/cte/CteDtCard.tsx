'use client';

import React, { useState } from 'react';
import {
  Ship,
  MapPin,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
} from 'lucide-react';
import { CteDtSummary, CteRecord } from '@/lib/cteTypes';
import { fmtMoney, fmtDateBr } from '@/lib/cteCalculations';
import { getCteRiskBorder, CTE_STATUS_COLORS } from '@/lib/cteDictionary';

interface CteDtCardProps {
  summary: CteDtSummary;
  onSelectCte: (record: CteRecord) => void;
}

export const CteDtCard: React.FC<CteDtCardProps> = ({ summary, onSelectCte }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const borderColor = getCteRiskBorder(summary.consolidatedOrder, summary.hasErrors ? 'ERRO' : '');
  const statusColor = CTE_STATUS_COLORS[summary.consolidatedStatus] || CTE_STATUS_COLORS['A Classificar'];

  return (
    <div
      className={`p-3 bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all ${borderColor}`}
    >
      {/* Cabeçalho da DT */}
      <div className="flex items-start justify-between gap-1.5 pb-2 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Demanda de Transporte
          </span>
          <div className="text-base font-black text-mro-navy flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-mro-blue" />
            DT {summary.dt}
          </div>
        </div>

        {/* Quantidade de CT-es Vinculados */}
        <div className="text-right">
          <span className="inline-flex items-center gap-1 bg-blue-50 text-mro-navy font-black text-xs px-2.5 py-1 rounded-full border border-blue-200">
            <FileText className="w-3 h-3 text-mro-blue" />
            {summary.totalCtes} {summary.totalCtes === 1 ? 'CT-e' : 'CT-es'}
          </span>
        </div>
      </div>

      {/* Navio e Base */}
      <div className="mt-2 flex items-center justify-between text-xs gap-1">
        <div className="font-bold text-mro-navy flex items-center gap-1 truncate" title={`Navio: ${summary.vessel}`}>
          <Ship className="w-3 h-3 text-mro-blue shrink-0" />
          <span className="truncate">{summary.vessel}</span>
        </div>
        {summary.base && (
          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-0.5 shrink-0">
            <MapPin className="w-2.5 h-2.5 text-slate-400" />
            {summary.base}
          </span>
        )}
      </div>

      {/* Status Consolidado da DT */}
      <div className="mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-semibold">Situação Consolidada:</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`} />
            {summary.consolidatedStatus}
          </span>
        </div>

        {summary.totalFreightValue > 0 && (
          <div className="flex items-center justify-between mt-1 text-[10px]">
            <span className="text-slate-500 font-semibold">Frete Acumulado:</span>
            <span className="font-bold text-emerald-700">{fmtMoney(summary.totalFreightValue)}</span>
          </div>
        )}
      </div>

      {/* Resumo dos CT-es vinculados (chips coloridos) */}
      <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px]">
        {summary.faturadosCount > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {summary.faturadosCount} faturado(s)
          </span>
        )}
        {summary.pendentesCount > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            {summary.pendentesCount} pendente(s)
          </span>
        )}
        {summary.recusadosCount > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-bold border border-red-200">
            <XCircle className="w-3 h-3 text-red-600" />
            {summary.recusadosCount} recusado(s)
          </span>
        )}
        {summary.encerradosCount > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold border border-slate-200">
            {summary.encerradosCount} encerrado(s)
          </span>
        )}
      </div>

      {/* Alerta de Erros se houver */}
      {summary.hasErrors && (
        <div className="mt-2 bg-red-50/80 border border-red-200 rounded-lg p-1.5 flex items-start gap-1 text-[10px] text-red-700">
          <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
          <span className="line-clamp-2 leading-tight">
            <b>Pendência(s):</b> {summary.errorsList.join(' | ')}
          </span>
        </div>
      )}

      {/* Botão de Expandir CT-es vinculados */}
      <div className="mt-2 pt-2 border-t border-dashed border-slate-200">
        <button
          type="button"
          onClick={() => setIsExpanded(prev => !prev)}
          className="w-full flex items-center justify-between text-xs font-bold text-mro-blue hover:text-mro-navy transition-colors py-0.5"
        >
          <span>{isExpanded ? 'Ocultar CT-es vinculados' : `Ver todos os ${summary.totalCtes} CT-e(s)`}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {isExpanded && (
          <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-100 max-h-56 overflow-y-auto">
            {summary.ctes.map(c => (
              <div
                key={c.id}
                onClick={() => onSelectCte(c)}
                className="p-2 rounded-lg bg-slate-50 hover:bg-blue-50/60 border border-slate-200/80 cursor-pointer transition-colors flex items-center justify-between text-[11px]"
              >
                <div>
                  <div className="font-bold text-mro-navy flex items-center gap-1">
                    <FileText className="w-3 h-3 text-slate-400" />
                    CT-e {c.cte || 'Pendente'}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Emissão: {fmtDateBr(c.emissionDate)}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                    c.kanbanOrder === 5
                      ? 'bg-emerald-100 text-emerald-800'
                      : c.kanbanOrder === 3
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {c.statusKanban}
                  </span>
                  {c.freightValue && (
                    <div className="text-[10px] font-semibold text-slate-700">
                      {fmtMoney(c.freightValue)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
