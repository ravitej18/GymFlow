import { dateLabel, daysUntil, escapeHtml, memberStatus, money, pageHeader, statusClass, today as todayDate } from "./utils.js";

export const dashboardModule = {
  activeLeaderboardTab: "points",
  selectedGender: null,
  selectedWeightClass: null,
  render(context) {
    if (context.profile?.role === "member") {
      return renderMemberDashboard(context);
    }
    if (context.profile?.role === "trainer") {
      return renderTrainerDashboard(context);
    }
    const { data, settings } = context;
    const members = data.members || [];
    const payments = data.payments || [];
    const attendance = data.attendance || [];
    const currency = settings?.currency || "INR";
    const today = todayDate();
    const month = today.slice(0, 7);

    const active = members.filter((member) => memberStatus(member) === "Active").length;
    const expiring = members.filter((member) => daysUntil(member.endDate) >= 0 && daysUntil(member.endDate) <= 15).length;
    const expired = members.filter((member) => memberStatus(member) === "Expired").length;
    const paused  = members.filter((member) => memberStatus(member) === "Paused").length;
    const revenueToday = payments.filter((payment) => payment.date === today).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const revenueMonth = payments.filter((payment) => String(payment.date || "").startsWith(month)).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const attendanceToday = attendance.filter((record) => record.date === today).length;
    const upcoming = members
      .map((member) => ({ ...member, computedStatus: memberStatus(member), remaining: daysUntil(member.endDate) }))
      .filter((member) => member.computedStatus !== "Paused" && member.remaining <= 7)
      .sort((a, b) => a.remaining - b.remaining)
      .slice(0, 6);

    return `
      ${pageHeader("Dashboard")}
      <div class="metric-grid">
        ${metric("Total Members", members.length)}
        ${metric("Active Members", active)}
        ${metric("Revenue Month", money(revenueMonth, currency))}
        ${metric("Attendance Today", attendanceToday)}
      </div>

      <div style="margin: -10px 0 20px 0; text-align: left;">
        <button class="ghost-button compact" id="toggle-more-metrics" style="display:inline-flex; align-items:center; gap:4px; font-weight:600;">
          <span class="material-symbols-outlined" style="font-size:1.15rem;">expand_more</span>
          Show More Metrics
        </button>
      </div>

      <div class="metric-grid hidden" id="more-metrics-panel" style="margin-bottom: 20px;">
        ${metric("Revenue Today", money(revenueToday, currency))}
        ${metric("Expiring Soon", expiring)}
        ${metric("Expired", expired)}
        ${metric("Paused Members", paused)}
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
            <a href="#/reports" class="ghost-button compact" style="display: inline-flex; align-items: center; gap: 4px;"><span class="material-symbols-outlined" style="font-size:1.15rem;">bar_chart</span>Reports</a>
          </div>
          ${renderRevenueChart(payments, currency)}
        </section>
      </div>

      <div class="split-grid" style="margin-top:20px;">
        <section class="panel">
          <div class="panel-heading">
            <h2>Plan Popularity</h2>
            <span>Distribution of active plans</span>
          </div>
          ${renderPlanPopularityChart(members, data.membership_plans || [])}
        </section>
        <section class="panel">
          <div class="panel-heading">
            <h2>Gym Attendance Trend (Last 7 Days)</h2>
            <span>Daily check-in volume</span>
          </div>
          ${renderAttendanceTrendChart(data.attendance || [])}
        </section>
      </div>
      ${renderCommunityFeed(context)}
      ${renderLeaderboardPanel(context)}
    `;
  },
  bind(root, context) {
    // Bind leaderboard tab clicks
    root.querySelectorAll("[data-leaderboard-tab]").forEach(btn => {
      btn.addEventListener("click", () => {
        this.activeLeaderboardTab = btn.dataset.leaderboardTab;
        context.refreshView();
      });
    });

    // Bind dropdown changes
    const genderSelect = root.querySelector("#leaderboard-gender-select");
    genderSelect?.addEventListener("change", () => {
      this.selectedGender = genderSelect.value;
      context.refreshView();
    });

    const weightSelect = root.querySelector("#leaderboard-weight-select");
    weightSelect?.addEventListener("change", () => {
      this.selectedWeightClass = weightSelect.value;
      context.refreshView();
    });

    // Toggle Metrics
    const toggleBtn = root.querySelector("#toggle-more-metrics");
    const panel = root.querySelector("#more-metrics-panel");
    if (toggleBtn && panel) {
      toggleBtn.addEventListener("click", () => {
        const isHidden = panel.classList.contains("hidden");
        panel.classList.toggle("hidden");
        toggleBtn.innerHTML = isHidden 
          ? `<span class="material-symbols-outlined" style="font-size:1.15rem;">expand_less</span>Hide Details` 
          : `<span class="material-symbols-outlined" style="font-size:1.15rem;">expand_more</span>Show More Metrics`;
      });
    }

    // Toggle Feed Workouts
    root.querySelectorAll("[data-toggle-feed-workout]").forEach(btn => {
      btn.addEventListener("click", () => {
        const logId = btn.dataset.toggleFeedWorkout;
        const detailsEl = root.querySelector(`#feed-details-${logId}`);
        if (detailsEl) {
          const isHidden = detailsEl.classList.contains("hidden");
          detailsEl.classList.toggle("hidden");
          const count = btn.dataset.exerciseCount || "0";
          btn.innerHTML = isHidden 
            ? `<span class="material-symbols-outlined" style="font-size:1rem;">expand_less</span>Hide Exercises` 
            : `<span class="material-symbols-outlined" style="font-size:1rem;">expand_more</span>Show Exercises (${count})`;
        }
      });
    });
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

function renderMemberDashboard(context) {
  const me = context.myMember;
  const name = context.profile?.name || "there";
  if (!me) {
    return `
      ${pageHeader(`Welcome, ${name}`)}
      <section class="panel stack">
        <div class="panel-heading"><h2>Membership being set up</h2></div>
        <p class="panel-hint">Your gym is finalising your membership. You'll see your status, attendance, and payments here shortly.</p>
      </section>
    `;
  }

  const today = todayDate();
  const attendance = context.data.attendance || [];
  const myAttendance = attendance.filter((record) => record.memberId === me.id);
  const checkedInToday = myAttendance.some((record) => record.date === today);
  const status = me.status === "Pending" ? "Pending" : memberStatus(me);
  const remaining = daysUntil(me.endDate);

  // Calculate Payment / Renewal Status Warning
  let billingStatus = "active";
  let billingLabel = "Active";
  let billingText = `Your next renewal is on ${me.endDate ? dateLabel(me.endDate) : "-"}.`;
  let billingIcon = "check_circle";
  
  if (remaining < 0) {
    billingStatus = "overdue";
    billingLabel = "Payment Overdue";
    billingText = `Your plan expired ${Math.abs(remaining)} days ago. Please renew to continue gym access.`;
    billingIcon = "error";
  } else if (remaining <= 5) {
    billingStatus = "due";
    billingLabel = "Payment Due Soon";
    billingText = `Your plan expires in ${remaining} days. Please renew to avoid access interruption.`;
    billingIcon = "warning";
  }

  const billingWidgetHtml = `
    <section class="billing-status-widget status-${billingStatus}" style="margin-bottom: 20px;">
      <div style="display:flex; align-items:center; gap:12px; text-align:left;">
        <span class="material-symbols-outlined" style="font-size: 28px; color: ${billingStatus === 'active' ? 'var(--teal)' : billingStatus === 'due' ? 'var(--warning)' : 'var(--danger)'};">${billingIcon}</span>
        <div>
          <span style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; opacity:0.85; display:block;">Billing Status</span>
          <strong style="font-size:1.1rem; color:var(--ink-soft);">${billingLabel}</strong>
          <p style="font-size:0.85rem; color:var(--muted); margin: 2px 0 0 0; line-height: 1.3;">${billingText}</p>
        </div>
      </div>
      <div style="text-align:right; flex-shrink:0;">
        <a class="primary-button" href="#/progress" style="padding: 8px 12px; font-size:0.8rem; font-weight:700;">View History</a>
      </div>
    </section>
  `;

  return `
    ${pageHeader(`Welcome, ${name}`)}
    ${me.status === "Pending" ? `<div class="panel-hint" style="margin-bottom:18px">Your membership is pending approval from the gym.</div>` : billingWidgetHtml}
    <div class="metric-grid">
      <article class="metric"><span>Membership</span><strong><mark class="status ${statusClass(status)}">${escapeHtml(status)}</mark></strong></article>
      <article class="metric"><span>Expires</span><strong>${me.endDate ? dateLabel(me.endDate) : "-"}</strong></article>
      <article class="metric"><span>Days Left</span><strong>${me.endDate ? (remaining < 0 ? `${Math.abs(remaining)} overdue` : remaining) : "-"}</strong></article>
      <article class="metric"><span>My Check-ins</span><strong>${myAttendance.length}</strong></article>
    </div>
    <section class="panel stack">
      <div class="panel-heading"><h2>Today</h2></div>
      ${
        checkedInToday
          ? `<p class="panel-hint">✅ You're checked in today. See you at the gym!</p>`
          : `<p class="panel-hint">You haven't checked in yet today.</p>
             <a class="primary-button" href="#/attendance"><span class="material-symbols-outlined">how_to_reg</span>Check in now</a>`
      }
    </section>
    ${renderCommunityFeed(context)}
    ${renderLeaderboardPanel(context)}
  `;
}

function renderTrainerDashboard(context) {
  const me = context.myTrainer;
  const name = context.profile?.name || "there";
  if (!me) {
    return `
      ${pageHeader(`Welcome, ${name}`)}
      <section class="panel stack">
        <div class="panel-heading"><h2>Profile being set up</h2></div>
        <p class="panel-hint">Your gym is finalising your trainer profile. You'll be able to check in here shortly.</p>
      </section>
    `;
  }

  const todayKey = todayDate();
  const all = context.data.trainer_attendance || [];
  const mine = all.filter((record) => record.trainerId === me.id);
  const trainersInToday = all.filter((record) => record.date === todayKey).length;
  const checkedInToday = mine.some((record) => record.date === todayKey);

  return `
    ${pageHeader(`Welcome, ${name}`)}
    ${
      me.status === "Pending"
        ? `<div class="panel-hint" style="margin-bottom:18px">Your trainer profile is pending approval from the gym.</div>`
        : ""
    }
    <div class="metric-grid">
      <article class="metric"><span>Trainers in today</span><strong>${trainersInToday}</strong></article>
      <article class="metric"><span>My Check-ins</span><strong>${mine.length}</strong></article>
    </div>
    <section class="panel stack">
      <div class="panel-heading"><h2>Today</h2></div>
      ${
        checkedInToday
          ? `<p class="panel-hint">✅ You're checked in today. Have a great session!</p>`
          : `<p class="panel-hint">You haven't checked in yet today.</p>
             <a class="primary-button" href="#/trainer-checkin"><span class="material-symbols-outlined">how_to_reg</span>Check in now</a>`
      }
    </section>
    ${renderCommunityFeed(context)}
    ${renderLeaderboardPanel(context)}
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

function renderRevenueChart(payments, currency) {
  const lastSix = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    return date.toISOString().slice(0, 7);
  });
  const values = lastSix.map((month) => payments.filter((payment) => String(payment.date || "").startsWith(month)).reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
  const max = Math.max(...values, 1);

  const width = 380;
  const height = 110;
  const padding = 25;
  const points = values.map((val, idx) => {
    const x = padding + (idx * (width - 2 * padding) / 5);
    const y = height - padding - (val / max * (height - 2 * padding));
    return { x, y };
  });
  const pathD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(" ");

  const labelsHtml = lastSix.map((m, idx) => {
    const x = padding + (idx * (width - 2 * padding) / 5);
    return `<text x="${x}" y="${height - 5}" text-anchor="middle">${m.slice(5)}</text>`;
  }).join("");

  const dotsHtml = points.map((p, idx) => {
    return `<circle cx="${p.x}" cy="${p.y}" r="4" fill="var(--teal)" stroke="var(--surface)" stroke-width="2" />
            <text x="${p.x}" y="${p.y - 8}" text-anchor="middle" font-size="8px" font-weight="700" fill="var(--ink)">${money(values[idx], currency)}</text>`;
  }).join("");

  return `
    <div style="width: 100%; display: flex; justify-content: center; align-items: center; padding-top: 10px;">
      <svg viewBox="0 0 380 110" class="gymflow-chart">
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" class="grid-line" />
        <path d="${pathD}" class="chart-line-path" />
        ${dotsHtml}
        ${labelsHtml}
      </svg>
    </div>
  `;
}

function renderPlanPopularityChart(members, plans) {
  const activeMembers = members.filter(m => memberStatus(m) === "Active");
  const planCounts = {};
  activeMembers.forEach(m => {
    if (m.planId) {
      planCounts[m.planId] = (planCounts[m.planId] || 0) + 1;
    }
  });

  const data = plans.map(p => ({
    name: p.planName,
    count: planCounts[p.id] || 0
  })).filter(p => p.count > 0).sort((a, b) => b.count - a.count);

  if (data.length === 0) {
    return `<div class="table-empty" style="height:110px; display:flex; align-items:center; justify-content:center;">No active plan data available.</div>`;
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const colors = ["var(--teal)", "var(--primary)", "#a855f7", "#f97316", "var(--muted)"];

  const barsHtml = data.map((d, idx) => {
    const percentage = Math.round((d.count / total) * 100);
    const color = colors[idx % colors.length];
    return `
      <div style="margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700; margin-bottom: 4px;">
          <span style="color: var(--text-muted); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width:180px;">${escapeHtml(d.name)}</span>
          <span style="color: var(--text);">${d.count} (${percentage}%)</span>
        </div>
        <div style="background: var(--line-soft); border-radius: 4px; height: 6px; overflow: hidden; display: flex; box-shadow: inset 1px 1px 2px rgba(0,0,0,0.1);">
          <div style="background: ${color}; width: ${percentage}%; height: 100%; border-radius: 4px; box-shadow: 0 0 6px ${color};"></div>
        </div>
      </div>
    `;
  }).join("");

  return `
    <div style="padding: 10px 0; max-height: 120px; overflow-y: auto; scrollbar-width: none;">
      ${barsHtml}
    </div>
  `;
}

function renderAttendanceTrendChart(attendance) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - index));
    return d.toISOString().slice(0, 10);
  });

  const values = days.map(day => attendance.filter(a => a.date === day).length);
  const max = Math.max(...values, 1);

  const width = 380;
  const height = 110;
  const padding = 20;
  const barWidth = 20;
  const spacing = (width - 2 * padding) / days.length;

  const barsHtml = days.map((day, idx) => {
    const x = padding + idx * spacing + (spacing - barWidth) / 2;
    const barHeight = (values[idx] / max) * (height - 2 * padding - 15);
    const y = height - padding - 15 - barHeight;
    const dateObj = new Date(day);
    const dayLabel = dateObj.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3);

    return `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" class="chart-bar-rect" style="fill: var(--teal); filter: drop-shadow(0px 2px 4px rgba(0, 194, 255, 0.2));" />
      <text x="${x + barWidth/2}" y="${height - 5}" text-anchor="middle" font-size="8px">${dayLabel}</text>
      <text x="${x + barWidth/2}" y="${y - 4}" text-anchor="middle" font-size="9px" font-weight="700" fill="var(--ink)">${values[idx]}</text>
    `;
  }).join("");

  return `
    <div style="width: 100%; display: flex; justify-content: center; align-items: center; padding-top: 10px;">
      <svg viewBox="0 0 380 110" class="gymflow-chart">
        <line x1="${padding}" y1="${height - padding - 15}" x2="${width - padding}" y2="${height - padding - 15}" class="axis-line" />
        ${barsHtml}
      </svg>
    </div>
  `;
}


