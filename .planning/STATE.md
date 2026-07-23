---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
last_updated: "2026-07-23T03:19:37.946Z"
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 10
  completed_plans: 10
---

# GymFlow — Project State

## Current Status

- **Milestone:** v0.9 Beta
- **Active Branch:** `phase/11-workout-logging`
- **Last Phase Completed:** Phase 10.1 — Enhanced Member Intake Form & BMI Visual Meter
- **Next Phase:** Phase 11 — Member Workout Logging & Exercise Library (Hevy-Style)

## Completed Phases

| Phase | Name | Branch/Commit | Date |
|---|---|---|---|
| 1 | Core Member Lifecycle | main | — |
| 2 | Renewals, Reminders & Trainers | main | — |
| 3 | Workouts & Progress | main | — |
| 4 | Reports & Settings | main | — |
| 5 | Auth, Roles & PWA | main | — |
| 6 | UI Design System & Dark Mode | ui/dark-mode-animations-polish | 2026-06-14 |
| 7 | Trainer-Member Workout Assignment | main (#11) | 2026-06-21 |
| 8 | Member Portal v2 | main | — |
| 9 | Membership Pause & Freeze | main | — |
| 10 | Trainer Workout Module Library | main (#12) | — |
| 10.1 | Enhanced Member Intake Form & BMI Visual Meter | main | 2026-07-23 |

## Upcoming Phases (Priority Order)

| Phase | Name | Priority |
|---|---|---|
| 11 | Member Workout Logging & Exercise Library (Hevy-Style) | HIGH |
| 12 | Analytics & Insights | MEDIUM |
| 13 | Multi-Branch Support | MEDIUM |
| 14 | Payment Gateway Integration | MEDIUM |
| 15 | Advanced Operations | BACKLOG |

## In-Progress Work

- **Branch:** `main`
- **Last merged commit:** `517a3ff` — Add trainer workout module library and basic member workouts (#12)
- **Status:** Ready to plan

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
- Phase 13 (Multi-Branch): Firestore security rules need significant redesign for branch scoping
- Phase 14 (Payment Gateway): Firebase Functions needed for webhook; adds server-side complexity

## Blockers

None currently.

## Notes

- `smoke-test.mjs` should be run before each PR to verify all module renders produce valid HTML
- `scripts/seed-demo.js` and `scripts/seed-members.js` are for demo environment setup only
- `gym.config.js` is git-ignored (contains real Firebase keys) — `.template` is the public version
- Phase 7 introduces new Firestore collection: `workout_sessions` (trainer-authored daily sessions)
- Phase 9 introduces new Firestore collection: `membership_pauses`
- Phase 10 reuses `workout_templates` with trainer ownership and visibility metadata
- Phase 11 introduces new Firestore collections: `exercise_library`, `workout_logs`, `workout_log_entries`

## Accumulated Context

### Roadmap Evolution

- Phase 11 edited: edited fields: title, goal, success_criteria to match Hevy-style requirements
