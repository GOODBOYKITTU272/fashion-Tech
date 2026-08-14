-- Supabase Migration: 001_initial_schema.sql (v2 — RLS on ALL tables)
-- Description: Core schema for Pranavi Fashion Content Engine
-- Updated: 2026-08-14 — Added RLS to all tables, fixed circular FK

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- 1. Brand Profile
CREATE TABLE public.brand_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_name TEXT NOT NULL,
    positioning TEXT NOT NULL,
    target_audience TEXT NOT NULL,
    voice_guidelines TEXT NOT NULL,
    content_rules JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Sources Registry
CREATE TABLE public.sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    tier INT NOT NULL CHECK (tier IN (1, 2, 3)),
    trust_score INT NOT NULL DEFAULT 50 CHECK (trust_score BETWEEN 0 AND 100),
    category TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Watchlist Entities
CREATE TABLE public.watchlist_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('designer', 'brand', 'publication', 'creator', 'organization')),
    relevance_score INT DEFAULT 50 CHECK (relevance_score BETWEEN 0 AND 100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Research Signals (Raw Data)
CREATE TABLE public.research_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
    url TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    raw_content TEXT,
    category TEXT,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_research_signals_processed ON public.research_signals(processed);
CREATE INDEX idx_research_signals_captured ON public.research_signals(captured_at DESC);

-- 5. Topic Clusters
CREATE TABLE public.topic_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_signal_id UUID REFERENCES public.research_signals(id) ON DELETE SET NULL,
    cluster_title TEXT NOT NULL,
    summary TEXT,
    signal_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Topic Scores
CREATE TABLE public.topic_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id UUID REFERENCES public.topic_clusters(id) ON DELETE CASCADE,
    freshness_score INT NOT NULL CHECK (freshness_score BETWEEN 0 AND 100),
    source_trust_score INT NOT NULL CHECK (source_trust_score BETWEEN 0 AND 100),
    us_relevance_score INT NOT NULL CHECK (us_relevance_score BETWEEN 0 AND 100),
    uk_relevance_score INT NOT NULL CHECK (uk_relevance_score BETWEEN 0 AND 100),
    pranavi_alignment_score INT NOT NULL CHECK (pranavi_alignment_score BETWEEN 0 AND 100),
    total_opportunity_score INT NOT NULL CHECK (total_opportunity_score BETWEEN 0 AND 100),
    scored_by_model TEXT,
    scored_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_topic_scores_total ON public.topic_scores(total_opportunity_score DESC);
CREATE INDEX idx_topic_scores_scored_at ON public.topic_scores(scored_at DESC);

-- 7. Content Ideas
CREATE TABLE public.content_ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id UUID REFERENCES public.topic_clusters(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    angle TEXT NOT NULL,
    pillar TEXT NOT NULL CHECK (pillar IN ('Educational', 'Storytelling', 'Soft Selling')),
    format TEXT NOT NULL CHECK (format IN ('carousel', 'text', 'image', 'video')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'drafted', 'approved', 'scheduled', 'published', 'rejected', 'skipped')),
    planned_slot TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Drafts (without circular FK initially)
CREATE TABLE public.drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_idea_id UUID REFERENCES public.content_ideas(id) ON DELETE CASCADE,
    current_version_id UUID, -- set via ALTER after draft_versions table is created
    carousel_outline JSONB,
    visual_brief JSONB,
    fact_check_status TEXT DEFAULT 'pending' CHECK (fact_check_status IN ('pending', 'passed', 'flagged')),
    ai_provider_used TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Draft Versions
CREATE TABLE public.draft_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID NOT NULL REFERENCES public.drafts(id) ON DELETE CASCADE,
    version_no INT NOT NULL,
    author_type TEXT NOT NULL CHECK (author_type IN ('AI', 'human')),
    hook TEXT,
    body TEXT,
    cta TEXT,
    hashtags JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(draft_id, version_no)
);

-- Now safely add the FK for current_version_id
ALTER TABLE public.drafts
    ADD CONSTRAINT fk_current_version
    FOREIGN KEY (current_version_id)
    REFERENCES public.draft_versions(id)
    ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED;

-- 10. Personal Inputs
CREATE TABLE public.personal_inputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID NOT NULL REFERENCES public.drafts(id) ON DELETE CASCADE,
    input_type TEXT NOT NULL CHECK (input_type IN ('text', 'image', 'audio', 'link')),
    text_value TEXT,
    media_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Approvals
CREATE TABLE public.approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID NOT NULL REFERENCES public.drafts(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('approved', 'edited', 'rejected')),
    rejection_reason TEXT CHECK (
        action != 'rejected' OR rejection_reason IN (
            'not relevant', 'weak', 'too generic', 'not my voice',
            'fact issue', 'bad timing', 'visual issue', 'duplicate', 'other'
        )
    ),
    notes TEXT,
    acted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Content Calendar
CREATE TABLE public.content_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_idea_id UUID REFERENCES public.content_ideas(id) ON DELETE SET NULL,
    draft_id UUID REFERENCES public.drafts(id) ON DELETE SET NULL,
    planned_date DATE NOT NULL,
    planned_time TIME,
    pillar TEXT NOT NULL CHECK (pillar IN ('Educational', 'Storytelling', 'Soft Selling')),
    format TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'scheduled', 'published', 'skipped')),
    override_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_calendar_date ON public.content_calendar(planned_date);

-- 13. Published Posts
CREATE TABLE public.published_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID REFERENCES public.content_calendar(id) ON DELETE SET NULL,
    linkedin_post_url TEXT,
    native_post_id TEXT,
    published_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Post Metrics
CREATE TABLE public.post_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    published_post_id UUID NOT NULL REFERENCES public.published_posts(id) ON DELETE CASCADE,
    snapshot_at TIMESTAMPTZ DEFAULT NOW(),
    impressions INT DEFAULT 0,
    reactions INT DEFAULT 0,
    comments INT DEFAULT 0,
    reposts INT DEFAULT 0,
    profile_views INT,
    followers_total INT,
    usa_followers INT,
    uk_followers INT,
    metadata JSONB
);

CREATE INDEX idx_post_metrics_snapshot ON public.post_metrics(snapshot_at DESC);

-- 15. Weekly Reports
CREATE TABLE public.weekly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start DATE NOT NULL UNIQUE,
    summary TEXT NOT NULL,
    best_post_id UUID REFERENCES public.published_posts(id) ON DELETE SET NULL,
    recommendations JSONB,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Learning Memory
CREATE TABLE public.learning_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN ('hook_performance', 'topic_resonance', 'format_preference', 'timing', 'audience_quality', 'other')),
    insight TEXT NOT NULL,
    confidence_score INT DEFAULT 50 CHECK (confidence_score BETWEEN 0 AND 100),
    evidence_source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY — ALL TABLES
-- Single-user system: authenticated user can do everything
-- ============================================================

ALTER TABLE public.brand_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.published_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_memory ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated user has full access (single-user system)
CREATE POLICY "auth_full_access" ON public.brand_profile FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.sources FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.watchlist_entities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.research_signals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.topic_clusters FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.topic_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.content_ideas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.drafts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.draft_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.personal_inputs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.approvals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.content_calendar FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.published_posts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.post_metrics FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.weekly_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.learning_memory FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- n8n service role also needs write access (backend workflows)
-- Grant via Supabase dashboard using service-role key in n8n credentials only
