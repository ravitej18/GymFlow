import { escapeHtml, normalizePhone10 } from "./utils.js";

export function renderAuth(root, context) {
  const hash = location.hash || "";
  const params = new URLSearchParams(hash.substring(hash.indexOf("?") + 1));
  const inviteId = params.get("invite") || "";
  const phoneVal = params.get("phone") || "";
  const codeVal = params.get("code") || "";
  const isInvite = !!inviteId;

  root.innerHTML = `
    <main class="auth-layout">
      <section class="auth-visual">
        <div class="auth-brand">
          <div class="brand-mark large">${escapeHtml((window.GYM_CONFIG?.appName || "Grip Gym").slice(0, 2).toUpperCase())}</div>
          <h1>${escapeHtml(window.GYM_CONFIG?.appName || "Grip Gym")}</h1>
          <p>Manage members, payments, renewals, trainers, and daily operations from a static web app.</p>
        </div>
      </section>
      <section class="auth-panel">
        <div class="auth-tabs">
          <button class="${isInvite ? "" : "active"}" data-auth-tab="login">Login</button>
          <button class="${isInvite ? "active" : ""}" data-auth-tab="register">Register</button>
        </div>

        <form id="login-form" class="stack auth-form ${isInvite ? "hidden" : ""}">
          <label>Email or Phone Number<input name="email" type="text" autocomplete="username" required /></label>
          <label>Password
            <div class="password-container">
              <input name="password" type="password" autocomplete="current-password" required />
              <button type="button" class="toggle-password-btn" tabindex="-1"><span class="material-symbols-outlined">visibility</span></button>
            </div>
          </label>
          <button class="primary-button" type="submit">Login</button>
          <button class="link-button" type="button" data-action="reset-password">Forgot password</button>
          ${context.mode === "local" ? `<button class="ghost-button" type="button" data-action="demo">Open demo workspace</button>` : ""}
          <button class="ghost-button" type="button" data-action="guest" style="margin-top: 12px; background: rgba(16, 185, 129, 0.08); border-color: var(--teal); color: var(--teal-ink); font-weight: 600; width: 100%;">Try as Guest</button>
        </form>

        <div id="register-panel" class="stack ${isInvite ? "" : "hidden"}">
          <div class="auth-tabs sub">
            <button class="${isInvite ? "" : "active"}" data-register-mode="owner" type="button">Register a gym</button>
            <button class="${isInvite ? "active" : ""}" data-register-mode="member" type="button">Join as member</button>
            <button data-register-mode="trainer" type="button">Join as trainer</button>
          </div>

          <form id="register-form" class="stack auth-form ${isInvite ? "hidden" : ""}">
            <label>Gym name<input name="gymName" value="${escapeHtml(window.GYM_CONFIG?.appName || "Grip Gym")}" required maxlength="80" /></label>
            <label>Your name<input name="name" autocomplete="name" required maxlength="80" /></label>
            <label>Email<input name="email" type="email" autocomplete="email" required /></label>
            <label>Password
              <div class="password-container">
                <input name="password" type="password" minlength="6" autocomplete="new-password" required />
                <button type="button" class="toggle-password-btn" tabindex="-1"><span class="material-symbols-outlined">visibility</span></button>
              </div>
            </label>
            <label>Confirm Password
              <div class="password-container">
                <input name="confirmPassword" type="password" minlength="6" autocomplete="new-password" required />
                <button type="button" class="toggle-password-btn" tabindex="-1"><span class="material-symbols-outlined">visibility</span></button>
              </div>
            </label>
            <button class="primary-button" type="submit">Create owner account</button>
          </form>

          <form id="member-register-form" class="stack auth-form ${isInvite ? "" : "hidden"}">
            <input name="invite" type="hidden" value="${escapeHtml(inviteId)}" />
            <label>Gym code
              <input name="gymCode" 
                     value="${escapeHtml(codeVal)}" 
                     ${isInvite ? "readonly tabindex='-1' style='opacity: 0.7; pointer-events: none;'" : ""} 
                     required maxlength="20" placeholder="e.g. GRIP-4821" autocomplete="off" />
            </label>
            <label>Your name<input name="name" autocomplete="name" required maxlength="80" /></label>
            <label>${isInvite ? "Phone Number" : "Email"}
              <input name="email" 
                     type="${isInvite ? "text" : "email"}" 
                     value="${escapeHtml(phoneVal)}" 
                     ${isInvite ? "readonly tabindex='-1' style='opacity: 0.7; pointer-events: none;'" : ""} 
                     autocomplete="email" required />
            </label>
            <label>Password
              <div class="password-container">
                <input name="password" type="password" minlength="6" autocomplete="new-password" required />
                <button type="button" class="toggle-password-btn" tabindex="-1"><span class="material-symbols-outlined">visibility</span></button>
              </div>
            </label>
            <label>Confirm Password
              <div class="password-container">
                <input name="confirmPassword" type="password" minlength="6" autocomplete="new-password" required />
                <button type="button" class="toggle-password-btn" tabindex="-1"><span class="material-symbols-outlined">visibility</span></button>
              </div>
            </label>
            <button class="primary-button" type="submit">Join gym</button>
            <p class="auth-note">${isInvite ? "Complete your registration to activate your gym membership." : "Ask your gym for its join code."}</p>
          </form>

          <form id="trainer-register-form" class="stack auth-form hidden">
            <label>Gym code<input name="gymCode" required maxlength="20" placeholder="e.g. GRIP-4821" autocomplete="off" /></label>
            <label>Your name<input name="name" autocomplete="name" required maxlength="80" /></label>
            <label>Email<input name="email" type="email" autocomplete="email" required /></label>
            <label>Password
              <div class="password-container">
                <input name="password" type="password" minlength="6" autocomplete="new-password" required />
                <button type="button" class="toggle-password-btn" tabindex="-1"><span class="material-symbols-outlined">visibility</span></button>
              </div>
            </label>
            <label>Confirm Password
              <div class="password-container">
                <input name="confirmPassword" type="password" minlength="6" autocomplete="new-password" required />
                <button type="button" class="toggle-password-btn" tabindex="-1"><span class="material-symbols-outlined">visibility</span></button>
              </div>
            </label>
            <button class="primary-button" type="submit">Join as trainer</button>
            <p class="auth-note">Ask your gym for its join code.</p>
          </form>
        </div>

        <p class="auth-note">${escapeHtml(context.mode === "firebase" ? "Your gym data is saved and synced automatically." : "Running in demo mode on this device.")}</p>
      </section>
    </main>
    <div class="toast" data-auth-toast></div>
  `;

  bindAuth(root, context);
}

