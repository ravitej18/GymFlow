import { collections, dateLabel, emptyState, escapeHtml, findName, formData, optionList, pageHeader, today } from "./utils.js";

export const attendanceModule = {
  render({ data }) {
    const records = data.attendance || [];
    const members = data.members || [];
    const trainers = data.trainers || [];
    const now = new Date();

    return `
      ${pageHeader("Attendance")}
      <div class="work-grid">
        <form class="panel stack" id="attendance-form">
          <div class="panel-heading"><h2>Check In</h2></div>
          <div class="form-grid">
            <label>Member<select name="memberId" required><option value="">Select member</option>${optionList(members, "fullName")}</select></label>
            <label>Date<input name="date" type="date" value="${today()}" required /></label>
            <label>Time<input name="time" type="time" value="${now.toTimeString().slice(0, 5)}" required /></label>
            <label>Trainer<select name="trainerId"><option value="">Unassigned</option>${optionList(trainers, "name")}</select></label>
          </div>
          <button class="primary-button" type="submit">Record attendance</button>
        </form>
        <section class="panel">
          <div class="panel-heading"><h2>Recent Attendance</h2><span>${records.length} records</span></div>
          ${
            records.length
              ? `<div class="data-table">
                  <div class="table-head"><span>Member</span><span>Date</span><span>Time</span><span>Trainer</span></div>
                  ${records.map((record) => row(record, members, trainers)).join("")}
                </div>`
              : emptyState("No attendance yet", "Record manual check-ins from member search.")
          }
        </section>
      </div>
    `;
  },
  bind(root, context) {
    const form = root.querySelector("#attendance-form");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await context.services.data.save(collections.attendance, formData(form));
      context.toast("Attendance recorded.");
      form.reset();
      form.date.value = today();
      form.time.value = new Date().toTimeString().slice(0, 5);
      await context.refresh();
    });
  }
};

function row(record, members, trainers) {
  return `
    <div class="table-row">
      <span><strong>${escapeHtml(findName(members, record.memberId))}</strong></span>
      <span>${dateLabel(record.date)}</span>
      <span>${escapeHtml(record.time || "-")}</span>
      <span>${escapeHtml(findName(trainers, record.trainerId, "Unassigned"))}</span>
    </div>
  `;
}
