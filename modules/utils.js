export const collections = {
  members: "members",
  trainers: "trainers",
  plans: "membership_plans",
  payments: "payments",
  attendance: "attendance",
  workouts: "workout_templates",
  assignments: "workout_assignments",
  workoutSessions: "workout_sessions",
  progress: "progress_records",
  reminders: "reminders",
  trainerAttendance: "trainer_attendance",
  membershipPauses: "membership_pauses",
  exerciseLibrary: "exercise_library",
  workoutLogs: "workout_logs",
  workoutSchedules: "workout_schedules",
  badges: "badges"
};

export function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function money(value, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export function dateLabel(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function today() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function addDays(value, days) {
  const date = value ? new Date(value) : new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

export function daysUntil(value) {
  if (!value) return 0;
  const now = new Date();
  const target = new Date(value);
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / 86400000);
}

export function memberStatus(member) {
  // Stored statuses that override date-derived status.
  if (member.status === "Pending")   return "Pending";
  if (member.status === "Paused")    return "Paused";
  if (member.status === "Suspended") return "Suspended";
  const remaining = daysUntil(member.endDate);
  if (remaining < 0)   return "Expired";
  if (remaining <= 15) return "Expiring Soon";
  return "Active";
}

export function statusClass(status) {
  return String(status || "").toLowerCase().replace(/\s+/g, "-");
}

export function optionList(items, labelKey, selectedId = "") {
  return items
    .map(
      (item) =>
        `<option value="${escapeHtml(item.id)}" ${item.id === selectedId ? "selected" : ""}>${escapeHtml(item[labelKey] || item.name || item.fullName)}</option>`
    )
    .join("");
}

export function byName(a, b) {
  return String(a.fullName || a.name || a.planName || "").localeCompare(String(b.fullName || b.name || b.planName || ""));
}

export function findName(items, id, fallback = "-") {
  const item = items.find((candidate) => candidate.id === id);
  return item?.fullName || item?.name || item?.planName || fallback;
}

export function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

export function pageHeader(title, actions = "") {
  return `
    <div class="page-header">
      <div>
        <h1>${escapeHtml(title)}</h1>
      </div>
      <div class="page-actions">${actions}</div>
    </div>
  `;
}

export function emptyState(title, body) {
  return `
    <div class="empty-state">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(body)}</span>
    </div>
  `;
}

export function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const SHEETJS_URL = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
let sheetJsPromise = null;

export function loadSheetJs() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (sheetJsPromise) return sheetJsPromise;

  sheetJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SHEETJS_URL;
    script.onload = () => (window.XLSX ? resolve(window.XLSX) : reject(new Error("SheetJS failed to initialise.")));
    script.onerror = () => {
      sheetJsPromise = null;
      reject(new Error("Could not load the Excel export library. Check your connection and try again."));
    };
    document.head.appendChild(script);
  });
  return sheetJsPromise;
}

export async function exportToExcel(filename, sheets) {
  const XLSX = await loadSheetJs();
  const workbook = XLSX.utils.book_new();
  sheets
    .filter((sheet) => sheet && sheet.rows)
    .forEach((sheet) => {
      const worksheet = XLSX.utils.json_to_sheet(sheet.rows.length ? sheet.rows : [{}]);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
    });
  XLSX.writeFile(workbook, filename);
}

export function normalizePhone(value = "") {
  return String(value).replace(/[^\d+]/g, "");
}

export function normalizePhone10(value = "") {
  const digits = String(value).replace(/\D/g, "");
  return digits.slice(-10);
}

export function whatsappUrl(member, message) {
  const phone = normalizePhone(member.mobile);
  return `https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(message)}`;
}

export function initials(name = "") {
  const parsed = String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
  return parsed || "--";
}

