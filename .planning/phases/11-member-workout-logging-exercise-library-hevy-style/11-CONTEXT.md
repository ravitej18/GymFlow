# Phase 11: Member Workout Logging & Exercise Library (Hevy-Style) - Context

**Gathered:** 2026-07-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement unrestricted Hevy-style workout logging for members. This includes creating custom workout schedules/routines, cloning past workouts via a "Repeat Workout" option, searching and logging exercises with sets, reps, and weights, a gym-wide community feed for public logs, and read-only access for trainers and owners to check member workout logs.

</domain>

<decisions>
## Implementation Decisions

### Workout Privacy & Community Feed
- **D-01:** Logged workouts will support a privacy toggle (Public vs. Private) during log saving.
- **D-02:** A gym-wide community feed will be integrated into the main Dashboard page to display only the Public logged workouts of gym members.

### Workout Routines & Scheduling
- **D-03:** Support custom routine creations (e.g. Push, Pull, Legs, Bro Split, or complete custom splits). Members can set up a weekly workout schedule mapping routines to specific days. When starting a workout, members can choose from their weekly schedule, saved routines, gym templates, or start an empty freestyle workout.

### Log History & Cloning
- **D-04:** Past logs in history will feature a "Repeat Workout" button, which pre-fills the workout logging form with the same exercises, sets, reps, and weights from that session (making them fully editable).

### Trainer & Owner Access
- **D-05:** Trainers and gym owners can view any member's workout logs and schedules. A read-only "Workout Logs" section/tab will be added directly to the Member Details profile view under the Members Directory.

### the agent's Discretion
- The exact layout of the workout logging form (timer overlay, RPE scale selector) and the styling of the feed cards are left to the developer.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `modules/my-workout.js` — The member workout portal currently rendering template lists and assignments.
- `modules/workouts.js` — The template creation logic and rendering helpers.
- `modules/members.js` — Renders the member details view where trainers/owners will read member logs.
- `lib/firebase-init.js` — Collection registrations and local demo mode fallback handling.
- `firestore.rules` — Rules for read/write isolation of logs and custom routines.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `renderTemplateExercises` in `modules/workouts.js` can be reused or adapted to render logged workout lists.
- `Object.fromEntries(new FormData(form).entries())` in `modules/utils.js` for lightweight form submission.
- `applyChange()` in `modules/utils.js` for updating local state dynamically without full page reload.

### Established Patterns
- All views are modules exporting `{ render(context), bind(root, context) }`.
- Navigation and view switching are driven by hash-routing (`location.hash`).
- Data models are registered in `lib/firebase-init.js` and loaded into `context.data` at startup inside `app.js`.

### Integration Points
- `modules/my-workout.js` needs to be extended to support starting, logging, viewing, and repeating workouts.
- `modules/dashboard.js` needs to display the community feed.
- `modules/members.js` member profile details needs a tab to display the logs of the selected member.
- Firestore rules will need to allow members write access to `workout_logs` and `workout_schedules`, while trainers/owners have read-only access.

</code_context>

<specifics>
## Specific Ideas

- Inspired by the open source project: https://github.com/puneethkanna/gym-tracker
- Must match Hevy app features without its restrictions (unlimited routines, unlimited custom exercises, and free history).

</specifics>

<deferred>
## Deferred Ideas

- Social interactions (likes/comments on the community feed).
- Custom notification sounds or push notifications on workout completions.

</deferred>

---

*Phase: 11-Member Workout Logging & Exercise Library (Hevy-Style)*
*Context gathered: 2026-07-23*
