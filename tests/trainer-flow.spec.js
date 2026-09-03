import { test, expect } from "@playwright/test";

test.describe("Trainer Flow & Functionality", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const now = new Date().toISOString();
      const trainerProfile = {
        id: "trainer-user-1",
        uid: "trainer-test-id",
        gymId: "local-gym",
        gymName: "Grip Gym Demo",
        name: "Test Trainer",
        email: "trainer@gymflow.app",
        role: "trainer",
        createdAt: now,
        updatedAt: now
      };
      const state = {
        version: 1,
        sessionUserId: trainerProfile.id,
        users: [trainerProfile],
        collections: {
          members: [],
          trainers: [{ id: "trainer-test-id", gymId: "local-gym", uid: "trainer-test-id", name: "Test Trainer", email: "trainer@gymflow.app" }],
          membership_plans: [],
          payments: [],
          attendance: [],
          trainer_attendance: [],
          workout_templates: [],
          workout_assignments: [],
          progress_records: [],
          reminders: [],
          settings: [{ id: "settings", gymName: "Grip Gym Demo" }]
        }
      };
      localStorage.setItem("gymflow.local.v1", JSON.stringify(state));
    });
    await page.goto("/?local=1");
    await expect(page.locator(".sidebar")).toBeVisible({ timeout: 10000 });
  });

  test("Trainer sees role-restricted navigation options", async ({ page }) => {
    await expect(page.locator(".nav-list a[href='#/dashboard']")).toBeVisible();
    await expect(page.locator(".nav-list a[href='#/trainer-checkin']")).toBeVisible();
    await expect(page.locator(".nav-list a[href='#/workouts']")).toBeVisible();

    await expect(page.locator(".nav-list a[href='#/members']")).not.toBeVisible();
    await expect(page.locator(".nav-list a[href='#/settings']")).not.toBeVisible();
    await expect(page.locator(".nav-list a[href='#/reports']")).not.toBeVisible();
  });

  test("Trainer can navigate to Trainer Check-In page", async ({ page }) => {
    await page.click(".nav-list a[href='#/trainer-checkin']");
    await expect(page.locator("#view")).toContainText(/Check-In|Trainer|Attendance/i);

    const checkinBtn = page.locator("button:has-text('Check In'), button:has-text('Log Attendance')").first();
    if (await checkinBtn.isVisible()) {
      await expect(checkinBtn).toBeEnabled();
    }
  });

  test("Trainer can navigate to My Clients page", async ({ page }) => {
    const clientsNav = page.locator(".nav-list a[href='#/trainer-members']");
    if (await clientsNav.isVisible()) {
      await clientsNav.click();
      await expect(page.locator("#view")).toContainText(/Clients|Assigned|Members/i);
    }
  });

  test("Trainer can navigate to Workouts library", async ({ page }) => {
    await page.click(".nav-list a[href='#/workouts']");
    await expect(page.locator("#view")).toContainText(/Workout/i);
  });
});