function getInlineAvatar(index) {
  const gradients = [
    ["#ff9068", "#fd746c"], // 1. Warm Coral
    ["#11998e", "#38ef7d"], // 2. Mint Green
    ["#00c6ff", "#0072ff"], // 3. Neon Cyan
    ["#8a2387", "#e94057"], // 4. Berry Blast
    ["#f12711", "#f5af19"], // 5. Sunfire
    ["#7f00ff", "#e100ff"], // 6. Electric Violet
    ["#3a7bd5", "#3a6073"], // 7. Cool Blue
    ["#f9d423", "#ff4e50"], // 8. Peach Orange
    ["#4568dc", "#b06ab8"], // 9. Lavender
    ["#0575e6", "#00f260"], // 10. Ocean Green
    ["#34e89e", "#0f3443"], // 11. Deep Forest
    ["#1d2671", "#c33764"]  // 12. Deep Space
  ];
  
  const [c1, c2] = gradients[index % gradients.length];
  
  let path = "";
  if (index === 0) {
    // 1. Male Gym Goer
    path = `
      <circle cx="50" cy="35" r="14" fill="#ffffff" fill-opacity="0.9" />
      <path d="M 22,78 C 22,60 34,54 50,54 C 66,54 78,60 78,78 Z" fill="#ffffff" fill-opacity="0.9" />
    `;
  } else if (index === 1) {
    // 2. Female Gym Goer
    path = `
      <circle cx="50" cy="20" r="7" fill="#ffffff" fill-opacity="0.9" />
      <circle cx="50" cy="36" r="13" fill="#ffffff" fill-opacity="0.9" />
      <path d="M 24,78 C 24,60 36,55 50,55 C 64,55 76,60 76,78 Z" fill="#ffffff" fill-opacity="0.9" />
      <path d="M 45,23 C 43,26 40,26 38,23 C 40,20 43,20 45,23 Z" fill="#ffffff" fill-opacity="0.9" />
    `;
  } else if (index === 2) {
    // 3. Weightlifter
    path = `
      <line x1="15" y1="28" x2="85" y2="28" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-opacity="0.9" />
      <rect x="8" y="18" width="6" height="20" rx="2" fill="#ffffff" fill-opacity="0.9" />
      <rect x="86" y="18" width="6" height="20" rx="2" fill="#ffffff" fill-opacity="0.9" />
      <circle cx="50" cy="38" r="10" fill="#ffffff" fill-opacity="0.9" />
      <path d="M 32,28 L 42,42 L 58,42 L 68,28" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.9" />
      <path d="M 38,46 L 38,65 L 62,65 L 62,46 Z" fill="#ffffff" fill-opacity="0.9" />
      <path d="M 38,65 L 34,80 M 62,65 L 66,80" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-opacity="0.9" />
    `;
  } else if (index === 3) {
    // 4. Runner
    path = `
      <circle cx="56" cy="22" r="8" fill="#ffffff" fill-opacity="0.9" />
      <path d="M 48,34 L 58,40 L 45,55 L 38,48 L 44,38 L 48,34" fill="#ffffff" fill-opacity="0.9" />
      <path d="M 45,55 L 62,65 L 56,80" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.9" />
      <path d="M 45,55 L 34,62 L 36,78" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.9" />
    `;
  } else if (index === 4) {
    // 5. Flexing Arm
    path = `
      <path d="M 20,70 C 25,60 30,55 45,55 C 55,55 60,60 65,55 C 70,50 68,40 76,40 C 82,40 85,45 82,55 C 78,65 65,75 45,75 C 30,75 25,70 20,70 Z M 52,50 C 50,42 55,38 60,40 C 62,45 56,48 52,50 Z" fill="#ffffff" fill-opacity="0.9" />
    `;
  } else if (index === 5) {
    // 6. Yoga Pose
    path = `
      <circle cx="50" cy="25" r="9" fill="#ffffff" fill-opacity="0.9" />
      <path d="M 50,38 L 40,55 L 30,50 L 32,42 L 50,38" fill="#ffffff" fill-opacity="0.9" />
      <path d="M 50,38 L 60,55 L 70,50 L 68,42 L 50,38" fill="#ffffff" fill-opacity="0.9" />
      <path d="M 50,38 L 50,60 L 35,75 L 50,80 L 65,75 L 50,60" fill="#ffffff" fill-opacity="0.9" />
    `;
  } else if (index === 6) {
    // 7. Kettlebell
    path = `
      <circle cx="50" cy="60" r="18" fill="#ffffff" fill-opacity="0.9" />
      <path d="M 38,45 C 38,32 62,32 62,45" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-opacity="0.9" />
      <circle cx="50" cy="60" r="6" fill="${c1}" />
    `;
  } else if (index === 7) {
    // 8. Weight Plate
    path = `
      <circle cx="50" cy="50" r="26" fill="#ffffff" fill-opacity="0.9" />
      <circle cx="50" cy="50" r="18" fill="none" stroke="${c2}" stroke-width="2" />
      <circle cx="50" cy="50" r="6" fill="${c1}" />
      <line x1="28" y1="50" x2="38" y2="50" stroke="${c2}" stroke-width="2" />
      <line x1="62" y1="50" x2="72" y2="50" stroke="${c2}" stroke-width="2" />
      <line x1="50" y1="28" x2="50" y2="38" stroke="${c2}" stroke-width="2" />
      <line x1="50" y1="62" x2="50" y2="72" stroke="${c2}" stroke-width="2" />
    `;
  } else if (index === 8) {
    // 9. Stopwatch
    path = `
      <circle cx="50" cy="53" r="22" fill="#ffffff" fill-opacity="0.9" />
      <circle cx="50" cy="53" r="18" fill="none" stroke="${c1}" stroke-width="2" />
      <path d="M 50,53 L 50,42 L 58,50" fill="none" stroke="${c2}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      <rect x="45" y="24" width="10" height="5" rx="1.5" fill="#ffffff" fill-opacity="0.9" />
      <line x1="32" y1="36" x2="38" y2="40" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-opacity="0.9" />
      <line x1="68" y1="36" x2="62" y2="40" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-opacity="0.9" />
    `;
  } else if (index === 9) {
    // 10. Heart Pulse
    path = `
      <path d="M 20,50 L 35,50 L 42,28 L 50,72 L 56,42 L 62,55 L 68,50 L 80,50" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.9" />
    `;
  } else if (index === 10) {
    // 11. Trophy
    path = `
      <path d="M 32,32 L 68,32 L 65,58 C 65,65 58,72 50,72 C 42,72 35,65 35,58 Z" fill="#ffffff" fill-opacity="0.9" />
      <path d="M 35,40 C 26,40 26,50 35,50 M 65,40 C 74,40 74,50 65,50" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-opacity="0.9" />
      <rect x="42" y="72" width="16" height="5" fill="#ffffff" fill-opacity="0.9" />
      <path d="M 36,77 H 64 V 81 H 36 Z" fill="#ffffff" fill-opacity="0.9" />
    `;
  } else if (index === 11) {
    // 12. Gym Shield
    path = `
      <path d="M 50,20 L 76,26 V 54 C 76,70 65,80 50,84 C 35,80 24,70 24,54 V 26 Z" fill="#ffffff" fill-opacity="0.9" />
      <path d="M 35,46 H 65 M 32,54 H 68" stroke="${c1}" stroke-width="4.5" stroke-linecap="round" />
    `;
  }
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100%">
      <defs>
        <linearGradient id="g_${index}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${c1}" />
          <stop offset="100%" stop-color="${c2}" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#g_${index})" />
      ${path}
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export const CARTOON_AVATARS = Array.from({ length: 12 }, (_, i) => getInlineAvatar(i));

export function getAvatarUrl(avatarUrl) {
  if (!avatarUrl) return "";
  if (avatarUrl.startsWith("emoji:")) {
    const parts = avatarUrl.split(":");
    const emoji = parts[1] || "👤";
    const bg = parts[2] || "#3a7bd5,#3a6073";
    const colors = bg.split(",");
    const c1 = colors[0];
    const c2 = colors[1] || colors[0];
    
    let fill = `url(#eg)`;
    let defs = `
      <defs>
        <linearGradient id="eg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${c1}" />
          <stop offset="100%" stop-color="${c2}" />
        </linearGradient>
      </defs>
    `;
    if (bg === "#ffffff") {
      fill = "#ffffff";
      defs = "";
    } else if (bg === "#000000") {
      fill = "#000000";
      defs = "";
    } else if (colors.length === 1) {
      fill = c1;
      defs = "";
    }
    
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        ${defs}
        <circle cx="50" cy="50" r="48" fill="${fill}" />
        <text x="50" y="50" font-size="48" text-anchor="middle" dominant-baseline="central" font-family="system-ui, -apple-system, sans-serif">${emoji}</text>
      </svg>
    `;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
  }
  return avatarUrl;
}

export function nameCell(name, sub = "", avatarUrl = "") {
  const resolvedUrl = getAvatarUrl(avatarUrl);
  const avatarContent = resolvedUrl 
    ? `<img src="${escapeHtml(resolvedUrl)}" alt="" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />`
    : escapeHtml(initials(name));

  return `
    <span class="name-cell">
      <span class="avatar small">${avatarContent}</span>
      <span class="name-cell-text">
        <strong>${escapeHtml(name || "-")}</strong>
        ${sub ? `<small>${escapeHtml(sub)}</small>` : ""}
      </span>
    </span>
  `;
}

/**
 * Styled confirmation dialog. Replaces window.confirm() with markup that matches
 * the app theme. Resolves true on confirm, false on cancel/backdrop/escape.
 */
export function confirmDialog({ title = "Are you sure?", body = "", confirmText = "Confirm", danger = true } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h2>${escapeHtml(title)}</h2>
        ${body ? `<p>${escapeHtml(body)}</p>` : ""}
        <div class="button-row modal-actions">
          <button class="ghost-button" data-modal="cancel" type="button">Cancel</button>
          <button class="${danger ? "danger-button" : "primary-button"}" data-modal="ok" type="button">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;

    function close(result) {
      document.removeEventListener("keydown", onKey);
      overlay.remove();
      resolve(result);
    }
    function onKey(event) {
      if (event.key === "Escape") close(false);
    }

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close(false);
    });
    overlay.querySelector("[data-modal='cancel']").addEventListener("click", () => close(false));
    overlay.querySelector("[data-modal='ok']").addEventListener("click", () => close(true));
    document.addEventListener("keydown", onKey);

    document.body.appendChild(overlay);
    overlay.querySelector("[data-modal='ok']").focus();
  });
}

/**
 * Wrap an async form/button handler so the button shows a busy state and can't
 * be double-submitted. `button` may be the submit button or any clickable.
 */
export async function withButtonLoading(button, action, busyLabel = "Saving...") {
  if (!button) return action();
  const original = button.innerHTML;
  button.disabled = true;
  button.dataset.loading = "true";
  button.innerHTML = `<span class="spinner"></span>${escapeHtml(busyLabel)}`;
  try {
    return await action();
  } finally {
    button.disabled = false;
    delete button.dataset.loading;
    button.innerHTML = original;
  }
}

/**
 * Lightweight sparkline/trend chart (inline SVG) for a numeric series.
 * points: array of { label, value }. Returns an SVG string.
 */
export function trendChart(points, { color = "var(--teal)", height = 160 } = {}) {
  const clean = points.filter((p) => Number.isFinite(Number(p.value)));
  if (clean.length < 2) {
    return `<div class="table-empty">Add at least two records to see a trend.</div>`;
  }
  const width = 320;
  const pad = 8;
  const values = clean.map((p) => Number(p.value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = (width - pad * 2) / (clean.length - 1);
  const coords = clean.map((p, i) => {
    const x = pad + i * stepX;
    const y = height - pad - ((Number(p.value) - min) / span) * (height - pad * 2);
    return [x, y];
  });
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${coords[coords.length - 1][0].toFixed(1)},${height - pad} L${coords[0][0].toFixed(1)},${height - pad} Z`;
  const dots = coords.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${color}" />`).join("");

  return `
    <div class="trend-chart">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img">
        <path d="${area}" fill="${color}" opacity="0.12" />
        <path d="${line}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
        ${dots}
      </svg>
      <div class="trend-labels">
        <span>${escapeHtml(clean[0].label)}</span>
        <span>${escapeHtml(clean[clean.length - 1].label)}</span>
      </div>
      <div class="trend-range"><small>Low ${min}</small><small>High ${max}</small></div>
    </div>
  `;
}

let exercisesPromise = null;
let exercisesList = [];

export function getExercises() {
  if (!exercisesPromise) {
    exercisesPromise = fetch("./lib/exercises-pruned.json")
      .then((res) => res.json())
      .then((data) => {
        exercisesList = data;
        return data;
      })
      .catch((err) => {
        console.error("Failed to load exercises:", err);
        return [];
      });
  }
  return exercisesPromise;
}

export function getExercisesList() {
  return exercisesList;
}

export function showExerciseModal(exercise) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  
  const gifUrl = exercise.gif 
    ? `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${exercise.gif}`
    : '';
  
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" style="width: min(540px, 100%);">
      <div class="panel-heading" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--line); padding-bottom: 10px; margin-bottom: 10px;">
        <h2 style="margin: 0; font-size: 1.35rem;">${escapeHtml(exercise.name)}</h2>
        <button class="ghost-button" data-modal="close" style="min-width: unset; padding: 4px; border: none; background: transparent; cursor: pointer;" title="Close">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div style="display: flex; flex-direction: column; gap: 12px; max-height: 70vh; overflow-y: auto;">
        ${gifUrl ? `
          <div style="display: flex; justify-content: center; background: #fff; border: 1px solid var(--line); border-radius: var(--r-md); overflow: hidden; max-height: 280px; padding: 10px;">
            <img src="${gifUrl}" alt="${escapeHtml(exercise.name)}" style="max-width: 100%; height: auto; object-fit: contain;" />
          </div>
        ` : ''}
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <span style="background: var(--surface-light, rgba(255,255,255,0.05)); border: 1px solid var(--line); padding: 4px 8px; border-radius: var(--r-sm); font-size: 0.85em;">Category: <strong>${escapeHtml(exercise.category)}</strong></span>
          <span style="background: var(--surface-light, rgba(255,255,255,0.05)); border: 1px solid var(--line); padding: 4px 8px; border-radius: var(--r-sm); font-size: 0.85em;">Target: <strong>${escapeHtml(exercise.target)}</strong></span>
          <span style="background: var(--surface-light, rgba(255,255,255,0.05)); border: 1px solid var(--line); padding: 4px 8px; border-radius: var(--r-sm); font-size: 0.85em;">Equipment: <strong>${escapeHtml(exercise.equipment)}</strong></span>
        </div>
        <div style="border-top: 1px solid var(--line); padding-top: 10px;">
          <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 1.1rem;">Instructions</h3>
          <ol style="padding-left: 20px; margin: 0; line-height: 1.55; color: var(--text);">
            ${exercise.steps.map(step => `<li style="margin-bottom: 8px;">${escapeHtml(step)}</li>`).join('')}
          </ol>
        </div>
      </div>
    </div>
  `;

  function close() {
    document.removeEventListener("keydown", onKey);
    overlay.remove();
  }
  function onKey(event) {
    if (event.key === "Escape") close();
  }

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  overlay.querySelectorAll("[data-modal='close']").forEach(btn => btn.addEventListener("click", close));
  document.addEventListener("keydown", onKey);
  document.body.appendChild(overlay);
}

export function renderMemberProfileDetail(member, context) {
  const plans = context.data.membership_plans || [];
  const trainers = context.data.trainers || [];
  const logs = (context.data.workout_logs || [])
    .filter(l => l.memberId === member.id)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  const planName = findName(plans, member.planId);
  const trainerName = findName(trainers, member.assignedTrainer, "Unassigned");
  const avatarInitials = (member.fullName || "M").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "M";

  return `
    <div class="page-header" style="border-bottom: 1.5px solid var(--line); padding-bottom: 16px; margin-bottom: 15px;">
      <div style="display:flex; flex-wrap: wrap; justify-content: space-between; align-items: center; width: 100%; gap: 12px;">
        <div style="display:flex; gap:12px; align-items:center;">
          <button class="ghost-button compact" id="back-to-roster-btn" style="min-width: unset; padding: 6px 12px; display: inline-flex; align-items: center; gap: 6px; font-weight:600;">
            <span class="material-symbols-outlined" style="font-size: 1.25rem;">arrow_back</span>
            Back to List
          </button>
          <div class="avatar" style="width:40px; height:40px; border-radius:50%; background:var(--primary); color:var(--on-primary); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:1rem; box-shadow: 0 0 8px rgba(0,0,0,0.15);">
            ${avatarInitials}
          </div>
          <div>
            <h2 style="margin: 0; font-size: 1.4rem; font-family: 'Montserrat', sans-serif; font-weight: 800; color: var(--text);">${escapeHtml(member.fullName)}</h2>
            <small style="opacity: 0.85; color: var(--text-muted);">${escapeHtml(planName)} • Trainer: ${escapeHtml(trainerName)}</small>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          ${context.profile?.role === "owner" ? `
            <button class="primary-button compact" id="edit-member-btn" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600; min-height: unset; padding: 6px 12px; font-size: 0.85rem;">
              <span class="material-symbols-outlined" style="font-size:1.1rem; vertical-align: middle;">edit</span>
              Edit
            </button>
          ` : ""}
          <mark class="status ${statusClass(memberStatus(member))}" style="font-size: 0.85rem; font-weight: 700; padding: 6px 12px; border-radius: 20px;">
            ${escapeHtml(memberStatus(member))}
          </mark>
        </div>
      </div>
    </div>

    <div class="tabs-header profile-tabs" style="margin-bottom: 15px; border-bottom: 2px solid var(--line); display:flex; gap:10px;">
      <button class="tab-btn active" data-profile-tab="info">Bio & Medical</button>
      <button class="tab-btn" data-profile-tab="logs">Workout Logs (${logs.length})</button>
      <button class="tab-btn" data-profile-tab="progress">Progress Timeline</button>
      <button class="tab-btn" data-profile-tab="achievements">Achievements</button>
    </div>

    <div class="panel" style="padding: 20px; min-height: 400px; background: var(--surface); border-radius: var(--r-lg); box-shadow: var(--shadow-card); border: 1px solid var(--line);" id="profile-tab-content">
      <!-- Tab content dynamically populated -->
    </div>
  `;
}

export function bindMemberProfileDetail(root, member, context, onBack, onEdit) {
  const contentEl = root.querySelector("#profile-tab-content");
  if (!contentEl) return;

  const plans = context.data.membership_plans || [];
  const trainers = context.data.trainers || [];
  const templates = context.data.workout_templates || [];
  const mySchedules = (context.data.workout_schedules || []).filter(s => s.memberId === member.id);
  const customRoutines = mySchedules.filter(s => s.type === "routine");
  const weeklyScheduleDoc = mySchedules.find(s => s.type === "schedule") || { schedule: {} };
  const logs = (context.data.workout_logs || [])
    .filter(l => l.memberId === member.id)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  const METRICS = [
    { key: "weight", label: "Weight (kg)", color: "var(--teal)" },
    { key: "bmi", label: "BMI", color: "var(--primary-strong)" },
    { key: "bodyFat", label: "Body Fat %", color: "#c36f2d" },
    { key: "waist", label: "Waist (cm)", color: "var(--ink-soft)" },
    { key: "chest", label: "Chest (cm)", color: "var(--accent)" },
    { key: "hip", label: "Hip (cm)", color: "var(--primary)" },
    { key: "bicep", label: "Bicep (cm)", color: "var(--success)" },
    { key: "thigh", label: "Thigh (cm)", color: "var(--warning)" },
    { key: "height", label: "Height (cm)", color: "var(--ink-soft)" }
  ];

  const chartForMember = (records, metricKey) => {
    const metric = METRICS.find((m) => m.key === metricKey) || METRICS[0];
    const series = records
      .filter((r) => r[metric.key] !== "" && r[metric.key] != null)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .map((r) => ({ label: dateLabel(r.date), value: Number(r[metric.key]) }));
    return trendChart(series, { color: metric.color });
  };

  let activeTab = "info";

  function renderTab() {
    if (activeTab === "info") {
      const isMobileLogin = member.email && member.email.endsWith("@gymflow.app");
      contentEl.innerHTML = `
        <div class="stack" style="gap: 20px;">
          <!-- Top Row Grid: Contact and Personal Info -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
            <div class="card-premium" style="background: var(--surface-soft); padding: 20px; border-radius: var(--r-md); border-top: 3px solid var(--primary); box-shadow: var(--shadow-card); border-left: 1px solid var(--line); border-right: 1px solid var(--line); border-bottom: 1px solid var(--line);">
              <h3 style="margin: 0 0 12px 0; font-size: 1rem; color: var(--accent); font-weight: 700; border-bottom: 1.5px solid var(--line); padding-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span class="material-symbols-outlined" style="font-size: 1.25rem; color: var(--primary);">contact_page</span> Personal Details
              </h3>
              <div class="stack" style="gap: 8px; font-size: 0.88rem;">
                <div><span style="color: var(--text-muted);">Email:</span> <strong style="color: var(--text); float: right;">${isMobileLogin ? "Mobile-based login" : escapeHtml(member.email || "—")}</strong></div>
                <div><span style="color: var(--text-muted);">Mobile:</span> <strong style="color: var(--text); float: right;">${escapeHtml(member.mobile || "—")}</strong></div>
                <div><span style="color: var(--text-muted);">Gender:</span> <strong style="color: var(--text); float: right;">${escapeHtml(member.gender || "—")}</strong></div>
                <div><span style="color: var(--text-muted);">DOB:</span> <strong style="color: var(--text); float: right;">${escapeHtml(member.dateOfBirth ? dateLabel(member.dateOfBirth) : "—")}</strong></div>
                <div style="border-top: 1px dashed var(--line); padding-top: 6px; margin-top: 4px;">
                  <span style="color: var(--text-muted); display: block; margin-bottom: 2px;">Address:</span>
                  <strong style="color: var(--text); font-size: 0.85rem; line-height: 1.4;">${escapeHtml(member.address || "—")}</strong>
                </div>
              </div>
            </div>

            <div class="card-premium" style="background: var(--surface-soft); padding: 20px; border-radius: var(--r-md); border-top: 3px solid var(--teal); box-shadow: var(--shadow-card); border-left: 1px solid var(--line); border-right: 1px solid var(--line); border-bottom: 1px solid var(--line);">
              <h3 style="margin: 0 0 12px 0; font-size: 1rem; color: var(--accent); font-weight: 700; border-bottom: 1.5px solid var(--line); padding-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span class="material-symbols-outlined" style="font-size: 1.25rem; color: var(--teal);">contact_emergency</span> Emergency Contact
              </h3>
              <div class="stack" style="gap: 10px; font-size: 0.88rem;">
                <div><span style="color: var(--text-muted);">Contact Name:</span> <strong style="color: var(--text); float: right;">${escapeHtml(member.emergencyName || "—")}</strong></div>
                <div><span style="color: var(--text-muted);">Relationship:</span> <strong style="color: var(--text); float: right;">${escapeHtml(member.emergencyRelationship || "—")}</strong></div>
                <div><span style="color: var(--text-muted);">Phone Number:</span> <strong style="color: var(--text); float: right;">${escapeHtml(member.emergencyPhone || "—")}</strong></div>
              </div>
            </div>
          </div>

          <!-- Bottom Row Grid: Physical Metrics and Health Declarations -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
            <div class="card-premium" style="background: var(--surface-soft); padding: 20px; border-radius: var(--r-md); border-top: 3px solid var(--warning); box-shadow: var(--shadow-card); border-left: 1px solid var(--line); border-right: 1px solid var(--line); border-bottom: 1px solid var(--line);">
              <h3 style="margin: 0 0 12px 0; font-size: 1rem; color: var(--accent); font-weight: 700; border-bottom: 1.5px solid var(--line); padding-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span class="material-symbols-outlined" style="font-size: 1.25rem; color: var(--warning);">monitoring</span> Body Profile
              </h3>
              <div class="stack" style="gap: 8px; font-size: 0.88rem;">
                <div><span style="color: var(--text-muted);">Blood Group:</span> <strong style="color: var(--text); float: right;">${escapeHtml(member.bloodGroup || "—")}</strong></div>
                <div><span style="color: var(--text-muted);">Occupation:</span> <strong style="color: var(--text); float: right;">${escapeHtml(member.occupation || "—")}</strong></div>
                <div><span style="color: var(--text-muted);">Activity Level:</span> <strong style="color: var(--text); float: right;">${escapeHtml(member.activityLevel || "—")}</strong></div>
                <div><span style="color: var(--text-muted);">Fitness Experience:</span> <strong style="color: var(--text); float: right;">${escapeHtml(member.fitnessExperience || "—")}</strong></div>
                <div><span style="color: var(--text-muted);">Primary Gym Goal:</span> <strong style="color: var(--text); float: right;">${escapeHtml(member.gymGoal || "—")}</strong></div>
                <div><span style="color: var(--text-muted);">WhatsApp Reminders:</span> <strong style="color: var(--text); float: right;">${member.whatsappOptIn ? "Enabled" : "Disabled"}</strong></div>
              </div>
            </div>

            <div class="card-premium" style="background: var(--surface-soft); padding: 20px; border-radius: var(--r-md); border-top: 3px solid var(--danger); box-shadow: var(--shadow-card); border-left: 1px solid var(--line); border-right: 1px solid var(--line); border-bottom: 1px solid var(--line);">
              <h3 style="margin: 0 0 12px 0; font-size: 1rem; color: var(--accent); font-weight: 700; border-bottom: 1.5px solid var(--line); padding-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span class="material-symbols-outlined" style="font-size: 1.25rem; color: var(--danger);">medical_information</span> Health & Medical
              </h3>
              <div class="stack" style="gap: 12px; font-size: 0.85rem;">
                <div>
                  <strong style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Medical Conditions:</strong>
                  <p style="margin: 3px 0 0 0; color: var(--text); line-height: 1.4;">${escapeHtml(member.medicalConditions || "None declared")}</p>
                </div>
                <div>
                  <strong style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Current Medications:</strong>
                  <p style="margin: 3px 0 0 0; color: var(--text); line-height: 1.4;">${escapeHtml(member.currentMedications || "None declared")}</p>
                </div>
                <div>
                  <strong style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Allergies:</strong>
                  <p style="margin: 3px 0 0 0; color: var(--text); line-height: 1.4;">${escapeHtml(member.allergies || "None declared")}</p>
                </div>
                <div>
                  <strong style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Injuries / Physical Limitations:</strong>
                  <p style="margin: 3px 0 0 0; color: var(--text); line-height: 1.4;">${escapeHtml(member.physicalLimitations || "None declared")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (activeTab === "logs") {
      const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      const scheduleHtml = weekdays.map(day => {
        const id = weeklyScheduleDoc.schedule?.[day];
        let name = "Rest Day";
        if (id) {
          const r = customRoutines.find(cr => cr.id === id);
          const t = templates.find(bt => bt.id === id);
          if (r) name = r.name;
          else if (t) name = t.name;
        }
        return `
          <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px dashed var(--line);">
            <span style="font-weight:600;">${day}</span>
            <span style="opacity:0.85;">${escapeHtml(name)}</span>
          </div>
        `;
      }).join("");

      const routinesHtml = customRoutines.length
        ? customRoutines.map(r => `
            <div style="padding:8px; border:1px solid var(--line); border-radius:var(--r-sm); background:var(--bg); margin-bottom:6px;">
              <strong style="font-size:0.9rem; color:var(--accent);">${escapeHtml(r.name)}</strong>
              <div style="font-size:0.8rem; opacity:0.8; margin-top:4px; padding-left:4px; display:flex; flex-direction:column; gap:2px;">
                ${(r.exercisesStructured || []).map(ex => `
                  <div><strong>${escapeHtml(ex.name)}</strong>: ${ex.sets} sets x ${ex.reps} reps</div>
                `).join("")}
              </div>
            </div>
          `).join("")
        : `<div style="text-align:center; opacity:0.7; padding:10px;">No custom routines defined.</div>`;

      contentEl.innerHTML = `
        <div class="stack" style="gap: 15px;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 15px; border-bottom: 1px solid var(--line); padding-bottom: 15px;">
            <div class="panel stack" style="padding: 12px; font-size: 0.85rem; background: var(--bg-alt); border-radius: var(--r-md); border:1px solid var(--line);">
              <h4 style="margin: 0 0 10px 0; color: var(--accent); font-size: 0.95rem; border-bottom: 1px solid var(--line); padding-bottom: 4px;">Weekly Schedule</h4>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                ${scheduleHtml}
              </div>
            </div>
            <div class="panel stack" style="padding: 12px; font-size: 0.85rem; background: var(--bg-alt); border-radius: var(--r-md); border:1px solid var(--line);">
              <h4 style="margin: 0 0 10px 0; color: var(--accent); font-size: 0.95rem; border-bottom: 1px solid var(--line); padding-bottom: 4px;">Custom Routines</h4>
              <div style="display: flex; flex-direction: column; gap: 4px; max-height: 200px; overflow-y: auto;">
                ${routinesHtml}
              </div>
            </div>
          </div>

          <h3 style="margin: 5px 0 0 0; font-size: 1.1rem; color: var(--accent);">Completed Workout Logs</h3>
          <div class="stack" style="gap: 12px;">
            ${logs.length 
              ? logs.map(log => `
                  <div class="panel" style="padding:12px; border:1px solid var(--line); border-radius:var(--r-md); background:var(--bg-alt);">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--line); padding-bottom:4px; margin-bottom:8px;">
                      <strong style="font-size:1rem; color:var(--accent);">${escapeHtml(log.routineName || "Workout")}</strong>
                      <small style="opacity:0.8;">${dateLabel(log.date)} • ${log.durationMinutes || 0} mins</small>
                    </div>
                    ${log.notes ? `<p style="font-style:italic; font-size:0.85rem; margin:4px 0;">"${escapeHtml(log.notes)}"</p>` : ""}
                    <div style="margin-top:6px; display:flex; flex-direction:column; gap:4px;">
                      ${(log.exercises || []).map(ex => `
                        <div style="font-size:0.85rem;">
                          <strong>${escapeHtml(ex.name)}</strong>
                          <span style="opacity:0.8; padding-left:6px;">
                            ${(ex.sets || []).map((s, idx) => `${idx + 1}: ${s.weight}kg x ${s.reps}`).join(" / ")}
                          </span>
                        </div>
                      `).join("")}
                    </div>
                  </div>
                `).join("")
              : `<div class="table-empty">No workouts logged yet.</div>`
            }
          </div>
        </div>
      `;
    } else if (activeTab === "progress") {
      const records = (context.data.progress_records || [])
        .filter((r) => r.memberId === member.id)
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));

      contentEl.innerHTML = `
        <div class="stack" style="gap: 15px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <h3 style="margin:0; font-size:1.1rem; color:var(--accent);">Trend Chart</h3>
            <select id="modal-metric-select" style="padding:4px 8px; border-radius:var(--r-sm); border:1px solid var(--line); background:var(--bg-alt); color:var(--text);">
              ${METRICS.map(m => `<option value="${m.key}">${m.label}</option>`).join("")}
            </select>
          </div>
          <div id="modal-chart-container">
            ${chartForMember(records, "weight")}
          </div>

          <h3 style="margin:10px 0 0 0; font-size:1.1rem; color:var(--accent);">Measurement History</h3>
          <div class="stack" style="gap: 10px; max-height:280px; overflow-y:auto; padding-right:5px;">
            ${records.length ? records.map(r => `
              <div class="panel" style="padding:10px; border:1px solid var(--line); border-radius:var(--r-sm); background:var(--bg-alt); font-size:0.9rem;">
                <div style="display:flex; justify-content:space-between; font-weight:bold; margin-bottom:6px; border-bottom:1px dashed var(--line); padding-bottom:4px;">
                  <span>${dateLabel(r.date)}</span>
                  <span style="font-size:0.8rem; opacity:0.8;">${escapeHtml(r.notes || "Measurement")}</span>
                </div>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:8px;">
                  ${r.weight ? `<span><strong>Weight:</strong> ${escapeHtml(r.weight)} kg</span>` : ""}
                  ${r.bmi ? `<span><strong>BMI:</strong> ${escapeHtml(r.bmi)}</span>` : ""}
                  ${r.bodyFat ? `<span><strong>Body Fat:</strong> ${escapeHtml(r.bodyFat)}%</span>` : ""}
                  ${r.waist ? `<span><strong>Waist:</strong> ${escapeHtml(r.waist)} cm</span>` : ""}
                  ${r.chest ? `<span><strong>Chest:</strong> ${escapeHtml(r.chest)} cm</span>` : ""}
                  ${r.hip ? `<span><strong>Hip:</strong> ${escapeHtml(r.hip)} cm</span>` : ""}
                  ${r.bicep ? `<span><strong>Bicep:</strong> ${escapeHtml(r.bicep)} cm</span>` : ""}
                  ${r.thigh ? `<span><strong>Thigh:</strong> ${escapeHtml(r.thigh)} cm</span>` : ""}
                  ${r.height ? `<span><strong>Height:</strong> ${escapeHtml(r.height)} cm</span>` : ""}
                </div>
              </div>
            `).join("") : `<div class="table-empty">No measurements recorded.</div>`}
          </div>
        </div>
      `;

      const selectEl = contentEl.querySelector("#modal-metric-select");
      const chartContainer = contentEl.querySelector("#modal-chart-container");
      selectEl?.addEventListener("change", () => {
        chartContainer.innerHTML = chartForMember(records, selectEl.value);
      });
    } else if (activeTab === "achievements") {
      const badges = context.data.badges || [];
      const unlockedBadgeIds = member.unlockedBadges || [];
      const personalRecords = member.personalRecords || {};
      const prList = Object.entries(personalRecords);
      const myLogsCount = logs.length;
      const currentStreak = member.currentStreak || 0;
      const tier = getMemberTier(member.points || 0);

      contentEl.innerHTML = `
        <div class="stack" style="gap: 20px;">
          <section class="stack" style="gap: 10px;">
            <h3 style="margin:0; border-bottom: 1px solid var(--line); padding-bottom:6px; font-size: 0.95rem; color:var(--accent); text-transform:uppercase; letter-spacing:0.5px;">Level & Rank</h3>
            <div style="display: flex; align-items: center; justify-content: space-between; background: var(--surface-soft); padding: 12px 16px; border-radius: var(--r-md); box-shadow: var(--shadow-card);">
              <div style="display:flex; flex-direction:column; gap:2px;">
                <span style="font-size: 0.8rem; color: var(--muted); font-weight:600;">Total Score</span>
                <strong style="font-size: 1.4rem; color: var(--accent);">${member.points || 0} <span style="font-size: 0.85rem; font-weight: normal; color: var(--muted);">Points</span></strong>
              </div>
              <div class="tier-badge ${tier.class}">
                <span class="material-symbols-outlined" style="font-size:16px;">${tier.icon}</span>
                ${tier.name} Tier
              </div>
            </div>
          </section>

          <section class="stack" style="gap: 10px;">
            <h3 style="margin:0; border-bottom: 1px solid var(--line); padding-bottom:6px; font-size: 0.95rem; color:var(--accent); text-transform:uppercase; letter-spacing:0.5px;">Unlocked Badges (${unlockedBadgeIds.length} / ${badges.length})</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr)); gap: 12px; margin-top: 5px;">
              ${badges.map(badge => {
                const isUnlocked = unlockedBadgeIds.includes(badge.id);
                const levels = {
                  "streak-starter": "bronze",
                  "consistency-50": "bronze",
                  "unstoppable": "silver",
                  "consistency-100": "silver",
                  "pr-hitter": "silver",
                  "consistency-250": "gold",
                  "heavy-lifter": "gold"
                };
                const level = levels[badge.id] || "bronze";
                const cardClass = `badge-card-premium ${isUnlocked ? `badge-unlocked badge-${level}` : 'badge-locked'}`;

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

          <section class="stack" style="gap: 10px;">
            <h3 style="margin:0; border-bottom: 1px solid var(--line); padding-bottom:6px; font-size: 0.95rem; color:var(--accent); text-transform:uppercase; letter-spacing:0.5px;">Personal Records</h3>
            ${prList.length ? `
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 180px), 1fr)); gap: 10px; margin-top: 5px;">
                ${prList.map(([exercise, weight]) => `
                  <div style="background: var(--surface-soft); padding: 12px 14px; border-radius: var(--r-md); border-left: 3px solid var(--teal); box-shadow: var(--shadow-card); display:flex; flex-direction:column; gap:4px; text-align:left;">
                    <span style="font-size: 0.75rem; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing:0.5px;">${escapeHtml(exercise)}</span>
                    <strong style="font-size: 1.15rem; color: var(--ink-soft);">${weight} <span style="font-size: 0.8rem; font-weight:normal; color:var(--muted)">kg</span></strong>
                  </div>
                `).join("")}
              </div>
            ` : `<div class="table-empty">No personal records logged yet.</div>`}
          </section>
        </div>
      `;
    }
  }

  // Bind Tab clicks
  root.querySelectorAll("[data-profile-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      root.querySelectorAll("[data-profile-tab]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeTab = btn.dataset.profileTab;
      renderTab();
    });
  });

  // Bind Back button click
  root.querySelector("#back-to-roster-btn")?.addEventListener("click", onBack);

  // Bind Edit button click
  root.querySelector("#edit-member-btn")?.addEventListener("click", () => {
    if (onEdit) onEdit();
  });

  renderTab();
}

