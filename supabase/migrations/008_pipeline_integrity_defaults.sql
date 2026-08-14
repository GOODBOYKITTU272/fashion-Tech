-- Supabase Migration: 008_pipeline_integrity_defaults.sql
-- Description: Remove optimistic defaults for quality_gate_status and confidence_score to enforce strict fail-closed pipeline integrity for future rows

ALTER TABLE public.drafts
  ALTER COLUMN quality_gate_status SET DEFAULT 'pending',
  ALTER COLUMN confidence_score DROP DEFAULT,
  ALTER COLUMN confidence_score SET DEFAULT NULL;

ALTER TABLE public.content_calendar
  ALTER COLUMN quality_gate_status SET DEFAULT 'pending',
  ALTER COLUMN confidence_score DROP DEFAULT,
  ALTER COLUMN confidence_score SET DEFAULT NULL;
