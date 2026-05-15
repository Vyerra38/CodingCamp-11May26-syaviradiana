# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses, visualize spending by category, review monthly summaries, and toggle between USD and Indonesian Rupiah (IDR) currencies. The application is built with HTML, CSS, and Vanilla JavaScript only — no backend server, no frameworks. All data is persisted in the browser's Local Storage. The interface follows a modern finance dashboard aesthetic with a pastel green and pastel orange color theme.

## Glossary

- **App**: The Expense & Budget Visualizer single-page web application.
- **Transaction**: A single expense entry consisting of an item name, amount, and category.
- **Category**: One of three predefined expense classifications: Food, Transport, or Fun.
- **Balance**: The running total of all transaction amounts stored in Local Storage, displayed in the active currency.
- **Chart**: The pie chart rendered via Chart.js (loaded from CDN) that visualizes spending by category.
- **Monthly_Summary**: The dashboard section that aggregates transaction data for a user-selected month.
- **Currency_Converter**: The toggle mechanism that switches all displayed monetary values between USD and IDR using a fixed exchange rate.
- **Local_Storage**: The browser's Web Storage API used to persist all transaction data and user preferences client-side.
- **Input_Form**: The HTML form containing the Item Name, Amount, and Category fields used to add new transactions.
- **Transaction_List**: The scrollable UI section that displays all stored transactions as styled cards.
- **Active_Currency**: The currently selected currency (USD or IDR), persisted in Local_Storage.

---

## Requirements

### Requirement 1: Input Form

**User Story:** As a user, I want to enter expense details through a form, so that I can record new transactions quickly and accurately.

#### Acceptance Criteria

1. THE Input_Form SHALL contain three fields: Item Name (text, maximum 100 characters), Amount (numeric, positive, up to 2 decimal places), and Category (dropdown with exactly the options: Food, Transport, Fun).
2. WHEN the user submits the Input_Form with all fields filled, a non-empty Item Name of at most 100 characters, a positive numeric Amount greater than 0 and with at most 2 decimal places, and a selected Category, THE App SHALL add the Transaction to Local_Storage.
3. WHEN the user submits the Input_Form with all fields filled and a valid Amount, THE App SHALL update the Balance display and the Chart without a page reload.
4. WHEN the user submits the Input_Form successfully, THE App SHALL reset the Item Name field to empty, the Amount field to empty, and the Category dropdown to its default placeholder state.
5. IF the user submits the Input_Form with the Item Name field empty, THEN THE Input_Form SHALL display a validation error message on the Item Name field and SHALL NOT add a Transaction.
6. IF the user submits the Input_Form with the Amount field empty, zero, negative, or containing more than 2 decimal places, THEN THE Input_Form SHALL display a validation error message on the Amount field and SHALL NOT add a Transaction.
7. IF the user submits the Input_Form with no Category selected, THEN THE Input_Form SHALL display a validation error message on the Category field and SHALL NOT add a Transaction.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to see all my recorded expenses in a scrollable list, so that I can review and manage my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display all Transactions stored in Local_Storage in reverse chronological order (most recently added first), each showing the item name, amount formatted in the Active_Currency, and a colored category badge.
2. WHILE the Transaction_List contains more items than fit in the visible area, THE Transaction_List SHALL remain scrollable without affecting the rest of the page layout.
3. WHEN the user hovers over a Transaction card, THE Transaction_List SHALL apply a visible visual change to that card to indicate interactivity.
4. WHEN the user clicks the delete button on a Transaction card, THE App SHALL remove that Transaction from Local_Storage and remove the card from the Transaction_List without a page reload.
5. WHEN a Transaction is deleted, THE App SHALL update the Balance and the Chart to reflect the removal without a page reload.
6. IF a Local_Storage write fails during deletion, THE App SHALL retain the Transaction card in the list and display an error message to the user.
7. IF no Transactions exist in Local_Storage, THE Transaction_List SHALL display a message indicating that no transactions have been recorded yet.
8. THE Transaction_List SHALL render category badges using distinct colors: pastel green for Food, pastel orange for Transport, and light beige for Fun.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total spending balance prominently at the top of the page, so that I always know how much I have spent in total.

#### Acceptance Criteria

1. THE App SHALL display the Balance in a dedicated card section at the top of the dashboard, styled with a pastel green background to distinguish it from other sections.
2. WHEN a Transaction is added, THE App SHALL recalculate and update the Balance display within 500ms without a page reload.
3. WHEN a Transaction is deleted, THE App SHALL recalculate and update the Balance display within 500ms without a page reload.
4. THE App SHALL display the Balance formatted according to the Active_Currency: USD format as `$1,250.50` (en-US locale) and IDR format as `Rp 1.250.000` (id-ID locale).
5. IF no Transactions exist, THE App SHALL display the Balance as the zero value in the Active_Currency format (e.g., `$0.00` for USD or `Rp 0` for IDR).

---

### Requirement 4: Visual Chart

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going at a glance.

#### Acceptance Criteria

1. THE App SHALL render a pie chart that shows the proportion of total spending for each Category that has at least one Transaction.
2. THE Chart SHALL use pastel green for the Food segment, pastel orange for the Transport segment, and beige/cream for the Fun segment, consistently applied across all renders.
3. WHEN a Transaction is added or deleted, THE Chart SHALL update to reflect the new category totals within 500ms without a page reload.
4. THE Chart SHALL display each Category label and its corresponding total amount formatted in the Active_Currency in the chart legend.
5. IF no Transactions exist, THE Chart SHALL display a visible placeholder message indicating no spending data is available, and SHALL NOT render any pie segments.
6. IF a Category has a total spending amount of zero, THE Chart SHALL exclude that Category's segment from the pie chart.

---

### Requirement 5: Monthly Summary Section

