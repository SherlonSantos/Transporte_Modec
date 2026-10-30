'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import {
  PieChart as PieIcon,
  TrendingUp,
  Ship,
  AlertOctagon,
  BarChart3,
} from 'lucide-react';
import { CteRecord } from '@/lib/cteTypes';
import { categorizeCteError, fmtMoney } from '@/lib/cteCalculations';
import { CTE_KANBAN_BUCKETS } from '@/lib/cteDictionary';

interface CteChartsProps {
  records: CteRecord[];
  onFilterStatus?: (status: string) => void;
  onFilterVessel?: (vessel: string) => void;
}

const STATUS_BAR_COLORS: Record<string, string> = {
  'Aguardando CT-e': '#0284c7',
  'Em Análise': '#2563eb',
  'Pendência Operacional': '#d97706',
  'Recusado / Reprocessamento': '#dc2626',
  'Aguardando Pagamento': '#7c3aed',
  'Faturado': '#16a34a',
  'Encerrado': '#64748b',
  'A Classificar': '#ca8a04',
};

export const CteCharts: React.FC<CteChartsProps> = ({
  records,
  onFilterStatus,
  onFilterVessel,
}) => {
  // 7.1 Distribuição por Status Kanban
  const statusDistributionData = useMemo(() => {
    const counts: Record<string, number> = {};
    CTE_KANBAN_BUCKETS.forEach(b => {
      counts[b.name] = 0;
    });

    records.forEach(r => {
      const s = r.statusKanban || 'A Classificar';
      counts[s] = (counts[s] || 0) + 1;
    });

    const total = records.length || 1;
    return CTE_KANBAN_BUCKETS.map(b => {
      const qty = counts[b.name] || 0;
      return {
        name: b.name,
        quantidade: qty,
        pct: ((qty / total) * 100).toFixed(1),
        color: STATUS_BAR_COLORS[b.name] || '#3b82f6',
      };
    });
  }, [records]);

  // 7.2 Evolução Mensal dos CT-es
  const monthlyTrendData = useMemo(() => {
    const monthMap: Record<string, { month: string; emitidos: number; faturados: number; recusados: number; cancelados: number }> = {};

    records.forEach(r => {
      if (!r.emissionDate) return;
      const mKey = r.emissionDate.slice(0, 7); // YYYY-MM
      if (!monthMap[mKey]) {
        const [year, month] = mKey.split('-');
        monthMap[mKey] = {
          month: `${month}/${year.slice(2)}`,
          emitidos: 0,
          faturados: 0,
          recusados: 0,
          cancelados: 0,
        };
      }

      monthMap[mKey].emitidos++;
      if (r.kanbanOrder === 5) monthMap[mKey].faturados++;
      if (r.kanbanOrder === 3) monthMap[mKey].recusados++;
      if (r.kanbanOrder === 6) monthMap[mKey].cancelados++;
    });

    const sortedKeys = Object.keys(monthMap).sort();
    return sortedKeys.slice(-12).map(k => monthMap[k]);
  }, [records]);

  // 7.3 Ranking de Pendências por Embarcação
  const vesselRankingData = useMemo(() => {
    const map: Record<string, { vessel: string; total: number; pendentes: number; faturados: number }> = {};

    records.forEach(r => {
      const v = r.vessel || 'Não informado';
      if (!map[v]) {
        map[v] = { vessel: v, total: 0, pendentes: 0, faturados: 0 };
      }
      map[v].total++;
      if (r.kanbanOrder === 1 || r.kanbanOrder === 2 || r.kanbanOrder === 3 || r.kanbanOrder === 4 || r.kanbanOrder === 0) {
        map[v].pendentes++;
      }
      if (r.kanbanOrder === 5) {
        map[v].faturados++;
      }
    });

    const list = Object.values(map).map(item => ({
      ...item,
      pendenciaPct: item.total > 0 ? ((item.pendentes / item.total) * 100).toFixed(1) : '0.0',
    }));

    return list.sort((a, b) => b.pendentes - a.pendentes).slice(0, 10);
  }, [records]);

  // 7.4 Principais Motivos de Pendência
  const errorReasonsData = useMemo(() => {
    const map: Record<string, number> = {};

    records.forEach(r => {
      // Analisa apenas registros com pendência, erro ou não faturados
      if (r.kanbanOrder !== 5 && r.kanbanOrder !== 6) {
        const reason = categorizeCteError(r.errors, r.detailNextAction);
        map[reason] = (map[reason] || 0) + 1;
      }
    });

    const list = Object.entries(map).map(([motivo, count]) => ({
      motivo,
      quantidade: count,
    }));

    return list.sort((a, b) => b.quantidade - a.quantidade).slice(0, 7);
  }, [records]);

  return (
    <div className="space-y-6 mt-8 pt-6 border-t border-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-mro-navy flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-mro-blue" />
            Diagnóstico Gerencial & Análises do Kanban
          </h3>
          <p className="text-xs text-mro-muted mt-0.5">
            Métricas de distribuição de status, evolução de faturamento e concentração de pendências operacionais
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7.1 Distribuição por Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-mro-navy flex items-center gap-1.5">
                <PieIcon className="w-4 h-4 text-mro-blue" />
                Distribuição de CT-es por Status
              </h4>
              <span className="text-[11px] text-mro-muted">Clique em uma barra para filtrar o Kanban</span>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusDistributionData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#334155', fontWeight: 600 }}
                  width={140}
                />
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [
                    `${val} CT-es (${item.payload.pct}%)`,
                    'Quantidade',
                  ]}
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }}
                />
                <Bar
                  dataKey="quantidade"
                  radius={[0, 4, 4, 0]}
                  onClick={(entry: any) => onFilterStatus?.(entry.name)}
                  cursor="pointer"
                >
                  {statusDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7.2 Evolução Mensal dos CT-es */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-mro-navy flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-mro-blue" />
                Evolução Mensal de CT-es
              </h4>
              <span className="text-[11px] text-mro-muted">Comparativo de emitidos, faturados e recusados</span>
            </div>
          </div>

          <div className="h-64">
            {monthlyTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Bar dataKey="emitidos" name="Emitidos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="faturados" name="Faturados" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recusados" name="Recusados" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-xs text-slate-400">
                Sem registros temporais para compor a série mensal
              </div>
            )}
          </div>
        </div>

        {/* 7.3 Ranking de Pendências por Embarcação */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-mro-navy flex items-center gap-1.5">
                <Ship className="w-4 h-4 text-mro-blue" />
                Ranking de Pendências por Embarcação
              </h4>
              <span className="text-[11px] text-mro-muted">Top 10 navios com maior volume de CT-es pendentes</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Embarcação</th>
                  <th className="py-2.5 px-3 text-right">Total CT-es</th>
                  <th className="py-2.5 px-3 text-right">Pendentes</th>
                  <th className="py-2.5 px-3 text-right">Faturados</th>
                  <th className="py-2.5 px-3 text-right">% Pendência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vesselRankingData.map((item, idx) => (
                  <tr
                    key={item.vessel}
                    onClick={() => onFilterVessel?.(item.vessel)}
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-2 px-3 font-bold text-mro-navy flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] grid place-items-center font-bold">
                        {idx + 1}
                      </span>
                      {item.vessel}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-700">
                      {item.total.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2 px-3 text-right font-black text-amber-700">
                      {item.pendentes.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-emerald-700">
                      {item.faturados.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        Number(item.pendenciaPct) > 20
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : Number(item.pendenciaPct) > 5
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {item.pendenciaPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 7.4 Principais Motivos de Pendência */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-mro-navy flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-red-500" />
                Principais Motivos de Pendência
              </h4>
              <span className="text-[11px] text-mro-muted">Consolidação automática dos campos ERROS e DETALHE</span>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={errorReasonsData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis
                  type="category"
                  dataKey="motivo"
                  tick={{ fontSize: 10, fill: '#334155', fontWeight: 600 }}
                  width={150}
                />
                <Tooltip
                  formatter={(val: any) => [`${val} ocorrências`, 'Total']}
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="quantidade" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                  {errorReasonsData.map((_, index) => (
                    <Cell
                      key={`cell-err-${index}`}
                      fill={index === 0 ? '#ef4444' : index < 3 ? '#f97316' : '#f59e0b'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
