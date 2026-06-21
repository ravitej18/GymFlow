---
phase: 07-trainer-member-workout-assignment
verified: 2026-06-21T09:10:54Z
status: human_needed
score: 6/6 must-haves verified
behavior_unverified: 2
overrides_applied: 0
human_verification:
  - test: "Sign in as a trainer, navigate to My Members, confirm only members where assignedTrainer matches your trainer doc id are listed"
    expected: "Members from other trainers are not visible; member name, goal, and current template name appear on each card"
    why_human: "Client-side filter (assignedTrainer === me.id) correctness depends on runtime data state and actual Firestore gymId scoping — cannot be verified without a live session"
  - test: "As a trainer, select a template from the inline dropdown on a member card; confirm a new workout_assignments record is created and the toast 'Template assigned.' appears"
    expected: "Assignment saved; card reflects latest template without full page reload (applyChange)"
    why_human: "Requires Firestore write + cross-doc uid rule enforcement at runtime; smoke test only covers render path"
  - test: "As a trainer, fill the Write Today's Session form and submit; confirm a workout_sessions record is created with the trainer's roster doc id as trainerId"
    expected: "Toast 'Today's session saved.' appears; form resets; session appears in member's My Workout screen for today"
    why_human: "End-to-end trainer-write -> member-read data flow requires a live Firestore session or local storage write that smoke test does not exercise"
  - test: "Sign in as a member who has both a trainer-authored session for today and an assigned template; confirm the session (not the template) is shown on My Workout"
    expected: "Today's session exercises appear in a pre block; 'No session written for today' hint is absent"
    why_human: "today() match is date-string equality — correctness depends on session date matching the current date at runtime, not verifiable statically"
  - test: "Sign in as a member with no session for today but a template assignment; confirm the fallback template exercises appear with the hint 'No session written for today — showing your assigned plan.'"
    expected: "Template exercises visible; hint line present"
    why_human: "Fallback path requires live data state (session absent, assignment present)"
  - test: "Sign in as owner, navigate to Trainers screen, confirm the Workout Assignments section shows member -> trainer -> template -> date rows with no edit controls"
    expected: "Table renders; no button/form/edit affordance is visible in the assignment section"
    why_human: "Visual UI confirmation required; the section renders from live workout_assignments data"
behavior_unverified_items:
  - truth: "After saving, the new record is reflected without a full page reload (applyChange) and a toast confirms the save"
    test: "Submit the session form as a trainer and observe whether the UI updates in-place without a hash navigation or full reload"
    expected: "applyChange() inserts the new doc into local state and renderView() re-renders only #view; no shell rebuild"
    why_human: "applyChange wiring is present in code but the state-transition invariant (no full reload, correct list prepend) requires runtime observation"
  - truth: "A trainer can assign a workout template to one of their members, creating a workout_assignments record"
    test: "Change the inline template select on a member card; observe Firestore write in the network tab and verify the workout_assignments collection receives a new doc with correct memberId, trainerId, templateId, assignedAt"
    expected: "New document written; no existing document mutated (history preserved); trainerId matches trainer's roster doc id not profile.uid"
    why_human: "The always-create-new-record invariant (Risk 4 / history preservation) and correct trainerId field value require Firestore write verification at runtime"
---

# Phase 7: Trainer-Member Workout Assignment Verification Report

