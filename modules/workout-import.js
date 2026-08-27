// Importers for workout history exported from other fitness apps.
//
// Every parser is a pure function: CSV/text in, { logs, bodyWeights, warnings }
// out, in the same shape modules/my-workout.js writes to the workout_logs
// collection. Nothing here touches the network or the DOM, so the whole set is
// unit tested in scripts/test-import.mjs.
//
// Supported sources. Column names were verified against published real exports
// and, for FitNotes, against the app's own export code; the fixtures in
// scripts/test-import-formats.mjs carry the exact header rows.
//
//   fitnotes    — FitNotes (Android). Current builds write
//                 Date,Exercise,Category,Weight,Weight Unit,Reps,Distance,
//                 Distance Unit,Time[,Comment]. Builds before ~2021 had no unit
//                 column and instead named it "Weight (kgs)" / "Weight (lbs)".
//                 Time is a clock string (HH:MM:SS), not a number.
//   strong      — Strong. Current export is 10 columns ending in RPE; older
//                 files insert Notes and Workout Notes before it. Weight is
//                 normally unit-less, though a "Weight (kg)" / "(lb)" variant
//                 exists. Duration is a human string such as "1h 15m".
//   hevy        — Hevy. The unit is encoded in the COLUMN NAME and the whole
//                 pair swaps for imperial members: weight_kg/distance_km become
//                 weight_lbs/distance_miles. set_index is 0-based, and dates
//                 look like "15 Sep 2025, 07:48".
//   applehealth — Apple Health body mass. export.xml is preferred: its Record
//                 elements carry a per-record `unit`, making it the only
//                 self-describing source here. Third-party CSV converters each
//                 invent their own header, so those are handled best-effort.
//
// Where a source does not state its unit (FitNotes pre-2021, most Strong
// exports), values are imported as written rather than guessed at — the import
// screen warns the member to check them.

// ---- CSV parsing -----------------------------------------------------------

