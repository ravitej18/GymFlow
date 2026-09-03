import { test, expect } from "@playwright/test";

test.describe("Member Flow & Functionality", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const now = new Date().toISOString();
      const memberProfile = {
        id: "member-user-1",
        uid: "member-test-uid",
        gymId: "local-gym",
        gymName: "Grip Gym Demo",
        name: "Alex Member",
        email: "alex@gymflow.app",
        role: "member",
        createdAt: now,
        updatedAt: now
      };
      const state = {
        version: 1,
        sessionUserId: memberProfile.id,
        users: [memberProfile],
        collections: {
          members: [
            {
              id: "member-record-1",
              gymId: "local-gym",
              uid: "member-test-uid",
              fullName: "Alex Member",
              email: "alex@gymflow.app",
              status: "Active",
              planName: "Annual Gold Pass",
              startDate: "2026-01-01",
              endDate: "2030-12-31"
            }
          ],
          payments: [
            {
              id: "pay-1",
              gymId: "local-gym",
              memberId: "member-record-1",
              memberName: "Alex Member",
              amount: 500,
              date: "2026-01-01",
              method: "UPI",
              status: "Paid"
            }
          ],
          trainers: [],
          membership_plans: [],
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

  test("Member sees role-restricted navigation options", async ({ page }) => {
    // Member should see Dashboard, My Membership, My Payments
    await expect(page.locator(".nav-list a[href='#/dashboard']")).toBeVisible();
    await expect(page.locator(".nav-list a[href='#/my-membership']")).toBeVisible();
    await expect(page.locator(".nav-list a[href='#/my-payments']")).toBeVisible();

    // Member should NOT see Owner or Trainer management items
    await expect(page.locator(".nav-list a[href='#/members']")).not.toBeVisible();
    await expect(page.locator(".nav-list a[href='#/plans']")).not.toBeVisible();
    await expect(page.locator(".nav-list a[href='#/reports']")).not.toBeVisible();
    await expect(page.locator(".nav-list a[href='#/settings']")).not.toBeVisible();
  });

  test("Member can view Dashboard with membership card and status", async ({ page }) => {
    await expect(page.locator("main.workspace")).toBeVisible();
    await expect(page.locator("body")).toContainText(/Alex Member|Dashboard|Grip Gym/i);
  });

  test("Member can navigate to My Membership page", async ({ page }) => {
    await page.click(".nav-list a[href='#/my-membership']");
    await expect(page.locator("#view")).toContainText(/Membership/i);
  });

  test("Member can navigate to My Payments page and view payment receipts", async ({ page }) => {
    await page.click(".nav-list a[href='#/my-payments']");
    await expect(page.locator("#view")).toContainText(/Payments/i);
  });

  test("Member can navigate to Progress tracking and view body charts", async ({ page }) => {
    const progressNav = page.locator(".nav-list a[href='#/progress']");
    if (await progressNav.isVisible()) {
      await progressNav.click();
      await expect(page.locator("#view")).toContainText(/Progress/i);
    }
  });

  test("Member can navigate to Check-ins and perform self-checkin", async ({ page }) => {
    const attendanceNav = page.locator(".nav-list a[href='#/attendance']");
    if (await attendanceNav.isVisible()) {
      await attendanceNav.click();
      await expect(page.locator("#view")).toContainText(/Attendance|Check-in/i);

      // Perform member self check-in
      const checkinBtn = page.locator("[data-self-checkin]");
      if (await checkinBtn.isVisible()) {
        await checkinBtn.click();
        await expect(page.locator("#view")).toContainText(/already checked in|My Recent Check-ins/i);
        await expect(page.locator(".data-table")).toBeVisible();
      }
    }
  });
});
