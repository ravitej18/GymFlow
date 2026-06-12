import { collections, dateLabel, emptyState, escapeHtml, findName, formData, optionList, pageHeader, today } from "./utils.js";

export const progressModule = {
  render({ data }) {
    const records = data.progress_records || [];
    const members = data.members || [];
    return `
      ${pageHeader("Progress")}
      <div class="work-grid">
        <form class="panel stack" id="progress-form">
          <div class="panel-heading"><h2>Add Progress Record</h2></div>
          <div class="form-grid">
            <label>Member<select name="memberId" required><option value="">Select member</option>${optionList(members, "fullName")}</select></label>
            <label>Date<input name="date" type="date" value="${today()}" required /></label>
            <label>Weight kg<input name="weight" type="number" min="0" step="0.1" /></label>
            <label>BMI<input name="bmi" type="number" min="0" step="0.1" /></label>
            <label>Body fat %<input name="bodyFat" type="number" min="0" step="0.1" /></label>
            <label>Chest cm<input name="chest" type="number" min="0" step="0.1" /></label>
            <label>Waist cm<input name="waist" type="number" min="0" step="0.1" /></label>
            <label class="wide">Notes<textarea name="notes" rows="2"></textarea></label>
          </div>
          <button class="primary-button" type="submit">Save progress</button>
        </form>
        <section class="panel">
          <div class="panel-heading"><h2>Progress History</h2><span>${records.length} records</span></div>
          ${
            records.length
              ? `<div class="data-table">
                  <div class="table-head"><span>Member</span><span>Date</span><span>Weight</span><span>BMI</span><span>Notes</span></div>
                  ${records.map((record) => row(record, members)).join("")}
                </div>`
              : emptyState("No progress records", "Track body measurements and notes over time.")
          }
        </section>
      </div>
    `;
  },
  bind(root, context) {
    const form = root.querySelector("#progress-form");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await context.services.data.save(collections.progress, formData(form));
      context.toast("Progress saved.");
      form.reset();
      form.date.value = today();
      await context.refresh();
    });
  }
};

function row(record, members) {
  return `
    <div class="table-row">
      <span><strong>${escapeHtml(findName(members, record.memberId))}</strong></span>
      <span>${dateLabel(record.date)}</span>
      <span>${escapeHtml(record.weight || "-")}</span>
      <span>${escapeHtml(record.bmi || "-")}</span>
      <span><small>${escapeHtml(record.notes || "")}</small></span>
    </div>
  `;
}
