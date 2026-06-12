import { createServices } from "../lib/firebase-init.js";

const services = await createServices(window.GYM_CONFIG || {});

if (services.mode !== "local") {
  throw new Error("This browser seed helper is intended for local demo mode.");
}

await services.auth.useDemo();
console.info("GymFlow demo workspace is ready.");