export function calculateStreak(attendanceRecords, restDay = "Sunday") {
  if (!attendanceRecords || attendanceRecords.length === 0) return 0;
  
  // Extract and sort unique dates descending
  const dates = [...new Set(attendanceRecords.map(r => r.date))].sort((a, b) => b.localeCompare(a));
  
  const todayStr = today();
  // Compute yesterday using local date arithmetic (avoids UTC-vs-local timezone bugs)
  const yDate = new Date();
  yDate.setDate(yDate.getDate() - 1);
  const yesterdayStr = `${yDate.getFullYear()}-${String(yDate.getMonth() + 1).padStart(2, "0")}-${String(yDate.getDate()).padStart(2, "0")}`;
  
  // If the last check-in is older than yesterday, the streak is broken
  if (dates[0] !== todayStr && dates[0] !== yesterdayStr) return 0;
  
  let streak = 1;
  let current = new Date(dates[0]);
  
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i]);
    const diffTime = Math.abs(current - prev);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      streak++;
      current = prev;
    } else if (diffDays === 2) {
      // Check if the skipped day is the restDay
      const skippedDate = new Date(current.getTime() - 86400000);
      const dayName = skippedDate.toLocaleDateString("en-US", { weekday: "long" });
      
      if (dayName === restDay) {
        // Rest day grace allowed (streak continues, date updated)
        streak++;
        current = prev;
      } else {
        break; // Streak broken
      }
    } else {
      break; // Streak broken
    }
  }
  return streak;
}

