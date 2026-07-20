---
phase: 10-trainer-workout-module-library
plan: "01"
status: complete
completed: "2026-07-18"
files_changed:
  - app.js
  - firestore.rules
  - modules/workouts.js
  - modules/trainer-members.js
  - modules/my-workout.js
  - scripts/smoke-test.mjs
  - styles/main.css
---

# Phase 10 Plan 01 Summary: Trainer Workout Module Library + Basic Member Library

## What was built

Trainer workout module creation is now separated from client assignment. Trainers can
create reusable modules first, mark them Private or Basic, and assign them later to
assigned clients. Basic modules are automatically visible to members in My Workout.

The trainer interface was also renamed from "My Members" to "My Clients" / "Assigned
Clients".

## Changes

### `app.js`

- Trainers can access the `Workouts` route.
- Trainer sidebar label changed from `My Members` to `My Clients`.

### `modules/workouts.js`

- Reworked owner/trainer Workouts screen into a workout module library.
- Trainers can create modules without selecting a client.
- Modules support:
  - `visibility`: `private` or `basic`
  - `createdByRole`
  - `createdByUid`
  - `trainerId`
  - `goal`
  - `category`
  - `difficulty`
  - `equipment`
  - `durationMinutes`
  - `exercisesStructured`
- Trainers can publish Basic modules directly; no owner approval state is used.
- Added module filters for search, category, difficulty, and visibility.
- Added Duplicate action to clone visible modules into a private copy.
- Added structured exercise row builder with add/remove rows.
- Polished the structured exercise builder into compact exercise blocks with the
  remove action at the bottom instead of beside the exercise name.
- Added shared `canUseWorkoutTemplate()` and `renderTemplateExercises()` helpers.

### `modules/trainer-members.js`

- Page copy now says My Clients / Assigned Clients.
- Assignment dropdown only shows usable modules:
  - owner/global modules
  - Basic modules
  - the current trainer's private modules
- Other trainers' private modules are hidden.
- Added module preview before assignment.
- Added per-client assign button.
- Added bulk assignment form to assign one module to multiple clients.
- Previews render structured exercises when present.

### `modules/my-workout.js`

- Added Basic Workouts panel below Today's Workout and Assignment History.
- Members see modules where `visibility === "basic"` and `status !== "archived"`.
- Added Basic Workouts filters for search, category, and difficulty.
- Basic cards render structured exercise rows when present.

### `firestore.rules`

- Added explicit `match /workout_templates/{docId}` block.
- Owner can manage all same-gym workout templates.
- Trainer can create/update only trainer-owned templates where:
  - `createdByRole == "trainer"`
  - `createdByUid == request.auth.uid`
  - `trainerId` maps to their trainer roster doc
  - visibility is `private` or `basic`
- Members cannot create/update/delete templates.

### `styles/main.css`

- Added styles for:
  - module previews
  - client checkbox list
  - structured exercise builder rows
  - structured exercise display rows

### `scripts/smoke-test.mjs`

- Added smoke coverage for:
  - trainer Workouts render
  - trainer private module visibility
  - hiding another trainer's private module
  - My Clients wording
  - module preview and bulk assignment UI
  - member Basic Workouts panel and filters
  - structured exercise rendering

## Verification

- [x] Trainer sidebar shows `Workouts`
- [x] Trainer sidebar label says `My Clients`
- [x] Trainer can create a workout module without selecting a client
- [x] Trainer-created private module appears to owner and creator trainer
- [x] Another trainer's private module is hidden
- [x] Trainer-created Basic module appears to members in My Workout
- [x] Trainer can assign one module to one assigned client
- [x] Trainer can bulk assign one module to multiple assigned clients
- [x] Module preview appears before assignment
- [x] Members can filter Basic Workouts by search/category/difficulty
- [x] Structured exercise rows can be captured and rendered
- [x] Firestore rules include `match /workout_templates/{docId}`
- [x] `node scripts/smoke-test.mjs` passes
- [x] JS syntax check passes
- [x] `git diff --check` passes
- [x] Firestore rules brace balance check passes

## Decisions

- No owner approval flow in this phase. Trainers can publish Basic modules directly.
- Reused existing `workout_templates` collection instead of adding a new collection.
- Kept free-text `exercises` for backward compatibility while adding `exercisesStructured`.
- Kept route key `trainer-members` for compatibility, changing only visible text.

## Remaining ideas

- Draft/Published/Archived lifecycle if trainers need module drafting.
- Member saved/favorite Basic workouts.
- Usage analytics showing how many clients use each module.
