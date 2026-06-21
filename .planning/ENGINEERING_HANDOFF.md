# GymFlow — Engineering Handoff

**Last updated:** 2026-06-21  
**Milestone:** v0.9 Beta → v1.0  
**Prepared for:** Development team

---

## What We Are Building

**GymFlow** is a zero-cost, self-hosted gym management progressive web app for independent fitness centers. Every gym owner forks the repository, configures their own Firebase project, and gets a fully-featured management system — no monthly SaaS fees, no shared infrastructure, complete data ownership.

The app runs entirely in the browser as vanilla JavaScript ES modules backed by Firebase Auth + Cloud Firestore. No build step, no npm at runtime, no frameworks. It deploys free on GitHub Pages.

### The Three Users

| Role | What they do in the app |
|---|---|
| **Owner** | Manages members, collects payments, tracks renewals, assigns trainers, views reports, configures the gym |
| **Member** | Views their own membership, checks in, tracks their fitness progress and workouts |
| **Trainer** | Checks in, sees their assigned members, delivers and logs workout sessions |

---

## What Is Already Built (Phases 1–6 ✅)

The full operational backbone is live and stable.

| Capability | Detail |
|---|---|
| **Member management** | Full profile, plan assignment, status (Active / Expiring / Expired / Suspended / Pending), search & filter |
| **Membership plans** | Unlimited plans with custom duration and pricing |
| **Payments** | Record payments, printable receipts, filter by member/status/date |
| **Renewals** | 30-day queue, one-form renewal that auto-computes the new end date |
| **Attendance** | Owner check-in + member self check-in, history |
| **WhatsApp reminders** | Pre-filled wa.me deep links for expiring members, send-log |
| **Trainer roster** | CRUD, self check-in, assign trainer to member |
| **Workout templates** | Owner creates named reusable workout plans |
| **Progress tracking** | Owner logs body metrics per member, SVG trend chart, member self-view |
| **Reports & export** | Revenue KPIs, inactive members, Excel export (all 4 data sheets) |
| **Settings** | Gym profile, currency, gym code, JSON backup/restore |
| **Auth & roles** | Firebase email/password, role-based routing, self-registration via gym code, Firestore security rules |
| **PWA** | Installable, offline-capable (service worker + IndexedDB persistence) |
| **UI system** | Dark/light mode, 10 colour themes, responsive (desktop/tablet/mobile), animations |

> **Before starting any new phase:** merge branch `ui/dark-mode-animations-polish` into `main` first. Phase 6 is code-complete on that branch and all future work depends on it.

---

## Tech Stack — Must Know Before Touching Code

```
index.html          ← app shell; loads app.js as type="module"
app.js              ← routing, auth lifecycle, state, render engine
lib/firebase-init.js ← the ONLY abstraction layer (Firebase ↔ localStorage)
modules/            ← one file per screen; each exports render() + bind()
styles/main.css     ← all styles; uses CSS custom properties for theming
firestore.rules     ← Firestore security rules; must be deployed after changes
```

### Module pattern — every screen follows this contract
```js
export const myModule = {
  // Returns an HTML string. No DOM access here.
  render(context) { return `<div>...</div>`; },

  // Wires events after render() output is in the DOM.
  bind(root, context) { root.querySelector("#btn").addEventListener(...); }
};
```

`context` contains: `profile`, `settings`, `data` (all collections), `services` (auth + data API), `applyChange()`, `applyRemoval()`, `toast()`, `navigate()`.

### Adding a new screen — checklist
1. Create `modules/my-screen.js` following the module contract
2. Add to `collectionNames` in `app.js` if it needs a new Firestore collection
3. Add to `COLLECTIONS` in `lib/firebase-init.js` for local/demo mode
4. Add import + entry to `modules` registry in `app.js`
5. Add `[route, label, icon, [roles]]` entry to `nav` array in `app.js`
6. Add to `collections` constant in `modules/utils.js`
7. Update `firestore.rules` for the new collection
8. Run `node scripts/smoke-test.mjs` — must pass before any PR

