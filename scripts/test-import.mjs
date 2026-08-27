// Unit tests for the workout importers (modules/workout-import.js).
// Pure parsing only — no DOM, no backend. Run: node scripts/test-import.mjs
import {
  parseCsv,
  normaliseDate,
  parseDurationMinutes,
  parseFitNotes,
  parseStrong,
  parseHevy,
  parseAppleHealthWeight,
  parseImport,
  dedupeLogs,
  dedupeBodyWeights,
  toWorkoutLogPayload,
  summarise,
  logKey
} from "../modules/workout-import.js";

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

console.log("parseCsv...");
check(parseCsv("a,b\n1,2"), [["a", "b"], ["1", "2"]], "basic rows");
check(parseCsv('a,b\n"x,y",2'), [["a", "b"], ["x,y", "2"]], "quoted comma stays in one field");
check(parseCsv('a\n"he said ""hi"""'), [["a"], ['he said "hi"']], "escaped double quotes");
check(parseCsv('a,b\n"line1\nline2",2'), [["a", "b"], ["line1\nline2", "2"]], "newline inside quotes");
check(parseCsv("a,b\r\n1,2\r\n"), [["a", "b"], ["1", "2"]], "CRLF handled as one break");
check(parseCsv("a,b\n\n1,2\n\n"), [["a", "b"], ["1", "2"]], "blank lines ignored");
check(parseCsv("﻿a,b\n1,2"), [["a", "b"], ["1", "2"]], "BOM stripped");
check(parseCsv(""), [], "empty input");
check(parseCsv(null), [], "null input");

console.log("\nnormaliseDate...");
check(normaliseDate("2026-08-01"), "2026-08-01", "ISO passthrough");
check(normaliseDate("2026-08-01 07:30:00"), "2026-08-01", "ISO with time");
check(normaliseDate("08/01/2026"), "2026-08-01", "US M/D/Y");
check(normaliseDate("25/12/2026"), "2026-12-25", "unambiguous D/M/Y");
check(normaliseDate("13/13/2026"), "", "impossible date rejected");
check(normaliseDate("garbage"), "", "unparseable rejected");
check(normaliseDate(""), "", "empty rejected");

console.log("\nparseDurationMinutes...");
check(parseDurationMinutes("1h 15m"), 75, "hours and minutes");
check(parseDurationMinutes("45m"), 45, "minutes only");
check(parseDurationMinutes("2h"), 120, "hours only");
check(parseDurationMinutes("90"), 90, "bare number");
check(parseDurationMinutes(""), 0, "empty");

console.log("\nparseFitNotes...");
const fitnotes = [
  "Date,Exercise,Category,Weight,Reps,Distance,Distance Unit,Time,Comment",
  "2026-08-01,Bench Press,Chest,60,5,,,,felt good",
  "2026-08-01,Bench Press,Chest,60,5,,,,",
  "2026-08-01,Squat,Legs,80,5,,,,",
  "2026-08-08,Bench Press,Chest,65,5,,,,"
].join("\n");
const fn = parseFitNotes(fitnotes);
check(fn.logs.length, 2, "one log per date");
check(fn.logs[0].exercises.length, 2, "two exercises on day one");
check(fn.logs[0].exercises[0].sets.length, 2, "repeated rows become sets");
check(fn.logs[0].exercises[0].sets[0].weight, 60, "weight parsed");
check(fn.logs[0].routineName, "Chest, Legs", "day named after the categories it contained");
check(fn.warnings.length, 0, "clean file yields no warnings");
check(parseFitNotes("Date,Exercise,Weight,Reps\nbadf,Bench,60,5").warnings.length, 1, "bad date warns");
check(parseFitNotes("").warnings.length, 1, "empty file warns");
check(parseFitNotes("Date,Exercise,Weight,Reps").logs.length, 0, "header only yields nothing");

console.log("\nparseFitNotes unit conversion...");
const fnLbs = parseFitNotes("Date,Exercise,Weight,Reps,Weight Unit\n2026-08-01,Bench Press,100,5,lbs");
check(fnLbs.logs[0].exercises[0].sets[0].weight, 45.36, "lbs converted to kg");

console.log("\nparseStrong...");
const strong = [
  "Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,RPE,Notes,Workout Notes",
  '2026-08-01 07:30:00,Push Day,1h 15m,Bench Press (Barbell),1,60,5,7,,"good session"',
  "2026-08-01 07:30:00,Push Day,1h 15m,Bench Press (Barbell),2,60,5,8,,",
  "2026-08-01 07:30:00,Push Day,1h 15m,Overhead Press,1,40,8,,,"
].join("\n");
const st = parseStrong(strong);
check(st.logs.length, 1, "one workout");
check(st.logs[0].routineName, "Push Day", "workout name kept");
check(st.logs[0].durationMinutes, 75, "duration parsed to minutes");
check(st.logs[0].exercises.length, 2, "two exercises");
check(st.logs[0].exercises[0].sets[1].rpe, 8, "RPE carried through");
check(st.logs[0].exercises[1].sets[0].rpe, "", "missing RPE stays blank, not zero");
check(st.logs[0].notes, "good session", "session notes captured");

