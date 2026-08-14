-- Supabase Migration: 017_telegram_edit_instructions.sql
-- Description: Add edit_instructions and revision columns to drafts and content_calendar

ALTER TABLE public.content_calendar
ADD COLUMN IF NOT EXISTS edit_instructions TEXT;

ALTER TABLE public.drafts
ADD COLUMN IF NOT EXISTS edit_instructions TEXT;
