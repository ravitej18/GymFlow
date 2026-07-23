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
- [x] **Phase 7: Trainer-Member Workout Assignment** — Trainers assign plans, author daily sessions; members consume workouts (completed 2026-06-21)
- [x] **Phase 8: Member Portal v2** — Member self-edit, receipts, push notifications, trainer details
- [x] **Phase 9: Membership Pause & Freeze** — Pause/resume membership, auto-extend end date, per-plan limits
- [x] **Phase 10: Trainer Workout Module Library** — Trainers create reusable modules, publish Basic workouts for members, assign later to clients
- [x] **Phase 10.1: Enhanced Member Intake Form & BMI Visual Meter** ⚡ URGENT NEXT — Full real-world intake fields, color-coded BMI horizontal meter, real-time duplicate phone/email detection, WhatsApp notification opt-in (completed 2026-07-23)
- [ ] **Phase 11: Member Workout Logging & Exercise Library (Hevy-Style)** — Unrestricted workout logging, routine scheduling, last-week duplication, gym feed dashboard, search, and trainer/owner check.
- [ ] **Phase 12: Analytics & Insights** — Revenue trends, member growth, attendance heatmap, forecasting
- [ ] **Phase 13: Multi-Branch Support** — Branch entity, per-branch scoping, cross-branch dashboard
- [ ] **Phase 14: Payment Gateway Integration** — Razorpay + Stripe, payment links, webhook auto-update
- [ ] **Phase 15: Advanced Operations** — Bulk import, WhatsApp Business API, invoice PDF, audit log

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

**Plans:** 3/3 plans complete

Plans:

- [x] 07-01-PLAN.md — Wire workout_sessions into all data-layer registration points + Firestore rules for trainer writes (no UI)
- [x] 07-02-PLAN.md — Trainer UI: assigned-members list, assign-template control, write-today's-session form
- [x] 07-03-PLAN.md — Member "My Workout Today" + assignment history; owner read-only assignment overview

### Phase 8: Member Portal v2

**Goal**: Significantly upgrade the member-facing experience so members actively use the app rather than just being managed through it.
**Depends on**: Phase 6, Phase 7
**Status**: Complete
**Success Criteria** (what must be TRUE):

  1. Admission body measurements (weight, height, BMI, body fat, waist, chest) are captured at member signup
  2. Saving a new member with measurements auto-creates an initial progress record seeding the progress chart from Day 1
  3. Editing an existing member pre-fills and updates measurements without creating duplicate progress records
  4. Member can self-edit profile (name, mobile, address)
  5. Member can view own payment receipts
  6. Member can view assigned trainer details
  7. Member can view assigned workout plan (Phase 7 data)
  8. PWA push notification opt-in works for expiry reminders
  9. In-app notification badge appears on dashboard

Plans:

- [ ] 08-01-PLAN.md — Admission body measurements: form fields + BMI auto-calc + auto-create initial progress record

### Phase 9: Membership Pause & Freeze

**Goal**: Allow gym owners to pause/freeze a member's membership, auto-extending the end date for the duration of the pause.
**Depends on**: Phase 1
**Status**: Complete
**Success Criteria** (what must be TRUE):

  1. New Paused status appears in member lifecycle
  2. Owner can pause a membership with start date, return date, and reason (inline on Members page)
  3. membership_pauses Firestore collection stores pause history
  4. Member endDate auto-extends by pause duration (returnDate − pauseStart days)
  5. Owner can resume early — unused frozen days are refunded from endDate
  6. Global pause limits (maxPausesPerYear, maxPauseDays) configurable in Settings; enforced on save
  7. Dashboard KPI shows paused members count
  8. Renewal queue excludes paused members while paused

Plans:

- [ ] 09-01-PLAN.md — Data infrastructure: membership_pauses collection, memberStatus Paused, Firestore rules, Settings limits panel, Dashboard KPI, Renewals queue filter
- [ ] 09-02-PLAN.md — Pause/Resume UI: inline pause form on Members page, pause/resume buttons in row actions, validation against limits, endDate extension + early-return refund

### Phase 10: Trainer Workout Module Library

