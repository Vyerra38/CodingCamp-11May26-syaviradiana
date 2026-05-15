# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a fully client-side single-page application using plain HTML, CSS, and Vanilla JavaScript. The app is delivered as exactly three files (`index.html`, `css/style.css`, `js/script.js`), uses Chart.js 4.x from CDN, and persists all data in `localStorage`. Tasks follow the unidirectional data-flow architecture defined in the design: state mutations always call `render()`, and `formatCurrency()` is the single monetary display point.

Property-based tests use [fast-check](https://github.com/dubzzz/fast-check) run via Vitest (or Jest). Each property test sub-task references the corresponding property number from the design document.

---

## Tasks

- [x] 1. Set up project file structure and HTML skeleton
  - Create `index.html` with semantic HTML5 boilerplate, Chart.js 4.x CDN `<script>` tag, and `<link>` to `css/style.css` and `<script defer>` to `js/script.js`
  - Create `css/style.css` as an empty file with a CSS custom-properties block for the color tokens (pastel green `#A8D5A2`, pastel orange `#FFB347`, beige `#F5E6C8`, background, card surface)
  - Create `js/script.js` with the top-level section comments (State, Storage, Validation, Formatters, Mutations, Renderers, Event Listeners) and the `appState` object skeleton
  - Add all five UI region containers to `index.html`: `#balance-card`, `#expense-form`, `#transaction-list`, `#spending-chart` (with `<canvas>`), `#monthly-summary` (with `#month-selector`)
  - Add the `#currency-toggle` button/checkbox element to `index.html`
  - _Requirements: 9.1, 9.2, 9.5_

- [x] 2. Implement state management and localStorage layer
  - [x] 2.1 Implement `appState` object, `loadState()`, `saveTransactions()`, and `saveCurrency()`
    - `loadState()` reads `localStorage["transactions"]` (JSON parse, fallback to `[]` on failure) and `localStorage["activeCurrency"]` (fallback to `"USD"`)
    - Wrap all `localStorage` access in `try/catch`; on load failure initialize empty state silently
    - `saveTransactions(transactions)` serializes and writes the array; `saveCurrency(currency)` writes the string
    - Call `loadState()` at script startup before any render
    - _Requirements: 7.1, 7.2, 7.4, 7.5, 7.6, 7.7_

  - [ ]* 2.2 Write property test for transaction persistence round-trip (Property 1)
    - **Property 1: Transaction persistence round-trip**
    - Generate arbitrary valid transactions (random `itemName` ≤ 100 chars, positive `amount` ≤ 2dp, random category, UUID `id`, ISO timestamp)
    - Assert `JSON.parse(JSON.stringify(transactions))` produces an array with identical field values
    - **Validates: Requirements 1.2, 7.1, 7.4**

  - [ ]* 2.3 Write property test for malformed localStorage entries being skipped (Property 15)
    - **Property 15: Malformed localStorage entries are skipped; valid entries are always loaded**
    - Generate arrays mixing valid transaction objects and malformed entries (missing fields, wrong types, non-objects)
    - Assert `loadState()` loads all valid entries and skips malformed ones without throwing
    - **Validates: Requirements 7.8**

  - [ ]* 2.4 Write property test for active currency preference persisting across reloads (Property 14)
    - **Property 14: Active currency preference persists across simulated page reloads**
    - Alternate between `"USD"` and `"IDR"`, call `saveCurrency()`, then call `loadState()`, assert `appState.activeCurrency` equals the saved value
    - **Validates: Requirements 6.5, 7.5, 7.6**

- [x] 3. Implement shared currency formatter and validation
  - [x] 3.1 Implement `formatCurrency(usdAmount, currency)`
    - USD: `Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 })`
    - IDR: multiply by 16 000, then `Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 })`
    - This is the only location where currency arithmetic and formatting occur
    - _Requirements: 3.4, 6.2, 6.4, 9.3_

  - [ ]* 3.2 Write property test for `formatCurrency` as single conversion point (Property 6)
    - **Property 6: `formatCurrency` is the single conversion point**
    - Generate arbitrary positive amounts; assert USD output matches `$X,XXX.XX` pattern and IDR output matches `Rp X.XXX` pattern
    - **Validates: Requirements 3.4, 6.3, 6.4, 9.3**

  - [x] 3.3 Implement `validateForm(formData)`
    - Validate `itemName`: non-empty after trim, ≤ 100 chars
    - Validate `amount`: numeric, > 0, ≤ 2 decimal places (use regex or `Number.isFinite` + decimal check)
    - Validate `category`: one of `"Food"`, `"Transport"`, `"Fun"`
    - Return an object with field-level error messages, or `null` if all valid
    - _Requirements: 1.1, 1.5, 1.6, 1.7_

  - [ ]* 3.4 Write property test for whitespace-only and empty item names being rejected (Property 3)
    - **Property 3: Whitespace-only and empty item names are rejected**
    - Generate strings composed entirely of whitespace characters (spaces, tabs, newlines) and the empty string
    - Assert `validateForm({ itemName: ws, amount: "5", category: "Food" })` returns a non-null error object
    - **Validates: Requirements 1.5**

  - [ ]* 3.5 Write property test for invalid amounts being rejected (Property 4)
    - **Property 4: Invalid amounts are rejected**
    - Generate values: 0, negatives, floats with > 2 decimal places, `NaN`, non-numeric strings
    - Assert `validateForm({ itemName: "x", amount: bad, category: "Food" })` returns a non-null error object
    - **Validates: Requirements 1.6**

- [x] 4. Implement mutation functions and balance calculation
  - [x] 4.1 Implement `addTransaction(data)` and `deleteTransaction(id)`
    - `addTransaction`: generate UUID via `crypto.randomUUID()`, create transaction object, push to `appState.transactions`, call `saveTransactions()`; on storage failure show non-blocking toast but keep in-memory state
    - `deleteTransaction`: find transaction by `id`, attempt `saveTransactions()` first; only remove from `appState.transactions` if storage write succeeds; on failure retain card and show error message
    - _Requirements: 1.2, 2.4, 7.1, 7.2_

  - [x] 4.2 Implement `calculateBalance(transactions)`
    - Return the arithmetic sum of all `amount` fields; return `0` for an empty array
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [ ]* 4.3 Write property test for balance equaling sum of all transaction amounts (Property 2)
    - **Property 2: Balance equals sum of all transaction amounts**
    - Generate arrays of 0–50 valid transactions with random positive amounts
    - Assert `calculateBalance(transactions)` equals `transactions.reduce((s, t) => s + t.amount, 0)`
    - **Validates: Requirements 1.3, 2.5, 3.2, 3.3**

  - [ ]* 4.4 Write property test for delete removing transaction from both state and storage (Property 7)
    - **Property 7: Delete removes transaction from both in-memory state and storage**
    - Generate a non-empty transactions array, pick a random `id`, call `deleteTransaction(id)`, assert the `id` is absent from `appState.transactions` and from `JSON.parse(localStorage["transactions"])`
    - **Validates: Requirements 2.4, 7.2**

  - [ ]* 4.5 Write property test for currency conversion being render-only (Property 5)
    - **Property 5: Currency conversion is render-only — USD stored, IDR computed**
    - Generate transactions, call `saveTransactions()`, parse stored JSON, assert every `amount` field equals the original USD value (no IDR multiplication stored)
    - **Validates: Requirements 6.2, 6.6**

- [ ] 5. Implement renderers: Balance, Transaction List, and Currency Toggle
  - [ ] 5.1 Implement `renderBalance()`
    - Read `appState.transactions` and `appState.activeCurrency`
    - Display `formatCurrency(calculateBalance(transactions), activeCurrency)` in `#balance-card`
    - Show `$0.00` / `Rp 0` when no transactions exist
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 5.2 Implement `renderList()`
    - Sort transactions by `createdAt` descending (newest first)
    - For each transaction render a `.transaction-card` with item name, `formatCurrency(amount, activeCurrency)`, category badge (`badge--food` / `badge--transport` / `badge--fun`), and a delete `<button data-id="{id}">`
    - Show `.empty-msg` paragraph when no transactions exist
    - Use a single delegated `click` listener on `#transaction-list` for delete buttons
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7, 2.8_

  - [ ]* 5.3 Write property test for transaction list rendered in reverse chronological order (Property 12)
    - **Property 12: Transaction list is always rendered in reverse chronological order**
    - Generate transactions with random `createdAt` timestamps, call `renderList()`, inspect the rendered card order in the DOM, assert cards appear newest-first
    - **Validates: Requirements 2.1**

  - [ ]* 5.4 Write property test for category badge CSS class matching transaction category (Property 13)
    - **Property 13: Category badge CSS class matches the transaction's category**
    - Generate transactions with random categories, call `renderList()`, assert each card's badge element has `badge--food`, `badge--transport`, or `badge--fun` matching the transaction's `category` field
    - **Validates: Requirements 2.8**

  - [x] 5.5 Implement currency toggle event handler
    - On toggle: flip `appState.activeCurrency` between `"USD"` and `"IDR"`, call `saveCurrency()` (silent on failure), call `render()`
    - All monetary values must update within 300ms
    - _Requirements: 6.1, 6.3, 6.5, 6.7_

- [x] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement pie chart renderer
  - [x] 7.1 Implement `renderChart()`
    - Aggregate `appState.transactions` by category; compute totals for Food, Transport, Fun
    - Exclude categories with zero total from the chart data
    - If no transactions exist, hide the `<canvas>` and show a placeholder message; otherwise show the canvas
    - Create the Chart.js instance once (stored in a module-level variable); on subsequent renders update `chart.data` and call `chart.update()` to avoid flicker
    - Segment colors: Food `#A8D5A2`, Transport `#FFB347`, Fun `#F5E6C8`
    - Legend labels: `"{Category}: {formatCurrency(total, activeCurrency)}"`
    - Add a static fallback message if Chart.js CDN fails to load
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 7.2 Write property test for chart segments corresponding to categories with positive totals (Property 9)
    - **Property 9: Chart segments correspond exactly to categories with positive totals**
    - Generate transactions with varying category distributions (including cases where one or more categories have zero total)
    - Call `renderChart()`, inspect the Chart.js instance's `data.datasets[0].data`, assert a segment exists if and only if the category total > 0
    - **Validates: Requirements 4.1, 4.3, 4.6**

- [x] 8. Implement monthly summary renderer
  - [x] 8.1 Implement `getAvailableMonths(transactions)`
    - Derive month strings from transaction `createdAt` values using `Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" })`
    - Always include the current calendar month
    - Deduplicate and sort chronologically
    - _Requirements: 5.1_

  - [ ]* 8.2 Write property test for month selector containing no duplicates and always including the current month (Property 10)
    - **Property 10: Month selector contains no duplicates and always includes the current month**
    - Generate transactions with random dates across multiple months
    - Assert `getAvailableMonths(transactions)` has no duplicate strings and always contains the current calendar month
    - **Validates: Requirements 5.1**

  - [x] 8.3 Implement `renderMonthSelector()`
    - Populate `#month-selector` with options from `getAvailableMonths()`
    - Preserve the currently selected month across re-renders if it still exists in the list
    - _Requirements: 5.1, 5.3_

  - [x] 8.4 Implement `renderSummary(selectedMonth)`
    - Filter `appState.transactions` to the selected month
    - Compute: total expenses (sum of amounts), transaction count, highest spending category (alphabetical tiebreak on tie), average amount (total / count, rounded to 2dp)
    - Format all monetary values via `formatCurrency()`
    - Show zero values and "no data" message when no transactions exist for the selected month
    - _Requirements: 5.2, 5.3, 5.4, 5.5_

  - [ ]* 8.5 Write property test for monthly summary statistics being consistent with filtered transactions (Property 8)
    - **Property 8: Monthly summary statistics are consistent with filtered transactions**
    - Generate transactions across multiple months, pick a random month, call `renderSummary()`
    - Assert `total = sum(amounts for that month)`, `count = number of transactions for that month`, `average = total / count` rounded to 2dp, and highest category is the one with the greatest total (alphabetical tiebreak)
    - **Validates: Requirements 5.2, 5.3**

- [x] 9. Implement top-level `render()` and form submission
  - [x] 9.1 Implement top-level `render()`
    - Call `renderBalance()`, `renderList()`, `renderChart()`, `renderMonthSelector()`, `renderSummary(currentSelectedMonth)` in sequence
    - All UI regions must update within the timing budgets: Balance/Chart/Summary ≤ 500ms, currency toggle ≤ 300ms
    - _Requirements: 1.3, 2.5, 3.2, 3.3, 4.3, 5.3, 6.3_

  - [x] 9.2 Implement form submit event handler
    - On submit: collect field values, call `validateForm()`
    - On validation failure: display inline `<span class="error-msg">` beneath each failing field; do not mutate state
    - On validation success: call `addTransaction(data)`, call `render()`, reset all three form fields to default state
    - Clear all error messages at the start of each submit attempt
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ]* 9.3 Write property test for form fields resetting after every successful submission (Property 11)
    - **Property 11: Form fields reset to default state after every successful submission**
    - Generate valid form inputs, simulate form submission, assert `#item-name` value is `""`, `#amount` value is `""`, and `#category` is reset to its default placeholder
    - **Validates: Requirements 1.4**