### Running locally
```bash
node scripts/dev-server.js   # serves on localhost, no Firebase needed
# Opens in demo mode (localStorage) by default
# Configure gym.config.js with real Firebase keys for live mode
```

---

## Upcoming Phases — Priority Order

---

### Phase 7 — Trainer-Member Workout Assignment
**Branch:** `feature/trainer-workout-assignment`  
**Priority:** NEXT — start here  
**Depends on:** Phase 6 merged to main

**What the user asked for:** Trainers need to be able to assign workout plans to their members and write what today's specific workout is for each member. Members should see "what is my workout today" from their dashboard.

**What to build:**

#### New Firestore collection: `workout_sessions`
```js
{
  id: "wsess_<uid>",
  gymId: "<gymId>",
  memberId: "<member doc id>",
  trainerId: "<trainer doc id>",
  date: "2026-06-21",           // ISO date string
  templateId: "<workout_templates doc id>",  // optional, the base template
  exercises: "Bench Press 3×10 @70kg\nSquat 4×8 @80kg",  // free text or structured
  notes: "Focus on form today",
  createdAt: "...",
  updatedAt: "..."
}
```

#### New Firestore collection: `workout_assignments` *(schema already exists, UI missing)*
```js
{
  id: "wasgn_<uid>",
  gymId: "<gymId>",
  memberId: "<member doc id>",
  trainerId: "<trainer doc id>",
  templateId: "<workout_templates doc id>",
  assignedAt: "2026-06-21",
  notes: "3-day split: A/B/C"
}
```

#### Screens to build

**Trainer side** — extend `modules/trainer-checkin.js` or create `modules/trainer-members.js`:
- List of members assigned to this trainer (filter `members` by `assignedTrainer === myTrainer.id`)
- Per member: current assigned template + "Write today's session" button
- Form: pick a date (default today), select from their workout templates or write free text, add notes → saves to `workout_sessions`
- "Assign template" action: pick from `workout_templates` → saves to `workout_assignments`

**Member side** — extend `modules/my-membership.js` or create `modules/my-workout.js`:
- "My Workout Today" card on member dashboard
- Reads from `workout_sessions` filtered by `memberId === myMember.id AND date === today()`
- Falls back to the current `workout_assignments` template if no session exists for today
- Shows full assignment history: what template is active, when it was last changed

**Owner side** — add a tab or section to `modules/trainers.js`:
- Table: member → assigned trainer → current template
- Read-only overview, owner cannot override trainer assignments

#### Files to modify
| File | Change |
|---|---|
| `app.js` | Add `"workout_sessions"` and `"workout_assignments"` to `collectionNames`. Add nav items for trainer members view and member workout view |
| `lib/firebase-init.js` | Add `"workout_sessions"` to `COLLECTIONS` |
| `modules/utils.js` | Add `workoutSessions: "workout_sessions"` to `collections` |
| `firestore.rules` | Trainer can create `workout_sessions` for their assigned members. Members can read their own sessions. Owner reads all. |

---

### Phase 8 — Member Portal v2
**Branch:** `feature/member-portal-v2`  
**Priority:** HIGH  
**Depends on:** Phase 7

**What the user asked for:** Members should be able to update their own contact details, see their payment history, and see who their trainer is with their contact info.

**What to build:**

#### Extend `modules/my-membership.js`
- **Self-edit profile:** member can update their own `fullName`, `mobile`, `email`, `address` fields on the `members` doc where `uid === auth.uid`. Do not allow editing `status`, `planId`, `endDate` — owner-only fields.
- **Assigned trainer card:** show trainer name, specialization, mobile from the `trainers` collection using the member's `assignedTrainer` field.
- **My Workout Today:** pull in the Phase 7 workout session data (or link to the new workout screen).

#### Extend `modules/my-payments.js`
- Already shows payment records. Add per-row "Print receipt" button (browser print) consistent with the owner's receipt in `modules/payments.js`.

#### New: In-app notification badge
- On page load, count members expiring within 7 days (for owners) or days-until-expiry (for members)
- Show a numeric badge on the Dashboard nav item
- This is purely client-side — read from already-loaded `members` data, no new Firestore reads

