# Accessibility Fixes — WCAG 2.1 AA
## Commit f376f55 — 25 May 2026

These changes were made to pass a full axe DevTools audit (WCAG 2.1 AA).
**Do not revert any of these changes.** Run a full axe scan after any major UI work to catch regressions.

---

## Rule: What to never do going forward
- Never add an icon-only button or link without an `aria-label`
- Never add a form input or select without an associated `<label>` or `aria-label`
- Never add an empty `<th>` without `aria-label="..."` or `scope`
- Never use a colour lighter than `#696863` for body/muted text on white or near-white backgrounds
- Never make a tap target smaller than 44×44px on mobile

---

## 1. `app/globals.css`

**What changed:** Darkened the `--text-muted` CSS variable.

```css
/* Before */
--text-muted: #888780;  /* failed contrast — 3.59:1 on white */

/* After */
--text-muted: #696863;  /* passes — 5.57:1 on white, 5.10:1 on #F5F4F2 */
```

**Why it matters:** This single change fixed 182 colour contrast violations across the entire app. Every component that uses `text-text-muted` (secondary labels, captions, helper text) was failing WCAG AA. Now they all pass.

**Impact:** Muted text is very slightly darker. Most users won't notice. Actually improves readability.

---

## 2. `components/ui/input.tsx`

**What changed:** The `FloatingFieldShell` and `Field` wrapper components now auto-generate unique IDs and wire `htmlFor` on the label to the input's `id`.

**Before:** Labels and inputs had no programmatic association — screen readers couldn't tell which label belonged to which field.

**After:** Every input/select wrapped in `Field` or `FloatingFieldShell` automatically gets:
- A unique `id` (generated via React's `useId()`, or uses existing `id` if provided)
- A `<label>` with `htmlFor` pointing to that `id`

**Why it matters:** Fixed 12 label violations and 2 select-name violations in one place. Because this is a shared component, every form in the app is now covered — no need to add labels individually to each page.

**What your partner needs to know:** Any new form input added inside `Field` or `FloatingFieldShell` will automatically be labelled correctly. You only need to manually add `aria-label` to inputs that sit outside these wrappers.

---

## 3. `components/sidebar.tsx`

**What changed:** Added `aria-label="Notifications"` to the notifications icon link.

```tsx
/* Before */
<Link href="/notifications">
  <Bell />
</Link>

/* After */
<Link href="/notifications" aria-label="Notifications">
  <Bell />
</Link>
```

**Rule going forward:** Every icon-only `<Link>` must have `aria-label`.

---

## 4. `components/slide-over.tsx`

**What changed:** Added `aria-label="Close"` to both close button variants.

```tsx
/* Before */
<button onClick={onClose}>
  <X />
</button>

/* After */
<button onClick={onClose} aria-label="Close">
  <X />
</button>
```

There are two variants of the close button in this component — both were fixed.

**Rule going forward:** Every icon-only `<button>` must have `aria-label`.

---

## 5. `components/tax-qa-chat.tsx`

**What changed:** Added minimum touch target size to the floating chat button.

```tsx
/* Before */
<button className="...existing classes...">

/* After */
<button className="...existing classes... min-w-[44px] min-h-[44px]">
```

**Why it matters:** WCAG 2.5.5 requires tap targets to be at least 44×44px on mobile. The button was smaller than this.

**Rule going forward:** Any floating action button or small icon button used on mobile must have `min-w-[44px] min-h-[44px]`.

---

## 6. `app/(dashboard)/clients/page.tsx`
## 7. `app/(dashboard)/expenses/page.tsx`
## 8. `app/(dashboard)/invoices/page.tsx`
## 9. `app/(dashboard)/mileage/page.tsx`

**What changed:** Added `aria-label="Actions"` to the empty `<th>` in the actions column of each table.

```tsx
/* Before */
<th className="..."></th>

/* After */
<th className="..." aria-label="Actions"></th>
```

Also in `mileage/page.tsx` — the delete row button got `aria-label="Delete entry"`:

```tsx
/* Before */
<button onClick={() => deleteEntry(id)}>
  <Trash />
</button>

/* After */
<button onClick={() => deleteEntry(id)} aria-label="Delete entry">
  <Trash />
</button>
```

**Rule going forward:** Every `<th>` must have visible text or `aria-label`. Every icon-only action button in a table must have `aria-label`.

---

## 10. `app/(dashboard)/projects/page.tsx`
## 11. `app/(dashboard)/quotes/page.tsx`

**What changed:** Added aria-labels to select-all and per-row select controls.

```tsx
/* Select-all th */
<th aria-label="Select" className="...">

/* Select-all button */
<button aria-label={allSelected ? 'Deselect all' : 'Select all'}>

/* Per-row select button */
<button aria-label={isSelected ? 'Deselect' : 'Select'}>

/* Actions th */
<th aria-label="Actions" className="...">
```

**Why dynamic labels matter:** When the state changes (all selected vs none selected), the aria-label updates too — screen readers announce the correct action.

---

## Summary table

| File | What was fixed | Rule violated |
|---|---|---|
| `app/globals.css` | Darkened `--text-muted` | colour-contrast |
| `components/ui/input.tsx` | Auto-wire label↔input IDs | label, select-name |
| `components/sidebar.tsx` | aria-label on notifications link | link-name |
| `components/slide-over.tsx` | aria-label on close buttons | button-name |
| `components/tax-qa-chat.tsx` | 44×44px min touch target | target-size |
| `clients/page.tsx` | aria-label on empty th | empty-table-header |
| `expenses/page.tsx` | aria-label on empty th | empty-table-header |
| `invoices/page.tsx` | aria-label on empty th | empty-table-header |
| `mileage/page.tsx` | aria-label on empty th + delete button | empty-table-header, button-name |
| `projects/page.tsx` | aria-labels on select controls | button-name, empty-table-header |
| `quotes/page.tsx` | aria-labels on select controls | button-name, empty-table-header |

---

## How to check your work going forward

After any significant UI change, run a quick axe scan:
1. Open Chrome → go to the page you changed
2. Open DevTools (F12) → axe DevTools tab
3. Click Full page scan
4. Fix any Critical or Serious issues before merging to main

Takes 5 minutes per page. Catches regressions before they reach users.