- [x] 10. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Apply CSS styling, responsive layout, and visual design
  - [x] 11.1 Style the global layout and color theme
    - Apply CSS custom properties for pastel green, pastel orange, beige, background, and card surface colors
    - Set a light/soft page background; card content areas visually distinct from background
    - Apply `border-radius` and `box-shadow` to all interactive cards and buttons
    - Apply `transition: all 300ms` (or less) to hover states on cards and buttons
    - _Requirements: 8.2, 8.3, 8.4_

  - [x] 11.2 Implement responsive layout (320px–1440px)
    - Use CSS Grid or Flexbox for the dashboard layout; no horizontal scroll at any viewport width in the 320px–1440px range
    - Monthly summary: single column below 600px, multi-column at 600px and above
    - Transaction list: scrollable container that does not affect page layout
    - _Requirements: 5.4, 8.1, 2.2_

  - [x] 11.3 Style the Input Form, Balance card, Transaction cards, and Currency toggle
    - Balance card: pastel green background, prominent typography
    - Transaction cards: hover visual change (e.g., shadow lift or background shift)
    - Category badges: `badge--food` pastel green, `badge--transport` pastel orange, `badge--fun` light beige; include text label alongside color
    - Currency toggle: clearly styled as an interactive control with visible focus style
    - Form error messages: inline beneath each field, visually distinct (e.g., red text)
    - _Requirements: 2.3, 2.8, 3.1, 8.2, 8.4_

  - [x] 11.4 Add accessibility attributes
    - Associate all form `<input>` and `<select>` elements with `<label>` elements
    - Link error message `<span>` elements to their inputs via `aria-describedby`
    - Ensure all interactive elements (buttons, toggle) are keyboard-focusable with visible focus styles
    - _Requirements: 9.4_

