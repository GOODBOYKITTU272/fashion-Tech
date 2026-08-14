# App Flow — Autonomous LinkedIn Content Engine V2.1

---

## Autonomous Daily Execution Flow (NO Daily Manual Work)

```
[Night / 2:00 AM]
    n8n W1 (Daily Research) → Agent Reach → Supabase research_signals

[3:00 AM]
    n8n W2 (Deduplicate & Score) → AI Provider → Supabase topic_scores

[4:00 AM]
    n8n W3 (Draft Generator)
    ├── Generates Copy, Hooks & 6–8 slide PDF Carousel Brief
    └── Renders 6–8 page PDF document asset → Supabase drafts

[5:00 AM]
    n8n W4 (Automated Quality Gate)
    ├── Checks: Fact Check, Brand Voice, Duplicate Check, Personal Context
    ├── IF PASSED → Mark 'quality_passed'
    └── IF FAILED / UNVERIFIED STORY → Mark 'NEEDS REVIEW' or pick alternative topic

[Scheduled Slot Time]
    n8n W6 (LinkedIn Publisher)
    ├── State Machine Check: integration_status == 'CONNECTED'
    ├── Guard Check: AUTO MODE == ON && PAUSE_ALL == FALSE && Scope 'w_member_social' Present
    ├── Upload PDF/Media asset to LinkedIn → Publish Document Post via Official API
    ├── Save LinkedIn Post URN + Permalink to Supabase
    └── Update status to 'published' (or 'failed' on error)

[Every Evening]
    n8n W7 (Analytics Collector)
    ├── State Machine Check: Scope 'r_member_postAnalytics' Granted
    └── Official LinkedIn Analytics API → Supabase post_metrics (No estimation; missing = NULL)
```

---

## State Machine & Exception Handling Flow

```
[Integration State Monitoring (W9)]
    ├── IF expires_at < 7 days → Set status = 'REAUTH_REQUIRED' → Alert in Settings
    ├── IF API returns 401 → Set status = 'REAUTH_REQUIRED' → Pause W6 Publisher
    ├── IF Scopes Missing → Set status = 'PERMISSION_MISSING' → Display Scopes Needed
    └── IF Dev App Unapproved → Set status = 'WAITING_FOR_API_ACCESS'

[Human Overrides (Optional / Exception-Only)]
    ├── Settings Screen → View Connection Metadata (No raw tokens) & Reauthorize
    ├── Review items marked 'NEEDS REVIEW' or 'NEEDS INPUT'
    └── Manage stored Personal Experience Memory
```
