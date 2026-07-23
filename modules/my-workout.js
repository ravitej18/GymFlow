import { collections, dateLabel, emptyState, escapeHtml, findName, pageHeader, today, getExercises, getExercisesList, showExerciseModal, withButtonLoading } from "./utils.js";
import { renderTemplateExercises } from "./workouts.js";

// Page state persisted in-memory on the singleton module object
export const myWorkoutModule = {
  activeTab: "workouts", // "workouts" or "history"
  editingRoutine: null,  // routine object or null
  editingSchedule: false, // boolean
  exerciseSearchOpen: false, // boolean
  customExerciseOpen: false, // boolean
  timerInterval: null,

  render(context) {
    const me = context.myMember;
    if (!me) {
      return `
        ${pageHeader("My Workout")}
        ${emptyState("Membership being set up", "Your workout will appear here once your gym finalises your membership.")}
      `;
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
      </div>

      <div class="tab-content">
        ${this.activeTab === "workouts" 
          ? this.renderWorkoutsTab(context, basicTemplates, customRoutines, weeklyScheduleDoc) 
          : this.renderHistoryTab(context, myLogs)}
      </div>
    `;
  },

  // Renders the Workouts tab (Weekly Schedule, Quick Start, Custom Routines, Gym templates)
  renderWorkoutsTab(context, basicTemplates, customRoutines, weeklyScheduleDoc) {
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
                    <optgroup label="Custom Routines">
                      ${customRoutines.map(r => `<option value="${r.id}" ${currentVal === r.id ? "selected" : ""}>${escapeHtml(r.name)}</option>`).join("")}
                    </optgroup>
                    <optgroup label="Gym Templates">
                      ${basicTemplates.map(t => `<option value="${t.id}" ${currentVal === t.id ? "selected" : ""}>${escapeHtml(t.name)}</option>`).join("")}
                    </optgroup>
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
        let name = "Rest Day";
        let isGymTemplate = false;
        if (id) {
          const r = customRoutines.find(cr => cr.id === id);
          const t = basicTemplates.find(bt => bt.id === id);
          if (r) name = r.name;
          else if (t) {
            name = t.name;
            isGymTemplate = true;
          }
        }
        return `
          <div class="schedule-day-row">
            <span class="day-name">${day}</span>
            <span class="routine-name ${id ? "has-routine" : "rest-day"}">${escapeHtml(name)}</span>
            ${id ? `<button class="ghost-button compact start-sched-btn" data-id="${id}" data-type="${isGymTemplate ? "template" : "routine"}">Start</button>` : ""}
          </div>
        `;
      }).join("");

      scheduleSection = `
        <div class="panel stack">
          <div class="panel-heading">
            <h2>Weekly Schedule</h2>
            <button class="ghost-button compact" id="edit-schedule-btn">
              <span class="material-symbols-outlined" style="font-size:16px;">edit</span> Edit
            </button>
          </div>
          <div class="schedule-grid">
            ${scheduleItems}
          </div>
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

    return `
      <div class="work-grid" style="grid-template-columns: 1.2fr 1fr;">
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
              ${searchList.map(ex => `
                <div class="search-exercise-row select-exercise-row" data-name="${escapeHtml(ex.name)}" style="display:flex; align-items:center; justify-content:space-between; padding:8px; border-bottom:1px solid var(--line); cursor:pointer; hover:background:var(--bg-alt);">
                  <div>
                    <strong>${escapeHtml(ex.name)}</strong>
                    <div style="font-size:0.8rem; opacity:0.8;">${escapeHtml(ex.bodyPart || "")} / ${escapeHtml(ex.equipment || "")}</div>
                  </div>
                  <span class="material-symbols-outlined" style="font-size:18px;">add_circle</span>
                </div>
              `).join("")}
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
        <div class="active-workout-header" style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--line);">
          <div>
            <h2 style="margin:0;">Active: <span id="active-routine-name">${escapeHtml(activeWorkout.routineName || "Workout")}</span></h2>
            <span class="active-timer" id="active-timer" style="font-size:1.4rem; font-weight:700; color:var(--accent);">00:00:00</span>
          </div>
          <div style="display:flex; gap:10px;">
            <button class="primary-button compact" id="finish-workout-btn" style="background: var(--green);">Finish</button>
            <button class="ghost-button danger compact" id="cancel-workout-btn">Cancel</button>
          </div>
        </div>

        <div class="panel stack">
          <div class="form-grid">
            <label class="wide">Workout Notes
              <textarea id="active-workout-notes" rows="2" placeholder="Session notes (optional)...">${escapeHtml(activeWorkout.notes || "")}</textarea>
            </label>
            <div class="wide" style="display:flex; align-items:center; gap:8px;">
              <input type="checkbox" id="active-workout-public" ${activeWorkout.private ? "" : "checked"} style="cursor:pointer;" />
              <label for="active-workout-public" style="cursor:pointer; font-weight:500;">Share to Gym Community Feed</label>
            </div>
          </div>
        </div>

        <div class="active-exercises-list stack" style="gap: 15px;">
          ${exercises.map((ex, exIdx) => {
            const sets = ex.sets || [];
            return `
              <article class="panel exercise-card stack" data-exercise-index="${exIdx}" style="padding:15px; gap:10px;">
                <div class="panel-heading" style="display:flex; justify-content:space-between; align-items:center;">
                  <h3 style="margin:0;">${escapeHtml(ex.name)}</h3>
                  <button class="ghost-button danger compact remove-ex-row-btn" data-ex-idx="${exIdx}" title="Remove exercise">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
                
                <div class="data-table">
                  <div class="table-head" style="grid-template-columns: 40px 1.5fr 1fr 1fr 1fr 50px; text-align: center; font-size:0.8rem; font-weight:600; border-bottom:1px solid var(--line); padding-bottom:5px;">
                    <span>Set</span>
                    <span>Prev (Best)</span>
                    <span>Kg</span>
                    <span>Reps</span>
                    <span>RPE</span>
                    <span>Done</span>
                  </div>
                  <div class="active-sets-list stack" style="gap: 5px; margin-top:5px;">
                    ${sets.map((set, setIdx) => {
                      return `
                        <div class="table-row active-set-row ${set.done ? "set-done" : ""}" data-set-idx="${setIdx}" style="grid-template-columns: 40px 1.5fr 1fr 1fr 1fr 50px; align-items:center; text-align:center; padding: 4px 0;">
                          <span style="font-weight:700; opacity:0.85;">${setIdx + 1}</span>
                          <span style="font-size:0.75rem; opacity:0.75;" class="prev-best-label">—</span>
                          <input type="number" step="0.25" placeholder="0" class="set-weight-input" value="${set.weight || ""}" style="width:100%; text-align:center; padding:4px;" />
                          <input type="number" placeholder="0" class="set-reps-input" value="${set.reps || ""}" style="width:100%; text-align:center; padding:4px;" />
                          <select class="set-rpe-select" style="width:100%; text-align:center; padding:4px;">
                            <option value="">-</option>
                            ${[10, 9.5, 9, 8.5, 8, 7.5, 7, 6, 5, 4, 3, 2, 1].map(v => `
                              <option value="${v}" ${Number(set.rpe) === v ? "selected" : ""}>${v}</option>
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
                <div class="exercise-row-metrics" style="display:grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap:8px;">
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

    this.bindWorkoutsTab(root, context);
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

    // Save schedule form
    const schedForm = root.querySelector("#schedule-form");
    schedForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
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

      await context.services.data.save(collections.workoutSchedules, weeklyScheduleDoc);
      context.toast("Schedule updated.");
      this.editingSchedule = false;
      await context.refreshView();
    });

    // Start workout from schedule day
    root.querySelectorAll(".start-sched-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const type = btn.dataset.type;
        if (type === "template") {
          const t = (context.data.workout_templates || []).find(bt => bt.id === id);
          if (t) startWorkoutFromTemplate(t);
        } else {
          const r = (context.data.workout_schedules || []).find(cr => cr.id === id);
          if (r) startWorkoutFromRoutine(r);
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
        await context.refreshView();
      });
    });

    // Start Workout from Routine
    root.querySelectorAll(".start-routine-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const r = (context.data.workout_schedules || []).find(cr => cr.id === btn.dataset.id);
        if (r) {
          startWorkoutFromRoutine(r);
          context.refreshView();
        }
      });
    });

    // Start Workout from Gym Template
    root.querySelectorAll(".start-template-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const t = (context.data.workout_templates || []).find(bt => bt.id === btn.dataset.id);
        if (t) {
          startWorkoutFromTemplate(t);
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
    // Start active timer UI refresh
    this.startActiveTimer(root, activeWorkout.startTime);

    // Save notes/public status changes locally on edit
    const notesInput = root.querySelector("#active-workout-notes");
    notesInput?.addEventListener("input", () => {
      activeWorkout.notes = notesInput.value;
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
        row.classList.toggle("set-done", chk.checked);
        saveActiveWorkout(activeWorkout);
      });
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
      
      const previousLogs = myLogs.filter(log => (log.exercises || []).some(pe => pe.name.toLowerCase() === ex.name.toLowerCase()));
      if (previousLogs.length) {
        // Find best set or most recent set values
        let bestSetDesc = "No prev";
        let bestVal = 0;
        previousLogs.forEach(l => {
          const matchEx = l.exercises.find(pe => pe.name.toLowerCase() === ex.name.toLowerCase());
          (matchEx.sets || []).forEach(s => {
            const score = Number(s.weight || 0) * Number(s.reps || 0);
            if (score > bestVal) {
              bestVal = score;
              bestSetDesc = `${s.weight} kg x ${s.reps}`;
            }
          });
        });
        
        card.querySelectorAll(".prev-best-label").forEach(lbl => {
          lbl.textContent = bestSetDesc;
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
      this.clearActiveTimer();
      clearActiveWorkout();
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
        this.clearActiveTimer();
        const durationSec = Math.floor((new Date() - new Date(activeWorkout.startTime)) / 1000);
        const durationMins = Math.max(1, Math.round(durationSec / 60));

        const payload = {
          memberId: context.myMember.id,
          gymId: context.myMember.gymId,
          date: today(),
          routineName: activeWorkout.routineName || "Workout",
          durationMinutes: durationMins,
          notes: activeWorkout.notes || "",
          private: activeWorkout.private || false,
          exercises: finalEx.map(ex => ({
            name: ex.name,
            sets: ex.sets.map(s => ({
              weight: s.weight ? Number(s.weight) : 0,
              reps: s.reps ? Number(s.reps) : 0,
              rpe: s.rpe ? Number(s.rpe) : ""
            }))
          }))
        };

        const saved = await context.services.data.save(collections.workoutLogs, payload);
        clearActiveWorkout();
        context.toast("Workout logged successfully!");
        context.applyChange(collections.workoutLogs, saved);
        this.activeTab = "history";
        await context.refreshView();
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

    // Select exercise row click
    root.querySelectorAll(".select-exercise-row").forEach(row => {
      row.addEventListener("click", () => {
        const name = row.dataset.name;
        activeWorkout.exercises.push({
          name,
          sets: [{ weight: "", reps: "", rpe: "", done: false }]
        });
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

      await context.services.data.save(collections.workoutSchedules, payload);
      context.toast("Custom routine saved!");
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
    
    // We will render a quick list selection using showExerciseSelectPrompt
    const list = getExercisesList().sort((a, b) => a.name.localeCompare(b.name));
    
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
          ${list.map(ex => `
            <div class="select-ex-row" data-name="${escapeHtml(ex.name)}" style="padding:10px; border-bottom:1px solid var(--line); cursor:pointer;">
              <strong>${escapeHtml(ex.name)}</strong>
            </div>
          `).join("")}
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Bind search typing
    const inp = overlay.querySelector("#builder-ex-search-input");
    inp.focus();
    inp.addEventListener("input", () => {
      const term = inp.value.trim().toLowerCase();
      overlay.querySelectorAll(".select-ex-row").forEach(row => {
        const name = row.dataset.name.toLowerCase();
        row.style.display = name.includes(term) ? "block" : "none";
      });
    });
    
    // Bind selection
    overlay.querySelectorAll(".select-ex-row").forEach(row => {
      row.addEventListener("click", () => {
        const name = row.dataset.name;
        this.editingRoutine.exercisesStructured.push({ name, sets: "3", reps: "10", weight: "", rest: "", notes: "" });
        overlay.remove();
        context.refreshView();
      });
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

  clearActiveTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
};

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

function startEmptyWorkout() {
  const active = {
    startTime: new Date().toISOString(),
    routineName: "Freestyle Workout",
    notes: "",
    private: false,
    exercises: []
  };
  saveActiveWorkout(active);
}

function startWorkoutFromRoutine(routine) {
  const active = {
    startTime: new Date().toISOString(),
    routineName: routine.name,
    notes: "",
    private: false,
    exercises: (routine.exercisesStructured || []).map(ex => {
      const setsCount = Number(ex.sets) || 1;
      const sets = [];
      for (let i = 0; i < setsCount; i++) {
        sets.push({ weight: ex.weight || "", reps: ex.reps || "", rpe: "", done: false });
      }
      return { name: ex.name, sets };
    })
  };
  saveActiveWorkout(active);
}

function startWorkoutFromTemplate(template) {
  const active = {
    startTime: new Date().toISOString(),
    routineName: template.name,
    notes: "",
    private: false,
    exercises: (template.exercisesStructured || []).map(ex => {
      const setsCount = Number(ex.sets) || 1;
      const sets = [];
      for (let i = 0; i < setsCount; i++) {
        sets.push({ weight: ex.weight || "", reps: ex.reps || "", rpe: "", done: false });
      }
      return { name: ex.name, sets };
    })
  };
  saveActiveWorkout(active);
}

function repeatWorkout(log) {
  const active = {
    startTime: new Date().toISOString(),
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
  
  const structuredSearch = (template.exercisesStructured || []).map((row) => Object.values(row).join(" ")).join(" ");
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
