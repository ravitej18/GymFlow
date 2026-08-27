// Unit tests for the progression engine (modules/workout-progression.js).
// Pure functions only. Run: node scripts/test-progression.mjs
import {
  planExercise,
  countStalls,
  detectScheme,
  isTimedExercise,
  isLowerBody,
  roundToQuarter,
  historyFor,
  DEFAULT_PROGRESSION_CONFIG
} from "../modules/workout-progression.js";

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
function checkMatch(text, pattern, label) {
  const ok = pattern.test(String(text || ""));
  console.log(`${ok ? "  pass" : "  FAIL"}: ${label}${ok ? "" : `\n    got  ${JSON.stringify(text)}`}`);
  if (!ok) failures += 1;
}

// Builds a log for one exercise. sets is [[weight, reps], ...]
function log(date, name, sets, memberId = "m1") {
  return { memberId, date, exercises: [{ name, sets: sets.map(([weight, reps]) => ({ weight: String(weight), reps: String(reps) })) }] };
}
const plan = (name, count, reps) => ({ name, sets: Array.from({ length: count }, () => ({ weight: "", reps: String(reps), rpe: "", done: false })) });

console.log("helpers...");
check(roundToQuarter(62.5), 62.5, "roundToQuarter keeps .5");
check(roundToQuarter(62.6), 62.5, "roundToQuarter rounds to nearest quarter");
check(isTimedExercise("Front Plank"), true, "plank is timed");
check(isTimedExercise("Farmer Walk"), true, "carry is timed");
check(isTimedExercise("Bench Press"), false, "bench is not timed");
check(isLowerBody("Barbell Full Squat"), true, "squat is lower body");
check(isLowerBody("Romanian Deadlift"), true, "RDL is lower body");
check(isLowerBody("Overhead Press"), false, "press is not lower body");
check(detectScheme("Plank", [{ weight: "0", reps: "60" }]), "timed", "timed detected by name");
check(detectScheme("Pull Up", [{ weight: "", reps: "8" }]), "bodyweight", "unloaded history detects bodyweight");
check(detectScheme("Bench Press", [{ weight: "60", reps: "5" }]), "linear", "loaded history defaults to linear");

console.log("\nno history...");
const fresh = planExercise(plan("Bench Press", 3, 5), [], { memberId: "m1" });
check(fresh.progressionNote, undefined, "first ever session is left as planned");
check(planExercise(plan("Bench Press", 3, 5), [log("2026-08-01", "Squat", [[100, 5]])], { memberId: "m1" }).progressionNote, undefined,
  "history for a different exercise is ignored");
check(planExercise(plan("Bench Press", 3, 5), [log("2026-08-01", "Bench Press", [[60, 5]], "m2")], { memberId: "m1" }).progressionNote, undefined,
  "another member's history is ignored");

console.log("\nlinear scheme...");
const linSuccess = planExercise(plan("Bench Press", 3, 5), [log("2026-08-01", "Bench Press", [[60, 5], [60, 5], [60, 5]])], { memberId: "m1", scheme: "linear" });
check(linSuccess.sets.every((s) => s.weight === "62.5"), true, "clean session adds 2.5 kg");
checkMatch(linSuccess.progressionNote, /Adding 2\.5 kg/, "note explains the increment");
checkMatch(linSuccess.progressionNote, /60 kg last time/, "note cites what was done");

const linFail = planExercise(plan("Bench Press", 3, 5), [log("2026-08-01", "Bench Press", [[60, 5], [60, 4], [60, 3]])], { memberId: "m1", scheme: "linear" });
check(linFail.sets[0].weight, "60", "missed reps holds the weight");
checkMatch(linFail.progressionNote, /Staying at 60 kg/, "note explains the hold");

