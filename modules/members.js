import { addDays, byName, collections, confirmDialog, dateLabel, emptyState, escapeHtml, findName, formData, memberStatus, nameCell, normalizePhone10, optionList, pageHeader, renderMemberProfileDetail, bindMemberProfileDetail, statusClass, today, withButtonLoading, cmToFeetInches, feetInchesToCm, calcBmi, bmiCategory, renderSharedMemberFields, bindSharedBmiEvents } from "./utils.js";

function renderMemberForm(member, plans, trainers) {
  const isEdit = !!member;
  const emailValue = (member?.email && member.email.endsWith("@gymflow.app")) ? "" : (member?.email || "");
  return `
    <div class="page-header" style="border-bottom: 1.5px solid var(--line); padding-bottom: 16px; margin-bottom: 15px;">
      <div style="display:flex; align-items:center; gap:12px;">
        <button class="ghost-button compact" id="cancel-form-btn" style="min-width: unset; padding: 6px 12px; display: inline-flex; align-items: center; gap: 6px; font-weight:600;">
          <span class="material-symbols-outlined" style="font-size: 1.25rem;">arrow_back</span>
          Cancel
        </button>
        <h1 style="margin:0; font-size:1.5rem; font-family:'Montserrat',sans-serif; font-weight:800; color:var(--text);">
          ${isEdit ? "Edit Member" : "Add New Member"}
        </h1>
      </div>
    </div>
    <form class="panel stack" id="member-form" style="max-width: 800px; margin-top:15px; padding: 24px; background:var(--surface); border-radius:var(--r-lg); border:1px solid var(--line); box-shadow:var(--shadow-card);">
      <input type="hidden" name="id" value="${member?.id || ""}" />
      <div class="form-grid">
        <label>Full name<input name="fullName" required maxlength="100" value="${escapeHtml(member?.fullName || "")}" /></label>
        <label>Mobile
          <input name="mobile" required maxlength="10" value="${escapeHtml(member?.mobile || "")}" />
          <span class="dup-warn hidden" data-dup-warn="mobile"></span>
        </label>
        <label>Email
          <input name="email" type="email" maxlength="100" value="${escapeHtml(emailValue)}" />
          <span class="dup-warn hidden" data-dup-warn="email"></span>
        </label>
        
        <label>Join date<input name="joinDate" type="date" value="${member?.joinDate || today()}" /></label>
        <label>Membership plan
          <select name="planId" required>
            <option value="">Select plan</option>
            ${plans.map(p => `<option value="${p.id}" ${member?.planId === p.id ? "selected" : ""}>${escapeHtml(p.planName)}</option>`).join("")}
          </select>
        </label>
        <label>Assigned trainer
          <select name="assignedTrainer">
            <option value="">Unassigned</option>
            ${trainers.map(t => `<option value="${t.id}" ${member?.assignedTrainer === t.id ? "selected" : ""}>${escapeHtml(t.name)}</option>`).join("")}
          </select>
        </label>
        <label>Start date<input name="startDate" type="date" value="${member?.startDate || today()}" required /></label>
        <label>End date<input name="endDate" type="date" value="${member?.endDate || ""}" required /></label>
        ${isEdit ? `
        <label>Status
          <select name="status">
            <option ${member?.status === "Active" ? "selected" : ""}>Active</option>
            <option ${member?.status === "Suspended" ? "selected" : ""}>Suspended</option>
            <option ${member?.status === "Expired" ? "selected" : ""}>Expired</option>
            <option ${member?.status === "Paused" ? "selected" : ""}>Paused</option>
          </select>
        </label>
        ` : ""}
        ${renderSharedMemberFields(member || {})}
      </div>

      <!-- Pricing & Discount Customization Panel -->
      <div style="margin-top: 18px; padding: 18px; background: var(--surface-2, rgba(255,255,255,0.03)); border-radius: var(--r-md); border: 1.5px dashed var(--line);">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 12px; flex-wrap:wrap; gap:8px;">
          <h3 style="margin: 0; font-size: 1rem; font-weight: 700; display: flex; align-items: center; gap: 8px; color: var(--text);">
            <span class="material-symbols-outlined" style="font-size: 1.2rem; color: var(--primary);">sell</span>
            Pricing &amp; Discount Offer
          </h3>
          <span style="font-size: 0.8rem; color: var(--text-muted);">Customize plan fee or apply percentage/amount discount</span>
        </div>
        <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
          <label>Discount / Pricing Rule
            <select name="discountType" id="discount-type-select">
              <option value="none" ${member?.discountType === "none" || !member?.discountType ? "selected" : ""}>Standard Plan Price (No Discount)</option>
              <option value="percentage" ${member?.discountType === "percentage" ? "selected" : ""}>Percentage Discount (%)</option>
              <option value="fixed" ${member?.discountType === "fixed" ? "selected" : ""}>Fixed Reduction Amount (₹ Off)</option>
              <option value="custom" ${member?.discountType === "custom" ? "selected" : ""}>Custom Fee (Direct Override)</option>
            </select>
          </label>
          <label id="discount-val-group" class="${(member?.discountType && member?.discountType !== "none") ? "" : "hidden"}">
            <span id="discount-val-label">Discount Value</span>
            <input name="discountValue" type="number" id="discount-val-input" min="0" step="any" placeholder="0" value="${member?.discountValue ?? 0}" />
          </label>
          <label>Payment Method
            <select name="paymentMethod">
              <option value="Cash" ${member?.paymentMethod === "Cash" ? "selected" : ""}>Cash</option>
              <option value="UPI" ${member?.paymentMethod === "UPI" ? "selected" : ""}>UPI</option>
              <option value="Card" ${member?.paymentMethod === "Card" ? "selected" : ""}>Card</option>
              <option value="Bank Transfer" ${member?.paymentMethod === "Bank Transfer" ? "selected" : ""}>Bank Transfer</option>
            </select>
          </label>
          <label>Payment Status
            <select name="paymentStatus">
              <option value="Paid" ${(member?.paymentStatus || "Paid") === "Paid" ? "selected" : ""}>Paid</option>
              <option value="Pending" ${member?.paymentStatus === "Pending" ? "selected" : ""}>Pending</option>
            </select>
          </label>
        </div>

        <!-- Live Price Calculation Box -->
        <div id="price-calc-box" style="margin-top: 14px; padding: 14px 18px; background: var(--surface); border-radius: var(--r-sm); border: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">
              Standard Plan Price: <span id="calc-std-price" style="font-weight: 700; color: var(--text);">₹0</span>
            </div>
            <div id="calc-discount-row" style="font-size: 0.85rem; color: #10b981; font-weight: 600; margin-top: 2px; display: none;">
              Discount Applied: <span id="calc-discount-amount">-₹0</span>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Final Payable Price</div>
            <div id="calc-final-price" style="font-size: 1.35rem; font-weight: 800; color: var(--primary);">₹0</div>
          </div>
        </div>
      </div>

      <label class="wide checkbox-label" style="margin-top: 14px;">
        <input type="checkbox" name="whatsappOptIn" value="true" ${(isEdit ? member.whatsappOptIn : true) ? "checked" : ""} />
        Consent to WhatsApp reminders about membership &amp; renewals
      </label>
      <label class="wide checkbox-label">
        <input type="checkbox" name="privateLeaderboard" value="true" ${member?.privateLeaderboard ? "checked" : ""} />
        Hide me from leaderboards (Private Profile)
      </label>
      <div class="button-row" style="margin-top: 15px;">
        <button class="primary-button" type="submit">Save Member</button>
        <button class="ghost-button" type="button" id="cancel-form-btn-2">Cancel</button>
      </div>
    </form>
  `;
}