#### Files to modify
| File | Change |
|---|---|
| `modules/my-membership.js` | Self-edit form, trainer card, notification badge logic |
| `modules/my-payments.js` | Print receipt button |
| `app.js` | Badge rendering in nav |
| `firestore.rules` | Members can update their own `members` doc for the allowed fields only |

---

### Phase 9 — Membership Pause & Freeze
**Branch:** `feature/membership-pause`  
**Priority:** HIGH  
**Depends on:** Phase 1 (already complete)

**What the user asked for:** Gym owners need to be able to pause a member's membership (e.g., member goes on a trip for a month). The end date should automatically extend by the pause duration. There should be a limit on how many times a member can pause per year.

**What to build:**

#### New member status: `Paused`
Add `Paused` to the status system in `modules/utils.js` `memberStatus()` function and the status pill CSS classes.

#### New Firestore collection: `membership_pauses`
```js
{
  id: "mpause_<uid>",
  gymId: "<gymId>",
  memberId: "<members doc id>",
  pauseStart: "2026-07-01",       // ISO date
  pauseEnd: "2026-07-31",         // ISO date (expected return)
  actualReturn: null,             // filled in when member resumes
  reason: "Vacation",
  pausedBy: "<owner uid>",
  createdAt: "...",
  updatedAt: "..."
}
```

#### Per-plan pause configuration
Add `maxPausesPerCycle` (default: 2) and `maxPauseDays` (default: 30) fields to `membership_plans` docs. Update the plans form in `modules/memberships.js` to show these fields.

#### Owner actions on member profile (`modules/members.js`)
- **Pause button** (visible only when status is Active or Expiring Soon):
  - Form: pause start date, expected return date, reason
  - On save: create `membership_pauses` doc + update `members.endDate` by extending it `(pauseEnd - pauseStart)` days + set `members.status = "Paused"`
  - Validation: check pause count against `maxPausesPerCycle` on the member's plan before allowing
- **Resume button** (visible only when status is Paused):
  - Form: actual return date (defaults to today)
  - On save: update `membership_pauses.actualReturn` + recalculate `members.endDate` if returned early + restore `members.status` to `Active`
- **Pause history tab** on the member detail view: table of all past pauses

#### Dashboard update
Add `Paused` to the KPI count row alongside Active / Expiring / Expired.

#### Renewal queue update (`modules/renewals.js`)
Filter out members with `status === "Paused"` from the expiring-soon list.

#### Files to modify
| File | Change |
|---|---|
| `app.js` | Add `"membership_pauses"` to `collectionNames` |
| `lib/firebase-init.js` | Add `"membership_pauses"` to `COLLECTIONS` |
| `modules/utils.js` | Add `pauses: "membership_pauses"` to `collections`. Update `memberStatus()` to handle `Paused`. Add `statusClass` for `paused`. |
| `modules/members.js` | Pause/Resume buttons + pause history on member profile |
| `modules/memberships.js` | Add `maxPausesPerCycle` and `maxPauseDays` to plan form |
| `modules/renewals.js` | Exclude paused members from expiry queue |
| `modules/dashboard.js` | Add Paused count to KPI grid |
| `styles/main.css` | Add `.status.paused` CSS class (use a blue/teal colour) |
| `firestore.rules` | Owner-only write on `membership_pauses` |

---

### Phase 10 — Member Workout Logging & Exercise Library
**Branch:** `feature/workout-log`  
**Priority:** HIGH  
**Depends on:** Phase 7

**What the user asked for:** Members want to log what they did in the gym — which exercises, how many sets, how much weight. They should be able to pick from a predefined exercise list with recognisable icons. The killer UX feature: "repeat my last Monday workout" so they can load the same session and just update today's weights.

> **Full detailed spec is in:** `.planning/phase-10-workout-log/PLAN.md`  
> Read that file before starting this phase — it has the complete module architecture, all 57 exercises, every CSS class name, the exact `_log` state shape, and UAT criteria.

**Summary of what to build:**

