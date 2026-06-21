---
phase: 07-trainer-member-workout-assignment
plan: "01"
subsystem: data-layer
tags: [firestore, collections, security-rules, workout-sessions]
status: complete

dependency_graph:
  requires: []
  provides:
    - workout_sessions collection registered in all four data-layer wiring points
    - Firestore security rules for workout_sessions (trainer create, same-gym read)
    - Firestore security rules for workout_assignments (trainer create/update, same-gym read)
  affects:
    - app.js (collection boot loader)
    - lib/firebase-init.js (local/demo mode collection initializer)
    - modules/utils.js (collection name constants)
    - firestore.rules (security rules)
    - scripts/smoke-test.mjs (smoke test data fixture)

tech_stack:
  added: []
  patterns:
    - Cross-doc Firestore uid lookup for trainer write authorization (mirroring trainer_attendance pattern)
    - Four-point collection registration (app.js, firebase-init.js, utils.js, smoke-test.mjs)

key_files:
  modified:
    - app.js
    - lib/firebase-init.js
    - modules/utils.js
    - firestore.rules
    - scripts/smoke-test.mjs

decisions:
  - "workout_sessions stored as top-level collection (not sub-collection) to keep services.data.list() compatible"
  - "Trainer write rule mirrors trainer_attendance pattern: cross-doc get() on trainerId field to verify uid()"
  - "workout_assignments explicit block placed before catch-all to grant trainer write without removing catch-all"

metrics:
  duration: "8 minutes"
  completed_date: "2026-06-21"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 5
---

# Phase 07 Plan 01: Data Layer & Firestore Security Rules Summary

Register `workout_sessions` in all four data-layer wiring points and add explicit Firestore security rules for both `workout_sessions` and `workout_assignments` so trainers can author session and assignment records.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Register workout_sessions in all four wiring points | f4036d8 | app.js, lib/firebase-init.js, modules/utils.js, scripts/smoke-test.mjs |
| 2 | Add Firestore rules for workout_sessions and workout_assignments | 6985113 | firestore.rules |

## What Was Built

### Task 1 — Collection Registration

- `app.js`: Added `"workout_sessions"` to the `collectionNames` array (between `"workout_assignments"` and `"progress_records"`). `workout_assignments` not duplicated — count remains 1.
- `lib/firebase-init.js`: Added `"workout_sessions"` to the `COLLECTIONS` array, enabling local/demo mode to initialize an empty `state.collections.workout_sessions` array at boot.
- `modules/utils.js`: Added `workoutSessions: "workout_sessions"` key to the exported `collections` object (alongside the existing `assignments: "workout_assignments"`). Downstream UI plans can now use `collections.workoutSessions` as the canonical collection name constant.
- `scripts/smoke-test.mjs`: Added `workout_sessions: []` to the object returned by `makeData()`. Smoke test passes with the updated fixture.

### Task 2 — Firestore Security Rules

Added two explicit `match` blocks inside `match /databases/{database}/documents`, placed immediately before the catch-all `match /{collection}/{docId}` block:

**`match /workout_sessions/{docId}`:**
- `allow read: if sameGym()` — any same-gym signed-in user can read (member filters own data client-side)
- `allow create: if incomingSameGym() && (owner() || trainer-uid-check)` — trainer must prove `trainerId` field maps to a trainers doc whose `uid` matches `request.auth.uid` (cross-doc `get()` lookup identical to `trainer_attendance`)
- `allow update, delete: if owner() && sameGym()` — owner-only mutation

**`match /workout_assignments/{docId}`:**
- `allow read: if sameGym()` — same-gym read
- `allow create: if incomingSameGym() && (owner() || trainer-uid-check)` — same cross-doc uid verification
- `allow update: if (owner() || myRole() == "trainer") && sameGym() && incomingSameGym()` — trainers can update their own assignments; owner can update any
- `allow delete: if owner() && sameGym()` — owner-only delete

The catch-all rule is fully preserved. Brace structure is balanced (32 opening, 32 closing). File begins with `rules_version = '2';`.

## Verification Results

```
node scripts/smoke-test.mjs
Smoke render passed (owner + member + trainer + pending).

grep -v '^#' app.js | grep -c '"workout_sessions"'           → 1
grep -v '^#' lib/firebase-init.js | grep -c '"workout_sessions"' → 1
grep -c 'workoutSessions: "workout_sessions"' modules/utils.js   → 1
grep -c 'workout_sessions: \[\]' scripts/smoke-test.mjs          → 1
grep -c '"workout_assignments"' app.js                           → 1 (no duplication)
grep -c 'match /workout_sessions/{docId}' firestore.rules        → 1
grep -c 'match /workout_assignments/{docId}' firestore.rules     → 1
grep -c 'match /{collection}/{docId}' firestore.rules            → 1 (catch-all intact)
Brace balance: 32 == 32 (BALANCED)
```

## Deviations from Plan

None — plan executed exactly as written. Both tasks completed without any auto-fixes or deviations.

## Threat Model Coverage

| Threat | Mitigation Applied |
|--------|--------------------|
| T-07-01: Spoofing (trainer writing under another trainer's id) | Cross-doc `get(trainers/$(trainerId)).data.uid == uid()` check in workout_sessions create rule |
| T-07-02: Tampering (workout_assignments create spoofing) | Same cross-doc uid check in workout_assignments create rule |
| T-07-03: Information Disclosure (cross-gym read) | `allow read: if sameGym()` scopes reads to caller's gymId; client list() also filters by gymId |
| T-07-04: Elevation of Privilege (member writing sessions) | Create rule only permits `owner()` or `myRole() == "trainer"`; members have no create path |

## Known Stubs

None — this plan is purely data-layer infrastructure with no UI rendering. No stub values introduced.

## Decisions Made

1. `workout_sessions` stored as a top-level Firestore collection (not a sub-collection under members or trainers) to maintain compatibility with `services.data.list()` which only supports top-level collections.
2. Trainer write rule uses the cross-doc `get()` pattern from `trainer_attendance` — verifies that the `trainerId` field in the incoming document maps to a trainers roster doc whose `uid` equals the caller's Firebase auth uid. This prevents one trainer from writing sessions attributed to another trainer.
3. Explicit match blocks for both collections placed before the catch-all to override the catch-all's owner-only write restriction. Firestore applies the most specific matching rule, so adding explicit blocks is safe without removing the catch-all.

## Next Steps (Plan 02)

Plan 02 will create `modules/trainer-members.js` — the trainer-facing view that reads `data.workout_sessions` and `data.workout_assignments` (now available in app state) and writes new session and assignment records. The data-layer foundation built in this plan removes both blockers (missing collection in state, blocked trainer writes) so Plan 02 and Plan 03 can proceed.

## Self-Check: PASSED

- [x] `app.js` — `workout_sessions` present once, `workout_assignments` not duplicated
- [x] `lib/firebase-init.js` — `workout_sessions` present once
- [x] `modules/utils.js` — `workoutSessions: "workout_sessions"` present
- [x] `scripts/smoke-test.mjs` — `workout_sessions: []` present, smoke test exits 0
- [x] `firestore.rules` — both match blocks present, catch-all intact, braces balanced
- [x] Commits f4036d8 and 6985113 verified in git log
