# PRD — Pranavi Fashion Content Engine
**Version:** 2.1 (Autonomous LinkedIn Official API Architecture — Refined)
**Status:** Active — Canonical Source of Truth

---

## 1. Executive Summary

The Pranavi Fashion Content Engine is an **autonomous, single-user** system designed for maximum automation using the **OFFICIAL LinkedIn API** (Community Management API platform). It targets qualified follower growth from the USA and UK around Code × Craft × Contemporary Design.

V1 operates in **AUTO MODE by default**. Daily manual work is eliminated. The engine automatically handles daily research signals, deduplication, opportunity scoring, draft copy generation, 6–8 slide PDF/document visual brief creation, automated quality/fact gates, scheduling, and direct publishing through approved official LinkedIn APIs (`w_member_social`), as well as automated metrics ingestion (`r_member_postAnalytics`, `r_member_profileAnalytics`) and weekly AI optimization loops.

Human interaction is **exception-based only** (e.g. paused publishing when fact checks flag missing personal context, low confidence scores, or when re-authorization is required).

---

## 2. Core Constraints (Non-Negotiable)

| Constraint | Rule |
|-----------|------|
| **Automation Target** | V1 is designed for autonomous LinkedIn content operations via official LinkedIn APIs. Daily manual work is NOT required in Auto Mode when integration state is `CONNECTED`. |
| **Official APIs Only** | Use ONLY official LinkedIn OAuth & approved APIs. NO Selenium, Playwright, cookie stealing, browser scraping, or unofficial bots. |
| **Carousel Format** | Organic carousels are NOT supported natively by LinkedIn Posts API. In V1, "Carousel" means: AI slide structure → render 6-8 page PDF/document → upload as LinkedIn document asset → publish as an **organic document/PDF carousel-style post**. |
| **Cost Constraint** | Zero mandatory paid SaaS subscriptions (no Buffer, Hootsuite, Sprout Social, Zapier, Make). Infrastructure remains free/self-hosted. OpenAI API is the approved paid exception. |
| **User & Scope** | Single-user (Pranavi only). LinkedIn target primary. |
| **Authenticity Rule** | Never fabricate personal experiences. System uses approved Brand Memory / Personal Memory. If new context is needed, engine automatically selects another publishable topic or flags `NEEDS REVIEW`. |
| **Safety Guardrails** | Global `AUTO MODE` [ON/OFF] toggle and emergency `PAUSE ALL PUBLISHING`. System auto-pauses on fact-check failure, token expiration, or unverified claims. |
| **Analytics Truth** | Primary metrics source is official LinkedIn Analytics API. Never invent or estimate unavailable metrics (e.g. USA/UK geography splits if unreturned by API). Unavailable metrics remain `NULL`. CSV upload is fallback/historical only. |

---

## 3. LinkedIn Official API Capabilities & Content Types

### Supported Content Types (Posts API)
- Text posts
- Single image posts
- Multi-image posts (where permitted by scope)
- Video posts (future phase)
- **LinkedIn document/PDF carousel-style posts** (6–8 slide PDF document upload)

### Integration State Machine
System publishing and analytics depend on explicit integration states:
- `NOT_CONFIGURED`
- `WAITING_FOR_API_ACCESS` (Displayed until developer app scopes are granted)
- `READY_FOR_OAUTH`
- `CONNECTED`
- `REAUTH_REQUIRED`
- `PERMISSION_MISSING`
- `PAUSED`
- `ERROR`

System ONLY attempts automated publishing (W6) when `integration_status = CONNECTED`, `w_member_social` scope is granted, `AUTO MODE = ON`, `PAUSE ALL = FALSE`, and `QUALITY GATE = PASSED`. Missing API access is NEVER treated as an application failure.

---

## 4. Weekly Cadence & Schedule

4 posts/week managed automatically by n8n:
- **Educational:** 2 posts (Monday & Thursday — PDF/document carousels)
- **Storytelling:** 1 post (Wednesday — text/image)
- **Soft Selling:** 1 post (Saturday — image/text)

Posting times are dynamically optimized over time based on analytics feedback.