- [ ] 12. Wire everything together and validate end-to-end behavior
  - [x] 12.1 Call `loadState()` and `render()` on `DOMContentLoaded`
    - Ensure the app reads `localStorage` and renders all five UI regions before accepting user input
    - Verify no uncaught JavaScript errors on initial load
    - _Requirements: 7.4, 7.5, 9.4_

  - [ ] 12.2 Verify cross-browser compatibility and no-server constraint
    - Confirm `index.html` opens directly in a browser (no build tool or server required)
    - Confirm no polyfills or transpilation are used
    - Confirm Chart.js is loaded exclusively from CDN (no local copy)
    - _Requirements: 9.1, 9.2, 9.4, 9.5_

  - [ ]* 12.3 Write unit tests for example-based scenarios
    - Form renders with correct initial state (all fields empty/default)
    - Submitting a valid form adds exactly one transaction to the list
    - Deleting the only transaction shows the empty-state message
    - Currency toggle switches display from USD to IDR format
    - Monthly summary shows "no data" message when no transactions exist for selected month
    - Balance displays `$0.00` (USD) or `Rp 0` (IDR) when no transactions exist
    - Chart shows placeholder when no transactions exist
    - Malformed `localStorage` entry is skipped; valid entries still load
    - _Requirements: 1.2, 2.4, 2.7, 3.5, 4.5, 5.5, 6.1, 7.7, 7.8_