#### New module: `modules/workout-log.js`
- **List view:** grid of past session cards. Each card shows the day/date, coloured category icons (Chest / Back / Legs / etc.), exercise names, and summary stats (sets, total kg lifted).
- **Log builder:** date + notes → dynamic exercise list → save. The exercise list is built by adding from the exercise picker.
- **Exercise picker:** full-screen modal with search input + category filter chips (All / Chest / Back / Legs / Shoulders / Arms / Core / Cardio / Full Body). Each exercise shows a coloured icon matching its category.
- **Repeat last week banner:** if the member logged a workout on the same weekday in a prior week, a banner appears at the top of the log builder. Pressing "Load" pre-populates all exercises and reps, leaving weight fields blank for today's numbers.
- **Set tracking:** each exercise has a dynamic list of sets. For strength: reps × weight (kg). For cardio: duration (min) × distance (km). For timed: duration (sec) × reps.

#### New Firestore collection: `workout_logs`
```js
{
  id: "wklog_<uid>",
  gymId: "<gymId>",
  memberId: "<auth uid of the member>",
  date: "2026-06-21",
  notes: "Felt strong today",
  exercises: [
    {
      id: "bench-press",
      name: "Bench Press",
      category: "chest",
      equipment: "Barbell",
      type: "strength",
      sets: [
        { reps: "10", weight: "60" },
        { reps: "8",  weight: "65" }
      ]
    }
  ],
  createdAt: "...",
  updatedAt: "..."
}
```

Entries are embedded in the session document (not a sub-collection) to keep saves atomic.

#### Exercise library (built-in, 57 exercises — no Firestore read)
Embedded as a JS constant in `workout-log.js`. Categories: Chest, Back, Legs, Shoulders, Arms, Core, Cardio, Full Body. Each maps to a Material Symbol icon and a colour. See `.planning/phase-10-workout-log/PLAN.md` for the full list.

#### Files to modify
| File | Change |
|---|---|
| `modules/utils.js` | Add `workoutLogs: "workout_logs"` to `collections` |
| `app.js` | Import module, add `"workout_logs"` to `collectionNames`, add nav entry `["my-workout-log", "My Workouts", "fitness_center", ["member"]]` |
| `lib/firebase-init.js` | Add `"workout_logs"` to `COLLECTIONS` |
| `styles/main.css` | Append `wl-` prefixed CSS classes (full spec in PLAN.md) |
| `firestore.rules` | Members can read/write own logs (`memberId == request.auth.uid`). Owner can read all. |

---

### Phase 11 — Analytics & Insights
**Branch:** `feature/analytics`  
**Priority:** MEDIUM  
**Depends on:** Phase 4 (already complete)

**What to build:** A dedicated Analytics page (owner-only) that replaces the basic Reports page or adds a new tab alongside it.

| Chart | Data source | Implementation |
|---|---|---|
| Revenue trend | `payments` collection grouped by month | SVG bar chart (match existing dashboard chart style) |
| Member growth | `members.joinDate` grouped by month | SVG line chart |
| Attendance heatmap | `attendance` records by day-of-week | CSS grid heat colours |
| Plan popularity | `members.planId` count per plan | Horizontal bar chart |
| Inactive alerts | Members with no attendance in last 7/14/30 days | Filter + WhatsApp link buttons |
| Revenue forecast | Members expiring in next 30 days × their plan price | Single number card |

All charts are pure SVG/CSS — no charting library. Follow the existing `trendChart()` helper in `utils.js` for the SVG pattern.

---

### Phase 12 — Multi-Branch Support
**Branch:** `feature/multi-branch`  
**Priority:** MEDIUM  
**Depends on:** Phase 5 (already complete)

⚠️ **This phase requires significant Firestore security rules redesign.** Every document currently uses `gymId` for isolation. Multi-branch adds a `branchId` scope underneath `gymId`. Plan this phase carefully before starting — the rules rewrite will affect every collection.

