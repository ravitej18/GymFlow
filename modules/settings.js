import { downloadJson, escapeHtml, formData, pageHeader, withButtonLoading } from "./utils.js";

export const settingsModule = {
  render({ settings, services, profile }) {
    const isOwner = profile?.role === "owner";

    return `
      ${pageHeader("Settings")}
      <div class="work-grid">
        <form class="panel stack" id="settings-form">
          <div class="panel-heading"><h2>Gym Profile</h2><span>${services.mode === "firebase" ? "Live" : "Demo"}</span></div>
          <div class="form-grid">
            <label>Gym name<input name="gymName" value="${escapeHtml(settings?.gymName || "")}" required /></label>
            <label>Owner name<input name="ownerName" value="${escapeHtml(settings?.ownerName || "")}" /></label>
            <label>Contact email<input name="contactEmail" type="email" value="${escapeHtml(settings?.contactEmail || "")}" /></label>
            <label>Phone<input name="phone" maxlength="10" value="${escapeHtml(settings?.phone || "")}" /></label>
            <label>Currency
              <select name="currency">
                ${["INR", "USD", "EUR", "GBP"].map((currency) => `<option ${settings?.currency === currency ? "selected" : ""}>${currency}</option>`).join("")}
              </select>
            </label>
            <label class="wide">Address<textarea name="address" rows="3">${escapeHtml(settings?.address || "")}</textarea></label>
            <div class="form-section-heading wide">VIP Pricing Anchor</div>
            <label class="wide checkbox-label">
              <input type="checkbox" name="vipPlanEnabled" value="true" ${settings?.vipPlanEnabled !== false ? "checked" : ""} />
              Enable VIP Anchor Plan
            </label>
            <label>VIP Plan Name<input name="vipPlanName" value="${escapeHtml(settings?.vipPlanName || "VIP Personal Coaching Package")}" /></label>
            <label>VIP Plan Price<input name="vipPlanPrice" type="number" min="0" value="${escapeHtml(String(settings?.vipPlanPrice ?? 5000))}" /></label>
            <label class="wide">VIP Plan Description<textarea name="vipPlanDescription" rows="2">${escapeHtml(settings?.vipPlanDescription || "1-on-1 private trainer, customized nutrition and supplement guidelines, weekly body metrics tracking, and priority equipment booking.")}</textarea></label>
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
        <section class="panel stack">
          <div class="panel-heading"><h2>About GymFlow</h2></div>
          <p class="panel-hint">Gym Management &amp; Tracking Platform.</p>
        </section>

        ${
          isOwner
            ? `<section class="panel stack danger-zone" style="grid-column: 1 / -1; border: 1.5px solid #dc2626; background: rgba(220,38,38,0.03); margin-top: 15px; border-radius: var(--r-lg); padding: 22px;">
                <div class="panel-heading" style="border-bottom: 1px solid rgba(220,38,38,0.2); padding-bottom: 10px;">
                  <h2 style="display:flex; align-items:center; gap:8px; color: #dc2626; margin:0; font-size:1.15rem; font-weight: 700;">
                    <span class="material-symbols-outlined">warning</span> Danger Zone — Hard Delete Gym
                  </h2>
                </div>
                <p class="panel-hint" style="color: var(--text); margin: 0; line-height: 1.5; font-size: 0.9rem;">
                  Permanently delete <strong>${escapeHtml(settings?.gymName || "this gym")}</strong>. This action executes an irreversible hard delete on all gym data including members, trainers, attendance logs, membership plans, payment histories, workout plans, and gym settings.
                </p>
                <div style="margin-top: 8px;">
                  <button type="button" id="start-delete-gym-btn" style="background: #dc2626; color: white; border: none; padding: 10px 18px; border-radius: var(--r-md); font-weight: 700; display: inline-flex; align-items: center; gap: 8px; cursor: pointer;">
                    <span class="material-symbols-outlined">delete_forever</span> Delete Gym &amp; Wipe All Data
                  </button>
                </div>
              </section>`
            : ""
        }
      </div>

      <!-- Step 1 Confirmation Modal -->
      <div id="delete-gym-modal-1" class="modal-overlay hidden" style="position:fixed; inset:0; background:rgba(0,0,0,0.65); backdrop-filter:blur(4px); z-index:999; display:flex; align-items:center; justify-content:center; padding:16px;">
        <div class="modal-content panel stack" style="max-width:480px; width:100%; border:2px solid #dc2626; border-radius:var(--r-lg); background:var(--surface); padding:24px;">
          <div style="display:flex; align-items:center; gap:12px; border-bottom:1px solid var(--line); padding-bottom:12px;">
            <span class="material-symbols-outlined" style="color:#dc2626; font-size:2rem;">warning</span>
            <h3 style="margin:0; color:#dc2626; font-size:1.25rem;">Confirm Gym Deletion (Step 1 of 2)</h3>
          </div>
          <div style="font-size:0.9rem; color:var(--text); line-height:1.6; margin-top:12px;">
            <p style="margin:0 0 10px 0; font-weight:700; color:#dc2626;">
              ⚠️ THIS ACTION IS IRREVERSIBLE AND CANNOT BE UNDONE!
            </p>
            <p style="margin:0 0 10px 0;">
              You are about to initiate a <strong>complete hard delete</strong> for <strong>${escapeHtml(settings?.gymName || "your gym")}</strong>.
            </p>
            <ul style="margin:0 0 12px 18px; padding:0;">
              <li>All member profiles, memberships &amp; attendance records will be permanently wiped</li>
              <li>All trainer profiles &amp; client assignments will be deleted</li>
              <li>All membership plans, pricing &amp; payment histories will be erased</li>
              <li>All workout plans, progress metrics &amp; settings will be destroyed</li>
            </ul>
            <p style="margin:0; font-weight:600;">
              Do you want to proceed to password verification?
            </p>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
            <button type="button" class="ghost-button" id="cancel-delete-step1-btn">Cancel</button>
            <button type="button" id="proceed-delete-step2-btn" style="background:#dc2626; color:white; border:none; padding:8px 16px; border-radius:var(--r-md); font-weight:700; cursor:pointer;">
              Proceed to Verification &rarr;
            </button>
          </div>
        </div>
      </div>

      <!-- Step 2 Password Verification Modal -->
      <div id="delete-gym-modal-2" class="modal-overlay hidden" style="position:fixed; inset:0; background:rgba(0,0,0,0.65); backdrop-filter:blur(4px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:16px;">
        <div class="modal-content panel stack" style="max-width:480px; width:100%; border:2px solid #dc2626; border-radius:var(--r-lg); background:var(--surface); padding:24px;">
          <div style="display:flex; align-items:center; gap:12px; border-bottom:1px solid var(--line); padding-bottom:12px;">
            <span class="material-symbols-outlined" style="color:#dc2626; font-size:2rem;">security</span>
            <h3 style="margin:0; color:#dc2626; font-size:1.25rem;">Final Password Verification (Step 2 of 2)</h3>
          </div>
          <form id="delete-gym-form" style="margin-top:12px;">
            <p style="font-size:0.88rem; color:var(--text-muted); margin:0 0 15px 0;">
              Please enter your login password and type <strong>DELETE</strong> in the box below to authorize permanent gym destruction.
            </p>
            <div style="display:flex; flex-direction:column; gap:12px;">
              <label style="font-size:0.85rem; font-weight:600; color:var(--text);">
                Account Login Password
                <input type="password" id="delete-gym-password" name="password" placeholder="Enter your login password" required style="width:100%; margin-top:4px;" />
              </label>
              <label style="font-size:0.85rem; font-weight:600; color:var(--text);">
                Confirmation Phrase (type <strong>DELETE</strong>)
                <input type="text" id="delete-gym-phrase" name="phrase" placeholder="DELETE" required style="width:100%; margin-top:4px;" />
              </label>
            </div>
            <div id="delete-gym-error-msg" style="color:#dc2626; font-size:0.85rem; font-weight:600; margin-top:10px; display:none;"></div>
            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
              <button type="button" class="ghost-button" id="cancel-delete-step2-btn">Cancel</button>
              <button type="submit" id="confirm-delete-final-btn" style="background:#dc2626; color:white; border:none; padding:10px 18px; border-radius:var(--r-md); font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
                <span class="material-symbols-outlined" style="font-size:1.2rem;">delete_forever</span> Permanently Delete Gym &amp; All Data
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },
  bind(root, context) {
    const form = root.querySelector("#settings-form");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = formData(form);
      payload.vipPlanEnabled = form.vipPlanEnabled.checked;
      payload.vipPlanPrice = Number(payload.vipPlanPrice || 0);
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

    // Delete Gym Double Confirmation & Password Verification logic
    const modal1 = root.querySelector("#delete-gym-modal-1");
    const modal2 = root.querySelector("#delete-gym-modal-2");
    const startBtn = root.querySelector("#start-delete-gym-btn");
    const cancel1Btn = root.querySelector("#cancel-delete-step1-btn");
    const proceed2Btn = root.querySelector("#proceed-delete-step2-btn");
    const cancel2Btn = root.querySelector("#cancel-delete-step2-btn");
    const deleteForm = root.querySelector("#delete-gym-form");
    const errorMsg = root.querySelector("#delete-gym-error-msg");

    if (startBtn && modal1 && modal2) {
      startBtn.addEventListener("click", () => {
        modal1.classList.remove("hidden");
      });

      cancel1Btn?.addEventListener("click", () => {
        modal1.classList.add("hidden");
      });

      proceed2Btn?.addEventListener("click", () => {
        modal1.classList.add("hidden");
        modal2.classList.remove("hidden");
        if (errorMsg) {
          errorMsg.style.display = "none";
          errorMsg.textContent = "";
        }
      });

      cancel2Btn?.addEventListener("click", () => {
        modal2.classList.add("hidden");
      });

      deleteForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const pwdInput = root.querySelector("#delete-gym-password");
        const phraseInput = root.querySelector("#delete-gym-phrase");
        const pwd = pwdInput?.value || "";
        const phrase = phraseInput?.value || "";

        if (phrase.trim().toUpperCase() !== "DELETE") {
          if (errorMsg) {
            errorMsg.textContent = "Please type DELETE to confirm deletion.";
            errorMsg.style.display = "block";
          }
          return;
        }

        if (!pwd) {
          if (errorMsg) {
            errorMsg.textContent = "Please enter your password.";
            errorMsg.style.display = "block";
          }
          return;
        }

        const submitBtn = deleteForm.querySelector("#confirm-delete-final-btn");
        await withButtonLoading(submitBtn, async () => {
          try {
            await context.services.data.deleteGym(pwd);
            modal2.classList.add("hidden");
            context.toast("Gym and all data permanently deleted.");
            context.navigate("auth");
          } catch (err) {
            if (errorMsg) {
              errorMsg.textContent = err.message || "Incorrect password. Gym deletion cancelled.";
              errorMsg.style.display = "block";
            }
          }
        });
      });
    }
  }
};
