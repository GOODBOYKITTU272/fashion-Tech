# UI/UX Design Brief — Autonomous Control Room
**Version:** 2.1

---

## 1. Design System & Aesthetics
- **Theme:** Dark Mode Glassmorphism (`#0a0b0e` base, subtle radial glow, translucent panels)
- **Typography:** Outfit (Headings) + Inter (Body)
- **Color Tokens:**
  - Primary: Muted Purple (`#9b5de5`)
  - Accent: Sand / Terracotta (`#f4a261`)
  - Status Success: Emerald Green (`#34d399`)
  - Status Alert: Crimson Red (`#f87171`)
  - Status Caution: Amber Yellow (`#fbbf24`)

---

## 2. Updated Control Room Screens

### Today / Inbox Screen (`/`)
- **Automation Status Header:** `AUTO MODE: ON` badge, `PAUSE ALL PUBLISHING` button, Next Scheduled Post countdown.
- **Integration State Banner:** Displays state machine indicator:
  - `WAITING_FOR_API_ACCESS`: Banner reading `LINKEDIN AUTOMATION — WAITING FOR API ACCESS`.
  - `CONNECTED`: Green connection indicator with last verified timestamp.
  - `REAUTH_REQUIRED`: Amber alert banner with **"Reauthorize LinkedIn"** action.
- **Top 5 Opportunity Cards:** Visual score rings (0-100), breakdown bars, recommended format (including **Document/PDF Carousel Post**).

### Post Editor (`/editor`)
- Optional review screen for manual override or inspection.
- Fact-check status indicators and AI confidence scores.
- PDF Document Carousel preview (6–8 slide PDF rendering preview).

### Content Calendar (`/calendar`)
- Status tags: `Scheduled Automatically`, `Publishing`, `Published`, `Failed`, `Needs Review`.
- Pillar distribution indicator (2 Educational PDF Carousels, 1 Storytelling Text/Image, 1 Soft Selling Image/Text).

### Analytics (`/analytics`)
- Automatic data visualization fed by official LinkedIn Analytics API (`r_member_postAnalytics`).
- Displays unmanipulated, exact returned metrics (impressions, reactions, comments, reshares, saves).
- Unavailable metrics (e.g. geographical breakdowns if unreturned) display `NULL / Unavailable` — no estimation.
- CSV Upload retained as secondary historical fallback only.

### Settings (`/settings`)
- **Automation Control Section:** Auto Mode ON/OFF toggle, Emergency Pause.
- **LinkedIn OAuth Manager:**
  - Status Badge (`NOT_CONFIGURED`, `WAITING_FOR_API_ACCESS`, `CONNECTED`, `REAUTH_REQUIRED`, etc.)
  - Authorized Account URN (e.g., `urn:li:person:XXXX`)
  - Granted Scopes list (`w_member_social`, `r_member_postAnalytics`, etc.)
  - Token Expiry Countdown (`expires_at`)
  - Last Verified Timestamp
  - **"Connect / Reauthorize LinkedIn"** button
  - *Note:* Raw `access_token` is never rendered or transmitted to the browser.
- **Brand Memory & Personal Experience Bank:** Manage stored personal notes so AI doesn't fabricate stories.