export async function awardPointsAndBadges(context, actionType, details = {}) {
  const me = context.myMember;
  if (!me) return;

  const todayStr = today();
  const allAttendance = context.data.attendance || [];
  const allLogs = context.data.workout_logs || [];
  const badges = context.data.badges || [];

  // Clone member to avoid mutating direct state before save
  const updatedMember = { ...me };
  updatedMember.points = Number(updatedMember.points || 0);
  updatedMember.unlockedBadges = [...(updatedMember.unlockedBadges || [])];
  updatedMember.personalRecords = { ...(updatedMember.personalRecords || {}) };

  let pointsEarned = 0;
  const newlyUnlockedBadges = [];
  const newlyHitPRs = [];

  if (actionType === "checkin") {
    // Anti-abuse: Max 1 check-in per day for points
    const checkinsToday = allAttendance.filter(r => r.memberId === me.id && r.date === todayStr);
    if (checkinsToday.length <= 1) {
      pointsEarned += 10;
    }
  } else if (actionType === "workout") {
    // Anti-abuse: Max 2 workouts logged per day for points
    const logsToday = allLogs.filter(r => r.memberId === me.id && r.date === todayStr);
    if (logsToday.length <= 2) {
      pointsEarned += 50;
    }

    // Process PRs
    const workout = details.workout;
    if (workout && workout.exercises) {
      workout.exercises.forEach(ex => {
        const maxWeight = Math.max(...ex.sets.map(s => Number(s.weight || 0)), 0);
        if (maxWeight > 0) {
          const previousPR = Number(updatedMember.personalRecords[ex.name] || 0);
          if (maxWeight > previousPR) {
            updatedMember.personalRecords[ex.name] = maxWeight;
            newlyHitPRs.push({ exercise: ex.name, weight: maxWeight });
            pointsEarned += 100;
          }
        }
      });
    }
  }

  // Update points
  updatedMember.points += pointsEarned;

  // Recalculate streak
  const myAttendance = allAttendance.filter(r => r.memberId === me.id);
  const currentStreak = calculateStreak(myAttendance);
  updatedMember.currentStreak = currentStreak;

  // Check Badge triggers
  const myLogsCount = allLogs.filter(l => l.memberId === me.id).length;

  badges.forEach(badge => {
    // If already unlocked, skip
    if (updatedMember.unlockedBadges.includes(badge.id)) return;

    let unlocked = false;
    if (badge.type === "streak" && currentStreak >= badge.threshold) {
      unlocked = true;
    } else if (badge.type === "workout_count" && myLogsCount >= badge.threshold) {
      unlocked = true;
    } else if (badge.type === "pr" && Object.keys(updatedMember.personalRecords).length >= badge.threshold) {
      unlocked = true;
    } else if (badge.type === "pr_weight") {
      const maxWeight = Math.max(...Object.values(updatedMember.personalRecords).map(Number), 0);
      if (maxWeight >= badge.threshold) {
        unlocked = true;
      }
    }

    if (unlocked) {
      updatedMember.unlockedBadges.push(badge.id);
      newlyUnlockedBadges.push(badge);
    }
  });

  // Save member
  if (pointsEarned > 0 || newlyUnlockedBadges.length > 0 || updatedMember.currentStreak !== me.currentStreak) {
    const saved = await context.services.data.save(collections.members, updatedMember);
    context.applyChange(collections.members, saved);

    // Celebrate!
    if (newlyUnlockedBadges.length > 0 || newlyHitPRs.length > 0) {
      showCelebrationModal(newlyUnlockedBadges, newlyHitPRs);
    } else if (pointsEarned > 0) {
      context.toast(`Earned +${pointsEarned} Points!`);
    }
  }
}