console.log("\nparseHevy...");
const hevy = [
  "title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe",
  "Morning Lift,2026-08-01 06:00:00,2026-08-01 07:00:00,,Bench Press (Barbell),,,0,normal,60,5,,,7",
  "Morning Lift,2026-08-01 06:00:00,2026-08-01 07:00:00,,Bench Press (Barbell),,,1,normal,62.5,5,,,8",
  "Morning Lift,2026-08-01 06:00:00,2026-08-01 07:00:00,,Lat Pulldown,,,0,normal,50,10,,,"
].join("\n");
const hv = parseHevy(hevy);
check(hv.logs.length, 1, "one workout");
check(hv.logs[0].routineName, "Morning Lift", "title used as routine name");
check(hv.logs[0].durationMinutes, 60, "duration from start/end times");
check(hv.logs[0].exercises[0].sets[1].weight, 62.5, "decimal weight preserved");
check(hv.logs[0].exercises.length, 2, "two exercises");

console.log("\nparseAppleHealthWeight (CSV)...");
const ahCsv = "Date,Weight,Unit\n2026-08-01,72.4,kg\n2026-08-01,72.6,kg\n2026-08-05,72.1,kg";
const ah = parseAppleHealthWeight(ahCsv);
check(ah.bodyWeights.length, 2, "one reading per day");
check(ah.bodyWeights[0].weight, 72.6, "later reading of the day wins");
check(ah.logs.length, 0, "body weight import creates no workouts");

console.log("\nparseAppleHealthWeight (XML)...");
const ahXml = `<HealthData>
<Record type="HKQuantityTypeIdentifierBodyMass" unit="kg" startDate="2026-08-01 08:00:00 +0000" value="72.4"/>
<Record type="HKQuantityTypeIdentifierHeight" unit="cm" startDate="2026-08-01 08:00:00 +0000" value="180"/>
<Record type="HKQuantityTypeIdentifierBodyMass" unit="lb" startDate="2026-08-05 08:00:00 +0000" value="160"/>
</HealthData>`;
const ahx = parseAppleHealthWeight(ahXml);
check(ahx.bodyWeights.length, 2, "only body-mass records taken");
check(ahx.bodyWeights[0].weight, 72.4, "kg reading kept as-is");
check(ahx.bodyWeights[1].weight, 72.6, "lb reading converted to kg");
check(parseAppleHealthWeight("Date,Weight\n").warnings.length, 1, "no readings warns");

console.log("\nparseImport dispatch...");
check(parseImport("strong", strong).logs.length, 1, "dispatches to Strong");
check(parseImport("nope", "x").warnings.length, 1, "unknown source warns");

console.log("\ndedupeLogs...");
const existing = [{ date: "2026-08-01", routineName: "Push Day", exercises: [{ name: "Bench Press (Barbell)" }, { name: "Overhead Press" }] }];
const dd = dedupeLogs(st.logs, existing);
check(dd.fresh.length, 0, "already-imported session is skipped");
check(dd.duplicates, 1, "duplicate counted");
check(dedupeLogs(st.logs, []).fresh.length, 1, "fresh import goes through");
const twice = dedupeLogs([...st.logs, ...st.logs], []);
check([twice.fresh.length, twice.duplicates], [1, 1], "duplicate inside one file is caught");
check(logKey({ date: "d", routineName: "R", exercises: [{ name: "B" }, { name: "A" }] }),
  logKey({ date: "d", routineName: "r", exercises: [{ name: "a" }, { name: "b" }] }),
  "key is order- and case-insensitive");

console.log("\ndedupeBodyWeights...");
const bw = dedupeBodyWeights(ah.bodyWeights, [{ date: "2026-08-01" }]);
check([bw.fresh.length, bw.duplicates], [1, 1], "existing day skipped");
check(dedupeBodyWeights(ah.bodyWeights, []).fresh.length, 2, "no existing records imports all");

console.log("\ntoWorkoutLogPayload...");
const payload = toWorkoutLogPayload(st.logs[0], { id: "m1", gymId: "g1" });
check(payload.memberId, "m1", "member id attached");
check(payload.gymId, "g1", "gym id attached");
check(payload.private, false, "imported logs default to shareable");
check(typeof payload.exercises[0].sets[0].weight, "number", "weights coerced to numbers");
check(payload.exercises[1].sets[0].rpe, "", "blank RPE stays blank in payload");
check(Object.keys(payload).includes("importedFrom"), true, "import provenance field present");

console.log("\nsummarise...");
const sum = summarise(fn);
check(sum.workouts, 2, "workout count");
check(sum.sets, 4, "set count");
check(sum.exercises, 2, "distinct exercise count");
check([sum.from, sum.to], ["2026-08-01", "2026-08-08"], "date range");
check(summarise({}).workouts, 0, "empty result summarises to zeros");

console.log("\nmalformed input safety...");
for (const [name, fn2] of [["fitnotes", parseFitNotes], ["strong", parseStrong], ["hevy", parseHevy], ["applehealth", parseAppleHealthWeight]]) {
  for (const bad of ["", null, undefined, "garbage", ",,,\n,,,", '"unclosed quote']) {
    try {
      const out = fn2(bad);
      if (!out || !Array.isArray(out.logs) || !Array.isArray(out.warnings)) throw new Error("bad shape");
    } catch (err) {
      console.log(`  FAIL: ${name} threw on ${JSON.stringify(bad)}: ${err.message}`);
      failures += 1;
    }
  }
}
console.log("  pass: every parser survives malformed input");

console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll importer tests passed.");
process.exit(failures ? 1 : 0);
