// js/dashboard.js
window.dailyExpenses = {}; // ← tambahkan ini

import { API } from "./api.js";
import { toast } from "./utils/toast.js";
import { openManageCategory } from "./manageCategory.js";

window.renderExpensesArray = renderExpensesArray;

const TOKEN_KEY = "token";
console.log([...Object.keys(window.dailyExpenses)].slice(0, 10));

// --- Guard: ensure logged in ---
const token = localStorage.getItem(TOKEN_KEY);
if (!token) {
  window.location.href = "index.html";
} else {
  if (typeof API.useToken === "function") API.useToken(token);
  else if (typeof API.setToken === "function") API.setToken(token);
}

function toLocalDateKey(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  // Geser ke waktu lokal dengan offset timezone
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10); // hasil YYYY-MM-DD sesuai lokal
}

// ===== Element refs =====
const logoutBtn = document.getElementById("logout-btn");
const summaryWrap = document.getElementById("summary");
const globalTotalEl = document.getElementById("global-total");

const chartRange = document.getElementById("chart-range");
const lineChartCanvas = document.getElementById("lineChart");

const addExpenseForm = document.getElementById("addExpense");
const addCategorySelect = document.getElementById("add-category");
const addCreatedAtInput = document.getElementById("add-created-at");
const addAmountInput = document.getElementById("add-amount");

const expenseList = document.getElementById("expense-list");

const searchInput = document.getElementById("search");
const filterCategory = document.getElementById("filter-category");
const filterMinAmount = document.getElementById("filter-min");
const filterMaxAmount = document.getElementById("filter-max");
const filterDateAfter = document.getElementById("filter-after");
const filterDateBefore = document.getElementById("filter-before");
const showAllBtn = document.getElementById("show-all");
const showTodayBtn = document.getElementById("show-today");

const totalWrap = document.getElementById("total-expenses");

const categoriesContainer = document.getElementById("categories");
const newCatBtn = document.getElementById("newCatBtn");

// Modal refs (update expense)
const modal = document.getElementById("modal");
const modalForm = document.getElementById("modal-form");
const modalClose = document.getElementById("modal-close");
const modalTitle = document.getElementById("modal-title");
const modalAmount = document.getElementById("modal-amount");
const modalDesc = document.getElementById("modal-desc");
const modalCat = document.getElementById("modal-category");
const modalDate = document.getElementById("modal-date");

let lineChartInstance = null;
let currentEditId = null;

// ===== Helpers =====
function formatCurrency(n) {
  const num = Number(n || 0);
  return "Rp " + num.toLocaleString("id-ID");
}

function safeData(res) {
  if (!res) return null;
  if (res?.data?.data !== undefined) return res.data.data;
  if (res?.data !== undefined) return res.data;
  if (res?.raw?.data !== undefined) return res.raw.data;
  return res?.raw ?? res;
}

async function safeApiCall(promise, failTitle = "Request failed") {
  try {
    const res = await promise;
    if (!res?.ok) {
      const msg =
        res?.raw?.data?.message ||
        res?.raw?.message ||
        res?.raw?.data ||
        `HTTP ${res?.status}`;
      toast({ title: failTitle, message: String(msg), status: "error" });
      if (res?.status === 401 || msg.toLowerCase().includes("expired")) {
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = "index.html";
      }
    }
    return res;
  } catch (err) {
    console.error(err);
    toast({
      title: failTitle,
      message: "Network or server error",
      status: "error",
    });
    return null;
  }
}

function formatUserTZ(iso) {
  if (!iso) return "";
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return new Date(iso).toLocaleString("id-ID", { timeZone: tz });
}

// Convert local date/datetime input to UTC ISO for API params/body
function localDateTimeToUTCISO(localDateStr) {
  if (!localDateStr) return null;
  const hasTime = localDateStr.includes("T");
  // new Date(...) sudah menganggap input sebagai waktu lokal
  const d = hasTime
    ? new Date(localDateStr) // contoh: "2025-11-03T08:15"
    : new Date(localDateStr + "T00:00"); // contoh: "2025-11-03"
  return d.toISOString(); // otomatis konversi ke UTC tanpa geser manual
}