console.log("\ndeload after repeated stalls...");
const stalled = [
  log("2026-08-15", "Bench Press", [[80, 5], [80, 3], [80, 2]]),
  log("2026-08-08", "Bench Press", [[80, 5], [80, 4], [80, 2]]),
  log("2026-08-01", "Bench Press", [[80, 4], [80, 3], [80, 2]])
];
check(countStalls(stalled, "Bench Press", 5, 3), 3, "three consecutive failures counted");
const deload = planExercise(plan("Bench Press", 3, 5), stalled, { memberId: "m1", scheme: "linear" });
check(deload.sets[0].weight, "72", "deload cuts 10% off 80 kg");
checkMatch(deload.progressionNote, /Deloading 10%/, "note explains the deload");
checkMatch(deload.progressionNote, /Stalled 3 sessions/, "note cites the stall count");

const twoStalls = planExercise(plan("Bench Press", 3, 5), stalled.slice(0, 2), { memberId: "m1", scheme: "linear" });
check(twoStalls.sets[0].weight, "80", "two stalls is not yet a deload");

console.log("\nstall counting stops at a success...");
const mixed = [
  log("2026-08-15", "Bench Press", [[80, 3]]),
  log("2026-08-08", "Bench Press", [[80, 5]]),
  log("2026-08-01", "Bench Press", [[80, 2]])
];
check(countStalls(mixed, "Bench Press", 5, 1), 1, "counts back only to the last success");

console.log("\ndeload floor...");
const light = [
  log("2026-08-15", "Overhead Press", [[20, 2]]),
  log("2026-08-08", "Overhead Press", [[20, 2]]),
  log("2026-08-01", "Overhead Press", [[20, 2]])
];
const floored = planExercise(plan("Overhead Press", 1, 5), light, { memberId: "m1", scheme: "linear" });
check(floored.sets[0].weight, "20", "never deloads below an empty bar");

console.log("\ngreyskull LP...");
const gsBig = planExercise(plan("Overhead Press", 3, 5), [log("2026-08-01", "Overhead Press", [[40, 5], [40, 5], [40, 11]])], { memberId: "m1", scheme: "greyskull" });
check(gsBig.sets[0].weight, "45", "11-rep AMRAP earns a double 2.5 kg jump on upper body");
checkMatch(gsBig.progressionNote, /double jump/i, "note explains the double jump");

const gsLower = planExercise(plan("Barbell Full Squat", 3, 5), [log("2026-08-01", "Barbell Full Squat", [[100, 5], [100, 5], [100, 11]])], { memberId: "m1", scheme: "greyskull" });
check(gsLower.sets[0].weight, "110", "lower body doubles the 5 kg step");

const gsNormal = planExercise(plan("Overhead Press", 3, 5), [log("2026-08-01", "Overhead Press", [[40, 5], [40, 5], [40, 6]])], { memberId: "m1", scheme: "greyskull" });
check(gsNormal.sets[0].weight, "42.5", "clearing the target adds a single step");
checkMatch(gsNormal.progressionNote, /to failure/, "note reminds the member the last set is AMRAP");

const gsMiss = planExercise(plan("Overhead Press", 3, 5), [log("2026-08-01", "Overhead Press", [[40, 5], [40, 5], [40, 3]])], { memberId: "m1", scheme: "greyskull" });
check(gsMiss.sets[0].weight, "40", "missing the AMRAP target repeats the weight");

console.log("\ndouble progression...");
const dpClimb = planExercise(plan("Lat Pulldown", 3, 8), [log("2026-08-01", "Lat Pulldown", [[50, 8], [50, 8], [50, 8]])], { memberId: "m1", scheme: "double" });
check(dpClimb.sets[0].weight, "50", "weight holds while climbing the range");
check(dpClimb.sets[0].reps, "9", "reps step up by one");
checkMatch(dpClimb.progressionNote, /12 unlocks more weight/, "note explains the rep ceiling");

