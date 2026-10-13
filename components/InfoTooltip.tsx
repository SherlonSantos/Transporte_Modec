'use client';

import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  title: string;
  objective: string;
  formula: string;
  rule?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  title,
  objective,
  formula,
  rule,
  align = 'center',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Position alignment
  const alignClass =
    align === 'left'
      ? 'left-0'
      : align === 'right'
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2';

  return (
    <div
      className={`relative inline-flex items-center ml-1.5 ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={e => {
        e.stopPropagation();
        setIsOpen(!isOpen);
      }}
    >
      <button
        type="button"
        aria-label={`Informações sobre ${title}`}
        className="text-slate-400 hover:text-mro-blue transition-colors cursor-help p-0.5 rounded-full hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-mro-blue"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {/* Tooltip Content */}
      <div
        className={`absolute bottom-full mb-2 ${alignClass} z-50 w-64 sm:w-72 bg-slate-900/95 backdrop-blur-xs text-white p-3 rounded-xl border border-slate-700/80 shadow-2xl transition-all duration-200 pointer-events-none text-left ${
          isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        {/* Title */}
        <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800 text-xs font-black text-white">
          <span className="truncate">{title}</span>
          <span className="text-[9px] text-blue-300 font-bold bg-blue-950/80 border border-blue-800 px-1.5 py-0.2 rounded">
            Indicador
          </span>
        </div>

        {/* Objective */}
        <div className="mb-2 text-[11px] text-slate-300 leading-relaxed">
          <strong className="text-blue-300 font-bold block mb-0.5 text-[10px] uppercase tracking-wide">
            🎯 Objetivo
          </strong>
          {objective}
        </div>

        {/* Formula */}
        <div className="text-[10px] text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 rounded-lg p-2 font-mono leading-relaxed">
          <strong className="text-emerald-400 font-bold block mb-0.5 font-sans text-[10px] uppercase tracking-wide">
            📐 Fórmula de Cálculo
          </strong>
          {formula}
        </div>

        {/* Optional Rule / Note */}
        {rule && (
          <div className="mt-2 text-[10px] text-slate-400 italic leading-snug pt-1.5 border-t border-slate-800/60">
            {rule}
          </div>
        )}

        {/* Little Arrow Indicator */}
        <div
          className={`absolute top-full -mt-1 w-2.5 h-2.5 bg-slate-900/95 border-r border-b border-slate-700/80 rotate-45 ${
            align === 'left' ? 'left-3' : align === 'right' ? 'right-3' : 'left-1/2 -translate-x-1/2'
          }`}
        />
      </div>
    </div>
  );
};
