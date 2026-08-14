-- Migration 002: Autonomous LinkedIn Official API Extensions (Hardened Audit Log & AES-GCM Auth Tag)

-- 1. Browser-Safe Connection Metadata
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

-- 2. Server-Only Secret Credentials (100% RLS DENIAL to browser roles)
CREATE TABLE public.linkedin_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES public.linkedin_connections(id) ON DELETE CASCADE,
    access_token_ciphertext TEXT NOT NULL, -- AES-256-GCM encrypted token
    encryption_iv TEXT NOT NULL,           -- AES-256-GCM Initialization Vector / Nonce
    encryption_auth_tag TEXT NOT NULL,     -- AES-256-GCM Authentication Tag
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_linkedin_credentials_conn UNIQUE (connection_id)
);

-- 3. Automation Settings (User-tied Singleton)
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

-- 4. Publishing Attempts Audit Log (Owned by user_id)
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

-- 5. Automation Events Failsafe Log (Owned by user_id)
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

-- Enable RLS on all 5 new tables
ALTER TABLE public.linkedin_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishing_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_events ENABLE ROW LEVEL SECURITY;

-- linkedin_connections: Authenticated user can SELECT their own metadata
CREATE POLICY "user_read_own_connection" ON public.linkedin_connections
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- linkedin_credentials: NO POLICIES for anon or authenticated.
-- Browser SELECT/INSERT/UPDATE/DELETE is 100% BLOCKED.
-- Service-role bypasses RLS for trusted server-side AES-256-GCM encryption/decryption.

-- automation_settings: Authenticated user manages their own settings
CREATE POLICY "user_manage_own_settings" ON public.automation_settings
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Audit logs: Owner-restricted read access
CREATE POLICY "user_read_own_attempts" ON public.publishing_attempts
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_read_own_events" ON public.automation_events
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
