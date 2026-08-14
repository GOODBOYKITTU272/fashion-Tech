-- Supabase Migration: 005_w6_publisher_state.sql
-- Description: Extend publishing_attempts table with idempotency_key, dry_run flag, status model, request/response metadata, and timestamps

-- 1. Add non-destructive columns to publishing_attempts
ALTER TABLE public.publishing_attempts
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS dry_run BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'BLOCKED', 'DRY_RUN_SUCCESS', 'LIVE_PENDING', 'LIVE_SUCCESS', 'RETRYABLE_ERROR', 'PERMANENT_ERROR')),
  ADD COLUMN IF NOT EXISTS request_metadata JSONB,
  ADD COLUMN IF NOT EXISTS response_metadata JSONB,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 2. Create index for fast idempotency lookup
CREATE INDEX IF NOT EXISTS idx_publishing_attempts_idempotency ON public.publishing_attempts(user_id, idempotency_key);
