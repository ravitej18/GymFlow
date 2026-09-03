import { dateLabel, emptyState, escapeHtml, findName, getAugmentedPayments, money, pageHeader, statusClass } from "./utils.js";

export const myPaymentsModule = {
  render(context) {
    const me = context.myMember;
    const currency = context.settings?.currency || "INR";
    const plans = context.data.membership_plans || [];
    const allPayments = getAugmentedPayments(context);
    const mine = me
      ? allPayments.filter((payment) => payment.memberId === me.id)
      : [];
    const total = mine.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    return `
      ${pageHeader("My Payments")}
      <div class="metric-grid">
        <article class="metric"><span>Total Paid</span><strong>${money(total, currency)}</strong></article>
        <article class="metric"><span>Payments</span><strong>${mine.length}</strong></article>
      </div>
      <section class="panel">
        <div class="panel-heading"><h2>Payment History</h2><span>${mine.length} records</span></div>
        ${
          mine.length
            ? `<div class="data-table member-payments-table">
                <div class="table-head"><span>Receipt</span><span>Plan</span><span>Amount</span><span>Status</span></div>
                ${mine
                  .map(
                    (payment) => {
                      const origPrice = Number(payment.originalPrice || (payment.amount + (payment.discountAmount || 0)));
                      const discAmt = Number(payment.discountAmount || (origPrice > payment.amount ? origPrice - payment.amount : 0));
                      const discTag = discAmt > 0 ? `<small style="display:block; color:#10b981; font-size:0.75rem; font-weight:600;">(Discount -${money(discAmt, currency)})</small>` : "";
                      return `
                        <div class="table-row">
                          <span><strong>${escapeHtml(payment.receiptNumber || payment.id)}</strong><small>${dateLabel(payment.date)} via ${escapeHtml(payment.method || "-")}</small></span>
                          <span>${escapeHtml(findName(plans, payment.planId))}</span>
                          <span>
                            ${money(payment.amount, currency)}
                            ${discTag}
                          </span>
                          <span><mark class="status ${statusClass(payment.status)}">${escapeHtml(payment.status || "-")}</mark></span>
                        </div>
                      `;
                    }
                  )
                  .join("")}
              </div>`
            : emptyState("No payments yet", "Your payment history will appear here once the gym records a payment.")
        }
      </section>
    `;
  }
};