**What to build:**
- `branches` Firestore collection: `{ id, gymId, name, address, managerId }`
- Add `branchId` field to `members`, `attendance`, `payments`, `trainers`, `trainer_attendance`
- Branch selector in the topbar (owner sees all branches; staff see their assigned branch)
- Cross-branch aggregate dashboard for owner (sum KPIs across all branches)
- Updated Firestore rules: staff can only read/write docs where `branchId` matches their assigned branch

---

### Phase 13 — Payment Gateway
**Branch:** `feature/payment-gateway`  
**Priority:** MEDIUM  
**Depends on:** Phase 4 (already complete)

⚠️ **This phase requires a Firebase Cloud Function** for the payment webhook. GymFlow is currently 100% client-side with no server. This is the first phase that adds server-side code.

**What to build:**
- **Razorpay** integration for India (primary market)
- **Stripe** integration for international gyms
- Owner generates a payment link from the Renewals or Payments screen
- Firebase Cloud Function handles the webhook: verifies signature, updates `payments` doc status to `Paid`
- Member sees "Pay Now" button in My Payments with a link to the payment page

**Infrastructure needed:**
- Enable Firebase Functions in the Firebase project
- Store Razorpay/Stripe keys in Firebase environment config (never in client code)
- Deploy function: `firebase deploy --only functions`

---

### Phase 14 — Advanced Operations *(Backlog)*
**Priority:** LOW — do after all above phases are shipped

| Feature | What it does |
|---|---|
| Bulk member import | CSV/Excel upload → creates members in batch. Use SheetJS (already loaded) to parse the file client-side |
| Audit log | `audit_log` Firestore collection: every create/update/delete writes an entry with actor uid, timestamp, collection, docId, before/after diff |
| Invoice PDF | Generate a branded PDF receipt per payment using browser `window.print()` with a print-specific CSS layout |
| Custom WhatsApp templates | Owner can edit the reminder message text in Settings instead of the hardcoded string in `modules/reminders.js` |
| WhatsApp Business API | Replace manual `wa.me` links with automated sends via the Meta WhatsApp Business Cloud API. Requires backend (Firebase Function) |

---

## Known Issues to Fix Before or During Phase 7

These were found during a docs verification pass and should be corrected:

| # | File | Issue |
|---|---|---|
| 1 | `README.md` | Firestore Collections table lists `settings` — actual collection name is `gym_settings` |
| 2 | `README.md` | Workouts section says "Delete templates" is a feature — `workouts.js` has no delete implementation |
| 3 | `README.md` | `users` and `gym_codes` collections are missing from the Firestore Collections table |
| 4 | `.planning/PROJECT.md` | Data Model table lists `settings (doc)` — should be `gym_settings` |

---

## Git Branching Strategy

```
main                         ← stable, deployed to GitHub Pages
  └── ui/dark-mode-animations-polish   ← merge to main FIRST
        └── feature/trainer-workout-assignment  ← Phase 7 (start here)
              └── feature/member-portal-v2      ← Phase 8
                    └── feature/membership-pause ← Phase 9
                          └── feature/workout-log ← Phase 10
```

Each phase gets its own branch off the previous phase's merged state. Merge to `main` after smoke test passes and manual UAT is done.

---

## Before Each PR — Checklist

- [ ] `node scripts/smoke-test.mjs` passes (renders every module, verifies no crash)
- [ ] Test in demo mode (no Firebase config) — features must work with localStorage fallback
- [ ] Test in Firebase mode with a real project
- [ ] Dark mode and light mode both look correct
- [ ] Mobile layout (< 768px) works without horizontal scroll
- [ ] New Firestore collection rules deployed: `firebase deploy --only firestore:rules`
- [ ] No `gym.config.js` committed (it is gitignored — contains real Firebase keys)

---

## Quick Reference — Key Files

| File | Touch when... |
|---|---|
| `app.js` | Adding a new route/screen, new collection, nav item |
| `lib/firebase-init.js` | Adding a new collection that needs local-mode support |
| `modules/utils.js` | Adding a new collection constant, shared helper |
| `firestore.rules` | Any new collection or changed write permissions |
| `styles/main.css` | New component styles (use CSS custom properties — no hardcoded colours) |
| `scripts/smoke-test.mjs` | Add the new module to the smoke test render list |
