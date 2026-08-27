// Unit tests for the workout analytics engine (modules/workout-analytics.js).
// Pure functions only — no DOM, no backend. Run: node scripts/test-analytics.mjs
import {
  estimateOneRepMax,
  exerciseSeries,
  exerciseSummary,
  loggedExercises,
  effortBreakdown,
  muscleBalance,
  activityHeatmap,
  HEATMAP_BLOCKS
} from "../modules/workout-analytics.js";

let failures = 0;
function check(actual, expected, label) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    console.log(`  FAIL: ${label}\n    got  ${a}\n    want ${b}`);
    failures += 1;
  } else {
    console.log(`  pass: ${label}`);
  }
}

console.log("estimateOneRepMax...");
check(estimateOneRepMax(100, 1), 100, "single rep returns the weight itself");
check(estimateOneRepMax(100, 5), 116.7, "Epley on 100kg x 5");
check(estimateOneRepMax(0, 5), 0, "bodyweight set is not guessed");
check(estimateOneRepMax(100, 20), 0, "high-rep set declines to guess");
check(estimateOneRepMax("60.5", "3"), 66.6, "string inputs are coerced");
check(estimateOneRepMax(100, -2), 0, "negative reps rejected");
check(estimateOneRepMax(null, null), 0, "null inputs rejected");

const logs = [
  {
    date: "2026-08-01",
    startTime: "2026-08-01T07:30:00.000Z",
    exercises: [
      { name: "Bench Press", sets: [{ weight: "60", reps: "5", rpe: "7", done: true }, { weight: "60", reps: "5", rpe: "8", done: true }] },
      { name: "Squat", sets: [{ weight: "80", reps: "5", done: true }] }
    ]
  },
  {
    date: "2026-08-08",
    startTime: "2026-08-08T18:15:00.000Z",
    exercises: [
      { name: "bench press", sets: [{ weight: "65", reps: "5", rpe: "8", done: true }] },
      // never-ticked sets: pre-filled by the progression engine, not performed
      { name: "Deadlift", sets: [{ weight: "120", reps: "5", done: false }] }
    ]
  }
];

console.log("\nexerciseSeries...");
const series = exerciseSeries(logs, "Bench Press");
check(series.length, 2, "matches case-insensitively across sessions");
check(series.map((p) => p.date), ["2026-08-01", "2026-08-08"], "sorted oldest first");
check(series[0].volume, 600, "volume is weight x reps summed");
check(series[0].oneRepMax, 70, "session 1RM is the best set");
check(exerciseSeries(logs, "Deadlift").length, 0, "unticked sets are excluded entirely");
check(exerciseSeries(logs, "Nothing").length, 0, "unknown exercise yields empty series");
check(exerciseSeries(null, "Bench Press").length, 0, "null logs tolerated");

console.log("\nlegacy logs without the done flag...");
const legacy = [{ date: "2026-01-01", exercises: [{ name: "Row", sets: [{ weight: "50", reps: "10" }] }] }];
check(exerciseSeries(legacy, "Row").length, 1, "pre-done-flag history still charts");
check(exerciseSeries([{ date: "x", exercises: [{ name: "Row", sets: [{ weight: "", reps: "" }] }] }], "Row").length, 0, "empty sets are not counted");

console.log("\nexerciseSummary...");
const summary = exerciseSummary(logs, "Bench Press");
check(summary.sessions, 2, "session count");
check(summary.currentOneRepMax, 75.8, "current 1RM from latest session");
check(summary.bestOneRepMax, 75.8, "best 1RM across all sessions");
check(summary.changePct, 8.3, "percent change first to latest");
check(summary.lastTrained, "2026-08-08", "last trained date");
check(exerciseSummary(logs, "Squat").changePct, null, "single data point claims no trend");
check(exerciseSummary(logs, "Nothing"), null, "unknown exercise returns null");

console.log("\nloggedExercises...");
const ranked = loggedExercises(logs);
check(ranked.map((e) => e.name.toLowerCase()), ["bench press", "squat"], "ranked by sessions, unticked excluded");
check(ranked[0].sessions, 2, "sessions aggregated across name casings");
check(ranked[0].sets, 3, "sets aggregated");
check(loggedExercises([]).length, 0, "no logs yields no exercises");

console.log("\neffortBreakdown...");
const effort = effortBreakdown(logs);
check(effort.rated, 3, "counts only sets carrying an RPE");
check(effort.unrated, 1, "sets without RPE are reported, not dropped");
check(effort.averageRpe, 7.7, "average RPE");
check(effort.rows.map((r) => r.rpe), [7, 8], "buckets sorted ascending");
check(effortBreakdown([]).averageRpe, 0, "no data gives zero average, not NaN");

console.log("\nmuscleBalance...");
const categories = { "bench press": "chest", squat: "upper legs" };
const balance = muscleBalance(logs, (name) => categories[name.toLowerCase()]);
check(balance.totalSets, 4, "total mapped sets across both sessions");
check(balance.groups.find((g) => g.key === "chest").sets, 3, "chest sets folded from both sessions");
check(balance.groups.find((g) => g.key === "legs").sets, 1, "upper legs folds into legs");
check(balance.groups.find((g) => g.key === "back").sets, 0, "untrained group reads zero");
check(balance.groups.find((g) => g.key === "chest").share, 100, "most-trained group is the full bar");
check(muscleBalance(logs, () => "").unmapped, 4, "unresolved exercises are reported as unmapped");
check(muscleBalance([], () => "chest").groups.length, 6, "all six groups always present");
check(muscleBalance([], () => "chest").groups.every((g) => g.pct === 0), true, "empty logs give no NaN percentages");

console.log("\nactivityHeatmap...");
const heat = activityHeatmap(logs);
check(heat.grid.length, 7, "seven weekday rows");
check(heat.grid[0].length, HEATMAP_BLOCKS.length, "one column per time block");
check(heat.grid.flat().reduce((a, b) => a + b, 0), 4, "only completed sets are plotted (deadlift excluded)");
check(heat.max, 3, "max cell value (three sets in one block)");
check(activityHeatmap([{ date: "not-a-date", exercises: [{ name: "X", sets: [{ weight: "1", reps: "1", done: true }] }] }]).max, 0, "unparseable dates are skipped");
const noTime = activityHeatmap([{ date: "2026-08-05", exercises: [{ name: "X", sets: [{ weight: "1", reps: "1", done: true }] }] }]);
check(noTime.grid.flat().reduce((a, b) => a + b, 0), 1, "logs without startTime are still plotted");
check(activityHeatmap([]).max, 0, "empty logs give a zero heatmap");

console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll analytics tests passed.");
process.exit(failures ? 1 : 0);
