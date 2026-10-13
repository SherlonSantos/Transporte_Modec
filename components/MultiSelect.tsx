'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label?: string;
  placeholder?: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  placeholder = 'Todos',
  options,
  selected,
  onChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const q = searchTerm.toLowerCase();
    return options.filter(
      o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, searchTerm]);

  const handleToggleOption = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter(v => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const handleSelectAll = () => {
    // If searching, select all matching options; otherwise select all options
    const valsToSelect = (searchTerm ? filteredOptions : options).map(o => o.value);
    const combined = Array.from(new Set([...selected, ...valsToSelect]));
    onChange(combined);
  };

  const handleClear = () => {
    onChange([]);
  };

  // Determine button label
  const buttonDisplay = useMemo(() => {
    if (selected.length === 0) {
      return { text: placeholder, count: 0, isDefault: true };
    }
    if (selected.length === 1) {
      const match = options.find(o => o.value === selected[0]);
      return {
        text: match ? match.label : selected[0],
        count: 1,
        isDefault: false,
      };
    }
    return {
      text: `${selected.length} selecionados`,
      count: selected.length,
      isDefault: false,
    };
  }, [selected, options, placeholder]);

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="text-[10px] font-bold text-mro-muted uppercase block mb-1">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full min-h-[34px] px-2.5 py-1.5 border rounded-lg text-xs flex items-center justify-between gap-1.5 transition-all text-left bg-white shadow-xs ${
          !buttonDisplay.isDefault
            ? 'border-blue-400 bg-blue-50/30 text-mro-navy font-semibold ring-1 ring-blue-300/40'
            : 'border-slate-300 text-slate-700 hover:border-slate-400'
        }`}
        title={buttonDisplay.text}
      >
        <span className="truncate flex-1 text-xs">
          {buttonDisplay.text}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {buttonDisplay.count > 0 && (
            <span className="bg-mro-navy text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-4 text-center">
              {buttonDisplay.count}
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-mro-navy' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 min-w-[240px] max-w-[340px] bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 flex flex-col space-y-2">
          {/* Action Buttons: Selecionar todos | Limpar | Aplicar */}
          <div className="grid grid-cols-3 gap-1.5 pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={handleSelectAll}
              className="py-1 px-1.5 text-[10px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
            >
              Marcar todos
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="py-1 px-1.5 text-[10px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="py-1 px-1.5 text-[10px] font-bold text-white bg-mro-navy hover:bg-blue-900 rounded-md transition-colors"
            >
              Aplicar
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar opção..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-2.5 py-1 text-xs border border-slate-200 rounded-md bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-400"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1.5" />
          </div>

          {/* Options Checklist */}
          <div className="max-h-52 overflow-y-auto space-y-0.5 pr-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => {
                const isChecked = selected.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-colors select-none ${
                      isChecked
                        ? 'bg-blue-50/70 text-mro-navy font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleOption(opt.value)}
                      className="rounded border-slate-300 text-mro-navy focus:ring-blue-400 w-3.5 h-3.5 shrink-0"
                    />
                    <span className="truncate min-w-0" title={opt.label}>
                      {opt.label}
                    </span>
                  </label>
                );
              })
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">
                Nenhuma opção encontrada
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