// Thousand separator UX for amounts (ID-style)
function formatIdAmountString(value) {
  const digits = String(value).replace(/[^\d]/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(Number(digits));
}
function parseIdAmountToNumber(value) {
  const digits = String(value).replace(/[^\d]/g, "");
  return digits ? Number(digits) : undefined;
}
function bindAmountFormatter(inputEl) {
  if (!inputEl) return;
  inputEl.addEventListener("input", () => {
    inputEl.value = formatIdAmountString(inputEl.value);
    inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
  });
}

// Default range: "today" in UTC (start of local day to start of next local day)
// Range hari ini berdasarkan zona waktu user SEBENARNYA (local)
function todayRangeLocal() {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0
  ); // 00:00 local
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59
  ); // 23:59 local

  return {
    created_after: start.toISOString(),
    created_before: end.toISOString(),
    sort_by: "created_at",
    order: "desc",
  };
}

// Fetch all expenses via pagination to avoid backend default limits
async function fetchAllExpenses(baseParams = {}) {
  const batch = 250; // adjust if needed
  let offset = 0;
  const all = [];
  while (true) {
    const params = {
      ...baseParams,
      limit: batch,
      offset,
      sort_by: "created_at",
      order: "desc",
    };
    const res = await safeApiCall(
      API.getExpenses(params),
      "Failed to load expenses"
    );
    const data = safeData(res);
    if (!Array.isArray(data) || data.length === 0) break;
    all.push(...data);
    if (data.length < batch) break;
    offset += batch;
  }
  return all;
}

// ===== Logout =====
logoutBtn.onclick = () => {
  localStorage.removeItem(TOKEN_KEY);
  toast({
    title: "Logged out",
    message: "You will be redirected to sign in.",
    status: "success",
  });
  setTimeout(() => (window.location.href = "index.html"), 700);
};

// ===== Initial load =====
(async function init() {
  bindAmountFormatter(addAmountInput);
  bindAmountFormatter(modalAmount);

  await loadCategories();
  await loadSummary(); // sets global total
  await loadExpenses(todayRangeLocal()); // default: today's expenses
  await renderChart();

  await window.__reloadDashboard();
})();

// ===== Summary (sets global total) =====
export async function loadSummary() {
  const res = await safeApiCall(
    API.getSummaryDetails(),
    "Failed to load summary"
  );
  const data = safeData(res);
  if (!data) {
    summaryWrap.innerHTML = `<div class="panel">No summary available</div>`;
    if (globalTotalEl) globalTotalEl.textContent = formatCurrency(0);
    return;
  }

  const totalAll = Number(data.total_all ?? 0);
  if (globalTotalEl) globalTotalEl.textContent = formatCurrency(totalAll);

  // avg/day + top category
  const allDates = [];
  (data.categories ?? []).forEach((cat) => {
    (cat.records ?? []).forEach((r) => r.date && allDates.push(r.date));
  });
  let avgPerDay = 0;
  if (allDates.length > 0) {
    const daysSet = new Set(allDates);
    avgPerDay = daysSet.size > 0 ? totalAll / daysSet.size : 0;
  }

  let topCategory = "-";
  let maxTotal = -1;
  (data.categories ?? []).forEach((cat) => {
    const t = Number(cat.total ?? 0);
    if (t > maxTotal) {
      maxTotal = t;
      topCategory = cat.category_name ?? "-";
    }
  });

  summaryWrap.innerHTML = `
    <div class="panel">
      <div class="text-sm text-cyan-300">Total Spent</div>
      <div class="text-2xl text-cyan-400 font-bold mt-1">${formatCurrency(
        totalAll
      )}</div>
    </div>
    <div class="panel">
      <div class="text-sm text-cyan-300">Average / day</div>
      <div class="text-2xl text-cyan-400 font-bold mt-1">${formatCurrency(
        avgPerDay
      )}</div>
    </div>
    <div class="panel">
      <div class="text-sm text-cyan-300">Top Category</div>
      <div class="text-2xl font-bold mt-1">${topCategory}</div>
    </div>
  `;
}

