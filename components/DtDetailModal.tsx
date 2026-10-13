'use client';

import React from 'react';
import { X, Clock, Ship, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { TransportRecord, VesselMapping } from '@/lib/types';
import { STAGES } from '@/lib/constants';
import {
  fmtDate,
  dayDiff,
  parseDate,
  totalLead,
  stageAge,
  chronologyIssues,
  startDeviation,
  transitDuration,
  stageDuration,
  cumulativeSla,
  cumulativeActualAtStage,
  slaState,
} from '@/lib/calculations';

interface DtDetailModalProps {
  record: TransportRecord | null;
  vesselMap: VesselMapping;
  refDate: Date;
  contractSla: Record<number, number>;
  onClose: () => void;
}

export const DtDetailModal: React.FC<DtDetailModalProps> = ({
  record,
  vesselMap,
  refDate,
  contractSla,
  onClose,
}) => {
  if (!record) return null;

  const vesselName = vesselMap[record.local]
    ? `${vesselMap[record.local]} (${record.local})`
    : record.local || 'Não informado';

  const currentStageDef = STAGES[record.status] || STAGES[0];
  const lead = totalLead(record);
  const issues = chronologyIssues(record);
  const dev = startDeviation(record);
  const transit = transitDuration(record);

  // 8 Milestones corresponding to stages 0 to 7
  const milestones = [
    { stage: 0, label: STAGES[0].name, source: 'Criado em', date: record.created },
    { stage: 1, label: STAGES[1].name, source: 'Fim organização', date: record.planEnd },
    { stage: 2, label: STAGES[2].name, source: 'Dta.atual registro', date: record.regDate },
    { stage: 3, label: STAGES[3].name, source: 'Iníc.carregam.atual', date: record.loadStart },
    { stage: 4, label: STAGES[4].name, source: 'Fim do carreg.atual', date: record.loadEnd },
    { stage: 5, label: STAGES[5].name, source: 'Dta.procmto.transp.', date: record.procDate },
    { stage: 6, label: STAGES[6].name, source: 'InícAtualTransp', date: record.actualStart },
    { stage: 7, label: STAGES[7].name, source: 'Fim atual trsp.', date: record.actualEnd },
  ];

  // Durations between consecutive milestones
  const durs: (number | null)[] = [];
  for (let i = 0; i < milestones.length - 1; i++) {
    const a = parseDate(milestones[i].date);
    const b = parseDate(milestones[i + 1].date);
    const d = a && b ? dayDiff(a, b) : null;
    durs.push(d);
  }

  const completedDurations = durs
    .map((d, i) => ({ d, i }))
    .filter(x => x.i < record.status && Number.isFinite(x.d) && x.d !== null && x.d > 0)
    .map(x => x.d as number);

  const maxDur = completedDurations.length ? Math.max(...completedDurations) : 0;

  // Helper for SLA meta tags (same logic as v22 HTML timelineSlaMeta)
  const renderTimelineSlaMeta = (
    stage: number,
    measured: number | null,
    isCurrent = false,
    cumulativeMeasured: number | null = null
  ) => {
    const currentStage = Number(stage);

    if (currentStage === 7) {
      const totalSla = cumulativeSla(6, contractSla);
      const state = slaState(cumulativeMeasured, totalSla);
      if (state.klass === 'neutral') {
        return (
          <div className="flex items-center gap-2 flex-wrap mt-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-600">
              <span className="w-3.5 h-3.5 rounded-full bg-white grid place-items-center text-[9px]">•</span>
              Etapa final
            </span>
          </div>
        );
      }
      const totalLabel = state.klass === 'good' ? 'Prazo total dentro do SLA' : 'Prazo total fora do SLA';
      const chipColor =
        state.klass === 'good'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-red-50 border-red-200 text-red-700';

      return (
        <div className="flex items-center gap-2 flex-wrap mt-1.5">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${chipColor}`}>
            <span className="w-3.5 h-3.5 rounded-full bg-white grid place-items-center text-[9px] font-black">{state.icon}</span>
            {totalLabel}
          </span>
          <span className="text-[10px] text-slate-500">
            SLA acumulado {totalSla} d · finalizado em {cumulativeMeasured} d
          </span>
        </div>
      );
    }

    const sla = Number(contractSla?.[currentStage]);
    const state = slaState(measured, sla);

    const primaryColor =
      state.klass === 'good'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
        : state.klass === 'bad'
        ? 'bg-red-50 border-red-200 text-red-700'
        : 'bg-slate-100 border-slate-200 text-slate-600';

    const note = isCurrent
      ? `SLA etapa ${sla} d · ${measured} d consumidos`
      : `SLA etapa ${sla} d · realizado ${measured} d`;

    const totalSla = cumulativeSla(currentStage, contractSla);
    const cumState = slaState(cumulativeMeasured, totalSla);

    const cumColor =
      cumState.klass === 'good'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
        : cumState.klass === 'bad'
        ? 'bg-red-50 border-red-200 text-red-700'
        : 'bg-slate-100 border-slate-200 text-slate-600';

    const cumLabel = cumState.klass === 'good' ? 'Acumulado dentro do SLA' : 'Acumulado fora do SLA';
    const cumNote = isCurrent
      ? `SLA acumulado ${totalSla} d · consumidos ${cumulativeMeasured} d`
      : `SLA acumulado ${totalSla} d · finalizado em ${cumulativeMeasured} d`;

    return (
      <div className="space-y-1 mt-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${primaryColor}`}>
            <span className="w-3.5 h-3.5 rounded-full bg-white grid place-items-center text-[9px] font-black">{state.icon}</span>
            {state.label}
          </span>
          <span className="text-[10px] text-slate-500">{note}</span>
        </div>

        {cumState.klass !== 'neutral' && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cumColor}`}>
              <span className="w-3.5 h-3.5 rounded-full bg-white grid place-items-center text-[9px] font-black">{cumState.icon}</span>
              {cumLabel}
            </span>
            <span className="text-[10px] text-slate-500">{cumNote}</span>
          </div>
        )}
      </div>
    );
  };

  const details: [string, string][] = [
    ['Status', `${record.status} — ${currentStageDef.name}`],
    ['Local / Embarcação', vesselName],
    ['Cód. Itinerário SAP', record.route || '—'],
    ['Fornecedor', record.supplier || '—'],
    ['Tipo Transporte', record.type || '—'],
    ['Tipo de Expedição', record.expeditionType ? `Tipo ${record.expeditionType}` : '—'],
    ['Criado por', record.createdBy || '—'],
    ['Modificado por', record.modifiedBy || '—'],
    ['Criado em', fmtDate(record.created)],
    ['Início Previsto Transporte', fmtDate(record.forecastStart)],
    ['Início Efetivo Transporte', fmtDate(record.actualStart)],
    ['Desvio do Início', dev === null ? '—' : `${dev > 0 ? '+' : ''}${dev} dias`],
    ['Fim Previsto (SLA)', fmtDate(record.forecastEnd)],
    ['Fim Atual (Entrega)', fmtDate(record.actualEnd)],
    [
      'Tempo Status 6 → 7',
      transit === null
        ? record.status === 6 && record.actualStart
          ? `${stageAge(record, refDate) ?? '—'} dias até a referência`
          : '—'
        : `${transit} dias`,
    ],
    ['Aging Etapa', record.status === 7 ? 'Concluída' : `${stageAge(record, refDate) ?? '—'} dias`],
    ['Lead Time Total', lead !== null ? `${lead} dias` : '—'],
    ['Integridade Cronológica', issues.length ? `${issues.length} inconsistência(s)` : 'OK'],
    ['ID Container', record.container || '—'],
    ['Denominação', record.denom || '—'],
  ];

  return (
    <div
      className="fixed inset-0 bg-mro-navy/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-mro-line">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-mro-line flex items-center justify-between bg-mro-bg sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-mro-navy">DT {record.dt}</h2>
              <span className="bg-mro-blue text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                Status {record.status} — {currentStageDef.name}
              </span>
            </div>
            <p className="text-xs text-mro-muted mt-0.5 flex items-center gap-1.5">
              <Ship className="w-3.5 h-3.5 text-mro-blue" />
              {vesselName} • Rota: <b>{record.parsedItinerary.display || record.route || 'Não informada'}</b>
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 grid place-items-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Operational Audax Stage Definition */}
          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-mro-blue shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">
                {record.status} — {currentStageDef.name}
              </strong>
              <p className="text-blue-800 mt-0.5 leading-relaxed">{currentStageDef.description}</p>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Marco técnico associado: <b>{currentStageDef.start || '—'}</b>
              </span>
            </div>
          </div>

          {/* Chronology Inconsistencies Alert */}
          {issues.length > 0 && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-1">
              <div className="flex items-center gap-2 font-bold text-red-700">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>Inconsistência cronológica no SAP VT11:</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-red-800">
                {issues.map((iss, idx) => (
                  <li key={idx}>{iss}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
            {details.map(([label, val], idx) => (
              <div key={idx} className="p-2.5 bg-mro-bg rounded-xl border border-mro-line">
                <span className="text-[9px] text-mro-muted font-bold uppercase tracking-wider block">
                  {label}
                </span>
                <strong className="text-mro-navy font-bold text-xs block mt-1 truncate" title={val}>
                  {val}
                </strong>
              </div>
            ))}
          </div>

          {/* Timeline Section */}
          <div className="pt-2">
            <h3 className="text-sm font-bold text-mro-navy mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-mro-blue" />
              Linha do Tempo e Intervalo entre Marcos (Audax & SAP VT11)
            </h3>

            {/* Timeline Explain Box */}
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-[10px] text-slate-600 leading-relaxed mb-3">
              <b>Como ler:</b> os nomes 0–7 representam a <b>etapa operacional</b>. As datas são obtidas dos <b>marcos técnicos da base</b> associados a cada status. Etapas encerradas mostram o tempo até o próximo marco; a etapa atual mostra há quantos dias permanece aberta. Além do <b>SLA da etapa</b>, a linha do tempo agora mostra o <b>SLA acumulado</b>, para indicar se a DT ainda está no prazo global mesmo quando alguma etapa isolada teve desvio. Etapas futuras aparecem como <b>Pendente</b>. O Status 7 só aparece como <b>Liberado para Faturamento</b> quando a DT está efetivamente no Status 7 e possui <b>Fim atual trsp.</b>.
            </div>

            {/* Timeline Head (desktop) */}
            <div className="hidden md:grid grid-cols-[210px_150px_1fr] gap-3 px-3 py-1 text-[9px] font-black text-slate-500 uppercase tracking-wider">
              <div>Etapa operacional</div>
              <div>Data técnica de entrada</div>
              <div>Tempo no status & Avaliação de SLA</div>
            </div>

            {/* Timeline Rows */}
            <div className="space-y-2.5 mt-1">
              {milestones.map((m, i) => {
                const dateText = fmtDate(m.date);
                const isCurrent = i === record.status && record.status < 7;
                const isFuture = i > record.status;
                const isCompletedFinal = i === 7 && record.status === 7 && Boolean(record.actualEnd);

                // Future pending stage
                if (isFuture) {
                  const pendingText =
                    i === 7
                      ? 'Pendente — aguardando liberação para faturamento'
                      : `Pendente — aguardando entrada no Status ${i}`;

                  return (
                    <div
                      key={i}
                      className="grid grid-cols-1 md:grid-cols-[210px_150px_1fr] items-center gap-3 p-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs opacity-85"
                    >
                      <div>
                        <b className="text-slate-600 font-bold block text-xs">
                          {m.stage} — {m.label}
                        </b>
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          Marco técnico: {m.source}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">
                          Data técnica de entrada
                        </span>
                        <span className="text-slate-400 font-semibold">—</span>
                      </div>
                      <div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                          <span className="w-4 h-4 rounded-full bg-amber-100 grid place-items-center text-[10px] font-black">…</span>
                          {pendingText}
                        </span>
                      </div>
                    </div>
                  );
                }

                // Final Completed Stage (7)
                if (isCompletedFinal) {
                  const totalFinal = totalLead(record);
                  return (
                    <div
                      key={i}
                      className="grid grid-cols-1 md:grid-cols-[210px_150px_1fr] items-center gap-3 p-3 bg-emerald-50/40 border border-emerald-200 rounded-xl text-xs"
                    >
                      <div>
                        <b className="text-mro-navy font-bold block text-xs">
                          {m.stage} — {m.label}
                        </b>
                        <span className="text-[9px] text-slate-500 block mt-0.5">
                          Marco técnico: {m.source}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-bold">
                          Data técnica de entrada
                        </span>
                        <span className="text-mro-navy font-bold">{dateText}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-emerald-700 font-black text-[11px]">
                          <span className="w-4 h-4 rounded-full bg-emerald-100 grid place-items-center text-[10px]">✓</span>
                          Liberado para faturamento — etapa final
                        </div>
                        {renderTimelineSlaMeta(i, null, false, totalFinal)}
                      </div>
                    </div>
                  );
                }

                // Status 7 without completion date
                if (i === 7 && record.status === 7 && !record.actualEnd) {
                  return (
                    <div
                      key={i}
                      className="grid grid-cols-1 md:grid-cols-[210px_150px_1fr] items-center gap-3 p-3 bg-amber-50/40 border border-amber-200 rounded-xl text-xs"
                    >
                      <div>
                        <b className="text-slate-700 font-bold block text-xs">
                          {m.stage} — {m.label}
                        </b>
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          Marco técnico: {m.source}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold">—</span>
                      </div>
                      <div>
                        <span className="text-amber-800 text-[10px] font-bold">
                          Status 7 informado, mas sem data de conclusão
                        </span>
                      </div>
                    </div>
                  );
                }

                // Current Stage in Progress
                if (isCurrent) {
                  const entry = parseDate(m.date);
                  const age = entry ? dayDiff(entry, refDate) : null;
                  const cumActualCurrent = cumulativeActualAtStage(record, i, refDate);

                  return (
                    <div
                      key={i}
                      className="grid grid-cols-1 md:grid-cols-[210px_150px_1fr] items-center gap-3 p-3 bg-blue-50/50 border-2 border-blue-400 rounded-xl text-xs shadow-xs"
                    >
                      <div>
                        <b className="text-mro-blue font-black block text-xs">
                          {m.stage} — {m.label}
                        </b>
                        <span className="text-[9px] text-slate-500 block mt-0.5">
                          Marco técnico: {m.source}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-bold">
                          Data técnica de entrada
                        </span>
                        <span className="text-mro-navy font-bold">{dateText}</span>
                      </div>
                      <div>
                        {age === null ? (
                          <span className="text-[10px] text-amber-700 font-bold">
                            Status atual — aguardando marco técnico
                          </span>
                        ) : age < 0 ? (
                          <div className="text-[10px] font-bold text-red-600">
                            Inconsistência de data: {Math.abs(age)} dias à frente da referência
                          </div>
                        ) : age === 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase text-mro-blue">Status atual</span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                              ✓ Iniciada hoje — em andamento
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black uppercase text-mro-blue">
                                Status atual · tempo em aberto:
                              </span>
                              <span className="text-base font-black text-mro-navy">
                                {age} {age === 1 ? 'dia' : 'dias'}
                              </span>
                            </div>
                            <div className="text-[9px] text-slate-500 mt-0.5">
                              Permanece neste status até a data de referência ({fmtDate(refDate)}).
                            </div>
                          </div>
                        )}
                        {renderTimelineSlaMeta(
                          i,
                          age !== null && age >= 0 ? age : null,
                          true,
                          cumActualCurrent
                        )}
                      </div>
                    </div>
                  );
                }

                // Completed Past Stage
                const d = durs[i];
                const cumActual = cumulativeActualAtStage(record, i, refDate);
                const isLongest = maxDur > 0 && d === maxDur;
                const width = maxDur > 0 && d !== null && d > 0 ? Math.max(6, (d / maxDur) * 100) : 0;

                return (
                  <div
                    key={i}
                    className={`grid grid-cols-1 md:grid-cols-[210px_150px_1fr] items-center gap-3 p-3 bg-mro-bg border rounded-xl text-xs ${
                      d !== null && d < 0 ? 'border-red-200 bg-red-50/30' : isLongest ? 'border-blue-200 bg-blue-50/20' : 'border-mro-line'
                    }`}
                  >
                    <div>
                      <b className="text-mro-navy font-bold block text-xs">
                        {m.stage} — {m.label}
                      </b>
                      <span className="text-[9px] text-slate-500 block mt-0.5">
                        Marco técnico: {m.source}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-bold">
                        Data técnica de entrada
                      </span>
                      <span className="text-mro-navy font-bold">{dateText}</span>
                    </div>

                    <div>
                      {d === null ? (
                        <span className="text-[10px] text-slate-400">Tempo no status não mensurável</span>
                      ) : d < 0 ? (
                        <div className="text-[10px] text-red-600 font-bold">
                          Inconsistência de data: {Math.abs(d)} dia(s) invertido(s)
                        </div>
                      ) : d === 0 ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                          <span className="w-3.5 h-3.5 rounded-full bg-emerald-100 grid place-items-center text-[9px] font-black">✓</span>
                          Concluído no mesmo dia
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Tempo no status:</span>
                            <span className="text-sm font-black text-mro-navy">
                              {d} {d === 1 ? 'dia' : 'dias'}
                            </span>
                            {isLongest && (
                              <span className="bg-blue-100 text-mro-blue text-[9px] font-bold px-2 py-0.5 rounded-full">
                                Maior intervalo
                              </span>
                            )}
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden my-1.5">
                            <div
                              className="h-full bg-gradient-to-r from-mro-blue to-mro-green rounded-full"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {renderTimelineSlaMeta(i, d !== null && d >= 0 ? d : null, false, cumActual)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
