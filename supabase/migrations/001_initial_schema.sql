-- Supabase Migration: 001_initial_schema.sql
-- Description: Core schema for Pranavi Fashion Content Engine

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Brand Profile
CREATE TABLE public.brand_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_name TEXT NOT NULL,
    positioning TEXT NOT NULL,
    target_audience TEXT NOT NULL,
    voice_guidelines TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Sources Registry
CREATE TABLE public.sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    tier INT NOT NULL CHECK (tier IN (1, 2, 3)),
    trust_score INT NOT NULL DEFAULT 50,
    category TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Watchlist Entities
CREATE TABLE public.watchlist_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- e.g., 'designer', 'brand', 'publication'
    relevance_score INT DEFAULT 50,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Research Signals (Raw Data)
CREATE TABLE public.research_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
    url TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    raw_content TEXT,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE
);

-- 5. Topic Clusters
CREATE TABLE public.topic_clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    primary_signal_id UUID REFERENCES public.research_signals(id),
    cluster_title TEXT NOT NULL,
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Topic Scores
CREATE TABLE public.topic_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id UUID REFERENCES public.topic_clusters(id) ON DELETE CASCADE,
    freshness_score INT NOT NULL,
    source_trust_score INT NOT NULL,
    us_relevance_score INT NOT NULL,
    uk_relevance_score INT NOT NULL,
    pranavi_alignment_score INT NOT NULL,
    total_opportunity_score INT NOT NULL,
    scored_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Content Ideas
CREATE TABLE public.content_ideas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id UUID REFERENCES public.topic_clusters(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    angle TEXT NOT NULL,
    funnel TEXT NOT NULL, -- e.g., 'top', 'middle', 'bottom'
    format TEXT NOT NULL, -- e.g., 'carousel', 'text', 'image'
    status TEXT DEFAULT 'pending', -- 'pending', 'drafted', 'rejected'
    planned_slot TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Drafts
CREATE TABLE public.drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_idea_id UUID REFERENCES public.content_ideas(id) ON DELETE CASCADE,
    current_version_id UUID, -- Will be updated when versions are created
    carousel_outline JSONB,
    visual_brief JSONB,
    fact_check_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Draft Versions
CREATE TABLE public.draft_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draft_id UUID REFERENCES public.drafts(id) ON DELETE CASCADE,
    version_no INT NOT NULL,
    author_type TEXT NOT NULL CHECK (author_type IN ('AI', 'human')),
    hook TEXT,
    body TEXT,
    cta TEXT,
    hashtags JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: Circular dependency between drafts and draft_versions handled by application logic or separate alter statement.

-- 10. Personal Inputs
CREATE TABLE public.personal_inputs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draft_id UUID REFERENCES public.drafts(id) ON DELETE CASCADE,
    input_type TEXT NOT NULL, -- 'text', 'image', 'audio'
    text_value TEXT,
    media_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Approvals
CREATE TABLE public.approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draft_id UUID REFERENCES public.drafts(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('approved', 'edited', 'rejected')),
    rejection_reason TEXT,
    notes TEXT,
    acted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Content Calendar
CREATE TABLE public.content_calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_idea_id UUID REFERENCES public.content_ideas(id),
    draft_id UUID REFERENCES public.drafts(id),
    planned_date DATE NOT NULL,
    planned_time TIME,
    pillar TEXT NOT NULL, -- 'Education', 'Storytelling', 'Soft Selling'
    format TEXT NOT NULL,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'scheduled', 'published')),
    override_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Published Posts
CREATE TABLE public.published_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    calendar_id UUID REFERENCES public.content_calendar(id),
    linkedin_post_url TEXT,
    native_post_id TEXT,
    published_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Post Metrics
CREATE TABLE public.post_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    published_post_id UUID REFERENCES public.published_posts(id) ON DELETE CASCADE,
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

-- 15. Weekly Reports
CREATE TABLE public.weekly_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    week_start DATE NOT NULL,
    summary TEXT NOT NULL,
    recommendations JSONB,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Learning Memory
CREATE TABLE public.learning_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL, -- e.g., 'hook_performance', 'topic_resonance'
    insight TEXT NOT NULL,
    confidence_score INT DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Network Recommendations (Phase 2)
CREATE TABLE public.network_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_url TEXT NOT NULL,
    name TEXT NOT NULL,
    relevance_reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'connected', 'ignored')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add simple RLS (Single-user system, all access to authenticated users)
-- In a real scenario, this would be locked to Pranavi's user ID.
ALTER TABLE public.brand_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON public.brand_profile FOR ALL TO authenticated USING (true);
