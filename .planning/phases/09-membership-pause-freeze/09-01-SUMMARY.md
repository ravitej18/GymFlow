---
phase: 09-membership-pause-freeze
plan: 01
status: complete
commit: 307b7f4
files_changed:
  - modules/utils.js
  - lib/firebase-init.js
  - app.js
  - firestore.rules
  - modules/settings.js
  - modules/dashboard.js
  - modules/renewals.js
---

## What was built

Full data-layer infrastructure for the Membership Pause & Freeze feature.

## Changes

### `modules/utils.js`
- Added `membershipPauses: "membership_pauses"` to the `collections` export
- `memberStatus()` now returns `"Paused"` for members with `status === "Paused"`, inserted between Pending and Suspended checks

### `lib/firebase-init.js`
- Added `"membership_pauses"` to the `COLLECTIONS` array (localStorage demo mode)

### `app.js`
- Added `"membership_pauses"` to `collectionNames` so `data.membership_pauses` is loaded into app state at boot

### `firestore.rules`
- Explicit `match /membership_pauses/{docId}` block: owner create/update/delete, same-gym read

### `modules/settings.js`
- New "Membership Pause Limits" panel with `maxPausesPerYear` (default 2) and `maxPauseDays` (default 30) inputs
- Submit handler saves both fields to gym_settings doc via `saveSettings()`

### `modules/dashboard.js`
- `const paused = members.filter(m => memberStatus(m) === "Paused").length`
- "Paused Members" KPI metric added to the metric grid

### `modules/renewals.js`
- Renewal queue `watched` filter now excludes `computedStatus === "Paused"` members

## Verification

- [x] `collections.membershipPauses === "membership_pauses"`
- [x] `memberStatus({ status: "Paused" }) === "Paused"`
- [x] `lib/firebase-init.js` COLLECTIONS includes `"membership_pauses"`
- [x] `app.js` collectionNames includes `"membership_pauses"`
- [x] Firestore rules has explicit `match /membership_pauses/` block
- [x] Settings page renders "Membership Pause Limits" panel
- [x] Dashboard metric grid includes "Paused Members"
- [x] Paused members absent from renewal queue
