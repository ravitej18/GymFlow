import { collections, emptyState, escapeHtml, formData, pageHeader, withButtonLoading } from "./utils.js";

const GOALS = ["Weight Loss", "Muscle Gain", "Strength", "Mobility", "Cardio", "General Fitness"];
const CATEGORIES = ["Strength", "Weight Loss", "Mobility", "Beginner", "Cardio", "Conditioning"];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];
const EQUIPMENT = ["Bodyweight", "Dumbbells", "Machines", "Barbell", "Mixed"];

export const workoutsModule = {
  render(context) {
    const templates = visibleTemplates(context);
    const role = context.profile?.role || "owner";
    const isTrainer = role === "trainer";
    if (isTrainer && !context.myTrainer) {
      return `
        ${pageHeader("Workout Modules")}
        ${emptyState("Profile being set up", "Once your gym finalises your trainer profile you can create workout modules.")}
      `;
    }

    return `
      ${pageHeader(isTrainer ? "Workout Modules" : "Workout Plans")}
      <div class="work-grid">
        <form class="panel stack" id="workout-form">
          <div class="panel-heading"><h2>Create Module</h2></div>
          <div class="form-grid">
            <label>Module name<input name="name" required maxlength="100" /></label>
            <label>Goal
              <select name="goal">
                <option value="">General Fitness</option>
                ${GOALS.map((goal) => `<option>${escapeHtml(goal)}</option>`).join("")}
              </select>
            </label>
            <label>Category
              <select name="category">
                <option value="">General</option>
                ${CATEGORIES.map((category) => `<option>${escapeHtml(category)}</option>`).join("")}
              </select>
            </label>
            <label>Difficulty
              <select name="difficulty">
                <option value="">Not specified</option>
                ${DIFFICULTIES.map((difficulty) => `<option>${escapeHtml(difficulty)}</option>`).join("")}
              </select>
            </label>
            <label>Equipment
              <select name="equipment">
                <option value="">Any</option>
                ${EQUIPMENT.map((equipment) => `<option>${escapeHtml(equipment)}</option>`).join("")}
              </select>
            </label>
            <label>Duration minutes<input name="durationMinutes" type="number" min="1" max="240" step="5" /></label>
            <label>Visibility
              <select name="visibility">
                <option value="private">Private</option>
                <option value="basic">Basic - visible to members</option>
              </select>
            </label>
            <label class="wide">Free-text exercises<textarea name="exercises" rows="5" placeholder="Bench press - 3 sets x 10 reps"></textarea></label>
            <div class="wide structured-builder">
              <div class="panel-heading compact-heading">
                <h2>Structured exercises</h2>
                <button class="ghost-button" type="button" data-action="add-exercise-row">Add exercise</button>
              </div>
              <div class="exercise-rows" data-exercise-rows>
                ${exerciseRowHtml()}
              </div>
            </div>
            <label class="wide">Notes<textarea name="notes" rows="2"></textarea></label>
          </div>
          <button class="primary-button" type="submit">Save module</button>
        </form>
        <section class="panel">
          <div class="panel-heading"><h2>Module Library</h2><span data-template-count>${templates.length} modules</span></div>
          ${
            templates.length
              ? `
                <div class="filter-bar">
                  <label>Search
                    <span class="search-field">
                      <span class="material-symbols-outlined">search</span>
                      <input type="search" data-template-filter="search" placeholder="Name, goal, exercises" />
                    </span>
                  </label>
                  <label>Category
                    <select data-template-filter="category">
                      <option value="">All categories</option>
                      ${CATEGORIES.map((category) => `<option>${escapeHtml(category)}</option>`).join("")}
                    </select>
                  </label>
                  <label>Difficulty
                    <select data-template-filter="difficulty">
                      <option value="">All levels</option>
                      ${DIFFICULTIES.map((difficulty) => `<option>${escapeHtml(difficulty)}</option>`).join("")}
                    </select>
                  </label>
                  <label>Visibility
                    <select data-template-filter="visibility">
                      <option value="">All visibility</option>
                      <option value="private">Private</option>
                      <option value="basic">Basic</option>
                    </select>
                  </label>
                </div>
                <div class="card-grid" data-template-list>${templates.map((template) => card(template, context)).join("")}</div>
              `
              : emptyState("No workout modules", "Create reusable modules first, then assign them to clients later.")
          }
        </section>
      </div>
    `;
  },
  bind(root, context) {
    const form = root.querySelector("#workout-form");
    bindStructuredRows(root);

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await withButtonLoading(form.querySelector("[type='submit']"), async () => {
        const payload = normalizeTemplatePayload(formData(form), context, collectStructuredExercises(form));
        const saved = await context.services.data.save(collections.workouts, payload);
        context.toast("Workout module saved.");
        form.reset();
        resetStructuredRows(form);
        context.applyChange(collections.workouts, saved);
      });
    });

    root.querySelectorAll("[data-clone-template]").forEach((button) => {
      button.addEventListener("click", async () => {
        const source = (context.data.workout_templates || []).find((template) => template.id === button.dataset.cloneTemplate);
        if (!source) return;
        await withButtonLoading(button, async () => {
          const { id, createdAt, updatedAt, gymId, ...copy } = source;
          const saved = await context.services.data.save(collections.workouts, normalizeTemplatePayload({
            ...copy,
            name: `Copy of ${source.name || "Workout Module"}`,
            visibility: "private"
          }, context, source.exercisesStructured || []));
          context.toast("Module duplicated.");
          context.applyChange(collections.workouts, saved);
        }, "Duplicating...");
      });
    });

    bindTemplateFilters(root);
  }
};