export function getMemberTier(points = 0) {
  const pts = Number(points);
  if (pts >= 3000) return { name: "Platinum", class: "tier-platinum", icon: "diamond" };
  if (pts >= 1500) return { name: "Gold", class: "tier-gold", icon: "workspace_premium" };
  if (pts >= 500) return { name: "Silver", class: "tier-silver", icon: "shield_with_heart" };
  return { name: "Bronze", class: "tier-bronze", icon: "military_tech" };
}

export function getBadgeClass(badgeId, isUnlocked) {
  const levels = {
    "streak-starter": "bronze",
    "consistency-50": "bronze",
    "unstoppable": "silver",
    "consistency-100": "silver",
    "pr-hitter": "silver",
    "consistency-250": "gold",
    "heavy-lifter": "gold"
  };
  const level = levels[badgeId] || "bronze";
  return `badge-card-premium ${isUnlocked ? `badge-unlocked badge-${level}` : 'badge-locked'}`;
}

export function showCelebrationModal(newlyUnlockedBadges = [], newlyHitPRs = []) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay celebration-overlay";
  overlay.style.zIndex = "3000";

  let badgesHtml = "";
  if (newlyUnlockedBadges.length > 0) {
    badgesHtml = `
      <div style="margin-bottom: 24px; width: 100%;">
        <h3 style="color: var(--accent); margin-bottom: 14px; font-size: 1.05rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight:700;">🏅 Badges Unlocked!</h3>
        <div style="display: flex; flex-direction: column; gap: 12px; align-items: center; width: 100%;">
          ${newlyUnlockedBadges.map(badge => {
            const cardClass = getBadgeClass(badge.id, true);
            return `
              <div class="${cardClass}" style="width: 100%; max-width: 340px; pointer-events: none;">
                <div style="display: flex; gap: 12px; align-items: center; width: 100%;">
                  ${renderBadgeIcon(badge.id, true)}
                  <div style="text-align: left; flex:1;">
                    <strong style="font-size: 0.95rem; color: inherit; font-weight:700; display:block;">${escapeHtml(badge.name)}</strong>
                    <div style="font-size: 0.72rem; color: inherit; opacity: 0.9;">${escapeHtml(badge.description)}</div>
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  let prsHtml = "";
  if (newlyHitPRs.length > 0) {
    prsHtml = `
      <div style="margin-bottom: 24px; width: 100%;">
        <h3 style="color: var(--accent); margin-bottom: 14px; font-size: 1.05rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight:700;">🔥 New Personal Records!</h3>
        <div style="display: flex; flex-direction: column; gap: 10px; align-items: center; width: 100%;">
          ${newlyHitPRs.map(pr => `
            <div style="background: var(--surface-soft); padding: 14px 18px; border-radius: var(--r-md); border-left: 4px solid var(--teal); width: 100%; max-width: 340px; text-align: left; box-shadow: var(--shadow); display:flex; justify-content:space-between; align-items:center;">
              <div>
                <strong style="color: var(--ink-soft); font-size: 0.95rem; display:block;">${escapeHtml(pr.exercise)}</strong>
                <span style="font-size: 0.7rem; color: var(--muted); font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">New Record</span>
              </div>
              <div style="font-size: 1.35rem; font-weight: 800; color: var(--accent);">${pr.weight} <span style="font-size:0.85rem; font-weight:normal; color:var(--muted)">kg</span></div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  overlay.innerHTML = `
    <div class="modal-card celebration-card stack animate-scale" style="max-width: 440px; text-align: center; padding: 35px 30px; position: relative;">
      <button class="modal-close" data-modal="close" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted);">&times;</button>
      <div style="font-size: 5rem; margin-bottom: 15px; animation: bounce 1.2s infinite alternate; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.15));">🏆</div>
      <h2 style="font-size: 2rem; margin: 0 0 8px 0; color: var(--ink); font-weight: 800; letter-spacing: -0.5px;">Congratulations!</h2>
      <p style="color: var(--muted); font-size: 0.95rem; margin-bottom: 24px; font-weight:500;">You've hit new milestones and earned points!</p>
      
      ${badgesHtml}
      ${prsHtml}
      
      <button class="primary-button" data-modal="close" style="margin-top: 10px; width: 100%; font-weight: 700; letter-spacing: 0.5px; border-radius: var(--r-md); padding: 12px;">AWESOME!</button>
    </div>
  `;

  function close() {
    overlay.remove();
  }

  overlay.querySelectorAll("[data-modal='close']").forEach(btn => btn.addEventListener("click", close));
  document.body.appendChild(overlay);

  // Trigger confetti!
  if (typeof confetti === "function") {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    setTimeout(() => {
      confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0 } });
    }, 250);
    setTimeout(() => {
      confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1 } });
    }, 400);
  }
}

