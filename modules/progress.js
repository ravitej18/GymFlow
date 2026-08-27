import { collections, dateLabel, emptyState, escapeHtml, findName, formData, nameCell, optionList, pageHeader, today, trendChart, withButtonLoading, getBadgeCss, renderBadgeIcon, getMemberTier, getBadgeClass, getExercises, findExerciseByName, exerciseCategory } from "./utils.js";
import { loggedExercises, exerciseSeries, exerciseSummary, effortBreakdown, muscleBalance, activityHeatmap, HEATMAP_BLOCKS } from "./workout-analytics.js";

const METRICS = [
  { key: "weight", label: "Weight (kg)", color: "var(--teal)" },
  { key: "bmi", label: "BMI", color: "var(--primary-strong)" },
  { key: "bodyFat", label: "Body Fat %", color: "#c36f2d" },
  { key: "waist", label: "Waist (cm)", color: "var(--ink-soft)" }
];

export const progressModule = {
  activeTab: "metrics",
  analyticsExercise: null, // exercise name focused in the Training Analytics tab
  render(context) {
    if (context.profile?.role === "member") {
      return renderMemberProgress(context);
    }
    const { data } = context;
    const records = data.progress_records || [];
    const members = data.members || [];
    const firstMember = members[0]?.id || "";

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
          <button class="primary-button" type="submit"><span class="material-symbols-outlined">add</span>Save progress</button>
        </form>

        <section class="panel">
          <div class="panel-heading">
            <h2>Progress Chart</h2>
            <div class="button-row">
              <select data-chart-member>
                <option value="">Select member</option>
                ${optionList(members, "fullName", firstMember)}
              </select>
              <select data-chart-metric>
                ${METRICS.map((m) => `<option value="${m.key}">${m.label}</option>`).join("")}
              </select>
            </div>
          </div>
          <div data-chart>${chartFor(records, firstMember, "weight")}</div>
        </section>
      </div>

      <section class="panel" style="margin-top:18px">
        <div class="panel-heading"><h2>Progress History</h2><span>${records.length} records</span></div>
        ${
          records.length
            ? `<div class="data-table progress-history-table">
                <div class="table-head"><span>Member</span><span>Date</span><span>Weight</span><span>BMI</span><span>Notes</span></div>
                ${records.map((record) => row(record, members)).join("")}
              </div>`
            : emptyState("No progress records", "Track body measurements and notes over time.")
        }
      </section>
    `;
  },
  bind(root, context) {
    if (context.profile?.role === "member") {
      bindMemberProgress(root, context);
      return;
    }
    const form = root.querySelector("#progress-form");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await withButtonLoading(form.querySelector("[type='submit']"), async () => {
        const saved = await context.services.data.save(collections.progress, formData(form));
        context.toast("Progress saved.");
        form.reset();
        form.date.value = today();
        context.applyChange(collections.progress, saved);
      });
    });

    const memberSel = root.querySelector("[data-chart-member]");
    const metricSel = root.querySelector("[data-chart-metric]");
    const chartBox = root.querySelector("[data-chart]");
    function redraw() {
      chartBox.innerHTML = chartFor(context.data.progress_records || [], memberSel.value, metricSel.value);
    }
    memberSel?.addEventListener("change", redraw);
    metricSel?.addEventListener("change", redraw);
  }
};

// ===== Member read-only progress view =====
function renderMemberProgress(context) {
  const me = context.myMember;
  if (!me) {
    return `
      ${pageHeader("Progress")}
      ${emptyState("Membership being set up", "Your progress records will appear here once your gym adds them.")}
    `;
  }

  const activeTab = progressModule.activeTab || "metrics";

  const tabHeader = `
    <div class="tabs-header" style="margin-bottom: 18px; border-bottom: 1px solid var(--line); justify-content: flex-start; gap: 8px;">
      <button class="tab-btn ${activeTab === "metrics" ? "active" : ""}" data-progress-tab="metrics" style="padding: 8px 16px; font-size: 0.85rem;">
        Metrics & History
      </button>
      <button class="tab-btn ${activeTab === "badges" ? "active" : ""}" data-progress-tab="badges" style="padding: 8px 16px; font-size: 0.85rem;">
        Badges & PRs
      </button>
      <button class="tab-btn ${activeTab === "training" ? "active" : ""}" data-progress-tab="training" style="padding: 8px 16px; font-size: 0.85rem;">
        Training Analytics
      </button>
    </div>
  `;

  if (activeTab === "training") {
    return `
      ${pageHeader("Progress")}
      ${tabHeader}
      ${renderTrainingAnalytics(context, me)}
    `;
  }

  if (activeTab === "metrics") {
    const records = (context.data.progress_records || [])
      .filter((r) => r.memberId === me.id)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));

    return `
      ${pageHeader("Progress")}
      ${tabHeader}
      <section class="panel">
        <div class="panel-heading">
          <h2>My Trend</h2>
          <select data-chart-metric>
            ${METRICS.map((m) => `<option value="${m.key}">${m.label}</option>`).join("")}
          </select>
        </div>
        <div data-chart>${chartFor(records, me.id, "weight")}</div>
      </section>
      <section class="panel" style="margin-top:18px">
        <div class="panel-heading"><h2>History</h2><span>${records.length} records</span></div>
        ${
          records.length
            ? `<div class="data-table member-progress-history-table">
                <div class="table-head"><span>Date</span><span>Weight</span><span>BMI</span><span>Notes</span></div>
                ${records
                  .map(
                    (record) => `
                      <div class="table-row">
                        <span data-label="Date">${dateLabel(record.date)}</span>
                        <span data-label="Weight">${escapeHtml(record.weight || "-")} kg</span>
                        <span data-label="BMI">${escapeHtml(record.bmi || "-")}</span>
                        <span data-label="Notes"><small>${escapeHtml(record.notes || "")}</small></span>
                      </div>
                    `
                  )
                  .join("")}
              </div>`
            : emptyState("No progress records", "Your gym hasn't recorded any measurements yet.")
        }
      </section>
    `;
  } else {
    const badges = context.data.badges || [];
    const unlockedBadgeIds = me.unlockedBadges || [];
    const personalRecords = me.personalRecords || {};
    const myLogsCount = (context.data.workout_logs || []).filter(l => l.memberId === me.id).length;
    const currentStreak = me.currentStreak || 0;
    const tier = getMemberTier(me.points || 0);

    const levelSummaryHtml = `
      <section class="panel">
        <div class="panel-heading">
          <h2>Level & Rank</h2>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; background: var(--surface-soft); padding: 16px 20px; border-radius: var(--r-md); box-shadow: var(--shadow-card); margin-top: 12px;">
          <div style="display:flex; flex-direction:column; gap:4px;">
            <span style="font-size: 0.85rem; color: var(--muted); font-weight:600;">Total Score</span>
            <strong style="font-size: 1.6rem; color: var(--accent);">${me.points || 0} <span style="font-size: 0.9rem; font-weight: normal; color: var(--muted);">Points</span></strong>
          </div>
          <div class="tier-badge ${tier.class}">
            <span class="material-symbols-outlined" style="font-size:18px;">${tier.icon}</span>
            ${tier.name} Tier
          </div>
        </div>
      </section>
    `;

    const badgesHtml = `
      <section class="panel" style="margin-top: 18px;">
        <div class="panel-heading">
          <h2>My Badges</h2>
          <span>${unlockedBadgeIds.length} / ${badges.length} unlocked</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr)); gap: 15px; margin-top: 15px;">
          ${badges.map(badge => {
            const isUnlocked = unlockedBadgeIds.includes(badge.id);
            const cardClass = getBadgeClass(badge.id, isUnlocked);
            let progressHtml = "";
            if (!isUnlocked) {
              let currentVal = 0;
              let threshold = badge.threshold;
              let unit = "";
              if (badge.type === "streak") {
                currentVal = currentStreak;
                unit = "days";
              } else if (badge.type === "workout_count") {
                currentVal = myLogsCount;
                unit = "workouts";
              } else if (badge.type === "pr") {
                currentVal = Object.keys(personalRecords).length;
                unit = "PR";
              } else if (badge.type === "pr_weight") {
                currentVal = Math.max(...Object.values(personalRecords).map(Number), 0);
                unit = "kg";
              }
              const pct = Math.min(100, Math.round((currentVal / threshold) * 100));
              progressHtml = `
                <div style="margin-top: 8px; width: 100%;">
                  <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--muted); margin-bottom: 3px;">
                    <span>Progress</span>
                    <span>${currentVal}/${threshold} ${unit}</span>
                  </div>
                  <div class="nm-progress-track">
                    <div class="nm-progress-bar" style="width: ${pct}%;"></div>
                  </div>
                </div>
              `;
            }

            return `
              <div class="${cardClass}">
                <div style="display: flex; gap: 12px; align-items: center; width: 100%;">
                  ${renderBadgeIcon(badge.id, isUnlocked)}
                  <div style="text-align: left; flex: 1;">
                    <strong style="font-size: 0.9rem; color: inherit; display: block; font-weight:700;">${escapeHtml(badge.name)}</strong>
                    <div style="font-size: 0.72rem; color: inherit; opacity: 0.85; line-height: 1.3;">${escapeHtml(badge.description)}</div>
                  </div>
                </div>
                ${progressHtml}
              </div>
            `;
          }).join("")}
        </div>
      </section>
    `;

    const prList = Object.entries(personalRecords);
    const prsHtml = `
      <section class="panel" style="margin-top: 18px;">
        <div class="panel-heading">
          <h2>Personal Records</h2>
          <span>${prList.length} exercises</span>
        </div>
        ${prList.length ? `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 180px), 1fr)); gap: 12px; margin-top: 15px;">
            ${prList.map(([exercise, weight]) => `
              <div style="background: var(--surface-soft); padding: 14px 16px; border-radius: var(--r-md); border-left: 4px solid var(--teal); box-shadow: var(--shadow-card); display:flex; flex-direction:column; gap:4px; text-align:left;">
                <span style="font-size: 0.75rem; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing:0.5px;">${escapeHtml(exercise)}</span>
                <strong style="font-size: 1.2rem; color: var(--ink-soft);">${weight} <span style="font-size: 0.85rem; font-weight:normal; color:var(--muted)">kg</span></strong>
              </div>
            `).join("")}
          </div>
        ` : `<div class="table-empty" style="margin-top:15px;">Log a workout with set weights to record your first PR!</div>`}
      </section>
    `;

    return `
      ${pageHeader("Progress")}
      ${tabHeader}
      ${levelSummaryHtml}
      ${badgesHtml}
      ${prsHtml}
    `;
  }
}

// ---- Training Analytics (per-exercise curves, effort, balance, heatmap) ----

function renderTrainingAnalytics(context, me) {
  const logs = (context.data.workout_logs || []).filter((log) => log.memberId === me.id);
  const exercises = loggedExercises(logs);

  if (!exercises.length) {
    return emptyState(
      "No training data yet",
      "Log a workout and tick off your sets — your strength curves, effort profile and muscle balance build up from there."
    );
  }

  // Default to the most-trained exercise; keep the current choice if still valid.
  const chosen =
    exercises.find((ex) => ex.name === progressModule.analyticsExercise)?.name || exercises[0].name;
  progressModule.analyticsExercise = chosen;

  const summary = exerciseSummary(logs, chosen);
  const series = exerciseSeries(logs, chosen);
  const effort = effortBreakdown(logs);
  // The exercise library loads lazily; until it resolves every lookup misses and
  // the balance card shows its loading state rather than a chart of zeros.
  const balance = muscleBalance(logs, (name) => exerciseCategory(findExerciseByName(name)));
  const heat = activityHeatmap(logs);

  return `
    ${renderExerciseCard(exercises, chosen, summary, series)}
    <div class="analytics-grid">
      ${renderBalanceCard(balance)}
      ${renderEffortCard(effort)}
    </div>
    ${renderHeatmapCard(heat)}
  `;
}

function renderExerciseCard(exercises, chosen, summary, series) {
  const oneRmSeries = series
    .filter((point) => point.oneRepMax > 0)
    .map((point) => ({ label: dateLabel(point.date), value: point.oneRepMax }));

  const trend = summary && summary.changePct !== null
    ? `<span class="analytics-delta ${summary.changePct >= 0 ? "up" : "down"}">
         <span class="material-symbols-outlined">${summary.changePct >= 0 ? "trending_up" : "trending_down"}</span>
         ${summary.changePct >= 0 ? "+" : ""}${summary.changePct}%
       </span>`
    : `<span class="analytics-delta neutral">Not enough sessions for a trend</span>`;

  return `
    <section class="panel">
      <div class="panel-heading">
        <h2>Exercise Progress</h2>
        <select data-analytics-exercise aria-label="Choose exercise">
          ${exercises.map((ex) => `
            <option value="${escapeHtml(ex.name)}" ${ex.name === chosen ? "selected" : ""}>
              ${escapeHtml(ex.name)} (${ex.sessions})
            </option>
          `).join("")}
        </select>
      </div>

      <div class="analytics-stat-row">
        ${statTile("Estimated 1RM", summary?.currentOneRepMax ? `${summary.currentOneRepMax} kg` : "—", "Epley estimate from your latest session")}
        ${statTile("Best ever", summary?.bestOneRepMax ? `${summary.bestOneRepMax} kg` : "—", "Highest estimated 1RM you have hit")}
        ${statTile("Sessions", String(summary?.sessions || 0), "Times you have trained this lift")}
        ${statTile("Total volume", `${(summary?.totalVolume || 0).toLocaleString()} kg`, "Weight x reps across every completed set")}
      </div>

      <div class="analytics-trend-head">
        <strong>Estimated 1RM over time</strong>
        ${trend}
      </div>
      ${oneRmSeries.length
        ? trendChart(oneRmSeries, { color: "var(--teal)" })
        : `<div class="table-empty">Log weighted sets of 12 reps or fewer to estimate your 1RM.</div>`}
    </section>
  `;
}

function statTile(label, value, hint) {
  return `
    <div class="analytics-stat" title="${escapeHtml(hint)}">
      <span class="analytics-stat-label">${escapeHtml(label)}</span>
      <strong class="analytics-stat-value">${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderBalanceCard(balance) {
  // Nothing mapped but sets present means the library has not loaded yet (or the
  // member only logs custom lifts) — an all-zero chart would mislead.
  const noneMapped = balance.totalSets === 0 && balance.unmapped > 0;

  return `
    <section class="panel" data-balance-card>
      <div class="panel-heading">
        <h2>Muscle Balance</h2>
        <span>${balance.totalSets} sets mapped</span>
      </div>
      ${noneMapped
        ? `<div class="table-empty">Matching your lifts to muscle groups… if this persists, the exercises you logged are custom ones with no muscle data.</div>`
        : `<div class="body-map-layout">
            ${renderBodyMap(balance)}
            <div class="muscle-balance stack">
              ${balance.groups.map((group) => `
                <div class="muscle-row">
                  <span class="muscle-label">${escapeHtml(group.label)}</span>
                  <span class="muscle-bar"><span style="width:${group.share}%"></span></span>
                  <span class="muscle-value">${group.sets} <small>(${group.pct}%)</small></span>
                </div>
              `).join("")}
            </div>
          </div>
          ${balance.unmapped
            ? `<p class="analytics-footnote">${balance.unmapped} set${balance.unmapped === 1 ? "" : "s"} from custom exercises could not be mapped to a muscle group.</p>`
            : ""}`}
    </section>
  `;
}

// Anatomical body map. A stylised front/back figure whose regions are shaded by
// training share, so a neglected group is visible at a glance rather than having
// to be read off a bar. Colour comes from a single accent at varying opacity, so
// it stays legible in both themes and for colour-vision deficiency; every region
// also carries a title and its set count is in the bars beside it.
function renderBodyMap(balance) {
  const share = {};
  balance.groups.forEach((group) => {
    share[group.key] = group.share;
  });

  // Opacity floor keeps an untrained region visible as an outline rather than
  // vanishing into the background.
  const fill = (key) => {
    const value = share[key] || 0;
    const opacity = value === 0 ? 0.08 : 0.2 + (value / 100) * 0.8;
    return `fill="var(--accent, var(--primary))" fill-opacity="${opacity.toFixed(2)}"`;
  };
  const label = (key) => {
    const group = balance.groups.find((g) => g.key === key);
    return group ? `${group.label}: ${group.sets} set${group.sets === 1 ? "" : "s"} (${group.pct}%)` : key;
  };
  const region = (key, shape) => `<g class="body-region" ${fill(key)}><title>${escapeHtml(label(key))}</title>${shape}</g>`;

  return `
    <div class="body-map" role="img" aria-label="Muscle balance body map. ${escapeHtml(balance.groups.map((g) => `${g.label} ${g.pct}%`).join(", "))}">
      <svg viewBox="0 0 200 150" preserveAspectRatio="xMidYMid meet">
        <g stroke="var(--line)" stroke-width="0.8">
          <!-- Front view -->
          <circle cx="50" cy="18" r="9" fill="none" />
          ${region("shoulders", '<ellipse cx="34" cy="35" rx="8" ry="6" /><ellipse cx="66" cy="35" rx="8" ry="6" />')}
          ${region("chest", '<rect x="36" y="31" width="28" height="18" rx="5" />')}
          ${region("core", '<rect x="39" y="50" width="22" height="22" rx="4" />')}
          ${region("arms", '<rect x="24" y="40" width="9" height="30" rx="4" /><rect x="67" y="40" width="9" height="30" rx="4" />')}
          ${region("legs", '<rect x="38" y="73" width="11" height="46" rx="5" /><rect x="51" y="73" width="11" height="46" rx="5" />')}
          <text x="50" y="136" text-anchor="middle" class="body-map-caption">Front</text>

          <!-- Back view -->
          <circle cx="150" cy="18" r="9" fill="none" />
          ${region("shoulders", '<ellipse cx="134" cy="35" rx="8" ry="6" /><ellipse cx="166" cy="35" rx="8" ry="6" />')}
          ${region("back", '<rect x="136" y="31" width="28" height="30" rx="5" />')}
          ${region("core", '<rect x="139" y="62" width="22" height="10" rx="3" />')}
          ${region("arms", '<rect x="124" y="40" width="9" height="30" rx="4" /><rect x="167" y="40" width="9" height="30" rx="4" />')}
          ${region("legs", '<rect x="138" y="73" width="11" height="46" rx="5" /><rect x="151" y="73" width="11" height="46" rx="5" />')}
          <text x="150" y="136" text-anchor="middle" class="body-map-caption">Back</text>
        </g>
      </svg>
    </div>
  `;
}

function renderEffortCard(effort) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <h2>Effort Profile</h2>
        <span>${effort.averageRpe ? `Avg RPE ${effort.averageRpe} · ${effort.averageRir} RIR` : "No effort logged"}</span>
      </div>
      ${effort.rows.length
        ? `<div class="effort-list stack">
            ${effort.rows.map((row) => `
              <div class="muscle-row">
                <span class="muscle-label" title="${row.rir} rep${row.rir === 1 ? "" : "s"} in reserve">RPE ${row.rpe} <small>(${row.rir} RIR)</small></span>
                <span class="muscle-bar"><span style="width:${row.pct}%"></span></span>
                <span class="muscle-value">${row.count} <small>(${row.pct}%)</small></span>
              </div>
            `).join("")}
          </div>
          ${effort.unrated
            ? `<p class="analytics-footnote">${effort.unrated} completed set${effort.unrated === 1 ? "" : "s"} had no RPE recorded.</p>`
            : ""}`
        : `<div class="table-empty">Pick an RPE (or reps in reserve) when you log a set to see how hard your sessions really are.</div>`}
    </section>
  `;
}

const HEATMAP_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function renderHeatmapCard(heat) {
  if (!heat.max) {
    return `
      <section class="panel" style="margin-top:18px;">
        <div class="panel-heading"><h2>When You Train</h2></div>
        <div class="table-empty">Complete a few sessions to see which days and times you train most.</div>
      </section>
    `;
  }

  return `
    <section class="panel" style="margin-top:18px;">
      <div class="panel-heading">
        <h2>When You Train</h2>
        <span>Sets logged by day and time</span>
      </div>
      <div style="overflow-x:auto;">
        <table class="heatmap-table">
          <thead>
            <tr>
              <th scope="col"></th>
              ${HEATMAP_BLOCKS.map((block) => `<th scope="col">${escapeHtml(block)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${HEATMAP_DAYS.map((day, dayIdx) => `
              <tr>
                <th scope="row">${day}</th>
                ${heat.grid[dayIdx].map((value, blockIdx) => {
                  const level = value === 0 ? 0 : Math.max(1, Math.ceil((value / heat.max) * 4));
                  return `<td class="heatmap-cell ${level ? `level-${level}` : ""}" title="${value} set${value === 1 ? "" : "s"} on ${day} (${HEATMAP_BLOCKS[blockIdx]})">${value || ""}</td>`;
                }).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function bindMemberProgress(root, context) {
  const tabButtons = root.querySelectorAll("[data-progress-tab]");
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      progressModule.activeTab = btn.dataset.progressTab;
      context.refreshView();
    });
  });

  const me = context.myMember;
  if (!me || progressModule.activeTab === "badges") return;

  if (progressModule.activeTab === "training") {
    // Muscle balance needs the exercise library for its name -> category lookup.
    // It is cached after the first fetch, so re-render only when it just arrived.
    const balanceCard = root.querySelector("[data-balance-card]");
    if (balanceCard && !findExerciseByName("bench press")) {
      getExercises().then(() => {
        // Swap just this card in — a full refreshView() would re-read the
        // backend and rebuild the page merely to fill in one chart.
        if (!balanceCard.isConnected) return;
        const logs = (context.data.workout_logs || []).filter((log) => log.memberId === me.id);
        balanceCard.outerHTML = renderBalanceCard(
          muscleBalance(logs, (name) => exerciseCategory(findExerciseByName(name)))
        );
      }).catch(() => {});
    }

    root.querySelector("[data-analytics-exercise]")?.addEventListener("change", (event) => {
      progressModule.analyticsExercise = event.target.value;
      context.refreshView();
    });
    return;
  }

  const metricSel = root.querySelector("[data-chart-metric]");
  const chartBox = root.querySelector("[data-chart]");
  if (!metricSel || !chartBox) return;
  metricSel.addEventListener("change", () => {
    const records = (context.data.progress_records || []).filter((r) => r.memberId === me.id);
    chartBox.innerHTML = chartFor(records, me.id, metricSel.value);
  });
}

function chartFor(records, memberId, metricKey) {
  if (!memberId) return `<div class="table-empty">Select a member to see their trend.</div>`;
  const metric = METRICS.find((m) => m.key === metricKey) || METRICS[0];
  const series = records
    .filter((r) => r.memberId === memberId && r[metric.key] !== "" && r[metric.key] != null)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((r) => ({ label: dateLabel(r.date), value: Number(r[metric.key]) }));
  return trendChart(series, { color: metric.color });
}

function row(record, members) {
  return `
    <div class="table-row">
      <span data-label="Member">${nameCell(findName(members, record.memberId), "", members.find(m => m.id === record.memberId)?.avatarUrl || "")}</span>
      <span data-label="Date">${dateLabel(record.date)}</span>
      <span data-label="Weight">${escapeHtml(record.weight || "-")} kg</span>
      <span data-label="BMI">${escapeHtml(record.bmi || "-")}</span>
      <span data-label="Notes"><small>${escapeHtml(record.notes || "")}</small></span>
    </div>
  `;
}