export function canUseWorkoutTemplate(template, context) {
  const role = context.profile?.role || "owner";
  if (role === "owner") return true;
  if (template.status === "archived") return false;
  if (template.visibility === "basic") return true;
  if (template.createdByRole !== "trainer") return true;
  return Boolean(template.trainerId && context.myTrainerId && template.trainerId === context.myTrainerId);
}

export function renderTemplateExercises(template) {
  const structured = Array.isArray(template?.exercisesStructured) ? template.exercisesStructured.filter((row) => row.name) : [];
  if (structured.length) {
    return `
      <div class="structured-exercise-list">
        ${structured.map((row) => `
          <div class="structured-exercise-item">
            <strong>${escapeHtml(row.name)}</strong>
            <span>${escapeHtml(exerciseSummary(row))}</span>
            ${row.notes ? `<small>${escapeHtml(row.notes)}</small>` : ""}
          </div>
        `).join("")}
      </div>
    `;
  }
  return `<pre>${escapeHtml(template?.exercises || "No exercises")}</pre>`;
}

function visibleTemplates(context) {
  return (context.data.workout_templates || [])
    .filter((template) => canUseWorkoutTemplate(template, context))
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

function normalizeTemplatePayload(payload, context, structuredExercises = []) {
  const role = context.profile?.role || "owner";
  const requestedVisibility = payload.visibility || "private";
  const normalized = {
    ...payload,
    visibility: requestedVisibility,
    status: payload.status || "active",
    goal: payload.goal || "General Fitness",
    category: payload.category || "General",
    createdByRole: payload.createdByRole || role,
    createdByUid: payload.createdByUid || context.profile?.uid || context.profile?.id || "",
    exercisesStructured: structuredExercises
  };

  if (!normalized.exercisesStructured.length) delete normalized.exercisesStructured;
  if (payload.durationMinutes !== undefined && payload.durationMinutes !== "") {
    normalized.durationMinutes = Number(payload.durationMinutes);
  } else {
    delete normalized.durationMinutes;
  }
  if (role === "trainer") {
    normalized.trainerId = context.myTrainerId || context.myTrainer?.id || "";
    normalized.createdByRole = "trainer";
    normalized.createdByUid = context.profile?.uid || context.profile?.id || "";
  }
  if (role === "owner" && !normalized.trainerId) {
    delete normalized.trainerId;
  }
  return normalized;
}

function bindStructuredRows(root) {
  const rows = root.querySelector("[data-exercise-rows]");
  root.querySelector("[data-action='add-exercise-row']")?.addEventListener("click", () => {
    rows?.insertAdjacentHTML("beforeend", exerciseRowHtml());
  });
  rows?.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-remove-exercise-row]");
    if (!remove) return;
    const row = remove.closest("[data-exercise-row]");
    if (rows.querySelectorAll("[data-exercise-row]").length === 1) {
      row.querySelectorAll("input").forEach((input) => (input.value = ""));
    } else {
      row.remove();
    }
  });
}

function resetStructuredRows(form) {
  const rows = form.querySelector("[data-exercise-rows]");
  if (rows) rows.innerHTML = exerciseRowHtml();
}

function collectStructuredExercises(form) {
  return Array.from(form.querySelectorAll("[data-exercise-row]"))
    .map((row) => ({
      name: row.querySelector("[data-exercise-name]")?.value.trim() || "",
      sets: row.querySelector("[data-exercise-sets]")?.value.trim() || "",
      reps: row.querySelector("[data-exercise-reps]")?.value.trim() || "",
      weight: row.querySelector("[data-exercise-weight]")?.value.trim() || "",
      rest: row.querySelector("[data-exercise-rest]")?.value.trim() || "",
      notes: row.querySelector("[data-exercise-notes]")?.value.trim() || ""
    }))
    .filter((row) => Object.values(row).some(Boolean));
}