// ===== Chart (timeline) =====
export async function renderChart() {
  const res = await safeApiCall(
    API.getSummaryDetails(),
    "Failed to load chart data"
  );
  const data = safeData(res);
  if (
    !data ||
    !Array.isArray(data.categories) ||
    data.categories.length === 0
  ) {
    if (lineChartInstance) {
      lineChartInstance.destroy();
      lineChartInstance = null;
    }
    return;
  }

  const dailyMap = new Map();
  (data.categories ?? []).forEach((cat) => {
    (cat.records ?? []).forEach((r) => {
      const key = toLocalDateKey(r.date || r.created_at);

      const cur = dailyMap.get(key) ?? 0;
      dailyMap.set(key, cur + Number(r.amount ?? 0));
    });
  });

  const rangeDays = Number(chartRange?.value || "30");
  const today = new Date();
  const datesSorted = Array.from(dailyMap.keys()).sort();
  const filtered = datesSorted.filter((dStr) => {
    const d = new Date(dStr + "T00:00:00"); // <<< LOKAL, bukan UTC Z
    const diffDays = Math.floor((today - d) / (1000 * 60 * 60 * 24));
    return diffDays <= rangeDays;
  });

  const labels = filtered;
  const values = labels.map((dStr) => dailyMap.get(dStr) || 0);

  const ctx = lineChartCanvas.getContext("2d");
  if (lineChartInstance) lineChartInstance.destroy();

  lineChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Spending",
          data: values,
          borderColor: "#00eaff",
          backgroundColor: "rgba(106,92,255,0.08)",
          pointBackgroundColor: "#6f3aff",
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 3,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#9fb0c8" } },
        y: { ticks: { color: "#9fb0c8" }, beginAtZero: true },
      },
    },
  });
}

chartRange?.addEventListener("input", () => renderChart());

// ===== Expenses List, Search, Filters, Totals =====
let lastQuery = {};

async function renderExpensesArray(arr) {
  expenseList.innerHTML = "";
  totalWrap.textContent = formatCurrency(0);

  if (!Array.isArray(arr) || arr.length === 0) {
    expenseList.innerHTML = `<li class="text-gray-400">No expenses found</li>`;
    return;
  }

  let total = 0;
  arr.forEach((e) => {
    total += Number(e.amount ?? e.total ?? 0);

    const desc = e.description ?? "-";
    const cat = e.category_name ?? e.category ?? "Uncategorized";
    const date = e.created_at
      ? toLocalDateKey(e.created_at) + " " + formatUserTZ(e.created_at)
      : "";

    const amount = formatCurrency(e.amount ?? e.total ?? 0);

    const li = document.createElement("li");
    li.className =
      "border-b border-cyan-500/20 pb-2 pt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2";
    li.innerHTML = `
      <div class="flex flex-col">
        <span>${desc} <small class="text-cyan-300">(${cat})</small></span>
        <div class="text-xs text-gray-400">${date}</div>
      </div>
      <div class="flex items-center gap-3 justify-between sm:justify-end">
        <span class="text-cyan-400 font-bold">${amount}</span>
        <button class="text-sm text-yellow-300 border border-yellow-300/40 px-2 py-1 rounded" data-id="${e.id}" data-action="edit">Edit</button>
        <button class="text-sm text-red-400 border border-red-400/40 px-2 py-1 rounded" data-id="${e.id}" data-action="delete">Delete</button>
      </div>
    `;
    expenseList.appendChild(li);
  });

  totalWrap.textContent = formatCurrency(total);
}

