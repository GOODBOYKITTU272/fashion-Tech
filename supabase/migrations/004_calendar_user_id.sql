-- Supabase Migration: 004_calendar_user_id.sql
-- Description: Add user_id column to content_calendar with FK to auth.users and backfill target user ownership

-- 1. Add user_id column to content_calendar table
ALTER TABLE public.content_calendar
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Backfill existing records with target single-user ID (22ff14e8-10c3-44b8-a77b-1a656e1255ef)
UPDATE public.content_calendar
SET user_id = '22ff14e8-10c3-44b8-a77b-1a656e1255ef'
WHERE user_id IS NULL;

-- 3. Create index for fast user-scoped calendar queries
CREATE INDEX IF NOT EXISTS idx_calendar_user_date ON public.content_calendar(user_id, planned_date);
