-- Supabase Migration: 018_automated_research_columns.sql
-- Description: Add research_run_id, status, and provenance columns to public.research_signals

ALTER TABLE public.research_signals
ADD COLUMN IF NOT EXISTS research_run_id UUID,
ADD COLUMN IF NOT EXISTS status TEXT,
ADD COLUMN IF NOT EXISTS provenance TEXT;

CREATE INDEX IF NOT EXISTS idx_research_signals_run_id ON public.research_signals(research_run_id);
