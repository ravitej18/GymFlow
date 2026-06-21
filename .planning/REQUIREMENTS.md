# GymFlow — Requirements

## Scope: v0.9 Beta → v1.0 and Beyond

---

## ✅ SHIPPED — v0.9 Beta

### Core Member Lifecycle
- [x] Member registration (full name, mobile, email, gender, DOB, join date, address, emergency contact)
- [x] Membership plan assignment at add/renew time
- [x] Start date / end date tracking with auto-computed status
- [x] Member status: Active, Expiring Soon (≤15 days), Expired, Suspended, Pending
- [x] Edit and delete members (owner)
- [x] Member search by name, mobile, email; filter by status, plan, trainer

### Membership Plans
- [x] Create / edit / delete plans (name, duration in months, price)
- [x] Plans used in member add, renewal, and payment flows

### Payments
- [x] Record payments (member, plan, amount, method, date, status, notes)
- [x] Payment methods: Cash, UPI, Card, Bank Transfer
- [x] Payment statuses: Paid, Pending, Partial, Refunded
- [x] Printable per-payment receipt (browser print / save as PDF)
- [x] Filter payments by member, status, date range

### Renewals
- [x] Renewal queue: members expiring within 30 days or already expired
- [x] One-form renewal: select member + plan, sets new end date, records payment
- [x] Auto-computes next end date from renewal date + plan duration

### Attendance
- [x] Member check-in by owner (manual date entry or today)
- [x] Member self check-in from their own dashboard
- [x] Attendance records: member, date, notes
- [x] Filter attendance by member, date range
- [x] Attendance count metric on dashboard

### WhatsApp Reminders
- [x] Reminder dashboard listing members with membership expiring within 30 days
- [x] Pre-filled WhatsApp `wa.me` deep link with personalized message per member
- [x] "Mark as sent" button logs reminder event to Firestore
- [x] Configurable gym name in message from settings

### Trainers
- [x] Trainer roster (name, specialization, mobile, email, status)
- [x] Trainer self check-in (trainer_attendance collection)
- [x] My Check-ins view for trainers (own attendance history)
- [x] Assign trainer to member on member form

### Workouts
- [x] Create reusable workout templates (name, goal, exercises, notes)
- [x] View all templates as card grid
- [x] Delete templates

### Progress Tracking
- [x] Owner adds progress records per member (date, weight, BMI, body fat %, chest, waist, notes)
- [x] Member views their own progress chart (trend line SVG)
- [x] Metric selector: weight, BMI, body fat, waist
- [x] Progress history table

### Dashboard
- [x] Owner: 8 KPI metrics (total/active/expiring/expired members, revenue today/month, attendance today, pending payments)
- [x] Owner: Renewal Watch panel (next 6 members to expire)
- [x] Owner: 6-month revenue trend bar chart
- [x] Member: membership card (status, expiry, days left, check-in count)
- [x] Trainer: trainer metrics + check-in today panel

### Reports & Export
- [x] Summary metrics (total revenue, active members, attendance records, inactive-14-days count)
- [x] Inactive members list (no check-in in last 14 days)
- [x] Recent payments panel
- [x] Excel export: Members, Payments, Attendance, Renewals (.xlsx via SheetJS)
- [x] Export all (single click, all 4 sheets)

### Settings
- [x] Gym profile: name, owner name, contact email, phone, currency (INR/USD/EUR/GBP), address
- [x] Gym code display + copy (used by members to self-register)
- [x] Backup: JSON export of all data
- [x] Restore: JSON import (overwrites local data)

### Auth & Roles
- [x] Email/password auth (Firebase Auth)
- [x] Roles: owner, member, trainer — enforced in Firestore security rules + JS route guard
- [x] Member self-registration with gym code
- [x] Trainer registration
- [x] Profile chip in sidebar (name, role, avatar initials)
- [x] Sign out

### Infrastructure
- [x] PWA manifest + service worker (offline capable)
- [x] Firestore IndexedDB persistence (data survives browser restart)
- [x] Local demo mode (localStorage fallback when Firebase not configured)
- [x] Demo data seeders: `seed-demo.js`, `seed-members.js`
- [x] Smoke test: `smoke-test.mjs` (renders all modules)
- [x] Zero build step: serve from any HTTP server
- [x] `firestore.rules`: gymId-based multi-tenant isolation

### UI Design System (branch: ui/dark-mode-animations-polish)
- [x] Dark/light mode toggle (persisted to localStorage)
- [x] 10 config-file color themes (set in gym.config.js)
- [x] Motion system (CSS custom property duration/easing tokens)
- [x] Route view fade-slide transition
- [x] Tablet layout: 68px icon-only collapsed sidebar
- [x] Mobile: nav-scrim overlay with close-on-click
- [x] Flash-free theme init (inline script in head)

---

## 🔲 PLANNED — v1.0 and beyond