function renderCommunityFeed(context) {
  const logs = context.data.workout_logs || [];
  const members = context.data.members || [];
  
  // Filter for only public logs (private === false)
  const publicLogs = logs
    .filter(l => !l.private)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .slice(0, 10);

  const findMember = (memberId) => {
    return members.find(m => m.id === memberId) || { fullName: "Gym Member" };
  };

  return `
    <section class="panel stack" style="margin-top: 20px;">
      <div class="panel-heading">
        <h2>Gym Community Feed</h2>
        <span>Latest Member Activity</span>
      </div>
      ${publicLogs.length 
        ? `<div class="feed-list stack" style="gap: 12px; margin-top: 10px;">
            ${publicLogs.map(log => {
              const member = findMember(log.memberId);
              const initials = (member.fullName || "M").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "M";
              const exercises = log.exercises || [];
              const hasExercises = exercises.length > 0;
              
              return `
                <div class="feed-item" style="display:flex; flex-direction:column; gap:8px; padding:12px; border:1px solid var(--line); border-radius:var(--r-md); background:var(--bg-alt);">
                  <div style="display:flex; gap:10px; align-items:center;">
                    <span class="avatar small" style="width:36px; height:36px;">
                      ${initials}
                    </span>
                    <div>
                      <strong style="font-size:0.95rem; color:var(--text);">${escapeHtml(member.fullName)}</strong>
                      <div style="font-size:0.75rem; opacity:0.8; color:var(--text-muted);">${dateLabel(log.date)}</div>
                    </div>
                  </div>
                  
                  <div style="padding-left:46px;">
                    <h4 style="margin:0 0 4px 0; color:var(--teal-ink); font-size:1rem;">${escapeHtml(log.routineName || "Workout")}</h4>
                    <small style="opacity:0.9; font-weight:600; font-size:0.8rem;">Duration: ${log.durationMinutes || 0} mins</small>
                    ${log.notes ? `<p style="font-style:italic; font-size:0.85rem; margin:4px 0; opacity:0.95; color:var(--text);">"${escapeHtml(log.notes)}"</p>` : ""}
                    
                    ${hasExercises ? `
                      <button class="ghost-button compact" data-toggle-feed-workout="${log.id}" data-exercise-count="${exercises.length}" style="font-size:0.75rem; padding: 4px 8px; margin-top: 6px; display:inline-flex; align-items:center; gap:4px; font-weight:600;">
                        <span class="material-symbols-outlined" style="font-size:1rem;">expand_more</span>
                        Show Exercises (${exercises.length})
                      </button>
                      <div class="feed-workout-details hidden" id="feed-details-${log.id}" style="margin-top:6px; display:flex; flex-direction:column; gap:2px; border-top:1px solid var(--line); padding-top:6px;">
                        ${exercises.map(ex => `
                          <div style="font-size:0.85rem; margin-top:2px;">
                            <strong>${escapeHtml(ex.name)}</strong>
                            <span style="opacity:0.8; padding-left:8px;">
                              ${(ex.sets || []).map((s, idx) => `${idx + 1}: ${s.weight}kg x ${s.reps}`).join(" / ")}
                            </span>
                          </div>
                        `).join("")}
                      </div>
                    ` : ""}
                  </div>
                </div>
              `;
            }).join("")}
           </div>`
        : `<div class="table-empty">No workouts shared in the community feed yet.</div>`
      }
    </section>
  `;
}

