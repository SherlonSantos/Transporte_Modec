'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { parseCteWorkbook } from '@/lib/cteParser';
import { CteIngestionModel } from '@/lib/cteTypes';

interface CteUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataIngested: (model: CteIngestionModel) => void;
}

export const CteUploadModal: React.FC<CteUploadModalProps> = ({
  isOpen,
  onClose,
  onDataIngested,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ filename: string; count: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const model = parseCteWorkbook(buffer, file.name);

      if (!model || model.records.length === 0) {
        throw new Error('A planilha selecionada está vazia ou não possui colunas válidas de CT-e / DT.');
      }

      setPreview({
        filename: file.name,
        count: model.records.length,
      });

      onDataIngested(model);

      setTimeout(() => {
        setLoading(false);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar planilha de CT-es.');
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
            <FileSpreadsheet className="w-5 h-5 text-mro-blue" />
            <h3 className="font-bold text-base text-mro-navy">Upload Base de CT-es (Kanban)</h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-mro-muted mb-3 leading-relaxed">
          Faça o upload da planilha <b>CONTROLE_CTES_2026_KANBAN.xlsx</b> (formatos .xlsx, .xls, .xlsm). O sistema processa automaticamente as abas <b>BANCO DE DADOS</b>, <b>TECNOLOG</b> e <b>DICIONARIO KANBAN</b>.
        </p>

        <div className="mb-4 px-3 py-2 bg-blue-50/70 border border-blue-200/60 rounded-lg text-[11px] text-blue-900 flex items-center gap-2">
          <span className="font-semibold text-mro-blue">Armazenamento Local:</span>
          <span>A base de CT-e é atualizada e salva offline de forma 100% segura no seu navegador.</span>
        </div>

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
              ? 'border-mro-blue bg-blue-50/20'
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
              <p className="text-xs font-bold text-mro-navy">Processando e consolidando CT-es...</p>
            </div>
          ) : preview ? (
            <div className="flex flex-col items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-8 h-8" />
              <p className="text-xs font-bold text-mro-navy">{preview.filename}</p>
              <span className="text-[11px] text-mro-muted">{preview.count.toLocaleString('pt-BR')} CT-es importados</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-mro-blue grid place-items-center">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-mro-navy">Arraste a planilha de CT-es aqui ou clique para selecionar</p>
                <span className="text-[10px] text-mro-muted mt-1 block">Aceita CONTROLE_CTES_2026_KANBAN.xlsx</span>
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
