---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
stopped_at: Phase 19 (openGym feature catch-up) built, awaiting commit
last_updated: "2026-08-27T00:00:00.000Z"
progress:
  total_phases: 14
  completed_phases: 13
  total_plans: 16
  completed_plans: 16
---

# GymFlow — Project State

## Current Status

- **Milestone:** v1.0
- **Active Branch:** `featurecatchup`
- **Last Phase Completed:** Phase 19 — Training Feature Catch-Up (uncommitted)
- **Next Phase:** Phase 15 — Multi-Branch Support

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
| 11 | Member Workout Logging & Exercise Library (Hevy-Style) | main | 2026-07-28 |
| 12 | Implement PBL gamification strategy (points, badges, leaderboard, PRs, milestones) | main | 2026-07-29 |
| 13 | Phone number based login and WhatsApp invitation links | main | 2026-07-30 |
| 14 | Analytics & Insights | feature/member-view-refactor | 2026-07-31 |
| 16 | Owner UX Enhancements | feature/member-view-refactor | 2026-07-31 |
| 17 | Database Performance Optimization & Scoped Loading | main | 2026-08-10 |
| 18 | Psychological Principles & UX Optimization | main (#30) | 2026-08-11 |
| 19 | Training Feature Catch-Up | featurecatchup (uncommitted) | 2026-08-27 |

## Upcoming Phases (Priority Order)

| Phase | Name | Priority |
|---|---|---|
| 15 | Multi-Branch Support | MEDIUM |

## In-Progress Work

- **Branch:** `featurecatchup`
- **Status:** Phase 19 code complete and tested; changes are uncommitted in the
  working tree awaiting review. See `docs/TRAINING_FEATURES.md`.

### Phase 19 — Training Feature Catch-Up (2026-08-27)

Closed the training-experience gaps against a comparable open-source gym app.

| Area | Delivered |
|---|---|
| Workout runner | Supersets, timed/cardio modes, screen wake lock, live "who is training now" presence, rest timer, next-set highlight |
| Progression | New engine with 5 schemes (linear, Greyskull LP, double, bodyweight, timed) plus automatic deloads after stalls |
| Analytics | Estimated 1RM, per-exercise curves, RPE/RIR effort profile, anatomical body map, training heatmap |
| Importers | FitNotes, Strong, Hevy, Apple Health — verified against real export headers |
| Native | Capacitor Android shell under `native/`, isolated from the build-step-free web app |

**New modules:** `workout-progression.js`, `workout-analytics.js`, `workout-import.js`
**New collection:** `workout_presence` (with Firestore rules)
**Tests:** 10 suites, all passing

**Not done, deliberately:**
- Localized exercise instructions — the dataset has 4,414 unique English steps;
  offline substitution produces mixed-language output. Needs on-demand
  translation with a per-exercise cache.
- Passkeys / WebAuthn — Firebase Auth has no native support; assertion
  verification needs Cloud Functions and therefore the Blaze billing plan.

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

- Phase 15 (Multi-Branch): Firestore security rules need significant redesign for branch scoping

## Blockers

None currently.

## Needs Verification

- `workout_presence` Firestore rules are written and scoped but have not been
  exercised against the emulator.
- The Capacitor shell generates and bundles correctly (`npx cap add android`
  was run successfully), but no APK has been compiled — that needs the Android
  SDK and JDK 17.

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
- Phase 16 added: Implement PBL gamification strategy (points, badges, leaderboard, PRs, milestones)
- Phase 14 and 15 removed; re-sequenced remaining future phases to 12 (PBL), 13 (Analytics), and 14 (Multi-Branch)
- Phase 12.1 inserted: Phone number based login and WhatsApp invitation links
- Phase 12.1 renumbered to Phase 13: to allow Phase 12 improvement revisions in future
- Phase 14 (Analytics & Insights) and Phase 16 (Owner UX Enhancements) completed on 2026-07-31

## Session

**Last session:** 2026-08-11T04:46:30.593Z
**Stopped at:** Phase 18 planned
**Resume file:** .planning/phases/18-psychological-principles-ux-optimization/18-PLAN.md
