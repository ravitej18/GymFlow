import { collections, dateLabel, emptyState, escapeHtml, findName, formData, optionList, pageHeader, today, withButtonLoading } from "./utils.js";
import { canUseWorkoutTemplate } from "./workouts.js";

export const trainerMembersModule = {
  render(context) {
    const me = context.myTrainer;
    if (!me) {
      return `
        ${pageHeader("My Clients")}
        ${emptyState("Profile being set up", "Once your gym finalises your trainer profile your clients will appear here.")}
      `;
    }

    const myMembers = (context.data.members || []).filter(m => m.assignedTrainer === me.id);
    const assignments = context.data.workout_assignments || [];
    const templates = (context.data.workout_templates || []).filter((template) => canUseWorkoutTemplate(template, context));

    function currentTemplateName(member) {
      const memberAssignments = assignments.filter(a => a.memberId === member.id);
      memberAssignments.sort((a, b) => String(b.assignedAt || "").localeCompare(String(a.assignedAt || "")));
      const current = memberAssignments[0];
      return findName(templates, current?.templateId, "No template assigned");
    }

    return `
      ${pageHeader("My Clients")}
      <div class="work-grid">
        <form class="panel stack" id="session-form">
          <div class="panel-heading"><h2>Write Today's Session</h2></div>
          <div class="form-grid">
            <label class="wide">Client
              <select name="memberId" required>
                <option value="">Select client...</option>
                ${optionList(myMembers, "fullName")}
              </select>
            </label>
            <label>Date
              <input type="date" name="date" value="${escapeHtml(today())}" />
            </label>
            <label>Base Module
              <select name="templateId">
                <option value="">None</option>
                ${optionList(templates, "name")}
              </select>
            </label>
            <label class="wide">Exercises
              <textarea name="exercises" rows="7" placeholder="Bench press - 3 sets x 10 reps"></textarea>
            </label>
            <label class="wide">Notes
              <textarea name="notes" rows="2"></textarea>
            </label>
          </div>
          <button class="primary-button" type="submit">Save today's session</button>
        </form>
        <section class="panel">
          <div class="panel-heading">
            <h2>Assigned Clients</h2>
            <span>${myMembers.length} clients</span>
          </div>
          ${
            myMembers.length
              ? `<div class="card-grid">${myMembers.map(member => memberCard(member, currentTemplateName(member), templates)).join("")}</div>`
              : emptyState("No clients assigned", "Clients are assigned to you from their member profile.")
          }
        </section>
      </div>
    `;
  },

  bind(root, context) {
    const me = context.myTrainer;
    if (!me) return;

    const form = root.querySelector("#session-form");
    if (form) {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        await withButtonLoading(form.querySelector("[type='submit']"), async () => {
          const payload = formData(form);
          payload.trainerId = me.id;
          if (!payload.date) payload.date = today();
          const saved = await context.services.data.save(collections.workoutSessions, payload);
          context.toast("Today's session saved.");
          form.reset();
          // Restore the date default after reset
          const dateInput = form.querySelector("[name='date']");
          if (dateInput) dateInput.value = today();
          context.applyChange(collections.workoutSessions, saved);
        });
      });
    }

    root.querySelectorAll("[data-assign-template]").forEach((select) => {
      select.addEventListener("change", async () => {
        const templateId = select.value;
        if (!templateId) return;
        const memberId = select.dataset.assignTemplate;
        const member = (context.data.members || []).find(m => m.id === memberId);
        if (!member) return;
        select.disabled = true;
        try {
          const saved = await context.services.data.save(collections.assignments, {
            memberId: member.id,
            trainerId: me.id,
            templateId,
            assignedAt: today()
          });
          context.toast("Module assigned.");
          context.applyChange(collections.assignments, saved);
        } finally {
          select.disabled = false;
        }
      });
    });
  }
};

function memberCard(member, templateName, templates) {
  return `
    <article class="item-card">
      <div>
        <strong>${escapeHtml(member.fullName)}</strong>
        <span>${escapeHtml(member.goal || "General")}</span>
      </div>
      <p>${escapeHtml(templateName)}</p>
      <div class="card-footer">
        <select data-assign-template="${escapeHtml(member.id)}">
          <option value="">Assign module...</option>
          ${optionList(templates, "name")}
        </select>
      </div>
    </article>
  `;
}
