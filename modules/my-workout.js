import { collections, dateLabel, emptyState, escapeHtml, findName, pageHeader, today, getExercises, getExercisesList, showExerciseModal, withButtonLoading, awardPointsAndBadges, exerciseImageUrl, exerciseCategory, findExerciseByName } from "./utils.js";
import { renderTemplateExercises } from "./workouts.js";
import { IMPORT_SOURCES, parseImport, dedupeLogs, dedupeBodyWeights, toWorkoutLogPayload, summarise } from "./workout-import.js";
import { planExercise, PROGRESSION_SCHEMES, isTimedExercise } from "./workout-progression.js";
// Page state persisted in-memory on the singleton module object
export const myWorkoutModule = {
  activeTab: "workouts", // "workouts" or "history"
  editingRoutine: null,  // routine object or null
  editingSchedule: false, // boolean
  exerciseSearchOpen: false, // boolean
  customExerciseOpen: false, // boolean
  timerInterval: null,
  restInterval: null,
  importSource: "strong",  // selected export format on the Import tab
  importPreview: null,     // { sourceKey, fileName, result, fresh, duplicates, bwFresh, bwDuplicates }
  importBusy: false,       // true while writing rows to the backend
  wakeLock: null,          // Screen Wake Lock sentinel held during a workout
  presenceTimer: null,     // interval writing the "training now" heartbeat
  presenceDocId: null,     // this session's presence row, reused across beats

  render(context) {
    const me = context.myMember;
    if (!me) {
      return `
        ${pageHeader("My Workout")}
        ${emptyState("Membership being set up", "Your workout will appear here once your gym finalises your membership.")}
      `;
    }

    if (!this.selectedDay) {
      const todayIndex = new Date().getDay();
      this.selectedDay = todayIndex === 0 ? "Sunday" : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][todayIndex - 1];
    }

    // Check if there is an active workout in progress
    const activeWorkout = getActiveWorkout();
    if (activeWorkout) {
      return this.renderActiveLogger(context, activeWorkout);
    }

    // Check if editing or creating a custom routine
    if (this.editingRoutine) {
      return this.renderRoutineBuilder(context);
    }

    // Load datasets
    const templates = context.data.workout_templates || [];
    const mySchedules = (context.data.workout_schedules || []).filter(s => s.memberId === me.id);
    const customRoutines = mySchedules.filter(s => s.type === "routine");
    const weeklyScheduleDoc = mySchedules.find(s => s.type === "schedule") || { schedule: {} };
    const myLogs = (context.data.workout_logs || [])
      .filter(l => l.memberId === me.id)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    const basicTemplates = templates
      .filter((template) => template.visibility === "basic" && template.status !== "archived")
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    const myAssignments = (context.data.workout_assignments || [])
      .filter(a => a.memberId === me.id)
      .sort((a, b) => String(b.assignedAt || "").localeCompare(String(a.assignedAt || "")));
    const currentAssignment = myAssignments[0];
    const assignedTemplate = currentAssignment 
      ? templates.find(t => t.id === currentAssignment.templateId)
      : null;

    const todaySession = (context.data.workout_sessions || [])
      .find(s => s.memberId === me.id && s.date === today());

    // Renders the main tabbed layout
    return `
      ${pageHeader("My Workout")}
      
      <div class="tabs-header">
        <button class="tab-btn ${this.activeTab === "workouts" ? "active" : ""}" data-tab="workouts">
          <span class="material-symbols-outlined">fitness_center</span> Workouts
        </button>
        <button class="tab-btn ${this.activeTab === "history" ? "active" : ""}" data-tab="history">
          <span class="material-symbols-outlined">history</span> History (${myLogs.length})
        </button>
        <button class="tab-btn ${this.activeTab === "import" ? "active" : ""}" data-tab="import">
          <span class="material-symbols-outlined">upload_file</span> Import
        </button>
      </div>

      ${(() => {
        const peers = trainingNow(context, me.id);
        return peers.length ? `
          <div class="training-now" role="status">
            <span class="material-symbols-outlined">groups</span>
            <span><strong>${peers.length}</strong> member${peers.length === 1 ? "" : "s"} training right now:
              ${escapeHtml(peers.slice(0, 3).map((p) => p.memberName).join(", "))}${peers.length > 3 ? ` +${peers.length - 3} more` : ""}
            </span>
          </div>
        ` : "";
      })()}

      <div class="tab-content">
        ${this.activeTab === "workouts"
          ? this.renderWorkoutsTab(context, basicTemplates, customRoutines, weeklyScheduleDoc, assignedTemplate, todaySession)
          : this.activeTab === "import"
            ? this.renderImportTab(context)
            : this.renderHistoryTab(context, myLogs)}
      </div>
    `;
  },

  // Renders the Import tab — bring history over from another fitness app.
  renderImportTab(context) {
    const preview = this.importPreview;
    const source = IMPORT_SOURCES.find((s) => s.key === this.importSource) || IMPORT_SOURCES[0];

    return `
      <section class="panel stack" style="gap:14px;">
        <div class="panel-heading">
          <h2>Import Workout History</h2>
        </div>
        <p style="margin:0; color:var(--muted); font-size:0.9rem;">
          Moving over from another app? Export your data there, choose the format below and pick the file.
          Nothing is saved until you review the summary and confirm.
        </p>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
          <label>Export format
            <select id="import-source-select">
              ${IMPORT_SOURCES.map((s) => `
                <option value="${s.key}" ${s.key === this.importSource ? "selected" : ""}>${escapeHtml(s.label)}</option>
              `).join("")}
            </select>
          </label>
          <label>File
            <input type="file" id="import-file-input" accept=".csv,.xml,.txt,text/csv,text/xml,text/plain" />
          </label>
        </div>

        <p style="margin:0; color:var(--muted); font-size:0.82rem;">
          ${escapeHtml(IMPORT_HINTS[source.key] || "")}
        </p>

        ${preview ? this.renderImportPreview(preview) : ""}
      </section>
    `;
  },

  renderImportPreview(preview) {
    const { result, fresh, duplicates, bwFresh, bwDuplicates, fileName } = preview;
    const stats = summarise(result);
    const nothingToDo = !fresh.length && !bwFresh.length;

    return `
      <div class="import-preview stack" style="gap:12px;">
        <div class="panel-heading" style="border-top:1px solid var(--line); padding-top:12px;">
          <h3 style="margin:0;">Preview</h3>
          <span style="color:var(--muted); font-size:0.82rem;">${escapeHtml(fileName || "")}</span>
        </div>

        ${result.warnings.length ? `
          <div class="import-warnings">
            ${result.warnings.map((w) => `
              <p><span class="material-symbols-outlined">warning</span>${escapeHtml(w)}</p>
            `).join("")}
          </div>
        ` : ""}

        ${stats.workouts || stats.bodyWeights ? `
          <div class="analytics-stat-row">
            ${stats.workouts ? `
              <div class="analytics-stat">
                <span class="analytics-stat-label">Workouts</span>
                <strong class="analytics-stat-value">${fresh.length}${duplicates ? ` <small style="font-weight:500; color:var(--muted);">+${duplicates} already here</small>` : ""}</strong>
              </div>
              <div class="analytics-stat">
                <span class="analytics-stat-label">Sets</span>
                <strong class="analytics-stat-value">${stats.sets}</strong>
              </div>
              <div class="analytics-stat">
                <span class="analytics-stat-label">Exercises</span>
                <strong class="analytics-stat-value">${stats.exercises}</strong>
              </div>
              <div class="analytics-stat">
                <span class="analytics-stat-label">Date range</span>
                <strong class="analytics-stat-value" style="font-size:0.92rem;">${escapeHtml(dateLabel(stats.from))} – ${escapeHtml(dateLabel(stats.to))}</strong>
              </div>
            ` : ""}
            ${stats.bodyWeights ? `
              <div class="analytics-stat">
                <span class="analytics-stat-label">Body weight readings</span>
                <strong class="analytics-stat-value">${bwFresh.length}${bwDuplicates ? ` <small style="font-weight:500; color:var(--muted);">+${bwDuplicates} already here</small>` : ""}</strong>
              </div>
            ` : ""}
          </div>
        ` : ""}

        ${fresh.length ? `
          <div style="max-height:220px; overflow-y:auto; border:1px solid var(--line); border-radius:var(--r-sm);">
            ${fresh.slice(0, 25).map((log) => `
              <div style="display:flex; justify-content:space-between; gap:10px; padding:8px 10px; border-bottom:1px solid var(--line);">
                <div style="min-width:0;">
                  <strong style="font-size:0.9rem;">${escapeHtml(log.routineName)}</strong>
                  <div style="font-size:0.78rem; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${escapeHtml((log.exercises || []).map((ex) => ex.name).join(", "))}
                  </div>
                </div>
                <span style="font-size:0.8rem; color:var(--muted); white-space:nowrap;">${escapeHtml(dateLabel(log.date))}</span>
              </div>
            `).join("")}
            ${fresh.length > 25 ? `<div style="padding:8px 10px; color:var(--muted); font-size:0.8rem;">…and ${fresh.length - 25} more</div>` : ""}
          </div>
        ` : ""}

        ${nothingToDo ? `
          <p style="margin:0; color:var(--muted); font-size:0.88rem;">
            ${duplicates || bwDuplicates
              ? "Everything in this file is already in your history — nothing left to import."
              : "Nothing importable was found in this file."}
          </p>
        ` : `
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button class="primary-button" id="confirm-import-btn" ${this.importBusy ? "disabled" : ""}>
              Import ${fresh.length ? `${fresh.length} workout${fresh.length === 1 ? "" : "s"}` : ""}${fresh.length && bwFresh.length ? " and " : ""}${bwFresh.length ? `${bwFresh.length} weight record${bwFresh.length === 1 ? "" : "s"}` : ""}
            </button>
            <button class="ghost-button" id="cancel-import-btn" ${this.importBusy ? "disabled" : ""}>Cancel</button>
          </div>
        `}
      </div>
    `;
  },

  bindImportTab(root, context) {
    root.querySelector("#import-source-select")?.addEventListener("change", (event) => {
      this.importSource = event.target.value;
      this.importPreview = null;
      context.refreshView();
    });

    root.querySelector("#import-file-input")?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Guard against someone picking a whole Apple Health export.xml, which can
      // run to hundreds of megabytes and would hang the tab.
      if (file.size > IMPORT_MAX_BYTES) {
        context.toast(`That file is ${Math.round(file.size / 1048576)} MB — please export a smaller range (limit ${IMPORT_MAX_BYTES / 1048576} MB).`);
        event.target.value = "";
        return;
      }

      try {
        const text = await file.text();
        const result = parseImport(this.importSource, text);
        const me = context.myMember;
        const myLogs = (context.data.workout_logs || []).filter((log) => log.memberId === me.id);
        const myRecords = (context.data.progress_records || []).filter((r) => r.memberId === me.id);
        const { fresh, duplicates } = dedupeLogs(result.logs, myLogs);
        const bw = dedupeBodyWeights(result.bodyWeights, myRecords);

        this.importPreview = {
          sourceKey: this.importSource,
          fileName: file.name,
          result,
          fresh,
          duplicates,
          bwFresh: bw.fresh,
          bwDuplicates: bw.duplicates
        };
      } catch (err) {
        console.error("Import failed:", err);
        context.toast("Could not read that file.");
        this.importPreview = null;
      }
      context.refreshView();
    });

    root.querySelector("#cancel-import-btn")?.addEventListener("click", () => {
      this.importPreview = null;
      context.refreshView();
    });

    root.querySelector("#confirm-import-btn")?.addEventListener("click", async (event) => {
      const preview = this.importPreview;
      if (!preview || this.importBusy) return;
      const me = context.myMember;

      this.importBusy = true;
      await withButtonLoading(event.target, async () => {
        let workoutsSaved = 0;
        let weightsSaved = 0;
        const failed = [];

        // Sequential on purpose: a member migrating years of history can produce
        // hundreds of rows, and firing them all at once would swamp the backend.
        for (const log of preview.fresh) {
          try {
            const payload = toWorkoutLogPayload({ ...log, importedFrom: preview.sourceKey }, me);
            const saved = await context.services.data.save(collections.workoutLogs, payload);
            context.applyChange(collections.workoutLogs, saved);
            workoutsSaved += 1;
          } catch (err) {
            console.error("Failed to import workout:", log.date, err);
            failed.push(log.date);
          }
        }

        for (const entry of preview.bwFresh) {
          try {
            const saved = await context.services.data.save(collections.progress, {
              memberId: me.id,
              gymId: me.gymId,
              date: entry.date,
              weight: entry.weight,
              notes: "Imported from Apple Health",
              importedFrom: preview.sourceKey
            });
            context.applyChange(collections.progress, saved);
            weightsSaved += 1;
          } catch (err) {
            console.error("Failed to import body weight:", entry.date, err);
            failed.push(entry.date);
          }
        }

        const parts = [];
        if (workoutsSaved) parts.push(`${workoutsSaved} workout${workoutsSaved === 1 ? "" : "s"}`);
        if (weightsSaved) parts.push(`${weightsSaved} weight record${weightsSaved === 1 ? "" : "s"}`);
        context.toast(
          failed.length
            ? `Imported ${parts.join(" and ") || "nothing"}; ${failed.length} row(s) failed.`
            : `Imported ${parts.join(" and ")}.`
        );
      }, "Importing...");

      this.importBusy = false;
      this.importPreview = null;
      this.activeTab = "history";
      context.refreshView();
    });
  },

  // Renders the Workouts tab (Weekly Schedule, Quick Start, Custom Routines, Gym templates)
  renderWorkoutsTab(context, basicTemplates, customRoutines, weeklyScheduleDoc, assignedTemplate, todaySession) {
    const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    
    // Build schedule selector or display summary
    let scheduleSection;
    if (this.editingSchedule) {
      scheduleSection = `
        <form class="panel stack" id="schedule-form">
          <div class="panel-heading">
            <h2>Configure Weekly Schedule</h2>
            <div style="display:flex; gap:8px;">
              <button class="primary-button compact" type="submit">Save</button>
              <button class="ghost-button compact" type="button" id="cancel-schedule-btn">Cancel</button>
            </div>
          </div>
          <div class="form-grid">
            ${weekdays.map(day => {
              const currentVal = weeklyScheduleDoc.schedule?.[day] || "";
              return `
                <label>${day}
                  <select name="${day}">
                    <option value="">Rest Day</option>
                    ${customRoutines.length ? `
                    <optgroup label="Custom Routines">
                      ${customRoutines.map(r => `<option value="${r.id}" ${currentVal === r.id ? "selected" : ""}>${escapeHtml(r.name)}</option>`).join("")}
                    </optgroup>
                    ` : ""}
                    ${basicTemplates.length ? `
                    <optgroup label="Gym Templates">
                      ${basicTemplates.map(t => `<option value="${t.id}" ${currentVal === t.id ? "selected" : ""}>${escapeHtml(t.name)}</option>`).join("")}
                    </optgroup>
                    ` : ""}
                  </select>
                </label>
              `;
            }).join("")}
          </div>
        </form>
      `;
    } else {
      const scheduleItems = weekdays.map(day => {
        const id = weeklyScheduleDoc.schedule?.[day];
        const isSelected = this.selectedDay === day;
        const shortName = day.slice(0, 3);
        return `
          <button class="schedule-pill ${isSelected ? "active" : ""} ${id ? "has-routine" : ""}" 
            data-day="${day}" type="button">
            <span style="font-size: 0.75rem; font-weight: 600; opacity: 0.85;">${shortName}</span>
            <div class="day-dot"></div>
          </button>
        `;
      }).join("");

      const selectedDayId = weeklyScheduleDoc.schedule?.[this.selectedDay];
      let selectedDayDetails = "";
      if (selectedDayId) {
        const r = customRoutines.find(cr => cr.id === selectedDayId);
        const t = basicTemplates.find(bt => bt.id === selectedDayId);
        let routineName = "";
        let exercisesHtml = "";
        let isGymTemplate = false;
        if (r) {
          routineName = r.name;
          isGymTemplate = false;
          exercisesHtml = (r.exercisesStructured || []).map(ex => `
            <span style="background:var(--surface-light, rgba(255,255,255,0.05)); padding:4px 8px; border-radius:var(--r-sm); font-size:0.8rem; border:1px solid var(--line);">${escapeHtml(ex.name)} (${ex.sets}x${ex.reps})</span>
          `).join("");
        } else if (t) {
          routineName = t.name;
          isGymTemplate = true;
          const rawStructured = typeof t.exercisesStructured === "string" ? JSON.parse(t.exercisesStructured) : (t.exercisesStructured || []);
          exercisesHtml = (rawStructured || []).map(ex => `
            <span style="background:var(--surface-light, rgba(255,255,255,0.05)); padding:4px 8px; border-radius:var(--r-sm); font-size:0.8rem; border:1px solid var(--line);">${escapeHtml(ex.name)} (${ex.sets}x${ex.reps})</span>
          `).join("");
        }

        selectedDayDetails = `
          <div class="panel stack" style="padding:15px; background:var(--bg-alt); border-radius:var(--r-md); border:1px solid var(--line); gap:12px; margin-top:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <div>
                <span style="font-size:0.8rem; font-weight:700; color:var(--accent); text-transform:uppercase; letter-spacing:0.5px;">${this.selectedDay}'s Workout</span>
                <h3 style="margin:4px 0 0 0; font-size:1.15rem;">${escapeHtml(routineName)}</h3>
              </div>
              <button class="primary-button compact start-sched-btn" data-id="${selectedDayId}" data-type="${isGymTemplate ? "template" : "routine"}">
                Record Workout
              </button>
            </div>
            ${exercisesHtml ? `<div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:4px;">${exercisesHtml}</div>` : ""}
          </div>
        `;
      } else {
        selectedDayDetails = `
          <div class="panel stack" style="padding:20px; text-align:center; background:var(--bg-alt); border-radius:var(--r-md); border:1px dashed var(--line); margin-top:10px; color:var(--text-muted);">
            <span class="material-symbols-outlined" style="font-size:32px; opacity:0.6;">bedtime</span>
            <strong style="margin-top:8px; display:block;">${this.selectedDay} is a Rest Day</strong>
            <p style="font-size:0.8rem; margin:4px 0 10px 0; opacity:0.8;">No routines scheduled for this day.</p>
            <button class="ghost-button compact" id="schedule-rest-action-btn" style="margin: 0 auto;">Configure Schedule</button>
          </div>
        `;
      }

      scheduleSection = `
        <div class="panel stack" style="padding: 15px; border-radius: var(--r-md);">
          <div class="panel-heading" style="margin-bottom: 12px;">
            <h2>Weekly Schedule</h2>
            <button class="ghost-button compact" id="edit-schedule-btn">
              <span class="material-symbols-outlined" style="font-size:16px;">edit</span> Edit
            </button>
          </div>
          <div class="weekly-schedule-container">
            ${scheduleItems}
          </div>
          ${selectedDayDetails}
        </div>
      `;
    }

    // Build Quick Start
    const quickStartSection = `
      <div class="panel stack" style="align-items: center; justify-content: center; padding: 25px 15px; text-align: center;">
        <h2>Quick Start</h2>
        <p>Start a blank, freestyle workout and add exercises on the go.</p>
        <button class="primary-button" id="start-empty-workout-btn" style="width: 100%; max-width: 280px; margin-top: 10px;">
          Start Empty Workout
        </button>
      </div>
    `;

    // Custom Routines List
    const customRoutinesSection = `
      <section class="panel stack">
        <div class="panel-heading">
          <h2>My Custom Routines</h2>
          <button class="primary-button compact" id="create-routine-btn">
            <span class="material-symbols-outlined">add</span> Create
          </button>
        </div>
        ${customRoutines.length 
          ? `<div class="card-grid">
              ${customRoutines.map(r => `
                <article class="item-card stack">
                  <div>
                    <strong>${escapeHtml(r.name)}</strong>
                    <span>${r.exercisesStructured?.length || 0} exercises</span>
                  </div>
                  <div class="structured-exercise-list" style="margin: 10px 0;">
                    ${(r.exercisesStructured || []).map(ex => `
                      <div class="structured-exercise-item">
                        <strong>${escapeHtml(ex.name)}</strong>
                        <span>${ex.sets ? `${ex.sets} sets` : ""} ${ex.reps ? `/ ${ex.reps} reps` : ""}</span>
                      </div>
                    `).join("")}
                  </div>
                  <div class="card-footer" style="display:flex; justify-content: space-between; align-items:center;">
                    <button class="primary-button compact start-routine-btn" data-id="${r.id}">Start Workout</button>
                    <div style="display:flex; gap:8px;">
                      <button class="icon-button edit-routine-btn" data-id="${r.id}" title="Edit routine">
                        <span class="material-symbols-outlined">edit</span>
                      </button>
                      <button class="icon-button danger delete-routine-btn" data-id="${r.id}" title="Delete routine">
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                </article>
              `).join("")}
             </div>`
          : emptyState("No custom routines", "Create a personalized routine or add split workouts (PPL, Bro Split).")
        }
      </section>
    `;

    const categories = unique(basicTemplates.map((template) => template.category || "General"));
    const difficulties = unique(basicTemplates.map((template) => template.difficulty).filter(Boolean));

    // Basic Workouts (Gym Templates)
    const gymTemplatesSection = `
      <section class="panel stack">
        <div class="panel-heading">
          <h2>Basic Workouts</h2>
          <span>${basicTemplates.length} modules</span>
        </div>
        ${basicTemplates.length 
          ? `
            <div class="filter-bar">
              <label>Search
                <span class="search-field">
                  <span class="material-symbols-outlined">search</span>
                  <input type="search" data-basic-filter="search" placeholder="Name, goal, exercises" />
                </span>
              </label>
              <label>Category
                <select data-basic-filter="category">
                  <option value="">All categories</option>
                  ${categories.map((category) => `<option>${escapeHtml(category)}</option>`).join("")}
                </select>
              </label>
              <label>Difficulty
                <select data-basic-filter="difficulty">
                  <option value="">All levels</option>
                  ${difficulties.map((difficulty) => `<option>${escapeHtml(difficulty)}</option>`).join("")}
                </select>
              </label>
            </div>
            <div class="card-grid" data-basic-list>${basicTemplates.map(basicCard).join("")}</div>
          `
          : emptyState("No basic workouts yet", "Basic workout modules from your gym will appear here.")
        }
      </section>
    `;

    let trainerAssignedSection = "";
    if (todaySession) {
      trainerAssignedSection = `
        <div class="panel stack" style="padding:15px; background:linear-gradient(135deg, var(--bg-alt) 0%, rgba(22, 163, 74, 0.05) 100%); border-radius:var(--r-md); border:2px solid var(--accent); gap:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div>
              <span style="font-size:0.75rem; font-weight:700; color:var(--accent); text-transform:uppercase; letter-spacing:0.5px;">Today's Assigned Workout</span>
              <h3 style="margin:4px 0 0 0; font-size:1.2rem; color:var(--text);">Trainer's Custom Session</h3>
            </div>
            <button class="primary-button start-trainer-session-btn" data-id="${todaySession.id}">
              Follow & Record
            </button>
          </div>
          <div style="font-size:0.9rem; opacity:0.9; margin-top:5px; white-space:pre-line; border-top:1px solid var(--line); padding-top:8px;">
            <strong>Exercises:</strong>
            ${escapeHtml(todaySession.exercises)}
          </div>
          ${todaySession.notes ? `<div style="font-size:0.8rem; font-style:italic; opacity:0.85; margin-top:4px;">Notes: "${escapeHtml(todaySession.notes)}"</div>` : ""}
        </div>
      `;
    } else if (assignedTemplate) {
      trainerAssignedSection = `
        <div class="panel stack" style="padding:15px; background:linear-gradient(135deg, var(--bg-alt) 0%, rgba(22, 163, 74, 0.05) 100%); border-radius:var(--r-md); border:1px solid var(--accent); gap:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div>
              <span style="font-size:0.75rem; font-weight:700; color:var(--accent); text-transform:uppercase; letter-spacing:0.5px;">Assigned Workout Module</span>
              <h3 style="margin:4px 0 0 0; font-size:1.2rem; color:var(--text);">${escapeHtml(assignedTemplate.name)}</h3>
            </div>
            <button class="primary-button start-assigned-template-btn" data-id="${assignedTemplate.id}">
              Follow & Record
            </button>
          </div>
          <div style="margin-top:5px; border-top:1px solid var(--line); padding-top:8px;">
            ${renderTemplateExercises(assignedTemplate)}
          </div>
          ${assignedTemplate.notes ? `<div style="font-size:0.8rem; font-style:italic; opacity:0.85; margin-top:4px;">Notes: "${escapeHtml(assignedTemplate.notes)}"</div>` : ""}
        </div>
      `;
    } else {
      trainerAssignedSection = `
        <div class="panel stack" style="padding:15px; text-align:center; background:var(--bg-alt); border-radius:var(--r-md); border:1px solid var(--line); color:var(--text-muted); justify-content:center; align-items:center;">
          <div style="display:flex; align-items:center; gap:8px; justify-content:center;">
            <span class="material-symbols-outlined" style="font-size:22px; opacity:0.7; color:var(--accent);">assignment_late</span>
            <span style="font-size:0.85rem; font-weight:600;">No workout assigned by your trainer today.</span>
          </div>
        </div>
      `;
    }

    return `
      <div class="stack" style="gap: 15px; margin-bottom: 15px;">
        ${trainerAssignedSection}
      </div>
      <div class="work-grid">
        ${scheduleSection}
        ${quickStartSection}
      </div>
      ${customRoutinesSection}
      ${gymTemplatesSection}
    `;
  },

  // Renders the History tab (Workout Logs list)
  renderHistoryTab(context, myLogs) {
    if (!myLogs.length) {
      return emptyState("No workout logs", "Your completed workout history will appear here.");
    }

    return `
      <div class="stack" style="gap: 15px;">
        ${myLogs.map(log => {
          const exercises = log.exercises || [];
          return `
            <article class="panel item-card stack" style="border-left: 4px solid var(--accent);">
              <div class="panel-heading" style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <h3 style="margin: 0; font-size: 1.15rem;">${escapeHtml(log.routineName || "Workout")}</h3>
                  <small style="opacity: 0.8;">
                    ${dateLabel(log.date)} • ${log.durationMinutes || 0} mins
                    ${log.private ? '• <span class="badge private">Private</span>' : '• <span class="badge public">Public</span>'}
                  </small>
                </div>
                <div style="display:flex; gap: 8px;">
                  <button class="primary-button compact repeat-log-btn" data-log-id="${log.id}">
                    <span class="material-symbols-outlined" style="font-size:16px;">replay</span> Repeat
                  </button>
                  <button class="icon-button danger delete-log-btn" data-log-id="${log.id}" title="Delete log">
                    <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
                  </button>
                </div>
              </div>
              
              ${log.notes ? `<p style="font-style: italic; margin: 5px 0; font-size:0.9rem;">"${escapeHtml(log.notes)}"</p>` : ""}
              
              <div class="structured-exercise-list" style="margin-top: 10px;">
                ${exercises.map(ex => `
                  <div class="structured-exercise-item clickable-exercise-item" data-exercise-name="${escapeHtml(ex.name)}" style="cursor:pointer;" title="Click to view details">
                    <strong style="display:flex; align-items:center; gap: 4px;">
                      ${escapeHtml(ex.name)}
                      <span class="material-symbols-outlined" style="font-size:14px; opacity:0.6;">info</span>
                    </strong>
                    <div style="display:flex; flex-direction:column; gap:2px; margin-top:4px; padding-left:10px;">
                      ${(ex.sets || []).map((s, idx) => `
                        <span style="font-size: 0.85rem; opacity:0.9;">
                          Set ${idx + 1}: <strong>${s.weight} kg</strong> x ${s.reps} reps ${s.rpe ? `(RPE ${s.rpe})` : ""}
                        </span>
                      `).join("")}
                    </div>
                  </div>
                `).join("")}
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;
  },

  // Renders the Active Workout Logger Screen
  renderActiveLogger(context, activeWorkout) {
    const exercises = activeWorkout.exercises || [];
    const totalSets = exercises.reduce((sum, ex) => sum + (ex.sets || []).length, 0);
    const doneSets = exercises.reduce((sum, ex) => sum + (ex.sets || []).filter((set) => set.done).length, 0);
    const progressPct = totalSets ? Math.round((doneSets / totalSets) * 100) : 0;
    const nextSet = findNextSet(activeWorkout);
    const restLeft = restSecondsLeft(activeWorkout);
    const restLabel = restLeft ? formatClock(restLeft) : "Ready";
    
    // Exercise Search overlay modal
    let searchModal = "";
    if (this.exerciseSearchOpen) {
      const searchList = getExercisesList()
        .sort((a, b) => a.name.localeCompare(b.name));

      searchModal = `
        <div class="modal-overlay" style="display:flex; align-items:center; justify-content:center;">
          <div class="modal stack" style="width: min(500px, 95%); max-height:85vh; display:flex; flex-direction:column;">
            <div class="panel-heading" style="display:flex; justify-content:space-between; align-items:center;">
              <h2>Add Exercise</h2>
              <button class="icon-button" id="close-search-modal-btn"><span class="material-symbols-outlined">close</span></button>
            </div>
            
            <div style="padding:10px; display:flex; gap:10px; flex-direction:column;">
              <input type="search" id="exercise-search-input" placeholder="Search exercises..." autofocus style="width:100%;" />
              <button class="primary-button" id="open-custom-ex-btn" style="width:100%;">+ Create Custom Exercise</button>
            </div>

            <div style="flex:1; overflow-y:auto; padding:10px;" id="search-results-list">
              ${searchList.length === 0 ? `
                <div style="text-align:center; padding:30px; opacity:0.7;">
                  <p>Loading exercises library...</p>
                </div>
              ` : searchList.map(ex => {
                const thumb = exerciseImageUrl(ex);
                const meta = [exerciseCategory(ex), ex.target, ex.equipment].filter(Boolean).join(" · ");
                return `
                <div class="search-exercise-row select-exercise-row" data-name="${escapeHtml(ex.name)}">
                  ${thumb
                    ? `<img class="exercise-thumb" src="${thumb}" alt="" loading="lazy" decoding="async" />`
                    : `<span class="exercise-thumb exercise-thumb-empty"><span class="material-symbols-outlined">fitness_center</span></span>`}
                  <div class="search-exercise-copy">
                    <strong>${escapeHtml(ex.name)}</strong>
                    <div class="search-exercise-meta">${escapeHtml(meta || "Custom exercise")}</div>
                  </div>
                  <button class="icon-button exercise-info-btn" type="button" data-info-name="${escapeHtml(ex.name)}" title="View demo and instructions" aria-label="View demo for ${escapeHtml(ex.name)}">
                    <span class="material-symbols-outlined">info</span>
                  </button>
                  <span class="material-symbols-outlined" style="font-size:18px;">add_circle</span>
                </div>
              `;}).join("")}
            </div>
          </div>
        </div>
      `;
    }

    // Custom Exercise Form Overlay
    let customExModal = "";
    if (this.customExerciseOpen) {
      customExModal = `
        <div class="modal-overlay" style="display:flex; align-items:center; justify-content:center;">
          <form class="modal panel stack" id="custom-exercise-form" style="width: min(400px, 95%);">
            <div class="panel-heading" style="display:flex; justify-content:space-between; align-items:center;">
              <h2>Create Custom Exercise</h2>
              <button class="icon-button" type="button" id="close-custom-ex-btn"><span class="material-symbols-outlined">close</span></button>
            </div>
            <div class="form-grid">
              <label>Name<input name="name" required placeholder="e.g. Incline DB Bench Press" maxlength="80" /></label>
              <label>Category
                <select name="category">
                  <option>Strength</option>
                  <option>Cardio</option>
                  <option>Stretching</option>
                  <option>Bodyweight</option>
                </select>
              </label>
              <label>Muscle Group<input name="bodyPart" placeholder="e.g. Chest" maxlength="40" /></label>
              <label>Equipment<input name="equipment" placeholder="e.g. Dumbbells" maxlength="40" /></label>
            </div>
            <button class="primary-button" type="submit">Create & Add</button>
          </form>
        </div>
      `;
    }

    // Render active workout logger
    return `
      <div class="active-workout-container stack" style="gap: 15px;">
        <div class="active-workout-header" style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--line); flex-wrap: wrap; gap: 10px;">
          <div>
            <h2 style="margin:0;">Record: <span id="active-routine-name">${escapeHtml(activeWorkout.routineName || "Workout")}</span></h2>
            <div class="active-workout-subline">
              <span id="active-timer">00:00:00</span>
              <span>${doneSets}/${totalSets || 0} sets</span>
              ${nextSet ? `<span>Next: ${escapeHtml(nextSet.exercise.name)} set ${nextSet.setIdx + 1}</span>` : `<span>All sets complete</span>`}
            </div>
          </div>
          <div style="display:flex; gap:10px;">
            <button class="primary-button compact" id="finish-workout-btn" style="background: #16a34a; color: white;">Save Workout</button>
            <button class="ghost-button danger compact" id="cancel-workout-btn">Discard</button>
          </div>
        </div>
        ${(() => {
          const peers = trainingNow(context, context?.myMember?.id);
          return peers.length ? `
            <div class="training-now" role="status">
              <span class="material-symbols-outlined">groups</span>
              <span><strong>${peers.length}</strong> other${peers.length === 1 ? "" : "s"} training now:
                ${escapeHtml(peers.slice(0, 3).map((p) => p.memberName).join(", "))}${peers.length > 3 ? ` +${peers.length - 3} more` : ""}
              </span>
            </div>
          ` : "";
        })()}
        <div class="workout-runner-strip">
          <div class="workout-progress-shell" aria-label="Workout progress">
            <span style="width:${progressPct}%"></span>
          </div>
          <div class="rest-timer-chip ${restLeft ? "running" : ""}">
            <span class="material-symbols-outlined">timer</span>
            <strong data-rest-countdown>${restLabel}</strong>
            <button class="ghost-button compact" type="button" id="skip-rest-btn" ${restLeft ? "" : "disabled"}>Skip</button>
            <button class="ghost-button compact" type="button" id="start-rest-btn">Rest 90s</button>
          </div>
        </div>

        <div class="panel stack" style="padding:15px; gap:15px;">
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:15px;">
            <label style="font-weight:600; display:flex; flex-direction:column; gap:6px;">Workout Date
              <input type="date" id="active-workout-date" value="${activeWorkout.date || today()}" style="width:100%; padding:6px; border:1px solid var(--line); border-radius:var(--r-sm); background:var(--bg-alt); color:var(--text);" />
            </label>
            <label style="font-weight:600; display:flex; flex-direction:column; gap:6px;">Duration (minutes)
              <input type="number" id="active-workout-duration" min="1" placeholder="e.g. 60" value="${activeWorkout.durationMinutes || "60"}" style="width:100%; padding:6px; border:1px solid var(--line); border-radius:var(--r-sm); background:var(--bg-alt); color:var(--text);" />
            </label>
          </div>
          <div class="form-grid" style="margin-top:5px;">
            <label class="wide" style="font-weight:600; display:flex; flex-direction:column; gap:6px;">Workout Notes
              <textarea id="active-workout-notes" rows="2" placeholder="Session notes (optional)..." style="width:100%; padding:8px; border:1px solid var(--line); border-radius:var(--r-sm); background:var(--bg-alt); color:var(--text);">${escapeHtml(activeWorkout.notes || "")}</textarea>
            </label>
            <div class="wide" style="display:flex; align-items:center; gap:8px; margin-top:5px;">
              <input type="checkbox" id="active-workout-public" ${activeWorkout.private ? "" : "checked"} style="cursor:pointer; width:18px; height:18px;" />
              <label for="active-workout-public" style="cursor:pointer; font-weight:500;">Share to Gym Community Feed</label>
            </div>
          </div>
        </div>

        <div class="active-exercises-list stack" style="gap: 15px;">
          ${exercises.map((ex, exIdx) => {
            const sets = ex.sets || [];
            // "reps" (default), "timed" (seconds held) or "cardio" (distance + time).
            const mode = ex.mode || (isTimedExercise(ex.name) ? "timed" : "reps");
            // Exercises sharing a supersetId are performed back to back.
            const supersetId = ex.supersetId || "";
            const supersetPeers = supersetId
              ? exercises.filter((other) => other.supersetId === supersetId).length
              : 0;
            return `
              <article class="panel exercise-card stack ${supersetPeers > 1 ? "in-superset" : ""}" data-exercise-index="${exIdx}" data-superset-id="${escapeHtml(supersetId)}" style="padding:15px; gap:10px;">
                <div class="panel-heading exercise-card-heading">
                  ${(() => {
                    const libEx = findExerciseByName(ex.name);
                    const thumb = exerciseImageUrl(libEx);
                    return thumb
                      ? `<img class="exercise-thumb" src="${thumb}" alt="" loading="lazy" decoding="async" />`
                      : `<span class="exercise-thumb exercise-thumb-empty"><span class="material-symbols-outlined">fitness_center</span></span>`;
                  })()}
                  <h3 style="margin:0; flex:1;">
                    ${escapeHtml(ex.name)}
                    ${supersetPeers > 1 ? `<span class="superset-badge" title="Performed back to back with ${supersetPeers - 1} other exercise(s)">Superset</span>` : ""}
                  </h3>
                  <button class="icon-button exercise-info-btn" type="button" data-info-name="${escapeHtml(ex.name)}" title="View demo and instructions" aria-label="View demo for ${escapeHtml(ex.name)}">
                    <span class="material-symbols-outlined">info</span>
                  </button>
                  <button class="ghost-button danger compact remove-ex-row-btn" data-ex-idx="${exIdx}" title="Remove exercise">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
                ${ex.progressionNote ? `
                  <div class="progression-note">
                    <span class="material-symbols-outlined">trending_up</span>
                    <span>${escapeHtml(ex.progressionNote)}</span>
                  </div>
                ` : ""}
                <div class="progression-picker">
                  <label for="scheme-${exIdx}">Progression</label>
                  <select id="scheme-${exIdx}" class="exercise-scheme-select" data-ex-idx="${exIdx}">
                    <option value="">Automatic</option>
                    ${PROGRESSION_SCHEMES.map((scheme) => `
                      <option value="${scheme.key}" ${ex.scheme === scheme.key ? "selected" : ""}>${escapeHtml(scheme.label)}</option>
                    `).join("")}
                  </select>
                  <label for="mode-${exIdx}">Mode</label>
                  <select id="mode-${exIdx}" class="exercise-mode-select" data-ex-idx="${exIdx}">
                    <option value="reps" ${mode === "reps" ? "selected" : ""}>Reps &amp; weight</option>
                    <option value="timed" ${mode === "timed" ? "selected" : ""}>Timed (seconds)</option>
                    <option value="cardio" ${mode === "cardio" ? "selected" : ""}>Cardio (km &amp; seconds)</option>
                  </select>
                  <button class="ghost-button compact superset-toggle-btn" type="button" data-ex-idx="${exIdx}" title="${supersetId ? "Remove from superset" : "Superset with the exercise below"}">
                    <span class="material-symbols-outlined">${supersetId ? "link_off" : "link"}</span>
                    ${supersetId ? "Unlink" : "Superset"}
                  </button>
                </div>
                
                 <div style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; margin-top: 5px;">
                   <div class="data-table" style="min-width: 420px; gap: 5px;">
                     <div class="logger-table-head" style="grid-template-columns: 40px 1.5fr 1fr 1fr 1fr 50px; text-align: center; font-size:0.8rem; font-weight:600; border-bottom:1px solid var(--line); padding-bottom:5px;">
                       <span>Set</span>
                       <span>Prev (Best)</span>
                       <span>${mode === "cardio" ? "Km" : "Kg"}</span>
                       <span>${mode === "reps" ? "Reps" : "Secs"}</span>
                       <span>RPE</span>
                       <span>Done</span>
                     </div>
                     <div class="active-sets-list stack" style="gap: 5px; margin-top:5px;">
                       ${sets.map((set, setIdx) => {
                         const isNext = nextSet && nextSet.exIdx === exIdx && nextSet.setIdx === setIdx;
                         return `
                           <div class="logger-set-row active-set-row ${set.done ? "set-done" : ""} ${isNext ? "set-next" : ""}" data-set-idx="${setIdx}" style="grid-template-columns: 40px 1.5fr 1fr 1fr 1fr 50px; align-items:center; text-align:center; padding: 4px 0;">
                             <span style="font-weight:700; opacity:0.85;">${setIdx + 1}</span>
                             <span style="font-size:0.75rem; opacity:0.75;" class="prev-best-label">—</span>
                             <input type="number" step="${mode === "cardio" ? "0.01" : "0.25"}" placeholder="0" class="set-weight-input" value="${set.weight || ""}" style="width:100%; text-align:center; padding:4px;" aria-label="${mode === "cardio" ? "Distance in km" : "Weight in kg"}" />
                             <input type="number" placeholder="${mode === "reps" ? "0" : "sec"}" class="set-reps-input" value="${set.reps || ""}" style="width:100%; text-align:center; padding:4px;" aria-label="${mode === "reps" ? "Reps" : "Seconds"}" />
                             <select class="set-rpe-select" style="width:100%; text-align:center; padding:4px;">
                               <option value="">-</option>
                               ${[10, 9.5, 9, 8.5, 8, 7.5, 7, 6, 5, 4, 3, 2, 1].map(v => `
                                 <option value="${v}" ${Number(set.rpe) === v ? "selected" : ""} title="${Math.round((10 - v) * 10) / 10} reps in reserve">${v}</option>
                               `).join("")}
                             </select>
                             <div style="display:flex; justify-content:center;">
                               <input type="checkbox" class="set-done-chk" ${set.done ? "checked" : ""} style="width:18px; height:18px; cursor:pointer;" />
                             </div>
                           </div>
                         `;
                       }).join("")}
                     </div>
                   </div>
                 </div>
                
                <div style="display:flex; gap:10px; margin-top:10px;">
                  <button class="ghost-button add-set-row-btn" data-ex-idx="${exIdx}" style="flex:1;">+ Add Set</button>
                  <button class="ghost-button danger remove-set-row-btn" data-ex-idx="${exIdx}" style="flex:1;">- Remove Set</button>
                </div>
              </article>
            `;
          }).join("")}
        </div>

        <div style="display:flex; gap:15px; justify-content:center; margin-top:15px;">
          <button class="primary-button" id="add-ex-to-workout-btn" style="width:100%; max-width:320px;">
            <span class="material-symbols-outlined">add</span> Add Exercise
          </button>
        </div>
      </div>
      ${searchModal}
      ${customExModal}
    `;
  },

  // Renders the Routine Creator & Editor Builder
  renderRoutineBuilder(context) {
    const routine = this.editingRoutine;
    const exercisesStructured = routine.exercisesStructured || [];
    
    return `
      ${pageHeader(routine.id ? "Edit Routine" : "Create Routine")}
      <form class="panel stack" id="routine-builder-form" style="gap: 15px;">
        <div class="form-grid">
          <label class="wide">Routine Name
            <input name="name" value="${escapeHtml(routine.name || "")}" required placeholder="e.g. Push Split" maxlength="100" />
          </label>
        </div>

        <div class="wide structured-builder">
          <div class="panel-heading compact-heading" style="display:flex; justify-content:space-between; align-items:center;">
            <h2>Exercises</h2>
            <button class="ghost-button" type="button" id="builder-add-ex-btn">Add Exercise</button>
          </div>
          
          <div class="exercise-rows stack" id="builder-exercise-rows" style="gap: 12px; margin-top:10px;">
            ${exercisesStructured.map((ex, idx) => `
              <div class="exercise-row builder-exercise-row" data-idx="${idx}" style="display:flex; flex-direction:column; gap:8px; padding:12px; border:1px solid var(--line); border-radius:var(--r-md); background:var(--bg-alt);">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <strong style="font-size:1.05rem;">${escapeHtml(ex.name)}</strong>
                  <button class="ghost-button danger compact builder-remove-ex-btn" data-idx="${idx}" type="button">
                    <span class="material-symbols-outlined">delete</span> Remove
                  </button>
                </div>
                <div class="exercise-row-metrics">
                  <label>Sets<input class="builder-sets" type="number" min="1" placeholder="Sets" value="${ex.sets || ""}" /></label>
                  <label>Reps<input class="builder-reps" placeholder="Reps" value="${ex.reps || ""}" /></label>
                  <label>Weight (kg)<input class="builder-weight" placeholder="Weight" value="${ex.weight || ""}" /></label>
                  <label>Rest (sec)<input class="builder-rest" placeholder="Rest" value="${ex.rest || ""}" /></label>
                </div>
                <input class="builder-notes" placeholder="Execution notes or form tips..." value="${escapeHtml(ex.notes || "")}" maxlength="120" style="width:100%;" />
              </div>
            `).join("")}
          </div>
        </div>

        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:10px;">
          <button class="primary-button" type="submit">Save Routine</button>
          <button class="ghost-button" type="button" id="builder-cancel-btn">Cancel</button>
        </div>
      </form>
    `;
  },

  bind(root, context) {
    const activeWorkout = getActiveWorkout();

    if (activeWorkout) {
      this.bindActiveLogger(root, context, activeWorkout);
      return;
    }

    if (this.editingRoutine) {
      this.bindRoutineBuilder(root, context);
      return;
    }

    // bindWorkoutsTab also owns the tab-switch buttons, so it runs for every tab.
    this.bindWorkoutsTab(root, context);
    if (this.activeTab === "import") this.bindImportTab(root, context);
  },

  bindWorkoutsTab(root, context) {
    // Bind Tab Switching
    root.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.activeTab = btn.dataset.tab;
        context.refreshView();
      });
    });

    // Schedule Buttons
    root.querySelector("#edit-schedule-btn")?.addEventListener("click", () => {
      this.editingSchedule = true;
      context.refreshView();
    });

    root.querySelector("#cancel-schedule-btn")?.addEventListener("click", () => {
      this.editingSchedule = false;
      context.refreshView();
    });

    root.querySelectorAll(".schedule-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        this.selectedDay = pill.dataset.day;
        context.refreshView();
      });
    });

    root.querySelector("#schedule-rest-action-btn")?.addEventListener("click", () => {
      this.editingSchedule = true;
      context.refreshView();
    });

    // Save schedule form
    const schedForm = root.querySelector("#schedule-form");
    schedForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = schedForm.querySelector("button[type='submit']");
      await withButtonLoading(submitBtn, async () => {
        try {
          const me = context.myMember;
          const formData = new FormData(schedForm);
          const scheduleObj = {};
          formData.forEach((val, key) => {
            scheduleObj[key] = val;
          });

          const mySchedules = (context.data.workout_schedules || []).filter(s => s.memberId === me.id);
          const weeklyScheduleDoc = mySchedules.find(s => s.type === "schedule") || { type: "schedule", memberId: me.id, gymId: me.gymId };
          weeklyScheduleDoc.schedule = scheduleObj;
          weeklyScheduleDoc.gymId = me.gymId;

          const saved = await context.services.data.save(collections.workoutSchedules, weeklyScheduleDoc);
          context.toast("Workout schedule saved successfully.");
          context.applyChange(collections.workoutSchedules, saved);
          this.editingSchedule = false;
          await context.refreshView();
        } catch (err) {
          console.error("Failed to save weekly schedule:", err);
          context.toast("Error: Failed to save schedule.");
        }
      }, "Saving...");
    });

    // Start workout from schedule day
    root.querySelectorAll(".start-sched-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const type = btn.dataset.type;
        if (type === "template") {
          const t = (context.data.workout_templates || []).find(bt => bt.id === id);
          if (t) startWorkoutFromTemplate(t, context);
        } else {
          const r = (context.data.workout_schedules || []).find(cr => cr.id === id);
          if (r) startWorkoutFromRoutine(r, context);
        }
        context.refreshView();
      });
    });

    // Start Empty Workout
    root.querySelector("#start-empty-workout-btn")?.addEventListener("click", () => {
      startEmptyWorkout();
      context.refreshView();
    });

    // Create custom routine
    root.querySelector("#create-routine-btn")?.addEventListener("click", () => {
      this.editingRoutine = { name: "", exercisesStructured: [] };
      context.refreshView();
    });

    // Edit Routine
    root.querySelectorAll(".edit-routine-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const r = (context.data.workout_schedules || []).find(cr => cr.id === btn.dataset.id);
        if (r) {
          this.editingRoutine = { ...r };
          context.refreshView();
        }
      });
    });

    // Delete Routine
    root.querySelectorAll(".delete-routine-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to delete this custom routine?")) return;
        await context.services.data.remove(collections.workoutSchedules, btn.dataset.id);
        context.toast("Routine deleted.");
        context.applyRemoval(collections.workoutSchedules, btn.dataset.id);
        await context.refreshView();
      });
    });

    // Start Workout from Routine
    root.querySelectorAll(".start-routine-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const r = (context.data.workout_schedules || []).find(cr => cr.id === btn.dataset.id);
        if (r) {
          startWorkoutFromRoutine(r, context);
          context.refreshView();
        }
      });
    });

    // Start Workout from Gym Template
    root.querySelectorAll(".start-template-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const t = (context.data.workout_templates || []).find(bt => bt.id === btn.dataset.id);
        if (t) {
          startWorkoutFromTemplate(t, context);
          context.refreshView();
        }
      });
    });

    // Start Workout from Trainer Today's Session
    root.querySelectorAll(".start-trainer-session-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const session = (context.data.workout_sessions || []).find(s => s.id === btn.dataset.id);
        if (session) {
          startWorkoutFromTrainerSession(session, context);
          context.refreshView();
        }
      });
    });

    // Start Workout from Trainer Assigned Template
    root.querySelectorAll(".start-assigned-template-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const t = (context.data.workout_templates || []).find(bt => bt.id === btn.dataset.id);
        if (t) {
          startWorkoutFromTemplate(t, context);
          context.refreshView();
        }
      });
    });

    // Repeat Log Workout Button
    root.querySelectorAll(".repeat-log-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const log = (context.data.workout_logs || []).find(l => l.id === btn.dataset.logId);
        if (log) {
          repeatWorkout(log);
          context.refreshView();
        }
      });
    });

    // Delete Log Button
    root.querySelectorAll(".delete-log-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to delete this completed log?")) return;
        await context.services.data.remove(collections.workoutLogs, btn.dataset.logId);
        context.toast("Workout log deleted.");
        context.applyRemoval(collections.workoutLogs, btn.dataset.logId);
        await context.refreshView();
      });
    });

    // Click to view exercise details in history
    root.querySelectorAll(".clickable-exercise-item").forEach(item => {
      item.addEventListener("click", async () => {
        const name = item.dataset.exerciseName;
        if (!name) return;
        const list = await getExercises();
        const matched = list.find((ex) => ex.name.toLowerCase() === name.toLowerCase());
        if (matched) {
          showExerciseModal(matched);
        }
      });
    });

    bindBasicFilters(root);
  },

  // Active workout bindings
  bindActiveLogger(root, context, activeWorkout) {
    if (this.exerciseSearchOpen && getExercisesList().length === 0) {
      getExercises().then(() => {
        context.refreshView();
      }).catch(() => {});
    }
    this.startActiveTimer(root, activeWorkout.startTime);
    this.startRestCountdown(root, activeWorkout);

    // Hold the screen awake for the duration of the session, and re-acquire it
    // when the member switches back to the tab (the browser drops it on hide).
    this.acquireWakeLock();
    this.startPresence(context, activeWorkout);
    if (!this.onVisibilityChange) {
      this.onVisibilityChange = () => {
        if (document.visibilityState === "visible" && getActiveWorkout()) this.acquireWakeLock();
      };
      document.addEventListener("visibilitychange", this.onVisibilityChange);
    }

    // Save notes/public status changes locally on edit
    const notesInput = root.querySelector("#active-workout-notes");
    notesInput?.addEventListener("input", () => {
      activeWorkout.notes = notesInput.value;
      saveActiveWorkout(activeWorkout);
    });

    const dateInput = root.querySelector("#active-workout-date");
    dateInput?.addEventListener("change", () => {
      activeWorkout.date = dateInput.value;
      saveActiveWorkout(activeWorkout);
    });

    const durationInput = root.querySelector("#active-workout-duration");
    durationInput?.addEventListener("input", () => {
      activeWorkout.durationMinutes = Number(durationInput.value) || 0;
      saveActiveWorkout(activeWorkout);
    });

    const publicInput = root.querySelector("#active-workout-public");
    publicInput?.addEventListener("change", () => {
      activeWorkout.private = !publicInput.checked;
      saveActiveWorkout(activeWorkout);
    });

    // Done checkbox toggles
    root.querySelectorAll(".set-done-chk").forEach(chk => {
      chk.addEventListener("change", (e) => {
        const row = chk.closest(".active-set-row");
        const card = chk.closest(".exercise-card");
        const exIdx = Number(card.dataset.exerciseIndex);
        const setIdx = Number(row.dataset.setIdx);
        
        activeWorkout.exercises[exIdx].sets[setIdx].done = chk.checked;
        if (chk.checked) startRest(activeWorkout, 90);
        row.classList.toggle("set-done", chk.checked);
        saveActiveWorkout(activeWorkout);
        // Patch the runner chrome in place — a full refreshView() here would
        // re-read the backend and drop focus on every single set logged.
        syncRunnerUi(root, activeWorkout);
      });
    });

    // Mode picker: reps / timed / cardio. Only relabels the columns and inputs —
    // the stored numbers are untouched, so switching back loses nothing.
    root.querySelectorAll(".exercise-mode-select").forEach((select) => {
      select.addEventListener("change", () => {
        const exIdx = Number(select.dataset.exIdx);
        if (!activeWorkout.exercises[exIdx]) return;
        activeWorkout.exercises[exIdx].mode = select.value;
        saveActiveWorkout(activeWorkout);
        context.refreshView();
      });
    });

    // Superset toggle: links an exercise with the one below it so they read and
    // are performed as one block. Toggling again unlinks the whole group.
    root.querySelectorAll(".superset-toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const exIdx = Number(btn.dataset.exIdx);
        const exercises = activeWorkout.exercises || [];
        const current = exercises[exIdx];
        if (!current) return;

        if (current.supersetId) {
          // Unlink every exercise sharing this group.
          const groupId = current.supersetId;
          exercises.forEach((ex) => {
            if (ex.supersetId === groupId) delete ex.supersetId;
          });
        } else {
          const partner = exercises[exIdx + 1];
          if (!partner) {
            context.toast("Add another exercise below to superset with.");
            return;
          }
          // Join the partner's existing group if it has one, else start a new one.
          const groupId = partner.supersetId || `ss-${exIdx}-${exercises.length}`;
          current.supersetId = groupId;
          partner.supersetId = groupId;
        }
        saveActiveWorkout(activeWorkout);
        context.refreshView();
      });
    });

    // Changing the scheme re-plans just that exercise against the same history.
    root.querySelectorAll(".exercise-scheme-select").forEach((select) => {
      select.addEventListener("change", () => {
        const exIdx = Number(select.dataset.exIdx);
        const current = activeWorkout.exercises[exIdx];
        if (!current) return;
        const scheme = select.value || null;
        // Re-plan from a clean copy so a previous suggestion is not compounded.
        const replanned = planExercise(
          { name: current.name, scheme, sets: current.sets.map((set) => ({ ...set, weight: "", reps: set.reps })) },
          context?.data?.workout_logs || [],
          { memberId: context?.myMember?.id, scheme, config: progressionConfigFor(context) }
        );
        activeWorkout.exercises[exIdx] = {
          ...current,
          scheme: scheme || undefined,
          progressionNote: replanned.progressionNote,
          // Keep any sets the member already ticked; only reseed untouched ones.
          sets: current.sets.map((set, i) => (set.done ? set : { ...set, ...replanned.sets[i], done: false }))
        };
        saveActiveWorkout(activeWorkout);
        context.refreshView();
      });
    });

    root.querySelector("#start-rest-btn")?.addEventListener("click", () => {
      startRest(activeWorkout, 90);
      saveActiveWorkout(activeWorkout);
      syncRunnerUi(root, activeWorkout);
    });

    root.querySelector("#skip-rest-btn")?.addEventListener("click", () => {
      clearRest(activeWorkout);
      saveActiveWorkout(activeWorkout);
      syncRunnerUi(root, activeWorkout);
    });

    // Input changes for sets weights/reps/rpe
    root.querySelectorAll(".active-set-row").forEach(row => {
      const card = row.closest(".exercise-card");
      const exIdx = Number(card.dataset.exerciseIndex);
      const setIdx = Number(row.dataset.setIdx);

      const weightEl = row.querySelector(".set-weight-input");
      const repsEl = row.querySelector(".set-reps-input");
      const rpeEl = row.querySelector(".set-rpe-select");

      const updateValues = () => {
        activeWorkout.exercises[exIdx].sets[setIdx].weight = weightEl.value;
        activeWorkout.exercises[exIdx].sets[setIdx].reps = repsEl.value;
        activeWorkout.exercises[exIdx].sets[setIdx].rpe = rpeEl.value;
        saveActiveWorkout(activeWorkout);
      };

      weightEl.addEventListener("input", updateValues);
      repsEl.addEventListener("input", updateValues);
      rpeEl.addEventListener("change", updateValues);
    });

    // Display previous best/last sets in logger if available
    const myLogs = (context.data.workout_logs || []).filter(l => l.memberId === context.myMember.id);
    root.querySelectorAll(".exercise-card").forEach(card => {
      const exIdx = Number(card.dataset.exerciseIndex);
      const ex = activeWorkout.exercises[exIdx];
      
      const previousLogs = myLogs
        .filter(log => (log.exercises || []).some(pe => pe.name.toLowerCase() === ex.name.toLowerCase()))
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
      if (previousLogs.length) {
        const latest = previousLogs[0].exercises.find(pe => pe.name.toLowerCase() === ex.name.toLowerCase());
        const bestSetDesc = bestSetForExercise(previousLogs, ex.name);
        
        card.querySelectorAll(".prev-best-label").forEach((lbl) => {
          const row = lbl.closest(".active-set-row");
          const setIdx = Number(row?.dataset.setIdx || 0);
          const matchingSet = latest?.sets?.[setIdx];
          lbl.textContent = matchingSet
            ? `${matchingSet.weight || 0} kg x ${matchingSet.reps || 0}`
            : bestSetDesc;
          lbl.title = `Best: ${bestSetDesc}`;
        });
      }
    });

    // Add Set
    root.querySelectorAll(".add-set-row-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const exIdx = Number(btn.dataset.exIdx);
        activeWorkout.exercises[exIdx].sets.push({ weight: "", reps: "", rpe: "", done: false });
        saveActiveWorkout(activeWorkout);
        context.refreshView();
      });
    });

    // Remove Set
    root.querySelectorAll(".remove-set-row-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const exIdx = Number(btn.dataset.exIdx);
        if (activeWorkout.exercises[exIdx].sets.length > 1) {
          activeWorkout.exercises[exIdx].sets.pop();
          saveActiveWorkout(activeWorkout);
          context.refreshView();
        }
      });
    });

    // Remove Entire Exercise Row
    root.querySelectorAll(".remove-ex-row-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const exIdx = Number(btn.dataset.exIdx);
        activeWorkout.exercises.splice(exIdx, 1);
        saveActiveWorkout(activeWorkout);
        context.refreshView();
      });
    });

    // Cancel Workout
    root.querySelector("#cancel-workout-btn")?.addEventListener("click", () => {
      if (!confirm("Are you sure you want to discard this workout?")) return;
      clearActiveWorkout();
      this.stopPresence(context);
      this.releaseWakeLock();
      context.toast("Workout discarded.");
      context.refreshView();
    });

    // Finish Workout
    root.querySelector("#finish-workout-btn")?.addEventListener("click", async (e) => {
      const btn = e.target;
      
      // Filter out empty exercises or exercises with 0 sets
      const finalEx = activeWorkout.exercises.filter(ex => ex.sets && ex.sets.length > 0);
      if (!finalEx.length) {
        context.toast("Please add at least one exercise.");
        return;
      }

      await withButtonLoading(btn, async () => {
        const payload = {
          memberId: context.myMember.id,
          gymId: context.myMember.gymId,
          date: activeWorkout.date || today(),
          routineName: activeWorkout.routineName || "Workout",
          durationMinutes: Number(activeWorkout.durationMinutes) || 60,
          notes: activeWorkout.notes || "",
          private: activeWorkout.private || false,
          exercises: finalEx.map(ex => ({
            name: ex.name,
            // Preserve how the exercise was performed so history and analytics
            // can tell a timed hold from a rep-based set.
            ...(ex.mode && ex.mode !== "reps" ? { mode: ex.mode } : {}),
            ...(ex.supersetId ? { supersetId: ex.supersetId } : {}),
            ...(ex.scheme ? { scheme: ex.scheme } : {}),
            sets: ex.sets.map(s => ({
              weight: s.weight ? Number(s.weight) : 0,
              reps: s.reps ? Number(s.reps) : 0,
              rpe: s.rpe ? Number(s.rpe) : ""
            }))
          }))
        };

        const saved = await context.services.data.save(collections.workoutLogs, payload);
        clearActiveWorkout();
        this.stopPresence(context);
        this.releaseWakeLock();
        context.applyChange(collections.workoutLogs, saved);
        await awardPointsAndBadges(context, "workout", { workout: payload });
        this.activeTab = "history";
        // Local state update via applyChange is already handled; re-render view without data re-fetch
      }, "Saving...");
    });

    // Trigger Search Modal overlays
    root.querySelector("#add-ex-to-workout-btn")?.addEventListener("click", () => {
      this.exerciseSearchOpen = true;
      context.refreshView();
    });

    const closeSearchBtn = root.querySelector("#close-search-modal-btn");
    closeSearchBtn?.addEventListener("click", () => {
      this.exerciseSearchOpen = false;
      context.refreshView();
    });

    // Search input typing logic
    const searchInput = root.querySelector("#exercise-search-input");
    searchInput?.addEventListener("input", () => {
      const term = searchInput.value.trim().toLowerCase();
      root.querySelectorAll(".select-exercise-row").forEach(row => {
        const name = row.dataset.name.toLowerCase();
        row.style.display = name.includes(term) ? "flex" : "none";
      });
    });

    // Demo/instructions button — must not bubble, or the row would also add the exercise
    root.querySelectorAll(".exercise-info-btn").forEach(btn => {
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        const match = findExerciseByName(btn.dataset.infoName);
        if (match) showExerciseModal(match);
      });
    });

    // Select exercise row click
    root.querySelectorAll(".select-exercise-row").forEach(row => {
      row.addEventListener("click", () => {
        const name = row.dataset.name;
        // Seed from the member's own history so an ad-hoc addition gets the
        // same last-session values and target as a templated exercise.
        activeWorkout.exercises.push(applyProgression({
          name,
          sets: [{ weight: "", reps: "", rpe: "", done: false }]
        }, context));
        saveActiveWorkout(activeWorkout);
        this.exerciseSearchOpen = false;
        context.refreshView();
      });
    });

    // Custom exercise trigger
    root.querySelector("#open-custom-ex-btn")?.addEventListener("click", () => {
      this.customExerciseOpen = true;
      context.refreshView();
    });

    root.querySelector("#close-custom-ex-btn")?.addEventListener("click", () => {
      this.customExerciseOpen = false;
      context.refreshView();
    });

    // Submit custom exercise form
    const customExForm = root.querySelector("#custom-exercise-form");
    customExForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const me = context.myMember;
      const data = new FormData(customExForm);
      const payload = {
        name: data.get("name").trim(),
        category: data.get("category"),
        bodyPart: data.get("bodyPart").trim() || "General",
        equipment: data.get("equipment").trim() || "None",
        createdByUid: context.profile.uid,
        gymId: context.myMember.gymId,
        custom: true
      };

      // Check if it already exists in built-in list
      const existsBuiltin = getExercisesList().some(ex => ex.name.toLowerCase() === payload.name.toLowerCase());
      if (existsBuiltin) {
        context.toast("Exercise already exists in library.");
        return;
      }

      await context.services.data.save(collections.exerciseLibrary, payload);
      context.toast("Custom exercise created.");
      
      // Automatically add it to the active workout session
      activeWorkout.exercises.push({
        name: payload.name,
        sets: [{ weight: "", reps: "", rpe: "", done: false }]
      });
      saveActiveWorkout(activeWorkout);

      this.customExerciseOpen = false;
      this.exerciseSearchOpen = false;
      
      // Refresh context data to reload lists next time
      await context.refreshView();
    });
  },

  // Custom routine builder bindings
  bindRoutineBuilder(root, context) {
    const routine = this.editingRoutine;

    // Save Routine
    const builderForm = root.querySelector("#routine-builder-form");
    builderForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = builderForm.querySelector("[name='name']").value.trim();
      
      // Collect exercises from builder rows
      const exercisesStructured = [];
      builderForm.querySelectorAll(".builder-exercise-row").forEach(row => {
        const idx = Number(row.dataset.idx);
        exercisesStructured.push({
          name: routine.exercisesStructured[idx].name,
          sets: row.querySelector(".builder-sets").value || "",
          reps: row.querySelector(".builder-reps").value || "",
          weight: row.querySelector(".builder-weight").value || "",
          rest: row.querySelector(".builder-rest").value || "",
          notes: row.querySelector(".builder-notes").value || ""
        });
      });

      if (!exercisesStructured.length) {
        context.toast("Please add at least one exercise to the routine.");
        return;
      }

      const payload = {
        ...routine,
        name,
        type: "routine",
        memberId: context.myMember.id,
        gymId: context.myMember.gymId,
        exercisesStructured
      };

      const saved = await context.services.data.save(collections.workoutSchedules, payload);
      context.toast("Custom routine saved!");
      context.applyChange(collections.workoutSchedules, saved);
      this.editingRoutine = null;
      await context.refreshView();
    });

    // Builder Cancel
    root.querySelector("#builder-cancel-btn")?.addEventListener("click", () => {
      this.editingRoutine = null;
      context.refreshView();
    });

    // Add Exercise to builder
    root.querySelector("#builder-add-ex-btn")?.addEventListener("click", () => {
      // Prompt selection (for simplicity, use prompt list or similar inline modal)
      // Since it's a routine creation, let's open the native select exercise list or ask user
      this.exerciseSearchOpen = true;
      
      // Let's create an inline search overlay just for builder
      this.bindSearchModalForBuilder(root, context);
    });

    // Remove exercise from builder list
    root.querySelectorAll(".builder-remove-ex-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.idx);
        routine.exercisesStructured.splice(idx, 1);
        context.refreshView();
      });
    });
  },

  // Search modal bindings specifically when building routines
  bindSearchModalForBuilder(root, context) {
    context.toast("Select an exercise from the library.");
    this.exerciseSearchOpen = false; // reset
    
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    
    overlay.innerHTML = `
      <div class="modal stack" style="width: min(450px, 95%); max-height:80vh;">
        <div class="panel-heading" style="display:flex; justify-content:space-between; align-items:center;">
          <h2>Select Exercise</h2>
          <button class="icon-button close-builder-prompt-btn"><span class="material-symbols-outlined">close</span></button>
        </div>
        <div style="padding:10px;">
          <input type="search" id="builder-ex-search-input" placeholder="Search exercises..." style="width:100%;" />
        </div>
        <div style="flex:1; overflow-y:auto; padding:10px;" id="builder-results-list">
          <p style="text-align:center; padding:20px; opacity:0.7;">Loading exercises...</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    const resultsList = overlay.querySelector("#builder-results-list");
    const inp = overlay.querySelector("#builder-ex-search-input");
    inp.focus();

    const bindListEvents = (list) => {
      resultsList.innerHTML = list.map(ex => `
        <div class="select-ex-row" data-name="${escapeHtml(ex.name)}" style="padding:10px; border-bottom:1px solid var(--line); cursor:pointer;">
          <strong>${escapeHtml(ex.name)}</strong>
        </div>
      `).join("");

      overlay.querySelectorAll(".select-ex-row").forEach(row => {
        row.addEventListener("click", () => {
          const name = row.dataset.name;
          this.editingRoutine.exercisesStructured.push({ name, sets: "3", reps: "10", weight: "", rest: "", notes: "" });
          overlay.remove();
          context.refreshView();
        });
      });
    };

    getExercises().then(list => {
      const sorted = list.sort((a, b) => a.name.localeCompare(b.name));
      bindListEvents(sorted);
      
      inp.addEventListener("input", () => {
        const term = inp.value.trim().toLowerCase();
        overlay.querySelectorAll(".select-ex-row").forEach(row => {
          const name = row.dataset.name.toLowerCase();
          row.style.display = name.includes(term) ? "block" : "none";
        });
      });
    }).catch(() => {
      resultsList.innerHTML = '<p style="text-align:center; padding:20px; color:var(--red);">Failed to load exercises.</p>';
    });
    
    overlay.querySelector(".close-builder-prompt-btn").addEventListener("click", () => {
      overlay.remove();
    });
  },

  // Active workout duration timer clock helpers
  startActiveTimer(root, startTime) {
    this.clearActiveTimer();
    
    const updateTime = () => {
      const elapsedSec = Math.floor((new Date() - new Date(startTime)) / 1000);
      const hours = Math.floor(elapsedSec / 3600);
      const mins = Math.floor((elapsedSec % 3600) / 60);
      const secs = elapsedSec % 60;
      
      const timeStr = [
        hours.toString().padStart(2, "0"),
        mins.toString().padStart(2, "0"),
        secs.toString().padStart(2, "0")
      ].join(":");
      
      const el = root.querySelector("#active-timer");
      if (el) el.textContent = timeStr;
    };
    
    updateTime();
    this.timerInterval = setInterval(updateTime, 1000);
  },

  // Publishes a lightweight "still training" heartbeat so other members can see
  // who is in the gym right now. Best effort throughout: a failed write must
  // never interrupt someone's workout, so every path swallows its error.
  startPresence(context, activeWorkout) {
    const me = context?.myMember;
    if (!me?.id || this.presenceTimer) return;

    const beat = async () => {
      try {
        const saved = await context.services.data.save(collections.workoutPresence, {
          id: this.presenceDocId || undefined,
          memberId: me.id,
          gymId: me.gymId,
          memberName: me.fullName || "A member",
          routineName: activeWorkout.routineName || "Workout",
          startedAt: activeWorkout.startTime,
          lastSeen: new Date().toISOString()
        });
        if (saved?.id) this.presenceDocId = saved.id;
      } catch (err) {
        // Offline or rules-blocked — presence is optional, keep training.
      }
    };

    beat();
    this.presenceTimer = setInterval(beat, PRESENCE_HEARTBEAT_MS);
  },

  // Stops the heartbeat and removes the row so the member disappears from the
  // list immediately rather than waiting for the TTL to lapse.
  stopPresence(context) {
    if (this.presenceTimer) {
      clearInterval(this.presenceTimer);
      this.presenceTimer = null;
    }
    const docId = this.presenceDocId;
    this.presenceDocId = null;
    if (!docId || !context?.services?.data?.remove) return;
    Promise.resolve(context.services.data.remove(collections.workoutPresence, docId)).catch(() => {});
  },

  // Keeps the screen awake while a workout is in progress. The Screen Wake Lock
  // API is unavailable on some browsers and rejects when the page is hidden, so
  // every path is non-fatal — a workout must never fail because of this.
  async acquireWakeLock() {
    if (this.wakeLock || !("wakeLock" in navigator)) return;
    try {
      this.wakeLock = await navigator.wakeLock.request("screen");
      // The browser drops the lock whenever the tab is backgrounded; forget the
      // stale sentinel so the visibility handler can re-request it.
      this.wakeLock.addEventListener("release", () => {
        this.wakeLock = null;
      });
    } catch (err) {
      this.wakeLock = null;
    }
  },

  releaseWakeLock() {
    if (!this.wakeLock) return;
    try {
      this.wakeLock.release();
    } catch (err) {
      // Already released by the browser — nothing to do.
    }
    this.wakeLock = null;
  },

  // Called by app.js renderView() when navigating away from this module.
  destroy() {
    this.clearActiveTimer();
    this.releaseWakeLock();
    // No context here to delete the row with; stop beating and let it age out.
    if (this.presenceTimer) {
      clearInterval(this.presenceTimer);
      this.presenceTimer = null;
    }
    if (this.onVisibilityChange) {
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
      this.onVisibilityChange = null;
    }
  },

  clearActiveTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.restInterval) {
      clearInterval(this.restInterval);
      this.restInterval = null;
    }
  },

  startRestCountdown(root, activeWorkout) {
    const target = root.querySelector("[data-rest-countdown]");
    if (!target) return;
    if (this.restInterval) clearInterval(this.restInterval);

    const tick = () => {
      const left = restSecondsLeft(activeWorkout);
      target.textContent = left ? formatClock(left) : "Ready";
      if (!left && activeWorkout.restUntil) {
        clearRest(activeWorkout);
        saveActiveWorkout(activeWorkout);
        syncRunnerUi(root, activeWorkout);
      }
    };

    tick();
    this.restInterval = setInterval(tick, 1000);
  }
};

// How long a presence heartbeat stays valid. A member who closes the tab stops
// writing, so their row simply ages out rather than needing a cleanup job.
const PRESENCE_TTL_MS = 5 * 60 * 1000;
const PRESENCE_HEARTBEAT_MS = 60 * 1000;

// Members currently mid-workout, excluding the viewer and anyone stale.
function trainingNow(context, excludeMemberId) {
  const cutoff = Date.now() - PRESENCE_TTL_MS;
  return (context?.data?.workout_presence || [])
    .filter((row) => row.memberId && row.memberId !== excludeMemberId)
    .filter((row) => {
      const seen = Date.parse(row.lastSeen || "");
      return Number.isFinite(seen) && seen >= cutoff;
    })
    .sort((a, b) => String(b.lastSeen || "").localeCompare(String(a.lastSeen || "")));
}

// Per-source guidance shown under the file picker.
const IMPORT_HINTS = {
  fitnotes: "FitNotes: Settings > Export Data > Export as CSV. Exports from older versions do not record whether weights are kg or lbs — check your numbers afterwards.",
  strong: "Strong: Profile > Settings > Export Data, then pick the CSV file. Strong usually omits the unit, so weights import as written unless the column names one.",
  hevy: "Hevy: Settings > Export & Import Data > Export Workouts (CSV). Imperial exports are converted to kg automatically.",
  applehealth: "Apple Health: Profile > Export All Health Data, then choose export.xml, or a CSV of Body Mass readings."
};

// Files above this size are refused rather than parsed — a full Apple Health
// export.xml can run to hundreds of megabytes and would lock up the tab.
const IMPORT_MAX_BYTES = 20 * 1024 * 1024;

// Local storage active workout helpers
function getActiveWorkout() {
  if (typeof localStorage === "undefined") return null;
  const data = localStorage.getItem("gymflow.active_workout");
  return data ? JSON.parse(data) : null;
}

function saveActiveWorkout(active) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem("gymflow.active_workout", JSON.stringify(active));
}

