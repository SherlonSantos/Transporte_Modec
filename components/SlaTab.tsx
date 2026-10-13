'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { ShieldCheck, AlertTriangle, AlertCircle, Clock, Ship, CheckCircle2, TrendingDown } from 'lucide-react';
import { InfoTooltip } from '@/components/InfoTooltip';
import { TransportRecord, VesselMapping, SemaphoreThresholds } from '@/lib/types';
import { STAGES } from '@/lib/constants';
import {
  fmtDate,
  isoDate,
  stageAge,
  stageDuration,
  currentStageSlaOk,
  finalSlaOk,
  addDays,
  overdueDays,
  avg,
  pct,
  startDeviation,
  startOnTime,
  cumulativeSla,
  cumulativeActualAtStage,
  dtSlaProfile,
} from '@/lib/calculations';

interface SlaTabProps {
  data: TransportRecord[];
  vesselMap: VesselMapping;
  refDate: Date;
  contractSla: Record<number, number>;
  semaphore: SemaphoreThresholds;
  horizonDays: number;
  onSelectDt: (dt: string) => void;
}

export const SlaTab: React.FC<SlaTabProps> = ({
  data,
  vesselMap,
  refDate,
  contractSla,
  semaphore,
  horizonDays,
  onSelectDt,
}) => {
  const openRecords = data.filter(r => r.status >= 0 && r.status < 7);
  const eligibleFinal = data.filter(r => r.forecastEnd);
  const okFinal = eligibleFinal.filter(r => finalSlaOk(r, refDate) === true);
  const finalRate = eligibleFinal.length ? (okFinal.length / eligibleFinal.length) * 100 : null;

  const eligibleStage = openRecords.filter(r => currentStageSlaOk(r, refDate, contractSla) !== null);
  const okStage = eligibleStage.filter(r => currentStageSlaOk(r, refDate, contractSla) === true);
  const stageRate = eligibleStage.length ? (okStage.length / eligibleStage.length) * 100 : null;

  const breachCount = eligibleStage.filter(r => currentStageSlaOk(r, refDate, contractSla) === false).length;

  // Cumulative SLA breach count across open DTs
  const cumulativeBreaches = openRecords.filter(r => {
    const p = dtSlaProfile(r, refDate, contractSla);
    return p.globalState.klass === 'bad';
  }).length;

  // Departure Punctuality
  const departuresWithForecast = data.filter(r => r.forecastStart && r.actualStart);
  const onTimeDepartures = departuresWithForecast.filter(r => startOnTime(r) === true).length;
  const onTimeDepartRate = departuresWithForecast.length
    ? (onTimeDepartures / departuresWithForecast.length) * 100
    : null;

  const getTrafficClass = (rate: number | null) => {
    if (rate === null || !Number.isFinite(rate)) return 'bg-slate-400 text-white';
    if (rate >= semaphore.green) return 'bg-emerald-500 text-white';
    if (rate >= semaphore.amber) return 'bg-amber-500 text-white';
    return 'bg-red-500 text-white';
  };

  const getTrafficLabel = (rate: number | null) => {
    if (rate === null || !Number.isFinite(rate)) return 'Sem base';
    if (rate >= semaphore.green) return 'Verde (Conforme)';
    if (rate >= semaphore.amber) return 'Amarelo (Atenção)';
    return 'Vermelho (Crítico)';
  };

  // Stage SLA adherence metrics (Audax stages 0 to 6)
  const stageSlaData = STAGES.filter(s => s.id < 7).map(st => {
    const vals: number[] = [];
    data.forEach(r => {
      const d = stageDuration(r, st.id);
      if (d !== null) vals.push(d);
    });
    openRecords.filter(r => r.status === st.id).forEach(r => {
      const a = stageAge(r, refDate);
      if (a !== null) vals.push(a);
    });
    const sla = Number(contractSla[st.id] || 1);
    const ok = vals.filter(v => v <= sla).length;
    const rate = vals.length ? (ok / vals.length) * 100 : null;
    const av = avg(vals);
    const cumSlaVal = cumulativeSla(st.id, contractSla);

    return {
      stage: st,
      sla,
      cumSlaVal,
      rate,
      measurements: vals.length,
      average: av,
    };
  });

  // Vessel Ranking (Consolidated by Canonical Name)
  const vesselGroups: Record<string, TransportRecord[]> = {};
  data.forEach(r => {
    const rawCode = (r.local || '').trim() || 'Não informado';
    const canonical = vesselMap[rawCode] || rawCode;
    (vesselGroups[canonical] || (vesselGroups[canonical] = [])).push(r);
  });

  const vesselRanking = Object.entries(vesselGroups)
    .map(([name, records]) => {
      const elig = records.filter(r => r.forecastEnd);
      const ok = elig.filter(r => finalSlaOk(r, refDate)).length;
      const rate = elig.length ? (ok / elig.length) * 100 : null;
      const open = records.filter(r => r.status < 7);
      const breach = open.filter(r => currentStageSlaOk(r, refDate, contractSla) === false).length;
      const ag = avg(open.map(r => stageAge(r, refDate)));
      return {
        name,
        total: records.length,
        openCount: open.length,
        adherence: rate,
        breach,
        avgAge: ag,
        baseCount: elig.length,
      };
    })
    .sort((a, b) => (b.adherence ?? -1) - (a.adherence ?? -1) || b.total - a.total);

  // Bottlenecks
  const bottlenecks = STAGES.filter(s => s.id < 7)
    .map(st => {
      const items = openRecords.filter(r => r.status === st.id);
      const ages = items.map(r => stageAge(r, refDate)).filter((v): v is number => Number.isFinite(v));
      const breach = items.filter(r => currentStageSlaOk(r, refDate, contractSla) === false).length;
      const rate = items.length ? (breach / items.length) * 100 : 0;
      const av = avg(ages) || 0;
      const sla = Number(contractSla[st.id] || 1);
      const score = items.length * (1 + rate / 100) * (1 + av / Math.max(1, sla));
      return {
        stage: st,
        itemsCount: items.length,
        avgAge: av,
        breachCount: breach,
        breachRate: rate,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  // Forecast Volume Chart (next N days)
  const forecastEndDate = addDays(refDate, horizonDays);
  const futureForecast = data.filter(
    r => r.forecastEnd && r.forecastEnd >= refDate && r.forecastEnd <= forecastEndDate
  );

  const forecastDays: { date: string; display: string; count: number }[] = [];
  for (let i = 0; i <= horizonDays; i++) {
    const cur = addDays(refDate, i);
    const key = isoDate(cur);
    const count = futureForecast.filter(r => isoDate(r.forecastEnd) === key).length;
    forecastDays.push({
      date: key,
      display: i === 0 ? 'Hoje' : `${key.slice(8, 10)}/${key.slice(5, 7)}`,
      count,
    });
  }

  // SLA Risk Table with Cumulative SLA evaluation
  const slaRiskList = [...openRecords]
    .sort((a, b) => {
      const pa = dtSlaProfile(a, refDate, contractSla);
      const pb = dtSlaProfile(b, refDate, contractSla);
      const scoreA = (pa.stageState.klass === 'bad' ? 2 : 0) + (pa.globalState.klass === 'bad' ? 3 : 0);
      const scoreB = (pb.stageState.klass === 'bad' ? 2 : 0) + (pb.globalState.klass === 'bad' ? 3 : 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (overdueDays(b, refDate) || 0) - (overdueDays(a, refDate) || 0);
    })
    .slice(0, 15);

  return (
    <div className="space-y-6">
      {/* SLA Overview Banner & KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        <div className="p-4 bg-white rounded-xl border border-mro-line shadow-card flex items-center justify-between relative overflow-visible">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-mro-muted font-bold uppercase tracking-wider block">Semáforo Contratual</span>
              <InfoTooltip
                title="Semáforo Contratual Executivo"
                objective="Sinalizar a saúde executiva global com base no percentual de cumprimento da data final de entrega."
                formula="Verde se Aderência ≥ Verde% | Amarelo se ≥ Amarelo% | Vermelho se abaixo."
                align="left"
              />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-black px-2.5 py-1 rounded-full ${getTrafficClass(finalRate)}`}>
                {getTrafficLabel(finalRate)}
              </span>
            </div>
            <span className="text-[10px] text-mro-muted mt-1 block">Prazo final entrega</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-mro-line shadow-card relative overflow-visible">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-mro-muted font-bold uppercase tracking-wider block">Aderência Prazo Final</span>
            <InfoTooltip
              title="Aderência ao Prazo Final"
              objective="Medir o percentual de ordens entregues ou em andamento dentro do prazo final estimado."
              formula="(DTs Conformes com FimPrevTransp. / Total DTs com Previsão) × 100"
              align="left"
            />
          </div>
          <div className="text-2xl font-black text-mro-navy mt-1">
            {finalRate !== null ? `${finalRate.toFixed(1)}%` : '—'}
          </div>
          <span className="text-[10px] text-mro-muted mt-1 block">{eligibleFinal.length} DTs com data prevista</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-mro-line shadow-card relative overflow-visible">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-mro-muted font-bold uppercase tracking-wider block">Dentro do SLA da Etapa</span>
            <InfoTooltip
              title="Aderência ao SLA da Etapa Atual"
              objective="Medir o cumprimento das metas contratuais individuais da etapa onde cada DT se encontra."
              formula="(DTs Abertas com Aging ≤ SLA da Etapa / Total DTs Abertas com Marco) × 100"
              align="left"
            />
          </div>
          <div className="text-2xl font-black text-mro-blue mt-1">
            {stageRate !== null ? `${stageRate.toFixed(1)}%` : '—'}
          </div>
          <span className="text-[10px] text-mro-muted mt-1 block">Abertas na etapa atual</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-mro-line shadow-card relative overflow-visible">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-mro-muted font-bold uppercase tracking-wider block">SLA Etapa Estourado</span>
            <InfoTooltip
              title="SLA da Etapa Estourado"
              objective="Quantificar as cargas em aberto que já ultrapassaram o teto máximo de dias da etapa atual."
              formula="Contagem(Status < 7 e Aging na Etapa > SLA da Etapa)"
              align="right"
            />
          </div>
          <div className="text-2xl font-black text-red-600 mt-1">{breachCount.toLocaleString('pt-BR')}</div>
          <span className="text-[10px] text-mro-muted mt-1 block">Acima do teto da etapa</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-mro-line shadow-card relative overflow-visible">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-mro-muted font-bold uppercase tracking-wider block">SLA Acumulado Estourado</span>
            <InfoTooltip
              title="SLA Global Acumulado Estourado"
              objective="Identificar cargas cujo tempo total acumulado em todas as etapas ultrapassou a soma das metas contratuais."
              formula="Contagem(Tempo Acumulado Efetivo > Meta Global Acumulada das Etapas)"
              rule="Teto máximo acumulado para fluxo completo (0 a 6): 9 dias."
              align="right"
            />
          </div>
          <div className="text-2xl font-black text-purple-700 mt-1">{cumulativeBreaches.toLocaleString('pt-BR')}</div>
          <span className="text-[10px] text-mro-muted mt-1 block">Soma de etapas excedida</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-mro-line shadow-card relative overflow-visible">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-mro-muted font-bold uppercase tracking-wider block">Pontualidade Saída</span>
            <InfoTooltip
              title="Pontualidade de Saída (Expedição)"
              objective="Avaliar o cumprimento da data prevista de início de transporte cadastrada no SAP."
              formula="(Partidas no Prazo / Total Partidas com Previsão de Início) × 100"
              align="right"
            />
          </div>
          <div className="text-2xl font-black text-mro-navy mt-1">
            {onTimeDepartRate !== null ? `${onTimeDepartRate.toFixed(1)}%` : '—'}
          </div>
          <span className="text-[10px] text-mro-muted mt-1 block">{departuresWithForecast.length} saídas com previsão</span>
        </div>
      </div>

      {/* Adherence by Audax Stage Cards */}
      <div className="p-5 bg-white rounded-2xl border border-mro-line shadow-card">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-bold text-mro-navy">Aderência ao SLA por Etapa Operacional (Audax)</h3>
          <InfoTooltip
            title="Aderência ao SLA por Etapa"
            objective="Analisar o cumprimento das metas contratuais e tempo médio de retenção em cada fase do ciclo Audax."
            formula="Aderência (%) = (DTs com Duração ≤ SLA da Etapa / Total DTs da Etapa) × 100"
            rule="Cores semafóricas indicam conformidade conforme limites calibrados nas configurações."
            align="left"
          />
        </div>
        <p className="text-[11px] text-mro-muted mb-4">Medição em dias corridos calculada individualmente e no fluxo acumulado</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {stageSlaData.map((item, idx) => {
            const rate = item.rate;
            const barWidth = rate !== null ? Math.min(100, Math.max(0, rate)) : 0;
            const barColor =
              rate === null
                ? 'bg-slate-300'
                : rate >= semaphore.green
                ? 'bg-mro-green'
                : rate >= semaphore.amber
                ? 'bg-mro-amber'
                : 'bg-mro-red';

            return (
              <div key={idx} className="p-3.5 bg-mro-bg rounded-xl border border-mro-line flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-xs font-bold text-mro-navy mb-1">
                    <span className="truncate pr-1" title={item.stage.name}>
                      {item.stage.id} — {item.stage.short}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${getTrafficClass(rate)}`}>
                      {rate !== null ? `${rate.toFixed(1)}%` : '—'}
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden my-2">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${barWidth}%` }} />
                  </div>
                </div>

                <div className="flex justify-between text-[10px] text-mro-muted pt-1 border-t border-slate-200">
                  <span>SLA: <b>{item.sla}d</b> (acum: {item.cumSlaVal}d)</span>
                  <span>Média: <b>{item.average !== null ? `${item.average.toFixed(1)}d` : '—'}</b></span>
                  <span>{item.measurements} med.</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vessel Ranking & Bottlenecks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Vessel Ranking */}
        <div className="lg:col-span-7 p-5 bg-white rounded-2xl border border-mro-line shadow-card">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-mro-navy">Ranking de Aderência por Embarcação / Unidade</h3>
            <InfoTooltip
              title="Aderência por Embarcação"
              objective="Classificar plataformas e polos pela pontualidade das entregas destinadas a cada uma."
              formula="Aderência = (DTs Entregues no Prazo / Total DTs com Previsão) × 100"
              align="left"
            />
          </div>
          <p className="text-[11px] text-mro-muted mb-3">Ordenado por aderência ao prazo final previsto</p>

          <div className="overflow-x-auto border border-mro-line rounded-xl max-h-80">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-mro-navy text-white sticky top-0 z-10 text-[11px]">
                <tr>
                  <th className="p-2.5 font-bold">#</th>
                  <th className="p-2.5 font-bold">Embarcação</th>
                  <th className="p-2.5 font-bold">Total DTs</th>
                  <th className="p-2.5 font-bold">Abertas</th>
                  <th className="p-2.5 font-bold">Aderência</th>
                  <th className="p-2.5 font-bold">Estouradas</th>
                  <th className="p-2.5 font-bold">Aging Médio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mro-line">
                {vesselRanking.slice(0, 12).map((item, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/60 transition-colors">
                    <td className="p-2.5 font-bold text-mro-navy">#{idx + 1}</td>
                    <td className="p-2.5 font-semibold text-mro-navy truncate max-w-[150px]">{item.name}</td>
                    <td className="p-2.5 text-mro-muted">{item.total}</td>
                    <td className="p-2.5 text-mro-navy font-bold">{item.openCount}</td>
                    <td className="p-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getTrafficClass(item.adherence)}`}>
                        {item.adherence !== null ? `${item.adherence.toFixed(1)}%` : '—'}
                      </span>
                    </td>
                    <td className="p-2.5 font-bold text-red-600">{item.breach}</td>
                    <td className="p-2.5 text-mro-muted">
                      {item.avgAge !== null ? `${item.avgAge.toFixed(1)} d` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottleneck Analysis */}
        <div className="lg:col-span-5 p-5 bg-white rounded-2xl border border-mro-line shadow-card flex flex-col">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-mro-navy">Análise Algorítmica de Gargalos</h3>
            <InfoTooltip
              title="Algoritmo de Gargalos"
              objective="Identificar quais etapas operacionais demandam priorização com base em volume, estouro e severidade de aging."
              formula="Score = Volume Abertas × (1 + % Estouro SLA) × (1 + Aging Médio / Meta SLA)"
              align="right"
            />
          </div>
          <p className="text-[11px] text-mro-muted mb-3">Prioriza etapas por volume aberto, aging e estouro de SLA</p>

          <div className="grid grid-cols-2 gap-2.5">
            {bottlenecks.slice(0, 4).map((b, idx) => (
              <div key={idx} className="p-3 bg-mro-bg rounded-xl border border-mro-line">
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                  Gargalo #{idx + 1}
                </span>
                <strong className="text-xs font-bold text-mro-navy block mt-0.5 truncate" title={b.stage.name}>
                  {b.stage.id} — {b.stage.short}
                </strong>
                <div className="text-xl font-black text-mro-navy mt-1">{b.itemsCount} DTs</div>
                <span className="text-[10px] text-mro-muted block mt-0.5 leading-tight">
                  Aging: <b>{b.avgAge.toFixed(1)} d</b> • {b.breachCount} acima SLA ({b.breachRate.toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>

          <div className="h-44 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={bottlenecks.map(b => ({
                  name: `${b.stage.id} ${b.stage.short}`,
                  abertas: b.itemsCount,
                  estouradas: b.breachCount,
                }))}
                margin={{ top: 5, right: 10, left: 35, bottom: 5 }}
              >
                <XAxis type="number" tick={{ fontSize: 9, fill: '#667085' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#667085' }} width={85} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="abertas" fill="#041A71" radius={[0, 4, 4, 0]} />
                <Bar dataKey="estouradas" fill="#D92D20" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Forecast Chart & SLA Risk Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 p-5 bg-white rounded-2xl border border-mro-line shadow-card">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-mro-navy">Volume Previsto de Atendimento (Próximos {horizonDays} Dias)</h3>
            <InfoTooltip
              title="Volume Previsto de Atendimento"
              objective="Projetar a carga de trabalho futura com base nas datas de entrega pactuadas no SAP."
              formula="Contagem de DTs por dia onde FimPrevTransp. = Data na janela"
              align="left"
            />
          </div>
          <p className="text-[11px] text-mro-muted mb-4">Baseado em FimPrevTransp.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecastDays} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <XAxis dataKey="display" tick={{ fontSize: 10, fill: '#667085' }} />
                <YAxis tick={{ fontSize: 10, fill: '#667085' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3A78DE" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-6 p-5 bg-white rounded-2xl border border-mro-line shadow-card">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-mro-navy">DTs com Maior Risco de SLA (Etapa & Acumulado)</h3>
            <InfoTooltip
              title="DTs com Risco de SLA"
              objective="Priorizar ordens ativas com violação simultânea ou individual de SLA de etapa e SLA global."
              formula="Classificação: 1º Estouro Global + Etapa → 2º Maior Atraso em Dias"
              rule="Clique na linha para ver a linha do tempo e marcos."
              align="right"
            />
          </div>
          <p className="text-[11px] text-mro-muted mb-3">Abertas priorizadas por estouro individual e acumulado</p>

          <div className="overflow-x-auto border border-mro-line rounded-xl max-h-64">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-mro-navy text-white sticky top-0 z-10 text-[11px]">
                <tr>
                  <th className="p-2.5 font-bold">DT</th>
                  <th className="p-2.5 font-bold">Embarcação</th>
                  <th className="p-2.5 font-bold">Etapa</th>
                  <th className="p-2.5 font-bold">Aging</th>
                  <th className="p-2.5 font-bold">SLA Etapa</th>
                  <th className="p-2.5 font-bold">SLA Acumulado</th>
                  <th className="p-2.5 font-bold">Diagnóstico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mro-line">
                {slaRiskList.map(r => {
                  const p = dtSlaProfile(r, refDate, contractSla);
                  const vessel = vesselMap[r.local] ? `${vesselMap[r.local]} (${r.local})` : r.local;

                  return (
                    <tr
                      key={r.dt}
                      onClick={() => onSelectDt(r.dt)}
                      className="hover:bg-blue-50/60 cursor-pointer transition-colors"
                    >
                      <td className="p-2.5 font-bold text-mro-navy">{r.dt}</td>
                      <td className="p-2.5 text-mro-navy truncate max-w-[120px]">{vessel}</td>
                      <td className="p-2.5">
                        <span className="bg-blue-100 text-mro-blue font-bold text-[10px] px-2 py-0.5 rounded-full">
                          {r.status} — {STAGES[r.status]?.short}
                        </span>
                      </td>
                      <td className="p-2.5 font-semibold text-mro-navy">{p.stageMeasured ?? '—'} d</td>
                      <td className="p-2.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.stageState.klass === 'bad' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'}`}>
                          {p.stageState.icon} {p.stageSla}d
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.globalState.klass === 'bad' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-800'}`}>
                          {p.globalState.icon} {p.globalMeasured}d / {p.globalSla}d
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.overall === 'bad' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'}`}>
                          {p.overall === 'bad' ? 'Fora SLA' : 'Dentro SLA'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
