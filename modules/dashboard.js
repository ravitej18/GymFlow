import { dateLabel, daysUntil, escapeHtml, memberStatus, money, pageHeader, statusClass } from "./utils.js";

export const dashboardModule = {
  render({ data, settings }) {
    const members = data.members || [];
    const payments = data.payments || [];
    const attendance = data.attendance || [];
    const currency = settings?.currency || "INR";
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);

    const active = members.filter((member) => memberStatus(member) === "Active").length;
    const expiring = members.filter((member) => daysUntil(member.endDate) >= 0 && daysUntil(member.endDate) <= 15).length;
    const expired = members.filter((member) => memberStatus(member) === "Expired").length;
    const revenueToday = payments.filter((payment) => payment.date === today).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const revenueMonth = payments.filter((payment) => String(payment.date || "").startsWith(month)).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const attendanceToday = attendance.filter((record) => record.date === today).length;
    const upcoming = members
      .map((member) => ({ ...member, computedStatus: memberStatus(member), remaining: daysUntil(member.endDate) }))
      .filter((member) => member.remaining <= 30)
      .sort((a, b) => a.remaining - b.remaining)
      .slice(0, 6);

    return `
      ${pageHeader("Dashboard")}
      <div class="metric-grid">
        ${metric("Total Members", members.length)}
        ${metric("Active Members", active)}
        ${metric("Expiring Soon", expiring)}
        ${metric("Expired", expired)}
        ${metric("Revenue Today", money(revenueToday, currency))}
        ${metric("Revenue Month", money(revenueMonth, currency))}
        ${metric("Attendance Today", attendanceToday)}
        ${metric("Pending Payments", payments.filter((payment) => payment.status === "Pending" || payment.status === "Partial").length)}
      </div>

      <div class="split-grid">
        <section class="panel">
          <div class="panel-heading">
            <h2>Renewal Watch</h2>
            <a href="#/renewals">View all</a>
          </div>
          <div class="list-table compact">
            ${upcoming.length ? upcoming.map(renewalRow).join("") : `<div class="table-empty">No upcoming renewals.</div>`}
          </div>
        </section>
        <section class="panel">
          <div class="panel-heading">
            <h2>Revenue Trend</h2>
            <a href="#/reports">Reports</a>
          </div>
          ${renderBars(payments, currency)}
        </section>
      </div>
    `;
  }
};

function metric(label, value) {
  return `
    <article class="metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

function renewalRow(member) {
  return `
    <div class="table-row">
      <span>
        <strong>${escapeHtml(member.fullName)}</strong>
        <small>${dateLabel(member.endDate)}</small>
      </span>
      <span class="status ${statusClass(member.computedStatus)}">${escapeHtml(member.computedStatus)}</span>
    </div>
  `;
}

function renderBars(payments, currency) {
  const lastSix = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    return date.toISOString().slice(0, 7);
  });
  const values = lastSix.map((month) => payments.filter((payment) => String(payment.date || "").startsWith(month)).reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
  const max = Math.max(...values, 1);

  return `
    <div class="bar-chart">
      ${lastSix
        .map(
          (month, index) => `
            <div class="bar-item">
              <div class="bar-track"><span style="height:${Math.max(8, (values[index] / max) * 100)}%"></span></div>
              <small>${month.slice(5)}</small>
              <strong>${money(values[index], currency)}</strong>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}
