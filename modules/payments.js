import { collections, dateLabel, emptyState, escapeHtml, findName, formData, getAugmentedPayments, money, nameCell, optionList, pageHeader, statusClass, today, withButtonLoading } from "./utils.js";

async function _drawReceiptCanvas(payment, member, plan, settings) {
  const DPR    = 2;
  const WIDTH  = 380;
  const CANVAS_H = 510;
  const PADX   = 22;
  const FONT   = '"Courier New", Courier, monospace';
  const _gymName  = (settings?.gymName || 'GymFlow').trim();
  const _currency = settings?.currency || 'INR';

  const C_AMT   = WIDTH - PADX;
  const C_QTY   = WIDTH - 150;
  
  const canvas  = document.createElement('canvas');
  canvas.width  = WIDTH  * DPR;
  canvas.height = CANVAS_H * DPR;
  const ctx     = canvas.getContext('2d');
  ctx.scale(DPR, DPR);

  // Paper base
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, WIDTH, CANVAS_H);

  // Faint paper lines
  for (let gy = 0; gy < CANVAS_H; gy += 3) {
    ctx.strokeStyle = 'rgba(0,0,0,0.012)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(WIDTH, gy); ctx.stroke();
  }

  let y = 25;

  const dSep = () => {
    ctx.save();
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 0.8;
    ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(PADX, y); ctx.lineTo(WIDTH - PADX, y); ctx.stroke();
    ctx.restore();
    y += 14;
  };

  const thickSep = () => {
    ctx.save();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(PADX, y); ctx.lineTo(WIDTH - PADX, y); ctx.stroke();
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(PADX, y + 4); ctx.lineTo(WIDTH - PADX, y + 4); ctx.stroke();
    ctx.restore();
    y += 18;
  };

  // 1. GF Logo Icon
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(WIDTH / 2, y + 15, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = "bold 14px 'Montserrat', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText("GF", WIDTH / 2, y + 20);
  y += 48;

  // 2. Branded Gym Title
  ctx.font      = `bold 18px ${FONT}`;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.fillText(_gymName.toUpperCase(), WIDTH / 2, y);
  y += 24;

  // 3. Receipt Subtitle Decoration
  ctx.font = `9px ${FONT}`;
  ctx.fillStyle = '#555555';
  ctx.fillText('. . . . . . . . . . . . . . . . . . . . . . . . .', WIDTH / 2, y);
  y += 14;
  ctx.font      = `bold 10px ${FONT}`;
  ctx.fillText('* * * *  PAYMENT RECEIPT  * * * *', WIDTH / 2, y);
  y += 22;

  // 4. Metadata
  ctx.font      = `11px ${FONT}`;
  ctx.fillStyle = '#333333';
  ctx.textAlign = 'left';
  ctx.fillText('RECEIPT NO', PADX, y);
  ctx.font      = `bold 11px ${FONT}`;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'right';
  ctx.fillText(payment.receiptNumber || payment.id, WIDTH - PADX, y);
  y += 18;

  ctx.font      = `11px ${FONT}`;
  ctx.fillStyle = '#333333';
  ctx.textAlign = 'left';
  ctx.fillText('DATE', PADX, y);
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'right';
  ctx.fillText(payment.date, WIDTH - PADX, y);
  y += 18;

  ctx.font      = `11px ${FONT}`;
  ctx.fillStyle = '#333333';
  ctx.textAlign = 'left';
  ctx.fillText('METHOD', PADX, y);
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'right';
  ctx.fillText(payment.method.toUpperCase(), WIDTH - PADX, y);
  y += 18;

  dSep();

  // 5. Columns
  ctx.font      = `bold 10px ${FONT}`;
  ctx.fillStyle = '#333333';
  ctx.textAlign = 'left';
  ctx.fillText('PARTICULAR / PLAN', PADX, y);
  ctx.textAlign = 'right';
  ctx.fillText('STATUS', C_QTY, y);
  ctx.fillText('AMOUNT', C_AMT, y);
  y += 18;

  dSep();

  // 6. Particular Line
  ctx.font      = `11px ${FONT}`;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  const planName = (plan?.planName || "Membership Plan").toUpperCase();
  ctx.fillText(planName, PADX, y);
  ctx.textAlign = 'right';
  ctx.fillText(payment.status.toUpperCase(), C_QTY, y);
  ctx.font      = `bold 11px ${FONT}`;
  ctx.fillText(`${_currency} ${payment.amount.toFixed(2)}`, C_AMT, y);
  y += 24;

  dSep();

  // 7. Total Row
  ctx.font      = `bold 15px ${FONT}`;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.fillText('TOTAL PAID', PADX, y + 10);
  ctx.textAlign = 'right';
  ctx.fillText(`${_currency} ${payment.amount.toFixed(2)}`, C_AMT, y + 10);
  y += 28;

  thickSep();

  // 8. Member info
  ctx.font      = `11px ${FONT}`;
  ctx.fillStyle = '#333333';
  ctx.textAlign = 'center';
  ctx.fillText(`MEMBER : ${member?.fullName.toUpperCase() || "N/A"}`, WIDTH / 2, y);
  y += 18;
  if (member?.mobile) {
    ctx.fillText(`MOBILE : ${member.mobile}`, WIDTH / 2, y);
    y += 18;
  }
  dSep();

  // 9. Deco footer
  ctx.font      = `bold 10px ${FONT}`;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.fillText('* THANK YOU FOR YOUR TRUST! *', WIDTH / 2, y);
  y += 16;
  ctx.font      = `9px ${FONT}`;
  ctx.fillStyle = '#555555';
  ctx.fillText('GYMFLOW FITNESS DIRECTORY', WIDTH / 2, y);
  y += 20;

  // 10. Barcode Code 39
  const CODE39 = {
    '0':'000110100','1':'100100001','2':'001100001','3':'101100000',
    '4':'000110001','5':'100110000','6':'001110000','7':'000100101',
    '8':'100100100','9':'001100100','A':'100001001','B':'001001001',
    'C':'101001000','D':'000011001','E':'100011000','F':'001011000',
    'G':'000001101','H':'100001100','I':'001001100','J':'000011100',
    'K':'100000011','L':'001000011','M':'101000010','N':'000010011',
    'O':'100010010','P':'001010010','Q':'000000111','R':'100000110',
    'S':'001000110','T':'000010110','U':'110000001','V':'011000001',
    'W':'111000000','X':'010010001','Y':'110010000','Z':'011010000',
    '-':'000101001','.':'100101000',' ':'001101000','*':'010010100'
  };
  const C39_N = 1, C39_W = 3, C39_GAP = 1;
  const paymentIdStr = String(payment.receiptNumber || payment.id).toUpperCase().replace(/[^A-Z0-9-\. ]/g, '0');
  const c39chars  = ('*' + paymentIdStr + '*').split('');
  
  let c39total = 0;
  c39chars.forEach((ch, ci) => {
    const p = CODE39[ch] ?? CODE39['0'];
    for (const b of p) c39total += b === '1' ? C39_W : C39_N;
    if (ci < c39chars.length - 1) c39total += C39_GAP;
  });

  const barH  = 24;
  const barX0 = PADX + 10;
  const barW  = WIDTH - (PADX + 10) * 2;
  const c39u  = barW / c39total;
  let bx      = barX0;
  ctx.fillStyle = '#000000';
  c39chars.forEach((ch, ci) => {
    const p = CODE39[ch] ?? CODE39['0'];
    p.split('').forEach((bit, i) => {
      const ew = (bit === '1' ? C39_W : C39_N) * c39u;
      if (i % 2 === 0) ctx.fillRect(bx, y, ew - 0.3, barH);
      bx += ew;
    });
    if (ci < c39chars.length - 1) bx += C39_GAP * c39u;
  });
  y += barH + 6;

  ctx.font      = `8px ${FONT}`;
  ctx.fillStyle = '#555555';
  ctx.fillText(`* ${paymentIdStr} *`, WIDTH / 2, y);

  return canvas;
}

