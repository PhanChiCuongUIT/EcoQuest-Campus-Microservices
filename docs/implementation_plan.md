# EcoQuest Campus — UI/UX Design Specification

> **Dashboard App** cho hệ thống gamified campus sustainability.
> 3 roles: **Student**, **Moderator**, **Admin**. Không phải landing page / marketing site.

---

## 0. Current Backend Alignment

Updated: 2026-06-24

Use `docs/frontend-handoff.md` as the current API/source-of-truth. Backend now has 9 microservices: Identity Access, Green Catalog, Eco Action, Verification Policy, Reward Ledger, Leaderboard, Recognition, Report, and Notification.

Important implementation constraints for frontend agents:

- Register does not mean logged in. A new account must verify email first, then login.
- UI role switch must follow backend role inheritance: Student -> Student only; Moderator -> Student and Moderator; Admin -> Moderator and Admin.
- Moderator can submit only their own student action and cannot review their own action.
- Admin does not get Student submit mode.
- Only `ACTIVE` missions can be submitted. Pending/rejected missions are management-only.
- Evidence upload must call `/actions/evidence` first and then submit the returned `/actions/evidence/{objectKey}`.
- Report and Notification views are now in scope.
- See `docs/frontend-test-scenarios.md` for the required frontend QA checklist.

## 1. Design System

### 1.1 Color Palette

| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#1C7C54` | Primary buttons, active nav, links |
| `--color-primary-hover` | `#166B47` | Button/link hover |
| `--color-primary-light` | `#E8F5EE` | Primary tinted backgrounds |
| `--color-sidebar` | `#0D4736` | Sidebar background |
| `--color-sidebar-hover` | `#0F5A45` | Sidebar item hover |
| `--color-surface` | `#FFFFFF` | Cards, panels, modals |
| `--color-background` | `#F4F7F1` | Page background |
| `--color-background-alt` | `#EDF2E8` | Alternate rows, subtle sections |
| `--color-text` | `#17211D` | Primary text |
| `--color-text-muted` | `#5F7168` | Secondary text, labels |
| `--color-border` | `#DBE4D6` | Card/panel borders |
| `--color-border-light` | `#E6EEE1` | Table row dividers |
| `--color-success` | `#16A34A` | ACCEPTED status, approve action |
| `--color-success-bg` | `#DCFCE7` | Success badge background |
| `--color-warning` | `#D97706` | PENDING_REVIEW status, amber alerts |
| `--color-warning-bg` | `#FEF3C7` | Warning badge background |
| `--color-danger` | `#DC2626` | REJECTED status, reject action, errors |
| `--color-danger-bg` | `#FEE2E2` | Error/danger badge background |
| `--color-info` | `#0284C7` | Info banners, async state notices |
| `--color-info-bg` | `#E0F2FE` | Info banner background |
| `--color-gold` | `#D97706` | Rank #1, badges, certificate accents |
| `--color-silver` | `#94A3B8` | Rank #2 |
| `--color-bronze` | `#B45309` | Rank #3 |

> [!IMPORTANT]
> **Không** dùng purple/pink gradient, decorative blobs, hoặc toàn xanh đơn sắc. Palette xanh lá + teal + amber + neutral gray phản ánh campus sustainability theme.

### 1.2 Typography

| Element | Font | Size | Weight | Line Height |
|---|---|---|---|---|
| Body | Inter, system-ui, sans-serif | 14px | 400 | 1.5 |
| Small/Label | Inter | 12px | 500 | 1.4 |
| H1 (Page Title) | Inter | 24px | 700 | 1.3 |
| H2 (Section) | Inter | 18px | 600 | 1.35 |
| H3 (Subsection) | Inter | 16px | 600 | 1.4 |
| Stat Number | Inter | 28px | 700 | 1.2 |
| Badge/Pill | Inter | 11px | 600 | 1 |
| Button | Inter | 14px | 600 | 1 |

> [!NOTE]
> Không dùng viewport-scaled font (`clamp(2rem, 6vw, 5rem)`). Dashboard headings vừa phải, tối đa 24px cho page title. Không hero-scale typography.

