# GymFlow — Roadmap

## Current Milestone: v0.9 Beta

---

## ✅ Phase 1 — Core Member Lifecycle
**Status:** COMPLETE
**Goal:** Basic gym management — add members, plans, record payments, track attendance.

Deliverables:
- Members CRUD with plan assignment, status tracking
- Membership plans CRUD
- Payment recording with receipt printing
- Attendance check-in (owner + member self check-in)
- Dashboard KPI metrics

---

## ✅ Phase 2 — Renewals, Reminders & Trainers
**Status:** COMPLETE
**Goal:** Close the member retention loop; add trainer workforce management.

Deliverables:
- Renewal queue (30-day window)
- One-click renewal form (auto-computes end date)
- WhatsApp `wa.me` reminder deep links
- Reminder logged to Firestore
- Trainer roster CRUD
- Trainer self check-in + history

---

## ✅ Phase 3 — Workouts & Progress
**Status:** COMPLETE
**Goal:** Extend value-add features for fitness outcomes.

Deliverables:
- Workout template library (owner creates reusable plans)
- Progress tracking (weight, BMI, body fat, measurements)
- Progress trend chart per member (SVG)
- Member self-view of own progress

---

## ✅ Phase 4 — Reports & Settings
**Status:** COMPLETE
**Goal:** Business intelligence, data portability, gym configuration.

Deliverables:
- Reports page: revenue, active count, inactive members, recent payments
- Excel export (Members, Payments, Attendance, Renewals)
- Settings: gym profile, currency, gym code
- Backup (JSON export) and restore (JSON import)

---

## ✅ Phase 5 — Auth, Roles & PWA
**Status:** COMPLETE
**Goal:** Production-grade auth, multi-role access control, offline capability.

Deliverables:
- Firebase Auth with email/password
- Role-based routing (owner / member / trainer)
- Firestore security rules (`firestore.rules`) with gymId isolation
- Member self-registration via gym code
- PWA manifest + service worker
- Firestore IndexedDB persistence (offline)
- Local demo mode (localStorage fallback)

---

## ✅ Phase 6 — UI Design System & Dark Mode
**Status:** COMPLETE (branch: ui/dark-mode-animations-polish)
**Goal:** Professional, buttery-smooth UI across all screen sizes.

Deliverables:
- CSS design token system (motion, radii, shadows, typography)
- Dark / light mode toggle, persisted to localStorage
- Flash-free theme init (inline script in head)
- 10 config-file color themes (changed in gym.config.js)
- Tablet breakpoint: 68px icon-only sidebar
- Mobile nav scrim overlay
- Route transition animation (fade + slide)
- Button spring/scale interactions
- Table row hover lift + teal border
- Metric card hover lift
- Card hover elevation
- Reduced-motion guard
- :focus-visible keyboard rings
- Skeleton shimmer utility

---

## 🔲 Phase 7 — Trainer-Member Workout Assignment
**Status:** NOT STARTED
**Priority:** HIGH — NEXT UP
**Depends on:** Phase 3 (workout_templates, workout_assignments schema exists)

Goal: Bridge trainer workflow with member experience — trainers assign workout plans, deliver today's session, and members consume their workout.

Deliverables:
- [ ] Trainer view: list of assigned members with their goals
- [ ] Trainer UI: assign workout template to a member (writes to `workout_assignments`)
- [ ] Trainer UI: create "today's session" for a member — select from assigned template or customize per day (sets, reps, weight targets, notes)
- [ ] `workout_sessions` Firestore collection: trainer-authored session records (member, date, exercises, notes)
- [ ] Member view: "My Workout Today" screen — shows today's trainer-authored session if one exists, otherwise shows assigned template
- [ ] Member view: full assignment history (what template is currently assigned, when it changed)
- [ ] Owner view: assignment list per trainer and member

---

## 🔲 Phase 8 — Member Portal v2
**Status:** NOT STARTED
**Priority:** HIGH
**Depends on:** Phase 6, Phase 7

Goal: Significantly upgrade the member-facing experience so members actively use the app rather than just being managed through it.

Deliverables:
- [ ] Member self-edit profile (name, mobile, address)
- [ ] Member view own payment receipts
- [ ] Member view assigned trainer details
- [ ] Member view assigned workout plan (consumes Phase 7 data)
- [ ] PWA push notification opt-in for expiry reminders
- [ ] In-app notification badge on dashboard

---

## 🔲 Phase 9 — Membership Pause & Freeze
**Status:** NOT STARTED
**Priority:** HIGH
**Depends on:** Phase 1 (member lifecycle, status tracking)