export const paymentsModule = {
  activeReceiptPaymentId: null,

  render(context) {
    if (this.activeReceiptPaymentId) {
      return `
        <div class="page-header" style="border-bottom: 1.5px solid var(--line); padding-bottom: 16px; margin-bottom: 20px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <button class="ghost-button compact" id="back-to-payments-btn" style="min-width: unset; padding: 6px 12px; display: inline-flex; align-items: center; gap: 6px; font-weight:600;">
              <span class="material-symbols-outlined" style="font-size: 1.25rem;">arrow_back</span>
              Back to Payments
            </button>
            <h1 style="margin:0; font-size:1.5rem; font-family:'Montserrat',sans-serif; font-weight:800; color:var(--text);">
              Payment Receipt
            </h1>
          </div>
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 30px; align-items: flex-start; justify-content: center; margin-top: 15px;">
          <!-- Receipt Image Preview -->
          <div class="panel" style="max-width: 380px; width: 100%; padding: 0; overflow: hidden; border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--shadow-card); background: #f8f9fa;">
            <img id="receipt-img" alt="Receipt" style="width: 100%; display: block; border-radius: var(--r-lg);" />
          </div>

          <!-- Actions -->
          <div class="panel stack" style="max-width: 320px; width: 100%; padding: 24px; border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--shadow-card); background: var(--surface); gap: 15px;">
            <h3 style="margin: 0; font-size: 1.1rem; color: var(--accent); font-weight: 700; border-bottom: 1.5px solid var(--line); padding-bottom: 8px;">
              Receipt Actions
            </h3>
            <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4; margin: 0;">
              This receipt is generated as a high-resolution PNG image. You can download it directly or share the transaction summary via WhatsApp.
            </p>
            <button class="primary-button" id="download-receipt-btn" style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; font-weight: 600;">
              <span class="material-symbols-outlined">download</span> Download Receipt Image
            </button>
            <button class="primary-button" id="whatsapp-receipt-btn" style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; font-weight: 600; background: #25D366; border-color: #25D366; color: white;">
              <span class="material-symbols-outlined">share</span> Share via WhatsApp
            </button>
          </div>
        </div>
      `;
    }

    this.activeView = this.activeView || "list";

    const { data, settings } = context;
    const payments = getAugmentedPayments(context);
    const members = data.members || [];
    const plans = data.membership_plans || [];
    const currency = settings?.currency || "INR";

    if (this.activeView === "add") {
      return `
        ${pageHeader(
          "Record Payment",
          `<button class="ghost-button" id="cancel-payment-btn" style="display:inline-flex; align-items:center; gap:6px; font-weight:600;">
            <span class="material-symbols-outlined" style="font-size:1.2rem;">arrow_back</span> Back to Payments
          </button>`
        )}
        <form class="panel stack" id="payment-form" style="max-width: 600px; margin: 20px auto;">
          <input type="hidden" name="id" />
          <div class="panel-heading"><h2>Record Member Payment</h2></div>
          <div class="form-grid">
            <label>Member
              <select name="memberId" required>
                <option value="">Select member</option>
                ${members.map(m => `<option value="${m.id}" ${this.prefilledMemberId === m.id ? "selected" : ""}>${escapeHtml(m.fullName)}</option>`).join("")}
              </select>
            </label>
            <label>Membership plan
              <select name="planId" required>
                <option value="">Select plan</option>
                ${plans.map(p => `<option value="${p.id}">${escapeHtml(p.planName)}</option>`).join("")}
              </select>
            </label>
            <label>Amount<input name="amount" type="number" min="0" step="1" required /></label>
            <label>Date<input name="date" type="date" value="${today()}" required /></label>
            <label>Method
              <select name="method">
                <option>Cash</option>
                <option>UPI</option>
                <option>Card</option>
                <option>Bank Transfer</option>
              </select>
            </label>
            <label>Status
              <select name="status">
                <option>Paid</option>
                <option>Pending</option>
                <option>Partial</option>
                <option>Refunded</option>
              </select>
            </label>
            <label>Collected by<input name="collectedBy" value="Owner" maxlength="80" /></label>
            <label class="wide" style="grid-column: span 2;">Notes<textarea name="notes" rows="2" placeholder="Transaction remarks/details (e.g. UPI Ref ID, Cash change details)"></textarea></label>
          </div>
          <div class="button-row" style="margin-top:15px;">
            <button class="primary-button" type="submit">Save payment</button>
            <button class="ghost-button" type="button" id="cancel-payment-btn-2">Cancel</button>
          </div>
        </form>
      `;
    }

    return `
      ${pageHeader(
        "Payments",
        `<button class="primary-button" id="show-add-payment-btn" style="display:inline-flex; align-items:center; gap:6px; font-weight:600;">
          <span class="material-symbols-outlined" style="font-size:1.2rem;">add</span> Record Payment
        </button>`
      )}
      <section class="panel">
        <div class="panel-heading"><h2>Payment History</h2><span>${payments.length} records</span></div>
        ${
          payments.length
            ? `<div class="data-table payments-table">
                <div class="table-head"><span>Receipt</span><span>Member</span><span>Amount</span><span>Status</span><span></span></div>
                ${payments.map((payment) => row(payment, members, plans, currency)).join("")}
              </div>`
            : emptyState("No payments yet", "Record fees, renewals, pending payments, and refunds.")
        }
      </section>
    `;
  },

  bind(root, context) {
    const payments = getAugmentedPayments(context);

    if (this.activeReceiptPaymentId) {
      const payment = payments.find((item) => item.id === this.activeReceiptPaymentId);
      const member = context.data.members.find((item) => item.id === payment?.memberId);
      const plan = context.data.membership_plans.find((item) => item.id === payment?.planId);

      if (payment) {
        _drawReceiptCanvas(payment, member, plan, context.settings).then(canvas => {
          const img = root.querySelector("#receipt-img");
          if (img) img.src = canvas.toDataURL("image/png");

          root.querySelector("#download-receipt-btn")?.addEventListener("click", () => {
            canvas.toBlob(blob => {
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `receipt-${payment.receiptNumber || payment.id}.png`;
              a.click();
              URL.revokeObjectURL(url);
            }, "image/png");
          });

          root.querySelector("#whatsapp-receipt-btn")?.addEventListener("click", () => {
            const currency = context.settings?.currency || "INR";
            const phone = member?.whatsapp || member?.mobile || "";
            const formattedPhone = phone.replace(/[^0-9]/g, "");
            const gymName = context.settings?.gymName || "GymFlow";

            const text = `*Receipt from ${gymName}*\n\n` +
              `*Receipt No:* ${payment.receiptNumber || payment.id}\n` +
              `*Member:* ${member?.fullName || "Custom"}\n` +
              `*Plan:* ${plan?.planName || "Custom"}\n` +
              `*Amount:* ${money(payment.amount, currency)}\n` +
              `*Date:* ${dateLabel(payment.date)}\n` +
              `*Payment Method:* ${payment.method}\n` +
              `*Status:* ${payment.status}\n` +
              `${payment.notes ? `*Remarks:* ${payment.notes}\n` : ""}\n` +
              `Thank you for your payment!`;

            const waUrl = `https://wa.me/${formattedPhone ? formattedPhone : ""}?text=${encodeURIComponent(text)}`;
            window.open(waUrl, "_blank");
          });
        });
      }

      root.querySelector("#back-to-payments-btn")?.addEventListener("click", () => {
        this.activeReceiptPaymentId = null;
        context.refreshView();
      });
      return;
    }

    if (this.activeView === "add") {
      const form = root.querySelector("#payment-form");
      if (!form) return;

      const handleMemberChange = () => {
        const member = context.data.members.find((item) => item.id === form.memberId.value);
        if (member?.planId) {
          form.planId.value = member.planId;
          const plan = context.data.membership_plans.find((item) => item.id === member.planId);
          if (plan) form.amount.value = plan.price || 0;
        }
      };

      form.memberId.addEventListener("change", handleMemberChange);

      form.planId.addEventListener("change", () => {
        const plan = context.data.membership_plans.find((item) => item.id === form.planId.value);
        if (plan) form.amount.value = plan.price || 0;
      });

      // If we have a prefilled member, run selection logic immediately
      if (this.prefilledMemberId) {
        handleMemberChange();
      }

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const payload = formData(form);
        payload.amount = Number(payload.amount);
        payload.receiptNumber = payload.receiptNumber || `RCPT-${Date.now().toString().slice(-8)}`;
        await withButtonLoading(form.querySelector("[type='submit']"), async () => {
          const saved = await context.services.data.save(collections.payments, payload);
          context.toast("Payment saved.");
          this.activeView = "list";
          this.prefilledMemberId = null;
          form.reset();
          context.applyChange(collections.payments, saved);
        });
      });

      const handleCancel = () => {
        this.activeView = "list";
        this.prefilledMemberId = null;
        context.refreshView();
      };

      root.querySelector("#cancel-payment-btn")?.addEventListener("click", handleCancel);
      root.querySelector("#cancel-payment-btn-2")?.addEventListener("click", handleCancel);
      return;
    }

    // List view bindings
    root.querySelector("#show-add-payment-btn")?.addEventListener("click", () => {
      this.activeView = "add";
      context.refreshView();
    });

    root.querySelectorAll("[data-receipt]").forEach((button) => {
      button.addEventListener("click", () => {
        this.activeReceiptPaymentId = button.dataset.receipt;
        context.refreshView();
      });
    });

    root.querySelectorAll("[data-share-receipt]").forEach((button) => {
      button.addEventListener("click", () => {
        const payment = payments.find((item) => item.id === button.dataset.shareReceipt);
        const member = context.data.members.find((item) => item.id === payment?.memberId);
        const plan = context.data.membership_plans.find((item) => item.id === payment?.planId);
        if (!payment || !member) return;
        
        const currency = context.settings?.currency || "INR";
        const phone = member.whatsapp || member.mobile || "";
        const formattedPhone = phone.replace(/[^0-9]/g, "");
        
        const text = `*Receipt from ${context.settings?.gymName || "GymFlow"}*\n\n` +
          `*Receipt No:* ${payment.receiptNumber || payment.id}\n` +
          `*Member:* ${member.fullName}\n` +
          `*Plan:* ${plan?.planName || "Custom"}\n` +
          `*Amount:* ${money(payment.amount, currency)}\n` +
          `*Date:* ${dateLabel(payment.date)}\n` +
          `*Payment Method:* ${payment.method}\n` +
          `*Status:* ${payment.status}\n` +
          `${payment.notes ? `*Remarks:* ${payment.notes}\n` : ""}\n` +
          `Thank you for your payment!`;

        const waUrl = `https://wa.me/${formattedPhone ? formattedPhone : ""}?text=${encodeURIComponent(text)}`;
        window.open(waUrl, "_blank");
      });
    });
  }
};
 