**Google Font import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
```

### 1.3 Spacing Scale

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |

### 1.4 Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 4px | Badges, pills |
| `--radius-md` | 8px | Cards, panels, inputs |
| `--radius-lg` | 12px | Modals, drawers |
| `--radius-full` | 9999px | Avatar, status dots |

### 1.5 Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Cards, subtle elevation |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)` | Dropdowns, popovers |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04)` | Modals, overlays |

### 1.6 Transitions & Motion

```css
--transition-fast: 150ms ease;
--transition-normal: 200ms ease;
--transition-slow: 300ms ease;

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 1.7 Icons

Dùng **Lucide React** (`lucide-react`) — consistent, accessible, tree-shakeable.

Key icons dùng trong app:

| Context | Icon | Usage |
|---|---|---|
| Dashboard | `LayoutDashboard` | Nav item |
| Submit Action | `PlusCircle` | Nav item + FAB |
| Wallet | `Wallet` | Nav item |
| Leaderboard | `BarChart3` | Nav item |
| Certificates | `Award` | Nav item |
| Moderator Review | `ShieldCheck` | Nav item |
| Catalog Admin | `Settings` | Nav item |
| Status ACCEPTED | `CheckCircle2` | Status badge |
| Status PENDING | `Clock` | Status badge |
| Status REJECTED | `XCircle` | Status badge |
| Points | `Zap` | Stat card |
| Rank | `Trophy` | Stat card |
| Badge | `Shield` | Stat card / badge card |
| Download | `Download` | Certificate download |
| Close/Dismiss | `X` | Modal close |
| Menu | `Menu` | Mobile hamburger |
| Evidence | `Camera` | Mission requirement |
| Station | `MapPin` | Mission requirement |
| Edit | `Pencil` | Admin edit |
| Trash/Delete | `Trash2` | Admin delete |
| Info | `Info` | Async banners |

> [!TIP]
> Icon-only buttons phải có `aria-label` và tooltip. Buttons quan trọng (Submit, Approve, Reject) dùng icon + label text.

---

## 2. App Shell Layout

### 2.1 Desktop Layout (≥1024px)

