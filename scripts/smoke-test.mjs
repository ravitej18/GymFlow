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
import { myMembershipModule } from "../modules/my-membership.js";
import { myPaymentsModule } from "../modules/my-payments.js";
import { trainerCheckinModule } from "../modules/trainer-checkin.js";
import { trainerMembersModule } from "../modules/trainer-members.js";
import { myWorkoutModule } from "../modules/my-workout.js";

function makeData() {
  return {
    members: [],
    trainers: [],
    membership_plans: [],
    payments: [],
    attendance: [],
    trainer_attendance: [],
    workout_templates: [],
    workout_assignments: [],
    workout_sessions: [],
    progress_records: [],
    reminders: [],
    membership_pauses: []
  };
}

const ownerContext = {
  profile: { name: "Owner", role: "owner", uid: "owner-uid" },
  settings: { gymName: "Smoke Gym", currency: "INR", gymCode: "SMOK-1234" },
  services: { mode: "local" },
  data: makeData(),
  myMember: null,
  myMemberId: null
};
ownerContext.data.workout_templates = [
  {
    id: "trainer-basic",
    name: "Trainer Basic Module",
    goal: "Mobility",
    category: "Mobility",
    difficulty: "Beginner",
    exercisesStructured: [{ name: "Cat Cow", sets: "2", reps: "10", rest: "30 sec", notes: "Slow control" }],
    visibility: "basic",
    status: "active",
    createdByRole: "trainer",
    createdByUid: "trainer-uid",
    trainerId: "t1"
  }
];

// A member with no roster doc (membership-being-set-up path) and with one.
const memberContext = {
  profile: { name: "Member", role: "member", uid: "member-uid" },
  settings: { gymName: "Smoke Gym", currency: "INR" },
  services: { mode: "local" },
  data: makeData(),
  myMember: { id: "m1", uid: "member-uid", fullName: "Member", status: "Active", endDate: "2099-01-01" },
  myMemberId: "m1"
};
memberContext.data.members = [memberContext.myMember];
memberContext.data.workout_templates = [
  {
    id: "basic-1",
    name: "Basic Strength",
    goal: "Strength",
    category: "Strength",
    difficulty: "Beginner",
    equipment: "Bodyweight",
    durationMinutes: 30,
    exercises: "Squat - 3 x 10",
    exercisesStructured: [{ name: "Squat", sets: "3", reps: "10", weight: "Bodyweight", rest: "60 sec" }],
    notes: "Move with control.",
    visibility: "basic",
    status: "active"
  }
];

const ownerModules = [
  dashboardModule, membersModule, membershipsModule, paymentsModule, renewalsModule,
  remindersModule, trainersModule, attendanceModule, workoutsModule, progressModule,
  reportsModule, settingsModule
];

const memberModules = [
  dashboardModule, attendanceModule, progressModule, myMembershipModule, myPaymentsModule, myWorkoutModule
];

const trainerContext = {
  profile: { name: "Trainer", role: "trainer", uid: "trainer-uid" },
  settings: { gymName: "Smoke Gym", currency: "INR" },
  services: { mode: "local" },
  data: makeData(),
  myTrainer: { id: "t1", uid: "trainer-uid", name: "Trainer", status: "Active" },
  myTrainerId: "t1"
};
trainerContext.data.trainers = [trainerContext.myTrainer];
trainerContext.data.members = [{ id: "tm1", uid: "trainer-client-uid", fullName: "Trainer Client", assignedTrainer: "t1", status: "Active", endDate: "2099-01-01" }];
trainerContext.data.workout_templates = [
  {
    id: "trainer-private",
    name: "Trainer Private Module",
    goal: "Muscle Gain",
    category: "Strength",
    difficulty: "Intermediate",
    equipment: "Dumbbells",
    durationMinutes: 45,
    exercises: "Bench press - 3 x 10",
    exercisesStructured: [{ name: "Bench press", sets: "3", reps: "10", weight: "60 kg", rest: "90 sec" }],
    visibility: "private",
    status: "active",
    createdByRole: "trainer",
    createdByUid: "trainer-uid",
    trainerId: "t1"
  },
  {
    id: "other-trainer-private",
    name: "Other Trainer Private Module",
    goal: "Strength",
    category: "Strength",
    difficulty: "Advanced",
    exercises: "Deadlift - 3 x 5",
    visibility: "private",
    status: "active",
    createdByRole: "trainer",
    createdByUid: "other-trainer-uid",
    trainerId: "t2"
  },
  {
    id: "basic-1",
    name: "Basic Strength",
    goal: "Strength",
    category: "Strength",
    difficulty: "Beginner",
    durationMinutes: 30,
    exercises: "Squat - 3 x 10",
    exercisesStructured: [{ name: "Squat", sets: "3", reps: "10", rest: "60 sec" }],
    visibility: "basic",
    status: "active"
  }
];