function row(payment, members, plans, currency) {
  const planName = findName(plans, payment.planId);
  const method = escapeHtml(payment.method || "-");
  const noteSuffix = payment.notes ? ` · ${escapeHtml(payment.notes)}` : "";
  return `
    <div class="table-row">
      <span data-label="Receipt">
        <strong>${escapeHtml(payment.receiptNumber || payment.id)}</strong>
        <small class="row-meta">${dateLabel(payment.date)} · ${method} · ${escapeHtml(planName)}${noteSuffix}</small>
      </span>
      <span data-label="Member">${nameCell(findName(members, payment.memberId), "", members.find(m => m.id === payment.memberId)?.avatarUrl || "")}</span>
      <span data-label="Amount">${money(payment.amount, currency)}</span>
      <span data-label="Status"><mark class="status ${statusClass(payment.status)}">${escapeHtml(payment.status)}</mark></span>
      <span class="row-actions">
        <button class="icon-btn" data-receipt="${escapeHtml(payment.id)}" title="View Receipt"><span class="material-symbols-outlined">receipt_long</span></button>
        <button class="icon-btn" data-share-receipt="${escapeHtml(payment.id)}" title="Share via WhatsApp"><span class="material-symbols-outlined">share</span></button>
      </span>
    </div>
  `;
}
