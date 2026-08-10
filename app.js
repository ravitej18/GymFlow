import { createServices } from "./lib/firebase-init.js";
import { renderAuth } from "./modules/auth.js";
import { dashboardModule } from "./modules/dashboard.js";
import { membersModule } from "./modules/members.js";
import { membershipsModule } from "./modules/memberships.js";
import { paymentsModule } from "./modules/payments.js";
import { renewalsModule } from "./modules/renewals.js";
import { remindersModule } from "./modules/reminders.js";
import { trainersModule } from "./modules/trainers.js";
import { attendanceModule } from "./modules/attendance.js";
import { workoutsModule } from "./modules/workouts.js";
import { progressModule } from "./modules/progress.js";
import { reportsModule } from "./modules/reports.js";
import { settingsModule } from "./modules/settings.js";
import { myMembershipModule } from "./modules/my-membership.js";
import { myPaymentsModule } from "./modules/my-payments.js";
import { trainerCheckinModule } from "./modules/trainer-checkin.js";
import { trainerMembersModule } from "./modules/trainer-members.js";
import { myWorkoutModule } from "./modules/my-workout.js";
import { profileModule } from "./modules/profile.js";
import { leaderboardModule } from "./modules/leaderboard.js";
import { CARTOON_AVATARS, escapeHtml, getExercises, memberStatus, getAvatarUrl } from "./modules/utils.js";

const appRoot = document.querySelector("#app");

// Apply saved theme before any render to prevent flash
(function initTheme() {
  const saved = localStorage.getItem("gf-theme");
  if (saved === "dark" || saved === "light") {
    document.documentElement.setAttribute("data-theme", saved);
  }
})();

// 4th element = roles allowed to see this nav item / route. Defaults to owner+member.
const ALL_ROLES = ["owner", "member"];
const nav = [
  ["dashboard", "Dashboard", "grid_view", ["owner", "member", "trainer"]],
  ["members", "Members", "group", ["owner"]],
  ["leaderboard", "Leaderboard", "leaderboard", ["owner", "trainer"]],
  ["plans", "Plans", "layers", ["owner"]],
  ["payments", "Payments", "payments", ["owner"]],
  ["renewals", "Renewals", "autorenew", ["owner"]],
  ["reminders", "Reminders", "chat", ["owner"]],
  ["trainers", "Trainers", "badge", ["owner"]],
  ["attendance", "Check-ins", "how_to_reg", ALL_ROLES],
  ["workouts", "Workouts", "fitness_center", ["owner", "trainer"]],
  ["progress", "Progress", "trending_up", ALL_ROLES],
  ["reports", "Reports", "bar_chart", ["owner"]],
  ["my-membership", "My Membership", "card_membership", ["member"]],
  ["my-payments", "My Payments", "receipt_long", ["member"]],
  ["my-workout", "My Workout", "fitness_center", ["member"]],
  ["trainer-checkin", "Check In", "how_to_reg", ["trainer"]],
  ["my-checkins", "My Check-ins", "history", ["trainer"]],
  ["trainer-members", "My Clients", "group", ["trainer"]],
  ["profile", "Profile", "person", ["member"]], // owner/trainer use the sidebar profile chip
  ["settings", "Settings", "settings", ["owner"]]
];

const modules = {
  dashboard: dashboardModule,
  members: membersModule,
  leaderboard: leaderboardModule,
  plans: membershipsModule,
  payments: paymentsModule,
  renewals: renewalsModule,
  reminders: remindersModule,
  trainers: trainersModule,
  attendance: attendanceModule,
  workouts: workoutsModule,
  progress: progressModule,
  reports: reportsModule,
  "my-membership": myMembershipModule,
  "my-payments": myPaymentsModule,
  "trainer-checkin": trainerCheckinModule,
  "my-checkins": trainerCheckinModule,
  "trainer-members": trainerMembersModule,
  "my-workout": myWorkoutModule,
  profile: profileModule,
  settings: settingsModule
};

function roleAllows(route, role) {
  const entry = nav.find(([key]) => key === route);
  const roles = entry?.[3] || ALL_ROLES;
  return roles.includes(role);
}

const collectionNames = [
  "members",
  "trainers",
  "membership_plans",
  "payments",
  "attendance",
  "workout_templates",
  "workout_assignments",
  "workout_sessions",
  "progress_records",
  "reminders",
  "trainer_attendance",
  "membership_pauses",
  "exercise_library",
  "workout_logs",
  "workout_schedules",
  "badges"
];

const state = {
  route: getRoute(),
  profile: null,
  services: null,
  settings: null,
  data: {},
  loading: true,
  authReady: false,
  error: "",
  toast: ""
};

boot();

