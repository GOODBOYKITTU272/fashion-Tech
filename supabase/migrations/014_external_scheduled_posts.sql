-- Supabase Migration: 014_external_scheduled_posts.sql
-- Description: Add external scheduled post metadata columns to public.content_calendar for LinkedIn native post support

ALTER TABLE public.content_calendar
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'internal' CHECK (source IN ('internal', 'linkedin_native', 'zernio')),
ADD COLUMN IF NOT EXISTS external_platform TEXT,
ADD COLUMN IF NOT EXISTS external_post_type TEXT,
ADD COLUMN IF NOT EXISTS external_post_id TEXT,
ADD COLUMN IF NOT EXISTS external_scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS external_status TEXT;