export async function loadExpenses(query = {}) {
  try {
    // langsung clone object query
    let params = { ...(query || {}) };
    lastQuery = params;

    // Map filters ke API query
    if (params.created_after_local) {
      params.created_after = localDateTimeToUTCISO(params.created_after_local);
      delete params.created_after_local;
    }
    if (params.created_before_local) {
      params.created_before = localDateTimeToUTCISO(
        params.created_before_local
      );
      delete params.created_before_local;
    }

    const res = await safeApiCall(
      API.getExpenses(params),
      "Failed to load expenses"
    );
    const data = safeData(res);
    await renderExpensesArray(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error(err);
  }
}

// Search debounce
if (searchInput) {
  let searchTimeout = null;
  searchInput.oninput = (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(
      () => loadExpenses({ ...lastQuery, description: e.target.value.trim() }),
      250
    );
  };
}

// Auto apply filters on change
function handleFilterChange() {
  const q = {
    category_id: filterCategory?.value || undefined,
    min_amount: parseIdAmountToNumber(filterMinAmount?.value),
    max_amount: parseIdAmountToNumber(filterMaxAmount?.value),
    created_after_local: filterDateAfter?.value || undefined,
    created_before_local: filterDateBefore?.value || undefined,
    sort_by: "created_at",
    order: "desc",
  };
  Object.keys(q).forEach((k) => {
    if (q[k] === "" || q[k] === undefined || q[k] === null) delete q[k];
  });

  if (Object.keys(q).length === 0) {
    loadExpenses({ sort_by: "created_at", order: "desc" });
  } else {
    loadExpenses(q);
  }
}

// Bind amount formatters to filter min/max
bindAmountFormatter(filterMinAmount);
bindAmountFormatter(filterMaxAmount);

// Filter listeners
filterCategory?.addEventListener("change", handleFilterChange);
filterMinAmount?.addEventListener("input", handleFilterChange);
filterMaxAmount?.addEventListener("input", handleFilterChange);
filterDateAfter?.addEventListener("change", handleFilterChange);
filterDateBefore?.addEventListener("change", handleFilterChange);

// Show all button: reset filters & load all via pagination to avoid backend limits
showAllBtn?.addEventListener("click", async () => {
  // reset inputs
  if (filterCategory) filterCategory.value = "";
  if (filterMinAmount) filterMinAmount.value = "";
  if (filterMaxAmount) filterMaxAmount.value = "";
  if (filterDateAfter) filterDateAfter.value = "";
  if (filterDateBefore) filterDateBefore.value = "";
  if (searchInput) searchInput.value = "";

  // fetch all pages for accurate total
  const all = await fetchAllExpenses({ sort_by: "created_at", order: "desc" });
  await renderExpensesArray(all);
  lastQuery = {}; // state reflects "all"
});

// Today button: quick toggle back to today's range
showTodayBtn?.addEventListener("click", async () => {
  const range = todayRangeLocal();
  // reset inputs
  if (filterCategory) filterCategory.value = "";
  if (filterMinAmount) filterMinAmount.value = "";
  if (filterMaxAmount) filterMaxAmount.value = "";
  if (filterDateAfter) filterDateAfter.value = "";
  if (filterDateBefore) filterDateBefore.value = "";
  if (searchInput) searchInput.value = "";
  await loadExpenses(range);
});

// List actions
expenseList.addEventListener("click", async (ev) => {
  const btn = ev.target.closest("button");
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  if (!id || !action) return;

  if (action === "delete") {
    if (!confirm("Delete this expense?")) return;
    const res = await safeApiCall(
      API.deleteExpense(id),
      "Failed to delete expense"
    );
    if (res?.ok && (res.status === 204 || res.raw?.code === 204)) {
      toast({ title: "Deleted", message: "Expense removed", status: "warn" });
      // refresh current view
      if (Object.keys(lastQuery).length === 0) {
        const all = await fetchAllExpenses({
          sort_by: "created_at",
          order: "desc",
        });
        await renderExpensesArray(all);
      } else {
        await loadExpenses(lastQuery);
      }
      await loadSummary();
      await renderChart();

      const resHM = await API.getExpenses({
        sort_by: "created_at",
        order: "desc",
        limit: 500,
      });
      const dataHM = safeData(resHM);
      window.renderHeatmap(Array.isArray(dataHM) ? dataHM : []);
    } else {
      toast({
        title: "Delete failed",
        message:
          res?.raw?.data?.message ||
          res?.raw?.data ||
          res?.raw?.message ||
          "Could not delete",
        status: "error",
      });
    }
  } else if (action === "edit") {
    const res = await safeApiCall(
      API.getExpenseById(id),
      "Failed to fetch expense"
    );
    const exp = safeData(res);
    openModal(exp);
  }
});

// ===== Modal: Update expense =====
function openModal(expense) {
  modal.classList.remove("hidden");
  modalTitle.textContent = "Update expense";
  currentEditId = expense?.id ?? null;

  modalAmount.value = expense?.amount
    ? formatIdAmountString(expense.amount)
    : "";
  modalDesc.value = expense?.description ?? "";
  modalDate.value = "";
  if (expense?.category_id) modalCat.value = String(expense.category_id);
}
window.openModal = openModal;

function closeModal() {
  modal.classList.add("hidden");
  modalForm.reset();
  currentEditId = null;
}
modalClose.onclick = () => closeModal();

modalForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentEditId) return;

  const amountNum = parseIdAmountToNumber(modalAmount.value);
  const descRaw = modalDesc.value.trim();
  const catRaw = modalCat.value;
  const dateRaw = modalDate.value.trim();

  const body = {};
  if (amountNum !== undefined) body.amount = amountNum;
  if (descRaw !== "") body.description = descRaw;
  if (catRaw !== "") body.category_id = Number(catRaw);
  if (dateRaw !== "") {
    const iso = localDateTimeToUTCISO(dateRaw);
    if (iso) body.created_at = iso;
  }

  if (Object.keys(body).length === 0) {
    toast({
      title: "No changes",
      message: "Provide at least one field",
      status: "warn",
    });
    return;
  }

  const res = await safeApiCall(
    API.updateExpense(currentEditId, body),
    "Failed to update expense"
  );

  if (res?.ok) {
    // update cache sekali saja
    if (window.clickedDate && window.dailyExpenses) {
      const arr = window.dailyExpenses[window.clickedDate];
      if (arr) {
        const idx = arr.findIndex((e) => e.id === currentEditId);
        if (idx !== -1) {
          arr[idx] = { ...arr[idx], ...body };
        }
      }
    }

    toast({ title: "Updated", message: "Expense updated", status: "success" });
    closeModal();

    await loadSummary();
    await renderChart();

    if (window.clickedDate) {
      // window.clickedDate sudah YYYY-MM-DD lokal
      const startIso = new Date(window.clickedDate + "T00:00:00").toISOString();
      const endIso = new Date(window.clickedDate + "T23:59:59").toISOString();

      const resDay = await safeApiCall(
        API.getExpenses({
          created_after: startIso,
          created_before: endIso,
          sort_by: "created_at",
          order: "desc",
        }),
        "Failed to reload day expenses"
      );
      const dataDay = safeData(resDay);
      renderExpensesArray(Array.isArray(dataDay) ? dataDay : []);

      if (typeof window.showDayListForHeatmap === "function") {
        await window.showDayListForHeatmap(window.clickedDate);
      }
    } else {
      if (Object.keys(lastQuery).length === 0) {
        const all = await fetchAllExpenses({
          sort_by: "created_at",
          order: "desc",
        });
        await renderExpensesArray(all);
      } else {
        await loadExpenses(lastQuery);
      }
    }

    // refresh heatmap grid
    const resAll = await safeApiCall(
      API.getExpenses({ sort_by: "created_at", order: "desc", limit: 500 }),
      "Failed to reload heatmap"
    );
    const dataAll = safeData(resAll);
    window.renderHeatmap(Array.isArray(dataAll) ? dataAll : []);
  }
});

