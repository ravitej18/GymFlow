---
phase: 07-trainer-member-workout-assignment
plan: "02"
subsystem: trainer-members
tags: [trainer, workout-assignment, workout-sessions, module, routing]
dependency_graph:
  requires:
    - 07-01
  provides:
    - modules/trainer-members.js (trainerMembersModule)
    - trainer-members route (app.js)
  affects:
    - app.js
    - scripts/smoke-test.mjs
tech_stack:
  added: []
  patterns:
    - work-grid two-panel layout (form left / list right)
    - withButtonLoading for async form submit
    - applyChange for optimistic local state update
    - strict equality filter for assignedTrainer
    - always-create-new assignment record (history preserved)
key_files:
  created:
    - modules/trainer-members.js
  modified:
    - app.js
    - scripts/smoke-test.mjs
decisions:
  - No modal overlay for session form; form stays in left panel (research decision)
  - trainerId stored as me.id (roster doc id), not profile.uid, consistent with trainer_attendance
  - Always create a new workout_assignments record on template assign (history preserved, Risk 4)
  - Strict equality (===) for assignedTrainer filter to exclude members with empty/undefined field
metrics:
  duration: "15 minutes"
  completed: "2026-06-21"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
status: complete
---

# Phase 07 Plan 02: Trainer Members Module Summary

## One-liner

Trainer-facing My Members screen with inline session writer and per-member template assignment using workout_sessions and workout_assignments collections.

## What Was Built

Created `modules/trainer-members.js` exporting `trainerMembersModule` — a trainer-only screen
that lets a trainer view their assigned members, write daily workout sessions, and assign workout
templates. Registered the `trainer-members` route in `app.js` (trainer-scoped) and added coverage
in `scripts/smoke-test.mjs`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create modules/trainer-members.js | 0790bbc | modules/trainer-members.js |
| 2 | Register trainer-members route in app.js and smoke-test.mjs | 4858b09 | app.js, scripts/smoke-test.mjs |

## Implementation Details

### modules/trainer-members.js

- `render(context)`: Early-return empty state when `context.myTrainer` is falsy. Filters members
  with strict `m.assignedTrainer === me.id`. Computes current template per member from the latest
  `assignedAt` assignment record. `.work-grid` with session form on left, members card grid on right.
- `bind(root, context)`: Wires `#session-form` submit with `withButtonLoading`; saves to
  `collections.workoutSessions` with `trainerId: me.id`. Wires each `[data-assign-template]` select
  change event; disables select during async save; saves to `collections.assignments` with
  `trainerId: me.id` and `assignedAt: today()`.

### app.js

- Import: `import { trainerMembersModule } from "./modules/trainer-members.js";`
- Nav entry: `["trainer-members", "My Members", "group", ["trainer"]]`
- Modules registry: `"trainer-members": trainerMembersModule`

### scripts/smoke-test.mjs

- Import: `import { trainerMembersModule } from "../modules/trainer-members.js";`
- Added to `trainerModules` array — tested against both `trainerContext` (with roster doc) and
  `pendingTrainer` (myTrainer: null) paths.

## Verification Results

All acceptance criteria passed:

- `grep -c 'export const trainerMembersModule' modules/trainer-members.js` → 1
- `grep -c 'assignedTrainer === ' modules/trainer-members.js` → 1
- `grep -c 'collections.workoutSessions' modules/trainer-members.js` → 2
- `grep -c 'collections.assignments' modules/trainer-members.js` → 2
- `grep -c 'trainerId: me.id' modules/trainer-members.js` → 1
- `grep -c 'modal-overlay' modules/trainer-members.js` → 0 (correct)
- `grep -c 'today()' modules/trainer-members.js` → 4
- `node scripts/smoke-test.mjs` → exits 0, prints `Smoke render passed (owner + member + trainer + pending).`

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. The module renders live data from `context.data.members`, `context.data.workout_templates`,
and `context.data.workout_assignments` without hardcoded placeholders.

## Threat Surface Scan

No new threat surface beyond what the plan's threat model covers:

- T-07-05 (trainerId tampering): mitigated — UI sets `trainerId: me.id` from trainer's own roster doc
- T-07-06 (member information disclosure): mitigated — strict `assignedTrainer === me.id` filter
- T-07-07 (XSS in exercises/notes/name rendering): mitigated — all fields wrapped in `escapeHtml()`

## Self-Check: PASSED

- modules/trainer-members.js: FOUND
- app.js (trainer-members import, nav, modules): FOUND
- scripts/smoke-test.mjs (trainerMembersModule): FOUND
- Commit 0790bbc: FOUND
- Commit 4858b09: FOUND
