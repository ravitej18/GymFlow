import { dashboardModule } from "../modules/dashboard.js";
import { membersModule } from "../modules/members.js";
import { membershipsModule } from "../modules/memberships.js";
import { paymentsModule } from "../modules/payments.js";
import { renewalsModule } from "../modules/renewals.js";
import { remindersModule } from "../modules/reminders.js";
import { trainersModule } from "../modules/trainers.js";
import { attendanceModule } from "../modules/attendance.js";
import { workoutsModule } from "../modules/workouts.js";
import { progressModule } from "../modules/progress.js";
import { reportsModule } from "../modules/reports.js";
import { settingsModule } from "../modules/settings.js";

const context = {
  profile: { name: "Owner", role: "owner" },
  settings: { gymName: "Smoke Gym", currency: "INR" },
  services: { mode: "local" },
  data: {
    members: [],
    trainers: [],
    membership_plans: [],
    payments: [],
    attendance: [],
    workout_templates: [],
    workout_assignments: [],
    progress_records: [],
    reminders: []
  }
};

const modules = [
  dashboardModule,
  membersModule,
  membershipsModule,
  paymentsModule,
  renewalsModule,
  remindersModule,
  trainersModule,
  attendanceModule,
  workoutsModule,
  progressModule,
  reportsModule,
  settingsModule
];

for (const module of modules) {
  const html = module.render(context);
  if (!html || typeof html !== "string") {
    throw new Error("Module did not return HTML.");
  }
}

console.log("Smoke render passed.");