export const membersModule = {
  activeView: "list",
  activeMemberId: null,

  render(context) {
    if (!this.activeView) this.activeView = "list";

    if (this.activeView === "detail" && this.activeMemberId) {
      const member = context.data.members.find((item) => item.id === this.activeMemberId);
      if (member) {
        return renderMemberProfileDetail(member, context);
      } else {
        this.activeView = "list";
        this.activeMemberId = null;
      }
    }

    const { data } = context;
    const plans = data.membership_plans || [];
    const trainers = data.trainers || [];

    if (this.activeView === "add" || this.activeView === "edit") {
      const member = this.activeView === "edit" ? data.members.find(m => m.id === this.activeMemberId) : null;
      return renderMemberForm(member, plans, trainers);
    }

    // Roster directory view
    const members = [...(data.members || [])].sort(byName);

    // Compute streaks and points metrics
    let maxStreak = 0;
    let streakLeaderName = "None";
    let maxPoints = 0;
    let topPointsName = "None";
    let totalPoints = 0;
    let streakSum = 0;

    members.forEach(m => {
      const streak = Number(m.currentStreak || 0);
      const pts = Number(m.points || 0);
      totalPoints += pts;
      streakSum += streak;

      if (streak > maxStreak) {
        maxStreak = streak;
        streakLeaderName = m.fullName || "M";
      }
      if (pts > maxPoints) {
        maxPoints = pts;
        topPointsName = m.fullName || "M";
      }
    });

    const avgStreak = members.length ? streakSum / members.length : 0;

    return `
      ${pageHeader(
        "Members",
        `<button class="primary-button" id="show-add-form-btn" style="display:inline-flex; align-items:center; gap:6px; font-weight:600;">
          <span class="material-symbols-outlined" style="font-size:1.2rem;">add</span> Add Member
        </button>`
      )}

      <!-- Roster Summary Metrics -->
      ${members.length ? `
        <div class="metric-grid" style="margin-top: 15px;">
          <article class="metric">
            <span>Active Streak Leader</span>
            <strong>${escapeHtml(streakLeaderName)}</strong>
            <small style="color: var(--warning); font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
              <span class="material-symbols-outlined" style="font-size: 0.95rem; font-variation-settings: 'FILL' 1;">local_fire_department</span>
              ${maxStreak} day streak
            </small>
          </article>
          <article class="metric">
            <span>Top Points Scorer</span>
            <strong>${escapeHtml(topPointsName)}</strong>
            <small style="color: var(--teal-ink); font-weight: 600;">${maxPoints} consistency points</small>
          </article>
          <article class="metric">
            <span>Gym Average Streak</span>
            <strong>${avgStreak.toFixed(1)} Days</strong>
            <small style="color: var(--text-muted);">Current active attendance</small>
          </article>
          <article class="metric">
            <span>Total Points Ledger</span>
            <strong>${totalPoints.toLocaleString()}</strong>
            <small style="color: var(--text-muted);">Points earned by all members</small>
          </article>
        </div>
      ` : ""}

      <section class="panel" style="margin-top: 15px;">
        <div class="panel-heading">
          <h2>Member Directory</h2>
          <span data-member-count>${members.length} total</span>
        </div>
        ${
          members.length
            ? `
              <div class="filter-bar">
                <label>Search
                  <span class="search-field">
                    <span class="material-symbols-outlined">search</span>
                    <input type="search" data-filter="search" placeholder="Name, mobile, or email" />
                  </span>
                </label>
                <label>Status
                  <select data-filter="status">
                    <option value="">All statuses</option>
                    <option>Pending</option>
                    <option>Active</option>
                    <option>Expiring Soon</option>
                    <option>Expired</option>
                    <option>Paused</option>
                    <option>Suspended</option>
                  </select>
                </label>
                <label>Plan
                  <select data-filter="plan">
                    <option value="">All plans</option>
                    ${optionList(plans, "planName")}
                  </select>
                </label>
                <label>Trainer
                  <select data-filter="trainer">
                    <option value="">All trainers</option>
                    ${optionList(trainers, "name")}
                  </select>
                </label>
                <label>Sort By
                  <select data-filter="sort">
                    <option value="name">Name (A-Z)</option>
                    <option value="streak">Active Streak (Highest)</option>
                    <option value="points">Points (Highest)</option>
                    <option value="expiry">Expiry Date (Soonest)</option>
                  </select>
                </label>
              </div>
              <div class="data-table members-table" data-member-list>
                <div class="table-head">
                  <span>Name</span>
                  <span>Plan</span>
                  <span>Expiry</span>
                  <span style="text-align: center;">Consistency</span>
                  <span style="text-align: center;">Points</span>
                  <span>Status</span>
                  <span></span>
                </div>
                ${members.map((member) => row(member, plans, trainers)).join("")}
              </div>`
            : emptyState("No members yet", "Add your first member to start tracking plans, payments, and renewals.")
        }
      </section>

      <form class="panel stack hidden" id="pause-form" style="max-width: 500px; margin-top: 20px; border: 1px solid var(--line); box-shadow: var(--shadow-card);">
        <input type="hidden" name="pauseId" />
        <input type="hidden" name="memberId" />
        <div class="panel-heading"><h2 data-pause-heading>Pause Membership</h2></div>
        <p class="panel-hint" data-pause-member-name style="font-weight:600"></p>
        <div class="form-grid" id="pause-fields">
          <label>Pause from<input name="pauseStart" type="date" required /></label>
          <label>Expected return<input name="returnDate" type="date" required /></label>
          <label class="wide">Reason<input name="reason" maxlength="120" placeholder="Injury, travel, etc." /></label>
        </div>
        <div class="form-grid hidden" id="resume-fields">
          <label class="wide">Actual return date<input name="actualReturn" type="date" /></label>
        </div>
        <div class="button-row">
          <button class="primary-button" type="submit" data-pause-submit>Confirm pause</button>
          <button class="ghost-button" type="button" data-action="cancel-pause">Cancel</button>
        </div>
      </form>
    `;
  },

  bind(root, context) {
    if (!this.activeView) this.activeView = "list";

    // ── DETAIL VIEW BINDING ──────────────────────────────────────────────────
    if (this.activeView === "detail") {
      const member = context.data.members.find((item) => item.id === this.activeMemberId);
      if (member) {
        bindMemberProfileDetail(
          root,
          member,
          context,
          () => {
            this.activeView = "list";
            this.activeMemberId = null;
            context.refreshView();
          },
          () => {
            this.activeView = "edit";
            context.refreshView();
          }
        );
      }
      return;
    }

    // ── ADD / EDIT FORM BINDING ──────────────────────────────────────────────
    if (this.activeView === "add" || this.activeView === "edit") {
      const form = root.querySelector("#member-form");
      if (!form) return;

      const currency = context.settings?.currency || "INR";

      const updatePriceCalculation = () => {
        const plan = context.data.membership_plans.find((item) => item.id === form.planId.value);
        const stdPrice = plan ? Number(plan.price || 0) : 0;
        
        const type = form.discountType?.value || "none";
        const valInput = form.discountValue;
        const valGroup = root.querySelector("#discount-val-group");
        const valLabel = root.querySelector("#discount-val-label");
        const stdPriceEl = root.querySelector("#calc-std-price");
        const discRow = root.querySelector("#calc-discount-row");
        const discAmtEl = root.querySelector("#calc-discount-amount");
        const finalPriceEl = root.querySelector("#calc-final-price");

        if (type === "none") {
          valGroup?.classList.add("hidden");
        } else {
          valGroup?.classList.remove("hidden");
          if (type === "percentage") {
            if (valLabel) valLabel.textContent = "Discount Percentage (%)";
            if (valInput) valInput.placeholder = "e.g. 10 for 10%";
          } else if (type === "fixed") {
            if (valLabel) valLabel.textContent = "Reduction Amount (₹ Off)";
            if (valInput) valInput.placeholder = "e.g. 500 for ₹500 off";
          } else if (type === "custom") {
            if (valLabel) valLabel.textContent = "Custom Fee (Direct Override)";
            if (valInput) valInput.placeholder = "e.g. 1500 for ₹1500 total";
          }
        }

        let val = Math.max(0, Number(valInput?.value) || 0);
        let discAmount = 0;
        let finalPrice = stdPrice;

        if (type === "percentage") {
          val = Math.min(100, val);
          discAmount = (stdPrice * val) / 100;
          finalPrice = Math.max(0, stdPrice - discAmount);
        } else if (type === "fixed") {
          discAmount = Math.min(stdPrice, val);
          finalPrice = Math.max(0, stdPrice - discAmount);
        } else if (type === "custom") {
          finalPrice = val;
          discAmount = Math.max(0, stdPrice - finalPrice);
        }

        if (stdPriceEl) stdPriceEl.textContent = `${currency} ${stdPrice.toLocaleString()}`;
        if (finalPriceEl) finalPriceEl.textContent = `${currency} ${finalPrice.toLocaleString()}`;
        
        if (discRow && discAmtEl) {
          if (discAmount > 0) {
            discRow.style.display = "block";
            discAmtEl.textContent = `- ${currency} ${discAmount.toLocaleString()} ${type === "percentage" ? `(${val}% Off)` : ""}`;
          } else {
            discRow.style.display = "none";
          }
        }
      };

      form.planId.addEventListener("change", () => {
        const plan = context.data.membership_plans.find((item) => item.id === form.planId.value);
        if (plan && form.startDate.value) {
          form.endDate.value = addDays(form.startDate.value, plan.durationDays);
        }
        updatePriceCalculation();
      });

      form.discountType?.addEventListener("change", updatePriceCalculation);
      form.discountValue?.addEventListener("input", updatePriceCalculation);

      // Run initial calculation
      updatePriceCalculation();

      form.startDate.addEventListener("change", () => {
        const plan = context.data.membership_plans.find((item) => item.id === form.planId.value);
        if (plan) form.endDate.value = addDays(form.startDate.value, plan.durationDays);
      });

      bindSharedBmiEvents(form);

      const dupWarnMobile = form.querySelector('[data-dup-warn="mobile"]');
      const dupWarnEmail  = form.querySelector('[data-dup-warn="email"]');

      function showDupWarn(el, m) {
        if (!el) return;
        if (m) {
          el.textContent = `⚠ Already registered: ${m.fullName}`;
          el.classList.remove("hidden");
        } else {
          el.textContent = "";
          el.classList.add("hidden");
        }
      }

      form.mobile?.addEventListener("blur", () => {
        const val    = normalizePhone10(form.mobile.value);
        const editId = form.elements['id']?.value || "";
        const match  = val
          ? context.data.members.find(m => normalizePhone10(m.mobile) === val && m.id !== editId)
          : null;
        showDupWarn(dupWarnMobile, match);
      });

      form.email?.addEventListener("blur", () => {
        const val    = form.email.value.trim().toLowerCase();
        const editId = form.elements['id']?.value || "";
        const match  = val
          ? context.data.members.find(m => m.email?.trim().toLowerCase() === val && m.id !== editId)
          : null;
        showDupWarn(dupWarnEmail, match);
      });

      let lastMobileSync = "";
      form.mobile?.addEventListener("input", () => {
        const whatsappEl = form.elements.whatsappNumber;
        if (!whatsappEl) return;
        if (!whatsappEl.value || whatsappEl.value === lastMobileSync) {
          whatsappEl.value = form.mobile.value;
        }
        lastMobileSync = form.mobile.value;
      });

      const handleCancel = () => {
        if (this.activeView === "edit") {
          this.activeView = "detail";
        } else {
          this.activeView = "list";
          this.activeMemberId = null;
        }
        context.refreshView();
      };

      root.querySelector("#cancel-form-btn")?.addEventListener("click", handleCancel);
      root.querySelector("#cancel-form-btn-2")?.addEventListener("click", handleCancel);

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const payload = formData(form);
        if (payload.mobile) {
          payload.mobile = normalizePhone10(payload.mobile);
        }
        if (payload.whatsappNumber) {
          payload.whatsappNumber = normalizePhone10(payload.whatsappNumber);
        } else if (payload.mobile) {
          payload.whatsappNumber = payload.mobile;
        }
        if (!payload.email && payload.mobile) {
          payload.email = `${payload.mobile}@gymflow.app`;
        }
        payload.whatsappOptIn = payload.whatsappOptIn === "true";
        payload.privateLeaderboard = payload.privateLeaderboard === "true";
        if (payload.endDate && payload.startDate && payload.endDate < payload.startDate) {
          context.toast("End date can't be before the start date.");
          return;
        }
        const isNew = !payload.id;
        const measurements = {
          weight:  payload.initWeight  || "",
          bmi:     payload.initBmi     || "",
          bodyFat: payload.initBodyFat || "",
          waist:   payload.initWaist   || "",
          chest:   payload.initChest   || "",
          hip:     payload.initHip     || "",
          bicep:   payload.initBicep   || "",
          thigh:   payload.initThigh   || ""
        };
        const hasMeasurements = Object.values(measurements).some((v) => v !== "");
        payload.status = payload.status === "Suspended" ? "Suspended" : memberStatus(payload);
        
        // Calculate price and discount values for member & payment record
        const plan = context.data.membership_plans.find((p) => p.id === payload.planId);
        const stdPrice = plan ? Number(plan.price || 0) : 0;
        const discType = payload.discountType || "none";
        const discVal = Math.max(0, Number(payload.discountValue) || 0);

        let discAmount = 0;
        let finalPrice = stdPrice;

        if (discType === "percentage") {
          const pct = Math.min(100, discVal);
          discAmount = (stdPrice * pct) / 100;
          finalPrice = Math.max(0, stdPrice - discAmount);
        } else if (discType === "fixed") {
          discAmount = Math.min(stdPrice, discVal);
          finalPrice = Math.max(0, stdPrice - discAmount);
        } else if (discType === "custom") {
          finalPrice = discVal;
          discAmount = Math.max(0, stdPrice - finalPrice);
        }

        payload.originalPrice = stdPrice;
        payload.discountType = discType;
        payload.discountValue = discVal;
        payload.discountAmount = discAmount;
        payload.customPrice = finalPrice;
        payload.paymentMethod = payload.paymentMethod || "Cash";
        payload.paymentStatus = payload.paymentStatus || "Paid";

        await withButtonLoading(form.querySelector("[type='submit']"), async () => {
          const saved = await context.services.data.save(collections.members, payload);
          if (isNew && hasMeasurements) {
            const progressRecord = {
              memberId: saved.id,
              date:    payload.joinDate || today(),
              weight:  measurements.weight,
              bmi:     measurements.bmi,
              bodyFat: measurements.bodyFat,
              waist:   measurements.waist,
              chest:   measurements.chest,
              hip:     measurements.hip,
              bicep:   measurements.bicep,
              thigh:   measurements.thigh,
              notes:   "Initial admission measurement"
            };
            const savedProgress = await context.services.data.save(collections.progress, progressRecord);
            context.applyChange(collections.progress, savedProgress);
          }

          if (isNew && saved.planId) {
            let noteText = `Admission payment for ${plan ? plan.planName : "plan"}`;
            if (discAmount > 0) {
              if (discType === "percentage") {
                noteText += ` (${discVal}% discount applied: -${currency} ${discAmount})`;
              } else if (discType === "fixed") {
                noteText += ` (Fixed reduction of ${currency} ${discVal} applied)`;
              } else if (discType === "custom") {
                noteText += ` (Custom fee offer applied: ${currency} ${finalPrice})`;
              }
            } else {
              noteText += ` (Standard plan price)`;
            }

            const paymentRecord = {
              memberId: saved.id,
              planId: saved.planId,
              originalPrice: stdPrice,
              discountType: discType,
              discountValue: discVal,
              discountAmount: discAmount,
              amount: finalPrice,
              date: saved.startDate || today(),
              method: payload.paymentMethod || "Cash",
              collectedBy: context.profile?.name || "Owner",
              status: payload.paymentStatus || "Paid",
              receiptNumber: `RCPT-${Date.now().toString().slice(-8)}`,
              notes: noteText
            };
            const savedPayment = await context.services.data.save(collections.payments, paymentRecord);
            context.applyChange(collections.payments, savedPayment);
          }

          context.toast(isNew ? "Member added." : "Member updated.");
          context.applyChange(collections.members, saved);

          if (isNew) {
            this.activeView = "list";
            this.activeMemberId = null;
            setTimeout(async () => {
              const ok = await confirmDialog({
                title: `Invite ${saved.fullName}?`,
                body: `Would you like to send a WhatsApp invitation to join GymFlow now?`,
                confirmText: "Send Invite",
                danger: false
              });
              if (ok) {
                const gymName = context.settings?.gymName || "our Gym";
                const gymCode = context.settings?.gymCode || "";
                const appUrl = window.location.origin + window.location.pathname;
                const normalizedMob = normalizePhone10(saved.mobile);
                const inviteText = `Hello ${saved.fullName}! Welcome to ${gymName}.\n\nTo register and access your workouts, schedules, and consistency points, please open the GymFlow App and set your password:\n${appUrl}#register?invite=${saved.id}&phone=${normalizedMob}&code=${gymCode}`;
                const waUrl = `https://wa.me/${encodeURIComponent(normalizedMob)}?text=${encodeURIComponent(inviteText)}`;
                window.open(waUrl, "_blank", "noopener,noreferrer");
              }
            }, 100);
          } else {
            this.activeView = "detail";
          }
          context.refreshView();
        });
      });
      return;
    }

    // ── LIST VIEW BINDING ────────────────────────────────────────────────────
    root.querySelector("#show-add-form-btn")?.addEventListener("click", () => {
      this.activeView = "add";
      context.refreshView();
    });

    bindFilters(root);

    // Bind Sorting
    const sortSelect = root.querySelector("[data-filter='sort']");
    sortSelect?.addEventListener("change", () => {
      const listEl = root.querySelector("[data-member-list]");
      if (!listEl) return;
      const rows = Array.from(listEl.querySelectorAll("[data-row]"));
      const sortVal = sortSelect.value;

      rows.sort((a, b) => {
        if (sortVal === "streak") {
          return Number(b.dataset.streak || 0) - Number(a.dataset.streak || 0);
        } else if (sortVal === "points") {
          return Number(b.dataset.points || 0) - Number(a.dataset.points || 0);
        } else if (sortVal === "expiry") {
          const expA = a.dataset.expiry || "9999-12-31";
          const expB = b.dataset.expiry || "9999-12-31";
          return expA.localeCompare(expB);
        } else {
          return String(a.dataset.name || "").localeCompare(String(b.dataset.name || ""));
        }
      });

      // Re-append sorted rows to the list container (preserves elements, re-orders DOM)
      rows.forEach(rowEl => listEl.appendChild(rowEl));
    });

    root.querySelectorAll("[data-view-member]").forEach((button) => {
      button.addEventListener("click", () => {
        this.activeMemberId = button.dataset.viewMember;
        this.activeView = "detail";
        context.refreshView();
      });
    });

    root.querySelectorAll("[data-invite-member]").forEach((button) => {
      button.addEventListener("click", () => {
        const member = context.data.members.find((item) => item.id === button.dataset.inviteMember);
        if (!member) return;
        const gymName = context.settings?.gymName || "our Gym";
        const gymCode = context.settings?.gymCode || "";
        const appUrl = window.location.origin + window.location.pathname;
        const normalizedMob = normalizePhone10(member.mobile);
        const inviteText = `Hello ${member.fullName}! Welcome to ${gymName}.\n\nTo register and access your workouts, schedules, and consistency points, please open the GymFlow App and set your password:\n${appUrl}#register?invite=${member.id}&phone=${normalizedMob}&code=${gymCode}`;
        const waUrl = `https://wa.me/${encodeURIComponent(normalizedMob)}?text=${encodeURIComponent(inviteText)}`;
        window.open(waUrl, "_blank", "noopener,noreferrer");
      });
    });

    root.querySelectorAll("[data-approve-member]").forEach((button) => {
      button.addEventListener("click", async () => {
        const member = context.data.members.find((item) => item.id === button.dataset.approveMember);
        if (!member) return;
        await withButtonLoading(button, async () => {
          const next = { ...member, status: memberStatus({ ...member, status: "" }) };
          const saved = await context.services.data.save(collections.members, next);
          context.toast("Member approved.");
          context.applyChange(collections.members, saved);
        }, "Approving...");
      });
    });

    root.querySelectorAll("[data-delete-member]").forEach((button) => {
      button.addEventListener("click", async () => {
        const ok = await confirmDialog({
          title: "Delete this member?",
          body: "Related payments and attendance stay in your records for audit history.",
          confirmText: "Delete member"
        });
        if (!ok) return;
        await context.services.data.remove(collections.members, button.dataset.deleteMember);
        context.toast("Member deleted.");
        context.applyRemoval(collections.members, button.dataset.deleteMember);
      });
    });

    // ── Pause / Resume ──────────────────────────────────────────────────────
    const pauseForm     = root.querySelector("#pause-form");
    const pauseHeading  = root.querySelector("[data-pause-heading]");
    const pauseNameEl   = root.querySelector("[data-pause-member-name]");
    const pauseFields   = root.querySelector("#pause-fields");
    const resumeFields  = root.querySelector("#resume-fields");
    const pauseSubmit   = root.querySelector("[data-pause-submit]");

    function showPausePanel(mode) {
      pauseForm.classList.remove("hidden");
      const isPause = mode === "pause";
      pauseFields.classList.toggle("hidden", !isPause);
      resumeFields.classList.toggle("hidden", isPause);
      pauseHeading.textContent = isPause ? "Pause Membership" : "Resume Membership";
      pauseSubmit.textContent  = isPause ? "Confirm pause"   : "Confirm resume";
      pauseForm.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    root.querySelectorAll("[data-pause-member]").forEach((button) => {
      button.addEventListener("click", () => {
        const member = context.data.members.find((m) => m.id === button.dataset.pauseMember);
        if (!member) return;
        pauseForm.reset();
        pauseForm.memberId.value   = member.id;
        pauseForm.pauseStart.value = today();
        pauseNameEl.textContent    = member.fullName;
        showPausePanel("pause");
      });
    });

    root.querySelectorAll("[data-resume-member]").forEach((button) => {
      button.addEventListener("click", () => {
        const member = context.data.members.find((m) => m.id === button.dataset.resumeMember);
        if (!member) return;
        const pause = (context.data.membership_pauses || [])
          .find((p) => p.memberId === member.id && p.status === "active");
        pauseForm.reset();
        pauseForm.memberId.value      = member.id;
        pauseForm.pauseId.value       = pause?.id || "";
        pauseForm.actualReturn.value  = today();
        pauseNameEl.textContent       = member.fullName;
        showPausePanel("resume");
      });
    });

    root.querySelector("[data-action='cancel-pause']")?.addEventListener("click", () => {
      pauseForm.classList.add("hidden");
      pauseForm.reset();
    });

    pauseForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const mode     = pauseFields.classList.contains("hidden") ? "resume" : "pause";
      const memberId = pauseForm.memberId.value;
      const member   = context.data.members.find((m) => m.id === memberId);
      if (!member) return;

      if (mode === "pause") {
        const maxPausesPerYear = Number(context.settings?.maxPausesPerYear ?? 2);
        const maxPauseDays     = Number(context.settings?.maxPauseDays     ?? 30);
        const thisYear = new Date().getFullYear().toString();
        const yearPauses = (context.data.membership_pauses || [])
          .filter((p) => p.memberId === memberId && String(p.pauseStart || "").startsWith(thisYear));

        if (yearPauses.length >= maxPausesPerYear) {
          context.toast(`Pause limit reached — max ${maxPausesPerYear} pauses per year.`);
          return;
        }
        const pauseStart  = pauseForm.pauseStart.value;
        const returnDate  = pauseForm.returnDate.value;
        if (!pauseStart || !returnDate || returnDate <= pauseStart) {
          context.toast("Return date must be after the pause start date.");
          return;
        }
        const durationDays = Math.round((new Date(returnDate) - new Date(pauseStart)) / 86400000);
        if (durationDays > maxPauseDays) {
          context.toast(`Pause duration exceeds the ${maxPauseDays}-day limit.`);
          return;
        }

        await withButtonLoading(pauseSubmit, async () => {
          const pauseRecord = {
            memberId,
            gymId:       member.gymId || context.profile?.gymId,
            pauseStart,
            returnDate,
            reason:      pauseForm.reason.value,
            durationDays,
            status:      "active"
          };
          const savedPause = await context.services.data.save(collections.membershipPauses, pauseRecord);
          context.applyChange(collections.membershipPauses, savedPause);

          const updatedMember = { ...member, status: "Paused", endDate: addDays(member.endDate, durationDays) };
          const savedMember   = await context.services.data.save(collections.members, updatedMember);
          context.applyChange(collections.members, savedMember);

          context.toast(`${member.fullName}'s membership paused. End date extended by ${durationDays} days.`);
          pauseForm.classList.add("hidden");
          pauseForm.reset();
        });

      } else {
        const actualReturn = pauseForm.actualReturn.value || today();
        const pauseId      = pauseForm.pauseId.value;
        const pause        = (context.data.membership_pauses || []).find((p) => p.id === pauseId) || {};

        let unusedDays = 0;
        if (pause.returnDate && actualReturn < pause.returnDate) {
          unusedDays = Math.round((new Date(pause.returnDate) - new Date(actualReturn)) / 86400000);
        }

        await withButtonLoading(pauseSubmit, async () => {
          if (pauseId) {
            const updatedPause = { ...pause, status: "resumed", actualReturn };
            const savedPause   = await context.services.data.save(collections.membershipPauses, updatedPause);
            context.applyChange(collections.membershipPauses, savedPause);
          }

          const newEndDate    = unusedDays > 0 ? addDays(member.endDate, -unusedDays) : member.endDate;
          const updatedMember = { ...member, status: "", endDate: newEndDate };
          const savedMember   = await context.services.data.save(collections.members, updatedMember);
          context.applyChange(collections.members, savedMember);

          const msg = unusedDays > 0
            ? `Resumed. ${unusedDays} unused days refunded from end date.`
            : "Membership resumed.";
          context.toast(msg);
          pauseForm.classList.add("hidden");
          pauseForm.reset();
        });
      }
    });
  }
};

