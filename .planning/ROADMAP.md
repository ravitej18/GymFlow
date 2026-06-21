# GymFlow — Roadmap

## Overview

GymFlow is a zero-cost, self-hosted gym management PWA. Phases build out the full member lifecycle, trainer workflows, analytics, and platform capabilities — all shipped as pure ES modules on Firebase/Firestore with no build step.

## Phases

- [x] **Phase 1: Core Member Lifecycle** — Members, plans, payments, attendance, dashboard KPIs
- [x] **Phase 2: Renewals, Reminders & Trainers** — Renewal queue, WhatsApp links, trainer roster
- [x] **Phase 3: Workouts & Progress** — Workout template library, progress tracking + SVG charts
- [x] **Phase 4: Reports & Settings** — Revenue reports, Excel export, gym config, JSON backup/restore
- [x] **Phase 5: Auth, Roles & PWA** — Firebase Auth, role-based routing, Firestore rules, PWA + offline
- [x] **Phase 6: UI Design System & Dark Mode** — Design tokens, dark/light mode, animations, responsive layouts
- [ ] **Phase 7: Trainer-Member Workout Assignment** — Trainers assign plans, author daily sessions; members consume workouts
- [ ] **Phase 8: Member Portal v2** — Member self-edit, receipts, push notifications, trainer details
- [ ] **Phase 9: Membership Pause & Freeze** — Pause/resume membership, auto-extend end date, per-plan limits
- [ ] **Phase 10: Member Workout Logging & Exercise Library** — Member self-log sessions, exercise library, PR tracking
- [ ] **Phase 11: Analytics & Insights** — Revenue trends, member growth, attendance heatmap, forecasting
- [ ] **Phase 12: Multi-Branch Support** — Branch entity, per-branch scoping, cross-branch dashboard
- [ ] **Phase 13: Payment Gateway Integration** — Razorpay + Stripe, payment links, webhook auto-update
- [ ] **Phase 14: Advanced Operations** — Bulk import, WhatsApp Business API, invoice PDF, audit log

## Phase Details

### Phase 1: Core Member Lifecycle
**Goal**: Basic gym management — add members, plans, record payments, track attendance.
**Depends on**: Nothing (first phase)
**Status**: Complete
**Success Criteria** (what must be TRUE):
  1. Owner can add, edit, delete members with plan assignment and status tracking
  2. Membership plans CRUD works
  3. Payments are recorded with printable receipts
  4. Attendance check-in works for owner and member self check-in
  5. Dashboard shows KPI metrics

Plans:
- [x] 01-01: Members CRUD + plan assignment
- [x] 01-02: Payments + receipts
- [x] 01-03: Attendance + dashboard KPIs

### Phase 2: Renewals, Reminders & Trainers
**Goal**: Close the member retention loop; add trainer workforce management.
**Depends on**: Phase 1
**Status**: Complete
**Success Criteria** (what must be TRUE):
  1. Renewal queue shows members expiring within 30 days
  2. One-click renewal auto-computes new end date
  3. WhatsApp wa.me reminder links work and log to Firestore
  4. Trainer roster CRUD works
  5. Trainers can self check-in and view their own history

Plans:
- [x] 02-01: Renewal queue + one-form renewal
- [x] 02-02: WhatsApp reminders
- [x] 02-03: Trainer roster + self check-in

### Phase 3: Workouts & Progress
**Goal**: Extend value-add features for fitness outcomes.
**Depends on**: Phase 2
**Status**: Complete
**Success Criteria** (what must be TRUE):
  1. Owner can create reusable workout templates
  2. Progress records (weight, BMI, body fat, measurements) can be added per member
  3. SVG trend chart renders per member
  4. Members can self-view their own progress

Plans:
- [x] 03-01: Workout template library
- [x] 03-02: Progress tracking + SVG chart

### Phase 4: Reports & Settings
**Goal**: Business intelligence, data portability, gym configuration.
**Depends on**: Phase 3
**Status**: Complete
**Success Criteria** (what must be TRUE):
  1. Reports page shows revenue, active count, inactive members, recent payments
  2. Excel export works for Members, Payments, Attendance, Renewals
  3. Settings page saves gym profile and currency
  4. JSON backup export and restore work

