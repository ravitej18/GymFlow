import { downloadJson, escapeHtml, formData, pageHeader } from "./utils.js";

export const settingsModule = {
  render({ settings, services }) {
    return `
      ${pageHeader("Settings")}
      <div class="work-grid">
        <form class="panel stack" id="settings-form">
          <div class="panel-heading"><h2>Gym Profile</h2><span>${services.mode === "firebase" ? "Live" : "Demo"}</span></div>
          <div class="form-grid">
            <label>Gym name<input name="gymName" value="${escapeHtml(settings?.gymName || "")}" required /></label>
            <label>Owner name<input name="ownerName" value="${escapeHtml(settings?.ownerName || "")}" /></label>
            <label>Contact email<input name="contactEmail" type="email" value="${escapeHtml(settings?.contactEmail || "")}" /></label>
            <label>Phone<input name="phone" value="${escapeHtml(settings?.phone || "")}" /></label>
            <label>Currency
              <select name="currency">
                ${["INR", "USD", "EUR", "GBP"].map((currency) => `<option ${settings?.currency === currency ? "selected" : ""}>${currency}</option>`).join("")}
              </select>
            </label>
            <label class="wide">Address<textarea name="address" rows="3">${escapeHtml(settings?.address || "")}</textarea></label>
          </div>
          <button class="primary-button" type="submit">Save settings</button>
        </form>
        <section class="panel stack">
          <div class="panel-heading"><h2>Gym Code</h2></div>
          <p class="panel-hint">Share this code so members can register and join your gym.</p>
          ${
            settings?.gymCode
              ? `<div class="code-row">
                  <code class="gym-code">${escapeHtml(settings.gymCode)}</code>
                  <button class="ghost-button" data-action="copy-code" type="button"><span class="material-symbols-outlined">content_copy</span>Copy</button>
                </div>`
              : `<p class="panel-hint">Your gym code will appear here after your next save.</p>`
          }
        </section>
        <section class="panel stack">
          <div class="panel-heading"><h2>Membership Pause Limits</h2></div>
          <p class="panel-hint">Global defaults applied when an owner pauses a member's membership.</p>
          <form id="pause-limits-form">
            <div class="form-grid">
              <label>Max pauses per year
                <input name="maxPausesPerYear" type="number" min="1" max="12"
                       value="${escapeHtml(String(settings?.maxPausesPerYear ?? 2))}" required />
              </label>
              <label>Max pause days (per pause)
                <input name="maxPauseDays" type="number" min="1" max="365"
                       value="${escapeHtml(String(settings?.maxPauseDays ?? 30))}" required />
              </label>
            </div>
            <button class="primary-button" type="submit">Save pause limits</button>
          </form>
        </section>
        <section class="panel stack">
          <div class="panel-heading"><h2>Backup &amp; Restore</h2></div>
          <p class="panel-hint">Download a full copy of your gym data, or restore from a previous export.</p>
          <div class="button-row">
            <button class="ghost-button" data-action="export" type="button">Export data</button>
            <label class="file-button">Import JSON<input type="file" accept="application/json" data-action="import" /></label>
          </div>
        </section>
      </div>
    `;
  },
  bind(root, context) {
    const form = root.querySelector("#settings-form");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = formData(form);
      // The gym name shows in the sidebar, so only a name change needs a full
      // shell re-render; everything else can use the lightweight scoped update.
      const nameChanged = (payload.gymName || "") !== (context.settings?.gymName || "");
      await context.services.data.saveSettings(payload);
      context.toast("Settings saved.");
      if (nameChanged) {
        await context.refresh();
      } else {
        await context.refreshView();
      }
    });

    root.querySelector("[data-action='copy-code']")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(context.settings?.gymCode || "");
        context.toast("Gym code copied.");
      } catch (error) {
        context.toast("Couldn't copy — select the code manually.");
      }
    });

    root.querySelector("[data-action='export']")?.addEventListener("click", async () => {
      const payload = await context.services.data.exportData();
      downloadJson("gymflow-export.json", payload);
      context.toast("Export ready.");
    });

    root.querySelector("[data-action='import']")?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const payload = JSON.parse(await file.text());
      await context.services.data.importData(payload);
      context.toast("Import complete.");
      await context.refresh();
    });

    const pauseLimitsForm = root.querySelector("#pause-limits-form");
    pauseLimitsForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = formData(pauseLimitsForm);
      payload.maxPausesPerYear = Number(payload.maxPausesPerYear);
      payload.maxPauseDays     = Number(payload.maxPauseDays);
      await context.services.data.saveSettings(payload);
      context.toast("Pause limits saved.");
      await context.refreshView();
    });
  }
};
