-- Supabase Migration: 016_approval_workflow_and_carousels.sql
-- Description: Add approval state machine and carousel asset columns to content_calendar and drafts

ALTER TABLE public.content_calendar
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending_approval' CHECK (approval_status IN ('pending_approval', 'approved', 'rejected', 'changes_requested')),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by TEXT,
ADD COLUMN IF NOT EXISTS approved_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS carousel_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS carousel_cover_url TEXT,
ADD COLUMN IF NOT EXISTS carousel_slide_count INTEGER;

ALTER TABLE public.drafts
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending_approval' CHECK (approval_status IN ('pending_approval', 'approved', 'rejected', 'changes_requested')),
ADD COLUMN IF NOT EXISTS approved_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS carousel_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS carousel_cover_url TEXT,
ADD COLUMN IF NOT EXISTS carousel_slide_count INTEGER;
