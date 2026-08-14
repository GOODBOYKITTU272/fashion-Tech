# App Flow — Pranavi Fashion Content Engine V1

---

## Daily Loop (Core Flow)

```
[Night / Early Morning]
    n8n W1 runs → Agent Reach scrapes sources → raw signals → Supabase research_signals
    n8n W2 runs → deduplication + AI scoring → top 5 ranked → topic_scores

[Morning — Pranavi opens app]
    → Today / Research Inbox
    → Sees top 5 opportunities with scores
    → Selects one

    → Clicks "Create Draft"
    → n8n W3 webhook fires → AI generates hooks, body, carousel outline
    → Draft saved to Supabase drafts + draft_versions (AI version)

    → Post Editor opens
    → Pranavi reads draft, picks a hook
    → Adds personal input (text note / photo / experience)
    → Edits body if needed
    → Clicks APPROVE or REJECT (with reason)

    → If APPROVED → content_ideas status = 'approved' → appears in calendar
    → If REJECTED → rejection reason stored in approvals table → learning_memory updated

[Later]
    → Pranavi goes to Content Calendar
    → Sees the week's 4-post plan
    → Opens LinkedIn native scheduler
    → Pastes copy + uploads carousel
    → Marks post as "Scheduled" in the app
    → After publishing → marks as "Published" + adds LinkedIn URL
```

---

## Sunday Weekly Planning Flow

```
[Every Sunday — automated]
    n8n W5 runs
    → Checks content_calendar for next 7 days
    → If fewer than 4 posts exist → fills slots with:
        Monday / Thursday = Educational
        Wednesday = Storytelling
        Saturday = Soft Selling
    → Drafts appear in calendar with status = 'draft'

[Pranavi reviews on Sunday evening]
    → Opens Calendar screen
    → Reviews the week's suggested plan
    → Can move, replace, or override slots with real events
    → Approves the plan
```

---

## Post Lifecycle States

```
topic scored → content idea created → draft generated → personal input added
→ [approved | edited | rejected]
→ approved → calendar slot → [scheduled → published]
                            → [skipped]
```

---

## Analytics Entry Flow

```
[After publishing]
    → LinkedIn provides analytics (impressions, reactions, follower data)
    → Pranavi exports or manually enters data
    → Analytics screen allows CSV import or manual entry
    → Data saved to post_metrics linked to published_posts

[Weekly — automated]
    n8n W7 runs
    → Analyzes post_metrics from past 7 days
    → Generates weekly_reports record
    → Updates learning_memory with evidence-based insights
    → Pranavi sees report in Analytics screen
```

---

## Screen Navigation

```
Bottom Nav (Mobile) / Sidebar (Desktop)
├── Today          → /
├── Post Editor    → /editor/[id]
├── Calendar       → /calendar
├── Analytics      → /analytics
└── Settings       → /settings
```

---

## Event Override Flow

```
Pranavi has a real-world event (fashion show, workshop, craft visit)
    → Opens Calendar
    → Clicks "Override" on any slot
    → Enters event description
    → System suggests content angle based on event
    → Pranavi approves angle
    → Draft generated with event context
    → Standard approval flow continues
    → Published content is authentic — based on real experience
```