async function boot() {
  state.services = await createServices(window.GYM_CONFIG || {});
  registerServiceWorker();
  getExercises().catch(() => {});

  window.addEventListener("hashchange", async () => {
    state.route = getRoute();
    if (membersModule.activeMemberId) membersModule.activeMemberId = null;
    if (membersModule.activeView) membersModule.activeView = "list";
    if (trainerMembersModule.activeMemberId) trainerMembersModule.activeMemberId = null;
    if (trainerMembersModule.activeView) trainerMembersModule.activeView = "list";
    if (paymentsModule.activeReceiptPaymentId) paymentsModule.activeReceiptPaymentId = null;
    if (paymentsModule.activeView) paymentsModule.activeView = "list";
    if (paymentsModule.prefilledMemberId) paymentsModule.prefilledMemberId = null;
    if (renewalsModule.activeView) renewalsModule.activeView = "list";
    if (renewalsModule.prefilledMemberId) renewalsModule.prefilledMemberId = null;
    reportsModule.activeTab = "analytics";
    await reloadData(state.route);
    render();
  });

  state.services.auth.onAuthChange(async (profile) => {
    state.authReady = true;
    state.profile = profile;
    if (profile) {
      await refreshData();
    } else {
      state.loading = false;
      render();
    }
  });

  // Global listener to limit all phone number fields to 10 digits max as count
  document.addEventListener("input", (e) => {
    const target = e.target;
    if (
      target.tagName === "INPUT" && 
      (target.type === "tel" || ["mobile", "phone", "whatsappNumber", "emergencyPhone"].includes(target.name))
    ) {
      let val = target.value.replace(/\D/g, "");
      if (val.length > 10) {
        val = val.slice(0, 10);
      }
      if (target.value !== val) {
        target.value = val;
      }
    }
  });

  // Global listener to handle smooth scrolling & active class toggling for forms on mobile/tablet
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-scroll-to-form]");
    const editBtn = e.target.closest("[data-edit-member], [data-edit-plan], [data-edit-trainer], [data-edit-template]");
    
    if (btn) {
      const container = btn.closest(".work-grid");
      const form = container?.querySelector("form");
      if (form) {
        const isCurrentlyActive = form.classList.contains("active");
        if (isCurrentlyActive) {
          form.classList.remove("active");
        } else {
          form.classList.add("active");
          setTimeout(() => {
            form.scrollIntoView({ behavior: "smooth", block: "start" });
            const firstInput = form.querySelector("input:not([type='hidden']), select, textarea");
            firstInput?.focus();
          }, 50);
        }
      }
    } else if (editBtn) {
      const container = editBtn.closest(".work-grid");
      const form = container?.querySelector("form");
      if (form) {
        form.classList.add("active");
        setTimeout(() => {
          form.scrollIntoView({ behavior: "smooth", block: "start" });
          const firstInput = form.querySelector("input:not([type='hidden']), select, textarea");
          firstInput?.focus();
        }, 50);
      }
    }

    // Hide form if clicked cancel/reset
    const cancelBtn = e.target.closest("#cancel-edit-btn, [type='reset'], button[data-cancel-form]");
    if (cancelBtn) {
      const container = cancelBtn.closest(".work-grid");
      const form = container?.querySelector("form");
      if (form) {
        form.classList.remove("active");
      }
    }
  });

  render();
}

// Global collections loaded on boot/login
const GLOBAL_COLLECTIONS = ["members", "trainers", "membership_plans"];

// Route to collection mapping
const ROUTE_SCOPES = {
  dashboard: ["payments", "attendance"],
  payments: ["payments"],
  "my-payments": ["payments"],
  workouts: ["workout_templates", "workout_assignments", "workout_sessions", "workout_logs", "exercise_library"],
  "my-workout": ["workout_templates", "workout_assignments", "workout_sessions", "workout_logs", "exercise_library"],
  progress: ["progress_records"],
  attendance: ["attendance", "trainer_attendance"],
  "trainer-checkin": ["attendance", "trainer_attendance"],
  "my-checkins": ["attendance", "trainer_attendance"],
  renewals: ["membership_pauses", "payments"],
  reminders: ["reminders"],
  leaderboard: ["attendance", "progress_records", "badges"],
  reports: ["payments", "attendance", "progress_records"],
  trainers: ["workout_assignments", "workout_sessions"],
  settings: [],
  profile: [],
  "my-membership": ["payments"]
};

// Fetch settings + scoped collections into state. Sets state.error on failure.
async function reloadData(targetRoute = state.route) {
  try {
    const routeCollections = ROUTE_SCOPES[targetRoute] || [];
    const needed = [...new Set([...GLOBAL_COLLECTIONS, ...routeCollections])];

    // Filter out collections already loaded in state.data
    const toFetch = needed.filter((name) => !state.data[name]);

    const promises = [];
    if (!state.settings) {
      promises.push(state.services.data.getSettings());
    }

    toFetch.forEach((name) => {
      promises.push(state.services.data.list(name));
    });

    if (promises.length === 0) return;

    const results = await Promise.all(promises);

    let resultIdx = 0;
    if (!state.settings) {
      state.settings = results[resultIdx++];
    }

    toFetch.forEach((name) => {
      state.data[name] = results[resultIdx++];
    });

    state.error = "";
  } catch (error) {
    console.error("Failed to load workspace data.", error);
    state.error = /offline|unavailable|network/i.test(error?.message || "")
      ? "Can't reach the database. Check your connection (an ad-blocker, VPN, or proxy can block Firestore), then retry."
      : error?.message || "Could not load your workspace.";
  }
}

async function seedGripGymPlansIfNeeded() {
  if (state.profile?.role !== "owner") return;
  const plans = state.data.membership_plans || [];
  const hasGripGym = plans.some((p) => p.planName === "Annual Membership" || p.price === 16799);
  if (hasGripGym) return;

  const gripPlans = [
    {
      planName: "Monthly Membership",
      durationDays: 30,
      price: 1999,
      description: "Gym access during standard operating hours",
      benefits: "Full equipment access (cardio, strength, functional), 1 welcome session with trainer, Locker facility access"
    },
    {
      planName: "3 Months Membership",
      durationDays: 90,
      price: 5399,
      description: "Special timings (10:00 AM - 11:30 AM) with semi-private group attention",
      benefits: "Training for family or friends (3-4 members), Semi-private group attention & coaching, Full equipment & locker access"
    },
    {
      planName: "6 Months Membership",
      durationDays: 180,
      price: 9599,
      description: "Customized workouts based on individual health type",
      benefits: "Group timings (3 days a week), Dedicated tracking and performance testing, Close alignment with Coach Shaik Arshad"
    },
    {
      planName: "Annual Membership",
      durationDays: 395,
      price: 16799,
      description: "13 months total access",
      benefits: "Save over ₹7,000/year, Ability to pause membership for up to 20 days, Customized fitness assessment"
    }
  ];

  for (const plan of gripPlans) {
    try {
      const saved = await state.services.data.save("membership_plans", plan);
      plans.push(saved);
    } catch (e) {
      console.error("Failed to seed plan:", plan.planName, e);
    }
  }
}