```
┌──────────────────────────────────────────────────────────┐
│ ┌─────────┐ ┌──────────────────────────────────────────┐ │
│ │         │ │ Top Bar                                  │ │
│ │         │ │ Page Title    [Student ID: SV001] [🔔]   │ │
│ │ Sidebar │ ├──────────────────────────────────────────┤ │
│ │  220px  │ │                                          │ │
│ │         │ │           Main Content Area              │ │
│ │  Logo   │ │              (scrollable)                │ │
│ │  Nav    │ │                                          │ │
│ │  Role   │ │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │ │
│ │ Switcher│ │  │Stats │ │Stats │ │Stats │ │Stats │   │ │
│ │         │ │  └──────┘ └──────┘ └──────┘ └──────┘   │ │
│ │         │ │                                          │ │
│ │         │ │  ┌────────────────────────────────────┐  │ │
│ │         │ │  │         Content Section            │  │ │
│ │         │ │  └────────────────────────────────────┘  │ │
│ └─────────┘ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 2.2 Tablet Layout (768px–1023px)

- Sidebar collapsed thành icon-only (60px) hoặc overlay khi mở
- Stats grid chuyển 2 cột
- Tables giữ nguyên nhưng font size giảm nhẹ

### 2.3 Mobile Layout (< 768px)

```
┌─────────────────────┐
│ Top Bar              │
│ 🍃 EcoQuest   ☰ SV001│
├─────────────────────┤
│                     │
│   Main Content      │
│   (scrollable)      │
│                     │
│  ┌────┐ ┌────┐     │
│  │Stat│ │Stat│     │
│  └────┘ └────┘     │
│  ┌────┐ ┌────┐     │
│  │Stat│ │Stat│     │
│  └────┘ └────┘     │
│                     │
│  ┌─────────────┐   │
│  │ Mission Card │   │
│  └─────────────┘   │
│  ┌─────────────┐   │
│  │ Action Card  │   │
│  └─────────────┘   │
│                     │
├─────────────────────┤
│ 🏠  ➕  💰  📊  ⋯  │
│ Bottom Tab Nav      │
└─────────────────────┘
```

> [!IMPORTANT]
> Tables trên mobile phải chuyển thành card/list. Không hiển thị bảng ngang trên 375px.

---

## 3. Component Library

### 3.1 Sidebar Navigation

```
┌─────────────────┐
│  🍃 EcoQuest    │  ← Logo + wordmark
│                 │
│  ■ Dashboard    │  ← Active state: left accent bar + bg tint
│  □ Submit       │
│  □ Wallet       │
│  □ Leaderboard  │
│  □ Certificates │
│  ─────────────  │  ← Divider (role-specific below)
│  □ Review Queue │  ← Moderator only
│  □ Catalog      │  ← Admin only
│  □ Policy Rules │  ← Admin only (local)
│                 │
│  ┌─────────────┐│
│  │Role Switcher││
│  │ ● Student   ││  ← Active pill
│  │ ○ Moderator ││
│  │ ○ Admin     ││
│  └─────────────┘│
└─────────────────┘
```

**Nav item states:**
- Default: text `rgba(255,255,255,0.7)`, no background
- Hover: text white, background `--color-sidebar-hover`
- Active: text white, left 3px accent bar `--color-primary`, background `rgba(255,255,255,0.08)`
- Focus: visible outline `2px solid rgba(255,255,255,0.5)`

### 3.2 Role Switcher

3 segmented buttons trong sidebar footer:

| Role | Label | Color Accent | Nav Items Shown |
|---|---|---|---|
| Student | Student | `--color-primary` green | Dashboard, Submit, Wallet, Leaderboard, Certificates |
| Moderator | Moderator | `--color-warning` amber | Dashboard, Review Queue, Leaderboard |
| Admin | Admin | `--color-danger` coral | Dashboard, Catalog, Policy, Leaderboard, Adjust Points |

### 3.3 Student ID Selector

Top bar component:
```
┌──────────────────────────────────┐
│  Student:  [ SV001         ▾ ]  │
└──────────────────────────────────┘
```
- Text input with dropdown suggestions (SV001, SV002, ...) hoặc free-text
- Default: `SV001`
- Thay đổi Student ID triggers refresh tất cả student-scoped API calls

### 3.4 Status Badges

```css
.badge-accepted  { background: #DCFCE7; color: #166534; }  /* Green */
.badge-pending   { background: #FEF3C7; color: #92400E; }  /* Amber */
.badge-rejected  { background: #FEE2E2; color: #991B1B; }  /* Red   */
```

Pill shape (border-radius full), icon + text:
- ✓ ACCEPTED
- ⏳ PENDING_REVIEW
- ✕ REJECTED

### 3.5 Stat Card

```
┌──────────────────────┐
│  ⚡ Total Points     │  ← Muted label + icon
│  40                  │  ← Large stat number
│  ↑ +10 from last     │  ← Optional trend (muted small text)
└──────────────────────┘
```
- White background, subtle border, `--radius-md`
- Fixed height để layout không nhảy
- 4 cards per row desktop, 2x2 mobile

### 3.6 Mission Card

```
┌───────────────────────────────────────────┐
│  ♻️ Recycle Bottle                        │
│  RECYCLE_BOTTLE              10 pts  🟢   │
│  📷 Evidence required  📍 Station required│
│                              [ Submit ▶ ] │
└───────────────────────────────────────────┘
```
- Full-width trong list section
- Không nested card — mission card là item lặp lại
- Click "Submit" mở Submit Action Modal
- Requirements shown as small icon + label pills

### 3.7 Action History Item (Table Row / Card)

**Desktop (table row):**
```
│ 04:30  │ Recycle Bottle  │ ✓ ACCEPTED      │ +10 pts │
│ 04:31  │ Cleanup Event   │ ⏳ PENDING_REVIEW │  30 pts │
```

**Mobile (card):**
```
┌──────────────────────────────┐
│  Recycle Bottle              │
│  2 minutes ago  ✓ ACCEPTED   │
│                     +10 pts  │
└──────────────────────────────┘
```

### 3.8 Modal / Drawer

```
┌──────────────────────────────────────┐
│  ┌────────────────────────────────┐  │
│  │  📋 Submit Green Action    [✕] │  │  ← Header + close
│  │  ──────────────────────────── │  │
│  │  Student ID    [SV001      ]  │  │
│  │  Mission       [▾ Select   ]  │  │
│  │  Station       [▾ Select   ]  │  │
│  │  Evidence URL  [           ]  │  │
│  │                               │  │
│  │  📷 Evidence req  📍 Station  │  │  ← Requirement pills
│  │                               │  │
│  │  [Save Draft]    [Submit ▶ ]  │  │  ← Footer actions
│  │  ──────────────────────────── │  │
│  │  ✓ ACCEPTED  +10 points      │  │  ← Result area
│  │  Wallet update in a moment    │  │
│  └────────────────────────────────┘  │
│           (backdrop overlay)         │
└──────────────────────────────────────┘
```

- Backdrop: `rgba(0,0,0,0.4)` + backdrop-filter blur
- Modal: white, `--radius-lg`, `--shadow-lg`
- Keyboard: Escape closes, Tab trapped inside, focus on first input
- Mobile: becomes bottom drawer (slide up from bottom)

### 3.9 Toast / Banner

**Async state banner (persistent, dismissible):**
```
┌─────────────────────────────────────────────────────┐
│ ℹ️  Reward and leaderboard update may take a few    │
│     seconds after submission.              [Dismiss]│
└─────────────────────────────────────────────────────┘
```
- Info: `--color-info-bg` background, `--color-info` border-left 3px
- Success: green variant
- Error: red variant

**Toast (auto-dismiss 5s):**
- Bottom-right corner, stacked
- Slide-in animation
- Close button

### 3.10 Empty State

```
┌─────────────────────────────────────┐
│          📋                         │
│   No actions submitted yet         │
│   Start by completing a mission!   │
│                                    │
│        [ View Missions → ]         │
└─────────────────────────────────────┘
```
- Centered, muted icon, descriptive text, optional CTA
- Per view: no actions, no badges, no certificates, no pending reviews

### 3.11 Loading State

- Skeleton loaders (pulsing gray rectangles) matching card/table shapes
- Spinner for inline operations (submit button)
- Loading overlay for full-page transitions

### 3.12 Button Variants

| Variant | Background | Text | Border | Usage |
|---|---|---|---|---|
| Primary | `--color-primary` | white | none | Submit, Save, Approve |
| Secondary | `--color-primary-light` | `--color-primary` | none | Save Draft, Cancel |
| Danger | `--color-danger` | white | none | Reject, Delete |
| Outline | transparent | `--color-primary` | 1px primary | Secondary actions |
| Ghost | transparent | `--color-text-muted` | none | Dismiss, Close |

All buttons:
- `min-height: 40px` (44px on mobile for touch targets)
- `cursor: pointer`
- Hover: darken 8%
- Focus: visible ring `0 0 0 2px var(--color-primary), 0 0 0 4px rgba(28,124,84,0.2)`
- Active: darken 12%
- Disabled: opacity 0.5, cursor not-allowed
- Transitions: `var(--transition-fast)`

---

## 4. View Specifications

### 4.1 Student Dashboard

![Student Dashboard Desktop](C:\Users\ADMIN\.gemini\antigravity-ide\brain\b418cc9b-d153-411a-9e51-ee86f5c8fea0\student_dashboard_desktop_1782195206577.png)

**API calls on load:**
- `GET /rewards/wallets/{studentId}` → Total points
- `GET /leaderboards/users/{studentId}/rank?type=weekly` → Weekly rank
- `GET /rewards/wallets/{studentId}/badges` → Badge count
- `GET /recognitions/certificates/user/{studentId}` → Certificate count
- `GET /catalog/missions` → Mission list
- `GET /actions/user/{studentId}` → Recent actions

**Layout:**
1. **Stats row** — 4 stat cards (points, rank, badges, certificates)
2. **Available Missions** — List of mission cards with Submit buttons
3. **Recent Actions** — Table (desktop) / card list (mobile) with status badges

**Interactions:**
- Click mission "Submit" → opens Submit Action Modal
- Student ID change → re-fetch all data
- After submit ACCEPTED → delay 2-5s, re-fetch wallet + badges + leaderboard
- After submit PENDING_REVIEW → show pending state immediately, no wallet refresh

---

### 4.2 Submit Action Modal

![Submit Action Modal](C:\Users\ADMIN\.gemini\antigravity-ide\brain\b418cc9b-d153-411a-9e51-ee86f5c8fea0\submit_action_modal_1782195237637.png)

**Form fields:**
| Field | Type | Default | Source |
|---|---|---|---|
| Student ID | text input | Current student ID | App state |
| Mission | select dropdown | Pre-selected from clicked mission | `GET /catalog/missions` |
| Station | select dropdown | Empty / first station | `GET /catalog/stations` |
| Evidence URL | text input | Empty | User input |

**Buttons:**
- **Save Draft** → `POST /actions/drafts` — saves to Redis, shows confirmation toast
- **Submit** → `POST /actions/submit` with `idempotencyKey: crypto.randomUUID()`

**Result display:**
| Status | Display |
|---|---|
| `ACCEPTED` | ✓ Green checkmark, "+{points} points", async notice |
| `PENDING_REVIEW` | ⏳ Amber clock, "Sent for moderator review" |
| `REJECTED` | ✕ Red X, `policyReason` text |
| `409` Duplicate | ⚠️ "This action was already submitted" warning |
| `400` Validation | Red field highlights + error message |

---

### 4.3 Wallet & Badges

![Wallet & Badges + Leaderboard](C:\Users\ADMIN\.gemini\antigravity-ide\brain\b418cc9b-d153-411a-9e51-ee86f5c8fea0\wallet_leaderboard_views_1782195325154.png)

**Sections:**

**Wallet Overview:**
- Large point total with icon
- Visual indicator (progress ring hoặc bar)

**Transaction History:**
- List sorted by `occurredOn` desc
- Each row: `+{points}`, source action type, timestamp, truncated `sourceActionId`
- Empty state: "No transactions yet"

**Badges Grid (3×2 desktop, 2×3 mobile):**
- 6 badge cards from catalog
- **Unlocked:** colored icon, name, unlock date, glow/border accent
- **Locked:** grayed out, lock overlay, required points shown
- Badge definitions from `GET /catalog/badges`, unlock status from `GET /rewards/wallets/{id}/badges`

---

### 4.4 Leaderboard

**Tabs:** Weekly | Monthly (underlined active tab)

**Podium Top 3:**
- Rank #1: gold accent `--color-gold`
- Rank #2: silver accent `--color-silver`
- Rank #3: bronze accent `--color-bronze`
- Large rank number, student ID, points

**Remaining Rankings:** Clean list below podium

**Rank Lookup:**
- Student ID input + "Lookup" button
- Shows: "Rank #{rank}, {score} points"
- Null rank: "Not ranked yet"

**Admin: Close Season** (visible when role = Admin):
- Season ID input (default: `WEEK-{today}`)
- Type: weekly / monthly dropdown
- Winners count: number input (default: 10)
- "Close Season" danger button with confirmation
- After close: async banner "Certificates being generated...", delayed refresh 5s

---

### 4.5 Moderator Review

![Moderator Review](C:\Users\ADMIN\.gemini\antigravity-ide\brain\b418cc9b-d153-411a-9e51-ee86f5c8fea0\moderator_review_desktop_1782195245606.png)

**Data:** `GET /actions/review` → pending actions queue

**Review Card layout:**
```
┌──────────────────────────────────────────────────────┐
│  SV001 • 2 min ago                PENDING_REVIEW ⏳  │
│  Mission: Cleanup Event (CLEANUP_EVENT)              │
│  Policy: "Missing evidence"                          │
│  Evidence: None provided                             │
│                                                      │
│                       [ ✓ Approve ]  [ ✕ Reject ]   │
└──────────────────────────────────────────────────────┘
```

**Approve flow:**
- `PUT /actions/{id}/approve`
- Remove from queue with slide-out animation
- Toast: "Action approved. Points will be granted shortly."
- Async: wallet + leaderboard update 2-5s later

**Reject flow:**
- Click "Reject" → opens inline reason input or small modal
- Text input for rejection reason (required)
- `PUT /actions/{id}/reject` with `{ reason: "..." }`
- Remove from queue
- Toast: "Action rejected."

**Empty state:** "No pending actions to review ✓"

---

### 4.6 Certificates

![Certificates View](C:\Users\ADMIN\.gemini\antigravity-ide\brain\b418cc9b-d153-411a-9e51-ee86f5c8fea0\certificates_view_1782195333812.png)

**Certificate card:**
```
┌──────────────────────────────────┐
│  ═══════════════════════════════ │  ← Gold accent stripe
│  🏆 Weekly Certificate           │
│  Season: WEEK-2026-06-23        │
│  Rank: #1  •  40 pts            │
│  Issued: June 23, 2026          │
│                                  │
│        [ 📥 Download PDF ]       │
└──────────────────────────────────┘
```

- Download: `window.open(/recognitions/certificates/{id}/download, "_blank")`
- Optional Reward Claims section below certificates
- Empty state: "No certificates yet. Keep completing missions!"

---

### 4.7 Admin: Catalog Management

![Admin Catalog](C:\Users\ADMIN\.gemini\antigravity-ide\brain\b418cc9b-d153-411a-9e51-ee86f5c8fea0\admin_catalog_desktop_1782195278705.png)

**Tabs:** Missions | Stations | Badges

**Each tab:**
- Search/filter input
- "+ Create" primary button
- Data table with edit actions
- Inline or slide-panel create/edit form

**Mission table columns:**
ID, Title, Action Type, Base Points, Evidence Required (✓/✕), Description, Actions

**Station table columns:**
ID, Name, Code, Type, Location, Active (✓/✕), Actions

**Badge table columns:**
Code, Name, Description, Required Points, Actions

**Forms use:**
- Text inputs, number inputs, toggle switches, textareas, select dropdowns
- Validation with inline errors
- `POST /catalog/missions`, `POST /catalog/stations`, `POST /catalog/badges`
- `PUT /catalog/badges/{code}` for editing badge definitions

---

### 4.8 Admin: Policy Rules (Local-Only)

> [!WARNING]
> Policy Admin gọi trực tiếp `http://localhost:8090/policies/rules`, **không** qua Gateway. Phải đánh dấu rõ "⚠️ LOCAL ONLY" trong UI.

**Table columns:**
Action Type, Points, Evidence Required, Station Required, Daily Limit, Active

**Edit:** inline hoặc modal, `PUT http://localhost:8090/policies/rules/{actionType}`

---

## 5. Mobile Responsive Strategy

![Mobile Dashboard](C:\Users\ADMIN\.gemini\antigravity-ide\brain\b418cc9b-d153-411a-9e51-ee86f5c8fea0\mobile_student_dashboard_1782195289118.png)

### Breakpoints

| Breakpoint | Width | Layout Changes |
|---|---|---|
| Mobile S | 375px | 1 column, bottom tab nav, card lists |
| Mobile L | 425px | Same as 375px with slightly more space |
| Tablet | 768px | 2 column grids, collapsed sidebar |
| Desktop | 1024px | Full sidebar, 3-4 column grids |
| Desktop L | 1440px | Max content width, comfortable spacing |

### Key Responsive Rules

1. **Sidebar** → Bottom tab navigation (5 tabs: Home, Submit, Wallet, Leaderboard, More)
2. **Stats grid** → 2×2 on mobile, 4×1 on desktop
3. **Tables** → Card list format on mobile
4. **Modals** → Bottom drawer (slide up) on mobile
5. **Mission cards** → Full-width stacked on mobile
6. **Touch targets** → Minimum 44×44px on mobile
7. **Bottom nav** → 56px height, icons + small labels

---

## 6. Accessibility Checklist (WCAG AA)

### Contrast

| Element | Foreground | Background | Ratio | Pass |
|---|---|---|---|---|
| Body text | #17211D | #F4F7F1 | 12.4:1 | ✅ AA |
| Muted text | #5F7168 | #F4F7F1 | 4.5:1 | ✅ AA |
| Primary button text | #FFFFFF | #1C7C54 | 4.8:1 | ✅ AA |
| ACCEPTED badge | #166534 | #DCFCE7 | 6.2:1 | ✅ AA |
| PENDING badge | #92400E | #FEF3C7 | 5.8:1 | ✅ AA |
| REJECTED badge | #991B1B | #FEE2E2 | 5.5:1 | ✅ AA |
| Sidebar text | #FFFFFF | #0D4736 | 9.1:1 | ✅ AAA |

### Keyboard Navigation
- [x] Tab order follows visual layout
- [x] Focus visible on all interactive elements (2px ring)
- [x] Modal focus trapping (Tab cycles within modal)
- [x] Escape closes modals/drawers
- [x] Enter/Space activates buttons
- [x] Arrow keys for tab selection, dropdown navigation

### ARIA
- [x] `role="dialog"` + `aria-modal="true"` for modals
- [x] `aria-label` on icon-only buttons
- [x] `aria-live="polite"` for async update banners/toasts
- [x] `aria-selected` for active tab
- [x] `aria-current="page"` for active nav item
- [x] Status badges use `aria-label` for screen readers

### Motion
- [x] `prefers-reduced-motion` respected
- [x] No auto-playing animations
- [x] Transitions ≤ 300ms

---

## 7. UX Data Behavior Rules

### After Actions

| Event | Immediate | Delayed (2-5s) |
|---|---|---|
| Submit ACCEPTED | Refresh action list | Refresh wallet, badges, leaderboard |
| Submit PENDING | Refresh action list | — |
| Submit REJECTED | Show reason | — |
| Moderator Approve | Remove from queue | Refresh wallet, leaderboard |
| Moderator Reject | Remove from queue | — |
| Close Season | Show snapshot | Refresh certificates (5s delay) |
| Duplicate 409 | Show warning | — |

### Error States

| Error | HTTP | UI Response |
|---|---|---|
| Duplicate submit | 409 | ⚠️ "This action was already submitted" |
| Validation error | 400 | Red field highlight + error message |
| Server error | 500 | ❌ "Something went wrong. Please try again." |
| Network error | — | ❌ "Cannot reach server. Check your connection." |
| Backend not running | — | Info banner "Start backend to load data" |

### Empty States
- No missions: "No missions available"
- No actions: "No actions submitted yet. Start your first mission!"
- No badges: "Complete missions to unlock badges"
- No certificates: "No certificates yet. Keep going!"
- No pending reviews: "All caught up! No actions pending review. ✓"
- No transactions: "No reward transactions yet"
- No leaderboard: "No rankings yet this period"

---

## 8. File Structure

```
src/
├── api/
│   └── ecoquestApi.js          # Axios client + API functions
├── components/
│   ├── AppShell.jsx            # Sidebar + TopBar + Main layout
│   ├── Sidebar.jsx             # Navigation + Role Switcher
│   ├── TopBar.jsx              # Student ID selector + controls
│   ├── BottomNav.jsx           # Mobile bottom tab navigation
│   ├── StatCard.jsx            # Reusable stat display card
│   ├── StatusBadge.jsx         # ACCEPTED / PENDING / REJECTED pill
│   ├── MissionCard.jsx         # Mission item with submit trigger
│   ├── ActionItem.jsx          # Action history row/card
│   ├── Modal.jsx               # Accessible modal wrapper
│   ├── Toast.jsx               # Toast notification system
│   ├── EmptyState.jsx          # Reusable empty state display
│   ├── LoadingSkeleton.jsx     # Skeleton loader patterns
│   ├── AsyncBanner.jsx         # Persistent info/warning banners
│   └── DataTable.jsx           # Responsive table → card list
├── views/
│   ├── StudentDashboard.jsx    # Main student view
│   ├── SubmitActionModal.jsx   # Submit eco action modal/drawer
│   ├── WalletBadges.jsx        # Wallet + transactions + badges
│   ├── Leaderboard.jsx         # Weekly/monthly + rank lookup
│   ├── ModeratorReview.jsx     # Pending queue + approve/reject
│   ├── Certificates.jsx        # Certificate cards + download
│   ├── AdminCatalog.jsx        # Mission/Station/Badge CRUD
│   └── AdminPolicy.jsx         # Local-only policy rules
├── App.jsx                      # App shell + routing + role state
├── main.jsx                     # React entry point
└── styles.css                   # CSS variables + responsive + components
```

---

## 9. Implementation Priority

| Priority | View | Complexity | API Dependencies |
|---|---|---|---|
| ?? P0 | Auth Login/Register/Forgot Password | Medium | 5 endpoints |
| 🔴 P0 | App Shell + Role Switcher | Medium | None |
| 🔴 P0 | Student Dashboard | Medium | 6 endpoints |
| 🔴 P0 | Submit Action Modal | High | 4 endpoints |
| 🟡 P1 | Wallet & Badges | Medium | 3 endpoints |
| 🟡 P1 | Leaderboard | Medium | 4 endpoints |
| 🟡 P1 | Moderator Review | Medium | 3 endpoints |
| 🟢 P2 | Certificates | Low | 2 endpoints |
| 🟢 P2 | Admin Catalog | High | 6 endpoints |
| ⚪ P3 | Admin Policy (local) | Low | 2 endpoints (direct) |

---

## Design Decisions Confirmed

Use these choices when designing and coding the frontend. They are no longer open questions:

1. Palette: green / teal / amber / neutral gray is approved for the campus sustainability tone.
2. Theme: both light and dark mode are required.
3. Desktop navigation: fixed left sidebar.
4. Mobile navigation: bottom navigation with Dashboard, Submit, Wallet, Leaderboard, and More.
5. Submit Action: modal overlay on desktop and bottom drawer on mobile.
6. Role switcher: sidebar footer on desktop; More or compact top control on mobile.
7. Admin Adjust Points: Admin-only panel/action, with optional secondary Wallet entry point for Admin role.
8. Reward Claims: use the real Recognition reward offer catalog from `GET /recognitions/rewards?studentId=...`; do not hardcode demo cards or expose custom reward name as the source of truth.
9. Auth: use the new backend `identity-access-service` for login, register, forgot password, reset password, and `/auth/me`.

---

## Auth Scope For Frontend Agent

The backend now includes a dedicated `identity-access-service` microservice with its own PostgreSQL `identity_db`. Use it for the frontend entry flow:

- `POST /auth/login`
- `POST /auth/register`
- `GET /auth/me`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

Seeded demo accounts all use password `EcoQuest@123`:

- `student@ecoquest.local` -> role `STUDENT`, studentId `SV001`
- `moderator@ecoquest.local` -> role `MODERATOR`
- `admin@ecoquest.local` -> role `ADMIN`

Frontend should persist `accessToken` and `user` in `localStorage`, call `/auth/me` on boot, and map backend roles to Student/Moderator/Admin navigation. Registration creates student accounts only. Forgot password returns a demo reset token directly because there is no email service.

Important scope note: Identity issues signed tokens and Catalog, Action, Reward, Leaderboard, Recognition, and Policy Admin now require bearer tokens for protected APIs. Backend also enforces role authorization: Student self-service, Moderator review, and Admin catalog/policy/reward/season operations. A UI role switcher must not override the logged-in user's token role.

---

## Backend Alignment Update

Codex backend review resolved the implementation-blocking issues:

1. Catalog delete is now supported by the Catalog microservice and routed through Gateway:
   - `DELETE /catalog/missions/{id}`
   - `DELETE /catalog/stations/{id}`
   - `DELETE /catalog/badges/{code}`
   - `GET /reports/analytics/export?period=weekly|monthly|yearly` for current-period Admin PDF export
   - `GET /reports/analytics/export?period=weekly&year=2026&week=18`, `period=monthly&year=2026&month=2`, or `period=yearly&year=2025` for selected historical period export
   - Frontend can implement real delete for Admin Catalog. Use a confirmation dialog before calling delete.
2. Policy Admin direct API remains local-only and intentionally not routed through Gateway:
   - `GET http://localhost:8090/policies/rules`
   - `PUT http://localhost:8090/policies/rules/{actionType}`
   - Backend allows local browser CORS for `http://localhost:3000` and `http://127.0.0.1:3000`.
   - UI must still mark this screen as "LOCAL ONLY".
3. Final frontend decisions:
   - Light and dark mode are required. Use CSS variables, default to the user's system preference, persist the selected theme in `localStorage`, and expose a visible top-bar theme toggle.
   - Palette stays green / teal / amber / neutral gray for light mode. Dark mode should use deep green/slate surfaces while preserving status colors and WCAG AA contrast.
   - Desktop uses a fixed left sidebar; mobile uses bottom navigation with Dashboard, Submit, Wallet, Leaderboard, and More.
   - Submit Action is a modal overlay on desktop and a bottom drawer on mobile.
   - Role switcher stays in the sidebar footer on desktop. On mobile, place role switching inside More or a compact top control if needed.
   - Admin Adjust Points should be an Admin-only panel/action, not a primary student wallet action. It may also appear as a secondary action when viewing a wallet as Admin.
   - Reward Claims should use the backend Recognition reward catalog. The backend now owns coupon offer names, requirements, stock, expiry and duplicate-claim idempotency.
4. Ignore the local image paths in this document if the referenced files are not available. Text specs and `docs/frontend-handoff.md` are the source of truth.
