---
phase: 08-member-portal-v2
plan: 01
status: complete
commit: 6f077ee
files_changed:
  - modules/members.js
  - styles/main.css
---

## What was built

Added an **Initial Measurements** section to the Add Member form. When a new member is admitted, the gym owner can optionally record body composition baseline: Weight (kg), Height (cm), BMI (auto-calculated), Body Fat %, Waist (cm), and Chest (cm).

## Changes

### `modules/members.js`
- `calcBmi(weightKg, heightCm)` — pure helper. Computes `w / h²`, returns `""` on missing/invalid input.
- Form HTML — new `<div class="form-section-heading">` + 6 labelled inputs (`initWeight`, `initHeight`, `initBmi`, `initBodyFat`, `initWaist`, `initChest`) inserted after Emergency Contact, before the Save button row.
- `bind()` — `updateBmi()` defined in bind scope; wired to `input` events on weight and height fields. Called after pre-filling an existing member's fields in the edit handler.
- Submit handler — `isNew` flag captured before save. If new and any measurement is non-empty, a `progress_records` document is auto-created and applied to client state, seeding the progress chart from Day 1. Height is stored only on the member doc; not duplicated into the progress record.

### `styles/main.css`
- `.form-section-heading` — spans both grid columns; uppercase label style with top border separator.
- `.optional-tag` — lighter weight/opacity for the "(optional)" annotation.
- `input[readonly]` — subtle `background: var(--surface-alt)` to signal non-editable.

## Verification

- [x] Six measurement inputs render in the Add Member form under "INITIAL MEASUREMENTS (optional)"
- [x] Typing weight + height auto-fills BMI (read-only); clearing either field clears BMI
- [x] Saving a new member with measurements creates a `progress_records` entry (visible in Progress module)
- [x] Saving a new member without measurements does NOT create a progress record
- [x] Editing an existing member with saved measurements pre-fills all six fields
- [x] Re-saving an existing member does NOT create a duplicate progress record
- [x] `form.reset()` clears all six measurement inputs
