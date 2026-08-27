# Training Features — Runner, Progression, Analytics, Import

**Last updated:** 2026-08-27
**Scope:** the member-facing training experience — logging a workout, deciding
what weight to use, analysing the results, and bringing history in from another
app.

This document covers four modules added on top of the Phase 11 workout logging
foundation. All four keep the project's core constraint: **no build step, no
runtime dependencies** — plain ES modules served from any static host.

---

## Design principle: pure engines, thin UI

Each feature is split in two:

| Engine (pure functions) | Rendering / wiring |
|---|---|
| `modules/workout-progression.js` | `modules/my-workout.js` |
| `modules/workout-analytics.js` | `modules/progress.js` |
| `modules/workout-import.js` | `modules/my-workout.js` (Import tab) |

The engines take data and return data. No DOM, no Firebase, no globals. That is
what makes them testable in Node with no harness — and every one of them is
covered by a script under `scripts/`.

**If you change an engine, add a test.** These modules compute numbers members
will trust (estimated 1RM, suggested weight, imported history). A silent error
here is worse than a crash.

---

## 1. Guided workout runner

Lives in `myWorkoutModule.renderActiveLogger()` / `bindActiveLogger()`.

| Feature | Notes |
|---|---|
| Live elapsed timer | 1s interval, cleared by `destroy()` |
| Rest timer | 90s default, start / skip / auto-expire; stored as `restUntil` epoch ms |
| Set completion | Ticking a set starts the rest timer |
| Next-set highlight | First unticked set is outlined |
| Progress bar + set counter | Completed / total across all exercises |
| Previous bests | Per-set values from the last session; best-ever on hover |
| Supersets | Exercises sharing a `supersetId` render as one linked block |
| Timed / cardio modes | `mode: "reps" \| "timed" \| "cardio"` relabels the columns |
| Screen wake lock | Held for the session; re-acquired when the tab returns |
| Live presence | "Who is training now", see below |

### The hot-path rule

**Never call `context.refreshView()` when a member ticks a set.** `refreshView()`
re-reads the backend and rebuilds the page — that is a Firestore read burst per
set and it steals focus from the weight/reps inputs mid-workout.

Use `syncRunnerUi(root, activeWorkout)` instead. It patches the progress bar,
set counter, next-set outline and rest chip in place. The same reasoning applies
to the analytics tab's `data-balance-card` swap.

### Module lifecycle

`app.js` swaps screens with `innerHTML`, which does **not** stop timers. A
`destroy?()` hook was added to `renderView()` for this: the outgoing module gets
a chance to release intervals and listeners. `myWorkoutModule.destroy()` clears
the elapsed timer, the rest countdown, the presence heartbeat and the wake lock.

If you add a module that starts an interval, implement `destroy()`.

### Live presence

A lightweight heartbeat, not a realtime subscription.

- Collection: `workout_presence`, one row per member mid-workout
- Heartbeat: every 60s while the logger is open
- TTL: rows older than 5 minutes are ignored client-side
- Cleanup: the row is deleted on save/discard; a closed tab simply ages out
- Failure is silent by design — a blocked write must never interrupt a workout

Firestore rules allow a member to create, update and delete **only their own**
row, matched by `memberId` → `members/{id}.uid`.

---

## 2. Automatic progression engine

`modules/workout-progression.js` — decides what to put in front of a member and
explains why. Entry point:

```js
planExercise(exercise, logs, { memberId, scheme, config })
```

Returns a new exercise with seeded sets and a `progressionNote`. Never mutates
the input. An exercise with no usable history is returned unchanged, so a first
session shows the plan as written.

### Schemes

| Key | Behaviour |
|---|---|
| `linear` | +2.5 kg when every planned rep was hit, else hold |
| `greyskull` | Last set is AMRAP. Clearing target → +1 step; 10+ reps → double step. Upper body 2.5 kg, lower body 5 kg |
| `double` | Climb the 8–12 rep range at fixed load, then +2.5 kg and reset to 8 |
| `bodyweight` | No load; +1 rep per clean session |
| `timed` | +5 seconds on the best hold |