async function seedWorkoutTemplatesIfNeeded() {
  if (state.profile?.role !== "owner") return;
  let templates = state.data.workout_templates || [];
  const hasIndividualDays = templates.some((t) => t.name.includes("BRO-DAY1") || t.name.includes("PPL-DAY1"));
  if (hasIndividualDays) return;

  // Clean up old splits if they exist to keep it clean
  const oldSplits = templates.filter(t => 
    t.name.includes("BRO Split") || 
    t.name.includes("PPL") || 
    t.name.includes("Pull, Push, Legs") ||
    t.name.startsWith("BRO-DAY") ||
    t.name.startsWith("PPL-DAY")
  );
  for (const old of oldSplits) {
    try {
      await state.services.data.remove("workout_templates", old.id);
      state.data.workout_templates = state.data.workout_templates.filter(t => t.id !== old.id);
    } catch (e) {
      console.error("Failed to clean up old split:", old.name, e);
    }
  }

  templates = state.data.workout_templates || [];

  const defaultTemplates = [
    // --- BRO Split ---
    {
      name: "BRO-DAY1 (Chest)",
      goal: "Muscle Gain",
      category: "Strength",
      difficulty: "Intermediate",
      equipment: "Barbell",
      durationMinutes: 60,
      visibility: "basic",
      exercises: "1. Bench Press - 4 sets x 10 reps\n2. Incline DB Press - 3 sets x 12 reps\n3. Chest Dips - 3 sets x max reps\n4. Chest Fly - 3 sets x 15 reps\n5. Push-ups - 3 sets x max reps\n6. DB Pull-over - 3 sets x 12 reps",
      exercisesStructured: [
        { name: "Bench Press", sets: "4", reps: "10", weight: "60", rest: "90s", notes: "Flat barbell" },
        { name: "Incline Dumbbell Press", sets: "3", reps: "12", weight: "22", rest: "90s", notes: "DB incline" },
        { name: "Chest Dips", sets: "3", reps: "10", weight: "0", rest: "90s", notes: "Bodyweight or weighted" },
        { name: "Chest Fly", sets: "3", reps: "15", weight: "12", rest: "60s", notes: "Cables or DB" },
        { name: "Pushups", sets: "3", reps: "20", weight: "0", rest: "60s", notes: "Form focus" },
        { name: "Dumbbell Pull-over", sets: "3", reps: "12", weight: "20", rest: "90s", notes: "Lats & chest" }
      ],
      createdByRole: "owner",
      createdByUid: state.profile?.uid || state.profile?.id || "",
      status: "active"
    },
    {
      name: "BRO-DAY2 (Back)",
      goal: "Muscle Gain",
      category: "Strength",
      difficulty: "Intermediate",
      equipment: "Barbell",
      durationMinutes: 60,
      visibility: "basic",
      exercises: "1. Deadlift - 4 sets x 5 reps\n2. Pull-ups - 3 sets x max reps\n3. Barbell Row - 3 sets x 10 reps\n4. Seated Cable Row - 3 sets x 12 reps\n5. DB Shrugs - 3 sets x 15 reps\n6. Back Extensions - 3 sets x 15 reps",
      exercisesStructured: [
        { name: "Deadlift", sets: "4", reps: "5", weight: "100", rest: "120s", notes: "Power pull" },
        { name: "Pull-ups", sets: "3", reps: "8", weight: "0", rest: "90s", notes: "Wide grip" },
        { name: "Barbell Row", sets: "3", reps: "10", weight: "50", rest: "90s", notes: "Bent over" },
        { name: "Seated Cable Row", sets: "3", reps: "12", weight: "45", rest: "90s", notes: "V-bar" },
        { name: "Dumbbell Shrugs", sets: "3", reps: "15", weight: "24", rest: "60s", notes: "Traps focus" },
        { name: "Back Extensions", sets: "3", reps: "15", weight: "10", rest: "60s", notes: "Lower back" }
      ],
      createdByRole: "owner",
      createdByUid: state.profile?.uid || state.profile?.id || "",
      status: "active"
    },
    {
      name: "BRO-DAY3 (Shoulders)",
      goal: "Muscle Gain",
      category: "Strength",
      difficulty: "Intermediate",
      equipment: "Barbell",
      durationMinutes: 60,
      visibility: "basic",
      exercises: "1. Overhead Press - 4 sets x 8 reps\n2. Lateral Raise - 4 sets x 15 reps\n3. Front Raise - 3 sets x 12 reps\n4. Rear Delt Fly - 3 sets x 15 reps\n5. Face Pulls - 3 sets x 15 reps\n6. Upright Rows - 3 sets x 12 reps",
      exercisesStructured: [
        { name: "Overhead Press", sets: "4", reps: "8", weight: "40", rest: "90s", notes: "Standing barbell" },
        { name: "Dumbbell Lateral Raise", sets: "4", reps: "15", weight: "10", rest: "60s", notes: "Side delts" },
        { name: "Dumbbell Front Raise", sets: "3", reps: "12", weight: "10", rest: "60s", notes: "Front delts" },
        { name: "Rear Delt Fly", sets: "3", reps: "15", weight: "8", rest: "60s", notes: "DB or machine" },
        { name: "Face Pulls", sets: "3", reps: "15", weight: "15", rest: "60s", notes: "Cable rope" },
        { name: "Barbell Upright Row", sets: "3", reps: "12", weight: "30", rest: "90s", notes: "Shoulders & traps" }
      ],
      createdByRole: "owner",
      createdByUid: state.profile?.uid || state.profile?.id || "",
      status: "active"
    },
    {
      name: "BRO-DAY4 (Legs)",
      goal: "Muscle Gain",
      category: "Strength",
      difficulty: "Intermediate",
      equipment: "Barbell",
      durationMinutes: 60,
      visibility: "basic",
      exercises: "1. Squats - 4 sets x 8 reps\n2. Leg Press - 3 sets x 12 reps\n3. Romanian Deadlift - 3 sets x 10 reps\n4. Leg Extensions - 3 sets x 15 reps\n5. Lying Leg Curls - 3 sets x 15 reps\n6. Standing Calf Raises - 4 sets x 15 reps",
      exercisesStructured: [
        { name: "Barbell Squat", sets: "4", reps: "8", weight: "80", rest: "120s", notes: "Back squats" },
        { name: "Leg Press", sets: "3", reps: "12", weight: "120", rest: "90s", notes: "Quad focus" },
        { name: "Romanian Deadlift", sets: "3", reps: "10", weight: "70", rest: "90s", notes: "Hamstrings" },
        { name: "Leg Extensions", sets: "3", reps: "15", weight: "40", rest: "60s", notes: "Quads squeeze" },
        { name: "Lying Leg Curls", sets: "3", reps: "15", weight: "30", rest: "60s", notes: "Hamstrings curl" },
        { name: "Standing Calf Raises", sets: "4", reps: "15", weight: "40", rest: "60s", notes: "Calves burn" }
      ],
      createdByRole: "owner",
      createdByUid: state.profile?.uid || state.profile?.id || "",
      status: "active"
    },
    {
      name: "BRO-DAY5 (Arms)",
      goal: "Muscle Gain",
      category: "Strength",
      difficulty: "Intermediate",
      equipment: "Barbell",
      durationMinutes: 60,
      visibility: "basic",
      exercises: "1. Bicep Curl - 3 sets x 12 reps\n2. Overhead Tricep Extension - 3 sets x 12 reps\n3. Hammer Curl - 3 sets x 12 reps\n4. Tricep Pushdown - 3 sets x 12 reps\n5. Preacher Curl - 3 sets x 12 reps\n6. Bench Dips - 3 sets x 12 reps",
      exercisesStructured: [
        { name: "Barbell Bicep Curl", sets: "3", reps: "12", weight: "25", rest: "60s", notes: "Standing curls" },
        { name: "Overhead Tricep Extension", sets: "3", reps: "12", weight: "18", rest: "60s", notes: "DB overhead" },
        { name: "Hammer Curl", sets: "3", reps: "12", weight: "12", rest: "60s", notes: "Brachialis" },
        { name: "Tricep Pushdown", sets: "3", reps: "12", weight: "20", rest: "60s", notes: "Rope or V-bar" },
        { name: "Preacher Curl", sets: "3", reps: "12", weight: "20", rest: "60s", notes: "EZ-bar preacher" },
        { name: "Bench Dips", sets: "3", reps: "12", weight: "0", rest: "60s", notes: "Tricep dips" }
      ],
      createdByRole: "owner",
      createdByUid: state.profile?.uid || state.profile?.id || "",
      status: "active"
    },
    {
      name: "BRO-DAY6 (Core & Cardio)",
      goal: "General Fitness",
      category: "Cardio",
      difficulty: "Beginner",
      equipment: "Bodyweight",
      durationMinutes: 60,
      visibility: "basic",
      exercises: "1. Hanging Leg Raise - 3 sets x 15 reps\n2. Ab Crunches - 3 sets x 15 reps\n3. Russian Twists - 3 sets x 20 reps\n4. Planks - 3 sets x 60s\n5. Row Machine - 20 mins\n6. Jump Rope - 10 mins",
      exercisesStructured: [
        { name: "Hanging Leg Raise", sets: "3", reps: "15", weight: "0", rest: "60s", notes: "Abs raise" },
        { name: "Ab Crunches", sets: "3", reps: "15", weight: "0", rest: "60s", notes: "Floor crunch" },
        { name: "Russian Twists", sets: "3", reps: "20", weight: "5", rest: "60s", notes: "DB twist" },
        { name: "Plank", sets: "3", reps: "1", weight: "0", rest: "60s", notes: "60 seconds hold" },
        { name: "Rowing Machine", sets: "1", reps: "1", weight: "0", rest: "0s", notes: "20 mins cardio" },
        { name: "Jump Rope", sets: "1", reps: "1", weight: "0", rest: "0s", notes: "10 mins cardio" }
      ],
      createdByRole: "owner",
      createdByUid: state.profile?.uid || state.profile?.id || "",
      status: "active"
    },
    // --- PPL Split ---
    {
      name: "PPL-DAY1 (Pull A)",
      goal: "Strength",
      category: "Strength",
      difficulty: "Intermediate",
      equipment: "Mixed",
      durationMinutes: 75,
      visibility: "basic",
      exercises: "1. Deadlift - 3 sets x 5 reps\n2. Lat Pulldown - 3 sets x 10 reps\n3. Bent Over Row - 3 sets x 10 reps\n4. Face Pulls - 3 sets x 15 reps\n5. Bicep Curl - 3 sets x 12 reps\n6. Hammer Curl - 3 sets x 12 reps",
      exercisesStructured: [
        { name: "Deadlift", sets: "3", reps: "5", weight: "100", rest: "120s", notes: "Main pull" },
        { name: "Lat Pulldown", sets: "3", reps: "10", weight: "50", rest: "90s", notes: "Wide grip lat pull" },
        { name: "Barbell Row", sets: "3", reps: "10", weight: "50", rest: "90s", notes: "Bent over row" },
        { name: "Face Pulls", sets: "3", reps: "15", weight: "15", rest: "60s", notes: "Cable rear delt" },
        { name: "Barbell Bicep Curl", sets: "3", reps: "12", weight: "25", rest: "60s", notes: "Biceps" },
        { name: "Hammer Curl", sets: "3", reps: "12", weight: "12", rest: "60s", notes: "Brachialis" }
      ],
      createdByRole: "owner",
      createdByUid: state.profile?.uid || state.profile?.id || "",
      status: "active"
    },
    {
      name: "PPL-DAY2 (Push A)",
      goal: "Strength",
      category: "Strength",
      difficulty: "Intermediate",
      equipment: "Mixed",
      durationMinutes: 75,
      visibility: "basic",
      exercises: "1. Bench Press - 3 sets x 8 reps\n2. Overhead Press - 3 sets x 10 reps\n3. Incline DB Fly - 3 sets x 12 reps\n4. Lateral Raise - 4 sets x 15 reps\n5. Overhead Tricep Extension - 3 sets x 12 reps\n6. Tricep Pushdown - 3 sets x 12 reps",
      exercisesStructured: [
        { name: "Bench Press", sets: "3", reps: "8", weight: "60", rest: "90s", notes: "Flat bench" },
        { name: "Overhead Press", sets: "3", reps: "10", weight: "40", rest: "90s", notes: "Standing OHP" },
        { name: "Incline Dumbbell Fly", sets: "3", reps: "12", weight: "12", rest: "60s", notes: "Upper chest fly" },
        { name: "Dumbbell Lateral Raise", sets: "4", reps: "15", weight: "10", rest: "60s", notes: "Side delts" },
        { name: "Overhead Tricep Extension", sets: "3", reps: "12", weight: "18", rest: "60s", notes: "DB overhead" },
        { name: "Tricep Pushdown", sets: "3", reps: "12", weight: "20", rest: "60s", notes: "Cable rope" }
      ],
      createdByRole: "owner",
      createdByUid: state.profile?.uid || state.profile?.id || "",
      status: "active"
    },
    {
      name: "PPL-DAY3 (Legs A)",
      goal: "Strength",
      category: "Strength",
      difficulty: "Intermediate",
      equipment: "Mixed",
      durationMinutes: 75,
      visibility: "basic",
      exercises: "1. Squats - 3 sets x 8 reps\n2. Romanian Deadlift - 3 sets x 10 reps\n3. Leg Press - 3 sets x 12 reps\n4. Leg Extensions - 3 sets x 15 reps\n5. Lying Leg Curls - 3 sets x 15 reps\n6. Standing Calf Raises - 4 sets x 15 reps",
      exercisesStructured: [
        { name: "Barbell Squat", sets: "3", reps: "8", weight: "80", rest: "120s", notes: "Heavy squats" },
        { name: "Romanian Deadlift", sets: "3", reps: "10", weight: "70", rest: "90s", notes: "Hamstrings RDL" },
        { name: "Leg Press", sets: "3", reps: "12", weight: "120", rest: "90s", notes: "Leg press" },
        { name: "Leg Extensions", sets: "3", reps: "15", weight: "40", rest: "60s", notes: "Quads" },
        { name: "Lying Leg Curls", sets: "3", reps: "15", weight: "30", rest: "60s", notes: "Hamstrings" },
        { name: "Standing Calf Raises", sets: "4", reps: "15", weight: "40", rest: "60s", notes: "Calves" }
      ],
      createdByRole: "owner",
      createdByUid: state.profile?.uid || state.profile?.id || "",
      status: "active"
    },
    {
      name: "PPL-DAY4 (Pull B)",
      goal: "Strength",
      category: "Strength",
      difficulty: "Intermediate",
      equipment: "Mixed",
      durationMinutes: 75,
      visibility: "basic",
      exercises: "1. Pull-ups - 3 sets x max reps\n2. Seated Cable Row - 3 sets x 12 reps\n3. DB Row - 3 sets x 10 reps\n4. DB Shrugs - 3 sets x 15 reps\n5. Preacher Curl - 3 sets x 12 reps\n6. Reverse Curl - 3 sets x 12 reps",
      exercisesStructured: [
        { name: "Pull-ups", sets: "3", reps: "8", weight: "0", rest: "90s", notes: "Bodyweight pullups" },
        { name: "Seated Cable Row", sets: "3", reps: "12", weight: "45", rest: "90s", notes: "Cable row pull" },
        { name: "One-Arm Dumbbell Row", sets: "3", reps: "10", weight: "22", rest: "90s", notes: "DB row" },
        { name: "Dumbbell Shrugs", sets: "3", reps: "15", weight: "24", rest: "60s", notes: "Traps" },
        { name: "Preacher Curl", sets: "3", reps: "12", weight: "20", rest: "60s", notes: "Preacher curls bicep" },
        { name: "Reverse Grip Bicep Curl", sets: "3", reps: "12", weight: "18", rest: "60s", notes: "Forearms & biceps" }
      ],
      createdByRole: "owner",
      createdByUid: state.profile?.uid || state.profile?.id || "",
      status: "active"
    },
    {
      name: "PPL-DAY5 (Push B)",
      goal: "Strength",
      category: "Strength",
      difficulty: "Intermediate",
      equipment: "Mixed",
      durationMinutes: 75,
      visibility: "basic",
      exercises: "1. Incline Bench Press - 3 sets x 10 reps\n2. DB Shoulder Press - 3 sets x 10 reps\n3. Chest Dips - 3 sets x max reps\n4. Cable Crossover - 3 sets x 15 reps\n5. Close Grip Bench Press - 3 sets x 12 reps\n6. Cable Overhead Extension - 3 sets x 12 reps",
      exercisesStructured: [
        { name: "Incline Barbell Bench Press", sets: "3", reps: "10", weight: "50", rest: "90s", notes: "Upper chest press" },
        { name: "Dumbbell Shoulder Press", sets: "3", reps: "10", weight: "18", rest: "90s", notes: "Shoulders DB press" },
        { name: "Chest Dips", sets: "3", reps: "10", weight: "0", rest: "90s", notes: "Triceps & chest dips" },
        { name: "Cable Crossover", sets: "3", reps: "15", weight: "12", rest: "60s", notes: "Chest squeeze" },
        { name: "Close Grip Bench Press", sets: "3", reps: "12", weight: "40", rest: "90s", notes: "Tricep press" },
        { name: "Cable Overhead Tricep Extension", sets: "3", reps: "12", weight: "15", rest: "60s", notes: "Triceps extension" }
      ],
      createdByRole: "owner",
      createdByUid: state.profile?.uid || state.profile?.id || "",
      status: "active"
    },
    {
      name: "PPL-DAY6 (Legs B)",
      goal: "Strength",
      category: "Strength",
      difficulty: "Intermediate",
      equipment: "Mixed",
      durationMinutes: 75,
      visibility: "basic",
      exercises: "1. Hip Thrusts - 3 sets x 10 reps\n2. Goblet Squat - 3 sets x 12 reps\n3. Dumbbell Lunges - 3 sets x 12 reps\n4. Seated Leg Curls - 3 sets x 15 reps\n5. Standing Calf Raises - 4 sets x 15 reps\n6. Hanging Leg Raises - 3 sets x 15 reps",
      exercisesStructured: [
        { name: "Barbell Hip Thrust", sets: "3", reps: "10", weight: "80", rest: "90s", notes: "Glutes" },
        { name: "Goblet Squats", sets: "3", reps: "12", weight: "24", rest: "90s", notes: "Quads Goblet" },
        { name: "Dumbbell Lunges", sets: "3", reps: "12", weight: "12", rest: "90s", notes: "Legs lunges" },
        { name: "Seated Leg Curls", sets: "3", reps: "15", weight: "30", rest: "60s", notes: "Hamstrings" },
        { name: "Standing Calf Raises", sets: "4", reps: "15", weight: "40", rest: "60s", notes: "Calves" },
        { name: "Hanging Leg Raise", sets: "3", reps: "15", weight: "0", rest: "60s", notes: "Core leg raise" }
      ],
      createdByRole: "owner",
      createdByUid: state.profile?.uid || state.profile?.id || "",
      status: "active"
    }
  ];

  for (const template of defaultTemplates) {
    try {
      const saved = await state.services.data.save("workout_templates", template);
      templates.push(saved);
    } catch (e) {
      console.error("Failed to seed template:", template.name, e);
    }
  }
}

