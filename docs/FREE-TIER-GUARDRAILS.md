# FREE-TIER GUARDRAILS
**Pranavi Fashion Content Engine — V1**
*Rule: NO automatic upgrade to paid plans. Ever.*

---

## GitHub

| | |
|--|--|
| **Why we use it** | Version control, code storage, CI/CD trigger for Vercel |
| **Open source?** | N/A — hosted service |
| **Free tier** | Unlimited private repos, unlimited collaborators for personal use |
| **What triggers charges** | GitHub Actions minutes beyond 2,000/month (we are not using Actions), GitHub Copilot, team features |
| **How to avoid charges** | Do not enable paid add-ons. Do not add org-level billing. |
| **Fallback** | Self-host Gitea or use GitLab Free tier |

---

## Vercel

| | |
|--|--|
| **Why we use it** | Deploy Next.js frontend — free, zero-config |
| **Open source?** | Next.js is open source; Vercel platform is proprietary |
| **Free tier** | Hobby plan: 100GB bandwidth/month, unlimited deployments, 1 user |
| **What triggers charges** | Adding team members, enabling Edge Config/KV/Postgres, exceeding 100GB bandwidth, commercial use |
| **How to avoid charges** | Stay on Hobby plan. Do not enable Vercel-specific paid features (Vercel KV, Vercel Postgres, Vercel AI SDK paid tier). The app must remain deployable as a standard Node.js app. |
| **Fallback** | Self-host with `next start` on any VPS, or use Railway/Render free tier |

---

## Supabase

| | |
|--|--|
| **Why we use it** | PostgreSQL database + Auth + Storage |
| **Open source?** | ✅ Yes — Apache 2.0 |
| **Free tier** | 500MB database, 1GB storage, 50,000 monthly active users, 2 free projects |
| **What triggers charges** | > 500MB DB, > 1GB storage, > 50k MAU, additional projects, custom domains, branching |
| **How to avoid charges** | V1 data volume is tiny. Keep old research signals pruned. Do not store binary files in Supabase Storage (use URLs). |
| **⚠️ Inactivity pause** | Free projects pause after **1 week of inactivity**. A daily research cron will keep it active. |
| **Fallback** | Self-host Supabase via Docker, or use standard PostgreSQL on any VPS |

---

## n8n

| | |
|--|--|
| **Why we use it** | Workflow orchestration — schedules, research, scoring, AI calls, DB writes |
| **Open source?** | ✅ Yes — Community Edition is fair-code (free for self-hosted) |
| **Free tier** | Self-hosted Community Edition = free forever, no workflow limits |
| **What triggers charges** | n8n Cloud (paid SaaS). DO NOT use n8n Cloud. |
| **How to avoid charges** | Always self-host. Run locally with `npx n8n` for development. Deploy on any VPS for production. |
| **Fallback** | Apache Airflow (self-hosted), or cron + custom Python scripts |

---

## Agent Reach

| | |
|--|--|
| **Why we use it** | Research connector — scrapes and normalizes fashion/tech news |
| **Open source?** | ✅ Yes — MIT License |
| **Free tier** | Fully free — no SaaS component |
| **What triggers charges** | Nothing — it's open source software |
| **How to avoid charges** | N/A |
| **Fallback** | RSS feed parsing (free), custom scraper scripts, Feedly API free tier |

---

## OpenAI

| | |
|--|--|
| **Why we use it** | Classification, scoring, hook generation, post drafting, weekly analysis |
| **Open source?** | ❌ No — proprietary API |
| **Free tier** | ❌ None — pay per token |
| **Mandatory?** | ❌ **OPTIONAL** — user has credits. Must work without it via provider abstraction. |
| **What triggers charges** | Every API call. GPT-4o mini is ~$0.15/1M input tokens — very affordable for V1 volume. |
| **How to avoid charges** | Use local Ollama models for development. Only call OpenAI for final production drafts. Set usage limits in OpenAI dashboard. |
| **Fallback** | Local Ollama (Mistral, Llama 3), Gemini free allowance, Groq free tier |

---

## Telegram

| | |
|--|--|
| **Why we use it** | Optional push notifications when new research is ready |
| **Open source?** | N/A — proprietary platform, but Bot API is free |
| **Free tier** | ✅ Bot API is completely free, no limits for standard bots |
| **What triggers charges** | Nothing for bots |
| **Mandatory?** | ❌ **OPTIONAL** — not in V1 |
| **Fallback** | Email via Resend free tier, or browser push notifications |

---

## LinkedIn

| | |
|--|--|
| **Why we use it** | Target publishing platform |
| **Open source?** | N/A |
| **Free tier** | ✅ Standard personal account is free |
| **What triggers charges** | LinkedIn Premium, Sales Navigator |
| **How to avoid charges** | Use standard account. Publish manually via native scheduler. Never use paid API tiers. |
| **Automation rule** | ❌ **NEVER automate LinkedIn login, posting, connecting, or messaging** |

---

## Rule Summary

```
NO automatic upgrade to paid plans.

Before adding any new tool, verify:
1. Is it free?
2. Is there a self-hosted / open-source alternative?
3. What triggers a charge?
4. What is the fallback?

If a tool requires payment → STOP and ask before implementing.
```
