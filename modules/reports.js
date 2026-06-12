import { dateLabel, daysUntil, escapeHtml, findName, memberStatus, money, pageHeader } from "./utils.js";

export const reportsModule = {
  render({ data, settings }) {
    const members = data.members || [];
    const payments = data.payments || [];
    const attendance = data.attendance || [];
    const currency = settings?.currency || "INR";
    const revenue = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const active = members.filter((member) => memberStatus(member) === "Active").length;
    const inactive = members.filter((member) => !attendance.some((record) => record.memberId === member.id && daysUntil(record.date) >= -14));

    return `
      ${pageHeader("Reports")}
      <div class="metric-grid">
        <article class="metric"><span>Total revenue</span><strong>${money(revenue, currency)}</strong></article>
        <article class="metric"><span>Active members</span><strong>${active}</strong></article>
        <article class="metric"><span>Attendance records</span><strong>${attendance.length}</strong></article>
        <article class="metric"><span>Inactive 14 days</span><strong>${inactive.length}</strong></article>
      </div>
      <div class="split-grid">
        <section class="panel">
          <div class="panel-heading"><h2>Inactive Members</h2></div>
          <div class="list-table compact">
            ${
              inactive.length
                ? inactive
                    .map(
                      (member) => `
                        <div class="table-row">
                          <span><strong>${escapeHtml(member.fullName)}</strong><small>${escapeHtml(member.mobile || "")}</small></span>
                          <span>${dateLabel(member.endDate)}</span>
                        </div>
                      `
                    )
                    .join("")
                : `<div class="table-empty">No inactive members.</div>`
            }
          </div>
        </section>
        <section class="panel">
          <div class="panel-heading"><h2>Recent Payments</h2></div>
          <div class="list-table compact">
            ${
              payments.length
                ? payments
                    .slice(0, 8)
                    .map(
                      (payment) => `
                        <div class="table-row">
                          <span><strong>${escapeHtml(findName(members, payment.memberId))}</strong><small>${dateLabel(payment.date)}</small></span>
                          <span>${money(payment.amount, currency)}</span>
                        </div>
                      `
                    )
                    .join("")
                : `<div class="table-empty">No payments recorded.</div>`
            }
          </div>
        </section>
      </div>
    `;
  }
};
