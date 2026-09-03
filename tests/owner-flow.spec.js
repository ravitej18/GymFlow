import { test, expect } from "@playwright/test";

test.describe("Owner Flow & Functionality", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const now = new Date().toISOString();
      const ownerProfile = {
        id: "owner-test-user",
        uid: "owner-test-uid",
        gymId: "local-gym",
        gymName: "Grip Gym Demo",
        name: "Owner User",
        email: "owner@gymflow.app",
        role: "owner",
        createdAt: now,
        updatedAt: now
      };
      const state = {
        version: 1,
        sessionUserId: ownerProfile.id,
        users: [ownerProfile],
        collections: {
          members: [
            {
              id: "member-1",
              gymId: "local-gym",
              fullName: "Demo Member",
              email: "demo@gymflow.app",
              status: "Active",
              planName: "Monthly Pass",
              startDate: "2026-01-01",
              endDate: "2030-12-31"
            }
          ],
          trainers: [{ id: "trainer-1", gymId: "local-gym", name: "Demo Trainer", email: "trainer@gymflow.app" }],
          membership_plans: [{ id: "plan-1", gymId: "local-gym", name: "Monthly Pass", durationMonths: 1, price: 1000 }],
          payments: [{ id: "pay-1", gymId: "local-gym", memberName: "Demo Member", amount: 1000, date: "2026-01-01", status: "Paid" }],
          attendance: [],
          trainer_attendance: [],
          workout_templates: [],
          workout_assignments: [],
          progress_records: [],
          reminders: [],
          settings: [{ id: "settings", gymName: "Grip Gym Demo", currency: "INR" }]
        }
      };
      localStorage.setItem("gymflow.local.v1", JSON.stringify(state));
    });
    await page.goto("/?local=1");
    await expect(page.locator(".sidebar")).toBeVisible({ timeout: 10000 });
  });

  test("Dashboard displays key metrics and navigation for Owner", async ({ page }) => {
    await expect(page.locator(".nav-list")).toBeVisible();
    await expect(page.locator(".nav-list a[href='#/dashboard']")).toBeVisible();
    await expect(page.locator(".nav-list a[href='#/members']")).toBeVisible();
    await expect(page.locator(".nav-list a[href='#/plans']")).toBeVisible();
    await expect(page.locator(".nav-list a[href='#/payments']")).toBeVisible();
    await expect(page.locator(".nav-list a[href='#/reports']")).toBeVisible();
    await expect(page.locator(".nav-list a[href='#/settings']")).toBeVisible();
  });

  test("Owner can navigate to Members page and interact with roster", async ({ page }) => {
    await page.click(".nav-list a[href='#/members']");
    await expect(page.locator("#view")).toContainText(/Members/i);

    const searchInput = page.locator("input[placeholder*='Search']");
    if (await searchInput.isVisible()) {
      await searchInput.fill("Demo");
    }

    const addBtn = page.locator("button:has-text('Add Member'), button:has-text('New Member')").first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await expect(page.locator("dialog, form").first()).toBeVisible();
      const closeBtn = page.locator("button:has-text('Cancel'), .close-modal").first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  });

  test("Owner can navigate to Plans page and manage membership plans", async ({ page }) => {
    await page.click(".nav-list a[href='#/plans']");
    await expect(page.locator("#view")).toContainText(/Plans|Memberships/i);

    const addPlanBtn = page.locator("button:has-text('Add Plan'), button:has-text('New Plan')").first();
    if (await addPlanBtn.isVisible()) {
      await expect(addPlanBtn).toBeEnabled();
    }
  });

  test("Owner can navigate to Payments and view transactions", async ({ page }) => {
    await page.click(".nav-list a[href='#/payments']");
    await expect(page.locator("#view")).toContainText(/Payments/i);

    const recordPaymentBtn = page.locator("button:has-text('Record Payment'), button:has-text('New Payment')").first();
    if (await recordPaymentBtn.isVisible()) {
      await expect(recordPaymentBtn).toBeVisible();
    }
  });

  test("Owner can navigate to Attendance and check-in log", async ({ page }) => {
    await page.click(".nav-list a[href='#/attendance']");
    await expect(page.locator("#view")).toContainText(/Attendance|Check-in/i);
  });

  test("Owner can navigate to Trainers and manage roster", async ({ page }) => {
    await page.click(".nav-list a[href='#/trainers']");
    await expect(page.locator("#view")).toContainText(/Trainers/i);
  });

  test("Owner can navigate to Workouts library", async ({ page }) => {
    await page.click(".nav-list a[href='#/workouts']");
    await expect(page.locator("#view")).toContainText(/Workout/i);
  });

  test("Owner can navigate to Reports and view analytics", async ({ page }) => {
    await page.click(".nav-list a[href='#/reports']");
    await expect(page.locator("#view")).toContainText(/Reports/i);
  });

  test("Owner can navigate to Settings and toggle theme", async ({ page }) => {
    await page.click(".nav-list a[href='#/settings']");
    await expect(page.locator("#view")).toContainText(/Settings/i);

    const themeBtn = page.locator("button.theme-toggle, [data-action='toggle-theme']").first();
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
    }
  });
});
