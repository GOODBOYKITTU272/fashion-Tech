# Backend Database Schema
**Version:** 2.3 (Autonomous LinkedIn Official API Architecture — Hardened Audit Log & AES-GCM Auth Tag)

---

## 1. Overview
The database is PostgreSQL hosted on Supabase. Primary keys are `UUID` generated via `gen_random_uuid()`. Row Level Security (RLS) is enabled on all tables. 

To guarantee physical column-level isolation for sensitive OAuth secrets, **safe metadata and secret credentials are stored in separate tables**. Supabase browser clients are granted read-only access to safe metadata (`linkedin_connections`), while secrets (`linkedin_credentials`) are 100% inaccessible to browser roles and readable ONLY by trusted server-side code executing with the Supabase service-role key.

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

## 3. Official LinkedIn API Extensions

### Table 1: `linkedin_connections` (Browser-Safe Metadata Only)
Stores non-sensitive connection status and metadata. Safe for browser `SELECT` by authenticated user.
```sql
CREATE TABLE public.linkedin_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    linkedin_member_urn TEXT,
    granted_scopes TEXT[],
    integration_status TEXT NOT NULL DEFAULT 'NOT_CONFIGURED' CHECK (
        integration_status IN (
            'NOT_CONFIGURED', 'WAITING_FOR_API_ACCESS', 'READY_FOR_OAUTH',
            'CONNECTED', 'REAUTH_REQUIRED', 'PERMISSION_MISSING', 'PAUSED', 'ERROR'
        )
    ),
    auth_status TEXT NOT NULL DEFAULT 'valid' CHECK (
        auth_status IN ('valid', 'expiring_soon', 'expired', 'revoked')
    ),
    expires_at TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ,
    reauthorization_required BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_linkedin_connections_user UNIQUE (user_id)
);
```

### Table 2: `linkedin_credentials` (Server-Only Secret Storage)
Stores AES-256-GCM encrypted tokens. **Zero browser access.** RLS is enabled with NO SELECT/INSERT/UPDATE/DELETE policies for `anon` or `authenticated` roles. Readable strictly by trusted server-side code / service-role.
```sql
CREATE TABLE public.linkedin_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES public.linkedin_connections(id) ON DELETE CASCADE,
    access_token_ciphertext TEXT NOT NULL, -- AES-256-GCM encrypted token string
    encryption_iv TEXT NOT NULL,           -- Initialization Vector / Nonce for AES-256-GCM
    encryption_auth_tag TEXT NOT NULL,     -- Authentication Tag for AES-256-GCM integrity
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_linkedin_credentials_conn UNIQUE (connection_id)
);
```

### Table 3: `automation_settings`
Global automation controls tied to the authenticated user.
```sql
CREATE TABLE public.automation_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    auto_mode_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    pause_all_publishing BOOLEAN NOT NULL DEFAULT FALSE,
    min_confidence_score INT NOT NULL DEFAULT 70 CHECK (min_confidence_score BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_automation_settings_user UNIQUE (user_id)
);
```

### Table 4: `publishing_attempts`
Audit log of official LinkedIn Posts API requests. Secrets, OAuth codes, and Authorization headers MUST NOT be logged.
```sql
CREATE TABLE public.publishing_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    published_post_id UUID REFERENCES public.published_posts(id) ON DELETE SET NULL,
    calendar_id UUID REFERENCES public.content_calendar(id) ON DELETE SET NULL,
    attempt_number INT NOT NULL DEFAULT 1,
    request_type TEXT NOT NULL CHECK (
        request_type IN ('text', 'image', 'multi_image', 'video', 'document_pdf')
    ),
    http_status INT,
    linkedin_request_id TEXT,
    error_code TEXT,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table 5: `automation_events`
Audit log of system failsafes, alerts, and state transitions.
```sql
CREATE TABLE public.automation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (
        event_type IN (
            'FAILSAFE_TRIGGERED', 'TOKEN_EXPIRED', 'NEEDS_INPUT',
            'REAUTH_REQUIRED', 'PERMISSION_MISSING', 'QUALITY_GATE_FAILED'
        )
    ),
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);
```

---

## 4. Row Level Security Policies

```sql
-- Enable RLS on all 5 new tables
ALTER TABLE public.linkedin_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishing_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_events ENABLE ROW LEVEL SECURITY;

-- 1. linkedin_connections: Authenticated user can read their own safe metadata
CREATE POLICY "user_read_own_connection" ON public.linkedin_connections
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 2. linkedin_credentials: NO POLICIES for anon or authenticated.
-- Browser SELECT/INSERT/UPDATE/DELETE is 100% BLOCKED.
-- Service-role bypasses RLS for trusted server-side token encryption/decryption.

-- 3. automation_settings: Authenticated user can read/update their own settings
CREATE POLICY "user_manage_own_settings" ON public.automation_settings
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. publishing_attempts: Read-only for authenticated owner
CREATE POLICY "user_read_own_attempts" ON public.publishing_attempts
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 5. automation_events: Read-only for authenticated owner
CREATE POLICY "user_read_own_events" ON public.automation_events
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
```
