# GymFlow — Project State

## Current Status
- **Milestone:** v0.9 Beta
- **Active Branch:** `ui/dark-mode-animations-polish`
- **Last Phase Completed:** Phase 6 — UI Design System & Dark Mode
- **Next Phase:** Phase 7 — Trainer-Member Workout Assignment

## Completed Phases
| Phase | Name | Branch/Commit | Date |
|---|---|---|---|
| 1 | Core Member Lifecycle | main | — |
| 2 | Renewals, Reminders & Trainers | main | — |
| 3 | Workouts & Progress | main | — |
| 4 | Reports & Settings | main | — |
| 5 | Auth, Roles & PWA | main | — |
| 6 | UI Design System & Dark Mode | ui/dark-mode-animations-polish | 2026-06-14 |

## Upcoming Phases (Priority Order)
| Phase | Name | Priority |
|---|---|---|
| 7 | Trainer-Member Workout Assignment | NEXT |
| 8 | Member Portal v2 | HIGH |
| 9 | Membership Pause & Freeze | HIGH |
| 10 | Member Workout Logging & Exercise Library | HIGH |
| 11 | Analytics & Insights | MEDIUM |
| 12 | Multi-Branch Support | MEDIUM |
| 13 | Payment Gateway Integration | MEDIUM |
| 14 | Advanced Operations | BACKLOG |

## In-Progress Work
- **Branch:** `ui/dark-mode-animations-polish`
- **Commits:**
  - `3515298` — ui: dark/light mode, tablet layout, motion system, nav polish, topbar toggle
  - `ff22862` — ui: add 10 config-file color themes with flash-free boot
- **Status:** Phase 6 UI work is code-complete; pending merge to main

## Key Architectural Facts
- No build step — pure ES modules, served from any HTTP server
- `lib/firebase-init.js` is the only abstraction layer (Firebase ↔ localStorage)
- `app.js` owns all routing, state, rendering shell
- Each module in `modules/` exports `{ render(context), bind?(root, context) }`
- `utils.js` contains all shared DOM helpers, data helpers, and export utilities
- Firestore collections: members, trainers, membership_plans, payments, attendance, trainer_attendance, workout_templates, workout_assignments, progress_records, reminders
- workout_assignments collection exists in schema but has no UI yet (Phase 7)
- CSS design tokens: all colors via `--token` vars; 10 color themes in main.css; dark mode via `data-theme` on `<html>`

## Open Decisions
- Phase 8 (Member Portal v2): needs UX design for notification opt-in flow
- Phase 12 (Multi-Branch): Firestore security rules need significant redesign for branch scoping
- Phase 13 (Payment Gateway): Firebase Functions needed for webhook; adds server-side complexity

## Blockers
None currently.

## Notes
- `smoke-test.mjs` should be run before each PR to verify all module renders produce valid HTML
- `scripts/seed-demo.js` and `scripts/seed-members.js` are for demo environment setup only
- `gym.config.js` is git-ignored (contains real Firebase keys) — `.template` is the public version
- Phase 7 introduces new Firestore collection: `workout_sessions` (trainer-authored daily sessions)
- Phase 9 introduces new Firestore collection: `membership_pauses`
- Phase 10 introduces new Firestore collections: `exercise_library`, `workout_logs`, `workout_log_entries`