function renderLeaderboardPanel(context) {
  const activeTab = dashboardModule.activeLeaderboardTab || "points";
  const gymId = context.profile?.gymId || context.myMember?.gymId || "";
  const sameGymMembers = (context.data.members || []).filter(m => m.gymId === gymId && m.status !== "Pending" && !m.privateLeaderboard);

  const getWeight = (memberId) => {
    const records = (context.data.progress_records || []).filter(r => r.memberId === memberId);
    if (records.length === 0) return 0;
    const sorted = [...records].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    return Number(sorted[0].weight || 0);
  };

  const rankedList = sameGymMembers.map(m => {
    const weight = getWeight(m.id);
    let weightClass = "Under 65kg";
    if (weight >= 85) weightClass = "85kg+";
    else if (weight >= 75) weightClass = "75-85kg";
    else if (weight >= 65) weightClass = "65-75kg";

    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyCheckins = (context.data.attendance || [])
      .filter(r => r.memberId === m.id && String(r.date || "").startsWith(currentMonth)).length;

    return {
      id: m.id,
      fullName: m.fullName,
      points: Number(m.points || 0),
      streak: Number(m.currentStreak || 0),
      monthlyCheckins,
      gender: m.gender || "Not specified",
      weight,
      weightClass
    };
  });

  // Default filter initialization
  if (context.profile?.role === "member" && context.myMember) {
    if (!dashboardModule.selectedGender) {
      dashboardModule.selectedGender = context.myMember.gender || "All";
    }
    if (!dashboardModule.selectedWeightClass) {
      const memberWeight = getWeight(context.myMember.id);
      if (memberWeight >= 85) dashboardModule.selectedWeightClass = "85kg+";
      else if (memberWeight >= 75) dashboardModule.selectedWeightClass = "75-85kg";
      else if (memberWeight >= 65) dashboardModule.selectedWeightClass = "65-75kg";
      else if (memberWeight > 0) dashboardModule.selectedWeightClass = "Under 65kg";
      else dashboardModule.selectedWeightClass = "All";
    }
  } else {
    dashboardModule.selectedGender ||= "All";
    dashboardModule.selectedWeightClass ||= "All";
  }

  let filteredRanked = [...rankedList];
  let displayValueKey = "points";
  let displayUnit = "pts";

  if (activeTab === "points") {
    filteredRanked.sort((a, b) => b.points - a.points || a.fullName.localeCompare(b.fullName));
    displayValueKey = "points";
    displayUnit = "pts";
  } else if (activeTab === "consistency") {
    filteredRanked.sort((a, b) => b.streak - a.streak || b.monthlyCheckins - a.monthlyCheckins || a.fullName.localeCompare(b.fullName));
    displayValueKey = "streak";
    displayUnit = "days streak";
  } else if (activeTab === "weight") {
    const genderFilter = dashboardModule.selectedGender;
    const weightFilter = dashboardModule.selectedWeightClass;

    if (genderFilter !== "All") {
      filteredRanked = filteredRanked.filter(m => m.gender === genderFilter);
    }
    if (weightFilter !== "All") {
      filteredRanked = filteredRanked.filter(m => m.weightClass === weightFilter);
    }

    filteredRanked.sort((a, b) => b.points - a.points || a.fullName.localeCompare(b.fullName));
    displayValueKey = "points";
    displayUnit = "pts";
  }

  const tabButton = (tabId, icon, label) => `
    <button class="tab-btn ${activeTab === tabId ? "active" : ""}" data-leaderboard-tab="${tabId}" style="padding: 8px 16px; font-size: 0.85rem; display: flex; align-items: center; gap: 6px;">
      <span class="material-symbols-outlined" style="font-size: 1.1rem;">${icon}</span> ${label}
    </button>
  `;

  let filterControls = "";
  if (activeTab === "weight") {
    filterControls = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 12px; background: var(--bg-alt); padding: 10px; border-radius: var(--r-sm); border: 1px solid var(--line);">
        <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem;">
          Gender:
          <select id="leaderboard-gender-select" style="padding: 4px 8px; border-radius: var(--r-sm); background: var(--bg); border: 1px solid var(--line); color: var(--text);">
            <option value="All" ${dashboardModule.selectedGender === "All" ? "selected" : ""}>All</option>
            <option value="Male" ${dashboardModule.selectedGender === "Male" ? "selected" : ""}>Male</option>
            <option value="Female" ${dashboardModule.selectedGender === "Female" ? "selected" : ""}>Female</option>
            <option value="Other" ${dashboardModule.selectedGender === "Other" ? "selected" : ""}>Other</option>
          </select>
        </label>
        <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem;">
          Weight Range:
          <select id="leaderboard-weight-select" style="padding: 4px 8px; border-radius: var(--r-sm); background: var(--bg); border: 1px solid var(--line); color: var(--text);">
            <option value="All" ${dashboardModule.selectedWeightClass === "All" ? "selected" : ""}>All</option>
            <option value="Under 65kg" ${dashboardModule.selectedWeightClass === "Under 65kg" ? "selected" : ""}>Under 65kg</option>
            <option value="65-75kg" ${dashboardModule.selectedWeightClass === "65-75kg" ? "selected" : ""}>65-75kg</option>
            <option value="75-85kg" ${dashboardModule.selectedWeightClass === "75-85kg" ? "selected" : ""}>75-85kg</option>
            <option value="85kg+" ${dashboardModule.selectedWeightClass === "85kg+" ? "selected" : ""}>85kg+</option>
          </select>
        </label>
      </div>
    `;
  }

  return `
    <section class="panel stack" style="margin-top: 20px;">
      <div class="panel-heading">
        <h2>Gym Leaderboard</h2>
        <span>Rankings & Achievements</span>
      </div>

      <div class="tabs-header" style="margin-bottom: 12px; border-bottom: 1px solid var(--line); justify-content: flex-start; gap: 8px; overflow-x: auto; white-space: nowrap; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; scrollbar-width: none; display: flex; padding-bottom: 4px;">
        ${tabButton("points", "emoji_events", "Points")}
        ${tabButton("consistency", "local_fire_department", "Consistency")}
        ${tabButton("weight", "fitness_center", "Weight Class")}
      </div>

      ${filterControls}

      <div class="list-table compact">
        ${filteredRanked.length ? filteredRanked.map((member, index) => {
          const isMe = context.myMember && context.myMember.id === member.id;
          let rowStyle = "padding: 12px 15px; display: flex; align-items: center; justify-content: space-between; border-radius: var(--r-sm); margin-bottom: 6px; transition: transform 0.2s ease;";
          let rankBadge = "";
          
          if (index === 0) {
            rowStyle += " background: linear-gradient(135deg, rgba(255, 215, 0, 0.12) 0%, rgba(255, 179, 0, 0.04) 100%); border-left: 4px solid #FFD700; box-shadow: 0 2px 8px rgba(255, 215, 0, 0.1);";
            rankBadge = `<span style="font-size: 1.4rem; filter: drop-shadow(0 2px 4px rgba(255,215,0,0.5));">🥇</span>`;
          } else if (index === 1) {
            rowStyle += " background: linear-gradient(135deg, rgba(192, 192, 192, 0.12) 0%, rgba(144, 164, 174, 0.04) 100%); border-left: 4px solid #C0C0C0; box-shadow: 0 2px 8px rgba(192, 192, 192, 0.1);";
            rankBadge = `<span style="font-size: 1.4rem; filter: drop-shadow(0 2px 4px rgba(192,192,192,0.5));">🥈</span>`;
          } else if (index === 2) {
            rowStyle += " background: linear-gradient(135deg, rgba(205, 127, 50, 0.12) 0%, rgba(216, 67, 21, 0.04) 100%); border-left: 4px solid #CD7F32; box-shadow: 0 2px 8px rgba(205, 127, 50, 0.1);";
            rankBadge = `<span style="font-size: 1.4rem; filter: drop-shadow(0 2px 4px rgba(205,127,50,0.5));">🥉</span>`;
          } else {
            rowStyle += " border-left: 4px solid transparent;";
            rankBadge = `<span style="font-size: 0.95rem; font-weight: 700; color: var(--text-muted); width: 24px; text-align: center; display: inline-block;">${index + 1}</span>`;
          }

          if (isMe) {
            rowStyle += " border: 1px solid var(--primary); box-shadow: 0 4px 12px rgba(var(--primary-rgb, 217, 119, 6), 0.15);";
          }
          
          return `
            <div class="table-row" style="${rowStyle}">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 30px; display: flex; justify-content: center; align-items: center;">${rankBadge}</div>
                <span style="color: var(--text); font-weight: ${isMe ? '700' : '500'};">${escapeHtml(member.fullName)} ${isMe ? '<small style="color: var(--primary); font-weight: normal; margin-left: 4px;">(You)</small>' : ''}</span>
              </div>
              <span style="color: var(--accent); font-weight: 700; font-size: 1.05rem;">
                ${member[displayValueKey]} <small style="font-weight: normal; font-size: 0.8rem; opacity: 0.85;">${displayUnit}</small>
              </span>
            </div>
          `;
        }).join("") : `<div class="table-empty">No members ranked in this category yet.</div>`}
      </div>
    </section>
  `;
}
