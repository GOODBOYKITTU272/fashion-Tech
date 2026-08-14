# Implementation Plan
**Version:** 2.0 (Autonomous LinkedIn Official API Architecture)

---

## Phase Overview

### Phase 1: Canonical Source of Truth & Architecture Update (CURRENT)
- Update canonical docs (`01-PRD.md` through `06-Implementation-Plan.md`, `FREE-TIER-GUARDRAILS.md`).
- Document schema changes for `linkedin_connections`, `automation_settings`, `publishing_attempts`.
- Document revised n8n workflow map (W1 through W9).
- Document UI additions for Auto Mode, Pause Publishing, and LinkedIn OAuth settings.
- Commit documentation to GitHub as one single commit and wait for user approval.

### Phase 2: Database Schema & Migration Update
- Create migration `002_linkedin_official_api.sql` adding `linkedin_connections`, `automation_settings`, `publishing_attempts`, `automation_events`.
- Push schema updates to live Supabase DB.

### Phase 3: LinkedIn OAuth Setup & Settings UI
- Build server-side OAuth callback route `/api/auth/linkedin/callback`.
- Build Settings UI for Auto Mode toggle, Emergency Pause, and LinkedIn OAuth Connection Status.
- Label integration: `LINKEDIN AUTOMATION — WAITING FOR API ACCESS` until credentials/scopes are active.

### Phase 4: n8n Workflow Expansion (W1–W9)
- Configure n8n workflows for quality gating (W4), automated publishing via official API (W6), analytics collection via official API (W7), and token health check (W9).

### Phase 5: Verification & End-to-End Testing
- Test OAuth flow once LinkedIn Developer App credentials are available.
- Test failsafe triggers and Auto Mode pause rules.