const trainerModules = [dashboardModule, trainerCheckinModule, trainerMembersModule, workoutsModule];

function checkRender(module, context, label) {
  const html = module.render(context);
  if (!html || typeof html !== "string") {
    throw new Error(`Module did not return HTML (${label}).`);
  }
}

for (const module of ownerModules) checkRender(module, ownerContext, "owner");
for (const module of memberModules) checkRender(module, memberContext, "member");
for (const module of trainerModules) checkRender(module, trainerContext, "trainer");

const trainerMembersHtml = trainerMembersModule.render(trainerContext);
if (!trainerMembersHtml.includes("My Clients") || trainerMembersHtml.includes("My Members")) {
  throw new Error("Trainer clients screen did not use the updated client wording.");
}
if (!trainerMembersHtml.includes("Trainer Private Module") || trainerMembersHtml.includes("Other Trainer Private Module")) {
  throw new Error("Trainer assignment module filtering is incorrect.");
}
if (!trainerMembersHtml.includes("Assign Module to Clients") || !trainerMembersHtml.includes("data-card-preview")) {
  throw new Error("Trainer clients screen did not render bulk assignment and preview UI.");
}

const memberWorkoutHtml = myWorkoutModule.render(memberContext);
if (!memberWorkoutHtml.includes("Basic Workouts") || !memberWorkoutHtml.includes("Basic Strength") || !memberWorkoutHtml.includes("data-basic-filter")) {
  throw new Error("Member workout screen did not render Basic workout modules.");
}

const trainerWorkoutsHtml = workoutsModule.render(trainerContext);
if (
  !trainerWorkoutsHtml.includes("Difficulty") ||
  !trainerWorkoutsHtml.includes("Duration minutes") ||
  !trainerWorkoutsHtml.includes("Structured exercises") ||
  !trainerWorkoutsHtml.includes("Bench press") ||
  !trainerWorkoutsHtml.includes("data-clone-template") ||
  trainerWorkoutsHtml.includes("Other Trainer Private Module")
) {
  throw new Error("Trainer workouts screen did not render metadata filters, clone action, or private filtering correctly.");
}

const ownerWorkoutsHtml = workoutsModule.render(ownerContext);
if (!ownerWorkoutsHtml.includes("Trainer Basic Module") || ownerWorkoutsHtml.includes("data-approve-basic") || !ownerWorkoutsHtml.includes("Cat Cow")) {
  throw new Error("Owner workouts screen did not render direct Basic modules and structured exercises correctly.");
}

// No-roster-doc yet (status setup path) for both member and trainer.
const pendingMember = { ...memberContext, myMember: null, myMemberId: null, data: makeData() };
for (const module of memberModules) checkRender(module, pendingMember, "member-pending");

const pendingTrainer = { ...trainerContext, myTrainer: null, myTrainerId: null, data: makeData() };
for (const module of trainerModules) checkRender(module, pendingTrainer, "trainer-pending");

console.log("Smoke render passed (owner + member + trainer + pending).");
