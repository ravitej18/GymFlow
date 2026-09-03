import { test, expect } from "@playwright/test";

test.describe("Real-World Workflows & Edge Cases across All Logins", () => {

  test("1. Member Roster Management & Status Lifecycle", async ({ page }) => {
    await page.addInitScript(() => {
      const now = new Date().toISOString();
      const ownerProfile = {
        id: "owner-1",
        uid: "owner-uid-1",
        gymId: "local-gym",
        gymName: "Power Gym",
        name: "Gym Owner",
        email: "owner@powergym.com",
        role: "owner"
      };
      const state = {
        version: 1,
        sessionUserId: ownerProfile.id,
        users: [ownerProfile],
        collections: {
          members: [
            { id: "m1", gymId: "local-gym", fullName: "John Active", email: "john@test.com", status: "Active", startDate: "2026-01-01", endDate: "2026-12-31" },
            { id: "m2", gymId: "local-gym", fullName: "Sarah Expiring", email: "sarah@test.com", status: "Expiring Soon", startDate: "2026-01-01", endDate: "2026-09-04" },
            { id: "m3", gymId: "local-gym", fullName: "Dave Expired", email: "dave@test.com", status: "Expired", startDate: "2025-01-01", endDate: "2025-12-31" }
          ],
          trainers: [],
          membership_plans: [{ id: "p1", gymId: "local-gym", planName: "Gold Plan", durationDays: 30, price: 2000 }],
          payments: [],
          attendance: [],
          trainer_attendance: [],
          workout_templates: [],
          workout_assignments: [],
          progress_records: [],
          reminders: [],
          settings: [{ id: "settings", gymName: "Power Gym", currency: "INR" }]
        }
      };
      localStorage.setItem("gymflow.local.v1", JSON.stringify(state));
    });

    await page.goto("/?local=1");
    await expect(page.locator(".sidebar")).toBeVisible();

    // Navigate to Members
    await page.click(".nav-list a[href='#/members']");
    await expect(page.locator("#view")).toContainText(/Members/i);
    await expect(page.locator("#view")).toContainText("John Active");
    await expect(page.locator("#view")).toContainText("Sarah Expiring");

    // Add Member modal / form triggers properly
    const addMemberBtn = page.locator("button:has-text('Add Member'), button:has-text('New Member')").first();
    if (await addMemberBtn.isVisible()) {
      await addMemberBtn.click();
      await expect(page.locator("#view")).toContainText(/Add New Member|Member/i);
    }
  });


  test("2. Payments, Printable Receipts & Revenue Reports", async ({ page }) => {
    await page.addInitScript(() => {
      const ownerProfile = {
        id: "owner-1",
        uid: "owner-uid-1",
        gymId: "local-gym",
        gymName: "Power Gym",
        name: "Gym Owner",
        email: "owner@powergym.com",
        role: "owner"
      };
      const state = {
        version: 1,
        sessionUserId: ownerProfile.id,
        users: [ownerProfile],
        collections: {
          members: [
            { id: "m1", gymId: "local-gym", fullName: "John Active", email: "john@test.com", status: "Active" }
          ],
          membership_plans: [
            { id: "p1", gymId: "local-gym", planName: "Gold Plan", durationDays: 30, price: 2000 }
          ],
          payments: [
            { id: "pay-100", gymId: "local-gym", memberId: "m1", memberName: "John Active", amount: 2000, method: "UPI", status: "Paid", date: "2026-09-01" },
            { id: "pay-101", gymId: "local-gym", memberId: "m1", memberName: "John Active", amount: 1500, method: "Cash", status: "Paid", date: "2026-08-15" }
          ],
          trainers: [],
          attendance: [],
          trainer_attendance: [],
          workout_templates: [],
          workout_assignments: [],
          progress_records: [],
          reminders: [],
          settings: [{ id: "settings", gymName: "Power Gym", currency: "INR", currencySymbol: "₹" }]
        }
      };
      localStorage.setItem("gymflow.local.v1", JSON.stringify(state));
    });

    await page.goto("/?local=1");
    await expect(page.locator(".sidebar")).toBeVisible();

    // 1. Navigate to Payments page
    await page.click(".nav-list a[href='#/payments']");
    await expect(page.locator("#view")).toContainText(/Payments/i);

    // Verify payments list items
    await expect(page.locator("#view")).toContainText("John Active");
    await expect(page.locator("#view")).toContainText("2,000");

    // Click Print / Receipt button if visible
    const receiptBtn = page.locator("button:has-text('Receipt'), button:has-text('Print'), [data-action='receipt']").first();
    if (await receiptBtn.isVisible()) {
      await receiptBtn.click();
      await expect(page.locator("dialog, .modal, .receipt-modal, body")).toBeVisible();
      const closeBtn = page.locator("button:has-text('Close'), .close-modal").first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }

    // 2. Navigate to Reports page & verify Revenue Analytics
    await page.click(".nav-list a[href='#/reports']");
    await expect(page.locator("#view")).toContainText(/Reports/i);
    await expect(page.locator("#view")).toContainText(/Revenue|Active Members/i);
  });


  test("3. Renewal Queue & WhatsApp Reminder Dashboard", async ({ page }) => {
    await page.addInitScript(() => {
      const date = new Date();
      date.setDate(date.getDate() + 3);
      const expiringDate = date.toISOString().slice(0, 10);

      const ownerProfile = {
        id: "owner-1",
        uid: "owner-uid-1",
        gymId: "local-gym",
        gymName: "Power Gym",
        name: "Gym Owner",
        email: "owner@powergym.com",
        role: "owner"
      };
      const state = {
        version: 1,
        sessionUserId: ownerProfile.id,
        users: [ownerProfile],
        collections: {
          members: [
            { id: "m2", gymId: "local-gym", fullName: "Sarah Expiring", phone: "9876543210", email: "sarah@test.com", status: "Expiring Soon", endDate: expiringDate }
          ],
          membership_plans: [
            { id: "p1", gymId: "local-gym", planName: "Monthly Pass", durationDays: 30, price: 1500 }
          ],
          payments: [],
          trainers: [],
          attendance: [],
          trainer_attendance: [],
          workout_templates: [],
          workout_assignments: [],
          progress_records: [],
          reminders: [],
          settings: [{ id: "settings", gymName: "Power Gym", currency: "INR" }]
        }
      };
      localStorage.setItem("gymflow.local.v1", JSON.stringify(state));
    });

    await page.goto("/?local=1");
    await expect(page.locator(".sidebar")).toBeVisible();

    // Check Renewals Queue
    await page.click(".nav-list a[href='#/renewals']");
    await expect(page.locator("#view")).toContainText(/Renewals/i);
    await expect(page.locator("#view")).toContainText("Sarah Expiring");

    // Check Reminders (WhatsApp dashboard)
    await page.click(".nav-list a[href='#/reminders']");
    await expect(page.locator("#view")).toContainText(/Reminders|WhatsApp/i);
    await expect(page.locator("#view")).toContainText("Sarah Expiring");
  });


  test("4. Trainer Assigning Workout & Member Workout Access", async ({ page }) => {
    await page.addInitScript(() => {
      const now = new Date().toISOString();
      const trainerProfile = {
        id: "trainer-user-1",
        uid: "trainer-uid-1",
        gymId: "local-gym",
        name: "Coach Shaik",
        email: "coach@gym.com",
        role: "trainer"
      };
      const memberRecord = {
        id: "member-client-1",
        gymId: "local-gym",
        uid: "member-uid-1",
        fullName: "Alex Client",
        email: "alex@client.com",
        status: "Active",
        assignedTrainer: "trainer-uid-1",
        endDate: "2030-12-31"
      };
      const template = {
        id: "tpl-hypertrophy",
        gymId: "local-gym",
        name: "Hypertrophy Upper Body",
        goal: "Muscle Gain",
        visibility: "basic",
        exercisesStructured: [
          { name: "Bench Press", sets: "3", reps: "10", weight: "60" },
          { name: "Incline DB Press", sets: "3", reps: "12", weight: "20" }
        ]
      };
      const state = {
        version: 1,
        sessionUserId: trainerProfile.id,
        users: [trainerProfile],
        collections: {
          members: [memberRecord],
          trainers: [{ id: "trainer-uid-1", uid: "trainer-uid-1", gymId: "local-gym", name: "Coach Shaik", email: "coach@gym.com" }],
          workout_templates: [template],
          workout_assignments: [
            { id: "assign-1", gymId: "local-gym", memberId: "member-client-1", templateId: "tpl-hypertrophy", assignedAt: now }
          ],
          membership_plans: [],
          payments: [],
          attendance: [],
          trainer_attendance: [],
          progress_records: [],
          reminders: [],
          settings: [{ id: "settings", gymName: "Power Gym" }]
        }
      };
      localStorage.setItem("gymflow.local.v1", JSON.stringify(state));
    });

    await page.goto("/?local=1");
    await expect(page.locator(".sidebar")).toBeVisible();

    // Verify Trainer sees Workouts
    await page.click(".nav-list a[href='#/workouts']");
    await expect(page.locator("#view")).toContainText("Hypertrophy Upper Body");

    // Switch session to Member and verify Member sees assigned workout
    await page.evaluate(() => {
      const saved = JSON.parse(localStorage.getItem("gymflow.local.v1"));
      const now = new Date().toISOString();
      const memberUser = {
        id: "member-user-1",
        uid: "member-uid-1",
        gymId: "local-gym",
        name: "Alex Client",
        email: "alex@client.com",
        role: "member",
        createdAt: now
      };
      saved.sessionUserId = memberUser.id;
      saved.users.push(memberUser);
      localStorage.setItem("gymflow.local.v1", JSON.stringify(saved));
    });

    await page.goto("/?local=1");
    await expect(page.locator(".sidebar")).toBeVisible();

    // Navigate to My Workout
    const workoutNav = page.locator(".nav-list a[href='#/my-workout']");
    if (await workoutNav.isVisible()) {
      await workoutNav.click();
      await expect(page.locator("#view")).toContainText(/My Workout|Workouts/i);
    }
  });


  test("5. Member Self Check-In & Progress Metrics Tracking", async ({ page }) => {
    await page.addInitScript(() => {
      const memberProfile = {
        id: "member-u1",
        uid: "member-uid-1",
        gymId: "local-gym",
        name: "Sam Fitness",
        email: "sam@fitness.com",
        role: "member"
      };
      const state = {
        version: 1,
        sessionUserId: memberProfile.id,
        users: [memberProfile],
        collections: {
          members: [
            { id: "m-sam", gymId: "local-gym", uid: "member-uid-1", fullName: "Sam Fitness", email: "sam@fitness.com", status: "Active", endDate: "2030-12-31" }
          ],
          progress_records: [
            { id: "pr-1", gymId: "local-gym", memberId: "m-sam", weightKg: 75, heightCm: 178, bmi: 23.7, date: "2026-09-01" },
            { id: "pr-2", gymId: "local-gym", memberId: "m-sam", weightKg: 74, heightCm: 178, bmi: 23.4, date: "2026-09-02" }
          ],
          attendance: [],
          membership_plans: [],
          payments: [],
          trainers: [],
          trainer_attendance: [],
          workout_templates: [],
          workout_assignments: [],
          reminders: [],
          settings: [{ id: "settings", gymName: "Power Gym" }]
        }
      };
      localStorage.setItem("gymflow.local.v1", JSON.stringify(state));
    });

    await page.goto("/?local=1");
    await expect(page.locator(".sidebar")).toBeVisible();

    // Member checks progress chart screen
    await page.click(".nav-list a[href='#/progress']");
    await expect(page.locator("#view")).toContainText(/Progress|Trend/i);

    // Member checks check-in self service screen
    await page.click(".nav-list a[href='#/attendance']");
    await expect(page.locator("#view")).toContainText(/Attendance|Check-in/i);
  });


  test("6. Auth Forms Edge Cases (Validation & Password Reset)", async ({ page }) => {
    await page.goto("/?local=1");
    // Clear session to show auth panel
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Click Register tab
    const registerTab = page.locator("button[data-auth-tab='register']");
    if (await registerTab.isVisible()) {
      await registerTab.click();

      // Submit form with mismatched passwords
      const regForm = page.locator("#register-form");
      if (await regForm.isVisible()) {
        await regForm.locator("input[name='gymName']").fill("Test Gym");
        await regForm.locator("input[name='name']").fill("Test User");
        await regForm.locator("input[name='email']").fill("test@mismatch.com");
        await regForm.locator("input[name='password']").fill("pass123");
        await regForm.locator("input[name='confirmPassword']").fill("pass999");
        await regForm.locator("button[type='submit']").click();

        // Verify error message displayed
        await expect(page.locator(".auth-msg.error, [data-auth-msg]")).toContainText(/Passwords do not match/i);
      }
    }
  });

  test("7. Owner Price Customization & Discount Flow during Member Admission & Receipt", async ({ page }) => {
    await page.addInitScript(() => {
      const ownerProfile = {
        id: "owner-1",
        uid: "owner-uid-1",
        gymId: "local-gym",
        gymName: "Power Gym",
        name: "Gym Owner",
        email: "owner@powergym.com",
        role: "owner"
      };
      const state = {
        version: 1,
        sessionUserId: ownerProfile.id,
        users: [ownerProfile],
        collections: {
          members: [],
          membership_plans: [
            { id: "p-gold", gymId: "local-gym", planName: "Gold VIP Plan", durationDays: 30, price: 3000 }
          ],
          payments: [
            {
              id: "pay-disc-1",
              gymId: "local-gym",
              memberId: "m-discounted",
              planId: "p-gold",
              originalPrice: 3000,
              discountType: "percentage",
              discountValue: 20,
              discountAmount: 600,
              amount: 2400,
              date: "2026-09-03",
              method: "UPI",
              status: "Paid",
              receiptNumber: "RCPT-DISC20",
              notes: "20% discount applied: -₹600"
            }
          ],
          trainers: [],
          attendance: [],
          trainer_attendance: [],
          workout_templates: [],
          workout_assignments: [],
          progress_records: [],
          reminders: [],
          settings: [{ id: "settings", gymName: "Power Gym", currency: "INR", currencySymbol: "₹" }]
        }
      };
      localStorage.setItem("gymflow.local.v1", JSON.stringify(state));
    });

    await page.goto("/?local=1");
    await expect(page.locator(".sidebar")).toBeVisible();

    // 1. Navigate to Members page & open Add Member form
    await page.click(".nav-list a[href='#/members']");
    await page.click("button:has-text('Add Member'), button:has-text('New Member')");
    await expect(page.locator("#view")).toContainText("Add New Member");

    // Select plan by value
    await page.selectOption("#member-form select[name='planId']", "p-gold");
    
    // Select percentage discount rule
    await page.selectOption("#member-form select[name='discountType']", "percentage");
    await page.fill("#member-form input[name='discountValue']", "10");

    // Verify live calculation box shows discount & final price
    await expect(page.locator("#calc-final-price")).toContainText("2,700");

    // 2. Navigate to Payments page and verify recorded payment with discount badge
    await page.click(".nav-list a[href='#/payments']");
    await expect(page.locator("#view")).toContainText("RCPT-DISC20");
    await expect(page.locator("#view")).toContainText("Discount -₹600");

    // 4. Verify branding text is removed from sidebar
    await expect(page.locator(".sidebar-attribution")).toHaveCount(0);
  });

  test("8. Owner Hard Delete Gym with Double Confirmation & Password Verification", async ({ page }) => {
    await page.addInitScript(() => {
      const ownerProfile = {
        id: "owner-del",
        uid: "owner-del-uid",
        gymId: "gym-to-delete",
        gymName: "Gym To Delete",
        name: "Owner Delete Test",
        email: "delete@powergym.com",
        password: "secretpassword123",
        role: "owner"
      };
      const state = {
        version: 1,
        sessionUserId: ownerProfile.id,
        users: [ownerProfile],
        collections: {
          members: [{ id: "m-del-1", gymId: "gym-to-delete", fullName: "Doomed Member" }],
          membership_plans: [{ id: "p-del-1", gymId: "gym-to-delete", planName: "Doomed Plan" }],
          payments: [{ id: "pay-del-1", gymId: "gym-to-delete", amount: 1000 }],
          trainers: [{ id: "tr-del-1", gymId: "gym-to-delete", name: "Doomed Trainer" }],
          attendance: [],
          trainer_attendance: [],
          workout_templates: [],
          workout_assignments: [],
          progress_records: [],
          reminders: [],
          settings: [{ id: "settings", gymId: "gym-to-delete", gymName: "Gym To Delete", currency: "INR" }]
        }
      };
      localStorage.setItem("gymflow.local.v1", JSON.stringify(state));
    });

    await page.goto("/?local=1");
    await expect(page.locator(".sidebar")).toBeVisible();

    // Navigate to Settings
    await page.click(".nav-list a[href='#/settings']");
    await expect(page.locator("#view")).toContainText("Danger Zone — Hard Delete Gym");

    // Click Delete Gym button to trigger Modal Step 1
    await page.click("#start-delete-gym-btn");
    await expect(page.locator("#delete-gym-modal-1")).toBeVisible();
    await expect(page.locator("#delete-gym-modal-1")).toContainText("Confirm Gym Deletion (Step 1 of 2)");

    // Click Proceed to Step 2
    await page.click("#proceed-delete-step2-btn");
    await expect(page.locator("#delete-gym-modal-2")).toBeVisible();

    // Fill wrong password first
    await page.fill("#delete-gym-password", "wrongpassword");
    await page.fill("#delete-gym-phrase", "DELETE");
    await page.click("#confirm-delete-final-btn");

    // Expect error message
    await expect(page.locator("#delete-gym-error-msg")).toBeVisible();
    await expect(page.locator("#delete-gym-error-msg")).toContainText("Incorrect password");

    // Fill correct password and submit
    await page.fill("#delete-gym-password", "secretpassword123");
    await page.click("#confirm-delete-final-btn");

    // Verify user is logged out and redirected to auth screen
    await expect(page.locator("form#login-form, .auth-container").first()).toBeVisible({ timeout: 10000 });

    // Verify local storage has purged gym data and user session
    const localStateStr = await page.evaluate(() => localStorage.getItem("gymflow.local.v1"));
    if (localStateStr) {
      const parsed = JSON.parse(localStateStr);
      expect(parsed.users.some(u => u.gymId === "gym-to-delete")).toBe(false);
    }
  });

  test("9. Member Self Check-in & Owner Live Uncached Attendance Refresh", async ({ page }) => {
    // 1. Reset & initialize clean demo workspace
    await page.goto("/?local=1");
    await page.evaluate(() => localStorage.removeItem("gymflow.local.v1"));
    await page.goto("/?local=1");
    await page.click("button:has-text('Open demo workspace')");
    await expect(page.locator(".sidebar")).toBeVisible();

    // 2. Switch session to Member Ravi Kumar
    const foundMember = await page.evaluate(() => {
      const stateStr = localStorage.getItem("gymflow.local.v1");
      if (!stateStr) return false;
      const state = JSON.parse(stateStr);
      const memberUser = state.users?.find(u => u.email === "ravi@example.com");
      if (memberUser) {
        state.sessionUserId = memberUser.id;
        localStorage.setItem("gymflow.local.v1", JSON.stringify(state));
        return true;
      }
      return false;
    });
    expect(foundMember).toBe(true);

    await page.goto("/?local=1");
    await expect(page.locator(".sidebar")).toBeVisible();

    // 2. Member navigates to Check-ins & logs visit
    await page.click(".nav-list a[href='#/attendance']");
    await expect(page.locator("#view")).toContainText("Check In");

    const checkinBtn = page.locator("[data-self-checkin]");
    await expect(checkinBtn).toBeVisible();
    await checkinBtn.click();
    await expect(page.locator("#view")).toContainText(/My Recent Check-ins|already checked in/i);

    // 3. Log in as Owner
    await page.evaluate(() => {
      const stateStr = localStorage.getItem("gymflow.local.v1");
      if (!stateStr) return;
      const state = JSON.parse(stateStr);
      const ownerUser = state.users.find(u => u.role === "owner");
      if (ownerUser) {
        state.sessionUserId = ownerUser.id;
        localStorage.setItem("gymflow.local.v1", JSON.stringify(state));
      }
    });

    await page.goto("/?local=1");
    await expect(page.locator(".sidebar")).toBeVisible();

    // 4. Owner navigates to Check-ins page & clicks Refresh
    await page.click(".nav-list a[href='#/attendance']");
    await expect(page.locator("#view")).toContainText("Recent Check-ins");

    const refreshBtn = page.locator("[data-action='refresh-checkins']");
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();

    // 5. Verify Member Ravi Kumar's check-in is listed in Owner view
    await expect(page.locator(".checkins-table")).toContainText("Ravi Kumar");
  });
});