**Goal**: Trainers can create workout modules/templates without selecting a client, publish selected modules as Basic workouts visible to members, and assign modules later to assigned clients.
**Depends on**: Phase 7
**Status**: Complete
**Success Criteria** (what must be TRUE):

  1. Trainer sidebar shows Workouts
  2. Trainer can create a workout module without selecting a client
  3. Trainer-created private modules are visible to owner and creator trainer
  4. Trainer-created Basic modules are visible to all same-gym members in My Workout
  5. Trainer can assign created modules later to assigned clients
  6. Trainer interface says My Clients or Assigned Clients, not My Members
  7. Firestore rules allow trainer-owned template writes and deny spoofed trainerId writes

Plans:

- [x] 10-01-PLAN.md — Trainer Workout Module Library + Basic Member Library

### Phase 10.1: Enhanced Member Intake Form & BMI Visual Meter ⚡ URGENT NEXT

**Goal**: Upgrade the member intake form to a complete real-world gym registration form. Replace the plain BMI text label with a color-coded horizontal visual meter, add real-time duplicate detection (mobile and email), and add a WhatsApp notification opt-in field.

**Depends on**: Phase 10 (extends `members.js` and `styles/main.css` only — no new modules)
**Status**: Not started
**Priority**: URGENT — execute before Phase 11

**Background**: The current member form captures basics but is missing fields any real gym would collect on paper at the front desk. This phase completes the intake story so the data is rich before Portal and Analytics phases consume it.

**New Fields Being Added**

*Personal & Contact*

- Blood group (A+, A-, B+, B-, O+, O-, AB+, AB-)
- Occupation
- Activity level before joining (Sedentary, Lightly Active, Moderately Active, Very Active)
- Fitness experience level (Beginner, Intermediate, Advanced)
- How they heard about the gym / Referred by (Walk-in, Social Media, Friend/Family, Online, Trainer Referral, Other)
- WhatsApp number (defaults to mobile; separate editable field)
- WhatsApp notification opt-in (`whatsappOptIn: boolean` checkbox)

*Emergency Contact (split from current single free-text field)*

- `emergencyName` — contact's full name
- `emergencyRelationship` — Spouse, Parent, Sibling, Friend, Other
- `emergencyPhone` — contact's phone number

*Health & Medical (collapsible section)*

- Medical conditions / health history (textarea)
- Current medications (textarea)
- Known allergies (textarea)
- Physical limitations or injuries (textarea)

*Additional Body Measurements*

- Hip cm
- Bicep cm
- Thigh cm

**BMI Visual Meter**

- Horizontal segmented color bar replacing the `[data-bmi-label]` text span
- Zones left-to-right: Underweight (steel-blue) → Healthy (green) → Overweight (yellow) → Obese I (orange) → Obese II (red) → Obese III (dark-red)
- Animated vertical cursor moves to the calculated BMI position on the bar
- BMI numeric value shown prominently; category label (e.g., "Healthy") shown in zone color beneath bar
- Uses WHO Asian/Indian thresholds already coded in `bmiCategory()`
- Bar hidden until valid weight + height are both entered; appears with smooth fade-in

**Duplicate Detection**

- On `blur` of mobile field: scan `context.data.members` (already loaded in memory) for same mobile number
- On `blur` of email field: same scan for matching email
- If match found on a *different* member: show yellow inline alert beneath the field — "⚠ Member with this mobile already exists: [Name] — click to edit"
- Alert is informational only; form submission is NOT blocked (allows family accounts sharing a number)

**Success Criteria** (what must be TRUE):

  1. All new fields (blood group, occupation, activity level, fitness experience, referred by, WhatsApp number, WhatsApp opt-in, `emergencyName` / `emergencyRelationship` / `emergencyPhone`, medical conditions, medications, allergies, limitations, hip, bicep, thigh) present in form and saved to Firestore member document
  2. All new fields pre-fill correctly when editing an existing member
  3. BMI field is replaced with the visual horizontal color-coded meter; meter is hidden until both weight and height have valid values
  4. BMI meter indicator updates smoothly every time weight or height changes
  5. On blur of mobile input, duplicate detection fires; inline named warning appears if a same-mobile member exists (excluding current edit target)
  6. On blur of email input, duplicate detection fires; inline named warning appears if a same-email member exists (excluding current edit target)
  7. Duplicate warning is informational — form can still be submitted
  8. `whatsappOptIn` boolean persists to Firestore on save
  9. WhatsApp number field auto-populates to the mobile value when mobile is typed; remains editable
  10. No regressions — existing member data loads, save/edit/delete/pause/resume flows continue working

