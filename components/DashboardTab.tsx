'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LineChart,
  Line,
  LabelList,
} from 'recharts';
import { AlertCircle, Clock, Ship, ArrowRight, AlertTriangle } from 'lucide-react';
import { InfoTooltip } from '@/components/InfoTooltip';
import { TransportRecord, VesselMapping } from '@/lib/types';
import { STAGES, STAGE_COLORS } from '@/lib/constants';
import {
  fmtDate,
  isoDate,
  stageAge,
  totalLead,
  overdueDays,
  avg,
  pct,
  countBy,
  chronologyIssues,
  startDeviation,
} from '@/lib/calculations';

interface DashboardTabProps {
  data: TransportRecord[];
  allRecords: TransportRecord[];
  vesselMap: VesselMapping;
  refDate: Date;
  onSelectDt: (dt: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  data,
  allRecords,
  vesselMap,
  refDate,
  onSelectDt,
}) => {
  const openRecords = data.filter(r => r.status >= 0 && r.status < 7);
  const doneRecords = data.filter(r => r.status === 7);
  const overdueOpen = openRecords.filter(r => r.forecastEnd && refDate > r.forecastEnd);
  const lateDone = doneRecords.filter(r => r.forecastEnd && r.actualEnd && r.actualEnd > r.forecastEnd);
  const noForecast = data.filter(r => !r.forecastEnd);

  const avgLead = avg(doneRecords.map(totalLead));
  const avgAge = avg(openRecords.map(r => stageAge(r, refDate)));

  // Chronology issues count in current view
  const issuesCount = data.filter(r => chronologyIssues(r).length > 0).length;

  // Status distribution
  const statusData = STAGES.map(s => ({
    name: `${s.id} ${s.short}`,
    count: data.filter(r => r.status === s.id).length,
    color: STAGE_COLORS[s.id] || '#041A71',
  }));

  // Aging distribution
  const agingBuckets = {
    '0 dia': 0,
    '1 dia': 0,
    '2-3 dias': 0,
    '4-7 dias': 0,
    '8-15 dias': 0,
    '16+ dias': 0,
  };

  openRecords.forEach(r => {
    const a = stageAge(r, refDate);
    if (a === null) return;
    if (a === 0) agingBuckets['0 dia']++;
    else if (a === 1) agingBuckets['1 dia']++;
    else if (a <= 3) agingBuckets['2-3 dias']++;
    else if (a <= 7) agingBuckets['4-7 dias']++;
    else if (a <= 15) agingBuckets['8-15 dias']++;
    else agingBuckets['16+ dias']++;
  });

  const agingChartData = Object.entries(agingBuckets).map(([k, v]) => ({
    bucket: k,
    count: v,
  }));

  // Top vessels (Consolidated by canonical FPSO/Unit to eliminate duplicate bars & text crowding)
  const vesselAgg: Record<
    string,
    {
      name: string;
      displayName: string;
      count: number;
      subCodes: Record<string, number>;
    }
  > = {};

  data.forEach(r => {
    const rawCode = (r.local || '').trim() || 'Não informado';
    const canonicalName = vesselMap[rawCode] || rawCode;

    if (!vesselAgg[canonicalName]) {
      let displayName = canonicalName;
      // Abbreviate "Cidade de " to "Cid. " for crisp, non-wrapping axis display
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

  const topVessels = Object.values(vesselAgg)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Daily Flow - creations vs conclusions (last 30 days)
  const allDates = data
    .flatMap(r => [r.created, r.actualEnd])
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  let flowData: { date: string; display: string; criadas: number; concluidas: number }[] = [];
  if (allDates.length > 0) {
    const maxDate = new Date(allDates[allDates.length - 1]);
    const minDate = new Date(maxDate);
    minDate.setDate(minDate.getDate() - 29);

    const createdMap = countBy(
      data.filter(r => r.created),
      r => isoDate(r.created)
    );
    const doneMap = countBy(
      data.filter(r => r.actualEnd),
      r => isoDate(r.actualEnd)
    );

    for (let cur = new Date(minDate); cur <= maxDate; cur.setDate(cur.getDate() + 1)) {
      const key = isoDate(cur);
      const [y, m, d] = key.split('-');
      flowData.push({
        date: key,
        display: `${d}/${m}`,
        criadas: createdMap[key] || 0,
        concluidas: doneMap[key] || 0,
      });
    }
  }

  // Priority open DTs
  const priorityList = [...openRecords]
    .sort((a, b) => {
      const ao = overdueDays(a, refDate) || 0;
      const bo = overdueDays(b, refDate) || 0;
      if (bo !== ao) return bo - ao;
      return (stageAge(b, refDate) || 0) - (stageAge(a, refDate) || 0);
    })
    .slice(0, 15);

  // Data quality metrics
  const total = data.length || 1;
  const qualityMetrics = [
    { label: 'Com previsão de início (InícPrev)', val: data.filter(r => r.forecastStart).length },
    { label: 'Com previsão final (FimPrev)', val: data.filter(r => r.forecastEnd).length },
    { label: 'Com início real (InícAtualTransp)', val: data.filter(r => r.actualStart).length },
    { label: 'Com entrega final (Fim atual)', val: data.filter(r => r.actualEnd).length },
    { label: 'Com itinerário mapeado', val: data.filter(r => r.route).length },
    { label: 'Com Local / Polo', val: data.filter(r => r.local).length },
    { label: 'Nome embarcação mapeado', val: data.filter(r => r.local && vesselMap[r.local]).length },
    { label: 'Com divergência cronológica SAP', val: issuesCount },
  ];

  return (
    <div className="space-y-6">
      {/* 8 Primary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3.5">
        <div className="p-4 bg-white rounded-xl border border-mro-line shadow-card relative overflow-visible before:absolute before:left-0 before:top-0 before:right-0 before:h-1 before:bg-mro-navy">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-mro-muted font-bold uppercase tracking-wider block">DTs na Visão</span>
            <InfoTooltip
              title="DTs na Visão"
              objective="Quantificar o volume total de ordens de transporte que atendem aos filtros ativos no painel."
              formula="Contagem(DTs após filtros globais aplicados)"
              align="left"
            />
          </div>
          <div className="text-2xl font-black text-mro-navy mt-1">{data.length.toLocaleString('pt-BR')}</div>
          <span className="text-[10px] text-mro-muted mt-1 block">Filtro aplicado</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-mro-line shadow-card relative overflow-visible before:absolute before:left-0 before:top-0 before:right-0 before:h-1 before:bg-mro-blue">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-mro-muted font-bold uppercase tracking-wider block">Em Aberto (Audax)</span>
            <InfoTooltip
              title="Em Aberto (Audax)"
              objective="Monitorar o volume de ordens ativas em trânsito operacional na Audax (ainda não faturadas)."
              formula="Contagem(DTs com Status Global de 0 a 6)"
              align="left"
            />
          </div>
          <div className="text-2xl font-black text-mro-blue mt-1">{openRecords.length.toLocaleString('pt-BR')}</div>
          <span className="text-[10px] text-mro-muted mt-1 block">Status 0 a 6</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-mro-line shadow-card relative overflow-visible before:absolute before:left-0 before:top-0 before:right-0 before:h-1 before:bg-mro-green">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-mro-muted font-bold uppercase tracking-wider block">Concluídas (ODT)</span>
            <InfoTooltip
              title="Concluídas (ODT)"
              objective="Medir o volume e proporção de ordens de transporte totalmente finalizadas e faturadas."
              formula="(Contagem(Status 7) / Total DTs) × 100"
              align="left"
            />
          </div>
          <div className="text-2xl font-black text-mro-green mt-1">{doneRecords.length.toLocaleString('pt-BR')}</div>
          <span className="text-[10px] text-mro-muted mt-1 block">{pct(doneRecords.length, data.length)} faturadas</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-mro-line shadow-card relative overflow-visible before:absolute before:left-0 before:top-0 before:right-0 before:h-1 before:bg-mro-red">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-mro-muted font-bold uppercase tracking-wider block">Abertas Atrasadas</span>
            <InfoTooltip
              title="Abertas com Atraso Previsto"
              objective="Alertar sobre cargas em andamento que já estouraram a data prevista de entrega (FimPrevTransp.)."
              formula="Contagem(Status < 7 e FimPrevTransp. < Data Referência)"
              rule="Requer atuação imediata de acompanhamento junto à Audax."
              align="left"
            />
          </div>
          <div className="text-2xl font-black text-mro-red mt-1">{overdueOpen.length.toLocaleString('pt-BR')}</div>
          <span className="text-[10px] text-mro-muted mt-1 block">Previsão vencida</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-mro-line shadow-card relative overflow-visible before:absolute before:left-0 before:top-0 before:right-0 before:h-1 before:bg-mro-amber">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-mro-muted font-bold uppercase tracking-wider block">Concl. Fora Prazo</span>
            <InfoTooltip
              title="Concluídas Fora do Prazo"
              objective="Avaliar o histórico de entregas finalizadas que não cumpriram a previsão inicial informada."
              formula="Contagem(Status = 7 e Fim Atual > FimPrevTransp.)"
              align="right"
            />
          </div>
          <div className="text-2xl font-black text-mro-amber mt-1">{lateDone.length.toLocaleString('pt-BR')}</div>
          <span className="text-[10px] text-mro-muted mt-1 block">Entregas em atraso</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-mro-line shadow-card relative overflow-visible before:absolute before:left-0 before:top-0 before:right-0 before:h-1 before:bg-slate-400">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-mro-muted font-bold uppercase tracking-wider block">Sem Previsão</span>
            <InfoTooltip
              title="DTs sem Previsão de Entrega"
              objective="Identificar falhas de cadastro no SAP onde a data de previsão (FimPrevTransp.) não foi preenchida."
              formula="Contagem(FimPrevTransp. em branco no SAP)"
              rule="Impede cálculo de pontualidade contratual antecipada."
              align="right"
            />
          </div>
          <div className="text-2xl font-black text-slate-600 mt-1">{noForecast.length.toLocaleString('pt-BR')}</div>
          <span className="text-[10px] text-mro-muted mt-1 block">FimPrev não preenchido</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-mro-line shadow-card relative overflow-visible before:absolute before:left-0 before:top-0 before:right-0 before:h-1 before:bg-mro-blueLight">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-mro-muted font-bold uppercase tracking-wider block">Lead Time Total</span>
            <InfoTooltip
              title="Lead Time Médio de Faturamento"
              objective="Mensurar o tempo médio do ciclo completo de atendimento, da criação da DT até o encerramento."
              formula="Média(Fim Atual do Transporte - Data de Criação) para Status 7"
              align="right"
            />
          </div>
          <div className="text-2xl font-black text-mro-navy mt-1">{avgLead !== null ? `${avgLead.toFixed(1)} d` : '—'}</div>
          <span className="text-[10px] text-mro-muted mt-1 block">Criação → Faturamento</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-mro-line shadow-card relative overflow-visible before:absolute before:left-0 before:top-0 before:right-0 before:h-1 before:bg-mro-navy">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-mro-muted font-bold uppercase tracking-wider block">Aging Médio Abertas</span>
            <InfoTooltip
              title="Aging Médio das DTs Abertas"
              objective="Indicar o tempo médio que as cargas em andamento estão paradas na sua etapa operacional atual."
              formula="Média(Data Referência - Marco Inicial da Etapa) para Status 0 a 6"
              align="right"
            />
          </div>
          <div className="text-2xl font-black text-mro-navy mt-1">{avgAge !== null ? `${avgAge.toFixed(1)} d` : '—'}</div>
          <span className="text-[10px] text-mro-muted mt-1 block">Dias na etapa atual</span>
        </div>
      </div>

      {/* Operational Funnel with Audax Stages */}
      <div className="p-4 bg-white rounded-2xl border border-mro-line shadow-card">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-bold text-mro-navy">Funil Operacional de Transporte — Etapas Audax</h3>
          <InfoTooltip
            title="Funil Operacional Audax"
            objective="Monitorar o estoque instantâneo de cargas distribuído ao longo dos 8 estágios do fluxo da Audax."
            formula="Contagem de DTs agrupadas por Status Global (0 a 7)"
            rule="Permite identificar gargalos de acúmulo entre a criação e a entrega."
            align="left"
          />
        </div>
        <p className="text-[11px] text-mro-muted mb-3">Estoque instantâneo de DTs distribuído por status do processo logístico</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {STAGES.map(s => {
            const count = data.filter(r => r.status === s.id).length;
            return (
              <div
                key={s.id}
                className="p-3 bg-mro-bg rounded-xl border border-mro-line text-center hover:border-mro-blue transition-colors flex flex-col justify-between"
              >
                <div>
                  <b className="text-lg font-black text-mro-navy block">{count.toLocaleString('pt-BR')}</b>
                  <span className="text-[10px] text-mro-navy font-bold block mt-0.5 leading-tight">
                    {s.id} — {s.short}
                  </span>
                </div>
                <span className="text-[8px] text-mro-muted block mt-1.5 leading-tight italic line-clamp-2" title={s.description}>
                  {s.description}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts Grid 1: Status & Aging */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 p-5 bg-white rounded-2xl border border-mro-line shadow-card">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-mro-navy">Distribuição por Etapa Audax (Status SAP)</h3>
            <InfoTooltip
              title="Distribuição por Etapa Audax"
              objective="Visualizar o volume relativo de ordens em cada estágio do processo para balanceamento de capacidade."
              formula="Histograma de frequência de DTs por Status Global SAP"
              align="left"
            />
          </div>
          <p className="text-[11px] text-mro-muted mb-4">Volume total de DTs em cada estágio operacional</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#667085' }} interval={0} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: '#667085' }} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 p-5 bg-white rounded-2xl border border-mro-line shadow-card">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-mro-navy">Aging das DTs em Aberto na Audax</h3>
            <InfoTooltip
              title="Faixas de Aging (Estagnação)"
              objective="Classificar as cargas abertas pelo tempo que estão paradas na etapa atual, separando fluidez de gargalos crônicos."
              formula="Faixas de dias: ≤ 1d, 2 a 3d, 4 a 7d, 8 a 15d, > 15d baseadas em stageAge(r)"
              align="right"
            />
          </div>
          <p className="text-[11px] text-mro-muted mb-4">Dias decorridos na etapa atual</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={agingChartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#667085' }} />
                <YAxis dataKey="bucket" type="category" tick={{ fontSize: 10, fill: '#667085' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3A78DE" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Grid 2: Top Vessels & Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-5 bg-white rounded-2xl border border-mro-line shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-mro-navy">Volume por Embarcação / Unidade MODEC</h3>
              <InfoTooltip
                title="Volume por Embarcação"
                objective="Identificar quais unidades FPSO ou polos concentram a maior demanda de movimentação física."
                formula="Contagem consolidada de DTs agrupadas por FPSO/Unidade Canônica (Top 10)"
                align="left"
              />
            </div>
            <span className="text-[10px] font-bold bg-blue-50 text-mro-blue px-2.5 py-0.5 rounded-full border border-blue-200">
              Top 10 Unidades
            </span>
          </div>
          <p className="text-[11px] text-mro-muted mb-3">Ranking consolidado de DTs direcionadas a cada FPSO / Polo</p>

          <div className="w-full" style={{ height: 420 }}>
            <ResponsiveContainer width="100%" height={420}>
              <BarChart
                layout="vertical"
                data={topVessels}
                margin={{ top: 10, right: 80, left: 10, bottom: 10 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={{ stroke: '#E2E8F0' }}
                />
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
                    const totalVisao = data.length || 1;
                    const pctTotal = ((d.count / totalVisao) * 100).toFixed(1);
                    const subCodesEntries = Object.entries(d.subCodes || {}) as [string, number][];

                    return (
                      <div className="bg-slate-900/95 backdrop-blur-xs text-white p-3 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1.5 z-50">
                        <div className="font-black text-white text-sm">{d.name}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-bold text-sm">
                            {d.count.toLocaleString('pt-BR')} DTs
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            ({pctTotal}% do total)
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
                <Bar dataKey="count" fill="#041A71" radius={[0, 6, 6, 0]} barSize={22}>
                  <LabelList
                    dataKey="count"
                    position="right"
                    offset={8}
                    fill="#041A71"
                    fontSize={11}
                    fontWeight={800}
                    formatter={(val: number) => `${val.toLocaleString('pt-BR')} DTs`}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-mro-line shadow-card">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-mro-navy">Fluxo Diário — Demandas Abertas vs Faturadas</h3>
            <InfoTooltip
              title="Fluxo Diário de Demandas"
              objective="Acompanhar a velocidade de entrada (criação) versus saída (conclusão) nos últimos 30 dias na base."
              formula="Criadas = Contagem(Criado em = Data) | Concluídas = Contagem(Fim Atual = Data)"
              align="right"
            />
          </div>
          <p className="text-[11px] text-mro-muted mb-3">Evolução diária dos últimos 30 dias na base</p>
          <div className="w-full" style={{ height: 420 }}>
            <ResponsiveContainer width="100%" height={420}>
              <LineChart data={flowData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                <XAxis dataKey="display" tick={{ fontSize: 9, fill: '#667085' }} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: '#667085' }} />
                <Tooltip />
                <Line type="monotone" dataKey="criadas" stroke="#3A78DE" strokeWidth={2.5} dot={false} name="Criadas" />
                <Line type="monotone" dataKey="concluidas" stroke="#00CE7C" strokeWidth={2.5} dot={false} name="Faturadas" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Priority Action Table & Data Quality */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 p-5 bg-white rounded-2xl border border-mro-line shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-mro-navy">DTs Prioritárias para Atuação Operacional</h3>
                <InfoTooltip
                  title="DTs Prioritárias"
                  objective="Listar as cargas abertas mais críticas para intervenção e cobrança imediata da equipe."
                  formula="Classificação: 1º Maior Atraso (dias) → 2º Maior Aging na Etapa (dias)"
                  rule="Clique em qualquer linha para abrir a linha do tempo completa."
                  align="left"
                />
              </div>
              <p className="text-[11px] text-mro-muted">Abertas com maior atraso e aging (clique para abrir detalhes completos)</p>
            </div>
            <span className="text-xs bg-red-100 text-red-700 font-bold px-2.5 py-1 rounded-full">
              {overdueOpen.length} Atrasadas
            </span>
          </div>

          <div className="overflow-x-auto border border-mro-line rounded-xl max-h-96">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-mro-navy text-white sticky top-0 z-10 text-[11px]">
                <tr>
                  <th className="p-2.5 font-bold">DT</th>
                  <th className="p-2.5 font-bold">Embarcação</th>
                  <th className="p-2.5 font-bold">Etapa Audax</th>
                  <th className="p-2.5 font-bold">Aging</th>
                  <th className="p-2.5 font-bold">Previsão Fim</th>
                  <th className="p-2.5 font-bold">Atraso</th>
                  <th className="p-2.5 font-bold">Itinerário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mro-line">
                {priorityList.map(r => {
                  const age = stageAge(r, refDate);
                  const od = overdueDays(r, refDate);
                  const vessel = vesselMap[r.local] ? `${vesselMap[r.local]} (${r.local})` : r.local;

                  return (
                    <tr
                      key={r.dt}
                      onClick={() => onSelectDt(r.dt)}
                      className="hover:bg-blue-50/60 cursor-pointer transition-colors"
                    >
                      <td className="p-2.5 font-bold text-mro-navy">{r.dt}</td>
                      <td className="p-2.5 text-mro-navy truncate max-w-[140px]">{vessel}</td>
                      <td className="p-2.5">
                        <span className="inline-block bg-blue-100 text-mro-blue font-bold text-[10px] px-2 py-0.5 rounded-full">
                          {r.status} — {STAGES[r.status]?.short}
                        </span>
                      </td>
                      <td className="p-2.5 font-semibold text-mro-navy">
                        {age !== null ? `${age} d` : '—'}
                      </td>
                      <td className="p-2.5 text-mro-muted">{fmtDate(r.forecastEnd)}</td>
                      <td className="p-2.5">
                        {od && od > 0 ? (
                          <span className="text-red-600 font-bold">+{od} dias</span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">No prazo</span>
                        )}
                      </td>
                      <td className="p-2.5 text-mro-muted truncate max-w-[140px]" title={r.itineraryDescription}>
                        {r.parsedItinerary.display || r.route || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Data Quality Matrix */}
        <div className="lg:col-span-4 p-5 bg-white rounded-2xl border border-mro-line shadow-card flex flex-col">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-mro-navy">Qualidade e Integridade da Base SAP</h3>
            <InfoTooltip
              title="Qualidade e Integridade da Base"
              objective="Auditar a completude dos dados e identificar anomalias sistêmicas nas datas do SAP."
              formula="Percentual de preenchimento = (Registros com campo preenchido / Total DTs) × 100"
              rule="Mede a robustez do ERP para geração de métricas confiáveis."
              align="right"
            />
          </div>
          <p className="text-[11px] text-mro-muted mb-3">Monitoramento de marcos operacionais e consistência</p>

          {issuesCount > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 mb-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>
                <b>Atenção:</b> {issuesCount} DTs possuem lançamentos de datas com <b>inversão cronológica no SAP</b> (etapas posteriores registradas antes de marcos anteriores).
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mt-auto">
            {qualityMetrics.map((m, idx) => (
              <div key={idx} className="p-2.5 bg-mro-bg rounded-xl border border-mro-line">
                <b className="text-base font-black text-mro-navy block">{pct(m.val, total)}</b>
                <span className="text-[10px] text-mro-muted block leading-tight mt-0.5">{m.label}</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">{m.val.toLocaleString('pt-BR')} registros</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
