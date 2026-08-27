// Automatic progression engine.
//
// Given what a member did last time an exercise came up, decide what to put in
// front of them today and explain why. Every scheme is a pure function of
// (planned exercise, session history, config) so the whole engine is unit
// tested in scripts/test-progression.mjs without a DOM or a backend.
//
// Schemes:
//   linear     — add a fixed increment when every planned rep was hit
//   greyskull  — Greyskull LP: last set is AMRAP; double the jump on a big set
//   double     — double progression: fill the rep range first, then add weight
//   bodyweight — unloaded movements progress by reps, not kilos
//   timed      — planks/carries/cardio progress by seconds
//
// Deloads are orthogonal: any weighted scheme cuts the load after repeated
// failures rather than letting a member grind a weight they cannot lift.

export const PROGRESSION_SCHEMES = [
  { key: "linear", label: "Linear (+increment when all reps hit)" },
  { key: "greyskull", label: "Greyskull LP (AMRAP last set)" },
  { key: "double", label: "Double progression (reps first, then weight)" },
  { key: "bodyweight", label: "Bodyweight (add reps)" },
  { key: "timed", label: "Timed (add seconds)" }
];

// Tuning knobs. Overridable per call so a gym can dial these in later without
// touching the scheme logic.
export const DEFAULT_PROGRESSION_CONFIG = {
  increment: 2.5,          // kg added on a successful weighted session
  upperIncrement: 2.5,     // kg for upper-body lifts under Greyskull
  lowerIncrement: 5,       // kg for lower-body lifts under Greyskull
  greyskullDoubleAt: 10,   // AMRAP reps that earn a double increment
  stallsBeforeDeload: 3,   // consecutive failed sessions that trigger a deload
  deloadPct: 0.1,          // fraction of working weight removed on a deload
  repRangeLow: 8,          // double progression: bottom of the rep range
  repRangeHigh: 12,        // double progression: top of the rep range
  bodyweightRepStep: 1,    // reps added per successful bodyweight session
  timedStepSeconds: 5,     // seconds added per successful timed session
  minBarWeight: 20         // never deload below an empty barbell
};

