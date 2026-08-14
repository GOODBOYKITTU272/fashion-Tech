# TRD — Technical Requirements Document
**Pranavi Fashion Content Engine — V1**

---

## 1. Architecture Overview

```
Agent Reach (research connector)
        ↓
self-hosted n8n Community Edition (orchestration)
        ↓
AI Provider Abstraction (OpenAI optional / Ollama / free model)
        ↓
Supabase PostgreSQL (database)
        ↓
Next.js Control Room (frontend)
        ↓
Vercel Free Tier (hosting)
        ↓
LinkedIn (manual publishing by Pranavi)
```

---

## 2. Frontend

| Requirement | Specification |
|-------------|--------------|
| Framework | Next.js 16+ with TypeScript |
| Router | App Router (`/src/app/`) |
| Styling | Vanilla CSS — no Tailwind |
| Design | Dark glassmorphism, responsive |
| Fonts | Inter + Outfit via Google Fonts |
| Responsive | iPhone, Android, tablet, desktop |
| Mobile layout | Stacked cards, bottom nav, large tap targets |
| Deployment | Vercel Hobby Free tier |
| Portability | Must run with `next start` on any Node.js host |
| Secrets | NEVER expose service-role key or AI keys to browser |

### Required Routes

| Route | Screen |
|-------|--------|
| `/` | Today / Research Inbox |
| `/editor/[id]` | Post Editor |
| `/calendar` | Content Calendar |
| `/analytics` | Analytics Dashboard |
| `/settings` | Sources, Brand Memory, Watchlist |

### Environment Variables (frontend only)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_N8N_WEBHOOK_GENERATE_DRAFT=
```

Only `NEXT_PUBLIC_*` variables reach the browser. All others are server-side only.

---

## 3. Database

| Requirement | Specification |
|-------------|--------------|
| Engine | PostgreSQL (via Supabase) |
| Auth | Supabase Auth — Pranavi logs in with email |
| RLS | Enabled on ALL tables |
| Policy | All tables locked to authenticated user only |
| Keys in browser | Anon key only — never service-role key |
| Portability | Standard PostgreSQL — no Supabase-specific extensions except uuid-ossp |
| Migrations | `/supabase/migrations/` — numbered SQL files |
| Seed | `/supabase/seed.sql` |

### Tables (16 — V1)

`brand_profile` · `sources` · `watchlist_entities` · `research_signals` · `topic_clusters` · `topic_scores` · `content_ideas` · `drafts` · `draft_versions` · `personal_inputs` · `approvals` · `content_calendar` · `published_posts` · `post_metrics` · `weekly_reports` · `learning_memory`

*`network_recommendations` deferred to Phase 2.*

---

## 4. Workflow Orchestration (n8n)

| Requirement | Specification |
|-------------|--------------|
| Edition | Community Edition — self-hosted |
| Cloud | ❌ Do not use n8n Cloud |
| Workflow storage | `/n8n/workflows/*.json` |
| Credentials | n8n credential store — never in workflow JSON |
| Dev setup | `npx n8n` on localhost:5678 |
| Production | Docker or VPS |

### Required Workflows

| ID | Name | Trigger |
|----|------|---------|
| W1 | Daily Research | Daily cron |
| W2 | Deduplicate + Score | After W1 |
| W3 | Draft Generator | Webhook from frontend |
| W4 | Approval Routing | After draft created |
| W5 | Weekly Calendar | Sunday cron |
| W6 | Metrics Processing | Manual upload trigger |
| W7 | Weekly Review | Weekly cron |

---

## 5. AI Provider Abstraction

| Requirement | Specification |
|-------------|--------------|
| Abstraction | Single interface — provider swappable via env var |
| Variable | `AI_PROVIDER=openai` / `ollama` / `gemini` / `groq` |
| OpenAI | Optional — works when `OPENAI_API_KEY` is set |
| Ollama | Local option — no cost |
| Fallback | If no provider configured — show graceful "AI unavailable" state |
| Prompt storage | `/prompts/*.md` — not hardcoded in workflow JSON |

### Required Prompts

| File | Purpose |
|------|---------|
| `prompts/topic-scoring.md` | Score and classify research signals |
| `prompts/post-drafting.md` | Generate hooks, body, CTA |
| `prompts/carousel-generation.md` | Generate carousel slide outline |
| `prompts/weekly-review.md` | Analyze week performance |
| `prompts/fact-check.md` | Flag unverifiable claims |

---

## 6. Research (Agent Reach)

| Requirement | Specification |
|-------------|--------------|
| Tool | Agent Reach — open source connector |
| Isolation | Must remain a pluggable connector layer |
| Coupling | DB and app must NOT depend on Agent Reach internals |
| Output schema | Normalized JSON (see below) |
| Frequency | Daily |
| Max visible | 5 ranked opportunities per day |

### Normalized Research Signal Output

```json
{
  "title": "",
  "summary": "",
  "source_name": "",
  "source_url": "",
  "published_at": "",
  "category": "",
  "raw_text": ""
}
```

---

## 7. Security Requirements

- No secrets committed to Git — ever
- `.env.local` is gitignored — never commit
- `supabase/.temp/` is gitignored
- Service-role key: n8n server environment only
- AI provider keys: n8n server environment only
- Browser receives: Supabase anon key + n8n webhook URLs only
- RLS policy on every table: `auth.uid() = user_id` or single-user policy
- LinkedIn: no credential storage, no browser automation

---

## 8. Responsive Design Requirements

| Breakpoint | Layout |
|-----------|--------|
| `< 768px` (mobile) | Bottom navigation, stacked cards, full-width |
| `768px – 1024px` (tablet) | Collapsible sidebar or top nav |
| `> 1024px` (desktop) | Fixed sidebar + content area |

Do not simply shrink desktop tables. Use cards and stacked layouts for mobile.