function clearActiveWorkout() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem("gymflow.active_workout");
}

// Patches the workout-runner chrome (progress bar, set counter, next-set
// highlight, rest chip) directly in the DOM. Used instead of context.refreshView()
// on the hot path so logging a set costs zero backend reads and never steals
// focus from the weight/reps inputs the member is typing into.
function syncRunnerUi(root, active) {
  if (!root) return;
  const exercises = active.exercises || [];
  const totalSets = exercises.reduce((sum, ex) => sum + (ex.sets || []).length, 0);
  const doneSets = exercises.reduce((sum, ex) => sum + (ex.sets || []).filter((set) => set.done).length, 0);
  const progressPct = totalSets ? Math.round((doneSets / totalSets) * 100) : 0;
  const next = findNextSet(active);
  const restLeft = restSecondsLeft(active);

  const bar = root.querySelector(".workout-progress-shell span");
  if (bar) bar.style.width = `${progressPct}%`;

  const subline = root.querySelector(".active-workout-subline");
  if (subline) {
    const chips = subline.querySelectorAll("span");
    if (chips[1]) chips[1].textContent = `${doneSets}/${totalSets} sets`;
    if (chips[2]) {
      chips[2].textContent = next
        ? `Next: ${next.exercise.name} set ${next.setIdx + 1}`
        : "All sets complete";
    }
  }

  root.querySelectorAll(".active-set-row").forEach((row) => {
    const card = row.closest(".exercise-card");
    const exIdx = Number(card?.dataset.exerciseIndex);
    const setIdx = Number(row.dataset.setIdx);
    row.classList.toggle("set-next", !!next && next.exIdx === exIdx && next.setIdx === setIdx);
  });

  const chip = root.querySelector(".rest-timer-chip");
  if (chip) {
    chip.classList.toggle("running", !!restLeft);
    const countdown = chip.querySelector("[data-rest-countdown]");
    if (countdown) countdown.textContent = restLeft ? formatClock(restLeft) : "Ready";
    const skip = chip.querySelector("#skip-rest-btn");
    if (skip) skip.disabled = !restLeft;
  }
}