Plans:
- [x] 04-01: Reports page + Excel export
- [x] 04-02: Settings + backup/restore

### Phase 5: Auth, Roles & PWA
**Goal**: Production-grade auth, multi-role access control, offline capability.
**Depends on**: Phase 4
**Status**: Complete
**Success Criteria** (what must be TRUE):
  1. Firebase email/password auth works
  2. Role-based routing enforces owner/member/trainer access
  3. Firestore security rules enforce gymId isolation
  4. Members can self-register via gym code
  5. App installs as PWA and works offline

Plans:
- [x] 05-01: Firebase Auth + role-based routing
- [x] 05-02: Firestore security rules + member self-registration
- [x] 05-03: PWA manifest + service worker + IndexedDB persistence

### Phase 6: UI Design System & Dark Mode
**Goal**: Professional, buttery-smooth UI across all screen sizes.
**Depends on**: Phase 5
**Status**: Complete
**Success Criteria** (what must be TRUE):
  1. CSS design token system covers motion, radii, shadows, typography
  2. Dark/light mode toggle persists to localStorage with flash-free init
  3. 10 color themes are configurable in gym.config.js
  4. Tablet 68px icon-only sidebar and mobile nav scrim overlay work
  5. Route transitions, button springs, hover effects, reduced-motion guard all work

Plans:
- [x] 06-01: CSS design tokens + dark/light mode + theme system
- [x] 06-02: Responsive layouts (tablet/mobile) + animations + interactions

### Phase 7: Trainer-Member Workout Assignment
**Goal**: Bridge trainer workflow with member experience — trainers assign workout plans, deliver today's session, and members consume their workout.
**Depends on**: Phase 3
**Status**: Not started
**Success Criteria** (what must be TRUE):
  1. Trainer can assign a workout template to a member (writes to workout_assignments)
  2. Trainer can create a "today's session" for a member with exercises, sets, reps, weight targets, notes
  3. workout_sessions Firestore collection stores trainer-authored session records
  4. Member "My Workout Today" screen shows today's trainer session if one exists, otherwise the assigned template
  5. Member can view their full assignment history (template changes over time)
  6. Owner can view all assignments per trainer and per member

**Plans:** 3 plans

Plans:
- [ ] 07-01-PLAN.md — Wire workout_sessions into all data-layer registration points + Firestore rules for trainer writes (no UI)
- [ ] 07-02-PLAN.md — Trainer UI: assigned-members list, assign-template control, write-today's-session form
- [ ] 07-03-PLAN.md — Member "My Workout Today" + assignment history; owner read-only assignment overview

### Phase 8: Member Portal v2
**Goal**: Significantly upgrade the member-facing experience so members actively use the app rather than just being managed through it.
**Depends on**: Phase 6, Phase 7
**Status**: Not started
**Success Criteria** (what must be TRUE):
  1. Member can self-edit profile (name, mobile, address)
  2. Member can view own payment receipts
  3. Member can view assigned trainer details
  4. Member can view assigned workout plan (Phase 7 data)
  5. PWA push notification opt-in works for expiry reminders
  6. In-app notification badge appears on dashboard

Plans:
- [ ] 08-01: TBD

### Phase 9: Membership Pause & Freeze
**Goal**: Allow gym owners to pause/freeze a member's membership, auto-extending the end date for the duration of the pause.
**Depends on**: Phase 1
**Status**: Not started
**Success Criteria** (what must be TRUE):
  1. New Paused status appears in member lifecycle
  2. Owner can pause a membership with start date, return date, and reason
  3. membership_pauses Firestore collection stores pause history
  4. Member endDate auto-extends by pause duration
  5. Owner can resume and re-adjust endDate if member returns early
  6. Per-plan max_pauses_per_cycle and max_pause_days limits enforced
  7. Dashboard KPI shows paused members count
  8. Renewal queue excludes paused members while paused

