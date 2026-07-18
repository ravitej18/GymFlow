import { dateLabel, emptyState, escapeHtml, findName, pageHeader, today } from "./utils.js";

export const myWorkoutModule = {
  render(context) {
    const me = context.myMember;
    if (!me) {
      return `
        ${pageHeader("My Workout")}
        ${emptyState("Membership being set up", "Your workout will appear here once your gym finalises your membership.")}
      `;
    }

    const templates = context.data.workout_templates || [];
    const sessions = context.data.workout_sessions || [];
    const assignments = context.data.workout_assignments || [];
    const basicTemplates = templates
      .filter((template) => template.visibility === "basic" && template.status !== "archived")
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    // Today's session for this member
    const todaySession = sessions.find(s => s.memberId === me.id && s.date === today());

    // Member's assignments newest-first; current = most recent
    const myAssignments = assignments
      .filter(a => a.memberId === me.id)
      .sort((a, b) => String(b.assignedAt || "").localeCompare(String(a.assignedAt || "")));
    const current = myAssignments[0] || null;

    // Build the "Today's Workout" panel
    let todayPanel;
    if (todaySession) {
      const templateName = findName(templates, todaySession.templateId, "");
      todayPanel = `
        <section class="panel stack">
          <div class="panel-heading"><h2>Today's Workout</h2></div>
          ${templateName ? `<p><strong>${escapeHtml(templateName)}</strong></p>` : ""}
          <small>${escapeHtml("Session for " + dateLabel(todaySession.date))}</small>
          <pre>${escapeHtml(todaySession.exercises || "No exercises listed")}</pre>
          ${todaySession.notes ? `<small>${escapeHtml(todaySession.notes)}</small>` : ""}
        </section>
      `;
    } else if (current) {
      const tmpl = templates.find(t => t.id === current.templateId);
      const tmplName = findName(templates, current.templateId, "Assigned template");
      todayPanel = `
        <section class="panel stack">
          <div class="panel-heading"><h2>Today's Workout</h2></div>
          <p><strong>${escapeHtml(tmplName)}</strong></p>
          <small>No session written for today — showing your assigned plan.</small>
          <pre>${escapeHtml(tmpl?.exercises || "No exercises listed")}</pre>
        </section>
      `;
    } else {
      todayPanel = `
        <section class="panel stack">
          <div class="panel-heading"><h2>Today's Workout</h2></div>
          ${emptyState("No workout assigned yet", "Your trainer hasn't assigned a workout plan or written a session yet.")}
        </section>
      `;
    }

    // Build the "Assignment History" panel
    const historyPanel = `
      <section class="panel">
        <div class="panel-heading">
          <h2>Assignment History</h2>
          <span>${myAssignments.length} assignments</span>
        </div>
        ${
          myAssignments.length
            ? `<div class="data-table">
                <div class="table-head"><span>Date</span><span>Template</span></div>
                ${myAssignments.map(a => `
                  <div class="table-row" style="grid-template-columns:1fr 2fr">
                    <span>${escapeHtml(dateLabel(a.assignedAt))}</span>
                    <span>${escapeHtml(findName(templates, a.templateId, "—"))}</span>
                  </div>
                `).join("")}
              </div>`
            : emptyState("No history yet", "Template assignments will be listed here.")
        }
      </section>
    `;

    const basicPanel = `
      <section class="panel">
        <div class="panel-heading">
          <h2>Basic Workouts</h2>
          <span>${basicTemplates.length} modules</span>
        </div>
        ${
          basicTemplates.length
            ? `<div class="card-grid">${basicTemplates.map(basicCard).join("")}</div>`
            : emptyState("No basic workouts yet", "Basic workout modules from your gym will appear here.")
        }
      </section>
    `;

    return `
      ${pageHeader("My Workout")}
      <div class="work-grid">
        ${todayPanel}
        ${historyPanel}
      </div>
      ${basicPanel}
    `;
  }
};

function basicCard(template) {
  return `
    <article class="item-card">
      <div><strong>${escapeHtml(template.name)}</strong><span>${escapeHtml(template.goal || "General")}</span></div>
      <pre>${escapeHtml(template.exercises || "No exercises listed")}</pre>
      ${template.notes ? `<small>${escapeHtml(template.notes)}</small>` : ""}
    </article>
  `;
}