**Phase Goal:** Bridge trainer workflow with member experience — trainers assign workout plans, deliver today's session, and members consume their workout.
**Verified:** 2026-06-21T09:10:54Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Trainer can assign a workout template to a member (writes to workout_assignments) | VERIFIED | `modules/trainer-members.js` bind() wires `[data-assign-template]` select change to `context.services.data.save(collections.assignments, ...)` with trainerId, memberId, templateId, assignedAt. `collections.assignments` maps to `"workout_assignments"` in utils.js. Smoke test passes. |
| 2 | Trainer can create a "today's session" for a member with exercises, sets, reps, weight targets, notes | VERIFIED | `#session-form` submit handler in bind() calls `context.services.data.save(collections.workoutSessions, payload)` with trainerId: me.id, date, exercises, notes fields. Form renders member select, date input, template select, exercises textarea, notes textarea. |
| 3 | workout_sessions Firestore collection stores trainer-authored session records | VERIFIED | `firestore.rules` line 150-162: explicit `match /workout_sessions/{docId}` block with `allow create: if incomingSameGym() && (owner() \|\| trainer uid cross-doc check)`. Collection registered in app.js collectionNames (line 89), lib/firebase-init.js COLLECTIONS (line 12), modules/utils.js collections object, scripts/smoke-test.mjs makeData(). |
| 4 | Member "My Workout Today" screen shows today's trainer session if one exists, otherwise the assigned template | VERIFIED | `modules/my-workout.js` render(): `sessions.find(s => s.memberId === me.id && s.date === today())` for session; if-else fallback to `current.templateId` template. All 4 paths confirmed by inline node behavioral check: session path, fallback path, empty state, pending-member state. |
| 5 | Member can view their full assignment history (template changes over time) | VERIFIED | `modules/my-workout.js` renders `myAssignments` sorted by `assignedAt` descending in a `.data-table` with date and template name columns. History panel shows count and "No history yet" empty state. |
| 6 | Owner can view all assignments per trainer and per member | VERIFIED | `modules/trainers.js` appends `assignmentOverview` section after `.work-grid`. Section computes latest assignment per member via Map grouping, renders four-column table (Member, Trainer, Template, Assigned). No edit controls present — grep for `<button` inside assignmentOverview template literal returns 0 matches. Node behavioral check confirms "Workout Assignments" heading and template name render correctly. |

**Score:** 6/6 truths verified (2 present, behavior-unverified — runtime state transitions not exercised by automated checks)

### Deferred Items