// Full refresh: reload data and rebuild the whole shell. Used on initial load
// and when shell-level data changes (e.g. gym name in the sidebar).
async function refreshData() {
  state.loading = true;
  state.error = "";
  render();
  await reloadData();
  await seedGripGymPlansIfNeeded();
  await seedWorkoutTemplatesIfNeeded();
  state.loading = false;
  render();
}

// Scoped refresh: reload data but re-render only the current module's #view,
// avoiding a full shell rebuild (no flicker / scroll jump). Used after form saves.
async function refreshView() {
  await reloadData(state.route);
  if (state.error) {
    render(); // surface the error screen via the full renderer
    return;
  }
  renderView();
}

// Apply a just-saved doc to local state WITHOUT re-reading from the backend.
// save() returns the complete persisted doc, so we upsert it in place and
// re-render only the current view — 0 extra reads per save.
function applyChange(collectionName, savedDoc) {
  if (!savedDoc) return;
  const list = state.data[collectionName] || [];
  const index = list.findIndex((item) => item.id === savedDoc.id);
  if (index >= 0) {
    list[index] = { ...list[index], ...savedDoc };
  } else {
    list.unshift(savedDoc); // newest first, matches list() sort by updatedAt desc
  }
  state.data[collectionName] = list;
  renderView();
}

