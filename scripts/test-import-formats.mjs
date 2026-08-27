// Importer tests against REAL export headers, verified from published sample
// files and (for FitNotes) the app's own decompiled export code.
// Run: node scripts/test-import-formats.mjs
//
// These complement scripts/test-import.mjs, which covers parsing mechanics.
// This file exists to catch the class of bug where a parser works fine on an
// invented fixture and silently mangles a real user's file.
import { parseStrong, parseHevy, parseFitNotes, parseAppleHealthWeight, parseClockSeconds } from "../modules/workout-import.js";

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
const firstSet = (result) => result.logs[0]?.exercises[0]?.sets[0] || {};

console.log("Strong — current 10-column header...");
// Verified: DaKheera47/strong-statistics data_sample/sample_strong.csv
const strongCurrent = [
  "Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,RPE",
  '2024-11-28 17:36:08,"B",35m,"Bent Over Row (Barbell)",1,10.0,13.0,0,0.0,'
].join("\n");
let r = parseStrong(strongCurrent);
check(r.logs.length, 1, "parses the current header");
check(r.logs[0].routineName, "B", "workout name read");
check(r.logs[0].durationMinutes, 35, "duration string parsed");
check(firstSet(r).weight, 10, "weight read from the bare Weight column");
check(firstSet(r).reps, 13, "reps read");
check(r.warnings.length, 0, "no warnings on a real file");

console.log("\nStrong — legacy 12-column header (adds Notes, Workout Notes)...");
// Verified: AlexandrosKyriakakis/StrongAppAnalytics Data/strong.csv (2020)
const strongLegacy = [
  "Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE",
  '2020-05-01 08:00:00,"Push",1h 15m,"Bench Press (Barbell)",1,60,5,0,0,,"felt strong",8'
].join("\n");
r = parseStrong(strongLegacy);
check(r.logs.length, 1, "parses the legacy header");
check(r.logs[0].durationMinutes, 75, "hours+minutes duration");
check(firstSet(r).weight, 60, "weight read despite the extra columns");
check(firstSet(r).rpe, 8, "RPE read from the last column");
check(r.logs[0].notes, "felt strong", "workout notes captured");

console.log("\nStrong — unit-suffixed weight variant...");
// StrongCsvParser sniffs for "(kg" / "(lb" in the weight header.
r = parseStrong([
  "Date,Workout Name,Duration,Exercise Name,Set Order,Weight (lbs),Reps,Distance,Seconds,RPE",
  "2024-11-28 17:36:08,B,35m,Bench Press,1,225,5,0,0,"
].join("\n"));
check(firstSet(r).weight, 102.06, "lbs header converts 225 lb to kg");
r = parseStrong([
  "Date,Workout Name,Duration,Exercise Name,Set Order,Weight (kg),Reps,Distance,Seconds,RPE",
  "2024-11-28 17:36:08,B,35m,Bench Press,1,100,5,0,0,"
].join("\n"));
check(firstSet(r).weight, 100, "kg header passes through unchanged");

console.log("\nStrong — cardio row keeps distance and seconds...");
r = parseStrong([
  "Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,RPE",
  "2024-11-28 17:36:08,Cardio,30m,Running,1,0,0,5,1800,"
].join("\n"));
check(firstSet(r).seconds, 1800, "Seconds column preserved");
check(firstSet(r).distanceKm, 5, "Distance column preserved");
check(r.logs[0].exercises[0].mode, "cardio", "distance + time marks the exercise as cardio");

console.log("\nHevy — metric header...");
// Verified: matanabudy/workout-data-sync examples/hevy_export_sample.csv
const hevyMetric = [
  '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"',
  '"Morning","15 Sep 2025, 07:48","15 Sep 2025, 08:40","","Bench Press (Barbell)","","",0,"normal",60,5,,,7'
].join("\n");
r = parseHevy(hevyMetric);
check(r.logs.length, 1, "parses the metric header");
check(firstSet(r).weight, 60, "weight_kg read as kg");
check(r.logs[0].routineName, "Morning", "title used as the routine name");
check(r.logs[0].date, "2025-09-15", "day-first date with comma parsed");
check(r.logs[0].durationMinutes, 52, "duration derived from start/end");

console.log("\nHevy — imperial header (the silent-corruption case)...");
// Verified: blog.ayjc.net — weight_lbs / distance_miles replace the metric pair.
const hevyImperial = [
  '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_lbs","reps","distance_miles","duration_seconds","rpe"',
  '"Morning","15 Sep 2025, 07:48","15 Sep 2025, 08:40","","Bench Press (Barbell)","","",0,"normal",225,5,,,7'
].join("\n");
r = parseHevy(hevyImperial);
check(firstSet(r).weight, 102.06, "225 lb converts to kg rather than importing as 225 kg");

console.log("\nHevy — imperial with a zero weight (header, not cell, decides)...");
r = parseHevy([
  '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_lbs","reps","distance_miles","duration_seconds","rpe"',
  '"Run","15 Sep 2025, 07:48","15 Sep 2025, 08:18","","Running","","",0,"normal",0,0,3.1,1800,'
].join("\n"));
check(firstSet(r).distanceKm, 4.99, "3.1 miles converts to km");
check(firstSet(r).seconds, 1800, "duration_seconds preserved");

console.log("\nHevy — 0-based set_index produces one set per row...");
r = parseHevy([
  '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"',
  '"A","15 Sep 2025, 07:48","15 Sep 2025, 08:00","","Squat","","",0,"normal",100,5,,,',
  '"A","15 Sep 2025, 07:48","15 Sep 2025, 08:00","","Squat","","",1,"normal",100,5,,,',
  '"A","15 Sep 2025, 07:48","15 Sep 2025, 08:00","","Squat","","",2,"normal",100,5,,,'
].join("\n"));
check(r.logs[0].exercises[0].sets.length, 3, "three rows become three sets");

