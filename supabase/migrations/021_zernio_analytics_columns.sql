-- Supabase Migration: 021_zernio_analytics_columns.sql
-- Description: Add extra Zernio metrics columns to post_metrics table

ALTER TABLE public.post_metrics 
  ADD COLUMN IF NOT EXISTS engagement_rate NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS clicks INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saves INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS views INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reach INT DEFAULT 0;

-- Note: We store engagement_rate as NUMERIC(5,2) e.g., 13.70 for 13.7%
