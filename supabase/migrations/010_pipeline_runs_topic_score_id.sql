-- Supabase Migration: 010_pipeline_runs_topic_score_id.sql
-- Description: Add topic_score_id foreign key column to public.pipeline_runs table for complete W1->W6 ID traceability

ALTER TABLE public.pipeline_runs
ADD COLUMN IF NOT EXISTS topic_score_id UUID REFERENCES public.topic_scores(id) ON DELETE SET NULL;