**Plans**:

- [x] 10.1-01-PLAN.md — Extended form fields: all new personal/health/measurement fields + data-model additions + emergency contact split + form section restructure
- [x] 10.1-02-PLAN.md — BMI visual horizontal meter: CSS gradient bar + JS animated cursor + remove old bmi-label span
- [x] 10.1-03-PLAN.md — Duplicate detection (mobile + email, client-side) + WhatsApp number field + WhatsApp opt-in checkbox

### Phase 11: Member Workout Logging & Exercise Library (Hevy-Style)

**Goal**: Implement unrestricted Hevy-style workout logging for members, including custom routine scheduling, last-week workout duplication, gym-wide community dashboard, search, and visibility for trainers/owners.
**Depends on**: Phase 7
**Status**: Not started
**Success Criteria** (what must be TRUE):

  1. Exercise library has ~80 built-in exercises, supporting owner-customized and member-specific custom exercises with no count limits.
  2. Member can search exercises/templates and log workouts (date, exercises, sets x reps x weight, RPE, rest timers, and notes) with zero restrictions.
  3. Member can select a workout from a previous week, clone/duplicate it, and easily edit weights/reps while maintaining the exercise sequence.
  4. Member can choose directly from their self-created workout schedules or from standard gym templates to start a workout.
  5. A gym-wide community dashboard/feed is implemented, allowing members to view logged workouts of other gym members.
  6. Trainers and the gym owner can view/check the workout logs and schedules of any member.
  7. Firestore schemas (`workout_logs`, `workout_schedules`) and rules allow read/write for members and read-only for trainers/owners.

Plans:

- [ ] 11-01: TBD

### Phase 12: Analytics & Insights

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

- [ ] 12-01: TBD

### Phase 13: Multi-Branch Support

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

- [ ] 13-01: TBD

### Phase 14: Payment Gateway Integration

**Goal**: Enable members to pay online; auto-update payment status without manual entry.
**Depends on**: Phase 4
**Status**: Not started
**Success Criteria** (what must be TRUE):

  1. Razorpay payment links can be generated per member/renewal
  2. Stripe payment links work for international gyms
  3. Webhook handler (Firebase Function) auto-updates payment status on success
  4. Member sees payment link in My Payments

Plans:

- [ ] 14-01: TBD

### Phase 15: Advanced Operations

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

- [ ] 15-01: TBD

## Progress

| Phase | Name | Plans Complete | Status | Completed |
|-------|------|----------------|--------|-----------|
| 1 | Core Member Lifecycle | 3/3 | Complete | — |
| 2 | Renewals, Reminders & Trainers | 3/3 | Complete | — |
| 3 | Workouts & Progress | 2/2 | Complete | — |
| 4 | Reports & Settings | 2/2 | Complete | — |
| 5 | Auth, Roles & PWA | 3/3 | Complete | — |
| 6 | UI Design System & Dark Mode | 2/2 | Complete | 2026-06-14 |
| 7 | Trainer-Member Workout Assignment | 3/3 | Complete   | 2026-06-21 |
| 8 | Member Portal v2 | 1/1 | Complete | — |
| 9 | Membership Pause & Freeze | 2/2 | Complete | — |
| 10 | Trainer Workout Module Library | 1/1 | Complete | — |
| 10.1 | Enhanced Member Intake Form & BMI Visual Meter | 3/3 | Complete    | 2026-07-23 |
| 11 | Member Workout Logging & Exercise Library (Hevy-Style) | 0/1 | Not started | — |
| 12 | Analytics & Insights | 0/1 | Not started | - |
| 13 | Multi-Branch Support | 0/1 | Not started | - |
| 14 | Payment Gateway Integration | 0/1 | Not started | - |
| 15 | Advanced Operations | 0/1 | Not started | - |

### Phase 16: Implement PBL gamification strategy (points, badges, leaderboard, PRs, milestones)

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 15
**Plans:** 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 16 to break down)
