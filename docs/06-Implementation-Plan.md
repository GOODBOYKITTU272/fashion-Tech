# Implementation Plan
**Version:** 2.1 (Autonomous LinkedIn Official API Architecture — Refined)

---

## Phased Rollout Plan

### Phase 1: Canonical Source of Truth Updates (COMPLETED)
- Corrected carousel terminology to **LinkedIn Document/PDF Carousel Posts**.
- Documented token lifecycle and generic `reauthorization_required` handling.
- Documented server-side AES-256 token encryption (`LINKEDIN_TOKEN_ENCRYPTION_KEY`) with RLS protection.
- Defined explicit 8-state integration state machine (`NOT_CONFIGURED`, `WAITING_FOR_API_ACCESS`, `CONNECTED`, etc.).
- Documented Community Management API Development vs Standard Tier policy.
- Updated schema definitions for `linkedin_connections`, `automation_settings`, `publishing_attempts`, `automation_events`.
- Committed documentation to GitHub and waiting for approval before creating Migration 002.

---

### Phase 2: Database Migration 002 (Awaiting Approval)
- Create `supabase/migrations/002_linkedin_official_api.sql` containing:
  - `linkedin_connections` (with server-side RLS blocking browser token reads)
  - `automation_settings`
  - `publishing_attempts`
  - `automation_events`
- Run `npx supabase db push`.

---

### Phase 3: OAuth Manager & Settings UI Update
- Create Next.js server-side OAuth callback route `/api/auth/linkedin/callback`.
- Create `/api/linkedin/status` route exposing ONLY non-sensitive metadata (status, scopes, expires_at, member URN).
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