**User Story:** As a user, I want to filter and review my expenses by month, so that I can track my spending patterns over time.

#### Acceptance Criteria

1. THE Monthly_Summary SHALL include a month selector dropdown that lists all months (formatted as "Month YYYY", e.g., "May 2026") for which at least one Transaction exists, plus the current calendar month, with no duplicate entries.
2. WHEN the user selects a month from the dropdown, THE Monthly_Summary SHALL display: total expenses for that month formatted to 2 decimal places in the Active_Currency, total transaction count for that month, the highest spending Category for that month (resolved alphabetically if two categories are tied), and the average transaction amount for that month rounded to 2 decimal places in the Active_Currency.
3. WHEN a Transaction is added or deleted, THE Monthly_Summary SHALL recalculate and update all displayed statistics for the currently selected month without a page reload.
4. THE Monthly_Summary SHALL be displayed in a card layout that renders as a single column on viewports narrower than 600px and as multiple columns on viewports 600px or wider.
5. IF no Transactions exist for the selected month, THE Monthly_Summary SHALL display zero values for all statistics and SHALL render a visible text element stating that no data is available for that month.

---

### Requirement 6: Currency Converter

**User Story:** As a user, I want to toggle between USD and Indonesian Rupiah, so that I can view my expenses in the currency most relevant to me.

#### Acceptance Criteria

1. THE Currency_Converter SHALL provide a toggle control that switches the Active_Currency between USD and IDR; on first load with no persisted preference, THE App SHALL default to USD.
2. THE Currency_Converter SHALL apply a fixed exchange rate of 1 USD = 16,000 IDR for all conversions.
3. WHEN the user activates the Currency_Converter toggle, THE App SHALL update all displayed monetary values — including the Balance, Transaction_List amounts, Monthly_Summary statistics, and Chart labels — within 300ms without a page reload.
4. THE App SHALL format USD values as `$1,250.50` using the en-US locale and IDR values as `Rp 1.250.000` using the id-ID locale.
5. THE App SHALL persist the Active_Currency selection in Local_Storage so that the user's currency preference is restored on the next page load.
6. THE App SHALL store all Transaction amounts as numeric USD values in Local_Storage and compute IDR display values by multiplying the stored USD amount by 16,000 only at render time; no IDR-converted values SHALL be written to Local_Storage.
7. IF Local_Storage is unavailable when persisting the Active_Currency preference, THE App SHALL continue to apply the selected currency for the current session without displaying an error to the user.

---

### Requirement 7: Data Persistence

**User Story:** As a user, I want my expense data and preferences to be saved automatically, so that my data is still available when I return to the app.

#### Acceptance Criteria

1. THE App SHALL save all Transactions to Local_Storage within 100ms of a Transaction being added.
2. THE App SHALL remove the corresponding Transaction entry from Local_Storage within 100ms of a Transaction being deleted.
3. THE App SHALL update the corresponding Transaction entry in Local_Storage within 100ms of a Transaction being modified.
4. WHEN the App loads, THE App SHALL read all Transactions from Local_Storage and render the Transaction_List, Balance, Chart, and Monthly_Summary with the persisted data before accepting user input.
5. THE App SHALL read and apply the persisted Active_Currency preference from Local_Storage before rendering any monetary values on page load.
6. THE App SHALL persist the Active_Currency preference to Local_Storage immediately when the user changes the Active_Currency.
7. IF Local_Storage is unavailable or the stored transactions value cannot be parsed as valid JSON, THEN THE App SHALL initialize with an empty Transaction list and default to USD as the Active_Currency.
8. IF a single Transaction entry in Local_Storage is malformed or cannot be parsed, THE App SHALL skip that entry and continue loading the remaining valid Transactions.

---

### Requirement 8: Responsive Layout and Visual Design

**User Story:** As a user, I want the app to look polished and work well on both desktop and mobile screens, so that I can use it on any device.

#### Acceptance Criteria

1. THE App SHALL implement a responsive layout that adapts to screen widths from 320px (mobile) to 1440px (desktop) without horizontal scrolling or content overflow.
2. THE App SHALL apply a visible border radius and a visible drop shadow to all interactive cards and buttons, and SHALL apply a CSS transition of 300ms or less to hover state changes on those elements.
3. THE App SHALL use a light or soft background color with card content areas that are visually distinct from the background, maintaining a clear visual hierarchy.
4. THE App SHALL use pastel green and pastel orange as the primary accent colors consistently across all UI sections, including the Balance card, buttons, badges, and chart segments.
5. THE App SHALL load and render the initial view in under 2 seconds on a network connection of at least 10 Mbps download speed, excluding Chart.js CDN load time.

---

### Requirement 9: File Structure and Technology Constraints

**User Story:** As a developer, I want the project to follow a strict minimal file structure, so that the codebase remains simple and maintainable.

#### Acceptance Criteria

1. THE App SHALL be implemented in exactly three files: `index.html`, `css/style.css`, and `js/script.js`, with no additional HTML, CSS, or JavaScript files present in the project.
2. THE App SHALL load Chart.js version 4.x exclusively via a CDN `<script>` tag in `index.html` and SHALL NOT bundle or copy the Chart.js library locally.
3. THE App SHALL implement all currency display formatting and conversion calculations in a single shared render function within `js/script.js` such that adding a new currency requires changes in only one location.
4. THE App SHALL produce no uncaught JavaScript errors and SHALL render all UI elements (Balance card, Transaction_List, Chart, Monthly_Summary, Currency_Converter toggle) in Chrome 120+, Firefox 120+, Edge 120+, and Safari 17+ without polyfills or transpilation.
5. THE App SHALL NOT require a backend server, build tool, or package manager to run; opening `index.html` directly in a browser SHALL be sufficient to launch the App.
