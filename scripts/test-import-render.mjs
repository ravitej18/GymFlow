// Renders the My Workout > Import tab headlessly, including its preview states,
// to confirm the new markup is well formed and leaks nothing.
// Run: node scripts/test-import-render.mjs
import { myWorkoutModule } from "../modules/my-workout.js";
import { parseStrong, parseAppleHealthWeight, dedupeLogs, dedupeBodyWeights } from "../modules/workout-import.js";

let failures = 0;
function check(ok, label) {
  console.log(`${ok ? "  pass" : "  FAIL"}: ${label}`);
  if (!ok) failures += 1;
}

const context = {
  profile: { role: "member" },
  myMember: { id: "m1", gymId: "g1", fullName: "Test Member" },
  data: { workout_logs: [], workout_templates: [], workout_schedules: [], workout_sessions: [], workout_assignments: [], progress_records: [] },
  services: { data: { save: async (c, d) => ({ ...d, id: "x" }) } },
  toast: () => {},
  applyChange: () => {},
  refreshView: () => {}
};

console.log("empty import tab...");
myWorkoutModule.activeTab = "import";
myWorkoutModule.importPreview = null;
let html = myWorkoutModule.render(context);
check(html.includes("Import Workout History"), "renders the import panel");
check(html.includes("import-source-select"), "format picker present");
check(html.includes("import-file-input"), "file picker present");
check(html.includes("Strong"), "lists the Strong importer");
check(html.includes("Hevy"), "lists the Hevy importer");
check(html.includes("FitNotes"), "lists the FitNotes importer");
check(html.includes("Apple Health"), "lists the Apple Health importer");
check(!html.includes("undefined"), "no undefined leaked");
check(!html.includes("confirm-import-btn"), "no confirm button before a file is chosen");

console.log("\nworkout preview state...");
const strongCsv = [
  "Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,RPE,Notes,Workout Notes",
  "2026-08-01 07:30:00,Push Day,1h 15m,Bench Press (Barbell),1,60,5,7,,",
  "2026-08-01 07:30:00,Push Day,1h 15m,Overhead Press,1,40,8,,,"
].join("\n");
const strongResult = parseStrong(strongCsv);
const dd = dedupeLogs(strongResult.logs, []);
myWorkoutModule.importSource = "strong";
myWorkoutModule.importPreview = {
  sourceKey: "strong", fileName: "strong.csv", result: strongResult,
  fresh: dd.fresh, duplicates: dd.duplicates, bwFresh: [], bwDuplicates: 0
};
html = myWorkoutModule.render(context);
check(html.includes("Preview"), "shows the preview block");
check(html.includes("strong.csv"), "shows the file name");
check(html.includes("Push Day"), "lists the parsed session");
check(html.includes("confirm-import-btn"), "offers a confirm button");
check(html.includes("cancel-import-btn"), "offers a cancel button");
check(/Import 1 workout/.test(html), "confirm button is specific about the count");
check(!html.includes("undefined"), "no undefined leaked");
check(!html.includes("NaN"), "no NaN leaked");

console.log("\nall-duplicates state...");
const dd2 = dedupeLogs(strongResult.logs, strongResult.logs);
myWorkoutModule.importPreview = {
  sourceKey: "strong", fileName: "strong.csv", result: strongResult,
  fresh: dd2.fresh, duplicates: dd2.duplicates, bwFresh: [], bwDuplicates: 0
};
html = myWorkoutModule.render(context);
check(html.includes("already in your history"), "explains there is nothing left to import");
check(!html.includes("confirm-import-btn"), "no confirm button when nothing is fresh");

console.log("\nbody weight preview state...");
const ah = parseAppleHealthWeight("Date,Weight,Unit\n2026-08-01,72.4,kg\n2026-08-05,72.1,kg");
const bw = dedupeBodyWeights(ah.bodyWeights, []);
myWorkoutModule.importSource = "applehealth";
myWorkoutModule.importPreview = {
  sourceKey: "applehealth", fileName: "export.xml", result: ah,
  fresh: [], duplicates: 0, bwFresh: bw.fresh, bwDuplicates: bw.duplicates
};
html = myWorkoutModule.render(context);
check(html.includes("Body weight readings"), "shows the body weight count");
check(/Import 2 weight records/.test(html), "confirm button names the weight records");
check(!html.includes("undefined"), "no undefined leaked");

console.log("\nwarning state...");
const bad = parseStrong("Date,Exercise Name,Weight,Reps\nnot-a-date,Bench,60,5");
myWorkoutModule.importPreview = {
  sourceKey: "strong", fileName: "bad.csv", result: bad,
  fresh: [], duplicates: 0, bwFresh: [], bwDuplicates: 0
};
html = myWorkoutModule.render(context);
check(html.includes("import-warnings"), "surfaces parser warnings");
check(html.includes("unreadable date"), "warning text is shown to the member");

console.log("\nescaping...");
const evil = parseStrong([
  "Date,Workout Name,Exercise Name,Weight,Reps",
  '2026-08-01,"<script>alert(1)</script>","<img src=x onerror=alert(1)>",60,5'
].join("\n"));
const dd3 = dedupeLogs(evil.logs, []);
myWorkoutModule.importPreview = {
  sourceKey: "strong", fileName: "<b>x</b>.csv", result: evil,
  fresh: dd3.fresh, duplicates: 0, bwFresh: [], bwDuplicates: 0
};
html = myWorkoutModule.render(context);
// The payload must survive only as inert text: angle brackets entity-encoded so
// the browser never parses a tag. Searching for the raw substring "onerror" is
// not a useful assertion — it appears escaped and harmless.
check(!html.includes("<script>"), "script tag from file content is escaped");
check(html.includes("&lt;script&gt;"), "script tag survives as inert text");
check(!/<img[^>]*onerror/i.test(html), "no live img tag is emitted from file content");
check(html.includes("&lt;img src=x onerror=alert(1)&gt;"), "img payload survives as inert text");
check(!html.includes("<b>x</b>.csv"), "file name is escaped");

console.log("\ntag balance...");
check((html.match(/<section/g) || []).length === (html.match(/<\/section>/g) || []).length, "section tags balanced");
check((html.match(/<div/g) || []).length === (html.match(/<\/div>/g) || []).length, "div tags balanced");

myWorkoutModule.importPreview = null;
myWorkoutModule.activeTab = "workouts";

console.log(failures ? `\n${failures} FAILURE(S)` : "\nImport tab renders cleanly.");
process.exit(failures ? 1 : 0);
