'use client';

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Download,
  Printer,
  Search,
  ArrowUpDown,
  FileText,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { CteRecord } from '@/lib/cteTypes';
import { fmtDateBr, fmtMoney } from '@/lib/cteCalculations';
import { CTE_STATUS_COLORS } from '@/lib/cteDictionary';

interface CteTableProps {
  records: CteRecord[];
  onSelectRecord: (record: CteRecord) => void;
}

type SortKey = 'dt' | 'cte' | 'vessel' | 'emissionDate' | 'statusKanban' | 'freightValue' | 'flowType';
type SortOrder = 'asc' | 'desc';

export const CteTable: React.FC<CteTableProps> = ({ records, onSelectRecord }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('emissionDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // Filtragem rápida textual na tabela
  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const q = searchTerm.toLowerCase();
    return records.filter(
      r =>
        r.dt.toLowerCase().includes(q) ||
        r.cte.toLowerCase().includes(q) ||
        r.vessel.toLowerCase().includes(q) ||
        r.base.toLowerCase().includes(q) ||
        r.statusKanban.toLowerCase().includes(q) ||
        r.errors.toLowerCase().includes(q) ||
        r.detailNextAction.toLowerCase().includes(q)
    );
  }, [records, searchTerm]);

  // Ordenação
  const sortedRecords = useMemo(() => {
    const list = [...filteredRecords];
    list.sort((a, b) => {
      let valA: any = a[sortKey] || '';
      let valB: any = b[sortKey] || '';

      if (sortKey === 'freightValue') {
        valA = a.freightValue || 0;
        valB = b.freightValue || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredRecords, sortKey, sortOrder]);

  // Paginação
  const totalPages = Math.ceil(sortedRecords.length / pageSize) || 1;
  const pagedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  // Exportação Excel
  const handleExportExcel = () => {
    const exportRows = sortedRecords.map(r => ({
      'DT': r.dt,
      'CT-e': r.cte,
      'Status Kanban': r.statusKanban,
      'Ordem Kanban': r.kanbanOrder,
      'Situação Kanban': r.kanbanSituation,
      'Status Original': r.originalStatus,
      'Tipo de Fluxo': r.flowType,
      'Embarcação': r.vessel,
      'Base': r.base,
      'Data de Emissão': fmtDateBr(r.emissionDate),
      'Valor do Frete': r.freightValue,
      'PO': r.po,
      'MIGO': r.migo,
      'Nº Custo Frete': r.freightCostNumber,
      'Erros / Ocorrência': r.errors,
      'Detalhe / Próxima Ação': r.detailNextAction,
      'Cidade Origem': r.originCity,
      'Cidade Destino': r.destinationCity,
      'Tipo Veículo': r.vehicleType,
      'Rota': r.route,
      'Vencimento Líquido': r.netDue,
      'Aba Origem': r.sourceSheet,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CT-es Faturamento');
    XLSX.writeFile(wb, `relatorio_ctes_faturamento_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Exportação / Impressão PDF
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mt-8">
      {/* Header da Tabela com Busca e Exportações */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-black text-mro-navy flex items-center gap-2">
            <FileText className="w-5 h-5 text-mro-blue" />
            Tabela Analítica de CT-es & DTs
          </h3>
          <p className="text-xs text-mro-muted mt-0.5">
            Listagem detalhada dos {filteredRecords.length.toLocaleString('pt-BR')} registros selecionados
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Pesquisar nesta visão..."
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg w-52 focus:outline-none focus:ring-1 focus:ring-mro-blue"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            Exportar Excel
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Tabela de Dados */}
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 select-none">
            <tr>
              <th onClick={() => handleSort('dt')} className="py-2.5 px-3 cursor-pointer hover:text-mro-navy">
                <div className="flex items-center gap-1">
                  DT <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th onClick={() => handleSort('cte')} className="py-2.5 px-3 cursor-pointer hover:text-mro-navy">
                <div className="flex items-center gap-1">
                  CT-e <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th onClick={() => handleSort('vessel')} className="py-2.5 px-3 cursor-pointer hover:text-mro-navy">
                <div className="flex items-center gap-1">
                  Embarcação <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2.5 px-3">Base</th>
              <th onClick={() => handleSort('emissionDate')} className="py-2.5 px-3 cursor-pointer hover:text-mro-navy">
                <div className="flex items-center gap-1">
                  Emissão <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th onClick={() => handleSort('flowType')} className="py-2.5 px-3 cursor-pointer hover:text-mro-navy">
                <div className="flex items-center gap-1">
                  Fluxo <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th onClick={() => handleSort('statusKanban')} className="py-2.5 px-3 cursor-pointer hover:text-mro-navy">
                <div className="flex items-center gap-1">
                  Status Kanban <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th onClick={() => handleSort('freightValue')} className="py-2.5 px-3 text-right cursor-pointer hover:text-mro-navy">
                <div className="flex items-center justify-end gap-1">
                  Valor Frete <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2.5 px-3">Pendência / Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pagedRecords.length > 0 ? (
              pagedRecords.map(r => {
                const statusColor = CTE_STATUS_COLORS[r.statusKanban] || CTE_STATUS_COLORS['A Classificar'];
                return (
                  <tr
                    key={r.id}
                    onClick={() => onSelectRecord(r)}
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 font-bold text-mro-navy">
                      {r.dt ? `DT ${r.dt}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 font-black text-slate-800">
                      {r.cte ? `CT-e ${r.cte}` : <span className="text-amber-600 font-semibold">Pendente</span>}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700 truncate max-w-[150px]">
                      {r.vessel || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {r.base || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {fmtDateBr(r.emissionDate)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-slate-200">
                        {r.flowType || 'Transporte'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`} />
                        {r.statusKanban}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">
                      {fmtMoney(r.freightValue)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 truncate max-w-[220px]" title={r.errors || r.detailNextAction}>
                      {r.errors ? (
                        <span className="text-red-700 font-semibold flex items-center gap-1 truncate">
                          <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                          {r.errors}
                        </span>
                      ) : (
                        <span>{r.detailNextAction || '—'}</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  Nenhum registro encontrado para os critérios selecionados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-mro-muted">
          <span>
            Página <b>{currentPage}</b> de <b>{totalPages}</b> (Total de {sortedRecords.length.toLocaleString('pt-BR')} registros)
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
