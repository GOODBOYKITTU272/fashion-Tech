-- Supabase Migration: 007_draft_quality_columns.sql
-- Description: Add non-destructive columns to public.drafts and public.content_calendar for Quality Gate and Publisher Dry-Run traceability

ALTER TABLE public.drafts
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS hook TEXT,
  ADD COLUMN IF NOT EXISTS full_content TEXT,
  ADD COLUMN IF NOT EXISTS pillar TEXT,
  ADD COLUMN IF NOT EXISTS format TEXT,
  ADD COLUMN IF NOT EXISTS quality_gate_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS voice_check_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS duplicate_check_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS personal_context_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS confidence_score INT DEFAULT 85,
  ADD COLUMN IF NOT EXISTS quality_gate_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quality_gate_failure_reason TEXT;

ALTER TABLE public.content_calendar
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS quality_gate_status TEXT DEFAULT 'passed',
  ADD COLUMN IF NOT EXISTS confidence_score INT DEFAULT 85;
