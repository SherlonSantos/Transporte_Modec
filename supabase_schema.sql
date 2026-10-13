-- ==============================================================================
-- SCRIPT DE CRIAÇÃO DO BANCO DE DADOS — TRANSPORTE MODEC & AUDAX (SUPABASE)
-- Execute este script completo no "SQL Editor" do seu painel Supabase.
-- ==============================================================================

-- 1. Habilitar extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela Principal de Ordens de Transporte (DTs)
CREATE TABLE IF NOT EXISTS public.transport_records (
    dt TEXT PRIMARY KEY,
    status INTEGER NOT NULL DEFAULT 0,
    local TEXT DEFAULT '',
    route TEXT DEFAULT '',
    itinerary_description TEXT DEFAULT '',
    supplier TEXT DEFAULT '',
    type TEXT DEFAULT '',
    type_process TEXT DEFAULT '',
    expedition_type TEXT DEFAULT '',
    created_by TEXT DEFAULT '',
    modified_by TEXT DEFAULT '',
    container TEXT DEFAULT '',
    seal TEXT DEFAULT '',
    sling TEXT DEFAULT '',
    denom TEXT DEFAULT '',
    free_capacity NUMERIC DEFAULT 0,
    created TIMESTAMPTZ,
    modified TIMESTAMPTZ,
    plan_end TIMESTAMPTZ,
    reg_date TIMESTAMPTZ,
    load_start TIMESTAMPTZ,
    load_end TIMESTAMPTZ,
    proc_date TIMESTAMPTZ,
    forecast_start TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    forecast_end TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    raw JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Índices de Alta Performance para o Dashboard
CREATE INDEX IF NOT EXISTS idx_transport_records_status ON public.transport_records (status);
CREATE INDEX IF NOT EXISTS idx_transport_records_local ON public.transport_records (local);
CREATE INDEX IF NOT EXISTS idx_transport_records_route ON public.transport_records (route);
CREATE INDEX IF NOT EXISTS idx_transport_records_forecast_end ON public.transport_records (forecast_end);
CREATE INDEX IF NOT EXISTS idx_transport_records_created ON public.transport_records (created);
CREATE INDEX IF NOT EXISTS idx_transport_records_actual_end ON public.transport_records (actual_end);

-- 4. Tabela de Configurações Compartilhadas (Mapeamento de Navios, Metas de SLA, Limites)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabela de Histórico e Auditoria de Ingestões (Uploads de Planilhas)
CREATE TABLE IF NOT EXISTS public.upload_logs (
    id BIGSERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    record_count INTEGER NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Habilitar Políticas de Segurança (Row Level Security - RLS)
ALTER TABLE public.transport_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_logs ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de Leitura e Escrita Públicas (Anon Key)
-- Permite leitura e escrita pelo painel web autenticado com a chave anônima pública
DROP POLICY IF EXISTS "Permitir leitura pública em transport_records" ON public.transport_records;
CREATE POLICY "Permitir leitura pública em transport_records"
    ON public.transport_records FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Permitir inserção e atualização em transport_records" ON public.transport_records;
CREATE POLICY "Permitir inserção e atualização em transport_records"
    ON public.transport_records FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir acesso completo em system_settings" ON public.system_settings;
CREATE POLICY "Permitir acesso completo em system_settings"
    ON public.system_settings FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir acesso completo em upload_logs" ON public.upload_logs;
CREATE POLICY "Permitir acesso completo em upload_logs"
    ON public.upload_logs FOR ALL
    USING (true)
    WITH CHECK (true);

-- 8. Habilitar o Supabase Realtime para Notificação em Tempo Real no Painel
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'transport_records'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.transport_records;
    END IF;
END $$;
