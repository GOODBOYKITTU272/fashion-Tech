-- Supabase Migration: 015_linkedin_native_truth.sql
-- Description: Add external_timezone and external_fingerprint to public.content_calendar for safe deduplication and IST timezone handling

ALTER TABLE public.content_calendar
ADD COLUMN IF NOT EXISTS external_timezone TEXT DEFAULT 'Asia/Kolkata',
ADD COLUMN IF NOT EXISTS external_fingerprint TEXT UNIQUE;

-- Allow quality_gate_status to be NULL for external non-evaluated posts
ALTER TABLE public.content_calendar
ALTER COLUMN quality_gate_status DROP NOT NULL;
