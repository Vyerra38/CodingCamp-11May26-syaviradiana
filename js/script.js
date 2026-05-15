// ============================================================
// State
// ============================================================

/**
 * @typedef {Object} Transaction
 * @property {string} id         - UUID v4 generated at creation time
 * @property {string} itemName   - User-provided item name (1–100 characters)
 * @property {number} amount     - Positive numeric value in USD, up to 2 decimal places
 * @property {string} category   - One of: "Food" | "Transport" | "Fun"
 * @property {string} createdAt  - ISO 8601 timestamp string
 */

/**
 * @typedef {Object} AppState
 * @property {Transaction[]} transactions  - All loaded transactions
 * @property {string}        activeCurrency - "USD" | "IDR"
 */

/** @type {AppState} */
const appState = {
  transactions: [],
  activeCurrency: "USD",
};

// ============================================================
// Storage
// ============================================================

/**
 * Checks whether a plain object has all required Transaction fields
 * with the correct types. Used to filter malformed localStorage entries.
 *
 * @param {unknown} entry
 * @returns {boolean}
 */
function isValidTransaction(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
  const { id, itemName, amount, category, createdAt } = /** @type {any} */ (entry);
  if (typeof id !== "string" || id.trim() === "") return false;
  if (typeof itemName !== "string" || itemName.trim() === "") return false;
  if (typeof amount !== "number" || !isFinite(amount) || amount <= 0) return false;
  if (!["Food", "Transport", "Fun"].includes(category)) return false;
  if (typeof createdAt !== "string" || isNaN(Date.parse(createdAt))) return false;
  return true;
}

/**
 * Dark/light mode toggle
 */
const toggleBtn = document.getElementById('theme-toggle');
const sunIcon = document.getElementById('sun-icon');
const moonIcon = document.getElementById('moon-icon');

// Cek local storage saat halaman pertama kali dimuat
const currentTheme = localStorage.getItem('theme');
if (currentTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
  updateIcons(true);
}
toggleBtn.addEventListener('click', () => {
  let theme = document.documentElement.getAttribute('data-theme');
  
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
    updateIcons(false);
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
    updateIcons(true);
  }
});

function updateIcons(isDark) {
  if (isDark) {
    sunIcon.classList.remove('icon-hidden');
    moonIcon.classList.add('icon-hidden');
  } else {
    sunIcon.classList.add('icon-hidden');
    moonIcon.classList.remove('icon-hidden');
  }
}

/**
 * Reads persisted state from localStorage and populates appState.
 * - transactions: JSON-parsed array; falls back to [] on any failure.
 * - activeCurrency: stored string; falls back to "USD".
 * All localStorage access is wrapped in try/catch for silent degradation.
 */
function loadState() {
  // Load transactions
  try {
    const raw = localStorage.getItem("transactions");
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        appState.transactions = parsed.filter((entry) => {
          const valid = isValidTransaction(entry);
          if (!valid) {
            console.warn("Skipping malformed transaction entry:", entry);
          }
          return valid;
        });
      } else {
        appState.transactions = [];
      }
    } else {
      appState.transactions = [];
    }
  } catch (err) {
    console.warn("Failed to load transactions from localStorage:", err);
    appState.transactions = [];
  }

  // Load active currency
  try {
    const currency = localStorage.getItem("activeCurrency");
    appState.activeCurrency = currency === "IDR" ? "IDR" : "USD";
  } catch (err) {
    console.warn("Failed to load activeCurrency from localStorage:", err);
    appState.activeCurrency = "USD";
  }
}

/**
 * Serializes the transactions array and writes it to localStorage.
 * Throws on failure so callers can handle the error appropriately.
 *
 * @param {Transaction[]} transactions
 */
function saveTransactions(transactions) {
  try {
    localStorage.setItem("transactions", JSON.stringify(transactions));
  } catch (err) {
    console.error("Failed to save transactions to localStorage:", err);
    throw err;
  }
}

/**
 * Writes the active currency preference to localStorage.
 * Fails silently — the session currency is still applied even if storage is unavailable.
 *
 * @param {string} currency - "USD" or "IDR"
 */
function saveCurrency(currency) {
  try {
    localStorage.setItem("activeCurrency", currency);
  } catch (err) {
    // Silent failure per Requirement 6.7
    console.warn("Failed to save currency preference to localStorage:", err);
  }
}

// ============================================================
// Validation
// ============================================================