Goal: Allow gym owners to pause/freeze a member's membership, auto-extending the end date for the duration of the pause. Configurable per plan to limit abuse.

Deliverables:
- [ ] New member status: `Paused` (alongside Active, Expiring Soon, Expired, Suspended, Pending)
- [ ] Pause action on member profile (owner only): set pause start date, expected return date, reason
- [ ] `membership_pauses` Firestore collection: pause records per member (start, end, reason, paused_by, gymId)
- [ ] Auto-extend member `endDate` by the pause duration when pause is created
- [ ] Resume membership: owner marks return date; `endDate` re-adjusted if member returned early
- [ ] Per-plan configuration: `max_pauses_per_cycle` (default: 2) and `max_pause_days` (default: 30)
- [ ] Pause history log on member profile: all past pauses with dates and reason
- [ ] Dashboard KPI: Paused members count
- [ ] Renewal queue: paused members excluded from expiring-soon list while paused
- [ ] Firestore rules: only owner can write to `membership_pauses`

---

## 🔲 Phase 10 — Member Workout Logging & Exercise Library
**Status:** NOT STARTED
**Priority:** HIGH
**Depends on:** Phase 7 (exercise concepts established)

Goal: Members self-log their workout sessions — what exercises they did, what weight, sets, and reps. Backed by a built-in + owner-customizable exercise library.

Deliverables:
- [ ] **Exercise Library** (`exercise_library` collection):
  - Built-in seed of ~80 common exercises (e.g., Bench Press, Squat, Deadlift, Pull-up, Plank, Running) categorized by muscle group and equipment type
  - Owner can add custom exercises for their gym (name, category, equipment)
  - Owner can hide/deactivate exercises they don't want members to see
- [ ] **Member Workout Log** (`workout_logs` + `workout_log_entries` collections):
  - Member opens "Log Workout" from their dashboard
  - Selects date (defaults to today), adds optional session notes
  - Adds exercises by picking from the library (searchable) or typing a custom name
  - Per exercise entry: sets × reps × weight (for strength) or duration (for cardio)
  - Save session; view full session history in "My Workouts" screen
- [ ] **Personal Record (PR) tracking**: auto-detect highest weight × reps per exercise; show badge on history
- [ ] **Owner view**: can view any member's workout log history from the member profile
- [ ] Exercise library management screen under Settings or Workouts (owner)
- [ ] Firestore rules: members can write only their own logs; owner can read all

---

## 🔲 Phase 11 — Analytics & Insights
**Status:** NOT STARTED
**Priority:** MEDIUM
**Depends on:** Phase 4

Goal: Give gym owners actionable business intelligence to grow and retain members.

Deliverables:
- [ ] Revenue trend chart with monthly/weekly/daily toggle
- [ ] Member growth chart (new signups per month, 12-month view)
- [ ] Attendance heatmap (day-of-week × time-of-day density)
- [ ] Plan popularity: bar chart of plan distribution
- [ ] Inactive member alert: 7/14/30-day segments with one-click WhatsApp
- [ ] Revenue forecasting: next 30-day projected renewals

---

## 🔲 Phase 12 — Multi-Branch Support
**Status:** NOT STARTED
**Priority:** MEDIUM
**Depends on:** Phase 5 (Firestore auth architecture)

Goal: Allow a gym chain to manage multiple locations under one owner account.

Deliverables:
- [ ] Branch entity (name, address, manager)
- [ ] Members, attendance, and payments scoped to a branch
- [ ] Staff assigned per-branch with branch-scoped roles
- [ ] Cross-branch aggregate dashboard for owner
- [ ] Firestore rules updated for branch-level isolation

---

## 🔲 Phase 13 — Payment Gateway Integration
**Status:** NOT STARTED
**Priority:** MEDIUM
**Depends on:** Phase 4 (payment model established)

Goal: Enable members to pay online; auto-update payment status without manual entry.

Deliverables:
- [ ] Razorpay integration (India — primary market)
- [ ] Stripe integration (international gyms)
- [ ] Owner generates payment link per member / renewal
- [ ] Webhook handler (Firebase Function) updates payment status on success
- [ ] Member sees payment link in My Payments

---

## 🔲 Phase 14 — Advanced Operations
**Status:** BACKLOG
**Priority:** LOW

Goal: Operational efficiency and communication upgrades for larger gyms.

Deliverables:
- [ ] Bulk member import from CSV / Excel
- [ ] WhatsApp Business API (replace manual wa.me links with automated send)
- [ ] Invoice PDF generation (gym letterhead, itemized, branding)
- [ ] Custom reminder message templates per gym
- [ ] Audit log (change history per record with actor + timestamp)
