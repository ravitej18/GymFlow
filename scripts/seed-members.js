import { createServices } from "../lib/firebase-init.js";

const services = await createServices(window.GYM_CONFIG || {});

await services.auth.useDemo();

const members = [
  {
    fullName: "Sample Member",
    mobile: "+91 90000 20001",
    email: "member@example.com",
    gender: "Not specified",
    joinDate: new Date().toISOString().slice(0, 10),
    status: "Active"
  }
];

for (const member of members) {
  await services.data.save("members", member);
}

console.info("Sample members seeded.");
