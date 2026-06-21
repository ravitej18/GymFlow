import { byName, collections, dateLabel, emptyState, escapeHtml, findName, formData, pageHeader, statusClass, withButtonLoading } from "./utils.js";

export const trainersModule = {
  render({ data }) {
    const trainers = [...(data.trainers || [])].sort(byName);

    // Compute current assignment per member (latest assignedAt wins)
    const allAssignments = data.workout_assignments || [];
    const members = data.members || [];
    const templates = data.workout_templates || [];

    // Group assignments by memberId and keep the most recent one per member
    const assignmentByMember = new Map();
    for (const a of allAssignments) {
      const existing = assignmentByMember.get(a.memberId);
      if (!existing || String(a.assignedAt || "").localeCompare(String(existing.assignedAt || "")) > 0) {
        assignmentByMember.set(a.memberId, a);
      }
    }
    const currentAssignments = Array.from(assignmentByMember.values());

    const assignmentOverview = `
      <section class="panel">
        <div class="panel-heading">
          <h2>Workout Assignments</h2>
          <span>${currentAssignments.length} assigned</span>
        </div>
        ${
          currentAssignments.length
            ? `<div class="data-table">
                <div class="table-head">
                  <span>Member</span>
                  <span>Trainer</span>
                  <span>Template</span>
                  <span>Assigned</span>
                </div>
                ${currentAssignments.map(a => `
                  <div class="table-row" style="grid-template-columns:1fr 1fr 1fr auto">
                    <span>${escapeHtml(findName(members, a.memberId, "—"))}</span>
                    <span>${escapeHtml(findName(trainers, a.trainerId, "—"))}</span>
                    <span>${escapeHtml(findName(templates, a.templateId, "—"))}</span>
                    <span>${escapeHtml(dateLabel(a.assignedAt))}</span>
                  </div>
                `).join("")}
              </div>`
            : emptyState("No assignments yet", "Trainers' workout assignments will appear here.")
        }
      </section>
    `;

    return `
      ${pageHeader("Trainers")}
      <div class="work-grid">
        <form class="panel stack" id="trainer-form">
          <input type="hidden" name="id" />
          <div class="panel-heading"><h2>Add Trainer</h2></div>
          <div class="form-grid">
            <label>Name<input name="name" required maxlength="100" /></label>
            <label>Mobile<input name="mobile" required maxlength="20" /></label>
            <label>Email<input name="email" type="email" maxlength="100" /></label>
            <label>Specialization<input name="specialization" maxlength="80" /></label>
            <label>Experience<input name="experience" maxlength="80" /></label>
            <label class="wide">Certifications<textarea name="certifications" rows="2"></textarea></label>
          </div>
          <button class="primary-button" type="submit">Save trainer</button>
        </form>
        <section class="panel">
          <div class="panel-heading"><h2>Trainer Team</h2><span>${trainers.length} trainers</span></div>
          ${
            trainers.length
              ? `<div class="card-grid">${trainers.map(card).join("")}</div>`
              : emptyState("No trainers yet", "Add trainers and assign them to members.")
          }
        </section>
      </div>
      ${assignmentOverview}
    `;
  },
  bind(root, context) {
    const form = root.querySelector("#trainer-form");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await withButtonLoading(form.querySelector("[type='submit']"), async () => {
        const saved = await context.services.data.save(collections.trainers, formData(form));
        context.toast("Trainer saved.");
        form.reset();
        context.applyChange(collections.trainers, saved);
      });
    });
    root.querySelectorAll("[data-approve-trainer]").forEach((button) => {
      button.addEventListener("click", async () => {
        const trainer = context.data.trainers.find((item) => item.id === button.dataset.approveTrainer);
        if (!trainer) return;
        await withButtonLoading(button, async () => {
          const saved = await context.services.data.save(collections.trainers, { ...trainer, status: "Active" });
          context.toast("Trainer approved.");
          context.applyChange(collections.trainers, saved);
        }, "Approving...");
      });
    });

    root.querySelectorAll("[data-edit-trainer]").forEach((button) => {
      button.addEventListener("click", () => {
        const trainer = context.data.trainers.find((item) => item.id === button.dataset.editTrainer);
        Object.entries(trainer || {}).forEach(([key, value]) => {
          if (form.elements[key]) form.elements[key].value = value || "";
        });
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }
};

function card(trainer) {
  const pending = trainer.status === "Pending";
  return `
    <article class="item-card">
      <div>
        <strong>${escapeHtml(trainer.name)}</strong>
        ${pending ? `<mark class="status ${statusClass("Pending")}">Pending</mark>` : `<span>${escapeHtml(trainer.specialization || "General")}</span>`}
      </div>
      <p>${escapeHtml(trainer.mobile || "")}</p>
      <small>${escapeHtml(trainer.experience || "")}</small>
      <div class="card-footer">
        <span>${escapeHtml(trainer.email || "")}</span>
        <span class="row-actions">
          ${pending ? `<button class="icon-button" data-approve-trainer="${escapeHtml(trainer.id)}" title="Approve"><span class="material-symbols-outlined">check_circle</span></button>` : ""}
          <button class="icon-button" data-edit-trainer="${escapeHtml(trainer.id)}" title="Edit"><span class="material-symbols-outlined">edit</span></button>
        </span>
      </div>
    </article>
  `;
}