- [ ] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All monetary display goes through `formatCurrency(usdAmount, activeCurrency)` — no renderer performs its own currency arithmetic
- All `localStorage` access is wrapped in `try/catch`; the app degrades silently on storage failure except for delete failures (which retain the card and show an error)
- Property tests use fast-check with a minimum of 100 iterations each; tag format: `// Feature: expense-budget-visualizer, Property {N}: {property_text}`
- The Chart.js instance is created once and updated via `chart.update()` on re-renders to avoid flicker
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical milestones

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "3.1", "3.3"] },
    { "id": 1, "tasks": ["2.2", "2.3", "2.4", "3.2", "3.4", "3.5", "4.1", "4.2"] },
    { "id": 2, "tasks": ["4.3", "4.4", "4.5", "5.1", "5.2", "7.1", "8.1"] },
    { "id": 3, "tasks": ["5.3", "5.4", "5.5", "7.2", "8.2", "8.3", "8.4"] },
    { "id": 4, "tasks": ["8.5", "9.1", "9.2"] },
    { "id": 5, "tasks": ["9.3", "11.1", "11.2", "11.3", "11.4"] },
    { "id": 6, "tasks": ["12.1", "12.2"] },
    { "id": 7, "tasks": ["12.3"] }
  ]
}
```
