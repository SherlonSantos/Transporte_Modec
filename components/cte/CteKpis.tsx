'use client';

import React from 'react';
import {
  FileText,
  Boxes,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  CreditCard,
  Percent,
} from 'lucide-react';
import { CteMetrics } from '@/lib/cteTypes';

interface CteKpisProps {
  metrics: CteMetrics;
  onFilterStatus?: (statusName: string) => void;
}

export const CteKpis: React.FC<CteKpisProps> = ({ metrics, onFilterStatus }) => {
  return (
    <div className="space-y-3 mb-6">
      {/* Linha 1: Volume e Situação */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {/* Total DTs distintas */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs hover:border-mro-blue transition-all">
          <div className="flex items-center justify-between text-mro-muted mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">DTs Distintas</span>
            <Boxes className="w-3.5 h-3.5 text-mro-blue" />
          </div>
          <div className="text-xl font-black text-mro-navy">
            {metrics.totalDtsDistinct.toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-slate-500">Demanda consolidada</span>
        </div>

        {/* Total CT-es */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs hover:border-mro-blue transition-all">
          <div className="flex items-center justify-between text-mro-muted mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total CT-es</span>
            <FileText className="w-3.5 h-3.5 text-mro-navy" />
          </div>
          <div className="text-xl font-black text-mro-navy">
            {metrics.totalCtesDistinct.toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-slate-500">{metrics.totalRecords.toLocaleString('pt-BR')} registros</span>
        </div>

        {/* CT-es em Andamento */}
        <div
          onClick={() => onFilterStatus?.('Em andamento')}
          className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs hover:border-sky-400 hover:bg-sky-50/20 cursor-pointer transition-all"
          title="Clique para filtrar"
        >
          <div className="flex items-center justify-between text-sky-700 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Em Andamento</span>
            <Clock className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-xl font-black text-sky-900">
            {metrics.inProgressCount.toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-sky-600">Fluxo operacional</span>
        </div>

        {/* CT-es Faturados */}
        <div
          onClick={() => onFilterStatus?.('Faturado')}
          className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-400 hover:bg-emerald-50/20 cursor-pointer transition-all"
          title="Clique para filtrar"
        >
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Faturados</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-900">
            {metrics.faturadosCount.toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">{metrics.faturadosPct} do total</span>
        </div>

        {/* CT-es com Pendência */}
        <div
          onClick={() => onFilterStatus?.('Pendência Operacional')}
          className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs hover:border-amber-400 hover:bg-amber-50/20 cursor-pointer transition-all"
          title="Clique para filtrar"
        >
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Com Pendência</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-900">
            {metrics.pendentesCount.toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-amber-600 font-semibold">{metrics.pendenciasPct} do total</span>
        </div>

        {/* CT-es Recusados */}
        <div
          onClick={() => onFilterStatus?.('Recusado / Reprocessamento')}
          className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs hover:border-red-400 hover:bg-red-50/20 cursor-pointer transition-all"
          title="Clique para filtrar"
        >
          <div className="flex items-center justify-between text-red-700 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Recusados</span>
            <XCircle className="w-3.5 h-3.5 text-red-600" />
          </div>
          <div className="text-xl font-black text-red-900">
            {metrics.recusadosCount.toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-red-600">Requer correção</span>
        </div>

        {/* CT-es Encerrados */}
        <div
          onClick={() => onFilterStatus?.('Encerrado')}
          className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs hover:border-slate-400 hover:bg-slate-50 cursor-pointer transition-all"
          title="Clique para filtrar"
        >
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Encerrados</span>
            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-xl font-black text-slate-800">
            {metrics.encerradosCount.toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-slate-500">Cancelados / subst.</span>
        </div>

        {/* A Classificar */}
        <div
          onClick={() => onFilterStatus?.('A Classificar')}
          className="bg-white p-3 rounded-xl border border-amber-200 bg-amber-50/30 shadow-xs hover:border-amber-400 cursor-pointer transition-all"
          title="Clique para filtrar"
        >
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">A Classificar</span>
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-900">
            {metrics.aClassificarCount.toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-amber-700 font-semibold">Fluxo EPCI / revisar</span>
        </div>
      </div>

      {/* Linha 2: Indicadores de Desempenho e SLA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 p-3 rounded-xl border border-blue-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-blue-800">Taxa de Faturamento</span>
            <div className="text-lg font-black text-blue-950 mt-0.5">{metrics.faturadosPct}</div>
            <span className="text-[10px] text-blue-700">Sobre o volume total de CT-es</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white grid place-items-center font-bold">
            <Percent className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 p-3 rounded-xl border border-amber-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-amber-800">Taxa de Pendências</span>
            <div className="text-lg font-black text-amber-950 mt-0.5">{metrics.pendenciasPct}</div>
            <span className="text-[10px] text-amber-700">Demanda em análise ou pendente</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500 text-white grid place-items-center font-bold">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-700">Tempo Médio em Aberto</span>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              {metrics.avgDaysOpen !== null ? `${metrics.avgDaysOpen} dias` : '—'}
            </div>
            <span className="text-[10px] text-slate-500">Média de dias desde a emissão</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-600 text-white grid place-items-center font-bold">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-50 to-teal-50/60 p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-emerald-800">SLA por Etapa</span>
            <div className="text-lg font-black text-emerald-950 mt-0.5">{metrics.slaWithinPct}</div>
            <span className="text-[10px] text-emerald-700">{metrics.slaStatusText}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white grid place-items-center font-bold">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
