# Backend Database Schema
**Version:** 2.1 (Autonomous LinkedIn Official API Architecture — Refined)

---

## 1. Overview
The database is PostgreSQL hosted on Supabase. Primary keys are `UUID` generated via `gen_random_uuid()`. Row Level Security (RLS) is enabled on all tables for single-user authentication security.

---

## 2. Table Specifications

### Core Engine Tables
- `brand_profile`: Brand positioning, voice guidelines, and content rules.
- `sources`: News registry with trust scores and tiers.
- `watchlist_entities`: Designers, brands, publications tracked.
- `research_signals`: Raw articles scraped via Agent Reach.
- `topic_clusters`: Deduplicated news clusters.
- `topic_scores`: Calculated scores (US/UK fit, freshness, Pranavi alignment).
- `content_ideas`: High-level post ideas linked to pillars.
- `drafts`: Post copy, hooks, carousel outlines (PDF briefs), visual briefs.
- `draft_versions`: Version history (AI vs Human edits).
- `personal_inputs`: Stored personal memories/notes.
- `approvals`: Audit of approvals, edits, or rejection reasons.
- `content_calendar`: Weekly post slots and planned dates.
- `published_posts`: Links to LinkedIn post URN, permalink, published status (`scheduled`, `publishing`, `published`, `failed`, `needs_review`).
- `post_metrics`: Engagement stats (impressions, reactions, comments, reshares, saves).
- `weekly_reports`: AI weekly performance reviews.
- `learning_memory`: Strategic insights learned over time.

---

## 3. Extensions for Autonomous Official API Operations

### Table: `linkedin_connections`
Stores encrypted OAuth credentials and integration state machine. RLS policies deny browser read access to `access_token_ciphertext`.
```sql
CREATE TABLE public.linkedin_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    linkedin_member_urn TEXT,
    granted_scopes TEXT[],
    integration_status TEXT DEFAULT 'NOT_CONFIGURED' CHECK (
        integration_status IN (
            'NOT_CONFIGURED', 'WAITING_FOR_API_ACCESS', 'READY_FOR_OAUTH',
            'CONNECTED', 'REAUTH_REQUIRED', 'PERMISSION_MISSING', 'PAUSED', 'ERROR'
        )
    ),
    access_token_ciphertext TEXT, -- Encrypted server-side via LINKEDIN_TOKEN_ENCRYPTION_KEY
    expires_at TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ,
    reauthorization_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Note: No refresh_token column created unless approved OAuth response explicitly provides one.
```

### Table: `automation_settings`
Global automation controls and safety limits.
```sql
CREATE TABLE public.automation_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auto_mode_enabled BOOLEAN DEFAULT TRUE,
    pause_all_publishing BOOLEAN DEFAULT FALSE,
    min_confidence_score INT DEFAULT 70 CHECK (min_confidence_score BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `publishing_attempts`
Audit log of official LinkedIn Posts API requests. Secrets/Authorization headers MUST NOT be logged.
```sql
CREATE TABLE public.publishing_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    published_post_id UUID REFERENCES public.published_posts(id) ON DELETE SET NULL,
    calendar_id UUID REFERENCES public.content_calendar(id) ON DELETE SET NULL,
    attempt_number INT DEFAULT 1,
    request_type TEXT CHECK (request_type IN ('text', 'image', 'multi_image', 'video', 'document_pdf')),
    http_status INT,
    linkedin_request_id TEXT,
    error_code TEXT,
    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `automation_events`
Audit log of system failsafes and alerts.
```sql
CREATE TABLE public.automation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT CHECK (
        event_type IN (
            'FAILSAFE_TRIGGERED', 'TOKEN_EXPIRED', 'NEEDS_INPUT',
            'REAUTH_REQUIRED', 'PERMISSION_MISSING', 'QUALITY_GATE_FAILED'
        )
    ),
    severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);
```