// Remove a doc from local state (after a successful delete) and re-render.
function applyRemoval(collectionName, id) {
  state.data[collectionName] = (state.data[collectionName] || []).filter((item) => item.id !== id);
  renderView();
}

function render() {
  // Until the auth provider reports its first result, show the splash rather
  // than the login form — this avoids a flash of the login screen on refresh
  // while a persisted session is being restored.
  if (!state.authReady) {
    appRoot.innerHTML = `
      <div class="boot-screen">
        <div class="boot-mark">GF</div>
        <p>Loading GymFlow...</p>
      </div>
    `;
    return;
  }

  if (!state.profile) {
    renderAuth(appRoot, {
      services: state.services,
      mode: state.services?.mode,
      onToast: showToast
    });
    return;
  }

  if (state.loading) {
    appRoot.innerHTML = `
      <div class="boot-screen">
        <div class="boot-mark">GF</div>
        <p>Syncing workspace...</p>
      </div>
    `;
    return;
  }

  if (state.error) {
    appRoot.innerHTML = `
      <div class="boot-screen">
        <div class="boot-mark">GF</div>
        <p class="boot-error">${state.error}</p>
        <div class="button-row">
          <button class="primary-button" data-action="retry">Retry</button>
          <button class="ghost-button" data-action="logout">Sign out</button>
        </div>
      </div>
    `;
    appRoot.querySelector("[data-action='retry']")?.addEventListener("click", () => refreshData());
    appRoot.querySelector("[data-action='logout']")?.addEventListener("click", async () => {
      await state.services.auth.logout();
    });
    return;
  }

  // Member restriction checks
  if (state.profile.role === "member") {
    const myMembers = (state.data.members || []).filter(
      (m) => m.uid === state.profile?.uid || (m.email && m.email.toLowerCase() === state.profile?.email?.toLowerCase())
    );
    const myMember = myMembers.find((m) => memberStatus(m) !== "Pending") || myMembers[0];

    if (!myMember) {
      appRoot.innerHTML = `
        <div class="boot-screen">
          <div class="boot-mark">GF</div>
          <p class="boot-error" style="font-size: 1.15rem; max-width: 480px; margin: 0 auto 24px; line-height: 1.6; text-align: center;">
            Access Restricted: Please contact the gym owner or trainer to register your account as a member.
          </p>
          <div class="button-row" style="justify-content: center;">
            <button class="ghost-button" data-action="logout">Sign out</button>
          </div>
        </div>
      `;
      appRoot.querySelector("[data-action='logout']")?.addEventListener("click", async () => {
        await state.services.auth.logout();
        showToast("Signed out.");
      });
      return;
    }

    // Auto-link UID if not already done (run before early return status guards)
    if (myMember && !myMember.uid) {
      myMember.uid = state.profile.uid;
      state.services.data.save("members", myMember).catch(err => {
        console.error("Failed to link member UID:", err);
      });
    }

    const status = memberStatus(myMember);

    // Pending membership activation check
    if (status === "Pending") {
      appRoot.innerHTML = `
        <div class="boot-screen" style="flex-direction: column; justify-content: center; padding: 20px;">
          <div class="boot-mark">GF</div>
          <div class="banner warning-banner" style="padding: 16px 20px; border-radius: 8px; background: var(--warning-bg, rgba(255, 193, 7, 0.15)); color: var(--warning, #ffc107); border: 1px solid rgba(255, 193, 7, 0.25); margin: 0 auto 24px; max-width: 480px; text-align: center; font-size: 1.05rem; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: var(--shadow-small);">
            <span class="material-symbols-outlined" style="font-size: 24px;">warning</span>
            <span>Your membership is pending approval. Please contact the gym administrator to activate it.</span>
          </div>
          <div class="button-row" style="justify-content: center; gap: 12px; margin-bottom: 20px;">
            <button class="primary-button" data-action="refresh-activation">
              <span class="material-symbols-outlined" style="font-size: 20px; vertical-align: middle;">refresh</span>Check Activation
            </button>
            <button class="ghost-button" data-action="logout">Sign out</button>
          </div>
          <details style="text-align: left; font-size: 0.82rem; max-width: 480px; width: 100%; margin: 10px auto 0; opacity: 0.65; background: rgba(0,0,0,0.15); border: 1px solid var(--line); border-radius: 6px; padding: 8px;">
            <summary style="cursor: pointer; padding: 4px; font-weight: 600;">Debug Info (Show for Troubleshooting)</summary>
            <pre style="white-space: pre-wrap; font-family: monospace; margin: 8px 0 0; padding: 8px; background: rgba(0,0,0,0.25); border-radius: 4px; max-height: 220px; overflow-y: auto;">Email: ${state.profile?.email}
UID: ${state.profile?.uid}
Gym ID: ${state.profile?.gymId}
Matches in members collection: ${JSON.stringify((state.data.members || []).filter(m => m.email?.toLowerCase() === state.profile?.email?.toLowerCase() || m.uid === state.profile?.uid).map(m => ({ id: m.id, email: m.email, uid: m.uid, status: m.status, computedStatus: memberStatus(m) })), null, 2)}
Total members listed: ${(state.data.members || []).length}</pre>
          </details>
        </div>
      `;

      appRoot.querySelector("[data-action='refresh-activation']")?.addEventListener("click", async () => {
        try {
          await refreshData();
          showToast("Checked activation status.");
        } catch (err) {
          console.error(err);
          showToast("Failed to refresh activation status.");
        }
      });

      appRoot.querySelector("[data-action='logout']")?.addEventListener("click", async () => {
        await state.services.auth.logout();
        showToast("Signed out.");
      });
      return;
    }

    const isRestricted = status === "Paused" || status === "Suspended" || status === "Expired";
    if (isRestricted) {
      appRoot.innerHTML = `
        <div class="boot-screen">
          <div class="boot-mark">GF</div>
          <p class="boot-error" style="font-size: 1.15rem; max-width: 480px; margin: 0 auto 24px; line-height: 1.6; text-align: center;">
            Your subscription is paused or expired. Please renew or make a payment to continue using the application.
          </p>
          <div class="button-row" style="justify-content: center;">
            <button class="ghost-button" data-action="logout">Sign out</button>
          </div>
        </div>
      `;
      appRoot.querySelector("[data-action='logout']")?.addEventListener("click", async () => {
        await state.services.auth.logout();
        showToast("Signed out.");
      });
      return;
    }
  }

  // Route guard: bounce a role off a route it isn't allowed to see.
  const role = state.profile.role || "owner";
  if (!roleAllows(state.route, role)) {
    state.route = "dashboard";
    if (location.hash !== "#/dashboard") location.hash = "#/dashboard";
  }

  const currentModule = modules[state.route] || dashboardModule;
  const currentNav = nav.find(([key]) => key === state.route) || nav[0];
  const visibleNav = nav.filter(([, , , roles]) => (roles || ALL_ROLES).includes(role));

  appRoot.innerHTML = `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">GF</div>
        <div>
          <strong>${state.settings?.gymName || "GymFlow"}</strong>
          <span>${state.services.mode === "firebase" ? "Live Workspace" : "Demo Workspace"}</span>
        </div>
      </div>
      <nav class="nav-list">
        ${visibleNav
          .map(
            ([key, label, icon]) => `
              <a href="#/${key}" class="${key === currentNav[0] ? "active" : ""}" data-label="${label}">
                <span class="nav-icon">${iconSymbol(icon)}</span>
                <span>${label}</span>
              </a>
            `
          )
          .join("")}
      </nav>
      <div class="sidebar-footer">
        <div class="profile-chip" style="cursor: pointer;" title="Edit Profile">
          <span class="avatar">
            ${state.profile.avatarUrl 
              ? `<img src="${escapeHtml(getAvatarUrl(state.profile.avatarUrl))}" alt="" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />` 
              : initials(state.profile.name)}
          </span>
          <div>
            <strong>${state.profile.name}</strong>
            <span>${state.profile.role}</span>
          </div>
        </div>
        <div class="sidebar-attribution">
          Made with <span class="heart">❤️</span> by <a href="https://github.com/SriSatyaLokesh" target="_blank" rel="noopener noreferrer">SriSatyaLokesh</a> &amp; <a href="https://github.com/ravitej18" target="_blank" rel="noopener noreferrer">Raviteja</a>
        </div>
      </div>
    </aside>
    <main class="workspace">
      <header class="topbar">
        <button class="icon-button mobile-nav" data-action="toggle-nav" aria-label="Open menu" title="Menu">
          <span class="material-symbols-outlined">menu</span>
        </button>
        <div class="topbar-search">
          <span class="material-symbols-outlined">search</span>
          <input type="search" placeholder="Search members, payments…" aria-label="Search" />
        </div>
        <div class="topbar-actions">
          <a class="pill-button" href="#/${state.profile.role === "trainer" ? "trainer-checkin" : "attendance"}">
            <span class="material-symbols-outlined">login</span><span>Check-in</span>
          </a>
          <div class="topbar-user">
            <span class="eyebrow">${state.profile.role}</span>
            <strong>${state.profile.name}</strong>
          </div>
          <button class="theme-toggle" data-action="toggle-theme" aria-label="Toggle theme" title="Toggle dark/light mode">
            <span class="material-symbols-outlined theme-icon-light">dark_mode</span>
            <span class="material-symbols-outlined theme-icon-dark">light_mode</span>
          </button>
          <button class="ghost-button" data-action="logout">Sign out</button>
        </div>
      </header>
      <section class="content-panel" id="view">${currentModule.render(makeContext())}</section>
    </main>
    <div class="toast ${state.toast ? "show" : ""}">${state.toast}</div>
    <div class="nav-scrim" data-action="close-nav"></div>
  `;

  bindAppEvents();
  currentModule.bind?.(document.querySelector("#view"), makeContext());
}

