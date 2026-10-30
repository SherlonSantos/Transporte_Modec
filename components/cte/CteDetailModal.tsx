'use client';

import React, { useState } from 'react';
import {
  X,
  FileText,
  Ship,
  MapPin,
  Calendar,
  AlertTriangle,
  Copy,
  Check,
  CreditCard,
  Truck,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { CteRecord } from '@/lib/cteTypes';
import { fmtDateBr, fmtMoney, getCteAgeDays } from '@/lib/cteCalculations';
import { CTE_STATUS_COLORS } from '@/lib/cteDictionary';

interface CteDetailModalProps {
  record: CteRecord | null;
  allRecords: CteRecord[];
  onClose: () => void;
  onSelectRecord: (record: CteRecord) => void;
}

export const CteDetailModal: React.FC<CteDetailModalProps> = ({
  record,
  allRecords,
  onClose,
  onSelectRecord,
}) => {
  const [copied, setCopied] = useState(false);

  if (!record) return null;

  // Busca outros CT-es vinculados à mesma DT
  const siblingCtes = record.dt
    ? allRecords.filter(r => r.dt === record.dt && r.id !== record.id)
    : [];

  const statusColor = CTE_STATUS_COLORS[record.statusKanban] || CTE_STATUS_COLORS['A Classificar'];
  const ageDays = getCteAgeDays(record.emissionDate);

  const handleCopy = () => {
    const text = `
DETALHES DO CT-E (MODEC / MRO)
DT: ${record.dt || 'Não informada'}
CT-e: ${record.cte || 'Pendente'}
Navio: ${record.vessel || 'Não informado'}
Base: ${record.base || 'Não informada'}
Status Kanban: ${record.statusKanban} (Ordem: ${record.kanbanOrder})
Status Original: ${record.originalStatus || 'Não informado'}
Tipo de Fluxo: ${record.flowType || 'Não informado'}
Data de Emissão: ${fmtDateBr(record.emissionDate)}
Valor do Frete: ${fmtMoney(record.freightValue)}
PO: ${record.po || '—'}
MIGO: ${record.migo || '—'}
Nº Custo Frete: ${record.freightCostNumber || '—'}
Pendência / Erros: ${record.errors || 'Nenhuma'}
Detalhe / Próxima Ação: ${record.detailNextAction || '—'}
Origem: ${record.originCity || '—'}
Destino: ${record.destinationCity || '—'}
Tipo Veículo: ${record.vehicleType || '—'}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 bg-mro-navy/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-mro-line animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-mro-line flex items-center justify-between bg-mro-bg sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase">
                {record.dt ? `DT ${record.dt}` : 'Sem DT'}
              </span>
              <span className="text-slate-300">•</span>
              <h2 className="text-xl font-black text-mro-navy flex items-center gap-1.5">
                <FileText className="w-5 h-5 text-mro-blue" />
                {record.cte ? `CT-e ${record.cte}` : 'CT-e Pendente'}
              </h2>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`} />
                {record.statusKanban}
              </span>
              {record.flowType && (
                <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-md border border-blue-200">
                  Fluxo: {record.flowType}
                </span>
              )}
            </div>
            <p className="text-xs text-mro-muted mt-1 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1">
                <Ship className="w-3.5 h-3.5 text-mro-blue" />
                {record.vessel || 'Embarcação não informada'}
              </span>
              {record.base && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Base: <b>{record.base}</b>
                  </span>
                </>
              )}
              {record.sourceSheet && (
                <>
                  <span>•</span>
                  <span className="text-[10px] text-slate-400">Origem: {record.sourceSheet}</span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors"
              title="Copiar dados para a área de transferência"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 grid place-items-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Alerta de Pendência ou Erro */}
          {record.errors && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-800">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-red-900">
                  Ocorrência / Pendência Identificada
                </h4>
                <p className="text-sm font-semibold mt-0.5">{record.errors}</p>
                {record.detailNextAction && (
                  <p className="text-xs text-red-700 mt-1">
                    <b>Próxima ação recomendada:</b> {record.detailNextAction}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Grid Principal de Informações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bloco 1: Dados do Documento e Status */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-2.5">
              <h4 className="text-xs font-black text-mro-navy uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <FileText className="w-4 h-4 text-mro-blue" />
                Situação & Classificação
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Status Original</span>
                  <span className="font-bold text-slate-800">{record.originalStatus || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Status Kanban</span>
                  <span className="font-bold text-mro-navy">{record.statusKanban}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Ordem da Etapa</span>
                  <span className="font-bold text-slate-800">Etapa {record.kanbanOrder}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Situação Operacional</span>
                  <span className="font-bold text-slate-800">{record.kanbanSituation || '—'}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 text-xs">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Regra / Próxima Ação</span>
                <span className="font-semibold text-slate-800">{record.detailNextAction || 'Nenhuma ação pendente'}</span>
              </div>
            </div>

            {/* Bloco 2: Documentos Fiscais & Integração */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-2.5">
              <h4 className="text-xs font-black text-mro-navy uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <CreditCard className="w-4 h-4 text-mro-blue" />
                Documentos & Faturamento
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">PO (Pedido de Compra)</span>
                  <span className="font-mono font-bold text-slate-800">{record.po || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">MIGO / Folha Registro</span>
                  <span className="font-mono font-bold text-slate-800">{record.migo || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Nº Custo Frete</span>
                  <span className="font-mono font-bold text-slate-800">{record.freightCostNumber || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Liberar p/ Pagamento</span>
                  <span className="font-bold text-slate-800">{record.releaseForPayment || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">GTG</span>
                  <span className="font-bold text-slate-800">{record.gtg || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Vencimento Líquido</span>
                  <span className="font-bold text-slate-800">{record.netDue || '—'}</span>
                </div>
              </div>
            </div>

            {/* Bloco 3: Rota e Transporte */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-2.5">
              <h4 className="text-xs font-black text-mro-navy uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <Truck className="w-4 h-4 text-mro-blue" />
                Dados do Transporte
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Cidade Origem</span>
                  <span className="font-bold text-slate-800">{record.originCity || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Cidade Destino</span>
                  <span className="font-bold text-slate-800">{record.destinationCity || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Tipo de Veículo</span>
                  <span className="font-bold text-slate-800">{record.vehicleType || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Rota SAP</span>
                  <span className="font-bold text-slate-800">{record.route || '—'}</span>
                </div>
              </div>
            </div>

            {/* Bloco 4: Valores e Datas */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-2.5">
              <h4 className="text-xs font-black text-mro-navy uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <Calendar className="w-4 h-4 text-mro-blue" />
                Prazos & Valores
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Data de Emissão</span>
                  <span className="font-bold text-slate-800">{fmtDateBr(record.emissionDate)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Tempo desde Emissão</span>
                  <span className="font-black text-mro-navy">{ageDays !== null ? `${ageDays} dias` : '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Valor do Frete</span>
                  <span className="font-black text-emerald-700 text-sm">{fmtMoney(record.freightValue)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Valor Transportado</span>
                  <span className="font-bold text-slate-800">{fmtMoney(record.transportedValue)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bloco 5: Outros CT-es Vinculados à Mesma DT */}
          {siblingCtes.length > 0 && (
            <div className="border border-blue-200 bg-blue-50/40 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-mro-navy uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-mro-blue" />
                  Outros CT-es da mesma DT ({siblingCtes.length})
                </h4>
                <span className="text-[11px] text-mro-muted">Clique para alternar o documento</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {siblingCtes.map(sib => (
                  <div
                    key={sib.id}
                    onClick={() => onSelectRecord(sib)}
                    className="p-2.5 bg-white rounded-lg border border-slate-200 hover:border-mro-blue cursor-pointer transition-all flex items-center justify-between shadow-2xs hover:shadow-xs"
                  >
                    <div>
                      <div className="font-bold text-xs text-mro-navy flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-mro-blue" />
                        CT-e {sib.cte || 'Pendente'}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        Emissão: {fmtDateBr(sib.emissionDate)} • Frete: {fmtMoney(sib.freightValue)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          sib.kanbanOrder === 5
                            ? 'bg-emerald-100 text-emerald-800'
                            : sib.kanbanOrder === 3
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {sib.statusKanban}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