None.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `modules/trainer-members.js` | Trainer-facing module: assigned-members list + assign-template + write-session forms | VERIFIED | 134 lines, exports `trainerMembersModule`, strict `assignedTrainer ===` filter, both collection saves, `trainerId: me.id`, no modal-overlay |
| `modules/my-workout.js` | Member-facing My Workout Today screen with session→template fallback + assignment history | VERIFIED | 90 lines, exports `myWorkoutModule`, `s.date === today()` session match, `a.memberId === me.id` history filter, no `bind` function |
| `modules/trainers.js` | Owner read-only assignment overview section appended below trainer card grid | VERIFIED | Contains "Workout Assignments" heading and `workout_assignments` data reference; section has no `<button`, `<form`, or `data-action` attributes |
| `app.js` | trainer-members and my-workout routes registered (import, modules map, nav entry, role-scoped) | VERIFIED | Lines 18-19: both imports present. Lines 47/50: nav entries with `["member"]` and `["trainer"]` roles. Lines 70-71: both registered in modules registry. Lines 88-89: `workout_sessions` in collectionNames. |
| `firestore.rules` | workout_sessions and workout_assignments explicit match blocks with trainer write authorization | VERIFIED | Lines 150-179: both blocks present before catch-all. Both include `allow read: if sameGym()`, trainer create with cross-doc uid check mirroring `trainer_attendance` pattern. Catch-all preserved at line 183. |
| `lib/firebase-init.js` | workout_sessions registered in COLLECTIONS for local/demo mode | VERIFIED | Line 12: `"workout_sessions"` in COLLECTIONS array |
| `modules/utils.js` | workoutSessions collection constant | VERIFIED | `workoutSessions: "workout_sessions"` present in exported collections object |
| `scripts/smoke-test.mjs` | trainerMembersModule and myWorkoutModule in respective module arrays | VERIFIED | Line 16-17: both imported. Line 62: `myWorkoutModule` in memberModules. Line 75: `trainerMembersModule` in trainerModules. Both tested against pending (null roster doc) paths. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `modules/trainer-members.js` bind | `workout_sessions` collection | `context.services.data.save(collections.workoutSessions, payload)` | WIRED | `collections.workoutSessions` present twice in file (save call + applyChange call) |
| `modules/trainer-members.js` bind | `workout_assignments` collection | `context.services.data.save(collections.assignments, ...)` | WIRED | `collections.assignments` present twice (save call + applyChange call) |
| `modules/trainer-members.js` render | `context.data.members` | `filter(m => m.assignedTrainer === me.id)` | WIRED | Strict equality filter confirmed at line 13 |
| `app.js modules map + nav` | `modules/trainer-members.js` | import + `"trainer-members": trainerMembersModule` + nav `["trainer"]` | WIRED | Lines 18, 50, 70 |
| `modules/my-workout.js` render | `workout_sessions` collection | `sessions.find(s => s.memberId === me.id && s.date === today())` | WIRED | Line 18 of my-workout.js |
| `modules/my-workout.js` render | `workout_assignments` collection | `assignments.filter(a => a.memberId === me.id).sort(assignedAt desc)` | WIRED | Lines 22-24 of my-workout.js |
| `modules/trainers.js` render | `context.data.workout_assignments` | `const allAssignments = data.workout_assignments \|\| []` at line 8 | WIRED | Map grouping by memberId, renders four-column table |
| `app.js modules map + nav` | `modules/my-workout.js` | import + `"my-workout": myWorkoutModule` + nav `["member"]` | WIRED | Lines 19, 47, 71 |
| `firestore.rules` workout_sessions create | `trainers` collection uid lookup | `get(/databases/$(database)/documents/trainers/$(request.resource.data.trainerId)).data.uid == uid()` | WIRED | Lines 157-159 |
| `firestore.rules` workout_assignments create | `trainers` collection uid lookup | Same cross-doc pattern | WIRED | Lines 173-175 |
| `app.js collectionNames` | `lib/firebase-init.js` COLLECTIONS | Both include `"workout_sessions"` enabling list() at boot | WIRED | app.js line 89; firebase-init.js line 12 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `modules/trainer-members.js` | `myMembers`, `assignments`, `templates` | `context.data.members`, `context.data.workout_assignments`, `context.data.workout_templates` — loaded at boot via `collectionNames.map(name => services.data.list(name))` in app.js | Yes — live Firestore or localStorage collections; empty arrays in demo mode (not hardcoded) | FLOWING |
| `modules/my-workout.js` | `sessions`, `assignments`, `templates` | Same boot-loaded `context.data.*` collections | Yes | FLOWING |
| `modules/trainers.js` assignment overview | `allAssignments` | `data.workout_assignments` from boot-loaded context | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Smoke test: all module render paths | `node scripts/smoke-test.mjs` | `Smoke render passed (owner + member + trainer + pending).` exit 0 | PASS |
| my-workout.js — today's session path | inline node render with session matching today's date | "Bench 3x10" present in output | PASS |
| my-workout.js — template fallback path | inline node render, no session, assignment with templateId | "Squat 5x5" from template exercises present | PASS |
| my-workout.js — empty state path | inline node render, no session, no assignment | "No workout assigned yet" present | PASS |
| my-workout.js — pending-member path | inline node render, myMember null | "Membership being set up" present | PASS |
| trainers.js — owner assignment overview | inline node render with one assignment record | "Workout Assignments" and "PPL" both present | PASS |
| trainer-members.js — trainer render path | smoke test trainerContext | passes (member + pending paths both pass) | PASS |
| my-workout has no bind | `grep 'bind' modules/my-workout.js` | exit 1 (no match — read-only module confirmed) | PASS |
| No debt markers in modified files | `grep -nE "TBD\|FIXME\|XXX" <modified files>` | No output | PASS |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| P7-SC1 | Trainer can assign a workout template to a member (writes to workout_assignments) | SATISFIED | trainer-members.js bind() wires assignment save |
| P7-SC2 | Trainer can create a "today's session" for a member with exercises, sets, reps, weight targets, notes | SATISFIED | session-form submit handler in trainer-members.js bind() |
| P7-SC3 | workout_sessions Firestore collection stores trainer-authored session records | SATISFIED | firestore.rules explicit block + four-point registration |
| P7-SC4 | Member "My Workout Today" screen shows today's trainer session if one exists, otherwise the assigned template | SATISFIED | my-workout.js render() with today()-match + fallback |
| P7-SC5 | Member can view their full assignment history | SATISFIED | my-workout.js Assignment History panel with assignedAt-sorted table |
| P7-SC6 | Owner can view all assignments per trainer and per member | SATISFIED | trainers.js read-only assignmentOverview section |
| P7-INFRA | workout_sessions registered in app state at boot, demo mode, utils constants | SATISFIED | app.js, firebase-init.js, utils.js, smoke-test.mjs all updated |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | No TBD/FIXME/XXX markers, no modal-overlay stubs, no return null / return {} / return [] in new modules | — | — |