// ===== Quick-add expense (with formatted amount) =====
if (addExpenseForm) {
  addExpenseForm.onsubmit = async (e) => {
    e.preventDefault();
    const formBody = Object.fromEntries(new FormData(e.target).entries());

    const amountNum = parseIdAmountToNumber(addAmountInput.value);
    let catId = formBody.category_id ? Number(formBody.category_id) : undefined;

    // fallback: ambil kategori pertama dari API kalau kosong
    if (!catId) {
      const catRes = await safeApiCall(API.getCategories());
      const catData = safeData(catRes);
      if (Array.isArray(catData) && catData.length > 0) {
        catId = catData[0].id; // pakai kategori pertama
      } else {
        toast({
          title: "Invalid",
          message: "No category available",
          status: "error",
        });
        return;
      }
    }

    let createdAtIso;
    if (formBody.created_at?.trim()) {
      createdAtIso = localDateTimeToUTCISO(formBody.created_at.trim());
    } else {
      createdAtIso = new Date().toISOString();
    }
    const body = {
      category_id: catId,
      description: formBody.description || undefined,
      amount: amountNum,
      created_at: createdAtIso,
    };

    if (body.amount === undefined) {
      toast({
        title: "Invalid",
        message: "Amount is required",
        status: "error",
      });
      return;
    }

    const res = await safeApiCall(
      API.addExpense(body),
      "Failed to add expense"
    );
    if (res?.ok && (res.status === 201 || res.raw?.code === 201)) {
      toast({ title: "Added", message: "Expense added", status: "success" });
      addExpenseForm.reset();

      // update cache global dailyExpenses (pakai hari lokal)
      const created = new Date(body.created_at);
      const day = new Date(
        created.getTime() - created.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 10);

      if (window.dailyExpenses) {
        if (!window.dailyExpenses[day]) window.dailyExpenses[day] = [];
        window.dailyExpenses[day].push({
          id: res.data?.id || res.raw?.data?.id,
          ...body,
        });
      }

      // refresh current view
      if (Object.keys(lastQuery).length === 0) {
        const all = await fetchAllExpenses({
          sort_by: "created_at",
          order: "desc",
        });
        await renderExpensesArray(all);
      } else {
        await loadExpenses(lastQuery);
      }

      // refresh heatmap grid
      const resAll = await API.getExpenses({
        sort_by: "created_at",
        order: "desc",
        limit: 500,
      });
      const dataAll = safeData(resAll);
      renderHeatmap(Array.isArray(dataAll) ? dataAll : []);

      await loadSummary();
      await renderChart();
    } else {
      toast({
        title: "Add failed",
        message:
          res?.raw?.data?.message ||
          res?.raw?.data ||
          res?.raw?.message ||
          "Could not add expense",
        status: "error",
      });
    }
  };
}

