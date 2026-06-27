---
phase: 09-membership-pause-freeze
plan: 02
status: complete
commit: acd0c46
files_changed:
  - modules/members.js
---

## What was built

Pause / Resume controls on the Members page. Gym owners can freeze a membership inline
with a simple form, auto-extending the member's endDate. Early resume refunds unused days.

## Changes

### `modules/members.js`

**render():**
- "Paused" added to the status filter dropdown in the member directory
- Hidden `#pause-form` panel inserted between the member form and the member directory
  - Dual-mode form: pause mode shows pauseStart + returnDate + reason; resume mode shows actualReturn
  - `data-pause-heading`, `data-pause-member-name`, `data-pause-submit` refs for JS control

**`row()` function:**
- Active / Expiring Soon rows: `pause_circle` icon button (`data-pause-member`)
- Paused rows: `play_circle` icon button (`data-resume-member`)
- Pending rows: still show `check_circle` approve button as before

**`bind()` function — `showPausePanel(mode)` helper:**
- Toggles visibility of `#pause-fields` / `#resume-fields`, updates heading and submit label

**Pause click handler:**
- Pre-fills memberId + today's date; calls `showPausePanel("pause")`

**Resume click handler:**
- Looks up the active pause record for the member; pre-fills actualReturn=today

**Cancel handler:** hides and resets the form

**Pause submit (mode="pause"):**
1. Validates `maxPausesPerYear` — counts pauses this calendar year from `data.membership_pauses`
2. Validates `maxPauseDays` — checks duration days
3. Saves `membership_pauses` record (`status: "active"`)
4. Updates member: `status = "Paused"`, `endDate += durationDays`

**Resume submit (mode="resume"):**
1. Calculates `unusedDays = returnDate - actualReturn` (0 if on time or late)
2. Marks pause record `status: "resumed"`, stores `actualReturn`
3. Updates member: `status = ""` (recomputes to Active/Expiring/Expired), `endDate -= unusedDays`
4. Toast mentions refunded days if any

## Verification

- [x] Active / Expiring Soon member rows show pause_circle button
- [x] Paused member rows show play_circle button
- [x] Clicking Pause reveals form with today pre-filled; Cancel hides it
- [x] Clicking Resume reveals resume form with today pre-filled
- [x] Pause: creates membership_pauses record, member status=Paused, endDate extended
- [x] Resume on time: clears status, endDate unchanged
- [x] Resume early: clears status, endDate -= unused days, toast confirms refund
- [x] Exceeding maxPausesPerYear: toast, no record
- [x] Exceeding maxPauseDays: toast, no record
- [x] "Paused" visible in status filter dropdown
