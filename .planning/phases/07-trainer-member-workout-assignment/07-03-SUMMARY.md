---
phase: 07-trainer-member-workout-assignment
plan: "03"
subsystem: member-workout-view
tags:
  - member-facing
  - workout
  - read-only
  - owner-overview
dependency_graph:
  requires:
    - 07-01
    - 07-02
  provides:
    - myWorkoutModule
    - trainers-assignment-overview
  affects:
    - modules/my-workout.js
    - modules/trainers.js
    - app.js
    - scripts/smoke-test.mjs
tech_stack:
  added: []
  patterns:
    - Read-only member module with session->template fallback logic
    - Owner assignment overview appended to existing owner CRUD module
    - escapeHtml applied to all interpolated fields (XSS mitigation)
key_files:
  created:
    - modules/my-workout.js
  modified:
    - modules/trainers.js
    - app.js
    - scripts/smoke-test.mjs
decisions:
  - Read-only module with no bind function (mirrors my-membership.js pattern)
  - Current assignment determined by latest assignedAt (newest-first sort)
  - Owner assignment overview section appended after .work-grid (no separate route)
  - escapeHtml on all rendered strings to satisfy T-07-08 XSS threat
metrics:
  duration: "2m 32s"
  completed: "2026-06-21T09:04:48Z"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 4
status: complete
---

# Phase 07 Plan 03: Member Workout View + Owner Assignment Overview Summary

## One-liner

Member-facing My Workout screen with trainer-session->assigned-template fallback and full assignment history, plus read-only owner overview on the Trainers screen showing all active workout assignments (member -> trainer -> template -> date).

## What Was Built

### Task 1 — modules/my-workout.js (commit 08cda15)

Created a new member-facing module `modules/my-workout.js` that exports `myWorkoutModule` with only a `render(context)` method (no `bind` — read-only screen mirroring `my-membership.js`).

**Render logic (4 paths):**
- **Membership pending** (`myMember` is null): shows "Membership being set up" empty state
- **Today's session exists** (`s.memberId === me.id && s.date === today()`): shows session exercises, template name, and notes in a `<pre>` block
- **No session but assignment exists**: falls back to the currently-assigned template's exercises (latest `assignedAt`) with a hint line indicating it is the assigned plan
- **Neither session nor assignment**: shows "No workout assigned yet" empty state

Assignment history panel lists all member assignments newest-first (sorted by `assignedAt` descending) in a `.data-table` with date and template name columns. All interpolated strings are wrapped in `escapeHtml` per the T-07-08 threat mitigation.

### Task 2 — modules/trainers.js (commit 009f4dc)

Extended the owner-facing Trainers screen by appending a read-only "Workout Assignments" section below the existing `.work-grid`. The section computes the most-recent assignment per member (latest `assignedAt` wins using Map-based grouping) and renders a four-column table: Member | Trainer | Template | Assigned date.

The section contains no `<button>`, no `<form>`, and no `data-action`/`data-edit`/`data-assign` attributes, satisfying the T-07-10 (Elevation of Privilege) threat mitigation. Added `dateLabel` and `findName` to the existing import line.

### Task 3 — app.js + scripts/smoke-test.mjs (commit 28c1b09)

- Added `import { myWorkoutModule } from "./modules/my-workout.js"` to `app.js`
- Added nav entry `["my-workout", "My Workout", "fitness_center", ["member"]]` (member-scoped)
- Registered `"my-workout": myWorkoutModule` in the `modules` registry
- Added same import and `myWorkoutModule` to `memberModules` array in `scripts/smoke-test.mjs`
- `node scripts/smoke-test.mjs` exits 0 with expected message across all paths (member + pending + owner + trainer)

## Verification Results

| Check | Result |
|-------|--------|
| `export const myWorkoutModule` count in my-workout.js | 1 |
| `s.date === today()` in my-workout.js | present |
| `a.memberId === me.id` in my-workout.js | present |
| `bind` function in my-workout.js | absent (0 occurrences) |
| Node inline render: session path | ok |
| Node inline render: template fallback path | ok |
| Node inline render: empty state path | ok |
| Node inline render: membership-pending path | ok |
| `Workout Assignments` heading in trainers.js render | present |
| Assignment overview: no button/form/data-action | confirmed |
| `import { myWorkoutModule }` in app.js | 1 |
| `"my-workout": myWorkoutModule` in app.js | 1 |
| nav entry with `["member"]` role in app.js | 1 |
| `import { myWorkoutModule }` in smoke-test.mjs | 1 |
| `myWorkoutModule` in memberModules array | present |
| `node scripts/smoke-test.mjs` exit code | 0 |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data sources are wired to live `context.data` collections loaded at boot. The module correctly handles empty arrays for all three collections.

## Threat Flags

No new security surface introduced beyond what the threat model covers:
- `modules/my-workout.js` renders only `workout_sessions` and `workout_assignments` data scoped to `me.id` (T-07-09 client-side enforcement)
- All string interpolations use `escapeHtml()` (T-07-08 mitigation)
- Owner assignment overview is purely read-only (T-07-10 mitigation)

## Self-Check: PASSED

Files present:
- modules/my-workout.js: FOUND
- modules/trainers.js: FOUND (modified)
- app.js: FOUND (modified)
- scripts/smoke-test.mjs: FOUND (modified)

Commits present:
- 08cda15: feat(07-03): create member-facing My Workout module with session/template fallback and history
- 009f4dc: feat(07-03): add read-only owner workout assignment overview to trainers module
- 28c1b09: feat(07-03): register my-workout route in app.js and smoke-test.mjs