Scheme is auto-detected when not specified: name hints pick `timed` (plank,
carry, hang), history with no weight ever logged picks `bodyweight`, otherwise
`linear`. Members can override per exercise from the runner.

### Deloads

Orthogonal to the scheme. After `stallsBeforeDeload` (default 3) consecutive
sessions that miss the target, weighted schemes cut `deloadPct` (default 10%)
and say so. Never deloads below `minBarWeight` (20 kg).

`countStalls()` counts back from the most recent session and **stops at the
first success** — an old failure does not haunt a member who has since recovered.

### Configuration

`DEFAULT_PROGRESSION_CONFIG` is overridable per call. `progressionConfigFor()`
in `my-workout.js` reads `member.progressionIncrement` /
`member.stallsBeforeDeload`, falling back to gym settings, then the defaults.

---

## 3. Training analytics

`modules/workout-analytics.js`, surfaced as **Progress → Training Analytics**.

| Function | Produces |
|---|---|
| `estimateOneRepMax(weight, reps)` | Epley estimate; returns 0 above 12 reps rather than guessing |
| `exerciseSeries(logs, name)` | Per-session volume, 1RM, top weight — oldest first |
| `exerciseSummary(logs, name)` | Current/best 1RM, session count, % change |
| `loggedExercises(logs)` | Every exercise trained, ranked |
| `effortBreakdown(logs)` | RPE distribution, average RPE **and RIR** (`RIR = 10 − RPE`) |
| `muscleBalance(logs, resolveCategory)` | Sets per muscle group, driving the body map |
| `activityHeatmap(logs)` | Sets per weekday × time block |

### The legacy-log trap

Saved workout logs **drop the per-set `done` flag** (see the payload built in
`my-workout.js`). So analytics cannot simply filter on `done`.

`isLegacyLog()` decides per **log**, not per exercise: a log with no `done` key
anywhere predates the flag and every populated set counts. Within a modern log,
an exercise whose sets are all unticked was genuinely **skipped** and must be
excluded.

Getting this wrong the per-exercise way credits never-performed sets and inflates
volume and personal records. There is a regression test for exactly this.

### Muscle balance and the body map

Exercise → muscle group is resolved through `lib/exercises-pruned.json`, whose
`category` field carries the region. **The dataset has no `bodyPart` key** —
older code read `ex.bodyPart` and silently got nothing on all 1,324 records. Use
`exerciseCategory()` from `utils.js`, which accepts either.

The ten dataset categories fold into six groups (`MUSCLE_GROUPS`). Regions are
shaded by share of a single accent colour, so the map stays readable in both
themes and under colour-vision deficiency; every region also carries a `<title>`
and the exact counts sit in the bars beside it.

The library loads lazily. Until it resolves, every lookup misses — the card shows
a loading state rather than a chart of zeros, then swaps itself in place.

---

## 4. Importers

`modules/workout-import.js` — brings history over from other fitness apps.
Surfaced as **My Workout → Import**. Nothing is written until the member reviews
a preview and confirms.

| Source | Produces |
|---|---|
| FitNotes (Android CSV) | Workouts |
| Strong (CSV) | Workouts |
| Hevy (CSV) | Workouts |
| Apple Health (export.xml or CSV) | Body-weight records |

### Formats are verified, not guessed

Column names were checked against published real exports and, for FitNotes,
against the app's own export code. `scripts/test-import-formats.mjs` carries the
exact header rows with source citations. **This caught three real bugs** in the
first implementation:

- **Hevy imperial exports imported pounds as kilograms.** The unit lives in the
  *column name* (`weight_kg` vs `weight_lbs`, `distance_km` vs `distance_miles`)
  and the pair swaps wholesale. The original code sniffed a cell value, which is
  empty on a zero-weight set.
