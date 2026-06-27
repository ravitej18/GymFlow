import { addDays, byName, collections, confirmDialog, dateLabel, emptyState, escapeHtml, findName, formData, memberStatus, nameCell, optionList, pageHeader, statusClass, today, withButtonLoading } from "./utils.js";

function calcBmi(weightKg, heightCm) {
  const w = parseFloat(weightKg);
  const h = parseFloat(heightCm) / 100;
  if (!w || !h || h <= 0) return "";
  return (w / (h * h)).toFixed(1);
}

function bmiCategory(bmi, gender) {
  const v = parseFloat(bmi);
  if (!v) return null;
  // WHO Asian / Indian consensus thresholds (WHO Expert Consultation 2004 + ICMR guidelines)
  // For Indians, overweight risk starts at 23 (vs 25 globally) and obese at 25 (vs 30 globally).
  // Females carry ~6-8% more body fat at the same BMI, so healthy ceiling is 22.0 vs 22.9 for males.
  const healthyMax = (gender === "Female") ? 22.0 : 22.9;
  if (v < 18.5)        return { label: "Underweight",   color: "var(--warning, #d97706)" };
  if (v <= healthyMax) return { label: "Healthy",        color: "var(--success, #16a34a)" };
  if (v < 25)          return { label: "Overweight",     color: "var(--warning, #f59e0b)" };
  if (v < 30)          return { label: "Obese Class 1",  color: "var(--danger,  #dc2626)" };
  if (v < 35)          return { label: "Obese Class 2",  color: "var(--danger,  #b91c1c)" };
                       return { label: "Obese Class 3",  color: "var(--danger,  #7f1d1d)" };
}

