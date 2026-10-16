'use client';

import React, { useState } from 'react';
import { Upload, RotateCcw, Download, Radio, ChevronUp, ChevronDown, Ship, AlertTriangle, CalendarDays } from 'lucide-react';
import { fmtDate, fmtDateTime } from '@/lib/calculations';

interface HeaderProps {
  filename: string;
  totalRecords: number;
  lastUpdate: Date | null;
  refDate: string;
  isRealtimeActive: boolean;
  chronologyIssuesCount: number;
  noForecastCount: number;
  onOpenUpload: () => void;
  onReset: () => void;
  onExport: () => void;
  onOpenChronologyModal: () => void;
  onOpenNoForecastModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  filename,
  totalRecords,
  lastUpdate,
  refDate,
  isRealtimeActive,
  chronologyIssuesCount,
  noForecastCount,
  onOpenUpload,
  onReset,
  onExport,
  onOpenChronologyModal,
  onOpenNoForecastModal,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <header className="bg-mro-navy border-b-4 border-mro-green text-white shadow-lg sticky top-0 z-30 transition-all duration-300">
      <div className="max-w-[1920px] mx-auto px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3.5">
            <div className="h-11 flex items-center shrink-0">
              <img
                src="/logo-mro.png"
                alt="Logo MRO"
                className="h-10 w-auto object-contain rounded-lg shadow-sm"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Painel de Gestão — Transporte MODEC</h1>
              </div>
              <p className="text-xs text-blue-200/90 mt-0.5">
                Visão Executiva, SLA Contratual Audax, Kanban Operacional & Programação de Cargas
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-2 bg-mro-greenLight hover:bg-mro-green text-mro-navy font-bold text-xs px-4 py-2.5 rounded-lg transition-colors shadow-sm"
            >
              <Upload className="w-4 h-4" />
              Carregar Base Excel (SAP)
            </button>

            <button
              onClick={onReset}
              className="flex items-center gap-1.5 border border-white/30 hover:bg-white/10 text-white font-semibold text-xs px-3.5 py-2.5 rounded-lg transition-colors"
              title="Restaurar base inicial"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar
            </button>

            <button
              onClick={onExport}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-mro-navy font-bold text-xs px-4 py-2.5 rounded-lg transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar Visão
            </button>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title={isCollapsed ? 'Expandir barra de informações' : 'Recolher barra'}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Subbar badges (collapsible) */}
        {!isCollapsed && (
          <div className="flex flex-wrap items-center gap-2.5 mt-3 pt-3 border-t border-white/10 text-[11px] text-blue-100 animate-in fade-in">
            <span className="bg-white/10 border border-white/15 px-3 py-1 rounded-full flex items-center gap-1.5">
              Arquivo: <strong className="text-white font-bold">{filename || 'Base Histórica'}</strong>
            </span>

            <span className="bg-white/10 border border-white/15 px-3 py-1 rounded-full flex items-center gap-1.5">
              Registros: <strong className="text-white font-bold">{totalRecords.toLocaleString('pt-BR')}</strong>
            </span>

            <span className="bg-white/10 border border-white/15 px-3 py-1 rounded-full flex items-center gap-1.5">
              Atualização Base: <strong className="text-white font-bold">{fmtDateTime(lastUpdate)}</strong>
            </span>

            <span className="bg-white/10 border border-white/15 px-3 py-1 rounded-full flex items-center gap-1.5">
              Aging de Referência: <strong className="text-white font-bold">{fmtDate(refDate)}</strong>
            </span>

            {chronologyIssuesCount > 0 && (
              <button
                type="button"
                onClick={onOpenChronologyModal}
                className="bg-amber-400/20 hover:bg-amber-400/35 text-amber-200 hover:text-white border border-amber-400/40 hover:border-amber-400/70 px-3 py-1 rounded-full flex items-center gap-1.5 font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                title="Clique para abrir e ver os cards com Inversão Cronológica SAP"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>{chronologyIssuesCount} DTs com Inversão Cronológica SAP</span>
              </button>
            )}

            {noForecastCount > 0 && (
              <button
                type="button"
                onClick={onOpenNoForecastModal}
                className="bg-amber-400/20 hover:bg-amber-400/35 text-amber-200 hover:text-white border border-amber-400/40 hover:border-amber-400/70 px-3 py-1 rounded-full flex items-center gap-1.5 font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                title="Clique para abrir e ver os cards sem previsão de entrega (SAP)"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>⚠ {noForecastCount.toLocaleString('pt-BR')} DTs sem Previsão</span>
              </button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <span
                className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  isRealtimeActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                    : 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
                }`}
              >
                <Radio className={`w-3 h-3 ${isRealtimeActive ? 'animate-pulse text-emerald-400' : ''}`} />
                {isRealtimeActive ? 'WebSocket Conectado' : 'Modo Standalone'}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