function findNextSet(active) {
  const exercises = active.exercises || [];
  for (let exIdx = 0; exIdx < exercises.length; exIdx++) {
    const sets = exercises[exIdx].sets || [];
    for (let setIdx = 0; setIdx < sets.length; setIdx++) {
      if (!sets[setIdx].done) return { exIdx, setIdx, exercise: exercises[exIdx], set: sets[setIdx] };
    }
  }
  return null;
}

function startRest(active, seconds) {
  active.restUntil = Date.now() + Number(seconds || 90) * 1000;
}

function clearRest(active) {
  delete active.restUntil;
}

function restSecondsLeft(active) {
  const until = Number(active.restUntil || 0);
  if (!until) return 0;
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

function formatClock(seconds) {
  const value = Math.max(0, Number(seconds || 0));
  const mins = Math.floor(value / 60);
  const secs = value % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function bestSetForExercise(logs, exerciseName) {
  let bestSetDesc = "No prev";
  let bestVal = 0;
  logs.forEach(l => {
    const matchEx = (l.exercises || []).find(pe => pe.name.toLowerCase() === exerciseName.toLowerCase());
    (matchEx?.sets || []).forEach(s => {
      const score = Number(s.weight || 0) * Number(s.reps || 0);
      if (score > bestVal) {
        bestVal = score;
        bestSetDesc = `${s.weight || 0} kg x ${s.reps || 0}`;
      }
    });
  });
  return bestSetDesc;
}

function startEmptyWorkout() {
  const active = {
    startTime: new Date().toISOString(),
    date: today(),
    durationMinutes: 60,
    routineName: "Freestyle Workout",
    notes: "",
    private: false,
    exercises: []
  };
  saveActiveWorkout(active);
}

function startWorkoutFromTrainerSession(session, context = null) {
  const lines = (session.exercises || "").split("\n").map(l => l.trim()).filter(Boolean);
  const exercises = lines.map(line => {
    let name = line;
    let setsCount = 3;
    let reps = "10";
    let weight = "";
    
    const match = line.match(/^([^-(\n]+)(?:-|\()?\s*(\d+)\s*(?:sets)?\s*(?:x|sets of)?\s*(\d+)?\s*(?:reps)?\s*@?\s*(\d+\s*[a-zA-Z]+)?/i);
    if (match) {
      name = match[1].trim();
      setsCount = Number(match[2]) || 3;
      reps = match[3] ? match[3].trim() : "10";
      weight = match[4] ? match[4].trim() : "";
    }
    
    const sets = [];
    for (let i = 0; i < setsCount; i++) {
      sets.push({ weight: weight || "", reps: reps || "", rpe: "", done: false });
    }
    return applyProgression({ name, sets }, context);
  });

  const active = {
    startTime: new Date().toISOString(),
    date: today(),
    durationMinutes: 60,
    routineName: "Trainer Session",
    notes: session.notes || "",
    private: false,
    exercises
  };
  saveActiveWorkout(active);
}

function startWorkoutFromRoutine(routine, context = null) {
  const active = {
    startTime: new Date().toISOString(),
    date: today(),
    durationMinutes: 60,
    routineName: routine.name,
    notes: "",
    private: false,
    exercises: (routine.exercisesStructured || []).map(ex => {
      const setsCount = Number(ex.sets) || 1;
      const sets = [];
      for (let i = 0; i < setsCount; i++) {
        sets.push({ weight: ex.weight || "", reps: ex.reps || "", rpe: "", done: false });
      }
      return applyProgression({ name: ex.name, sets }, context);
    })
  };
  saveActiveWorkout(active);
}

function startWorkoutFromTemplate(template, context = null) {
  const rawStructured = typeof template.exercisesStructured === "string" ? JSON.parse(template.exercisesStructured) : (template.exercisesStructured || []);
  const active = {
    startTime: new Date().toISOString(),
    date: today(),
    durationMinutes: template.durationMinutes || 60,
    routineName: template.name,
    notes: "",
    private: false,
    exercises: (rawStructured || []).map(ex => {
      const setsCount = Number(ex.sets) || 1;
      const sets = [];
      for (let i = 0; i < setsCount; i++) {
        sets.push({ weight: ex.weight || "", reps: ex.reps || "", rpe: "", done: false });
      }
      return applyProgression({ name: ex.name, sets }, context);
    })
  };
  saveActiveWorkout(active);
}

// Seeds a planned exercise from the member's own history. All the scheme logic
// lives in modules/workout-progression.js; this only supplies the context.
function applyProgression(exercise, context) {
  return planExercise(exercise, context?.data?.workout_logs || [], {
    memberId: context?.myMember?.id,
    scheme: exercise.scheme || context?.myMember?.progressionScheme || null,
    config: progressionConfigFor(context)
  });
}

// Per-member progression tuning, falling back to the gym default and then to
// the engine's own defaults.
function progressionConfigFor(context) {
  const member = context?.myMember || {};
  const settings = context?.settings || {};
  const config = {};
  if (Number(member.progressionIncrement) > 0) config.increment = Number(member.progressionIncrement);
  else if (Number(settings.progressionIncrement) > 0) config.increment = Number(settings.progressionIncrement);
  if (Number(member.stallsBeforeDeload) > 0) config.stallsBeforeDeload = Number(member.stallsBeforeDeload);
  return config;
}

function repeatWorkout(log) {
  const active = {
    startTime: new Date().toISOString(),
    date: today(),
    durationMinutes: log.durationMinutes || 60,
    routineName: log.routineName || "Workout",
    notes: log.notes || "",
    private: log.private || false,
    exercises: (log.exercises || []).map(ex => ({
      name: ex.name,
      sets: (ex.sets || []).map(s => ({
        weight: s.weight || "",
        reps: s.reps || "",
        rpe: s.rpe || "",
        done: false
      }))
    }))
  };
  saveActiveWorkout(active);
}

function basicCard(template) {
  const meta = [template.category || "General", template.difficulty, template.equipment, template.durationMinutes ? `${template.durationMinutes} min` : ""]
    .filter(Boolean)
    .join(" / ");
  
  const rawStructured = typeof template.exercisesStructured === "string" ? JSON.parse(template.exercisesStructured) : (template.exercisesStructured || []);
  const structuredSearch = (rawStructured || []).map((row) => Object.values(row).join(" ")).join(" ");
  const search = [template.name, template.goal, template.category, template.difficulty, template.equipment, template.exercises, template.notes, structuredSearch]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return `
    <article class="item-card stack"
      data-basic-card
      data-search="${escapeHtml(search)}"
      data-category="${escapeHtml(template.category || "General")}"
      data-difficulty="${escapeHtml(template.difficulty || "")}">
      <div>
        <strong>${escapeHtml(template.name)}</strong>
        <span>${escapeHtml(template.goal || "General")}</span>
      </div>
      ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
      ${renderTemplateExercises(template)}
      ${template.notes ? `<small>${escapeHtml(template.notes)}</small>` : ""}
      <div class="card-footer">
        <button class="primary-button compact start-template-btn" data-id="${template.id}">Start Workout</button>
      </div>
    </article>
  `;
}

function bindBasicFilters(root) {
  const list = root.querySelector("[data-basic-list]");
  if (!list) return;
  const filters = {
    search: root.querySelector("[data-basic-filter='search']"),
    category: root.querySelector("[data-basic-filter='category']"),
    difficulty: root.querySelector("[data-basic-filter='difficulty']")
  };
  const cards = Array.from(list.querySelectorAll("[data-basic-card]"));

  function apply() {
    const term = (filters.search?.value || "").trim().toLowerCase();
    const category = filters.category?.value || "";
    const difficulty = filters.difficulty?.value || "";
    cards.forEach((card) => {
      const ok =
        (!term || card.dataset.search.includes(term)) &&
        (!category || card.dataset.category === category) &&
        (!difficulty || card.dataset.difficulty === difficulty);
      card.classList.toggle("hidden", !ok);
    });
  }

  Object.values(filters).forEach((filter) => {
    filter?.addEventListener("input", apply);
    filter?.addEventListener("change", apply);
  });
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));
}
