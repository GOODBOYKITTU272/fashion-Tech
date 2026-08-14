-- Supabase Migration: 011_draft_image_metadata.sql
-- Description: Add text/image provider, model, prompt, storage URL, and status metadata to public.drafts

ALTER TABLE public.drafts
ADD COLUMN IF NOT EXISTS text_provider TEXT DEFAULT 'openrouter',
ADD COLUMN IF NOT EXISTS text_model TEXT DEFAULT 'google/gemini-3.5-flash',
ADD COLUMN IF NOT EXISTS image_provider TEXT,
ADD COLUMN IF NOT EXISTS image_model TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS image_prompt TEXT,
ADD COLUMN IF NOT EXISTS image_generation_status TEXT DEFAULT 'none' CHECK (image_generation_status IN ('none', 'pending', 'completed', 'skipped', 'failed'));