// Show an inline message inside the active auth form (error or success).
function authMessage(root, text, type = "error") {
  // Place the message at the top of whichever form is currently visible.
  const visibleForm = root.querySelector(".auth-form:not(.hidden)");
  if (!visibleForm) return;
  let box = visibleForm.querySelector("[data-auth-msg]");
  if (!box) {
    box = document.createElement("p");
    box.dataset.authMsg = "true";
    visibleForm.prepend(box);
  }
  box.className = `auth-msg ${type}`;
  box.textContent = text;
}

function clearAuthMessages(root) {
  root.querySelectorAll("[data-auth-msg]").forEach((el) => el.remove());
}

function bindAuth(root, context) {
  const loginForm = root.querySelector("#login-form");
  const registerPanel = root.querySelector("#register-panel");
  const registerForm = root.querySelector("#register-form");
  const memberForm = root.querySelector("#member-register-form");
  const trainerForm = root.querySelector("#trainer-register-form");
  const registerForms = { owner: registerForm, member: memberForm, trainer: trainerForm };

  root.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      root.querySelectorAll("[data-auth-tab]").forEach((tab) => tab.classList.remove("active"));
      button.classList.add("active");
      const isLogin = button.dataset.authTab === "login";
      loginForm.classList.toggle("hidden", !isLogin);
      registerPanel.classList.toggle("hidden", isLogin);
      clearAuthMessages(root);
    });
  });

  // Owner / member / trainer registration sub-toggle.
  root.querySelectorAll("[data-register-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      root.querySelectorAll("[data-register-mode]").forEach((tab) => tab.classList.remove("active"));
      button.classList.add("active");
      const mode = button.dataset.registerMode;
      Object.entries(registerForms).forEach(([key, form]) => form.classList.toggle("hidden", key !== mode));
      clearAuthMessages(root);
    });
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await run(root, context, async () => {
      const data = Object.fromEntries(new FormData(loginForm).entries());
      let username = String(data.email || "").trim();
      const digitsOnly = username.replace(/\D/g, "");
      if (digitsOnly.length >= 10 && !username.includes("@")) {
        username = `${digitsOnly.slice(-10)}@gymflow.app`;
      }
      await context.services.auth.login(username, data.password);
      context.onToast("Welcome back.");
    });
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await run(root, context, async () => {
      const data = Object.fromEntries(new FormData(registerForm).entries());
      if (data.password !== data.confirmPassword) {
        throw new Error("Passwords do not match.");
      }
      await context.services.auth.registerOwner(data);
      context.onToast("Owner account created.");
    });
  });

  memberForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await run(root, context, async () => {
      const data = Object.fromEntries(new FormData(memberForm).entries());
      if (data.password !== data.confirmPassword) {
        throw new Error("Passwords do not match.");
      }
      let emailVal = String(data.email || "").trim();
      const digitsOnly = emailVal.replace(/\D/g, "");
      if (digitsOnly.length >= 10 && !emailVal.includes("@")) {
        data.email = `${digitsOnly.slice(-10)}@gymflow.app`;
      }
      await context.services.auth.registerMember(data);
      context.onToast("Welcome! Your gym membership is set up.");
    });
  });

  trainerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await run(root, context, async () => {
      const data = Object.fromEntries(new FormData(trainerForm).entries());
      if (data.password !== data.confirmPassword) {
        throw new Error("Passwords do not match.");
      }
      await context.services.auth.registerTrainer(data);
      context.onToast("Welcome! Your trainer profile is set up.");
    });
  });

  root.querySelector("[data-action='demo']")?.addEventListener("click", async () => {
    await run(root, context, async () => {
      await context.services.auth.useDemo();
      context.onToast("Demo workspace loaded.");
    });
  });

  root.querySelector("[data-action='guest']")?.addEventListener("click", async () => {
    await run(root, context, async () => {
      if (typeof context.onGuestLogin === "function") {
        await context.onGuestLogin();
      }
    });
  });

  root.querySelector("[data-action='reset-password']")?.addEventListener("click", async () => {
    const email = loginForm.email.value;
    if (!email) {
      authMessage(root, "Enter your email first.", "error");
      return;
    }
    await run(root, context, async () => {
      await context.services.auth.resetPassword(email);
      const msg = context.mode === "firebase" ? "Password reset email sent." : "Local account found. Use its saved password.";
      authMessage(root, msg, "success");
      authToast(root, msg);
    });
  });

  // Bind toggle password visibility buttons
  root.querySelectorAll(".toggle-password-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.previousElementSibling;
      if (input && (input.type === "password" || input.type === "text")) {
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        btn.querySelector(".material-symbols-outlined").textContent = isPassword ? "visibility_off" : "visibility";
      }
    });
  });
}

async function run(root, context, action) {
  clearAuthMessages(root);
  try {
    await action();
  } catch (error) {
    authMessage(root, error.message || "Something went wrong.", "error");
  }
}

// Lightweight toast shown on the auth screen (the global one lives in the app shell).
function authToast(root, message) {
  const toast = root.querySelector("[data-auth-toast]");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(authToast.timer);
  authToast.timer = setTimeout(() => toast.classList.remove("show"), 2800);
}