// ===== Categories =====
export async function loadCategories() {
  const res = await safeApiCall(
    API.getCategories(),
    "Failed to load categories"
  );
  const data = safeData(res) || [];

  if (addCategorySelect) {
    addCategorySelect.innerHTML = data
      .map((c) => `<option value="${c.id}">${c.name}</option>`)
      .join("");
  }
  if (modalCat) {
    modalCat.innerHTML =
      `<option value="">(no change)</option>` +
      data.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
  }
  if (filterCategory) {
    filterCategory.innerHTML =
      `<option value="">All</option>` +
      data.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
  }

  if (categoriesContainer) {
    categoriesContainer.innerHTML = "";
    data.forEach((c) => {
      const li = document.createElement("li");
      li.className =
        "flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-cyan-500/20 pb-2 pt-1";
      li.innerHTML = `
        <span>${c.name}</span>
        <div class="flex gap-2">
          <button class="text-sm text-red-400 border border-red-400/40 px-2 py-1 rounded" data-action="del-cat" data-id="${c.id}">Delete</button>
        </div>`;
      categoriesContainer.appendChild(li);
    });
  }
}

// Category delete → if used open manage modal, else delete
categoriesContainer?.addEventListener("click", async (ev) => {
  const btn = ev.target.closest("button");
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  if (!id || !action) return;

  if (action === "del-cat") {
    const checkRes = await safeApiCall(
      API.getExpenses({
        category_id: id,
        limit: 1,
        order: "desc",
        sort_by: "created_at",
      }),
      "Failed checking category usage"
    );
    const checkData = safeData(checkRes);

    if (Array.isArray(checkData) && checkData.length > 0) {
      // open drag & drop manage modal (handled in manageCategory.js)
      openManageCategory(id);
      return;
    }

    if (!confirm("Delete this category?")) return;
    const res = await safeApiCall(
      API.deleteCategory(id),
      "Failed to delete category"
    );
    if (res?.ok && (res.status === 204 || res.raw?.code === 204)) {
      toast({ title: "Deleted", message: "Category removed", status: "warn" });
      await loadCategories();
      // refresh the current expenses view
      if (Object.keys(lastQuery).length === 0) {
        const all = await fetchAllExpenses({
          sort_by: "created_at",
          order: "desc",
        });
        await renderExpensesArray(all);
      } else {
        await loadExpenses(lastQuery);
      }
      await loadSummary();
      await renderChart();
    } else {
      toast({
        title: "Delete failed",
        message:
          res?.raw?.data?.message ||
          res?.raw?.data ||
          res?.raw?.message ||
          "Could not delete category",
        status: "error",
      });
    }
  }
});

// new category button
newCatBtn.onclick = async () => {
  const name = prompt("New category name:");
  if (!name) return;
  const res = await safeApiCall(
    API.addCategory({ name }),
    "Failed to create category"
  );
  if (res?.ok && (res.status === 201 || res.raw?.code === 201)) {
    toast({ title: "Created", message: "Category created", status: "success" });
    await loadCategories();
  } else {
    toast({
      title: "Create failed",
      message:
        res?.raw?.data?.message ||
        res?.raw?.data ||
        res?.raw?.message ||
        "Could not create",
      status: "error",
    });
  }
};

// ===== Helper reload (public) =====
window.__reloadDashboard = async function () {
  await loadSummary();
  await loadCategories();
  // keep current mode: if lastQuery empty, assume "Show all" view and paginate
  if (Object.keys(lastQuery).length === 0) {
    const all = await fetchAllExpenses({
      sort_by: "created_at",
      order: "desc",
    });
    await renderExpensesArray(all);
  } else {
    await loadExpenses(lastQuery);
  }
  await renderChart();
};