- FitNotes' pre-2021 `Weight (kgs)` / `Weight (lbs)` header form was unhandled.
- Strong's `Distance` and `Seconds` columns were dropped, so cardio rows imported
  as empty sets.

**Rule: detect the unit from the header, never from a cell.** `findUnitColumn()`
exists for this.

### Known format variation

| Source | Variation |
|---|---|
| Strong | 10-column current; 12-column older (adds Notes, Workout Notes). Usually no unit; a `Weight (kg)`/`(lb)` variant exists |
| Hevy | Metric/imperial column-name pairs. `set_index` is 0-based. Dates like `15 Sep 2025, 07:48` |
| FitNotes | Current has a `Weight Unit` column; pre-2021 embedded it in the header. `Time` is a clock string. No session concept — **one day is one workout**, and `Category` must not drive grouping |
| Apple Health | `export.xml` preferred: `Record` elements carry a per-record `unit`. iOS 16.0/16.1 emitted a malformed DTD — parse leniently |

Where a source does not state its unit (FitNotes pre-2021, most Strong exports),
values import as written and the UI warns the member to check them. Guessing
would be worse.

### Safety properties

- **Dedupe** on `date + routineName + exercise names`, both against existing
  history and within a single file
- **Sequential writes** — a member migrating years of history would otherwise
  swamp the backend
- **No gamification** — imported workouts skip `awardPointsAndBadges`, so
  importing history cannot mint thousands of points. Streaks come from
  *attendance*, not logs, so they are unaffected either way
- **File size cap** of 20 MB; a full Apple Health `export.xml` can be far larger

---

## Testing

```bash
node scripts/smoke-test.mjs            # every module renders valid HTML
node scripts/test-progression.mjs      # 5 schemes, deloads, stall counting
node scripts/test-analytics.mjs        # 1RM, series, balance, heatmap
node scripts/test-import.mjs           # CSV mechanics, dedupe, payloads
node scripts/test-import-formats.mjs   # real verified export headers
node scripts/test-runner-render.mjs    # runner markup end to end
node scripts/test-analytics-render.mjs # analytics tab markup
node scripts/test-import-render.mjs    # import tab markup, incl. escaping
```

The `*-render.mjs` tests call `render()` headlessly and assert on the HTML
string. They exist because the engines can be perfectly correct while the
template that displays them leaks `undefined`, `NaN`, or unescaped file content.

---

## Firestore

One new collection:

| Collection | Description |
|---|---|
| `workout_presence` | Ephemeral "training now" heartbeats; member-owned rows |

Existing collections gained optional fields:

| Collection | Field | Meaning |
|---|---|---|
| `workout_logs` | `mode` | `"timed"` / `"cardio"` when not rep-based |
| `workout_logs` | `supersetId` | Groups exercises performed back to back |
| `workout_logs` | `scheme` | Progression scheme used |
| `workout_logs` | `importedFrom` | Source key when imported |
| `workout_logs` | `sets[].seconds`, `sets[].distanceKm` | Timed / cardio work |
| `progress_records` | `importedFrom` | Source key when imported |

All are additive and optional — existing documents keep working unchanged.

Members can already self-write `workout_logs` and `progress_records`, so imports
needed no rule changes. `workout_presence` has its own rules.

> **Not yet exercised against the emulator.** The presence rules are written and
> scoped but have only been reasoned about. Worth a pass before relying on them.

---

## Not implemented

Two deliberate omissions, recorded so nobody re-litigates them by accident:

- **Localized exercise instructions.** The bundled dataset has 4,414 unique
  English steps. Phrase substitution produces mixed-language output; hand
  translating the 200 most common sentences covers only 35%. Doing this properly
  needs on-demand translation with a cached result per exercise and language.
- **Passkeys / WebAuthn login.** Firebase Auth has no native WebAuthn support.
  Verifying an assertion and minting a custom token requires Cloud Functions,
  which means the Blaze billing plan — at odds with the zero-cost premise.
