# App Flow — Autonomous LinkedIn Content Engine V2

---

## Autonomous Daily Flow (NO Manual Work Required)

```
[Night / 2:00 AM]
    n8n W1 (Daily Research) → Agent Reach → Supabase research_signals

[3:00 AM]
    n8n W2 (Deduplicate & Score) → AI Provider → Supabase topic_scores

[4:00 AM]
    n8n W3 (Draft Generator) → AI Provider → Copy, Hooks & Carousel Outline → Supabase drafts

[5:00 AM]
    n8n W4 (Automated Quality Gate)
    ├── Checks: Fact Check, Brand Voice, Duplicate Check, Personal Context
    ├── IF PASSED → Mark 'quality_passed'
    └── IF FAILED / UNVERIFIED STORY → Mark 'NEEDS REVIEW' or pick alternative topic

[Scheduled Slot Time]
    n8n W6 (LinkedIn Publisher)
    ├── Check: AUTO MODE == ON && PAUSE_ALL == FALSE && Token Valid
    ├── Call Official LinkedIn API (w_member_social)
    ├── Save LinkedIn Post URN + Permalink to Supabase
    └── Update status to 'published' (or 'failed' on error)

[Every Evening]
    n8n W7 (Analytics Collector) → LinkedIn Official Analytics API → Supabase post_metrics
```

---

## Human Exception Flow (Optional / Manual Overrides Only)

```
Pranavi opens Control Room (Optional)
├── View Auto Mode Status [ON / OFF]
├── View LinkedIn OAuth Connection & Expiry Status
├── Review any items flagged 'NEEDS REVIEW' or 'NEEDS INPUT'
├── Add new personal experiences to Brand Memory (if desired)
└── Manually override schedule or pause publishing if needed
```
