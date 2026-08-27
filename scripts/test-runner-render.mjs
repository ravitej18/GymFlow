// Renders the active workout logger headlessly to confirm the guided-runner
// features are wired: progression picker, modes, supersets, presence, rest.
// Run: node scripts/test-runner-render.mjs
import { myWorkoutModule } from "../modules/my-workout.js";

let failures = 0;
function check(ok, label) {
  console.log(`${ok ? "  pass" : "  FAIL"}: ${label}`);
  if (!ok) failures += 1;
}

const now = new Date().toISOString();
const activeWorkout = {
  startTime: now,
  date: "2026-08-27",
  routineName: "Push Day",
  durationMinutes: 60,
  exercises: [
    {
      name: "Bench Press",
      progressionNote: "Hit all 5 reps at 60 kg last time. Adding 2.5 kg — target 62.5 kg.",
      scheme: "linear",
      supersetId: "ss-0-2",
      sets: [{ weight: "62.5", reps: "5", rpe: "", done: true }, { weight: "62.5", reps: "5", rpe: "", done: false }]
    },
    {
      name: "Front Plank",
      mode: "timed",
      supersetId: "ss-0-2",
      sets: [{ weight: "", reps: "65", rpe: "", done: false }]
    },
    {
      name: "Treadmill Run",
      mode: "cardio",
      sets: [{ weight: "5", reps: "1800", rpe: "", done: false }]
    }
  ]
};

const context = {
  profile: { role: "member", uid: "u1" },
  myMember: { id: "m1", gymId: "g1", fullName: "Test Member" },
  data: {
    workout_logs: [], workout_templates: [], workout_schedules: [],
    workout_sessions: [], workout_assignments: [], progress_records: [],
    workout_presence: [
      { memberId: "m2", memberName: "Priya", routineName: "Leg Day", lastSeen: now },
      { memberId: "m3", memberName: "Arjun", routineName: "Pull Day", lastSeen: now },
      // stale: should be filtered out by the TTL
      { memberId: "m4", memberName: "Ghost", routineName: "Old", lastSeen: "2020-01-01T00:00:00.000Z" },
      // the viewer themselves: must not be listed
      { memberId: "m1", memberName: "Test Member", routineName: "Push Day", lastSeen: now }
    ]
  },
  services: { data: { save: async (c, d) => ({ ...d, id: "x" }), remove: async () => {} } },
  toast: () => {}, applyChange: () => {}, refreshView: () => {}
};

const html = myWorkoutModule.renderActiveLogger(context, activeWorkout);

console.log("progression (gap #2)...");
check(html.includes("progression-note"), "progression note is rendered");
check(html.includes("Adding 2.5 kg"), "the note explains why this target");
check(html.includes("exercise-scheme-select"), "scheme picker present");
check(html.includes("Greyskull LP"), "Greyskull offered");
check(html.includes("Double progression"), "double progression offered");
check(html.includes("Bodyweight"), "bodyweight progression offered");
check(html.includes("Timed"), "timed progression offered");
check(html.includes(">Automatic<"), "automatic detection offered");
check(/<option value="linear"[^>]*selected/.test(html), "the chosen scheme is preselected");

console.log("\nmodes (gap #1 timed/cardio)...");
check(html.includes("exercise-mode-select"), "mode picker present");
check(html.includes("Cardio (km"), "cardio mode offered");
check(html.includes(">Km<"), "cardio card labels the distance column Km");
check(html.includes(">Secs<"), "timed card labels the duration column Secs");
check(html.includes(">Reps<"), "rep-based card still labels Reps");
check(/<option value="timed"[^>]*selected/.test(html), "timed mode preselected on the plank");
check(/<option value="cardio"[^>]*selected/.test(html), "cardio mode preselected on the run");

console.log("\nsupersets (gap #1)...");
check(html.includes("superset-badge"), "superset badge shown");
check(html.includes("in-superset"), "superset cards carry the grouping class");
check(html.includes("superset-toggle-btn"), "superset toggle present");
check(html.includes("Unlink"), "a grouped exercise offers to unlink");
// The third exercise is ungrouped, so its toggle offers to create a superset.
check(/data-ex-idx="2"[\s\S]{0,200}Superset/.test(html), "an ungrouped exercise offers to superset");

console.log("\nlive presence (gap #1)...");
check(html.includes("training-now"), "training-now strip rendered");
check(html.includes("Priya"), "another training member is listed");
check(!html.includes("Ghost"), "stale heartbeat is filtered out");
check(!/training-now[\s\S]{0,300}Test Member/.test(html), "the viewer is not listed among others");
check(html.includes("<strong>2</strong>"), "counts only live peers");

console.log("\nexisting runner features still present...");
check(html.includes("active-timer"), "elapsed timer");
check(html.includes("rest-timer-chip"), "rest timer");
check(html.includes("workout-progress-shell"), "progress bar");
check(html.includes("set-next"), "next-set highlight");
check(html.includes("prev-best-label"), "previous bests column");
check(html.includes("exercise-info-btn"), "exercise demo button");

console.log("\nsafety...");
check(!html.includes("undefined"), "no undefined leaked");
check(!html.includes("NaN"), "no NaN leaked");
check((html.match(/<article/g) || []).length === (html.match(/<\/article>/g) || []).length, "article tags balanced");
check((html.match(/<select/g) || []).length === (html.match(/<\/select>/g) || []).length, "select tags balanced");

console.log("\nno-presence path...");
const quiet = myWorkoutModule.renderActiveLogger(
  { ...context, data: { ...context.data, workout_presence: [] } },
  activeWorkout
);
check(!quiet.includes("training-now"), "strip is hidden when nobody else is training");
check(!quiet.includes("undefined"), "no undefined in the quiet path");

console.log(failures ? `\n${failures} FAILURE(S)` : "\nActive workout runner renders cleanly.");
process.exit(failures ? 1 : 0);