// Re-render only the current module's #view (and re-bind it), leaving the
// sidebar/topbar untouched. No-op if the shell isn't mounted yet.
function renderView() {
  const view = document.querySelector("#view");
  if (!view) {
    render();
    return;
  }
  const currentModule = modules[state.route] || dashboardModule;
  view.innerHTML = currentModule.render(makeContext());
  currentModule.bind?.(view, makeContext());
}

function makeContext() {
  // The signed-in member's / trainer's own roster id (doc linked by uid), if any.
  const myMembers = (state.data.members || []).filter(
    (m) => m.uid === state.profile?.uid || (m.email && m.email.toLowerCase() === state.profile?.email?.toLowerCase())
  );
  const myMember = myMembers.find((m) => memberStatus(m) !== "Pending") || myMembers[0] || null;
  const myTrainer = (state.data.trainers || []).find((t) => t.uid === state.profile?.uid) || null;
  return {
    profile: state.profile,
    settings: state.settings,
    data: state.data,
    services: state.services,
    refresh: refreshData,
    refreshView,
    applyChange,
    applyRemoval,
    myMember,
    myMemberId: myMember?.id || null,
    myTrainer,
    myTrainerId: myTrainer?.id || null,
    navigate(route) {
      location.hash = `#/${route}`;
    },
    toast: showToast
  };
}