export function getBadgeCss(badgeId, isUnlocked) {
  if (!isUnlocked) {
    return `background: var(--bg); box-shadow: var(--nm-inset); border: 1px solid var(--line-soft); opacity: 0.55; color: var(--muted); padding: 16px 20px; border-radius: var(--r-md); display: flex; gap: 12px; align-items: center; text-align: left; transition: all 0.3s ease;`;
  }
  
  const levels = {
    "streak-starter": "bronze",
    "consistency-50": "bronze",
    "unstoppable": "silver",
    "consistency-100": "silver",
    "pr-hitter": "silver",
    "consistency-250": "gold",
    "heavy-lifter": "gold"
  };

  const level = levels[badgeId] || "bronze";
  if (level === "gold") {
    return `background: linear-gradient(135deg, #FFF9C4 0%, #FBC02D 50%, #F57F17 100%); color: #3E2723; box-shadow: var(--nm-glow-gold); border: 1px solid #FFEE58; padding: 16px 20px; border-radius: var(--r-md); display: flex; gap: 12px; align-items: center; text-align: left; transition: all 0.3s ease; font-weight: 600;`;
  }
  if (level === "silver") {
    return `background: linear-gradient(135deg, #ECEFF1 0%, #CFD8DC 50%, #78909C 100%); color: #263238; box-shadow: var(--nm-glow-silver); border: 1px solid #ECEFF1; padding: 16px 20px; border-radius: var(--r-md); display: flex; gap: 12px; align-items: center; text-align: left; transition: all 0.3s ease; font-weight: 600;`;
  }
  // bronze
  return `background: linear-gradient(135deg, #FFE0B2 0%, #FFB74D 50%, #E65100 100%); color: #3E2723; box-shadow: var(--nm-glow-bronze); border: 1px solid #FFCC80; padding: 16px 20px; border-radius: var(--r-md); display: flex; gap: 12px; align-items: center; text-align: left; transition: all 0.3s ease; font-weight: 600;`;
}

