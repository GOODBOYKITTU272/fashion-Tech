# TRD — Technical Requirements Document
**Version:** 2.1 (Autonomous LinkedIn Official API Architecture — Refined)

---

## 1. System Architecture & Component Flow

```
Agent Reach (research connector)
        ↓
n8n Community Edition (orchestration W1–W9)
        ↓
AI Provider Abstraction (OpenAI / Gemini / Ollama)
        ↓
Supabase PostgreSQL (state management & audit logs)
        ↓
PDF Document Generator (for 6–8 slide document/PDF carousel posts)
        ↓
LinkedIn Official API (Posts API: w_member_social | Analytics API: r_member_postAnalytics)
        ↓
Next.js Control Room (Auto Mode Monitoring, OAuth Manager, State Machine UI)
```

---

## 2. OAuth Token Lifecycle & Security Architecture

### Token Lifecycle
LinkedIn's 3-legged OAuth 2.0 flow issues access tokens that expire after a set duration (typically 60 days). The system does NOT assume an automatic background `refresh_token` exists unless explicitly provided by the approved tier.

Token Lifecycle fields:
- `access_token_ciphertext` (AES-256 encrypted string)
- `expires_at` (TIMESTAMPTZ)
- `granted_scopes` (TEXT[])
- `last_verified_at` (TIMESTAMPTZ)
- `auth_status` (`valid` | `expiring_soon` | `expired` | `revoked`)
- `reauthorization_required` (BOOLEAN)

When `expires_at` is < 7 days away or an API call returns 401 Unauthorized:
- `auth_status` is updated to `expiring_soon` or `expired`.
- `reauthorization_required` is set to `TRUE`.
- `integration_status` transitions to `REAUTH_REQUIRED`.
- Automated publishing (W6) pauses safely.
- Settings UI displays a prominent **"LinkedIn Reauthorization Required"** button.

### Server-Side Secure Token Storage
1. **Server-Only Encryption**: Encryption and decryption occur strictly server-side using a symmetric key (`LINKEDIN_TOKEN_ENCRYPTION_KEY`) stored ONLY in server environment variables.
2. **RLS & Security Boundary**: Supabase Row Level Security (RLS) policies prohibit browser clients from selecting `access_token_ciphertext`.
3. **Frontend Exposure**: The browser API `/api/linkedin/status` ONLY exposes safe metadata:
   - `connected` (boolean)
   - `linkedin_member_urn` (string)
   - `granted_scopes` (array)
   - `expires_at` (timestamp)
   - `last_verified_at` (timestamp)
   - `integration_status` (enum)

---

## 3. Integration State Machine

The system enforces strict state-based gating before attempting API calls:

```
[NOT_CONFIGURED]
       ↓ (Client ID & Secret set in .env)
[WAITING_FOR_API_ACCESS] (Displayed until official developer portal scopes granted)
       ↓ (Scopes approved)
[READY_FOR_OAUTH]
       ↓ (User completes OAuth 3-legged flow)
[CONNECTED] ──(Token expires / 401)──> [REAUTH_REQUIRED] ──(Re-auth completed)──> [CONNECTED]
       │
       ├──(Missing scopes)────────────> [PERMISSION_MISSING]
       ├──(User toggle)───────────────> [PAUSED]
       └──(Fatal API error)───────────> [ERROR]
```

### Automation Execution Guard
n8n W6 (Publisher) executes ONLY if ALL of the following are true:
- `integration_status === 'CONNECTED'`
- `granted_scopes` includes `w_member_social`
- `auto_mode_enabled === TRUE`
- `pause_all_publishing === FALSE`
- `quality_gate_status === 'PASSED'`

---

## 4. Document / PDF Carousel Pipeline

Since native organic carousels are NOT supported by the LinkedIn Posts API:
1. W3 generates 6–8 slide text & layout JSON structures.
2. Server-side generator renders the slides into a 6–8 page PDF document.
3. W6 uploads the PDF as a LinkedIn `document` asset via the Assets/Media API.
4. W6 publishes the post attaching the document URN via the Posts API.

---

## 5. n8n Workflows Map (W1–W9)

| ID | Name | Trigger | Purpose |
|----|------|---------|---------|
| **W1** | Daily Research | Daily Cron | Scrapes signals via Agent Reach → writes `research_signals` |
| **W2** | Deduplicate & Score | Post-W1 | Clusters signals, calls AI scoring → writes `topic_scores` |
| **W3** | Draft Generator | Auto / Webhook | Generates post copy, hooks, PDF carousel brief → writes `drafts` |
| **W4** | Automated Quality Gate | Post-W3 | Runs fact-check, voice check, duplicate check, personal context check |
| **W5** | Weekly Scheduler | Sunday Cron | Assigns quality-passed drafts to 4 weekly calendar slots |
| **W6** | LinkedIn Publisher | Slot Cron | Verifies state machine & guard → uploads PDF/media → publishes via Official API |
| **W7** | LinkedIn Analytics Collector | Daily Cron | Calls `r_member_postAnalytics` → writes `post_metrics` |
| **W8** | Weekly Review | Sunday Night | Analyzes performance → updates `learning_memory` and recommendations |
| **W9** | Auth Health Check | Daily Cron | Checks `expires_at` → updates `integration_status` to `REAUTH_REQUIRED` if < 7d |