Plans:
- [ ] 09-01: TBD

### Phase 10: Member Workout Logging & Exercise Library
**Goal**: Members self-log their workout sessions backed by a built-in + owner-customizable exercise library.
**Depends on**: Phase 7
**Status**: Not started
**Success Criteria** (what must be TRUE):
  1. Exercise library has ~80 built-in exercises with muscle group and equipment type
  2. Owner can add/hide custom exercises
  3. Member can log a workout session with date, exercises, sets x reps x weight or duration
  4. Member can view full session history in "My Workouts"
  5. Personal Record (PR) auto-detection and badge shown in history
  6. Owner can view any member's workout log from member profile

Plans:
- [ ] 10-01: TBD

### Phase 11: Analytics & Insights
**Goal**: Give gym owners actionable business intelligence to grow and retain members.
**Depends on**: Phase 4
**Status**: Not started
**Success Criteria** (what must be TRUE):
  1. Revenue trend chart with monthly/weekly/daily toggle works
  2. Member growth chart (12-month view of new signups) renders
  3. Attendance heatmap (day-of-week x time-of-day) renders
  4. Plan popularity bar chart renders
  5. Inactive member alert with one-click WhatsApp works
  6. Revenue forecasting shows next 30-day projected renewals

Plans:
- [ ] 11-01: TBD

### Phase 12: Multi-Branch Support
**Goal**: Allow a gym chain to manage multiple locations under one owner account.
**Depends on**: Phase 5
**Status**: Not started
**Success Criteria** (what must be TRUE):
  1. Branch entity (name, address, manager) can be created
  2. Members, attendance, and payments are scoped to a branch
  3. Staff can be assigned per-branch with branch-scoped roles
  4. Cross-branch aggregate dashboard works for owner
  5. Firestore rules enforce branch-level isolation

Plans:
- [ ] 12-01: TBD

### Phase 13: Payment Gateway Integration
**Goal**: Enable members to pay online; auto-update payment status without manual entry.
**Depends on**: Phase 4
**Status**: Not started
**Success Criteria** (what must be TRUE):
  1. Razorpay payment links can be generated per member/renewal
  2. Stripe payment links work for international gyms
  3. Webhook handler (Firebase Function) auto-updates payment status on success
  4. Member sees payment link in My Payments

Plans:
- [ ] 13-01: TBD

### Phase 14: Advanced Operations
**Goal**: Operational efficiency and communication upgrades for larger gyms.
**Depends on**: Phase 4
**Status**: Not started
**Success Criteria** (what must be TRUE):
  1. Bulk member import from CSV/Excel works
  2. WhatsApp Business API sends automated reminders
  3. Invoice PDF generates with gym letterhead and itemized details
  4. Custom reminder message templates work per gym
  5. Audit log records change history with actor and timestamp

Plans:
- [ ] 14-01: TBD

## Progress

| Phase | Name | Plans Complete | Status | Completed |
|-------|------|----------------|--------|-----------|
| 1 | Core Member Lifecycle | 3/3 | Complete | — |
| 2 | Renewals, Reminders & Trainers | 3/3 | Complete | — |
| 3 | Workouts & Progress | 2/2 | Complete | — |
| 4 | Reports & Settings | 2/2 | Complete | — |
| 5 | Auth, Roles & PWA | 3/3 | Complete | — |
| 6 | UI Design System & Dark Mode | 2/2 | Complete | 2026-06-14 |
| 7 | Trainer-Member Workout Assignment | 0/3 | Planned | - |
| 8 | Member Portal v2 | 0/1 | Not started | - |
| 9 | Membership Pause & Freeze | 0/1 | Not started | - |
| 10 | Member Workout Logging & Exercise Library | 0/1 | Not started | - |
| 11 | Analytics & Insights | 0/1 | Not started | - |
| 12 | Multi-Branch Support | 0/1 | Not started | - |
| 13 | Payment Gateway Integration | 0/1 | Not started | - |
| 14 | Advanced Operations | 0/1 | Not started | - |