const dpTop = planExercise(plan("Lat Pulldown", 3, 12), [log("2026-08-01", "Lat Pulldown", [[50, 12], [50, 12], [50, 12]])], { memberId: "m1", scheme: "double" });
check(dpTop.sets[0].weight, "52.5", "topping the range adds weight");
check(dpTop.sets[0].reps, "8", "reps reset to the bottom of the range");

const dpUneven = planExercise(plan("Lat Pulldown", 3, 12), [log("2026-08-01", "Lat Pulldown", [[50, 12], [50, 12], [50, 9]])], { memberId: "m1", scheme: "double" });
check(dpUneven.sets[0].weight, "50", "one short set blocks the weight increase");
check(dpUneven.sets[0].reps, "10", "targets one more than the weakest set");

console.log("\nbodyweight progression...");
const bw = planExercise(plan("Pull Up", 3, 8), [log("2026-08-01", "Pull Up", [[0, 8], [0, 8], [0, 8]])], { memberId: "m1", scheme: "bodyweight" });
check(bw.sets[0].reps, "9", "adds a rep");
check(bw.sets[0].weight, "", "no weight is suggested for bodyweight work");
checkMatch(bw.progressionNote, /progresses by reps/, "note explains the rep-based progression");

const bwAuto = planExercise(plan("Pull Up", 3, 8), [log("2026-08-01", "Pull Up", [[0, 8], [0, 8], [0, 8]])], { memberId: "m1" });
check(bwAuto.scheme, "bodyweight", "unloaded history auto-selects bodyweight");

console.log("\ntimed progression...");
const timed = planExercise(plan("Front Plank", 3, 60), [log("2026-08-01", "Front Plank", [[0, 60], [0, 55], [0, 50]])], { memberId: "m1" });
check(timed.scheme, "timed", "plank auto-selects the timed scheme");
check(timed.sets[0].reps, "65", "adds five seconds to the best hold");
checkMatch(timed.progressionNote, /60s last time/, "note cites the previous hold");

console.log("\nconfig overrides...");
const custom = planExercise(plan("Bench Press", 3, 5), [log("2026-08-01", "Bench Press", [[60, 5], [60, 5], [60, 5]])],
  { memberId: "m1", scheme: "linear", config: { increment: 5 } });
check(custom.sets[0].weight, "65", "increment is configurable");
const eagerDeload = planExercise(plan("Bench Press", 3, 5), [log("2026-08-01", "Bench Press", [[80, 2]])],
  { memberId: "m1", scheme: "linear", config: { stallsBeforeDeload: 1, deloadPct: 0.2 } });
check(eagerDeload.sets[0].weight, "64", "deload threshold and percentage are configurable");

console.log("\nimmutability and safety...");
const original = plan("Bench Press", 3, 5);
const before = JSON.stringify(original);
planExercise(original, [log("2026-08-01", "Bench Press", [[60, 5], [60, 5], [60, 5]])], { memberId: "m1" });
check(JSON.stringify(original), before, "input exercise is never mutated");
check(planExercise(plan("X", 1, 5), null, { memberId: "m1" }).progressionNote, undefined, "null logs tolerated");
check(historyFor(null, "X", "m1").length, 0, "historyFor tolerates null");
for (const scheme of ["linear", "greyskull", "double", "bodyweight", "timed", "nonsense"]) {
  try {
    const out = planExercise(plan("Thing", 3, 5), [log("2026-08-01", "Thing", [["", ""]])], { memberId: "m1", scheme });
    if (!out || !Array.isArray(out.sets)) throw new Error("bad shape");
  } catch (err) {
    console.log(`  FAIL: scheme ${scheme} threw on empty sets: ${err.message}`);
    failures += 1;
  }
}
console.log("  pass: every scheme survives empty/garbage sets");
check(DEFAULT_PROGRESSION_CONFIG.stallsBeforeDeload, 3, "default stall threshold is documented");

console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll progression tests passed.");
process.exit(failures ? 1 : 0);