function bindFilters(root) {
  const list = root.querySelector("[data-member-list]");
  if (!list) return;
  const controls = {
    search: root.querySelector("[data-filter='search']"),
    status: root.querySelector("[data-filter='status']"),
    plan: root.querySelector("[data-filter='plan']"),
    trainer: root.querySelector("[data-filter='trainer']")
  };
  const rows = Array.from(list.querySelectorAll("[data-row]"));
  const count = root.querySelector("[data-member-count]");

  function apply() {
    const term = (controls.search?.value || "").trim().toLowerCase();
    const status = controls.status?.value || "";
    const plan = controls.plan?.value || "";
    const trainer = controls.trainer?.value || "";
    let visible = 0;

    rows.forEach((rowEl) => {
      const match =
        (!term || rowEl.dataset.search.includes(term)) &&
        (!status || rowEl.dataset.status === status) &&
        (!plan || rowEl.dataset.plan === plan) &&
        (!trainer || rowEl.dataset.trainer === trainer);
      rowEl.classList.toggle("hidden", !match);
      if (match) visible += 1;
    });

    if (count) count.textContent = `${visible} of ${rows.length}`;
    let empty = list.querySelector("[data-filter-empty]");
    if (visible === 0) {
      if (!empty) {
        empty = document.createElement("div");
        empty.className = "table-empty";
        empty.dataset.filterEmpty = "true";
        empty.textContent = "No members match these filters.";
        list.appendChild(empty);
      }
    } else if (empty) {
      empty.remove();
    }
  }

  Object.values(controls).forEach((el) => {
    el?.addEventListener("input", apply);
    el?.addEventListener("change", apply);
  });
}

