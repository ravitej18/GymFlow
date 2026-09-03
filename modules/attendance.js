import { collections, dateLabel, daysUntil, emptyState, escapeHtml, findName, formData, memberStatus, nameCell, optionList, pageHeader, today, withButtonLoading, awardPointsAndBadges } from "./utils.js";

export const attendanceModule = {
  render(context) {
    if (context.profile?.role === "member") {
      return renderMemberAttendance(context);
    }
    const { data } = context;
    const records = data.attendance || [];
    const members = data.members || [];
    const trainers = data.trainers || [];
    const now = new Date();
    const todayStr = today();
    const yesterdayStr = isoOffset(-1);
    const weekStart = isoOffset(-6); // rolling 7-day window
    const monthStr = todayStr.slice(0, 7);

    this.activeFilter = this.activeFilter || "all";

    let filteredRecords = records;
    if (this.activeFilter === "today") {
      filteredRecords = records.filter((r) => r.date === todayStr);
    } else if (this.activeFilter === "yesterday") {
      filteredRecords = records.filter((r) => r.date === yesterdayStr);
    } else if (this.activeFilter === "this-week") {
      filteredRecords = records.filter((r) => r.date >= weekStart);
    }

    // Sort check-ins: most recent first
    filteredRecords = [...filteredRecords].sort((a, b) => {
      const dateTimeA = String(a.date || "") + "T" + String(a.time || "00:00");
      const dateTimeB = String(b.date || "") + "T" + String(b.time || "00:00");
      return dateTimeB.localeCompare(dateTimeA);
    });

    const todayCount = records.filter((r) => r.date === todayStr).length;
    const weekCount = records.filter((r) => r.date >= weekStart).length;
    const monthCount = records.filter((r) => String(r.date || "").startsWith(monthStr)).length;

    return `
      ${pageHeader("Check-ins")}
      <div class="metric-grid">
        <article class="metric"><span>Today</span><strong>${todayCount}</strong></article>
        <article class="metric"><span>Last 7 Days</span><strong>${weekCount}</strong></article>
        <article class="metric"><span>This Month</span><strong>${monthCount}</strong></article>
        <article class="metric"><span>Total Records</span><strong>${records.length}</strong></article>
      </div>
      <div class="work-grid">
        <form class="panel stack" id="attendance-form">
          <div class="panel-heading"><h2>Check In</h2></div>
          <div class="form-grid">
            <label>Member
              <div class="ac-wrap">
                <input
                  type="text"
                  data-member-search
                  placeholder="Type to search members"
                  autocomplete="off"
                  required
                />
                <div class="ac-list" data-member-suggestions hidden></div>
              </div>
              <input type="hidden" name="memberId" />
            </label>
            <label>Date<input name="date" type="date" value="${todayStr}" required /></label>
            <label>Time<input name="time" type="time" value="${now.toTimeString().slice(0, 5)}" required /></label>
            <label>Trainer<select name="trainerId"><option value="">Unassigned</option>${optionList(trainers, "name")}</select></label>
          </div>
          <button class="primary-button" type="submit"><span class="material-symbols-outlined">how_to_reg</span>Record attendance</button>
        </form>
        <section class="panel">
          <div class="panel-heading" style="flex-wrap: wrap; gap: 8px;">
            <h2>Recent Check-ins</h2>
            <span>${filteredRecords.length} records</span>
            <button class="ghost-button compact" data-action="refresh-checkins" style="margin-left: auto; display: flex; align-items: center; gap: 4px;">
              <span class="material-symbols-outlined" style="font-size:16px;">refresh</span> Refresh
            </button>
            <button class="ghost-button compact mobile-only-btn" data-scroll-to-form>
              <span class="material-symbols-outlined" style="font-size:16px;">how_to_reg</span> Check In
            </button>
          </div>
          <div class="attendance-filters" style="display: flex; gap: 8px; padding: 10px 15px; border-bottom: 1px solid var(--line); overflow-x: auto; background: var(--bg-alt);">
            <button class="tab-btn compact ${this.activeFilter === "today" ? "active" : ""}" data-filter="today" style="padding: 6px 12px; font-size: 0.8rem; border-radius: var(--r-sm); border: 1px solid ${this.activeFilter === "today" ? "var(--accent)" : "var(--line)"}; background: ${this.activeFilter === "today" ? "var(--accent)" : "var(--surface)"}; color: ${this.activeFilter === "today" ? "#fff" : "var(--text)"}; cursor: pointer; font-weight: 600;">Today</button>
            <button class="tab-btn compact ${this.activeFilter === "yesterday" ? "active" : ""}" data-filter="yesterday" style="padding: 6px 12px; font-size: 0.8rem; border-radius: var(--r-sm); border: 1px solid ${this.activeFilter === "yesterday" ? "var(--accent)" : "var(--line)"}; background: ${this.activeFilter === "yesterday" ? "var(--accent)" : "var(--surface)"}; color: ${this.activeFilter === "yesterday" ? "#fff" : "var(--text)"}; cursor: pointer; font-weight: 600;">Yesterday</button>
            <button class="tab-btn compact ${this.activeFilter === "this-week" ? "active" : ""}" data-filter="this-week" style="padding: 6px 12px; font-size: 0.8rem; border-radius: var(--r-sm); border: 1px solid ${this.activeFilter === "this-week" ? "var(--accent)" : "var(--line)"}; background: ${this.activeFilter === "this-week" ? "var(--accent)" : "var(--surface)"}; color: ${this.activeFilter === "this-week" ? "#fff" : "var(--text)"}; cursor: pointer; font-weight: 600;">This Week</button>
            <button class="tab-btn compact ${this.activeFilter === "all" ? "active" : ""}" data-filter="all" style="padding: 6px 12px; font-size: 0.8rem; border-radius: var(--r-sm); border: 1px solid ${this.activeFilter === "all" ? "var(--accent)" : "var(--line)"}; background: ${this.activeFilter === "all" ? "var(--accent)" : "var(--surface)"}; color: ${this.activeFilter === "all" ? "#fff" : "var(--text)"}; cursor: pointer; font-weight: 600;">All</button>
          </div>
          ${
            filteredRecords.length
              ? `<div class="data-table checkins-table">
                  <div class="table-head"><span>Member</span><span>Date</span><span>Time</span><span>Trainer</span></div>
                  ${filteredRecords.slice(0, 50).map((record) => row(record, members, trainers)).join("")}
                </div>`
              : emptyState("No check-ins found", "No check-in records match the selected filter.")
          }
        </section>
      </div>

      <section class="panel" style="margin-top:18px">
        <div class="panel-heading">
          <h2>Inactive Members</h2>
          <div class="button-row" data-inactive-tabs>
            <button class="icon-button active" data-days="7" type="button">7 days</button>
            <button class="icon-button" data-days="14" type="button">14 days</button>
            <button class="icon-button" data-days="30" type="button">30 days</button>
          </div>
        </div>
        <div data-inactive-list>${inactiveList(members, records, 7)}</div>
      </section>
    `;
  },
  bind(root, context) {
    if (context.profile?.role === "member") {
      bindMemberAttendance(root, context);
      return;
    }

    root.querySelectorAll(".attendance-filters button[data-filter]").forEach(btn => {
      btn.addEventListener("click", () => {
        this.activeFilter = btn.dataset.filter;
        context.refreshView();
      });
    });

    root.querySelector("[data-action='refresh-checkins']")?.addEventListener("click", async () => {
      const refreshBtn = root.querySelector("[data-action='refresh-checkins']");
      await withButtonLoading(refreshBtn, async () => {
        const freshList = await context.services.data.list("attendance");
        context.data.attendance = freshList;
        context.toast("Check-ins updated from database.");
        context.refreshView();
      }, "Refreshing...");
    });

    const form = root.querySelector("#attendance-form");
    const memberSearch = form.querySelector("[data-member-search]");
    const memberIdField = form.querySelector("[name='memberId']");
    const suggestions = form.querySelector("[data-member-suggestions]");

    function selectMember(member) {
      memberSearch.value = member.fullName || member.id;
      memberIdField.value = member.id;
      memberSearch.setCustomValidity("");
      if (member.assignedTrainer) form.trainerId.value = member.assignedTrainer;
      suggestions.hidden = true;
    }

    memberSearch.addEventListener("input", () => {
      const typed = memberSearch.value.trim().toLowerCase();
      memberIdField.value = "";
      if (!typed) { suggestions.hidden = true; return; }
      const matches = (context.data.members || []).filter((m) =>
        (m.fullName || m.id || "").toLowerCase().includes(typed)
      ).slice(0, 10);
      if (!matches.length) { suggestions.hidden = true; return; }
      suggestions.innerHTML = matches
        .map((m) => `<div class="ac-item" data-id="${escapeHtml(m.id)}">${escapeHtml(m.fullName || m.id)}</div>`)
        .join("");
      suggestions.hidden = false;
    });

    suggestions.addEventListener("mousedown", (e) => {
      const item = e.target.closest(".ac-item");
      if (!item) return;
      e.preventDefault(); // keep focus on input
      const member = (context.data.members || []).find((m) => m.id === item.dataset.id);
      if (member) selectMember(member);
    });

    memberSearch.addEventListener("blur", () => {
      setTimeout(() => { suggestions.hidden = true; }, 150);
      if (!memberIdField.value) {
        memberSearch.setCustomValidity("Pick a member from the list.");
      }
    });

    memberSearch.addEventListener("focus", () => {
      memberSearch.setCustomValidity("");
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!memberIdField.value) {
        memberSearch.setCustomValidity("Pick a member from the list.");
        memberSearch.reportValidity();
        memberSearch.reportValidity();
        return;
      }
      await withButtonLoading(form.querySelector("[type='submit']"), async () => {
        const saved = await context.services.data.save(collections.attendance, formData(form));
        context.toast("Attendance recorded.");
        form.reset();
        form.date.value = today();
        form.time.value = new Date().toTimeString().slice(0, 5);
        memberSearch.setCustomValidity("");
        context.applyChange(collections.attendance, saved);
      });
    });

    const tabs = root.querySelector("[data-inactive-tabs]");
    const listBox = root.querySelector("[data-inactive-list]");
    tabs?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-days]");
      if (!button) return;
      tabs.querySelectorAll("[data-days]").forEach((b) => b.classList.toggle("active", b === button));
      listBox.innerHTML = inactiveList(context.data.members || [], context.data.attendance || [], Number(button.dataset.days));
    });
  }
};

