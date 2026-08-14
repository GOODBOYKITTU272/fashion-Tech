-- Supabase Migration: 006_research_signal_metadata.sql
-- Description: Add non-destructive metadata columns (source_name, source_type, published_at, fingerprint) and unique fingerprint index to public.research_signals

-- 1. Add non-destructive metadata columns to research_signals
ALTER TABLE public.research_signals
  ADD COLUMN IF NOT EXISTS source_name TEXT,
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fingerprint TEXT;

-- 2. Create index for fast fingerprint deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_research_signals_fingerprint ON public.research_signals(fingerprint) WHERE fingerprint IS NOT NULL;
