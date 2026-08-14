# PRD — Pranavi Fashion Content Engine
**Version:** 2.0 (Autonomous LinkedIn Official API Architecture)
**Status:** Active — Canonical Source of Truth

---

## 1. Executive Summary

The Pranavi Fashion Content Engine is an **autonomous, single-user** system designed for maximum automation using the **OFFICIAL LinkedIn API**. It targets qualified follower growth from the USA and UK around Code × Craft × Contemporary Design.

V1 operates in **AUTO MODE by default**. Daily manual work is eliminated. The engine automatically researches daily signals, deduplicates, scores opportunities, generates content and carousel briefs, runs automated quality/fact gates, schedules posts, publishes directly through approved official LinkedIn APIs (`w_member_social`), ingests performance metrics (`r_member_postAnalytics`), and runs weekly AI optimization loops.

Human interaction is **exception-based only** (e.g. paused publishing when fact checks flag missing personal context, low confidence scores, or expired OAuth tokens).

---

## 2. Core Constraints (Non-Negotiable)

| Constraint | Rule |
|-----------|------|
| **Automation Target** | V1 is designed for autonomous LinkedIn content operations via official LinkedIn APIs (`w_member_social`, `r_member_postAnalytics`). Daily manual work is NOT required in Auto Mode. |
| **Official APIs Only** | Use ONLY official LinkedIn OAuth & approved APIs. NO Selenium, Playwright, cookie stealing, browser scraping, or unofficial bots. |
| **Cost Constraint** | Zero mandatory paid SaaS subscriptions (no Buffer, Hootsuite, Zapier, Make). Infrastructure remains free/self-hosted. OpenAI API is the approved paid exception. |
| **User & Scope** | Single-user (Pranavi only). LinkedIn target primary. |
| **Authenticity Rule** | Never fabricate personal experiences. Automation uses approved Brand Memory / Personal Experience Memory. If new context is needed, engine automatically selects another publishable topic or flags `NEEDS REVIEW`. |
| **Safety Guardrails** | Global `AUTO MODE` [ON/OFF] toggle and emergency `PAUSE ALL PUBLISHING`. System auto-pauses on fact-check failure, expired tokens, or unverified claims. |

---

## 3. Product Goals

| Goal | Definition of Success |
|------|----------------------|
| Zero-Friction Cadence | Automatically plan and publish 4 LinkedIn posts per week through official APIs |
| High Relevance | Daily automated research across 10 fashion/tech categories, ranking top 5 opportunities |
| Autonomous Operations | Auto Mode ON by default — quality gates, scheduling, publishing, and analytics run automatically |
| Authenticity Protection | System pulls from stored Personal Memory or picks alternative topics automatically without inventing stories |
| Continuous Optimization | Weekly AI analysis of post analytics to refine hook strategies, pillars, and posting times |

---

## 4. Non-Goals for V1

- No unofficial browser automation or scraping-based login to LinkedIn.
- No paid publishing intermediaries (Buffer, Hootsuite, Zapier).
- No multi-tenant SaaS architecture.
- No fabrication of unverified personal experiences.

---

## 5. LinkedIn Official Integration Architecture

### Publishing (`w_member_social`)
- Automatic text, image, and document/carousel post publishing via official API.
- Native retry logic and error logging in Supabase `publishing_attempts`.
- Storing returned LinkedIn post URNs and permalinks in `published_posts`.

### Analytics (`r_member_postAnalytics`, `r_member_profileAnalytics`)
- Automated ingestion of impressions, reactions, comments, reshares, profile views, and follower growth via n8n cron.
- Storage in `post_metrics` for weekly AI optimization.

### Status Indicator
- Until API access is granted by LinkedIn Developer portal, system labels interface: **`LINKEDIN AUTOMATION — WAITING FOR API ACCESS`**.

---

## 6. Weekly Cadence & Schedule

4 posts/week managed automatically by n8n:
- **Educational:** 2 posts (Monday & Thursday)
- **Storytelling:** 1 post (Wednesday)
- **Soft Selling:** 1 post (Saturday)

Posting times are dynamically optimized over time based on analytics feedback.

---

## 7. Control Room Overview

1. **Today / Inbox:** Auto Mode toggle, health status, next scheduled post, daily research signals.
2. **Post Editor:** Optional override & review screen showing AI/fact check status.
3. **Calendar:** Displays auto-scheduled, published, failed, and `NEEDS REVIEW` posts.
4. **Analytics:** Live dashboard populated automatically via LinkedIn Analytics API.
5. **Settings:** Automation controls (Auto Mode ON/OFF, Pause Publishing), OAuth Connection Manager (Token status, scope checker, reconnect button), and Brand Memory.
