# Backend Database Schema
**Version:** 2.0 (Autonomous LinkedIn Official API Extensions)

---

## 1. Overview
The database is PostgreSQL hosted on Supabase. Primary keys are `UUID` generated via `gen_random_uuid()`. Row Level Security (RLS) is enabled on all tables for single-user authentication security.

---

## 2. Table Specifications

### Core Engine Tables
- `brand_profile`: Brand positioning, voice guidelines, and content rules.
- `sources`: News registry with trust scores and tiers.
- `watchlist_entities`: Designers, brands, publications tracked.
- `research_signals`: Raw articles scraped via Agent Reach.
- `topic_clusters`: Deduplicated news clusters.
- `topic_scores`: Calculated scores (US/UK fit, freshness, Pranavi alignment).
- `content_ideas`: High-level post ideas linked to pillars.
- `drafts`: Post copy, hooks, carousel outlines, visual briefs.
- `draft_versions`: Version history (AI vs Human edits).
- `personal_inputs`: Stored personal memories/notes.
- `approvals`: Audit of approvals, edits, or rejection reasons.
- `content_calendar`: Weekly post slots and planned dates.
- `published_posts`: Links to LinkedIn post URN, permalink, published status.
- `post_metrics`: Engagement stats (impressions, reactions, comments, followers).
- `weekly_reports`: AI weekly performance reviews.
- `learning_memory`: Strategic insights learned over time.

### Extensions for Autonomous Official API Operations
- `linkedin_connections`: Secure OAuth tokens, refresh tokens, user URN, granted scopes, `expires_at`.
- `automation_settings`: `auto_mode_enabled` (boolean), `pause_all_publishing` (boolean), `min_confidence_score` (int).
- `publishing_attempts`: Log of official API requests, responses, HTTP status, retry counts.
- `automation_events`: Failsafe alerts, token expiration events, `NEEDS_INPUT` triggers.