// ===== Member self check-in view =====
function renderMemberAttendance(context) {
  const me = context.myMember;
  if (!me) {
    return `
      ${pageHeader("Check-ins")}
      ${emptyState("Membership being set up", "Once your gym finalises your membership you can check in here.")}
    `;
  }
  const status = me.status === "Pending" ? "Pending" : memberStatus(me);
  if (status !== "Active" && status !== "Expiring Soon") {
    return `
      ${pageHeader("Check-ins")}
      ${emptyState("Membership not active", `Your current membership status is ${status}. Access is restricted.`)}
    `;
  }
  const todayStr = today();
  const mine = (context.data.attendance || [])
    .filter((record) => record.memberId === me.id)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const checkedInToday = mine.some((record) => record.date === todayStr);

  return `
    ${pageHeader("Check-ins")}
    <div class="work-grid">
      <section class="panel stack">
        <div class="panel-heading"><h2>Check In</h2></div>
        <p class="panel-hint">${checkedInToday ? "You've already checked in today — feel free to check in again for another session." : "Tap below to record your visit."}</p>
        <button class="primary-button" data-self-checkin type="button"><span class="material-symbols-outlined">how_to_reg</span>Check in now</button>
      </section>
      <section class="panel">
        <div class="panel-heading"><h2>My Recent Check-ins</h2><span>${mine.length} total</span></div>
        ${
          mine.length
            ? `<div class="data-table two-col-table">
                <div class="table-head"><span>Date</span><span>Time</span></div>
                ${mine
                  .slice(0, 15)
                  .map(
                    (record) => `
                      <div class="table-row">
                        <span data-label="Date">${dateLabel(record.date)}</span>
                        <span data-label="Time">${escapeHtml(record.time || "-")}</span>
                      </div>
                    `
                  )
                  .join("")}
              </div>`
            : emptyState("No check-ins yet", "Your visits will appear here once you check in.")
        }
      </section>
    </div>
  `;
}

