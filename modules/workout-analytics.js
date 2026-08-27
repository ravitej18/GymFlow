// Training-quality analytics derived from a member's own workout logs.
//
// Everything here is a pure function over the logs array so it can be unit
// tested without a DOM or a backend. The rendering layer lives in progress.js.

// Muscle regions used for the balance map. Keys match the `category` field of
// lib/exercises-pruned.json; the dataset's ten categories are folded into the
// six groups a lifter actually thinks in terms of.
export const MUSCLE_GROUPS = [
  { key: "chest", label: "Chest", categories: ["chest"] },
  { key: "back", label: "Back", categories: ["back"] },
  { key: "shoulders", label: "Shoulders", categories: ["shoulders", "neck"] },
  { key: "arms", label: "Arms", categories: ["upper arms", "lower arms"] },
  { key: "legs", label: "Legs", categories: ["upper legs", "lower legs"] },
  { key: "core", label: "Core", categories: ["waist"] }
];

function toNumber(value) {
  const n = parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function normalise(name) {
  return String(name || "").trim().toLowerCase();
}

// True when a whole log predates the per-set `done` flag. Such logs record
// only what was actually performed, so every populated set counts. Deciding
// this per *log* rather than per *exercise* matters: within a modern log an
// exercise whose sets are all unticked was genuinely skipped, and must not be
// mistaken for legacy history.
function isLegacyLog(log) {
  return !(log?.exercises || []).some((ex) => (ex?.sets || []).some((set) => "done" in set));
}

// Only sets the member actually completed count toward analytics. Sets that
// were pre-filled by the progression engine but never ticked would otherwise
// inflate volume and fake personal records.
function completedSets(exercise, legacy = false) {
  const sets = exercise?.sets || [];
  if (legacy) {
    return sets.filter((set) => toNumber(set.weight) > 0 || toNumber(set.reps) > 0);
  }
  return sets.filter((set) => set.done);
}

// Epley one-rep-max estimate. Returns 0 for bodyweight or unusable sets.
// Above ~12 reps the formula loses meaning, so we decline to guess.
export function estimateOneRepMax(weight, reps) {
  const w = toNumber(weight);
  const r = toNumber(reps);
  if (w <= 0 || r <= 0 || r > 12) return 0;
  if (r === 1) return w;
  return Math.round(w * (1 + r / 30) * 10) / 10;
}

// Best estimated 1RM across every completed set of one exercise in one session.
function sessionOneRepMax(exercise, legacy) {
  return completedSets(exercise, legacy).reduce(
    (best, set) => Math.max(best, estimateOneRepMax(set.weight, set.reps)),
    0
  );
}

// Total load moved (weight x reps) across completed sets.
function sessionVolume(exercise, legacy) {
  return completedSets(exercise, legacy).reduce(
    (sum, set) => sum + toNumber(set.weight) * toNumber(set.reps),
    0
  );
}

// The member's own logs for one exercise, oldest first — the shape every
// per-exercise curve below is built from.
export function exerciseSeries(logs, exerciseName) {
  const key = normalise(exerciseName);
  return (logs || [])
    .map((log) => {
      const match = (log.exercises || []).find((ex) => normalise(ex.name) === key);
      if (!match) return null;
      const legacy = isLegacyLog(log);
      const sets = completedSets(match, legacy);
      if (!sets.length) return null;
      return {
        date: log.date || "",
        sets: sets.length,
        reps: sets.reduce((sum, set) => sum + toNumber(set.reps), 0),
        volume: sessionVolume(match, legacy),
        oneRepMax: sessionOneRepMax(match, legacy),
        topWeight: sets.reduce((best, set) => Math.max(best, toNumber(set.weight)), 0)
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

// Every exercise the member has logged, ranked by how much they train it.
export function loggedExercises(logs) {
  const byName = new Map();
  (logs || []).forEach((log) => {
    const legacy = isLegacyLog(log);
    (log.exercises || []).forEach((ex) => {
      const key = normalise(ex.name);
      const sets = completedSets(ex, legacy);
      if (!key || !sets.length) return;
      const entry = byName.get(key) || { name: ex.name, sessions: 0, sets: 0, volume: 0 };
      entry.sessions += 1;
      entry.sets += sets.length;
      entry.volume += sessionVolume(ex, legacy);
      byName.set(key, entry);
    });
  });
  return [...byName.values()].sort(
    (a, b) => b.sessions - a.sessions || b.volume - a.volume || a.name.localeCompare(b.name)
  );
}

// Headline numbers for one exercise: current and best estimated 1RM, plus the
// trend between the earliest and most recent session that had a usable 1RM.
export function exerciseSummary(logs, exerciseName) {
  const series = exerciseSeries(logs, exerciseName);
  if (!series.length) return null;
  const withMax = series.filter((point) => point.oneRepMax > 0);
  const latest = withMax[withMax.length - 1] || null;
  const first = withMax[0] || null;
  const best = series.reduce((max, point) => Math.max(max, point.oneRepMax), 0);
  return {
    name: exerciseName,
    sessions: series.length,
    totalVolume: Math.round(series.reduce((sum, point) => sum + point.volume, 0)),
    currentOneRepMax: latest ? latest.oneRepMax : 0,
    bestOneRepMax: best,
    // null when there is only one usable data point — no trend can be claimed.
    changePct:
      first && latest && withMax.length > 1 && first.oneRepMax > 0
        ? Math.round(((latest.oneRepMax - first.oneRepMax) / first.oneRepMax) * 1000) / 10
        : null,
    lastTrained: series[series.length - 1].date
  };
}

// Effort distribution across RPE values the member recorded. Sets logged
// without an RPE are counted separately rather than silently dropped.
export function effortBreakdown(logs) {
  const buckets = new Map();
  let unrated = 0;
  let rated = 0;
  (logs || []).forEach((log) => {
    const legacy = isLegacyLog(log);
    (log.exercises || []).forEach((ex) => {
      completedSets(ex, legacy).forEach((set) => {
        const rpe = toNumber(set.rpe);
        if (rpe <= 0) {
          unrated += 1;
          return;
        }
        rated += 1;
        buckets.set(rpe, (buckets.get(rpe) || 0) + 1);
      });
    });
  });
  const rows = [...buckets.entries()]
    .map(([rpe, count]) => ({ rpe, count, pct: rated ? Math.round((count / rated) * 100) : 0 }))
    .sort((a, b) => a.rpe - b.rpe);
  const avg = rated
    ? Math.round(([...buckets.entries()].reduce((sum, [rpe, count]) => sum + rpe * count, 0) / rated) * 10) / 10
    : 0;
  // Reps in reserve is the same measurement from the other end: RIR = 10 - RPE.
  // Reporting both means a member who thinks in RIR does not have to convert.
  const averageRir = rated ? Math.round((10 - avg) * 10) / 10 : 0;
  return {
    rows: rows.map((row) => ({ ...row, rir: Math.round((10 - row.rpe) * 10) / 10 })),
    rated,
    unrated,
    averageRpe: avg,
    averageRir
  };
}

// Sets per muscle group, so a member can see what they are neglecting.
// `resolveCategory` maps an exercise name to a dataset category; it is injected
// so this stays pure and testable without loading the exercise library.
export function muscleBalance(logs, resolveCategory) {
  const totals = new Map(MUSCLE_GROUPS.map((group) => [group.key, 0]));
  let unmapped = 0;

  (logs || []).forEach((log) => {
    const legacy = isLegacyLog(log);
    (log.exercises || []).forEach((ex) => {
      const sets = completedSets(ex, legacy).length;
      if (!sets) return;
      const category = normalise(resolveCategory ? resolveCategory(ex.name) : "");
      const group = MUSCLE_GROUPS.find((g) => g.categories.includes(category));
      if (!group) {
        unmapped += sets;
        return;
      }
      totals.set(group.key, totals.get(group.key) + sets);
    });
  });

  const max = Math.max(...totals.values(), 0);
  const totalSets = [...totals.values()].reduce((sum, n) => sum + n, 0);
  return {
    unmapped,
    totalSets,
    groups: MUSCLE_GROUPS.map((group) => {
      const sets = totals.get(group.key);
      return {
        ...group,
        sets,
        pct: totalSets ? Math.round((sets / totalSets) * 100) : 0,
        // Bar length is relative to the most-trained group, so the chart still
        // reads clearly when one group dominates.
        share: max ? Math.round((sets / max) * 100) : 0
      };
    })
  };
}

// Sets logged per weekday x time-of-day block, mirroring the attendance
// heatmap in reports.js but keyed on training rather than check-ins.
export const HEATMAP_BLOCKS = ["Early", "Morning", "Afternoon", "Evening"];

export function activityHeatmap(logs) {
  const grid = Array.from({ length: 7 }, () => Array(HEATMAP_BLOCKS.length).fill(0));

  (logs || []).forEach((log) => {
    const legacy = isLegacyLog(log);
    const sets = (log.exercises || []).reduce((sum, ex) => sum + completedSets(ex, legacy).length, 0);
    if (!sets) return;
    const date = new Date(log.startTime || log.date);
    if (Number.isNaN(date.getTime())) return;
    // Monday-first, matching the reports heatmap.
    const dayIdx = (date.getDay() + 6) % 7;
    // Logs saved without a startTime have no clock component; bucket them at
    // midday rather than dropping them or claiming a 00:00 session.
    const hour = log.startTime ? date.getHours() : 12;
    const blockIdx = hour < 6 ? 0 : hour < 12 ? 1 : hour < 17 ? 2 : 3;
    grid[dayIdx][blockIdx] += sets;
  });

  return { grid, max: Math.max(...grid.flat(), 0) };
}
