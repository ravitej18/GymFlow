// Renders the Training Analytics tab headlessly to confirm it produces sane HTML.
import { progressModule } from "../modules/progress.js";

const logs = [
  {
    memberId: "m1", date: "2026-08-01", startTime: "2026-08-01T07:30:00.000Z",
    exercises: [
      { name: "Barbell Bench Press", sets: [{ weight: "60", reps: "5", rpe: "7", done: true }, { weight: "60", reps: "5", rpe: "8", done: true }] },
      { name: "Barbell Full Squat", sets: [{ weight: "80", reps: "5", rpe: "8", done: true }] }
    ]
  },
  {
    memberId: "m1", date: "2026-08-08", startTime: "2026-08-08T18:15:00.000Z",
    exercises: [
      { name: "Barbell Bench Press", sets: [{ weight: "65", reps: "5", rpe: "9", done: true }] },
      { name: "Deadlift", sets: [{ weight: "120", reps: "5", done: false }] }
    ]
  },
  { memberId: "m2", date: "2026-08-09", exercises: [{ name: "Barbell Bench Press", sets: [{ weight: "999", reps: "1", done: true }] }] }
];

const context = {
  profile: { role: "member" },
  myMember: { id: "m1", fullName: "Test Member", points: 120 },
  data: { workout_logs: logs, progress_records: [], badges: [] }
};

progressModule.activeTab = "training";
const html = progressModule.render(context);

const checks = [
  ["renders the analytics tab", html.includes("Training Analytics")],
  ["shows exercise progress card", html.includes("Exercise Progress")],
  ["shows an estimated 1RM figure", /Estimated 1RM/.test(html)],
  ["shows muscle balance card", html.includes("Muscle Balance")],
  ["shows effort profile card", html.includes("Effort Profile")],
  ["shows the training heatmap", html.includes("When You Train")],
  ["defaults to the most-trained lift", html.includes("Barbell Bench Press")],
  ["excludes never-ticked exercises from the picker", !html.includes(">Deadlift (")],
  ["does not leak another member's data", !html.includes("999")],
  ["no undefined leaked into markup", !html.includes("undefined")],
  ["no NaN leaked into markup", !html.includes("NaN")],
  ["balance card is tagged for in-place swap", html.includes("data-balance-card")],
  ["tags are balanced", (html.match(/<section/g) || []).length === (html.match(/<\/section>/g) || []).length]
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "  pass" : "  FAIL"}: ${label}`);
  if (!ok) failed++;
}

// Empty-state path
progressModule.analyticsExercise = null;
const emptyHtml = progressModule.render({ ...context, data: { workout_logs: [], progress_records: [], badges: [] } });
const emptyOk = emptyHtml.includes("No training data yet") && !emptyHtml.includes("undefined");
console.log(`${emptyOk ? "  pass" : "  FAIL"}: empty state renders with no data`);
if (!emptyOk) failed++;

console.log(failed ? `\n${failed} FAILURE(S)` : "\nTraining Analytics renders cleanly.");
process.exit(failed ? 1 : 0);