/**
 * Validates the expense form data before submission.
 *
 * @param {{ itemName: string, amount: string, category: string }} formData
 * @returns {Object|null} An object with field-level error messages for any
 *   invalid fields, or null if all fields are valid.
 *
 * Validation rules:
 *   - itemName: non-empty after trim, at most 100 characters
 *   - amount: numeric, greater than 0, at most 2 decimal places
 *   - category: one of "Food", "Transport", "Fun"
 */
function validateForm(formData) {
  const errors = {};

  // --- itemName ---
  const trimmedName = (formData.itemName || "").trim();
  if (trimmedName.length === 0) {
    errors.itemName = "Item name is required";
  } else if (trimmedName.length > 100) {
    errors.itemName = "Item name must be 100 characters or fewer";
  }

  // --- amount ---
  const amountStr = String(formData.amount ?? "").trim();
  const amountNum = Number(amountStr);
  // Reject: empty, non-numeric (NaN), zero, negative, or more than 2 decimal places
  const isValidAmount =
    amountStr !== "" &&
    Number.isFinite(amountNum) &&
    amountNum > 0 &&
    /^\d+(\.\d{1,2})?$/.test(amountStr);
  if (!isValidAmount) {
    errors.amount =
      "Amount must be a positive number with at most 2 decimal places";
  }

  // --- category ---
  const validCategories = ["Food", "Transport", "Fun"];
  if (!validCategories.includes(formData.category)) {
    errors.category = "Please select a category";
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

// ============================================================
// Formatters
// ============================================================

/**
 * Formats a numeric USD amount for display in the active currency.
 * This is the single location that must be changed to add a new currency.
 *
 * @param {number} usdAmount - The amount stored in USD
 * @param {string} currency  - "USD" or "IDR"
 * @returns {string}         - Formatted string, e.g. "$1,250.50" or "Rp 1.250.000"
 */
function formatCurrency(usdAmount, currency) {
  if (currency === "IDR") {
    const idrAmount = usdAmount * 16000;
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(idrAmount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usdAmount);
}

// ============================================================
// Mutations
// ============================================================

/**
 * Displays a non-blocking toast notification in #toast-container.
 * The toast is automatically removed after 3 seconds.
 *
 * @param {string} message - The message to display
 * @param {"error"|"info"} type - Visual style of the toast
 */
function showToast(message, type) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "polite");

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

/**
 * Adds a new transaction to appState and persists it to localStorage.
 * If storage fails, the transaction is kept in memory and a non-blocking
 * toast is shown to the user.
 *
 * @param {{ itemName: string, amount: string|number, category: string }} data
 * @returns {Transaction} The newly created transaction object
 */
function addTransaction(data) {
  const transaction = {
    id: crypto.randomUUID(),
    itemName: data.itemName.trim(),
    amount: parseFloat(data.amount),
    category: data.category,
    createdAt: new Date().toISOString(),
  };

  appState.transactions.push(transaction);

  try {
    saveTransactions(appState.transactions);
  } catch (err) {
    // Keep in-memory state but warn the user (Requirement 7.1 / design error handling)
    showToast(
      "Could not save data. Changes may be lost on reload.",
      "info"
    );
  }

  return transaction;
}

/**
 * Deletes a transaction by id. The storage write is attempted FIRST;
 * only if it succeeds is the in-memory state updated.
 * On storage failure the card is retained and an error toast is shown.
 *
 * @param {string} id - UUID of the transaction to delete
 * @returns {boolean} true if deletion succeeded, false if storage write failed
 */
function deleteTransaction(id) {
  const index = appState.transactions.findIndex((t) => t.id === id);
  if (index === -1) return false;

  const newTransactions = appState.transactions.filter((t) => t.id !== id);

  try {
    saveTransactions(newTransactions);
  } catch (err) {
    // Retain card and show error (Requirement 2.6)
    showToast(
      "Could not delete transaction. Please try again.",
      "error"
    );
    return false;
  }

  // Only update in-memory state after successful storage write
  appState.transactions = newTransactions;
  return true;
}

/**
 * Calculates the total balance from all transactions.
 * @param {Transaction[]} transactions
 * @returns {number} Sum of all amount fields, or 0 for empty array
 */
function calculateBalance(transactions) {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

// ============================================================
// Renderers
// ============================================================

/**
 * Renders the total balance in the #balance-card section.
 * Uses formatCurrency() for all monetary display.
 */
function renderBalance() {
  const balanceEl = document.getElementById("balance-amount");
  if (!balanceEl) return;
  const total = calculateBalance(appState.transactions);
  balanceEl.textContent = formatCurrency(total, appState.activeCurrency);
}

/**
 * Escapes HTML special characters to prevent XSS when inserting
 * user-provided strings into innerHTML.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Renders the transaction list into #transaction-list-container.
 * Transactions are sorted by createdAt descending (newest first).
 * Shows an empty-state message when no transactions exist.
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.7, 2.8
 */
function renderList() {
  const container = document.getElementById("transaction-list-container");
  if (!container) return;

  const { transactions, activeCurrency } = appState;

  if (transactions.length === 0) {
    container.innerHTML = '<p class="empty-msg">No transactions recorded yet.</p>';
    return;
  }

  // Sort by createdAt descending (newest first)
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const html = sorted
    .map((t) => {
      const badgeClass = `badge--${t.category.toLowerCase()}`;
      const formattedAmount = formatCurrency(t.amount, activeCurrency);
      return `<div class="transaction-card">
  <div class="transaction-info">
    <span class="transaction-name">${escapeHtml(t.itemName)}</span>
    <span class="badge ${badgeClass}">${escapeHtml(t.category)}</span>
  </div>
  <div class="transaction-meta">
    <span class="transaction-amount">${formattedAmount}</span>
    <button class="btn-delete" data-id="${t.id}" aria-label="Delete ${escapeHtml(t.itemName)}">Delete</button>
  </div>
</div>`;
    })
    .join("");

  container.innerHTML = html;
}

/**
 * Returns a sorted, deduplicated array of month strings for the selector.
 * Always includes the current calendar month.
 * Format: "Month YYYY" e.g. "May 2026"
 *
 * @param {Transaction[]} transactions
 * @returns {string[]}
 */
function getAvailableMonths(transactions) {
  const formatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

  const monthSet = new Set();

  // Add current month
  monthSet.add(formatter.format(new Date()));

  // Add months from transactions
  for (const t of transactions) {
    monthSet.add(formatter.format(new Date(t.createdAt)));
  }

  // Sort chronologically by parsing back to Date
  return Array.from(monthSet).sort((a, b) => {
    return new Date(a) - new Date(b);
  });
}

/** @type {import('chart.js').Chart|null} */
let chartInstance = null;

/**
 * Renders the spending pie chart using Chart.js.
 *
 * - Aggregates appState.transactions by category (Food, Transport, Fun).
 * - Excludes categories with zero total from the chart data.
 * - If no transactions exist: hides the canvas, shows the placeholder message,
 *   and destroys any existing Chart.js instance.
 * - If data exists: hides the placeholder, shows the canvas.
 * - Creates the Chart.js instance once (stored in chartInstance); on subsequent
 *   renders updates chart.data and calls chart.update() to avoid flicker.
 * - If Chart.js CDN failed to load (typeof Chart === "undefined"), shows a
 *   static fallback message instead.
 *
 * Segment colors: Food #A8D5A2, Transport #FFB347, Fun #F5E6C8
 * Legend labels: "{Category}: {formatCurrency(total, activeCurrency)}"
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */
function renderChart() {
  const canvas = /** @type {HTMLCanvasElement|null} */ (
    document.getElementById("spending-chart-canvas")
  );
  const placeholder = document.getElementById("chart-placeholder");

  if (!canvas || !placeholder) return;

  // Handle Chart.js CDN failure (Requirement 4.5 fallback)
  if (typeof Chart === "undefined") {
    canvas.style.display = "none";
    placeholder.textContent =
      "Chart unavailable. Please check your internet connection.";
    placeholder.style.display = "";
    return;
  }

  const CATEGORY_COLORS = {
    Food: "#A8D5A2",
    Transport: "#FFB347",
    Fun: "#F5E6C8",
  };

  // Aggregate totals by category
  const totals = { Food: 0, Transport: 0, Fun: 0 };
  for (const t of appState.transactions) {
    if (Object.prototype.hasOwnProperty.call(totals, t.category)) {
      totals[t.category] += t.amount;
    }
  }

  // Filter to only categories with total > 0 (Requirement 4.6)
  const activeCategories = /** @type {string[]} */ (
    Object.keys(totals).filter((cat) => totals[cat] > 0)
  );

  // No data: hide canvas, show placeholder, destroy chart instance if exists (Requirement 4.5)
  if (activeCategories.length === 0) {
    canvas.style.display = "none";
    placeholder.style.display = "";
    if (chartInstance !== null) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }

  // Data exists: hide placeholder, show canvas
  placeholder.style.display = "none";
  canvas.style.display = "";

  // Build chart data arrays
  const labels = activeCategories.map(
    (cat) =>
      `${cat}: ${formatCurrency(totals[cat], appState.activeCurrency)}`
  );
  const data = activeCategories.map((cat) => totals[cat]);
  const backgroundColor = activeCategories.map(
    (cat) => CATEGORY_COLORS[cat]
  );

  if (chartInstance === null) {
    // Create new Chart.js instance (first render)
    chartInstance = new Chart(canvas, {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });
  } else {
    // Update existing instance to avoid flicker (Requirement 4.3)
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = data;
    chartInstance.data.datasets[0].backgroundColor = backgroundColor;
    chartInstance.update();
  }
}

/**
 * Populates the #month-selector dropdown with options from getAvailableMonths().
 * Preserves the currently selected month across re-renders if it still exists
 * in the new list; otherwise defaults to the last (most recent) month.
 *
 * Requirements: 5.1, 5.3
 */
function renderMonthSelector() {
  const selector = /** @type {HTMLSelectElement|null} */ (
    document.getElementById("month-selector")
  );
  if (!selector) return;

  // Capture the currently selected value before rebuilding
  const previousValue = selector.value;

  const months = getAvailableMonths(appState.transactions);

  // Build option elements
  selector.innerHTML = months
    .map((month) => `<option value="${escapeHtml(month)}">${escapeHtml(month)}</option>`)
    .join("");

  // Restore previous selection if it still exists, otherwise default to last (most recent)
  if (previousValue && months.includes(previousValue)) {
    selector.value = previousValue;
  } else if (months.length > 0) {
    selector.value = months[months.length - 1];
  }
}

/**
 * Renders the monthly summary statistics for the given selected month.
 *
 * - Filters appState.transactions to those belonging to selectedMonth.
 * - If no transactions: shows #summary-no-data, sets all stats to zero/dash.
 * - If transactions exist: hides #summary-no-data, computes and displays:
 *     - Total expenses (sum of amounts)
 *     - Transaction count
 *     - Highest spending category (alphabetical tiebreak)
 *     - Average amount (total / count, rounded to 2dp)
 * - All monetary values formatted via formatCurrency().
 *
 * @param {string} selectedMonth - Month string in "Month YYYY" format, e.g. "May 2026"
 *
 * Requirements: 5.2, 5.3, 5.4, 5.5
 */
function renderSummary(selectedMonth) {
  const totalEl = document.getElementById("summary-total");
  const countEl = document.getElementById("summary-count");
  const topCategoryEl = document.getElementById("summary-top-category");
  const averageEl = document.getElementById("summary-average");
  const noDataEl = document.getElementById("summary-no-data");

  if (!totalEl || !countEl || !topCategoryEl || !averageEl || !noDataEl) return;

  // Filter transactions to the selected month using the same formatter as getAvailableMonths
  const formatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
  const monthTransactions = appState.transactions.filter(
    (t) => formatter.format(new Date(t.createdAt)) === selectedMonth
  );

  if (monthTransactions.length === 0) {
    // No data for this month: show no-data message, zero out stats
    noDataEl.style.display = "";
    totalEl.textContent = formatCurrency(0, appState.activeCurrency);
    countEl.textContent = "0";
    topCategoryEl.textContent = "—";
    averageEl.textContent = formatCurrency(0, appState.activeCurrency);
    return;
  }

  // Data exists: hide no-data message
  noDataEl.style.display = "none";

  // Compute total and count
  const count = monthTransactions.length;
  const total = monthTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Compute average rounded to 2 decimal places
  const avg = Math.round((total / count) * 100) / 100;

  // Compute highest spending category (alphabetical tiebreak)
  const categoryTotals = {};
  for (const t of monthTransactions) {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  }

  const maxTotal = Math.max(...Object.values(categoryTotals));
  const tiedCategories = Object.keys(categoryTotals)
    .filter((cat) => categoryTotals[cat] === maxTotal)
    .sort(); // alphabetical tiebreak
  const topCategory = tiedCategories[0];

  // Update DOM
  totalEl.textContent = formatCurrency(total, appState.activeCurrency);
  countEl.textContent = String(count);
  topCategoryEl.textContent = topCategory;
  averageEl.textContent = formatCurrency(avg, appState.activeCurrency);
}

// ============================================================
// Top-level render
// ============================================================

/**
 * Calls all renderer functions in sequence to update the full UI.
 * Invokes renderBalance(), renderList(), renderChart(), renderMonthSelector(),
 * and renderSummary() for the currently selected month.
 * Requirements: 1.3, 2.5, 3.2, 3.3, 4.3, 5.3, 6.3
 */
function render() {
  renderBalance();
  renderList();
  renderChart();
  renderMonthSelector();
  const currentSelectedMonth = document.getElementById("month-selector")?.value;
  renderSummary(currentSelectedMonth || "");
}

// ============================================================
// Event Listeners
// ============================================================

// Delegated click listener for delete buttons in the transaction list.
// Set up once here (not inside renderList) so only one listener exists.
// Requirements: 2.4
document.addEventListener("DOMContentLoaded", () => {
  const listContainer = document.getElementById("transaction-list-container");
  if (listContainer) {
    listContainer.addEventListener("click", (event) => {
      const btn = /** @type {HTMLElement} */ (event.target).closest("[data-id]");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      if (id) {
        deleteTransaction(id);
        render();
      }
    });
  }

  // Currency toggle: flip activeCurrency between USD and IDR, persist, re-render.
  // Requirements: 6.1, 6.3, 6.5, 6.7
  const currencyToggle = document.getElementById("currency-toggle");
  if (currencyToggle) {
    currencyToggle.addEventListener("click", () => {
      appState.activeCurrency = appState.activeCurrency === "USD" ? "IDR" : "USD";
      saveCurrency(appState.activeCurrency);
      currencyToggle.textContent =
        appState.activeCurrency === "USD" ? "Switch to IDR" : "Switch to USD";
      render();
    });
  }

  // Month selector: re-render summary when the selected month changes.
  // Requirements: 5.1, 5.3
  const monthSelector = document.getElementById("month-selector");
  if (monthSelector) {
    monthSelector.addEventListener("change", (event) => {
      const selectedMonth = /** @type {HTMLSelectElement} */ (event.target).value;
      renderSummary(selectedMonth);
    });
  }

  // Form submit: validate, add transaction on success, show errors on failure.
  // Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
  const expenseForm = document.getElementById("expense-form");
  if (expenseForm) {
    expenseForm.addEventListener("submit", (event) => {
      event.preventDefault();

      // Clear all error messages at the start of each submit attempt
      const itemNameError = document.getElementById("item-name-error");
      const amountError = document.getElementById("amount-error");
      const categoryError = document.getElementById("category-error");
      if (itemNameError) itemNameError.textContent = "";
      if (amountError) amountError.textContent = "";
      if (categoryError) categoryError.textContent = "";

      // Collect field values
      const itemNameInput = /** @type {HTMLInputElement} */ (document.getElementById("item-name"));
      const amountInput = /** @type {HTMLInputElement} */ (document.getElementById("amount"));
      const categorySelect = /** @type {HTMLSelectElement} */ (document.getElementById("category"));

      const itemName = itemNameInput ? itemNameInput.value : "";
      const amount = amountInput ? amountInput.value : "";
      const category = categorySelect ? categorySelect.value : "";

      // Validate form data
      const errors = validateForm({ itemName, amount, category });

      if (errors !== null) {
        // Display inline error messages beneath each failing field
        if (errors.itemName && itemNameError) {
          itemNameError.textContent = errors.itemName;
        }
        if (errors.amount && amountError) {
          amountError.textContent = errors.amount;
        }
        if (errors.category && categoryError) {
          categoryError.textContent = errors.category;
        }
        // Do NOT call addTransaction — state is not mutated on validation failure
        return;
      }

      // Validation passed: add transaction, re-render, reset fields
      addTransaction({ itemName, amount, category });
      render();

      // Reset all three fields to default state
      if (itemNameInput) itemNameInput.value = "";
      if (amountInput) amountInput.value = "";
      if (categorySelect) categorySelect.value = ""; // resets to the disabled placeholder option
    });
  }

  // Initialize currency toggle button text based on persisted activeCurrency.
  // The HTML defaults to "Switch to IDR" (USD mode), but if the user previously
  // saved IDR as their preference, the button must say "Switch to USD" on load.
  // Requirements: 6.1, 6.5, 7.5
  if (currencyToggle) {
    currencyToggle.textContent =
      appState.activeCurrency === "USD" ? "Switch to IDR" : "Switch to USD";
  }

  // Initial render — all five UI regions populated from persisted state.
  // Requirements: 7.4, 7.5, 9.4
  render();
});

// ============================================================
// Startup
// ============================================================

// Load persisted state before any render (must run before DOMContentLoaded fires)
loadState();
