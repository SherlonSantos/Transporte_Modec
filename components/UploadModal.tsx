'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { IngestionModel } from '@/lib/types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataIngested: (model: IngestionModel) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onDataIngested }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ filename: string; rowsCount: number; headers: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const rawRows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: null, raw: true });

      if (!rawRows || rawRows.length < 2) {
        throw new Error('A planilha selecionada está vazia ou sem linhas de dados.');
      }

      // Find the header row (sometimes SAP exports have empty rows or titles on row 0)
      let headerRowIndex = 0;
      for (let r = 0; r < Math.min(5, rawRows.length); r++) {
        const rowStr = rawRows[r].map(c => String(c ?? '').toLowerCase().trim()).join(' ');
        if (rowStr.includes('transporte') || rowStr.includes('status') || rowStr.includes('criado')) {
          headerRowIndex = r;
          break;
        }
      }

      const headers = rawRows[headerRowIndex].map(h => String(h ?? '').trim());
      const cleanHeaders = headers.map(h => h.toLowerCase());

      // Validation
      const hasDt = cleanHeaders.some(h => h.includes('transporte') && (h.includes('nº') || h.includes('n') || h.includes('num')));
      const hasStatus = cleanHeaders.some(h => h.includes('status'));
      const hasCreated = cleanHeaders.some(h => h.includes('criado'));

      if (!hasDt && !hasStatus && !hasCreated) {
        throw new Error(
          'A planilha não parece ser uma extração do SAP VT11. Não foram encontradas colunas obrigatórias como "Nº transporte", "Status global trnsp." ou "Criado em".'
        );
      }

      const dataRows = rawRows.slice(headerRowIndex + 1).filter(r => r.some(c => c !== null && c !== ''));

      setPreview({
        filename: file.name,
        rowsCount: dataRows.length,
        headers,
      });

      // Deliver model
      onDataIngested({
        filename: file.name,
        headers,
        rows: dataRows,
      });

      setTimeout(() => {
        setLoading(false);
        onClose();
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar arquivo.');
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-mro-navy/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-mro-line p-6">
        <div className="flex items-center justify-between pb-4 border-b border-mro-line mb-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-mro-green" />
            <h3 className="font-bold text-base text-mro-navy">Upload de Extração SAP VT11</h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-mro-muted mb-4 leading-relaxed">
          Faça o upload da planilha extraída do SAP (formatos <b>.xlsx, .xls, .xlsm</b>). O sistema normaliza automaticamente os cabeçalhos e recalcula todos os SLAs e Kanbans em tempo real.
        </p>

        {/* Dropzone */}
        <div
          onDragOver={e => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-mro-green bg-mro-greenLight/15'
              : 'border-slate-300 hover:border-mro-blue hover:bg-slate-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.xlsm"
            className="hidden"
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                processFile(e.target.files[0]);
              }
            }}
          />

          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-mro-blue animate-spin" />
              <p className="text-xs font-bold text-mro-navy">Processando e normalizando base...</p>
            </div>
          ) : preview ? (
            <div className="flex flex-col items-center gap-2 text-mro-green">
              <CheckCircle2 className="w-8 h-8" />
              <p className="text-xs font-bold text-mro-navy">{preview.filename}</p>
              <span className="text-[11px] text-mro-muted">{preview.rowsCount.toLocaleString('pt-BR')} DTs importadas</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-mro-blue grid place-items-center">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-mro-navy">Arraste a planilha aqui ou clique para selecionar</p>
                <span className="text-[10px] text-mro-muted mt-1 block">Aceita arquivos exportados do SAP VT11</span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};
