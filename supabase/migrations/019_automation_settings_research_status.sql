-- Supabase Migration: 019_automation_settings_research_status.sql
-- Description: Add research_sources_status JSONB column to public.automation_settings

ALTER TABLE public.automation_settings
ADD COLUMN IF NOT EXISTS research_sources_status JSONB DEFAULT '{}'::jsonb;
