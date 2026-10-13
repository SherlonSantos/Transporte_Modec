'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
} from 'recharts';
import { Calendar, Clock, Ship, ArrowRight, ToggleLeft, ToggleRight } from 'lucide-react';
import { TransportRecord, VesselMapping } from '@/lib/types';
import { STAGES } from '@/lib/constants';
import {
  fmtDate,
  isoDate,
  addDays,
  sameDay,
  stageAge,
  countBy,
} from '@/lib/calculations';
import { InfoTooltip } from './InfoTooltip';

interface ScheduleTabProps {
  data: TransportRecord[];
  vesselMap: VesselMapping;
  refDate: Date;
  horizonDays: number;
  onSelectDt: (dt: string) => void;
}

export const ScheduleTab: React.FC<ScheduleTabProps> = ({
  data,
  vesselMap,
  refDate,
  horizonDays,
  onSelectDt,
}) => {
  const [scheduleMode, setScheduleMode] = useState<'end' | 'start'>('end');

  const getRecordDate = (r: TransportRecord) => {
    return scheduleMode === 'end' ? r.forecastEnd : r.forecastStart;
  };

  const openRecords = data.filter(r => r.status < 7);
  const startDay = new Date(isoDate(refDate) + 'T00:00:00');
  const endDay = addDays(startDay, horizonDays - 1);

  // Future scheduled DTs within window according to mode
  const scheduledFuture = data.filter(r => {
    const d = getRecordDate(r);
    return d && d >= startDay && d <= endDay;
  });

  const prevHoje = scheduledFuture.filter(r => {
    const d = getRecordDate(r);
    return sameDay(d, refDate);
  }).length;

  const prox3 = scheduledFuture.filter(r => {
    const d = getRecordDate(r);
    if (!d) return false;
    return d > refDate && d <= addDays(refDate, 3);
  }).length;

  const prox7 = scheduledFuture.filter(r => {
    const d = getRecordDate(r);
    if (!d) return false;
    return d > refDate && d <= addDays(refDate, 7);
  }).length;

  const atrasadas = openRecords.filter(r => {
    const d = getRecordDate(r);
    return d && d < startDay;
  }).length;

  const semPrevisao = openRecords.filter(r => !getRecordDate(r));

  // Daily peak
  const byDayMap = countBy(scheduledFuture, r => {
    const d = getRecordDate(r);
    return isoDate(d);
  });
  const peakEntry = Object.entries(byDayMap).sort((a, b) => b[1] - a[1])[0];

  // Daily cards array
  const dailyCards: {
    date: Date;
    key: string;
    dayLabel: string;
    items: TransportRecord[];
  }[] = [];

  for (let i = 0; i < horizonDays; i++) {
    const cur = addDays(startDay, i);
    const key = isoDate(cur);
    const items = data
      .filter(r => {
        const d = getRecordDate(r);
        return d && isoDate(d) === key;
      })
      .sort((a, b) => a.status - b.status);

    dailyCards.push({
      date: cur,
      key,
      dayLabel: i === 0 ? 'Hoje' : cur.toLocaleDateString('pt-BR', { weekday: 'short' }),
      items,
    });
  }

  // Volume chart data
  const volumeChartData = dailyCards.map(d => ({
    name: `${d.key.slice(8, 10)}/${d.key.slice(5, 7)}`,
    count: d.items.length,
  }));

  // Vessel distribution in scheduled window (Consolidated by Canonical Name)
  const vesselAgg: Record<
    string,
    {
      name: string;
      displayName: string;
      count: number;
      subCodes: Record<string, number>;
    }
  > = {};

  scheduledFuture.forEach(r => {
    const rawCode = (r.local || '').trim() || 'Não informado';
    const canonicalName = vesselMap[rawCode] || rawCode;

    if (!vesselAgg[canonicalName]) {
      let displayName = canonicalName;
      if (displayName.includes('Cidade de ')) {
        displayName = displayName.replace('Cidade de ', 'Cid. ');
      }
      vesselAgg[canonicalName] = {
        name: canonicalName,
        displayName,
        count: 0,
        subCodes: {},
      };
    }

    vesselAgg[canonicalName].count++;
    vesselAgg[canonicalName].subCodes[rawCode] =
      (vesselAgg[canonicalName].subCodes[rawCode] || 0) + 1;
  });

  const vesselChartData = Object.values(vesselAgg)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Scheduled table
  const scheduledTableList = [...scheduledFuture].sort((a, b) => {
    const da = getRecordDate(a)?.getTime() || 0;
    const db = getRecordDate(b)?.getTime() || 0;
    return da - db;
  });

  return (
    <div className="space-y-6">
      {/* Information Banner & Mode Selector */}
      <div className="p-4 bg-white border border-mro-line rounded-2xl shadow-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-mro-blue shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-mro-navy">Programação e Agendamento Logístico</h3>
              <InfoTooltip
                title="Programação e Agendamento Logístico"
                objective="Apresentar o cronograma futuro de transporte e cargas offshore para nivelamento de frota e controle de chegadas nos cais e plataformas."
                formula="Filtra DTs cujo marco selecionado (Previsão de Fim ou Previsão de Início) está entre refDate e refDate + HorizonDays."
                align="left"
              />
            </div>
            <p className="text-[11px] text-mro-muted">
              Cronograma diário de cargas baseado em marcos de previsão ({scheduleMode === 'end' ? 'Chegada/Entrega' : 'Partida/Saída'}).
            </p>
          </div>
        </div>

        {/* Toggle Mode Button */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-700 px-2">Base do Cronograma:</span>
          <button
            onClick={() => setScheduleMode('end')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              scheduleMode === 'end'
                ? 'bg-mro-navy text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Previsão de Fim (FimPrev)
          </button>
          <button
            onClick={() => setScheduleMode('start')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              scheduleMode === 'start'
                ? 'bg-mro-navy text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Previsão de Início (InícPrev)
          </button>
        </div>
      </div>

      {/* 6 Schedule KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="relative overflow-visible p-4 bg-white rounded-xl border border-mro-line shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-mro-muted font-bold uppercase tracking-wider block">Previstas Hoje</span>
            <InfoTooltip
              title="Previstas Hoje"
              objective="Indicar o volume imediato de transportes programados para atendimento no próprio dia de referência."
              formula="COUNT(DTs onde Data_Previsão == refDate)"
              align="left"
            />
          </div>
          <div className="text-2xl font-black text-mro-navy mt-1">{prevHoje}</div>
          <span className="text-[10px] text-mro-muted mt-1 block">Na data de referência</span>
        </div>

        <div className="relative overflow-visible p-4 bg-white rounded-xl border border-mro-line shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-mro-muted font-bold uppercase tracking-wider block">Próximos 3 Dias</span>
            <InfoTooltip
              title="Próximos 3 Dias"
              objective="Dimensionar a demanda tática de curto prazo (D+1 a D+3) para escalonamento de motoristas, carretas e atracação."
              formula="COUNT(DTs onde refDate < Data_Previsão <= refDate + 3 dias)"
              align="left"
            />
          </div>
          <div className="text-2xl font-black text-mro-blue mt-1">{prox3}</div>
          <span className="text-[10px] text-mro-muted mt-1 block">Janela D+1 a D+3</span>
        </div>

        <div className="relative overflow-visible p-4 bg-white rounded-xl border border-mro-line shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-mro-muted font-bold uppercase tracking-wider block">Próximos 7 Dias</span>
            <InfoTooltip
              title="Próximos 7 Dias"
              objective="Mapear a carga consolidada para a primeira semana do cronograma logístico."
              formula="COUNT(DTs onde refDate < Data_Previsão <= refDate + 7 dias)"
              align="center"
            />
          </div>
          <div className="text-2xl font-black text-mro-navy mt-1">{prox7}</div>
          <span className="text-[10px] text-mro-muted mt-1 block">Carga futura imediata</span>
        </div>

        <div className="relative overflow-visible p-4 bg-white rounded-xl border border-mro-line shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-mro-muted font-bold uppercase tracking-wider block">Atrasadas</span>
            <InfoTooltip
              title="Atrasadas na Programação"
              objective="Evidenciar DTs que continuam em aberto mas cuja data prevista já foi ultrapassada em relação à data de referência."
              formula="COUNT(DTs onde Status < 7 E Data_Previsão < refDate)"
              align="center"
            />
          </div>
          <div className="text-2xl font-black text-red-600 mt-1">{atrasadas}</div>
          <span className="text-[10px] text-mro-muted mt-1 block">Previsão vencida</span>
        </div>

        <div className="relative overflow-visible p-4 bg-white rounded-xl border border-mro-line shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-mro-muted font-bold uppercase tracking-wider block">Sem Previsão</span>
            <InfoTooltip
              title="Sem Previsão de Programação"
              objective="Identificar DTs ativas sem nenhuma data de previsão inserida no SAP, indicando ausência de planejamento de transporte."
              formula="COUNT(DTs onde Status < 7 E Data_Previsão IS NULL)"
              align="right"
            />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">{semPrevisao.length}</div>
          <span className="text-[10px] text-mro-muted mt-1 block">Pendentes de agendamento</span>
        </div>

        <div className="relative overflow-visible p-4 bg-white rounded-xl border border-mro-line shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-mro-muted font-bold uppercase tracking-wider block">Pico da Janela</span>
            <InfoTooltip
              title="Pico de Volume na Janela"
              objective="Sinalizar o dia de maior concentração de DTs na janela futura para mitigação de gargalos de pátio e frota."
              formula="MAX(COUNT(DTs)) agrupado por Data_Previsão na janela"
              align="right"
            />
          </div>
          <div className="text-2xl font-black text-mro-navy mt-1">{peakEntry ? peakEntry[1] : '—'}</div>
          <span className="text-[10px] text-mro-muted mt-1 block truncate">
            {peakEntry ? `Em ${fmtDate(peakEntry[0] + 'T00:00:00')}` : 'Sem previsão'}
          </span>
        </div>
      </div>

      {/* Visual Day-by-Day Agenda Grid */}
      <div className="p-5 bg-white rounded-2xl border border-mro-line shadow-card">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-mro-navy">
            Agenda Diária ({scheduleMode === 'end' ? 'Previsão de Fim / Entrega' : 'Previsão de Partida / Início'})
          </h3>
          <InfoTooltip
            title="Agenda Diária de Cargas"
            objective="Visualizar a distribuição física diária das ordens de transporte ao longo da janela configurada."
            formula="Distribuição das DTs onde Data_Previsão == Dia (0 a HorizonDays)"
            align="left"
          />
        </div>
        <p className="text-[11px] text-mro-muted mb-4">DTs distribuídas por data planejada</p>

        <div className="overflow-x-auto pb-4">
          <div className="grid grid-flow-col auto-cols-[200px] gap-3">
            {dailyCards.map((d, idx) => (
              <div
                key={idx}
                className="bg-mro-bg rounded-xl border border-mro-line overflow-hidden flex flex-col min-h-[300px]"
              >
                {/* Header */}
                <div className="p-3 bg-white border-b border-mro-line flex items-center justify-between">
                  <div>
                    <b className="text-xs font-black text-mro-navy block">{d.dayLabel}</b>
                    <span className="text-[10px] text-mro-muted">{fmtDate(d.date)}</span>
                  </div>
                  <span className="bg-mro-navy text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {d.items.length}
                  </span>
                </div>

                {/* Day Items */}
                <div className="p-2 space-y-2 overflow-y-auto flex-1">
                  {d.items.slice(0, 7).map(r => {
                    const vessel = vesselMap[r.local] ? vesselMap[r.local] : r.local;
                    return (
                      <div
                        key={r.dt}
                        onClick={() => onSelectDt(r.dt)}
                        className="p-2 bg-white rounded-lg border border-slate-200 hover:border-mro-blue hover:shadow-xs transition-all cursor-pointer text-[11px]"
                      >
                        <div className="font-bold text-mro-navy">DT {r.dt}</div>
                        <div className="text-[10px] text-mro-muted truncate">{vessel}</div>
                        <div className="text-[9px] text-mro-blue font-semibold mt-1">
                          {r.status} — {STAGES[r.status]?.short}
                        </div>
                      </div>
                    );
                  })}

                  {d.items.length > 7 && (
                    <div className="text-[10px] font-bold text-mro-blue text-center py-1">
                      + {d.items.length - 7} DTs no dia
                    </div>
                  )}

                  {d.items.length === 0 && (
                    <div className="py-12 text-center text-[10px] text-slate-400">
                      Nenhuma DT prevista
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts: Volume curve & Vessel distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-5 bg-white rounded-2xl border border-mro-line shadow-card">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-mro-navy">Curva de Volume Programado (Janela)</h3>
            <InfoTooltip
              title="Curva de Volume Programado"
              objective="Apresentar o histograma de carregamento ou entrega para avaliar oscilações na cadência de transporte diário."
              formula="COUNT(DT) agrupado por data do marco (Início ou Fim Previsto) dentro da janela de horizonte."
              align="left"
            />
          </div>
          <p className="text-[11px] text-mro-muted mb-3">Quantidade diária de cargas</p>
          <div className="w-full" style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={volumeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#667085' }} />
                <YAxis tick={{ fontSize: 10, fill: '#667085' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#215FC3" radius={[6, 6, 0, 0]} barSize={26}>
                  <LabelList dataKey="count" position="top" fill="#215FC3" fontSize={11} fontWeight={700} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-mro-line shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-mro-navy">Distribuição por Embarcação (Janela)</h3>
              <InfoTooltip
                title="Distribuição por Embarcação Programada"
                objective="Mapear quais unidades e plataformas offshore demandarão maior esforço logístico no período programado."
                formula="COUNT(DT) agrupado por Embarcação / Unidade MODEC para as DTs presentes na janela futura."
                align="right"
              />
            </div>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Top 10 Unidades
            </span>
          </div>
          <p className="text-[11px] text-mro-muted mb-3">Carga programada direcionada a cada unidade</p>
          <div className="w-full" style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                layout="vertical"
                data={vesselChartData}
                margin={{ top: 10, right: 80, left: 10, bottom: 10 }}
              >
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} />
                <YAxis
                  dataKey="displayName"
                  type="category"
                  tick={{ fontSize: 11, fill: '#1E293B', fontWeight: 600 }}
                  width={205}
                  interval={0}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    const totalSched = scheduledFuture.length || 1;
                    const pctTotal = ((d.count / totalSched) * 100).toFixed(1);
                    const subCodesEntries = Object.entries(d.subCodes || {}) as [string, number][];

                    return (
                      <div className="bg-slate-900/95 backdrop-blur-xs text-white p-3 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1.5 z-50">
                        <div className="font-black text-white text-sm">{d.name}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-bold text-sm">
                            {d.count.toLocaleString('pt-BR')} DTs
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            ({pctTotal}% do programado)
                          </span>
                        </div>
                        {subCodesEntries.length > 0 && (
                          <div className="text-[10px] text-slate-300 pt-1.5 border-t border-slate-700/80">
                            <span className="text-slate-400 font-bold block mb-0.5">
                              Códigos SAP de Destino:
                            </span>
                            <span className="text-slate-200">
                              {subCodesEntries.map(([c, count]) => `${c} (${count})`).join(' • ')}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Bar dataKey="count" fill="#00CE7C" radius={[0, 6, 6, 0]} barSize={22}>
                  <LabelList
                    dataKey="count"
                    position="right"
                    offset={8}
                    fill="#047857"
                    fontSize={11}
                    fontWeight={800}
                    formatter={(val: number) => `${val.toLocaleString('pt-BR')} DTs`}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables: Program List & Unscheduled Backlog */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Program Table */}
        <div className="p-5 bg-white rounded-2xl border border-mro-line shadow-card">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-mro-navy">Lista de DTs Programadas na Janela</h3>
            <InfoTooltip
              title="Lista de DTs Programadas"
              objective="Relação sequencial das ordens de transporte ativas na janela, ordenada cronologicamente por atendimento."
              formula="DTs com Data_Previsão entre Hoje e Hoje + HorizonDays, ordenadas por Data_Previsão ASC."
              align="left"
            />
          </div>
          <p className="text-[11px] text-mro-muted mb-3">Ordenadas por data prevista de atendimento</p>
          <div className="overflow-x-auto border border-mro-line rounded-xl max-h-72">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-mro-navy text-white sticky top-0 z-10 text-[11px]">
                <tr>
                  <th className="p-2.5 font-bold">Data Prevista</th>
                  <th className="p-2.5 font-bold">DT</th>
                  <th className="p-2.5 font-bold">Embarcação</th>
                  <th className="p-2.5 font-bold">Status</th>
                  <th className="p-2.5 font-bold">Itinerário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mro-line">
                {scheduledTableList.slice(0, 20).map(r => (
                  <tr
                    key={r.dt}
                    onClick={() => onSelectDt(r.dt)}
                    className="hover:bg-blue-50/60 cursor-pointer transition-colors"
                  >
                    <td className="p-2.5 font-bold text-mro-navy">{fmtDate(getRecordDate(r))}</td>
                    <td className="p-2.5 font-bold text-mro-blue">{r.dt}</td>
                    <td className="p-2.5 truncate max-w-[140px]">
                      {vesselMap[r.local] ? vesselMap[r.local] : r.local}
                    </td>
                    <td className="p-2.5">
                      <span className="bg-blue-100 text-mro-blue font-bold text-[10px] px-2 py-0.5 rounded-full">
                        {r.status} — {STAGES[r.status]?.short}
                      </span>
                    </td>
                    <td className="p-2.5 text-mro-muted truncate max-w-[140px]" title={r.itineraryDescription}>
                      {r.parsedItinerary.display || r.route || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Unscheduled Backlog */}
        <div className="p-5 bg-white rounded-2xl border border-mro-line shadow-card">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-mro-navy">Pendências de Programação (Sem Data Prevista)</h3>
            <InfoTooltip
              title="Pendências de Programação (Backlog)"
              objective="Fila prioritária para atuação do time de logística e PCP para cobrança e imputação de datas no SAP."
              formula="DTs em aberto (Status < 7) com Data_Previsão IS NULL, ordenadas por Aging na Etapa DESC."
              align="right"
            />
          </div>
          <p className="text-[11px] text-mro-muted mb-3">DTs em aberto sem data de previsão ({scheduleMode === 'end' ? 'FimPrev' : 'InícPrev'})</p>
          <div className="overflow-x-auto border border-mro-line rounded-xl max-h-72">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-mro-navy text-white sticky top-0 z-10 text-[11px]">
                <tr>
                  <th className="p-2.5 font-bold">DT</th>
                  <th className="p-2.5 font-bold">Embarcação</th>
                  <th className="p-2.5 font-bold">Status</th>
                  <th className="p-2.5 font-bold">Aging</th>
                  <th className="p-2.5 font-bold">Criada Em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mro-line">
                {semPrevisao.slice(0, 20).map(r => (
                  <tr
                    key={r.dt}
                    onClick={() => onSelectDt(r.dt)}
                    className="hover:bg-blue-50/60 cursor-pointer transition-colors"
                  >
                    <td className="p-2.5 font-bold text-mro-navy">{r.dt}</td>
                    <td className="p-2.5 truncate max-w-[140px]">
                      {vesselMap[r.local] ? vesselMap[r.local] : r.local}
                    </td>
                    <td className="p-2.5">
                      <span className="bg-blue-100 text-mro-blue font-bold text-[10px] px-2 py-0.5 rounded-full">
                        {r.status} — {STAGES[r.status]?.short}
                      </span>
                    </td>
                    <td className="p-2.5 font-bold text-mro-navy">{stageAge(r, refDate) ?? '—'} d</td>
                    <td className="p-2.5 text-mro-muted">{fmtDate(r.created)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