### Member Portal Improvements
- [ ] Member self-edit profile (mobile, email, address)
- [ ] Member payment receipt view (own receipts)
- [ ] Member can see their assigned trainer
- [ ] Notification bell (in-app + PWA push) for expiry warning
- [ ] Member can view assigned workout plan

### Trainer-Member Workout Assignment
- [ ] Assign workout templates to specific members (workout_assignments collection — schema exists, UI not built)
- [ ] Trainer view: assigned members + their plans
- [ ] Member view: their assigned workout plan with exercise list

### Analytics & Insights
- [ ] Revenue trend chart with monthly/weekly toggle
- [ ] Member growth chart (new members per month)
- [ ] Attendance heatmap / daily breakdown
- [ ] Plan popularity breakdown (which plans are most sold)
- [ ] Inactive member alert dashboard

### Multi-Branch Support
- [ ] Branch entity: a gym can have multiple locations
- [ ] Members, attendance, and payments scoped to a branch
- [ ] Owner cross-branch dashboard (aggregate view)
- [ ] Staff assigned per-branch

### Payment Gateway Integration
- [ ] Razorpay integration (India primary market)
- [ ] Stripe integration (international)
- [ ] Online payment link generation for members
- [ ] Payment status webhook → auto-update Firestore

### Trainer-Member Workout Assignment (Phase 7)
- [ ] Trainer view: assigned members list with member goals
- [ ] Trainer assigns a workout template to a member (workout_assignments collection, schema exists)
- [ ] Trainer creates "today's session" for a member: date, exercises with sets/reps/weight targets, notes — can override template per day
- [ ] `workout_sessions` Firestore collection for trainer-authored per-day session records
- [ ] Member "My Workout Today" screen: shows today's trainer session if exists, else falls back to assigned template
- [ ] Member: workout assignment history view (when was template last changed)
- [ ] Owner view: see all assignments per trainer and per member

### Member Portal v2 (Phase 8)
- [ ] Member self-edit profile (mobile, email, address)
- [ ] Member payment receipt view (own receipts)
- [ ] Member can see their assigned trainer
- [ ] Member can view assigned workout plan (Phase 7 integration)
- [ ] Notification bell (in-app + PWA push) for expiry warning

### Membership Pause & Freeze (Phase 9)
- [ ] New member status: `Paused`
- [ ] Owner pauses a membership: set pause start date, expected return date, reason
- [ ] `membership_pauses` Firestore collection for pause history per member
- [ ] Member `endDate` auto-extends by pause duration when pause is created
- [ ] Owner resumes membership; `endDate` re-adjusts if returned early
- [ ] Per-plan config: `max_pauses_per_cycle` (default: 2), `max_pause_days` (default: 30)
- [ ] Pause history log on member profile
- [ ] Dashboard KPI: Paused members count
- [ ] Renewal queue: exclude paused members while their pause is active
- [ ] Firestore rules: only owner can write to `membership_pauses`

### Member Workout Logging & Exercise Library (Phase 10)
- [ ] Exercise library with ~80 built-in exercises: name, muscle group, equipment type, category
- [ ] Owner can add custom exercises for their gym
- [ ] Owner can deactivate exercises they don't want in the picker
- [ ] Member "Log Workout" form: date (default today), exercises from library picker, sets × reps × weight (strength) or duration (cardio), session notes
- [ ] Member "My Workouts" history: all past logged sessions in chronological order
- [ ] Personal Record (PR) badge: auto-detect highest weight × reps per exercise in history
- [ ] Owner can view any member's workout log from the member profile
- [ ] Exercise library management under Settings or Workouts (owner)
- [ ] Firestore collections: `exercise_library`, `workout_logs`, `workout_log_entries`
- [ ] Firestore rules: members can write only own logs; owner can read all

### Analytics & Insights (Phase 11)
- [ ] Revenue trend chart with monthly/weekly toggle
- [ ] Member growth chart (new members per month)
- [ ] Attendance heatmap / daily breakdown
- [ ] Plan popularity breakdown (which plans are most sold)
- [ ] Inactive member alert dashboard

### Multi-Branch Support (Phase 12)
- [ ] Branch entity: a gym can have multiple locations
- [ ] Members, attendance, and payments scoped to a branch
- [ ] Owner cross-branch dashboard (aggregate view)
- [ ] Staff assigned per-branch

### Payment Gateway Integration (Phase 13)
- [ ] Razorpay integration (India primary market)
- [ ] Stripe integration (international)
- [ ] Online payment link generation for members
- [ ] Payment status webhook → auto-update Firestore

### Advanced Operations (Phase 14)
- [ ] Bulk member import from CSV/Excel
- [ ] Audit log (who changed what, when)
- [ ] Custom renewal reminder message templates
- [ ] WhatsApp Business API integration (replace manual wa.me links)
- [ ] Invoice PDF generation (letterhead, itemized)