export function renderBadgeIcon(badgeId, isUnlocked) {
  const fill = isUnlocked ? "url(#badge-bg)" : "var(--surface-soft)";
  const stroke = isUnlocked ? "url(#badge-border)" : "var(--line)";
  
  const levels = {
    "streak-starter": "bronze",
    "consistency-50": "bronze",
    "unstoppable": "silver",
    "consistency-100": "silver",
    "pr-hitter": "silver",
    "consistency-250": "gold",
    "heavy-lifter": "gold"
  };
  const level = levels[badgeId] || "bronze";

  let gradients = "";
  if (isUnlocked) {
    if (level === "gold") {
      gradients = `
        <defs>
          <linearGradient id="badge-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFF9C4" />
            <stop offset="50%" stop-color="#FBC02D" />
            <stop offset="100%" stop-color="#F57F17" />
          </linearGradient>
          <linearGradient id="badge-border" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFEE58" />
            <stop offset="100%" stop-color="#E65100" />
          </linearGradient>
          <linearGradient id="ribbon-bg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FFEE58" />
            <stop offset="100%" stop-color="#F57F17" />
          </linearGradient>
        </defs>
      `;
    } else if (level === "silver") {
      gradients = `
        <defs>
          <linearGradient id="badge-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ECEFF1" />
            <stop offset="50%" stop-color="#CFD8DC" />
            <stop offset="100%" stop-color="#78909C" />
          </linearGradient>
          <linearGradient id="badge-border" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ECEFF1" />
            <stop offset="100%" stop-color="#37474F" />
          </linearGradient>
          <linearGradient id="ribbon-bg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#CFD8DC" />
            <stop offset="100%" stop-color="#78909C" />
          </linearGradient>
        </defs>
      `;
    } else {
      gradients = `
        <defs>
          <linearGradient id="badge-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFE0B2" />
            <stop offset="50%" stop-color="#FFB74D" />
            <stop offset="100%" stop-color="#E65100" />
          </linearGradient>
          <linearGradient id="badge-border" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFCC80" />
            <stop offset="100%" stop-color="#BF360C" />
          </linearGradient>
          <linearGradient id="ribbon-bg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FFCC80" />
            <stop offset="100%" stop-color="#E65100" />
          </linearGradient>
        </defs>
      `;
    }
  }

  let graphic = "";
  if (badgeId === "streak-starter" || badgeId === "unstoppable") {
    const color = isUnlocked ? "#ffffff" : "var(--muted)";
    const opacity = isUnlocked ? "1" : "0.35";
    graphic = `
      <path d="M 50 20 C 50 20 63 36 63 48 C 63 58 50 67 50 67 C 50 67 37 58 37 48 C 37 36 50 20 50 20 Z" fill="${color}" fill-opacity="${opacity}" />
      <path d="M 50 30 C 50 30 58 42 58 48 C 58 54 50 59 50 59 C 50 59 42 54 42 48 C 42 42 50 30 50 30 Z" fill="#FFE082" fill-opacity="${isUnlocked ? '0.9' : '0.1'}" />
    `;
  } else if (badgeId === "consistency-50" || badgeId === "consistency-100" || badgeId === "consistency-250") {
    const num = badgeId.split("-")[1];
    const textColor = isUnlocked ? "#ffffff" : "var(--muted)";
    const ribColor = isUnlocked ? "url(#ribbon-bg)" : "var(--line)";
    graphic = `
      <path d="M 35 18 L 65 18 L 65 66 L 50 54 L 35 66 Z" fill="${ribColor}" />
      <text x="50" y="40" font-size="17" font-weight="900" text-anchor="middle" dominant-baseline="central" fill="${textColor}">${num}</text>
    `;
  } else if (badgeId === "pr-hitter") {
    const color = isUnlocked ? "#ffffff" : "var(--muted)";
    graphic = `
      <rect x="25" y="46" width="50" height="8" rx="2" fill="${color}" />
      <rect x="20" y="34" width="10" height="32" rx="3" fill="${color}" />
      <rect x="70" y="34" width="10" height="32" rx="3" fill="${color}" />
      <rect x="15" y="38" width="5" height="24" rx="2" fill="${color}" opacity="0.8" />
      <rect x="80" y="38" width="5" height="24" rx="2" fill="${color}" opacity="0.8" />
    `;
  } else if (badgeId === "heavy-lifter") {
    const color = isUnlocked ? "#ffffff" : "var(--muted)";
    const ringBg = isUnlocked ? "#4E342E" : "var(--line-soft)";
    graphic = `
      <circle cx="50" cy="48" r="22" fill="${ringBg}" stroke="${color}" stroke-width="4.5" />
      <circle cx="50" cy="48" r="6" fill="none" stroke="${color}" stroke-width="2.5" />
      <text x="50" y="48" font-size="8.5" font-weight="800" text-anchor="middle" dominant-baseline="central" fill="${color}">100 KG</text>
    `;
  }

  let stars = "";
  if (isUnlocked) {
    const starColor = level === "gold" ? "#FFF9C4" : (level === "silver" ? "#ECEFF1" : "#FFD54F");
    if (level === "gold") {
      stars = `
        <polygon points="50,75 52,80 57,80 53,83 55,88 50,85 45,88 47,83 43,80 48,80" fill="${starColor}" />
        <polygon points="34,77 36,82 41,82 37,85 39,90 34,87 29,90 31,85 27,82 32,82" fill="${starColor}" />
        <polygon points="66,77 68,82 73,82 69,85 71,90 66,87 61,90 63,85 59,82 64,82" fill="${starColor}" />
      `;
    } else if (level === "silver") {
      stars = `
        <polygon points="42,76 44,81 49,81 45,84 47,89 42,86 37,89 39,84 35,81 40,81" fill="${starColor}" />
        <polygon points="58,76 60,81 65,81 61,84 63,89 58,86 53,89 55,84 51,81 56,81" fill="${starColor}" />
      `;
    } else {
      stars = `
        <polygon points="50,76 52,81 57,81 53,84 55,89 50,86 45,89 47,84 43,81 48,81" fill="${starColor}" />
      `;
    }
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="58" height="58" style="flex-shrink:0;">
      ${gradients}
      <polygon points="50,7 88,29 88,71 50,93 12,71 12,29" fill="${fill}" stroke="${stroke}" stroke-width="4.5" stroke-linejoin="round" />
      <polygon points="50,13 83,32 83,68 50,87 17,68 17,32" fill="none" stroke="${isUnlocked ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)'}" stroke-width="1.5" stroke-linejoin="round" />
      ${graphic}
      ${stars}
    </svg>
  `;
}

export function cmToFeetInches(cm) {
  if (cm == null || cm === "") return { feet: "", inches: "" };
  const val = parseFloat(cm);
  if (isNaN(val) || val <= 0) return { feet: "", inches: "" };
  const totalInches = val / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  if (inches === 12) {
    return { feet: feet + 1, inches: 0 };
  }
  return { feet, inches };
}

export function feetInchesToCm(feet, inches) {
  const f = parseInt(feet, 10);
  const i = parseInt(inches, 10);
  if (isNaN(f) && isNaN(i)) return "";
  const feetVal = isNaN(f) ? 0 : f;
  const inchesVal = isNaN(i) ? 0 : i;
  if (feetVal <= 0 && inchesVal <= 0) return "";
  const totalInches = (feetVal * 12) + inchesVal;
  return parseFloat((totalInches * 2.54).toFixed(1));
}

export function calcBmi(weightKg, heightCm) {
  const w = parseFloat(weightKg);
  const h = parseFloat(heightCm) / 100;
  if (!w || !h || h <= 0) return "";
  return (w / (h * h)).toFixed(1);
}

export function bmiCategory(bmi, gender) {
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

export function renderSharedMemberFields(member = {}) {
  const { feet, inches } = cmToFeetInches(member.initHeight);
  
  return `
    <label>WhatsApp Number
      <input name="whatsappNumber" type="tel" maxlength="10" value="${escapeHtml(member.whatsappNumber || "")}" placeholder="Same as mobile" />
    </label>
    <label>Gender
      <select name="gender">
        <option value="Not specified" ${member.gender === "Not specified" ? "selected" : ""}>Not specified</option>
        <option value="Female" ${member.gender === "Female" ? "selected" : ""}>Female</option>
        <option value="Male" ${member.gender === "Male" ? "selected" : ""}>Male</option>
        <option value="Other" ${member.gender === "Other" ? "selected" : ""}>Other</option>
      </select>
    </label>
    <label>Date of Birth
      <input name="dateOfBirth" type="date" value="${escapeHtml(member.dateOfBirth || "")}" />
    </label>
    <label class="wide">Address
      <textarea name="address" rows="2">${escapeHtml(member.address || "")}</textarea>
    </label>

    <div class="form-section-heading wide">Emergency Contact</div>
    <label>Contact name
      <input name="emergencyName" maxlength="80" value="${escapeHtml(member.emergencyName || "")}" />
    </label>
    <label>Relationship
      <select name="emergencyRelationship">
        <option value="" ${!member.emergencyRelationship ? "selected" : ""}>Not specified</option>
        <option value="Spouse" ${member.emergencyRelationship === "Spouse" ? "selected" : ""}>Spouse</option>
        <option value="Parent" ${member.emergencyRelationship === "Parent" ? "selected" : ""}>Parent</option>
        <option value="Sibling" ${member.emergencyRelationship === "Sibling" ? "selected" : ""}>Sibling</option>
        <option value="Child" ${member.emergencyRelationship === "Child" ? "selected" : ""}>Child</option>
        <option value="Friend" ${member.emergencyRelationship === "Friend" ? "selected" : ""}>Friend</option>
        <option value="Other" ${member.emergencyRelationship === "Other" ? "selected" : ""}>Other</option>
      </select>
    </label>
    <label>Contact phone
      <input name="emergencyPhone" type="tel" maxlength="10" value="${escapeHtml(member.emergencyPhone || "")}" />
    </label>

    <div class="form-section-heading wide">Initial Measurements</div>
    <label>Weight kg
      <input name="initWeight" type="number" min="0" step="0.1" value="${escapeHtml(member.initWeight != null ? String(member.initWeight) : "")}" />
    </label>
    
    <label>Height (Feet)
      <select name="heightFeet">
        <option value="" ${feet === "" ? "selected" : ""}>Select</option>
        ${[3,4,5,6,7,8].map(f => `<option value="${f}" ${feet === f ? "selected" : ""}>${f} ft</option>`).join("")}
      </select>
    </label>
    <label>Height (Inches)
      <select name="heightInches">
        <option value="" ${inches === "" ? "selected" : ""}>Select</option>
        ${[0,1,2,3,4,5,6,7,8,9,10,11].map(i => `<option value="${i}" ${inches === i ? "selected" : ""}>${i} in</option>`).join("")}
      </select>
    </label>
    
    <!-- Hidden input to store converted height in cm -->
    <input type="hidden" name="initHeight" value="${escapeHtml(member.initHeight != null ? String(member.initHeight) : "")}" />

    <!-- Obesity Meter -->
    <div class="bmi-meter-wrapper wide hidden" data-bmi-meter>
      <div class="bmi-meter-header">
        <span class="bmi-meter-value" data-bmi-number>—</span>
        <span class="bmi-unit">BMI</span>
        <span class="bmi-meter-category" data-bmi-category></span>
      </div>
      <div class="bmi-meter-bar" aria-hidden="true">
        <div class="bmi-zone bmi-zone--uw"  title="Underweight < 18.5"></div>
        <div class="bmi-zone bmi-zone--ok"  title="Healthy 18.5–22.9"></div>
        <div class="bmi-zone bmi-zone--ow"  title="Overweight 23–24.9"></div>
        <div class="bmi-zone bmi-zone--ob1" title="Obese I 25–29.9"></div>
        <div class="bmi-zone bmi-zone--ob2" title="Obese II 30–34.9"></div>
        <div class="bmi-zone bmi-zone--ob3" title="Obese III ≥ 35"></div>
        <div class="bmi-cursor" data-bmi-cursor></div>
      </div>
      <input type="hidden" name="initBmi" data-bmi-hidden value="${escapeHtml(member.initBmi || "")}" />
    </div>

    <label>Body fat %
      <input name="initBodyFat" type="number" min="0" step="0.1" value="${escapeHtml(member.initBodyFat != null ? String(member.initBodyFat) : "")}" />
    </label>
    <label>Waist cm
      <input name="initWaist" type="number" min="0" step="0.1" value="${escapeHtml(member.initWaist != null ? String(member.initWaist) : "")}" />
    </label>
    <label>Chest cm
      <input name="initChest" type="number" min="0" step="0.1" value="${escapeHtml(member.initChest != null ? String(member.initChest) : "")}" />
    </label>
    <label>Hip cm
      <input name="initHip" type="number" min="0" step="0.1" value="${escapeHtml(member.initHip != null ? String(member.initHip) : "")}" />
    </label>
    <label>Bicep cm
      <input name="initBicep" type="number" min="0" step="0.1" value="${escapeHtml(member.initBicep != null ? String(member.initBicep) : "")}" />
    </label>
    <label>Thigh cm
      <input name="initThigh" type="number" min="0" step="0.1" value="${escapeHtml(member.initThigh != null ? String(member.initThigh) : "")}" />
    </label>
    
    <label class="wide">Gym goal
      <select name="gymGoal">
        <option value="" ${!member.gymGoal ? "selected" : ""}>Not specified</option>
        <option value="Weight Loss" ${member.gymGoal === "Weight Loss" ? "selected" : ""}>Weight Loss</option>
        <option value="Muscle Gain" ${member.gymGoal === "Muscle Gain" ? "selected" : ""}>Muscle Gain</option>
        <option value="General Fitness" ${member.gymGoal === "General Fitness" ? "selected" : ""}>General Fitness</option>
        <option value="Endurance / Cardio" ${member.gymGoal === "Endurance / Cardio" ? "selected" : ""}>Endurance / Cardio</option>
        <option value="Body Toning" ${member.gymGoal === "Body Toning" ? "selected" : ""}>Body Toning</option>
        <option value="Flexibility / Mobility" ${member.gymGoal === "Flexibility / Mobility" ? "selected" : ""}>Flexibility / Mobility</option>
        <option value="Rehabilitation" ${member.gymGoal === "Rehabilitation" ? "selected" : ""}>Rehabilitation</option>
      </select>
    </label>

    <div class="form-section-heading wide">Background</div>
    <label>Blood group
      <select name="bloodGroup">
        <option value="" ${!member.bloodGroup ? "selected" : ""}>Not specified</option>
        <option value="A+" ${member.bloodGroup === "A+" ? "selected" : ""}>A+</option>
        <option value="A-" ${member.bloodGroup === "A-" ? "selected" : ""}>A-</option>
        <option value="B+" ${member.bloodGroup === "B+" ? "selected" : ""}>B+</option>
        <option value="B-" ${member.bloodGroup === "B-" ? "selected" : ""}>B-</option>
        <option value="O+" ${member.bloodGroup === "O+" ? "selected" : ""}>O+</option>
        <option value="O-" ${member.bloodGroup === "O-" ? "selected" : ""}>O-</option>
        <option value="AB+" ${member.bloodGroup === "AB+" ? "selected" : ""}>AB+</option>
        <option value="AB-" ${member.bloodGroup === "AB-" ? "selected" : ""}>AB-</option>
      </select>
    </label>
    <label>Occupation
      <input name="occupation" maxlength="80" value="${escapeHtml(member.occupation || "")}" />
    </label>
    <label>Activity level
      <select name="activityLevel">
        <option value="" ${!member.activityLevel ? "selected" : ""}>Not specified</option>
        <option value="Sedentary" ${member.activityLevel === "Sedentary" ? "selected" : ""}>Sedentary</option>
        <option value="Lightly Active" ${member.activityLevel === "Lightly Active" ? "selected" : ""}>Lightly Active</option>
        <option value="Moderately Active" ${member.activityLevel === "Moderately Active" ? "selected" : ""}>Moderately Active</option>
        <option value="Very Active" ${member.activityLevel === "Very Active" ? "selected" : ""}>Very Active</option>
      </select>
    </label>
    <label>Fitness experience
      <select name="fitnessExperience">
        <option value="" ${!member.fitnessExperience ? "selected" : ""}>Not specified</option>
        <option value="Beginner" ${member.fitnessExperience === "Beginner" ? "selected" : ""}>Beginner</option>
        <option value="Intermediate" ${member.fitnessExperience === "Intermediate" ? "selected" : ""}>Intermediate</option>
        <option value="Advanced" ${member.fitnessExperience === "Advanced" ? "selected" : ""}>Advanced</option>
      </select>
    </label>

    <div class="form-section-heading wide">Health &amp; Medical</div>
    <label class="wide">Medical conditions
      <textarea name="medicalConditions" rows="2">${escapeHtml(member.medicalConditions || "")}</textarea>
    </label>
    <label class="wide">Current medications
      <textarea name="currentMedications" rows="2">${escapeHtml(member.currentMedications || "")}</textarea>
    </label>
    <label class="wide">Allergies
      <textarea name="allergies" rows="2">${escapeHtml(member.allergies || "")}</textarea>
    </label>
    <label class="wide">Limitations or injuries
      <textarea name="physicalLimitations" rows="2">${escapeHtml(member.physicalLimitations || "")}</textarea>
    </label>
  `;
}

export function bindSharedBmiEvents(form) {
  const bmiMeter      = form.querySelector("[data-bmi-meter]");
  const bmiNumber     = form.querySelector("[data-bmi-number]");
  const bmiCatEl      = form.querySelector("[data-bmi-category]");
  const bmiCursor     = form.querySelector("[data-bmi-cursor]");
  const bmiHidden     = form.querySelector("[data-bmi-hidden]");
  const heightHidden  = form.querySelector("[name='initHeight']");

  function updateBmi() {
    const feet = form.heightFeet?.value || "";
    const inches = form.heightInches?.value || "";
    const cm = feetInchesToCm(feet, inches);
    
    if (heightHidden) heightHidden.value = cm || "";

    const val = calcBmi(form.initWeight?.value || "", cm);
    if (bmiHidden) bmiHidden.value = val;

    if (!val) {
      if (bmiMeter) bmiMeter.classList.add("hidden");
      return;
    }

    if (bmiMeter) bmiMeter.classList.remove("hidden");

    const cat = bmiCategory(val, form.gender?.value || "Not specified");
    if (bmiNumber)  { bmiNumber.textContent = val; bmiNumber.style.color = cat ? cat.color : ""; }
    if (bmiCatEl)   { bmiCatEl.textContent = cat ? cat.label : ""; bmiCatEl.style.color = cat ? cat.color : ""; }

    // Cursor position: linear scale BMI 10–40 (30-unit range)
    const pct = Math.min(Math.max((parseFloat(val) - 10) / 30 * 100, 0), 100);
    if (bmiCursor) bmiCursor.style.left = `${pct}%`;
  }

  form.initWeight?.addEventListener("input", updateBmi);
  form.heightFeet?.addEventListener("change", updateBmi);
  form.heightInches?.addEventListener("change", updateBmi);
  form.gender?.addEventListener("change", updateBmi);
  
  // Initial run
  updateBmi();
}

export function getAugmentedPayments(context) {
  const rawPayments = context?.data?.payments || [];
  const members = context?.data?.members || [];
  const plans = context?.data?.membership_plans || [];

  const memberPaymentSet = new Set();
  const list = rawPayments.map((p, idx) => {
    if (p.memberId) memberPaymentSet.add(p.memberId);
    const cleanId = String(p.id || idx + 1000).replace(/[^a-zA-Z0-9]/g, "");
    return {
      ...p,
      receiptNumber: p.receiptNumber || `RCPT-${cleanId.slice(-8).toUpperCase()}`
    };
  });

  members.forEach((member) => {
    if (member.planId && !memberPaymentSet.has(member.id)) {
      const plan = plans.find((p) => p.id === member.planId);
      const amount = plan ? Number(plan.price || 0) : 0;
      const cleanMemberId = String(member.id || "OLD").replace(/[^a-zA-Z0-9]/g, "");
      const receiptHash = cleanMemberId.slice(-6).toUpperCase() || "OLD";

      list.push({
        id: `synth-pay-${member.id}`,
        memberId: member.id,
        planId: member.planId,
        amount: amount,
        date: member.startDate || member.joinDate || today(),
        method: "Cash",
        collectedBy: "Owner",
        status: member.status === "Expired" ? "Expired" : "Paid",
        receiptNumber: `RCPT-MEM-${receiptHash}`,
        notes: `Admission fee for ${plan ? plan.planName : "Membership"}`
      });
    }
  });

  return list.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
}

