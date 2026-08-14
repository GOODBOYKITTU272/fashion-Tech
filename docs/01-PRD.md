# PRD — Pranavi Fashion Content Engine
**Version:** 1.1 (Markdown canonical version)
**Status:** Active — source of truth for all coding agents

---

## 1. Executive Summary

The Pranavi Fashion Content Engine is a **private, single-user** system designed to help Pranavi build a credible LinkedIn audience around fashion design, fashion technology, Indian craftsmanship, contemporary design, and her transition from Computer Science into Fashion Design.

The system continuously researches the fashion ecosystem, surfaces the strongest opportunities, creates first drafts and carousel structures, collects Pranavi's real experiences, routes content for approval, supports native LinkedIn scheduling, ingests performance data, and learns from every approval, rejection, edit and result.

V1 is **intentionally not a fully autonomous social-media bot**. Research, ranking and draft preparation are automated; personal experience, final judgment, relationship-building, comments and publishing remain human-controlled.

---

## 2. Core Constraints (Non-Negotiable)

| Constraint | Rule |
|-----------|------|
| **Cost** | Zero mandatory paid SaaS subscriptions in V1. Every required component must be free, open-source, or self-hostable. |
| **User** | Pranavi only. Single-user. No multi-tenant architecture. |
| **Platform** | LinkedIn primary. Instagram may come later. No X/Twitter in V1. |
| **Publishing** | Manual only. No automated LinkedIn posting, commenting, or connecting. |
| **AI** | OpenAI is optional — usable with credits, but never required. Must use provider abstraction. |
| **Authenticity** | System must never fabricate Pranavi's personal experiences. |

---

## 3. Product Goals

| Goal | Definition of Success |
|------|----------------------|
| Build qualified visibility | Grow followers and engagement from USA + UK, not just total follower count |
| Maintain a consistent content engine | Plan and execute 4 high-quality LinkedIn posts per week |
| Stay timely | Research fashion, craft, retail, sustainability and fashion-tech signals every day |
| Build a recognisable point of view | Strengthen the Code × Craft × Contemporary Design positioning |
| Protect authenticity | Require Pranavi's input for personal stories and major opinions |
| Learn from evidence | Improve topics, hooks, formats, timing and voice based on real performance |
| Prepare for future brand launch | Build an audience and relationship base before products exist |

---

## 4. Non-Goals for V1

- No automated mass LinkedIn connection requests
- No automated commenting or impersonated replies
- No browser automation for LinkedIn login/posting
- No multi-user creator SaaS architecture
- No Instagram or X publishing in V1
- No fully autonomous posting without approval
- No paid workflow dependency

---

## 5. Audience and Positioning

| Dimension | V1 Definition |
|-----------|--------------|
| Geography | USA + UK |
| Primary audience | Fashion-conscious consumers, fashion professionals, designers, fashion-tech people, textile/craft researchers, boutique/brand founders, stylists, buyers and collaborators |
| Brand territory | Fashion technology × Indian craftsmanship × contemporary global fashion |
| Voice | Curious, intelligent, grounded, learning in public; never pretending to be an expert where she is still learning |

---

## 6. Tech Stack

| Layer | Tool | Why |
|-------|------|-----|
| Frontend | Next.js + TypeScript | Responsive PWA, Vercel-deployable, self-hostable |
| Hosting | Vercel Free tier | Free hobby plan sufficient for V1 |
| Database | Supabase PostgreSQL | Free tier 500MB, standard PostgreSQL, self-hostable |
| Auth | Supabase Auth | Built into free tier |
| Orchestration | Self-hosted n8n Community Edition | Free forever when self-hosted |
| Research | Agent Reach (connector abstraction) | Open source |
| AI | Provider abstraction (OpenAI optional) | Never hardcoded to one provider |
| Notifications | Telegram (optional) | Free bot API |
| Publishing | Manual / LinkedIn native scheduler | No automation risk |

---

## 7. Weekly Content Cadence

**4 posts per week:**

| Pillar | Count | Example Day |
|--------|-------|-------------|
| Educational | 2 | Monday + Thursday |
| Storytelling | 1 | Wednesday |
| Soft Selling | 1 | Saturday |

---

## 8. Daily Research Loop

Research runs **every day** across:
- Fashion industry
- Fashion technology
- Indian craftsmanship and textiles
- Retail trends
- Sustainability
- Consumer behavior
- Designer and brand developments
- USA fashion market
- UK fashion market

System may gather many signals internally. Pranavi sees a **maximum of 5 ranked opportunities** per day.

---

## 9. Primary KPI — 90 Days

**North-star:** Qualified follower growth from USA + UK

| Metric | Priority |
|--------|----------|
| USA + UK follower growth | North-star |
| USA + UK share of follower base | Primary |
| Relevant profile views | Secondary |
| Meaningful comments | Secondary |
| Connection acceptance from target network | Secondary |
| DMs / collaboration signals | Secondary |
| Impressions | Diagnostic only |
| Reactions | Diagnostic only |

---

## 10. Control Room Screens (V1)

1. **Today / Research Inbox** — top 5 ranked topics, score breakdown
2. **Post Editor** — hooks, draft, personal input, carousel outline, approve/edit/reject
3. **Content Calendar** — 7-day view, 4-post mix, status management
4. **Analytics** — USA/UK growth, post performance, weekly insights
5. **Settings** — sources, brand memory, watchlist

---

## 11. Event Overrides

Real-world events (fashion shows, workshops, visits, college assignments, studio work) can override scheduled content. The system may recommend an override. Pranavi must approve it. The system never fabricates a personal story.

---

## 12. Phase Roadmap

| Phase | Scope |
|-------|-------|
| Phase 1 — Core MVP | Research, top 5, scoring, drafts, Next.js approval, calendar, manual publishing, analytics import, weekly review |
| Phase 1.5 — Visual System | Three branded carousel templates, stronger media workflow |
| Phase 2 — Network Intelligence | 5 recommended target connections/day, relationship memory |
| Phase 3 — Additional Channels | Instagram activation |
| Phase 4 — Deeper Automation | Improve analytics ingestion, source connectors, model routing |

---

## 13. Final Principle

> Automate research, organization, scoring and first drafts.
> Keep identity, judgment, relationships and final publishing human.
