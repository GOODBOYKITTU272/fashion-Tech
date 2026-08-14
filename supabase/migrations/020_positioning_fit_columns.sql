-- Supabase Migration: 020_positioning_fit_columns.sql
-- Description: Add positioning_fit_score, why_it_matters_to_pranavi, transport_used, and fallback_used columns to public.research_signals

ALTER TABLE public.research_signals
ADD COLUMN IF NOT EXISTS positioning_fit_score INTEGER,
ADD COLUMN IF NOT EXISTS why_it_matters_to_pranavi TEXT,
ADD COLUMN IF NOT EXISTS transport_used TEXT,
ADD COLUMN IF NOT EXISTS fallback_used BOOLEAN DEFAULT false;
