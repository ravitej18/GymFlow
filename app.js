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

const appRoot = document.querySelector("#app");

const nav = [
  ["dashboard", "Dashboard", "grid"],
  ["members", "Members", "users"],
  ["plans", "Plans", "layers"],
  ["payments", "Payments", "wallet"],
  ["renewals", "Renewals", "refresh"],
  ["reminders", "Reminders", "message"],
  ["trainers", "Trainers", "badge"],
  ["attendance", "Attendance", "check"],
  ["workouts", "Workouts", "dumbbell"],
  ["progress", "Progress", "trend"],
  ["reports", "Reports", "chart"],
  ["settings", "Settings", "settings"]
];

const modules = {
  dashboard: dashboardModule,
  members: membersModule,
  plans: membershipsModule,
  payments: paymentsModule,
  renewals: renewalsModule,
  reminders: remindersModule,
  trainers: trainersModule,
  attendance: attendanceModule,
  workouts: workoutsModule,
  progress: progressModule,
  reports: reportsModule,
  settings: settingsModule
};

const collectionNames = [
  "members",
  "trainers",
  "membership_plans",
  "payments",
  "attendance",
  "workout_templates",
  "workout_assignments",
  "progress_records",
  "reminders"
];

const state = {
  route: getRoute(),
  profile: null,
  services: null,
  settings: null,
  data: {},
  loading: true,
  toast: ""
};

boot();

async function boot() {
  state.services = await createServices(window.GYM_CONFIG || {});
  registerServiceWorker();

  window.addEventListener("hashchange", () => {
    state.route = getRoute();
    render();
  });

  state.services.auth.onAuthChange(async (profile) => {
    state.profile = profile;
    if (profile) {
      await refreshData();
    } else {
      state.loading = false;
      render();
    }
  });
}

async function refreshData() {
  state.loading = true;
  render();

  const [settings, ...collections] = await Promise.all([
    state.services.data.getSettings(),
    ...collectionNames.map((name) => state.services.data.list(name))
  ]);

  state.settings = settings;
  state.data = Object.fromEntries(collectionNames.map((name, index) => [name, collections[index]]));
  state.loading = false;
  render();
}

function render() {
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

  const currentModule = modules[state.route] || dashboardModule;
  const currentNav = nav.find(([key]) => key === state.route) || nav[0];

  appRoot.innerHTML = `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">GF</div>
        <div>
          <strong>${state.settings?.gymName || "GymFlow"}</strong>
          <span>${state.services.mode === "firebase" ? "Firebase" : "Local demo"}</span>
        </div>
      </div>
      <nav class="nav-list">
        ${nav
          .map(
            ([key, label, icon]) => `
              <a href="#/${key}" class="${key === currentNav[0] ? "active" : ""}">
                <span class="nav-icon">${iconSymbol(icon)}</span>
                <span>${label}</span>
              </a>
            `
          )
          .join("")}
      </nav>
    </aside>
    <main class="workspace">
      <header class="topbar">
        <button class="icon-button mobile-nav" data-action="toggle-nav" title="Menu">Menu</button>
        <div>
          <span class="eyebrow">${state.profile.role}</span>
          <strong>${state.profile.name}</strong>
        </div>
        <button class="ghost-button" data-action="logout">Sign out</button>
      </header>
      <section class="content-panel" id="view">${currentModule.render(makeContext())}</section>
    </main>
    <div class="toast ${state.toast ? "show" : ""}">${state.toast}</div>
  `;

  bindAppEvents();
  currentModule.bind?.(document.querySelector("#view"), makeContext());
}

function makeContext() {
  return {
    profile: state.profile,
    settings: state.settings,
    data: state.data,
    services: state.services,
    refresh: refreshData,
    navigate(route) {
      location.hash = `#/${route}`;
    },
    toast: showToast
  };
}

function bindAppEvents() {
  document.querySelector("[data-action='logout']")?.addEventListener("click", async () => {
    await state.services.auth.logout();
    showToast("Signed out.");
  });

  document.querySelector("[data-action='toggle-nav']")?.addEventListener("click", () => {
    document.body.classList.toggle("nav-open");
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
  const symbols = {
    grid: "::",
    users: "US",
    layers: "PL",
    wallet: "Rs",
    refresh: "Re",
    message: "Msg",
    badge: "ID",
    check: "Ok",
    dumbbell: "Wo",
    trend: "Tr",
    chart: "Rp",
    settings: "St"
  };
  return symbols[icon] || "..";
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}