// Minimal RFC-4180 reader: handles quoted fields, embedded commas/newlines and
// escaped double quotes. Written by hand because the app has no build step and
// therefore no dependency on a CSV library.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const src = String(text || "").replace(/^﻿/, ""); // strip BOM

  for (let i = 0; i < src.length; i++) {
    const char = src[i];

    if (inQuotes) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      // Treat CRLF as one break, and ignore blank lines entirely.
      if (char === "\r" && src[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

// Turns a parsed CSV into objects keyed by lower-cased header name.
function toRecords(rows) {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((cells) => {
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = (cells[idx] ?? "").trim();
    });
    return record;
  });
}

// First present value among several candidate column names.
function pick(record, names) {
  for (const name of names) {
    const value = record[name];
    if (value !== undefined && value !== "") return value;
  }
  return "";
}

// ---- value coercion --------------------------------------------------------

function toNumber(value) {
  const n = parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

// Normalises the many date formats these exports use down to YYYY-MM-DD.
// Returns "" when the value cannot be trusted, so the caller can warn rather
// than silently filing a workout under the wrong day.
export function normaliseDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  // Already ISO, possibly with a time component.
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // Strong/Hevy style: "2026-08-01 07:30:00" is caught above; this covers
  // "01/08/2026" and "8/1/2026 7:30 AM". Ambiguous D/M vs M/D is resolved by
  // preferring the interpretation that yields a valid date, defaulting to the
  // US M/D order these apps export in.
  const slash = raw.match(/^(\d{1,2})[/](\d{1,2})[/](\d{4})/);
  if (slash) {
    const a = Number(slash[1]);
    const b = Number(slash[2]);
    const year = slash[3];
    const [month, day] = a > 12 ? [b, a] : [a, b];
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    return "";
  }

  // Anything else: let the platform try, then re-serialise in local time so the
  // date does not shift a day from a UTC round-trip.
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Converts pounds to kilograms when the export is in imperial units.
function toKg(weight, unit) {
  const value = toNumber(weight);
  if (!value) return 0;
  if (isImperial(unit)) return Math.round(value * 0.45359237 * 100) / 100;
  return value;
}

function isImperial(unit) {
  const u = String(unit || "").trim().toLowerCase();
  return u === "lbs" || u === "lb" || u === "pounds" || u === "imperial";
}

// Miles to kilometres, for imperial cardio rows.
function toKm(distance, unit) {
  const value = toNumber(distance);
  if (!value) return 0;
  const u = String(unit || "").trim().toLowerCase();
  if (u === "miles" || u === "mile" || u === "mi") return Math.round(value * 1.609344 * 100) / 100;
  return value;
}

// Several exports encode the unit in the column NAME rather than in a cell
// (Hevy: weight_kg vs weight_lbs; older FitNotes: "Weight (kgs)"). Finding the
// column therefore also determines the unit — checking a cell value instead
// misreads any row whose weight is blank or zero.
//
// Returns { key, unit } for the first matching header, or null.
function findUnitColumn(record, candidates) {
  for (const [key, unit] of candidates) {
    if (key in record) return { key, unit };
  }
  return null;
}

// ---- shared assembly -------------------------------------------------------

// Groups flat set rows into the nested log shape the app stores. Rows arriving
// for the same date and workout title become one log; rows for the same exercise
// within a log become that exercise's sets, in file order.
function assembleLogs(setRows) {
  const byWorkout = new Map();

  setRows.forEach((row) => {
    const logKey = `${row.date}|${row.routineName}`;
    let log = byWorkout.get(logKey);
    if (!log) {
      log = {
        date: row.date,
        routineName: row.routineName,
        durationMinutes: row.durationMinutes || 0,
        notes: row.notes || "",
        exercises: [],
        _byExercise: new Map()
      };
      byWorkout.set(logKey, log);
    }
    // Keep the first duration/notes seen for the session; later rows repeat them.
    if (!log.durationMinutes && row.durationMinutes) log.durationMinutes = row.durationMinutes;
    if (!log.notes && row.notes) log.notes = row.notes;

    const exKey = row.exercise.trim().toLowerCase();
    let exercise = log._byExercise.get(exKey);
    if (!exercise) {
      exercise = { name: row.exercise.trim(), sets: [] };
      log._byExercise.set(exKey, exercise);
      log.exercises.push(exercise);
    }
    exercise.sets.push({
      weight: row.weight,
      // A cardio/timed row carries no reps; keep the duration so the set is not
      // dropped as empty, matching how the app logs timed work.
      reps: row.reps || row.seconds || 0,
      rpe: row.rpe ?? "",
      ...(row.seconds ? { seconds: row.seconds } : {}),
      ...(row.distanceKm ? { distanceKm: row.distanceKm } : {})
    });
    if (row.seconds && !row.reps) exercise.mode = exercise.mode || (row.distanceKm ? "cardio" : "timed");
  });

  return [...byWorkout.values()]
    .map(({ _byExercise, ...log }) => ({
      ...log,
      durationMinutes: log.durationMinutes || 60
    }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function emptyResult() {
  return { logs: [], bodyWeights: [], warnings: [] };
}

// ---- FitNotes -------------------------------------------------------------

export function parseFitNotes(text) {
  const result = emptyResult();
  const records = toRecords(parseCsv(text));
  if (!records.length) {
    result.warnings.push("No rows found — is this a FitNotes CSV export?");
    return result;
  }

  let skippedDates = 0;
  const rows = [];

  records.forEach((record) => {
    const date = normaliseDate(pick(record, ["date"]));
    const exercise = pick(record, ["exercise"]);
    if (!exercise) return;
    if (!date) {
      skippedDates += 1;
      return;
    }
    // Current FitNotes exports carry a separate "Weight Unit" column; builds
    // before ~2021 instead named the column "Weight (kgs)" / "Weight (lbs)".
    const weightCol = findUnitColumn(record, [
      ["weight (kgs)", "kgs"],
      ["weight (lbs)", "lbs"],
      ["weight", record["weight unit"] || ""]
    ]);
    const weightCell = weightCol ? record[weightCol.key] : "";
    const weightUnit = weightCol ? weightCol.unit : "";

    // FitNotes has no session concept and its Category varies per exercise
    // (Chest, Legs, ...), so it must NOT drive grouping — one day is one
    // workout. The categories seen that day become the log's name instead.
    rows.push({
      date,
      routineName: "Imported Workout",
      category: pick(record, ["category"]),
      exercise,
      weight: toKg(weightCell, weightUnit),
      reps: toNumber(pick(record, ["reps"])),
      rpe: "",
      seconds: parseClockSeconds(pick(record, ["time"])),
      distanceKm: toKm(pick(record, ["distance"]), pick(record, ["distance unit"])),
      notes: pick(record, ["comment", "notes"]),
      durationMinutes: 0
    });
  });

  if (skippedDates) result.warnings.push(`${skippedDates} row(s) skipped: unreadable date.`);
  result.logs = assembleLogs(rows);

  // Name each day after the categories it actually contained, e.g. "Chest, Legs".
  const categoriesByDate = new Map();
  rows.forEach((row) => {
    if (!row.category) return;
    const set = categoriesByDate.get(row.date) || new Set();
    set.add(row.category);
    categoriesByDate.set(row.date, set);
  });
  result.logs.forEach((log) => {
    const categories = categoriesByDate.get(log.date);
    if (categories && categories.size) log.routineName = [...categories].join(", ");
  });

  if (!result.logs.length && !skippedDates) {
    result.warnings.push("No usable sets found — expected columns Date, Exercise, Weight, Reps.");
  }
  return result;
}

// ---- Strong ---------------------------------------------------------------

export function parseStrong(text) {
  const result = emptyResult();
  const records = toRecords(parseCsv(text));
  if (!records.length) {
    result.warnings.push("No rows found — is this a Strong CSV export?");
    return result;
  }

  let skippedDates = 0;
  const rows = [];

  records.forEach((record) => {
    const date = normaliseDate(pick(record, ["date"]));
    const exercise = pick(record, ["exercise name", "exercise_name", "exercise"]);
    if (!exercise) return;
    if (!date) {
      skippedDates += 1;
      return;
    }
    const durationRaw = pick(record, ["duration", "workout duration"]);
    // Strong normally writes a bare "Weight" in whatever unit the app is set to,
    // but a unit-suffixed variant exists; prefer the suffixed column when present.
    const weightCol = findUnitColumn(record, [
      ["weight (kg)", "kg"],
      ["weight (kgs)", "kgs"],
      ["weight (lb)", "lb"],
      ["weight (lbs)", "lbs"],
      ["weight", ""]
    ]);
    const weightCell = weightCol ? record[weightCol.key] : "";
    const weightUnit = weightCol ? weightCol.unit : "";

    rows.push({
      date,
      routineName: pick(record, ["workout name", "workout_name"]) || "Imported Workout",
      exercise,
      weight: toKg(weightCell, weightUnit),
      reps: toNumber(pick(record, ["reps"])),
      rpe: toNumber(pick(record, ["rpe"])) || "",
      seconds: toNumber(pick(record, ["seconds"])),
      distanceKm: toNumber(pick(record, ["distance"])),
      notes: pick(record, ["notes", "workout notes"]),
      durationMinutes: parseDurationMinutes(durationRaw)
    });
  });

  if (skippedDates) result.warnings.push(`${skippedDates} row(s) skipped: unreadable date.`);
  result.logs = assembleLogs(rows);
  if (!result.logs.length && !skippedDates) {
    result.warnings.push("No usable sets found — expected columns Date, Exercise Name, Weight, Reps.");
  }
  return result;
}

// FitNotes writes cardio time as a clock string, e.g. "00:12:30". Returns
// seconds, or 0 when the cell is empty (the common case for weight training).
export function parseClockSeconds(value) {
  const raw = String(value || "").trim();
  if (!raw) return 0;
  if (/^\d+(\.\d+)?$/.test(raw)) return Math.round(Number(raw));
  const parts = raw.split(":").map((part) => Number(part));
  if (!parts.length || parts.some((part) => !Number.isFinite(part))) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

// Strong/Hevy write durations like "1h 15m", "45m" or a plain minute count.
export function parseDurationMinutes(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return 0;
  if (/^\d+(\.\d+)?$/.test(raw)) return Math.round(Number(raw));
  const hours = raw.match(/(\d+(?:\.\d+)?)\s*h/);
  const mins = raw.match(/(\d+(?:\.\d+)?)\s*m/);
  const total = (hours ? Number(hours[1]) * 60 : 0) + (mins ? Number(mins[1]) : 0);
  return Math.round(total);
}

// ---- Hevy -----------------------------------------------------------------

export function parseHevy(text) {
  const result = emptyResult();
  const records = toRecords(parseCsv(text));
  if (!records.length) {
    result.warnings.push("No rows found — is this a Hevy CSV export?");
    return result;
  }

  let skippedDates = 0;
  const rows = [];

  records.forEach((record) => {
    const date = normaliseDate(pick(record, ["start_time", "start time", "date"]));
    const exercise = pick(record, ["exercise_title", "exercise title", "exercise name", "exercise"]);
    if (!exercise) return;
    if (!date) {
      skippedDates += 1;
      return;
    }
    const start = pick(record, ["start_time", "start time"]);
    const end = pick(record, ["end_time", "end time"]);
    // Hevy embeds the unit in the column name and swaps the pair wholesale when
    // the member uses imperial. Detect by header, never by cell contents.
    const weightCol = findUnitColumn(record, [
      ["weight_kg", "kg"],
      ["weight kg", "kg"],
      ["weight_lbs", "lbs"],
      ["weight lbs", "lbs"],
      ["weight", ""]
    ]);
    const weightCell = weightCol ? record[weightCol.key] : "";
    const weightUnit = weightCol ? weightCol.unit : "";
    const distanceCol = findUnitColumn(record, [
      ["distance_km", "km"],
      ["distance km", "km"],
      ["distance_miles", "miles"],
      ["distance miles", "miles"]
    ]);

    rows.push({
      date,
      routineName: pick(record, ["title", "workout_title", "routine_title"]) || "Imported Workout",
      exercise,
      weight: toKg(weightCell, weightUnit),
      reps: toNumber(pick(record, ["reps"])),
      rpe: toNumber(pick(record, ["rpe"])) || "",
      seconds: toNumber(pick(record, ["duration_seconds", "duration seconds"])),
      distanceKm: distanceCol ? toKm(record[distanceCol.key], distanceCol.unit) : 0,
      notes: pick(record, ["exercise_notes", "description", "notes"]),
      durationMinutes: minutesBetween(start, end)
    });
  });

  if (skippedDates) result.warnings.push(`${skippedDates} row(s) skipped: unreadable date.`);
  result.logs = assembleLogs(rows);
  if (!result.logs.length && !skippedDates) {
    result.warnings.push("No usable sets found — expected columns start_time, exercise_title, weight_kg, reps.");
  }
  return result;
}

function minutesBetween(start, end) {
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  const mins = Math.round((b - a) / 60000);
  return mins > 0 && mins < 24 * 60 ? mins : 0;
}

// ---- Apple Health body weight ---------------------------------------------

// Accepts either the CSV a shortcut/export tool produces, or the raw
// export.xml, and returns one body-weight reading per day (the last of the day,
// matching how the progress screen treats a daily measurement).
export function parseAppleHealthWeight(text) {
  const result = emptyResult();
  const raw = String(text || "");
  const readings = [];

  if (raw.includes("<Record")) {
    const recordPattern = /<Record\b[^>]*>/g;
    let match;
    while ((match = recordPattern.exec(raw)) !== null) {
      const tag = match[0];
      if (!/HKQuantityTypeIdentifierBodyMass\b/.test(tag)) continue;
      const date = normaliseDate(attr(tag, "startDate"));
      const value = toNumber(attr(tag, "value"));
      const unit = attr(tag, "unit");
      if (!date || !value) continue;
      readings.push({ date, weight: toKg(value, unit) });
    }
  } else {
    const records = toRecords(parseCsv(raw));
    records.forEach((record) => {
      const date = normaliseDate(pick(record, ["date", "startdate", "start date"]));
      const value = toNumber(pick(record, ["weight", "value", "body mass", "bodymass", "weight (kg)"]));
      if (!date || !value) return;
      const unit = pick(record, ["unit", "units"]) || (("weight (lb)" in record) ? "lbs" : "");
      readings.push({ date, weight: toKg(value, unit) });
    });
  }

  if (!readings.length) {
    result.warnings.push("No body-weight readings found — export Body Mass from Apple Health as CSV or XML.");
    return result;
  }

  // One record per day; later readings win.
  const byDate = new Map();
  readings.forEach((reading) => byDate.set(reading.date, reading.weight));
  result.bodyWeights = [...byDate.entries()]
    .map(([date, weight]) => ({ date, weight: Math.round(weight * 10) / 10 }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`));
  return match ? match[1] : "";
}

// ---- dispatch + dedupe ----------------------------------------------------

export const IMPORT_SOURCES = [
  { key: "fitnotes", label: "FitNotes (CSV)", parse: parseFitNotes, kind: "workouts" },
  { key: "strong", label: "Strong (CSV)", parse: parseStrong, kind: "workouts" },
  { key: "hevy", label: "Hevy (CSV)", parse: parseHevy, kind: "workouts" },
  { key: "applehealth", label: "Apple Health body weight (CSV/XML)", parse: parseAppleHealthWeight, kind: "bodyweight" }
];

export function parseImport(sourceKey, text) {
  const source = IMPORT_SOURCES.find((s) => s.key === sourceKey);
  if (!source) {
    return { ...emptyResult(), warnings: [`Unknown import source "${sourceKey}".`] };
  }
  return source.parse(text);
}

// Identity for a log, used to avoid importing the same session twice. Date plus
// routine name plus the exercise names is enough to spot a re-import without
// rejecting two genuinely different sessions on the same day.
export function logKey(log) {
  const exercises = (log.exercises || [])
    .map((ex) => String(ex.name || "").trim().toLowerCase())
    .sort()
    .join(",");
  return `${log.date}|${String(log.routineName || "").trim().toLowerCase()}|${exercises}`;
}

// Splits parsed logs into those worth writing and those already present.
export function dedupeLogs(parsedLogs, existingLogs) {
  const seen = new Set((existingLogs || []).map(logKey));
  const fresh = [];
  let duplicates = 0;
  (parsedLogs || []).forEach((log) => {
    const key = logKey(log);
    if (seen.has(key)) {
      duplicates += 1;
      return;
    }
    seen.add(key);
    fresh.push(log);
  });
  return { fresh, duplicates };
}

// Same idea for body-weight rows against existing progress_records.
export function dedupeBodyWeights(parsed, existingRecords) {
  const seen = new Set((existingRecords || []).map((record) => normaliseDate(record.date)));
  const fresh = [];
  let duplicates = 0;
  (parsed || []).forEach((entry) => {
    if (seen.has(entry.date)) {
      duplicates += 1;
      return;
    }
    seen.add(entry.date);
    fresh.push(entry);
  });
  return { fresh, duplicates };
}

// Shapes a parsed log into the exact payload modules/my-workout.js writes, so
// imported sessions are indistinguishable from ones logged in the app.
export function toWorkoutLogPayload(log, member) {
  return {
    memberId: member.id,
    gymId: member.gymId,
    date: log.date,
    routineName: log.routineName || "Imported Workout",
    durationMinutes: Number(log.durationMinutes) || 60,
    notes: log.notes || "",
    private: false,
    importedFrom: log.importedFrom || "",
    exercises: (log.exercises || []).map((ex) => ({
      name: ex.name,
      ...(ex.mode ? { mode: ex.mode } : {}),
      sets: (ex.sets || []).map((set) => ({
        weight: toNumber(set.weight),
        reps: toNumber(set.reps),
        rpe: set.rpe === "" || set.rpe === undefined ? "" : toNumber(set.rpe),
        ...(set.seconds ? { seconds: toNumber(set.seconds) } : {}),
        ...(set.distanceKm ? { distanceKm: toNumber(set.distanceKm) } : {})
      }))
    }))
  };
}

// Summary counts for the preview UI.
export function summarise(result) {
  const logs = result.logs || [];
  const sets = logs.reduce(
    (sum, log) => sum + (log.exercises || []).reduce((n, ex) => n + (ex.sets || []).length, 0),
    0
  );
  const exercises = new Set();
  logs.forEach((log) => (log.exercises || []).forEach((ex) => exercises.add(ex.name.toLowerCase())));
  return {
    workouts: logs.length,
    sets,
    exercises: exercises.size,
    bodyWeights: (result.bodyWeights || []).length,
    from: logs.length ? logs[0].date : "",
    to: logs.length ? logs[logs.length - 1].date : ""
  };
}
