-- Supabase Migration: 013_research_signals_provenance.sql
-- Description: Add research signal source provenance columns (platform, query_used, runtime, agent_reach_used, trust_score)

ALTER TABLE public.research_signals
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'RSS',
ADD COLUMN IF NOT EXISTS query_used TEXT,
ADD COLUMN IF NOT EXISTS runtime TEXT DEFAULT 'cloud',
ADD COLUMN IF NOT EXISTS agent_reach_used BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 80;