function bindAppEvents() {
  document.querySelector(".profile-chip")?.addEventListener("click", () => {
    location.hash = "#/profile";
  });

  document.querySelector("[data-action='logout']")?.addEventListener("click", async () => {
    await state.services.auth.logout();
    showToast("Signed out.");
  });

  document.querySelector("[data-action='toggle-nav']")?.addEventListener("click", () => {
    document.body.classList.toggle("nav-open");
  });

  document.querySelector("[data-action='close-nav']")?.addEventListener("click", () => {
    document.body.classList.remove("nav-open");
  });

  // Close mobile nav when a nav link is clicked
  document.querySelectorAll(".nav-list a").forEach((link) => {
    link.addEventListener("click", () => {
      document.body.classList.remove("nav-open");
    });
  });

  document.querySelector("[data-action='toggle-theme']")?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("gf-theme", next);
  });

  const topSearch = document.querySelector(".topbar-search input");
  topSearch?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const term = topSearch.value.trim();
    if (state.route !== "members") location.hash = "#/members";
    requestAnimationFrame(() => {
      const field = document.querySelector("[data-filter='search']");
      if (field) {
        field.value = term;
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.focus();
      }
    });
  });
}

function showToast(message) {
  state.toast = message;
  const toast = document.querySelector(".toast");
  if (toast) {
    toast.textContent = message;
    toast.classList.add("show");
  }
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    state.toast = "";
    document.querySelector(".toast")?.classList.remove("show");
  }, 2800);
}

function getRoute() {
  return location.hash.replace("#/", "") || "dashboard";
}

function iconSymbol(icon) {
  return `<span class="material-symbols-outlined">${icon}</span>`;
}

function initials(name = "") {
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase() || "GF";
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;

  const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);

  if (isLocalhost) {
    // During local development the service worker only gets in the way by serving
    // stale code. Tear down any existing worker + caches so edits always load.
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
    if (window.caches?.keys) {
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
    }
    return;
  }

  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