function bindMemberAttendance(root, context) {
  const button = root.querySelector("[data-self-checkin]");
  const me = context.myMember;
  if (!button || !me) return;
  button.addEventListener("click", async () => {
    const status = me.status === "Pending" ? "Pending" : memberStatus(me);
    if (status !== "Active" && status !== "Expiring Soon") {
      context.toast(`Cannot check in: Your membership status is ${status}.`);
      return;
    }
    await withButtonLoading(button, async () => {
      const saved = await context.services.data.save(collections.attendance, {
        memberId: me.id,
        date: today(),
        time: new Date().toTimeString().slice(0, 5)
      });
      context.applyChange(collections.attendance, saved);
      await awardPointsAndBadges(context, "checkin");
    }, "Checking in...");
  });
}

function row(record, members, trainers) {
  return `
    <div class="table-row">
      <span data-label="Member">${nameCell(findName(members, record.memberId), "", members.find(m => m.id === record.memberId)?.avatarUrl || "")}</span>
      <span data-label="Date">${dateLabel(record.date)}</span>
      <span data-label="Time">${escapeHtml(record.time || "-")}</span>
      <span data-label="Trainer">${escapeHtml(findName(trainers, record.trainerId, "Unassigned"))}</span>
    </div>
  `;
}

function inactiveList(members, records, days) {
  const lastSeen = new Map();
  records.forEach((r) => {
    const prev = lastSeen.get(r.memberId);
    if (!prev || String(r.date) > String(prev)) lastSeen.set(r.memberId, r.date);
  });

  const inactive = members
    .map((member) => ({ member, last: lastSeen.get(member.id) || null }))
    .filter(({ last }) => {
      if (!last) return true; // never checked in
      return -daysUntil(last) >= days; // last visit was >= `days` ago
    })
    .sort((a, b) => String(a.last || "").localeCompare(String(b.last || "")));

  if (!inactive.length) {
    return `<div class="table-empty">No members inactive for ${days}+ days. 🎉</div>`;
  }

  return `
    <div class="data-table inactive-table">
      <div class="table-head"><span>Member</span><span>Last Check-in</span><span>Days Inactive</span></div>
      ${inactive
        .map(({ member, last }) => {
          const gap = last ? -daysUntil(last) : null;
          return `
            <div class="table-row">
              <span data-label="Member">${nameCell(member.fullName, member.mobile || "", member.avatarUrl || "")}</span>
              <span data-label="Last Check-in">${last ? dateLabel(last) : "Never"}</span>
              <span data-label="Days Inactive"><mark class="status ${gap !== null && gap >= 30 ? "expired" : "expiring-soon"}">${gap !== null ? `${gap} days` : "No visits"}</mark></span>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function isoOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