console.log("\nFitNotes — current header with a separate Weight Unit column...");
// Verified from the decompiled app: WorkoutExportDataLoader.kt
const fnCurrent = [
  "Date,Exercise,Category,Weight,Weight Unit,Reps,Distance,Distance Unit,Time",
  "2019-07-01,Flat Barbell Bench Press,Chest,40.0,kgs,8,,,"
].join("\n");
r = parseFitNotes(fnCurrent);
check(r.logs.length, 1, "parses the current header");
check(firstSet(r).weight, 40, "kgs unit passes through");
check(r.logs[0].routineName, "Chest", "category names the day");

r = parseFitNotes([
  "Date,Exercise,Category,Weight,Weight Unit,Reps,Distance,Distance Unit,Time",
  "2019-07-01,Bench Press,Chest,225,lbs,5,,,"
].join("\n"));
check(firstSet(r).weight, 102.06, "lbs unit column triggers conversion");

console.log("\nFitNotes — legacy unit-in-header form...");
// Verified: Dale-Potter (kgs, 2018), moferg (lbs, 2020), MakisChristou (kgs, 2021)
r = parseFitNotes([
  "Date,Exercise,Category,Weight (lbs),Reps,Distance,Distance Unit,Time",
  "2020-10-04,Bench Press,Chest,225,5,,,"
].join("\n"));
check(firstSet(r).weight, 102.06, "Weight (lbs) header converts");
r = parseFitNotes([
  "Date,Exercise,Category,Weight (kgs),Reps,Distance,Distance Unit,Time,Comment",
  '2018-01-14,Bench Press,Chest,100,5,,,,"good"'
].join("\n"));
check(firstSet(r).weight, 100, "Weight (kgs) header passes through");
check(r.logs[0].notes, "good", "quoted comment captured");

console.log("\nFitNotes — clock-format Time column...");
check(parseClockSeconds("00:12:30"), 750, "HH:MM:SS to seconds");
check(parseClockSeconds("12:30"), 750, "MM:SS to seconds");
check(parseClockSeconds("90"), 90, "bare number passes through");
check(parseClockSeconds(""), 0, "empty is zero");
r = parseFitNotes([
  "Date,Exercise,Category,Weight,Weight Unit,Reps,Distance,Distance Unit,Time",
  "2020-01-01,Treadmill,Cardio,0,kgs,0,5,km,00:30:00"
].join("\n"));
check(firstSet(r).seconds, 1800, "clock time converted to seconds");
check(firstSet(r).distanceKm, 5, "distance kept");

console.log("\nFitNotes — trailing empty columns are the norm...");
r = parseFitNotes([
  "Date,Exercise,Category,Weight,Weight Unit,Reps,Distance,Distance Unit,Time",
  "2019-07-01,Lat Pulldown,Back (Vertical Pull),40,kgs,10,,,",
  "2019-07-01,Lat Pulldown,Back (Vertical Pull),40,kgs,10,,,"
].join("\n"));
check(r.logs[0].exercises[0].sets.length, 2, "rows ending in commas still parse");
check(r.logs[0].routineName, "Back (Vertical Pull)", "unquoted parentheses in Category survive");

console.log("\nApple Health — verified Record attributes...");
// Verified: HealthKit v11 DTD. BodyMass must not be confused with BodyMassIndex.
const ah = parseAppleHealthWeight(`<HealthData locale="en_GB">
<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Health" unit="kg" creationDate="2026-08-01 08:00:00 +0000" startDate="2026-08-01 08:00:00 +0000" endDate="2026-08-01 08:00:00 +0000" value="72.4"/>
<Record type="HKQuantityTypeIdentifierBodyMassIndex" sourceName="Health" unit="count" startDate="2026-08-01 08:00:00 +0000" endDate="2026-08-01 08:00:00 +0000" value="22.1"/>
<Record type="HKQuantityTypeIdentifierLeanBodyMass" sourceName="Health" unit="kg" startDate="2026-08-01 08:00:00 +0000" endDate="2026-08-01 08:00:00 +0000" value="60"/>
<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Withings" unit="lb" startDate="2026-08-05 08:00:00 +0000" endDate="2026-08-05 08:00:00 +0000" value="160"/>
</HealthData>`);
check(ah.bodyWeights.length, 2, "only BodyMass records are taken");
check(ah.bodyWeights[0].weight, 72.4, "kg record kept");
check(ah.bodyWeights[1].weight, 72.6, "lb record converted");
check(ah.bodyWeights.some((b) => b.weight === 22.1), false, "BodyMassIndex is not mistaken for weight");
check(ah.bodyWeights.some((b) => b.weight === 60), false, "LeanBodyMass is not mistaken for weight");

console.log("\nApple Health — iOS 16.0/16.1 malformed DTD must not break parsing...");
const broken = parseAppleHealthWeight(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE HealthData [
<!ATTLIST Record startDate CDATA #REQUIRED startDate CDATA #REQUIRED>
]>
<HealthData>
<Record type="HKQuantityTypeIdentifierBodyMass" unit="kg" startDate="2026-08-01 08:00:00 +0000" value="72.4"/>
</HealthData>`);
check(broken.bodyWeights.length, 1, "malformed internal DTD is tolerated");

console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll real-format importer tests passed.");
process.exit(failures ? 1 : 0);
