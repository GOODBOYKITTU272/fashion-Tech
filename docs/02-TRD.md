# TRD — Technical Requirements Document
**Version:** 2.0 (Autonomous LinkedIn Official API Architecture)

---

## 1. System Architecture

```
Agent Reach (research connector)
        ↓
n8n Community Edition (orchestration W1–W9)
        ↓
AI Provider Abstraction (OpenAI / Gemini / Ollama)
        ↓
Supabase PostgreSQL (database & state management)
        ↓
LinkedIn Official API (Publishing: w_member_social | Analytics: r_member_postAnalytics)
        ↓
Next.js Control Room (Auto Mode Monitoring, OAuth Settings, Exception Override)
```

---

## 2. LinkedIn OAuth & Security Architecture

| Requirement | Implementation |
|-------------|----------------|
| Authentication | Official OAuth 2.0 Authorization Code Flow |
| Credentials | `LINKEDIN_CLIENT_ID` (Server-side/Env) and `LINKEDIN_CLIENT_SECRET` (Server-side ONLY) |
| Scopes | `w_member_social`, `r_member_postAnalytics`, `r_member_profileAnalytics` (or approved equivalents) |
| Token Storage | Encrypted in `linkedin_connections` table in Supabase |
| Expiry Tracking | Auto-refresh tracking & re-auth alerts when token expires (< 7 days remaining) |
| Callback Route | `/api/auth/linkedin/callback` (Next.js server-side handler) |
| Frontend Display | Settings page shows connection state: Connected / Disconnected, Granted Scopes, Expiry, Reconnect button |

---

## 3. Database Schema Extensions

### New Tables
1. **`linkedin_connections`**: Stores OAuth tokens, refresh tokens, user URN, granted scopes, expires_at.
2. **`automation_settings`**: Global `auto_mode_enabled` (boolean), `pause_all_publishing` (boolean), `min_confidence_score` (int).
3. **`publishing_attempts`**: Audit log of API requests, responses, HTTP status, retry counts, failure reasons.
4. **`automation_events`**: Event audit trail (e.g. `FAILSAFE_TRIGGERED`, `TOKEN_EXPIRED`, `NEEDS_INPUT`).

### Extended Tables
- **`published_posts`**: Stores `linkedin_post_urn`, `linkedin_permalink`, `publication_status` (`scheduled`, `publishing`, `published`, `failed`, `needs_review`).

---

## 4. n8n Workflows (W1–W9 Map)

| Workflow ID | Name | Trigger | Description |
|-------------|------|---------|-------------|
| **W1** | Daily Research | Daily Cron | Scrapes signals via Agent Reach → writes `research_signals` |
| **W2** | Deduplicate & Score | Post-W1 | Clusters signals, calls AI scoring → writes `topic_scores` |
| **W3** | Draft Generator | Auto / Webhook | Generates post copy, hooks, carousel outline → saves to `drafts` |
| **W4** | Automated Quality Gate | Post-W3 | Runs fact-check, voice check, duplicate check, personal input check |
| **W5** | Weekly Scheduler | Sunday Cron | Assigns top quality-passed drafts to 4 weekly calendar slots |
| **W6** | LinkedIn Publisher | Schedule Cron | Checks Auto Mode & Quality Gate → publishes via Official API → logs URN |
| **W7** | LinkedIn Analytics Collector | Daily Cron | Calls Official Analytics API → writes metrics to `post_metrics` |
| **W8** | Weekly Review | Sunday Night | Analyzes performance → updates `learning_memory` and recommendations |
| **W9** | Auth Health Check | Daily Cron | Verifies LinkedIn OAuth token expiry → alerts if re-auth is required |

---

## 5. Safety & Exception Handling

Publication is automatically blocked and flagged as `NEEDS REVIEW` if:
1. `auto_mode_enabled` is set to `FALSE` or `pause_all_publishing` is `TRUE`.
2. Fact-check status is `flagged` or confidence score is below threshold.
3. Content requires new personal experience not found in stored `learning_memory` / Personal Memory.
4. LinkedIn OAuth token is expired or unauthorized.
5. Official LinkedIn API returns 4xx / 5xx permanent error.