function row(member, plans, trainers) {
  const status = memberStatus(member);
  const haystack = [member.fullName, member.mobile, member.email].filter(Boolean).join(" ").toLowerCase();
  return `
    <div class="table-row"
      data-row
      data-search="${escapeHtml(haystack)}"
      data-status="${escapeHtml(status)}"
      data-plan="${escapeHtml(member.planId || "")}"
      data-trainer="${escapeHtml(member.assignedTrainer || "")}"
      data-streak="${member.currentStreak || 0}"
      data-points="${member.points || 0}"
      data-expiry="${member.endDate || ""}"
      data-name="${escapeHtml((member.fullName || "").toLowerCase())}">
      ${nameCell(member.fullName, member.mobile || member.email || "", member.avatarUrl || "")}
      <span data-label="Plan">${escapeHtml(findName(plans, member.planId))}</span>
      <span data-label="Expiry">${dateLabel(member.endDate)}</span>
      <span data-label="Consistency" style="text-align: center; font-weight: 700; color: var(--warning); display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
        <span class="material-symbols-outlined" style="font-size: 1.1rem; color: #ff6b00; font-variation-settings: 'FILL' 1;">local_fire_department</span>
        ${member.currentStreak || 0}d
      </span>
      <span data-label="Points" style="text-align: center; font-weight: 700; color: var(--accent);">
        ${member.points || 0} pts
      </span>
      <span data-label="Status"><mark class="status ${statusClass(status)}">${escapeHtml(status)}</mark></span>
      <span class="row-actions">
        ${ /* WhatsApp invite moved to Renewals / Inactive-Alerts sections only */
          false
            ? `<button class="icon-button" data-invite-member="${escapeHtml(member.id)}" title="Send WhatsApp Invite" style="color: var(--success, #16a34a);"><span class="material-symbols-outlined">send</span></button>`
            : ""
        }
        ${
          member.status === "Pending"
            ? `<button class="icon-button" data-approve-member="${escapeHtml(member.id)}" title="Approve"><span class="material-symbols-outlined">check_circle</span></button>`
            : ""
        }
        ${
          (status === "Active" || status === "Expiring Soon")
            ? `<button class="icon-button" data-pause-member="${escapeHtml(member.id)}" title="Pause membership"><span class="material-symbols-outlined">pause_circle</span></button>`
            : ""
        }
        ${
          status === "Paused"
            ? `<button class="icon-button" data-resume-member="${escapeHtml(member.id)}" title="Resume membership"><span class="material-symbols-outlined">play_circle</span></button>`
            : ""
        }
        <button class="icon-button" data-view-member="${escapeHtml(member.id)}" title="View profile & logs"><span class="material-symbols-outlined">visibility</span></button>
        <button class="icon-button danger" data-delete-member="${escapeHtml(member.id)}" title="Delete"><span class="material-symbols-outlined">delete</span></button>
      </span>
      <small class="table-note">Trainer: ${escapeHtml(findName(trainers, member.assignedTrainer, "Unassigned"))}</small>
    </div>
  `;
}