function toNumber(value) {
  const n = parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function sameExercise(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

// Weights are rounded to the nearest 0.25 kg — finer than any real plate set,
// but it keeps suggestions honest rather than inventing precision.
export function roundToQuarter(value) {
  return Math.round(Number(value || 0) * 4) / 4;
}

// A member's own sessions containing this exercise, newest first.
export function historyFor(logs, exerciseName, memberId) {
  return (logs || [])
    .filter((log) => !memberId || log.memberId === memberId)
    .filter((log) => (log.exercises || []).some((ex) => sameExercise(ex.name, exerciseName)))
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
}

function setsFromLog(log, exerciseName) {
  const match = (log.exercises || []).find((ex) => sameExercise(ex.name, exerciseName));
  return match?.sets || [];
}

// Did a session meet its target? Every set must reach targetReps at the
// session's working weight. Used for both progression and stall detection.
function sessionSucceeded(sets, targetReps, targetSets) {
  if (!sets.length || targetReps <= 0) return false;
  const relevant = sets.slice(0, targetSets || sets.length);
  if (relevant.length < (targetSets || 1)) return false;
  return relevant.every((set) => toNumber(set.reps) >= targetReps);
}

// How many consecutive recent sessions failed to hit the target, counting back
// from the most recent. Stops at the first success.
export function countStalls(logs, exerciseName, targetReps, targetSets) {
  let stalls = 0;
  for (const log of logs) {
    const sets = setsFromLog(log, exerciseName);
    if (!sets.length) continue;
    if (sessionSucceeded(sets, targetReps, targetSets)) break;
    stalls += 1;
  }
  return stalls;
}

// Heaviest weight used in a session — the working weight for our purposes.
function topWeight(sets) {
  return sets.reduce((best, set) => Math.max(best, toNumber(set.weight)), 0);
}

// ---- scheme detection -------------------------------------------------------

// Movements that are progressed by holding time rather than reps or load.
const TIMED_HINTS = ["plank", "hold", "carry", "hang", "wall sit", "dead hang", "farmer"];

// Lower-body compounds get the bigger Greyskull jump.
const LOWER_BODY_HINTS = ["squat", "deadlift", "lunge", "leg press", "hip thrust", "romanian", "good morning"];

export function isTimedExercise(name) {
  const key = String(name || "").toLowerCase();
  return TIMED_HINTS.some((hint) => key.includes(hint));
}

export function isLowerBody(name) {
  const key = String(name || "").toLowerCase();
  return LOWER_BODY_HINTS.some((hint) => key.includes(hint));
}

// Picks a sensible scheme when the member has not chosen one explicitly.
// An exercise that has only ever been logged without weight is a bodyweight
// movement regardless of what its name suggests.
export function detectScheme(exerciseName, recentSets) {
  if (isTimedExercise(exerciseName)) return "timed";
  const everLoaded = (recentSets || []).some((set) => toNumber(set.weight) > 0);
  if ((recentSets || []).length && !everLoaded) return "bodyweight";
  return "linear";
}

// ---- the schemes ------------------------------------------------------------
//
// Each returns { weight, reps, seconds, note } describing today's target.
// `weight`/`reps` are numbers; `note` is the member-facing "why this target?".

function linearScheme(state, config) {
  const { lastWeight, lastSucceeded, stalls, targetReps } = state;

  if (stalls >= config.stallsBeforeDeload && lastWeight > 0) {
    const deloaded = Math.max(config.minBarWeight, roundToQuarter(lastWeight * (1 - config.deloadPct)));
    return {
      weight: deloaded,
      reps: targetReps,
      note: `Stalled ${stalls} sessions at ${lastWeight} kg. Deloading ${Math.round(config.deloadPct * 100)}% to ${deloaded} kg — build back up.`
    };
  }

  if (lastSucceeded && lastWeight > 0) {
    const next = roundToQuarter(lastWeight + config.increment);
    return {
      weight: next,
      reps: targetReps,
      note: `Hit all ${targetReps} reps at ${lastWeight} kg last time. Adding ${config.increment} kg — target ${next} kg.`
    };
  }

  return {
    weight: lastWeight,
    reps: targetReps,
    note: lastWeight
      ? `Missed reps at ${lastWeight} kg last time. Staying at ${lastWeight} kg until all ${targetReps} reps are clean.`
      : ""
  };
}

// Greyskull LP: the final set is taken to failure. Clearing a high AMRAP earns
// a double jump; failing to reach the target triggers the same stall logic.
function greyskullScheme(state, config) {
  const { lastWeight, lastSets, stalls, targetReps, exerciseName } = state;
  const step = isLowerBody(exerciseName) ? config.lowerIncrement : config.upperIncrement;

  if (stalls >= config.stallsBeforeDeload && lastWeight > 0) {
    const deloaded = Math.max(config.minBarWeight, roundToQuarter(lastWeight * (1 - config.deloadPct)));
    return {
      weight: deloaded,
      reps: targetReps,
      note: `Stalled ${stalls} sessions at ${lastWeight} kg. Greyskull calls for a ${Math.round(config.deloadPct * 100)}% cut to ${deloaded} kg.`
    };
  }

  const amrapReps = lastSets.length ? toNumber(lastSets[lastSets.length - 1].reps) : 0;

  if (amrapReps >= config.greyskullDoubleAt && lastWeight > 0) {
    const next = roundToQuarter(lastWeight + step * 2);
    return {
      weight: next,
      reps: targetReps,
      note: `${amrapReps} reps on the last set — double jump. ${lastWeight} kg to ${next} kg.`
    };
  }

  if (amrapReps >= targetReps && lastWeight > 0) {
    const next = roundToQuarter(lastWeight + step);
    return {
      weight: next,
      reps: targetReps,
      note: `Cleared ${amrapReps} reps on the AMRAP set. Adding ${step} kg — target ${next} kg. Last set is again to failure.`
    };
  }

  return {
    weight: lastWeight,
    reps: targetReps,
    note: lastWeight
      ? `Only ${amrapReps} reps on the last set. Repeating ${lastWeight} kg — take the final set to failure.`
      : ""
  };
}

// Double progression: climb the rep range at a fixed load, then add weight and
// drop back to the bottom of the range.
function doubleScheme(state, config) {
  const { lastWeight, lastSets, stalls } = state;
  const low = config.repRangeLow;
  const high = config.repRangeHigh;

  if (stalls >= config.stallsBeforeDeload && lastWeight > 0) {
    const deloaded = Math.max(config.minBarWeight, roundToQuarter(lastWeight * (1 - config.deloadPct)));
    return {
      weight: deloaded,
      reps: low,
      note: `Stuck at ${lastWeight} kg for ${stalls} sessions. Dropping to ${deloaded} kg and rebuilding from ${low} reps.`
    };
  }

  const minReps = lastSets.length ? Math.min(...lastSets.map((set) => toNumber(set.reps))) : 0;

  if (minReps >= high && lastWeight > 0) {
    const next = roundToQuarter(lastWeight + config.increment);
    return {
      weight: next,
      reps: low,
      note: `Topped the ${low}–${high} range at ${lastWeight} kg. Adding ${config.increment} kg and resetting to ${low} reps.`
    };
  }

  const nextReps = Math.min(high, Math.max(low, minReps + 1));
  return {
    weight: lastWeight,
    reps: nextReps,
    note: lastWeight
      ? `Hit ${minReps} reps across all sets at ${lastWeight} kg. Aim for ${nextReps} this session — ${high} unlocks more weight.`
      : `Work up to ${high} reps before adding weight.`
  };
}

// Bodyweight movements progress by reps; there is no bar to load.
function bodyweightScheme(state, config) {
  const { lastSets, targetReps } = state;
  const minReps = lastSets.length ? Math.min(...lastSets.map((set) => toNumber(set.reps))) : 0;

  if (!minReps) {
    return { weight: 0, reps: targetReps, note: "" };
  }

  const next = minReps + config.bodyweightRepStep;
  return {
    weight: 0,
    reps: next,
    note: `${minReps} reps every set last time. Go for ${next} — bodyweight progresses by reps.`
  };
}

// Timed holds and carries progress by seconds. Reps carry the duration, since
// the log has no dedicated seconds field.
function timedScheme(state, config) {
  const { lastSets } = state;
  const best = lastSets.reduce((max, set) => Math.max(max, toNumber(set.reps)), 0);

  if (!best) {
    return { weight: 0, reps: 0, note: "" };
  }

  const next = best + config.timedStepSeconds;
  return {
    weight: topWeight(lastSets),
    reps: next,
    note: `Held ${best}s last time. Target ${next}s — timed work progresses by seconds.`
  };
}

const SCHEME_FNS = {
  linear: linearScheme,
  greyskull: greyskullScheme,
  double: doubleScheme,
  bodyweight: bodyweightScheme,
  timed: timedScheme
};

// ---- entry point ------------------------------------------------------------

// Works out today's target for one planned exercise.
//
//   exercise — { name, sets: [{ weight, reps, ... }], scheme? }
//   logs     — the full workout_logs array (filtered to the member inside)
//   options  — { memberId, scheme, config }
//
// Returns a new exercise object with seeded sets and a progressionNote; the
// input is never mutated. An exercise with no usable history is returned
// unchanged so a first session shows the plan as written.
export function planExercise(exercise, logs, options = {}) {
  const config = { ...DEFAULT_PROGRESSION_CONFIG, ...(options.config || {}) };
  const plannedSets = exercise.sets || [];
  const history = historyFor(logs, exercise.name, options.memberId);

  if (!history.length) return exercise;

  const lastSets = setsFromLog(history[0], exercise.name);
  if (!lastSets.length) return exercise;

  // Target reps come from the plan, falling back to what was done last time.
  const plannedReps = Math.max(0, ...plannedSets.map((set) => toNumber(set.reps)));
  const targetReps = plannedReps || Math.max(0, ...lastSets.map((set) => toNumber(set.reps)));
  const targetSets = plannedSets.length || lastSets.length;

  const scheme = options.scheme || exercise.scheme || detectScheme(exercise.name, lastSets);
  const schemeFn = SCHEME_FNS[scheme] || linearScheme;

  const state = {
    exerciseName: exercise.name,
    lastSets,
    lastWeight: topWeight(lastSets),
    lastSucceeded: sessionSucceeded(lastSets, targetReps, targetSets),
    stalls: countStalls(history, exercise.name, targetReps, targetSets),
    targetReps,
    targetSets
  };

  const outcome = schemeFn(state, config);

  // A scheme that cannot say anything useful leaves the plan alone rather than
  // inventing a target.
  if (!outcome.note) {
    return {
      ...exercise,
      sets: plannedSets.map((set, index) => ({
        ...set,
        weight: set.weight || lastSets[index]?.weight || "",
        reps: set.reps || lastSets[index]?.reps || ""
      }))
    };
  }

  return {
    ...exercise,
    scheme,
    progressionNote: outcome.note,
    sets: plannedSets.map((set) => ({
      ...set,
      weight: outcome.weight > 0 ? String(outcome.weight) : "",
      reps: outcome.reps > 0 ? String(outcome.reps) : set.reps || ""
    }))
  };
}
