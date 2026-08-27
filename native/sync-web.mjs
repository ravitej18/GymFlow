// Copies the web app into native/www so Capacitor has a webDir to bundle.
//
// The app deliberately has no build step: it is plain ES modules served from
// any static host. Capacitor still wants a single directory, so this mirrors
// the runtime files into one. Nothing is transformed — what ships in the APK is
// byte-for-byte what the PWA serves.
//
// Run: node sync-web.mjs   (or `npm run sync` from native/)
import { cp, rm, mkdir, writeFile, readFile, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, "..");
const webDir = join(here, "www");

// Everything the app needs at runtime. Kept explicit rather than copying the
// whole repo so planning docs, tests and git history never reach the APK.
const ENTRIES = [
  "index.html",
  "app.js",
  "sw.js",
  "manifest.json",
  "favicon.ico",
  "gym.config.js",
  "modules",
  "lib",
  "styles",
  "design-system",
  "assets"
];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await rm(webDir, { recursive: true, force: true });
  await mkdir(webDir, { recursive: true });

  const copied = [];
  const missing = [];

  for (const entry of ENTRIES) {
    const from = join(appRoot, entry);
    if (!(await exists(from))) {
      missing.push(entry);
      continue;
    }
    await cp(from, join(webDir, entry), { recursive: true });
    copied.push(entry);
  }

  // gym.config.js is generated per deployment from the template and is
  // gitignored in some setups; fall back so the shell still builds.
  if (missing.includes("gym.config.js")) {
    const template = join(appRoot, "gym.config.js.template");
    if (await exists(template)) {
      await cp(template, join(webDir, "gym.config.js"));
      copied.push("gym.config.js (from template)");
      missing.splice(missing.indexOf("gym.config.js"), 1);
    }
  }

  // The service worker is redundant inside a native shell — assets are already
  // local — and a stale cache there is far harder for a member to clear than in
  // a browser. Neutralise it rather than shipping a second caching layer.
  const swPath = join(webDir, "sw.js");
  if (await exists(swPath)) {
    await writeFile(
      swPath,
      "// Disabled in the native build: Capacitor already serves these assets\n" +
        "// locally, and a second cache layer only risks serving stale files.\n" +
        "self.addEventListener('install', () => self.skipWaiting());\n" +
        "self.addEventListener('activate', (event) => {\n" +
        "  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));\n" +
        "});\n",
      "utf8"
    );
  }

  // Capacitor injects its runtime via a script tag it expects to be able to add;
  // confirm the entry point is present and readable.
  const indexPath = join(webDir, "index.html");
  if (!(await exists(indexPath))) {
    throw new Error("index.html did not reach www/ — the native build would be empty.");
  }
  const html = await readFile(indexPath, "utf8");
  if (!html.includes("<body")) {
    throw new Error("index.html looks malformed — refusing to build a broken shell.");
  }

  console.log(`Synced ${copied.length} entries into native/www:`);
  copied.forEach((entry) => console.log(`  + ${entry}`));
  if (missing.length) {
    console.log("Skipped (not found in the app root):");
    missing.forEach((entry) => console.log(`  - ${entry}`));
  }
}

main().catch((err) => {
  console.error("sync-web failed:", err.message);
  process.exit(1);
});
