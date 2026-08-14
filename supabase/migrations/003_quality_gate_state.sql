-- Supabase Migration: 003_quality_gate_state.sql
-- Description: Add persistent quality gate, fact-check, voice, duplicate, personal context & confidence score fields

-- 1. Add quality gate columns to drafts table
ALTER TABLE public.drafts
  ADD COLUMN IF NOT EXISTS quality_gate_status TEXT DEFAULT 'pending' CHECK (quality_gate_status IN ('pending', 'passed', 'failed', 'needs_input')),
  ADD COLUMN IF NOT EXISTS voice_check_status TEXT DEFAULT 'pending' CHECK (voice_check_status IN ('pending', 'passed', 'failed', 'needs_input')),
  ADD COLUMN IF NOT EXISTS duplicate_check_status TEXT DEFAULT 'pending' CHECK (duplicate_check_status IN ('pending', 'passed', 'failed', 'needs_input')),
  ADD COLUMN IF NOT EXISTS personal_context_status TEXT DEFAULT 'passed' CHECK (personal_context_status IN ('pending', 'passed', 'failed', 'needs_input')),
  ADD COLUMN IF NOT EXISTS confidence_score INT DEFAULT 75 CHECK (confidence_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS quality_gate_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quality_gate_failure_reason TEXT;

-- 2. Add quality_gate_status column to content_calendar table
ALTER TABLE public.content_calendar
  ADD COLUMN IF NOT EXISTS quality_gate_status TEXT DEFAULT 'pending' CHECK (quality_gate_status IN ('pending', 'passed', 'failed', 'needs_input')),
  ADD COLUMN IF NOT EXISTS quality_gate_checked_at TIMESTAMPTZ;

-- 3. Create index for fast query filtering on passed quality candidates
CREATE INDEX IF NOT EXISTS idx_drafts_quality_status ON public.drafts(quality_gate_status);
CREATE INDEX IF NOT EXISTS idx_calendar_quality_status ON public.content_calendar(quality_gate_status);
