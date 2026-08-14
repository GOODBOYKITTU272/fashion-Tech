-- Supabase Migration: 009_pipeline_runs.sql
-- Description: Create public.pipeline_runs table for persisting full W1->W6 production automation execution runs and ID traceability

CREATE TABLE IF NOT EXISTS public.pipeline_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    current_stage TEXT NOT NULL DEFAULT 'W1_INGESTION',
    status TEXT NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED', 'BLOCKED')),
    error_code TEXT,
    failure_reason TEXT,
    research_signal_id UUID REFERENCES public.research_signals(id) ON DELETE SET NULL,
    topic_cluster_id UUID REFERENCES public.topic_clusters(id) ON DELETE SET NULL,
    draft_id UUID REFERENCES public.drafts(id) ON DELETE SET NULL,
    calendar_id UUID REFERENCES public.content_calendar(id) ON DELETE SET NULL,
    publishing_attempt_id UUID REFERENCES public.publishing_attempts(id) ON DELETE SET NULL,
    execution_metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_user ON public.pipeline_runs(user_id, started_at DESC);

ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_full_access" ON public.pipeline_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);