function exerciseRowHtml() {
  return `
    <div class="exercise-row" data-exercise-row>
      <input data-exercise-name placeholder="Exercise name" maxlength="100" />
      <div class="exercise-row-metrics">
        <input data-exercise-sets type="number" min="0" placeholder="Sets" />
        <input data-exercise-reps placeholder="Reps" maxlength="20" />
        <input data-exercise-weight placeholder="Weight" maxlength="30" />
        <input data-exercise-rest placeholder="Rest" maxlength="30" />
      </div>
      <input data-exercise-notes placeholder="Notes, tempo, form cues" maxlength="120" />
      <div class="exercise-row-actions">
        <button class="ghost-button danger exercise-remove" type="button" data-remove-exercise-row title="Remove exercise">
          <span class="material-symbols-outlined">delete</span>
          <span>Remove</span>
        </button>
      </div>
    </div>
  `;
}

function bindTemplateFilters(root) {
  const list = root.querySelector("[data-template-list]");
  if (!list) return;
  const filters = {
    search: root.querySelector("[data-template-filter='search']"),
    category: root.querySelector("[data-template-filter='category']"),
    difficulty: root.querySelector("[data-template-filter='difficulty']"),
    visibility: root.querySelector("[data-template-filter='visibility']")
  };
  const cards = Array.from(list.querySelectorAll("[data-template-card]"));
  const count = root.querySelector("[data-template-count]");

  function apply() {
    const term = (filters.search?.value || "").trim().toLowerCase();
    const category = filters.category?.value || "";
    const difficulty = filters.difficulty?.value || "";
    const visibility = filters.visibility?.value || "";
    let visible = 0;

    cards.forEach((cardEl) => {
      const ok =
        (!term || cardEl.dataset.search.includes(term)) &&
        (!category || cardEl.dataset.category === category) &&
        (!difficulty || cardEl.dataset.difficulty === difficulty) &&
        (!visibility || cardEl.dataset.visibility === visibility);
      cardEl.classList.toggle("hidden", !ok);
      if (ok) visible += 1;
    });

    if (count) count.textContent = `${visible} modules`;
  }

  Object.values(filters).forEach((filter) => {
    filter?.addEventListener("input", apply);
    filter?.addEventListener("change", apply);
  });
}

function card(template, context) {
  const visibility = visibilityLabel(template.visibility);
  const owner = template.createdByRole === "trainer" ? "Trainer" : "Owner";
  const meta = [template.category || "General", template.difficulty, template.equipment, template.durationMinutes ? `${template.durationMinutes} min` : ""]
    .filter(Boolean)
    .join(" / ");
  const structuredSearch = (template.exercisesStructured || []).map((row) => Object.values(row).join(" ")).join(" ");
  const search = [template.name, template.goal, template.category, template.difficulty, template.equipment, template.exercises, template.notes, structuredSearch]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return `
    <article class="item-card"
      data-template-card
      data-search="${escapeHtml(search)}"
      data-category="${escapeHtml(template.category || "General")}"
      data-difficulty="${escapeHtml(template.difficulty || "")}"
      data-visibility="${escapeHtml(template.visibility || "private")}">
      <div><strong>${escapeHtml(template.name)}</strong><span>${escapeHtml(template.goal || "General Fitness")}</span></div>
      <small>${escapeHtml(`${visibility}, ${owner}${meta ? `, ${meta}` : ""}`)}</small>
      ${renderTemplateExercises(template)}
      <small>${escapeHtml(template.notes || "")}</small>
      <div class="card-footer">
        <span>${escapeHtml(template.status || "active")}</span>
        <span class="row-actions">
          <button class="icon-button" type="button" data-clone-template="${escapeHtml(template.id)}" title="Duplicate module">
            <span class="material-symbols-outlined">content_copy</span>
          </button>
        </span>
      </div>
    </article>
  `;
}

function visibilityLabel(value) {
  if (value === "basic") return "Basic";
  return "Private";
}

function exerciseSummary(row) {
  return [
    row.sets ? `${row.sets} sets` : "",
    row.reps ? `${row.reps} reps` : "",
    row.weight ? `${row.weight}` : "",
    row.rest ? `rest ${row.rest}` : ""
  ].filter(Boolean).join(" / ") || "Details not set";
}