No anti-patterns detected in any of the 8 files modified or created by this phase.

### Human Verification Required

#### 1. Trainer "My Members" screen — filtered member list

**Test:** Sign in as a trainer, navigate to My Members, confirm only members where `assignedTrainer` matches your trainer doc id are listed
**Expected:** Members from other trainers are not visible; member name, goal, and current template name appear on each card
**Why human:** Client-side filter (`assignedTrainer === me.id`) correctness depends on runtime data state and actual Firestore gymId scoping — cannot be verified without a live session

#### 2. Trainer template assignment — Firestore write + history preservation

**Test:** As a trainer, select a template from the inline dropdown on a member card; confirm a new `workout_assignments` record is created (not an update) and the toast "Template assigned." appears
**Expected:** New document created; existing assignment docs not mutated; card reflects latest template without full page reload (applyChange)
**Why human:** The always-create-new-record invariant and correct trainerId field require Firestore write verification at runtime; smoke test only covers render path

#### 3. Trainer session write — end-to-end

**Test:** As a trainer, fill the Write Today's Session form and submit; confirm a `workout_sessions` record is created with the trainer's roster doc id as `trainerId`
**Expected:** Toast "Today's session saved." appears; form resets with today's date restored; session appears in the member's My Workout screen
**Why human:** End-to-end trainer-write → member-read data flow requires a live Firestore session

#### 4. Member "My Workout" — today's session priority

**Test:** Sign in as a member who has both a trainer-authored session for today and an assigned template; confirm the session (not the template) is shown
**Expected:** Session exercises appear in a `<pre>` block; "No session written for today" hint is absent
**Why human:** `today()` match is date-string equality — correctness depends on session date matching the current date at runtime

#### 5. Member "My Workout" — template fallback

**Test:** Sign in as a member with no session for today but a template assignment; confirm the fallback template exercises appear with the hint "No session written for today — showing your assigned plan."
**Expected:** Template exercises visible; hint line present
**Why human:** Fallback path requires live data state (session absent, assignment present)

#### 6. Owner Trainers screen — assignment overview display

**Test:** Sign in as owner, navigate to Trainers screen, confirm the Workout Assignments section shows member → trainer → template → date rows with no edit controls
**Expected:** Table renders; no button/form/edit affordance is visible in the assignment section
**Why human:** Visual UI confirmation required; the section renders from live `workout_assignments` data

---

## Gaps Summary

No gaps found. All 6 phase success criteria are verified at the code level. All required artifacts exist and are substantive (non-stub), wired into the module system, and data-flow is connected to live boot-loaded collections.

Two truths have been marked ⚠️ PRESENT_BEHAVIOR_UNVERIFIED because their correctness depends on runtime state transitions (the applyChange no-reload invariant) and write-side invariants (always-create-new assignment record, correct trainerId field value in Firestore). These cannot be proven by symbol presence or smoke test alone.

Six human verification items cover the full trainer and member runtime flows. No blockers prevent proceeding to manual UAT.

---

_Verified: 2026-06-21T09:10:54Z_
_Verifier: Claude (gsd-verifier)_
