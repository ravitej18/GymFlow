# Phase 10.1 — Research

## Codebase Facts

### Affected files (only two — very tight scope)
| File | Why it changes |
|---|---|
| `modules/members.js` | All form HTML and bind() logic lives here |
| `styles/main.css` | All CSS additions (BMI meter, dup-warn, checkbox) |

No new Firestore collections are needed. Firestore is schemaless — adding fields to the members document requires zero rule changes.

### `formData(form)` behaviour (utils.js L92)
```js
export function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}
```
- Collects ALL named form inputs
- **Unchecked checkboxes are NOT included** → `payload.whatsappOptIn` will be `undefined` when unchecked
- Required transform in submit handler: `payload.whatsappOptIn = payload.whatsappOptIn === "true"`

### Edit pre-fill pattern (members.js ~L237)
```js
Object.entries(member).forEach(([key, value]) => {
  if (form.elements[key]) form.elements[key].value = value || "";
});
updateBmi();
```
- All new `<input>`, `<select>`, `<textarea>` fields with matching `name` attributes populate automatically — **no extra edit code needed** for regular fields
- **Exception:** `whatsappOptIn` (checkbox) — `.value` setter does not change `.checked`. Must handle explicitly: `form.elements.whatsappOptIn.checked = !!member.whatsappOptIn`

### `updateBmi()` current shape (members.js ~L196)
```js
function updateBmi() {
  const val = calcBmi(form.initWeight.value, form.initHeight.value);
  form.initBmi.value = val;          // ← write to number input
  const cat = bmiCategory(val, form.gender.value);
  if (bmiLabel) {
    bmiLabel.textContent = cat ? cat.label : "";
    bmiLabel.style.color = cat ? cat.color : "";
  }
}
```
- Plan 02 replaces `form.initBmi` (number input) with `data-bmi-hidden` (hidden input) and rewrites this function

### Measurements save block (members.js ~L213)
```js
const measurements = {
  weight:  payload.initWeight  || "",
  bmi:     payload.initBmi     || "",
  bodyFat: payload.initBodyFat || "",
  waist:   payload.initWaist   || "",
  chest:   payload.initChest   || ""
};
```
Plan 01 adds `hip`, `bicep`, `thigh` here.

### CSS grid layout facts (main.css L633)
```css
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
label.wide, .form-grid > .wide { grid-column: 1 / -1; }
.form-section-heading { grid-column: 1 / -1; /* section divider */ }
.hidden { display: none !important; }
```
- BMI meter wrapper uses `.wide` (full-width) class
- Dup-warn `<span>` lives inside the label — no need for `.wide`

### BMI zone math (WHO Asian/Indian thresholds)
Bar spans 10–40 (30 unit range). Flex proportions:
| Zone | Range | Units | CSS flex |
|---|---|---|---|
| Underweight | 10–18.5 | 8.5 | 8.5 |
| Healthy | 18.5–22.9 | 4.4 | 4.4 |
| Overweight | 22.9–25 | 2.1 | 2.1 |
| Obese I | 25–30 | 5 | 5 |
| Obese II | 30–35 | 5 | 5 |
| Obese III | 35–40+ | 5 | 5 |

Cursor %: `(bmi - 10) / 30 * 100` clamped 0–100.

### Duplicate detection — data source
`context.data.members` is already loaded in memory inside `bind(root, context)`. Client-side scan is O(n) over ~hundreds of members — acceptable, zero extra Firestore reads.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `emergencyContact` existing data broken | New fields are additive; old field kept in document. Edit handler fills `emergencyName` from `emergencyContact` as fallback. |
| Hidden input for `initBmi` not picked up by `formData()` | `FormData` includes hidden inputs — confirmed via spec |
| `whatsappOptIn` checkbox not saving `false` | Explicit `=== "true"` coercion in submit handler |
| BMI meter renders incorrectly on edit | `updateBmi()` call at end of edit pre-fill redraws meter from loaded weight+height |