export const membersModule = {
  render({ data }) {
    const members = [...(data.members || [])].sort(byName);
    const plans = data.membership_plans || [];
    const trainers = data.trainers || [];

    return `
      ${pageHeader("Members")}
      <div class="work-grid">
        <form class="panel stack" id="member-form">
          <input type="hidden" name="id" />
          <div class="panel-heading"><h2>Add Member</h2></div>
          <div class="form-grid">
            <label>Full name<input name="fullName" required maxlength="100" /></label>
            <label>Mobile<input name="mobile" required maxlength="20" /></label>
            <label>Email<input name="email" type="email" maxlength="100" /></label>
            <label>Gender
              <select name="gender">
                <option>Not specified</option>
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
              </select>
            </label>
            <label>Date of birth<input name="dateOfBirth" type="date" /></label>
            <label>Join date<input name="joinDate" type="date" value="${today()}" /></label>
            <label>Membership plan
              <select name="planId" required>
                <option value="">Select plan</option>
                ${optionList(plans, "planName")}
              </select>
            </label>
            <label>Assigned trainer
              <select name="assignedTrainer">
                <option value="">Unassigned</option>
                ${optionList(trainers, "name")}
              </select>
            </label>
            <label>Start date<input name="startDate" type="date" value="${today()}" required /></label>
            <label>End date<input name="endDate" type="date" required /></label>
            <label>Status
              <select name="status">
                <option>Active</option>
                <option>Suspended</option>
              </select>
            </label>
            <label class="wide">Address<textarea name="address" rows="2"></textarea></label>
            <label class="wide">Emergency contact<input name="emergencyContact" maxlength="120" /></label>
            <div class="form-section-heading">Initial Measurements <span class="optional-tag">(optional)</span></div>
            <label>Weight kg<input name="initWeight" type="number" min="0" step="0.1" /></label>
            <label>Height cm<input name="initHeight" type="number" min="0" step="0.1" /></label>
            <label>BMI<input name="initBmi" type="number" step="0.1" readonly tabindex="-1" /><span data-bmi-label class="bmi-label"></span></label>
            <label>Body fat %<input name="initBodyFat" type="number" min="0" step="0.1" /></label>
            <label>Waist cm<input name="initWaist" type="number" min="0" step="0.1" /></label>
            <label>Chest cm<input name="initChest" type="number" min="0" step="0.1" /></label>
            <label class="wide">Gym goal
              <select name="gymGoal">
                <option value="">Not specified</option>
                <option>Weight Loss</option>
                <option>Muscle Gain</option>
                <option>General Fitness</option>
                <option>Endurance / Cardio</option>
                <option>Body Toning</option>
                <option>Flexibility / Mobility</option>
                <option>Rehabilitation</option>
              </select>
            </label>
          </div>
          <div class="button-row">
            <button class="primary-button" type="submit">Save member</button>
            <button class="ghost-button" type="reset" data-action="clear">Clear</button>
          </div>
        </form>

        <form class="panel stack hidden" id="pause-form">
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

        <section class="panel">
          <div class="panel-heading"><h2>Member Directory</h2><span data-member-count>${members.length} total</span></div>
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
                </div>
                <div class="data-table members-table" data-member-list>
                  <div class="table-head"><span>Name</span><span>Plan</span><span>Expiry</span><span>Status</span><span></span></div>
                  ${members.map((member) => row(member, plans, trainers)).join("")}
                </div>`
              : emptyState("No members yet", "Add your first member to start tracking plans, payments, and renewals.")
          }
        </section>
      </div>
    `;
  },
  bind(root, context) {
    const form = root.querySelector("#member-form");

    form.planId.addEventListener("change", () => {
      const plan = context.data.membership_plans.find((item) => item.id === form.planId.value);
      if (plan && form.startDate.value) {
        form.endDate.value = addDays(form.startDate.value, plan.durationDays);
      }
    });

    form.startDate.addEventListener("change", () => {
      const plan = context.data.membership_plans.find((item) => item.id === form.planId.value);
      if (plan) form.endDate.value = addDays(form.startDate.value, plan.durationDays);
    });

    const bmiLabel = form.querySelector("[data-bmi-label]");
    function updateBmi() {
      const val = calcBmi(form.initWeight.value, form.initHeight.value);
      form.initBmi.value = val;
      const cat = bmiCategory(val, form.gender.value);
      if (bmiLabel) {
        bmiLabel.textContent = cat ? cat.label : "";
        bmiLabel.style.color = cat ? cat.color : "";
      }
    }
    form.initWeight?.addEventListener("input", updateBmi);
    form.initHeight?.addEventListener("input", updateBmi);
    form.gender?.addEventListener("change", updateBmi);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = formData(form);
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
        chest:   payload.initChest   || ""
      };
      const hasMeasurements = Object.values(measurements).some((v) => v !== "");
      payload.status = payload.status === "Suspended" ? "Suspended" : memberStatus(payload);
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
            notes:   "Initial admission measurement"
          };
          const savedProgress = await context.services.data.save(collections.progress, progressRecord);
          context.applyChange(collections.progress, savedProgress);
        }
        context.toast(payload.id ? "Member updated." : "Member added.");
        form.reset();
        form.joinDate.value = today();
        form.startDate.value = today();
        context.applyChange(collections.members, saved);
      });
    });

    bindFilters(root);

    root.querySelectorAll("[data-edit-member]").forEach((button) => {
      button.addEventListener("click", () => {
        const member = context.data.members.find((item) => item.id === button.dataset.editMember);
        if (!member) return;
        Object.entries(member).forEach(([key, value]) => {
          if (form.elements[key]) form.elements[key].value = value || "";
        });
        updateBmi();
        root.querySelector(".panel-heading h2").textContent = "Edit Member";
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    root.querySelectorAll("[data-approve-member]").forEach((button) => {
      button.addEventListener("click", async () => {
        const member = context.data.members.find((item) => item.id === button.dataset.approveMember);
        if (!member) return;
        await withButtonLoading(button, async () => {
          // Approve: clear Pending; recompute a date-based status (Active/Expiring/Expired).
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

    root.querySelector("[data-action='clear']")?.addEventListener("click", () => {
      root.querySelector(".panel-heading h2").textContent = "Add Member";
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
      data-trainer="${escapeHtml(member.assignedTrainer || "")}">
      ${nameCell(member.fullName, member.mobile || member.email || "")}
      <span>${escapeHtml(findName(plans, member.planId))}</span>
      <span>${dateLabel(member.endDate)}</span>
      <span><mark class="status ${statusClass(status)}">${escapeHtml(status)}</mark></span>
      <span class="row-actions">
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
        <button class="icon-button" data-edit-member="${escapeHtml(member.id)}" title="Edit"><span class="material-symbols-outlined">edit</span></button>
        <button class="icon-button danger" data-delete-member="${escapeHtml(member.id)}" title="Delete"><span class="material-symbols-outlined">delete</span></button>
      </span>
      <small class="table-note">Trainer: ${escapeHtml(findName(trainers, member.assignedTrainer, "Unassigned"))}</small>
    </div>
  `;
}
