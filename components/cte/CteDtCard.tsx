'use client';

import React from 'react';
import {
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { CteDtSummary, CteRecord } from '@/lib/cteTypes';
import { fmtMoney, fmtDateBr, getCteAgeDays } from '@/lib/cteCalculations';

interface CteDtCardProps {
  summary: CteDtSummary;
  onSelectCte: (record: CteRecord) => void;
}

export const CteDtCard: React.FC<CteDtCardProps> = ({ summary, onSelectCte }) => {
  const ageDays = getCteAgeDays(summary.latestEmissionDate);

  // Border Color conforme criticidade consolidada da DT
  let borderColor = 'border-l-4 border-l-emerald-500';
  let agingColor = 'text-emerald-700';

  if (summary.hasErrors || summary.consolidatedOrder === 3) {
    borderColor = 'border-l-4 border-l-red-500';
    agingColor = 'text-red-600';
  } else if (summary.consolidatedOrder === 2 || summary.pendentesCount > 0) {
    borderColor = 'border-l-4 border-l-amber-500';
    agingColor = 'text-amber-600';
  } else if (summary.consolidatedOrder === 6) {
    borderColor = 'border-l-4 border-l-slate-400';
    agingColor = 'text-slate-600';
  }

  // Situação Chip Data (Padrão visual exato do Kanban de Transporte)
  let statusChip = {
    label: summary.consolidatedStatus,
    icon: summary.consolidatedOrder === 5 ? '✓' : summary.consolidatedOrder === 3 ? '!' : '•',
    color:
      summary.consolidatedOrder === 5
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
        : summary.consolidatedOrder === 3
        ? 'bg-red-50 border-red-200 text-red-700'
        : summary.consolidatedOrder === 2
        ? 'bg-amber-50 border-amber-200 text-amber-700'
        : 'bg-blue-50 border-blue-200 text-blue-700',
  };

  return (
    <div
      className={`p-3 bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all ${borderColor} flex flex-col justify-between`}
    >
      <div>
        {/* 1. TOPO DO CARD: DT e Quantidade de CT-es em destaque + Aging */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <strong className="text-sm font-black text-mro-navy">
              DT {summary.dt}
            </strong>
            <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100/90 border border-blue-300 text-xs font-black text-blue-900 shadow-2xs">
              {summary.totalCtes} {summary.totalCtes === 1 ? 'CT-e' : 'CT-es'}
            </span>
          </div>

          <div className="text-right shrink-0">
            <span className={`text-sm font-black block leading-none ${agingColor}`}>
              {ageDays !== null ? `${ageDays} d` : '—'}
            </span>
            <span className="text-[9px] text-mro-muted">
              {summary.consolidatedOrder === 5 ? 'faturado' : 'na etapa'}
            </span>
          </div>
        </div>

        {/* 2. LINHA DA EMBARCAÇÃO / NAVIO + ETIQUETA DA SITUAÇÃO (Padrão exato Kanban de Transporte) */}
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <div
            className="text-xs font-black text-mro-navy truncate"
            title={`Embarcação: ${summary.vessel || 'Não informada'}`}
          >
            {summary.vessel || 'Navio não informado'}
          </div>

          <span
            title={`Situação Consolidada: ${summary.consolidatedStatus}`}
            className="shrink-0 inline-flex items-center justify-center px-2.5 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-2xs bg-blue-100 text-blue-800 border-blue-300"
          >
            {summary.consolidatedStatus.toUpperCase()}
          </span>
        </div>

        {/* 3. NÚMEROS DE CT-E VINCULADOS DIRETAMENTE NO CARD (Melhoria Solicitada para Visão por DT) */}
        <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
              CT-es da Demanda:
            </span>
            <span className="text-[9px] text-slate-400 font-semibold">
              Clique para detalhar
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {summary.ctes.map(c => {
              const isFat = c.kanbanOrder === 5;
              const isRec = c.kanbanOrder === 3;
              const hasErr = Boolean(c.errors);

              const chipTheme = isFat
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : isRec
                ? 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'
                : hasErr
                ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                : 'bg-blue-50 text-mro-navy border-blue-200 hover:bg-blue-100';

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCte(c);
                  }}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black border transition-all hover:scale-105 shadow-2xs ${chipTheme}`}
                  title={`CT-e ${c.cte || 'Pendente'} — ${c.statusKanban}${c.errors ? ` (Pendência: ${c.errors})` : ''} — Clique para abrir`}
                >
                  <FileText className="w-3 h-3 opacity-70 shrink-0" />
                  <span>CT-e {c.cte || 'Pendente'}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. BLOCO DE SITUAÇÃO / ETAPA (Estrutura idêntica ao Kanban de Transporte) */}
        <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200 space-y-1.5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                SITUAÇÃO
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black border ${statusChip.color}`}
              >
                <span className="w-3.5 h-3.5 rounded-full bg-white/70 grid place-items-center text-[9px] font-black leading-none">
                  {statusChip.icon}
                </span>
                {statusChip.label}
              </span>
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">
              {summary.faturadosCount} de {summary.totalCtes} CT-e(s) faturado(s)
            </div>
          </div>
        </div>

        {/* 5. GRADE DE METADADOS (Padrão do Kanban de Transporte) */}
        <div className="mt-2.5 text-[10px] text-mro-muted border-t border-slate-100 pt-2 space-y-1.5">
          <div className="grid grid-cols-2 gap-x-2">
            <div className="truncate">
              Base: <b className="text-slate-700">{summary.base || 'Não inf.'}</b>
            </div>
            <div className="truncate text-right">
              Última Emissão: <b className="text-slate-700">{summary.latestEmissionDate ? fmtDateBr(summary.latestEmissionDate) : '—'}</b>
            </div>
          </div>

          {/* Destaque Frete Acumulado */}
          {summary.totalFreightValue > 0 && (
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 py-1 text-[10px]">
              <span className="text-slate-600 font-semibold">Frete Acumulado:</span>
              <span className="font-black text-emerald-700 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                {fmtMoney(summary.totalFreightValue)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 6. RODAPÉ DO CARD: Pendência / Ocorrência ou Próxima Ação */}
      <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200">
        {summary.hasErrors ? (
          <div className="bg-red-50/90 border border-red-200 rounded-lg p-1.5 flex items-start gap-1.5 text-[10px] text-red-700">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
            <span className="line-clamp-2 leading-tight">
              <b>Pendência(s):</b> {summary.errorsList.join(' | ')}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[10px] text-mro-muted">
            <span className="truncate">
              Status Geral: <b className="text-slate-700">{summary.consolidatedStatus}</b>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
