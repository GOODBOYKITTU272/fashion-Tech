# Implementation Plan
**Version:** 2.2 (Autonomous LinkedIn Official API Architecture — Two-Table Token Security)

---

## Phased Rollout Plan

### Phase 1: Canonical Source of Truth Updates (COMPLETED)
- Corrected carousel terminology to **LinkedIn Document/PDF Carousel Posts**.
- Documented token lifecycle and generic `reauthorization_required` handling.
- Specified **Two-Table Token Isolation**: split safe connection metadata (`linkedin_connections`) from encrypted secret credentials (`linkedin_credentials`).
- Specified AES-256-GCM server-side encryption (`LINKEDIN_TOKEN_ENCRYPTION_KEY` + `encryption_iv`) with RLS browser denial.
- Defined explicit 8-state integration state machine (`NOT_CONFIGURED`, `WAITING_FOR_API_ACCESS`, `CONNECTED`, etc.).
- Hardened database definitions with `NOT NULL` constraints, foreign keys to `auth.users(id)`, and uniqueness rules (`uq_linkedin_connections_user`, `uq_linkedin_credentials_conn`, `uq_automation_settings_user`).
- Documented Community Management API Development vs Standard Tier policy.
- Committed documentation to GitHub and waiting for approval before creating Migration `002_linkedin_official_api.sql`.

---

### Phase 2: Database Migration 002 (Awaiting Approval)
- Create `supabase/migrations/002_linkedin_official_api.sql` containing:
  - `linkedin_connections` (browser-safe metadata, RLS enabled for user read)
  - `linkedin_credentials` (AES-256-GCM encrypted secrets, 100% RLS browser denial)
  - `automation_settings` (user-tied settings, RLS enabled)
  - `publishing_attempts` (audit log, NOT NULL hardened)
  - `automation_events` (failsafe audit, NOT NULL hardened)
- Run `npx supabase db push`.

---

### Phase 3: OAuth Manager & Settings UI Update
- Create Next.js server-side OAuth callback route `/api/auth/linkedin/callback`.
- Create `/api/linkedin/status` route exposing ONLY non-sensitive metadata from `linkedin_connections`.
- Update `/settings` screen with:
  - Integration state banners (`WAITING_FOR_API_ACCESS`, `REAUTH_REQUIRED`, `CONNECTED`).
  - Auto Mode ON/OFF toggle and Emergency Pause.
  - "Connect / Reauthorize LinkedIn" button.

---

### Phase 4: PDF Carousel Renderer & AI Endpoints
- Implement PDF document renderer for 6–8 slide carousel briefs.
- Update `/api/ai/carousel` to format slide layouts for PDF generation.

---

### Phase 5: n8n Workflows Update (W1–W9)
- Build/update n8n workflows for Quality Gate (W4), LinkedIn Publisher (W6), Analytics Collector (W7), and Auth Health Check (W9).

---

### Phase 6: End-to-End Verification
- Test OAuth flow once LinkedIn Developer App credentials are standard/approved.
- Verify state machine pauses publishing safely when `WAITING_FOR_API_ACCESS` or `REAUTH_REQUIRED`.
