import { collections, emptyState, escapeHtml, formData, pageHeader, withButtonLoading } from "./utils.js";

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
            <label>Goal<input name="goal" maxlength="100" /></label>
            <label>Visibility
              <select name="visibility">
                <option value="private">Private</option>
                <option value="basic">Basic - visible to members</option>
              </select>
            </label>
            <label class="wide">Exercises<textarea name="exercises" rows="7" placeholder="Bench press - 3 sets x 10 reps"></textarea></label>
            <label class="wide">Notes<textarea name="notes" rows="2"></textarea></label>
          </div>
          <button class="primary-button" type="submit">Save module</button>
        </form>
        <section class="panel">
          <div class="panel-heading"><h2>Module Library</h2><span>${templates.length} modules</span></div>
          ${
            templates.length
              ? `<div class="card-grid">${templates.map(card).join("")}</div>`
              : emptyState("No workout modules", "Create reusable modules first, then assign them to clients later.")
          }
        </section>
      </div>
    `;
  },
  bind(root, context) {
    const form = root.querySelector("#workout-form");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await withButtonLoading(form.querySelector("[type='submit']"), async () => {
        const payload = formData(form);
        const role = context.profile?.role || "owner";
        payload.visibility = payload.visibility || "private";
        payload.status = payload.status || "active";
        payload.createdByRole = payload.createdByRole || role;
        payload.createdByUid = payload.createdByUid || context.profile?.uid || context.profile?.id || "";
        if (role === "trainer") {
          payload.trainerId = context.myTrainerId || context.myTrainer?.id || "";
        }

        const saved = await context.services.data.save(collections.workouts, payload);
        context.toast("Workout module saved.");
        form.reset();
        context.applyChange(collections.workouts, saved);
      });
    });
  }
};

export function canUseWorkoutTemplate(template, context) {
  const role = context.profile?.role || "owner";
  if (role === "owner") return true;
  if (template.status === "archived") return false;
  if (template.visibility === "basic" && template.status !== "archived") return true;
  if (template.createdByRole !== "trainer") return true;
  return Boolean(template.trainerId && context.myTrainerId && template.trainerId === context.myTrainerId);
}

function visibleTemplates(context) {
  return (context.data.workout_templates || [])
    .filter((template) => canUseWorkoutTemplate(template, context))
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

function card(template) {
  const visibility = template.visibility === "basic" ? "Basic" : "Private";
  const owner = template.createdByRole === "trainer" ? "Trainer" : "Owner";
  const status = template.status && template.status !== "active" ? `, ${template.status}` : "";

  return `
    <article class="item-card">
      <div><strong>${escapeHtml(template.name)}</strong><span>${escapeHtml(template.goal || "General")}</span></div>
      <small>${escapeHtml(`${visibility}, ${owner}${status}`)}</small>
      <pre>${escapeHtml(template.exercises || "No exercises")}</pre>
      <small>${escapeHtml(template.notes || "")}</small>
    </article>
  `;
}
