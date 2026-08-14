-- Supabase Migration: 012_research_signals_relevance.sql
-- Description: Add fashion relevance gate metadata columns to public.research_signals

ALTER TABLE public.research_signals
ADD COLUMN IF NOT EXISTS relevance_status TEXT DEFAULT 'pending' CHECK (relevance_status IN ('pending', 'accepted', 'rejected', 'failed')),
ADD COLUMN IF NOT EXISTS relevance_score INTEGER,
ADD COLUMN IF NOT EXISTS topic_family TEXT,
ADD COLUMN IF NOT EXISTS relevance_reason TEXT,
ADD COLUMN IF NOT EXISTS relevance_checked_at TIMESTAMPTZ;
