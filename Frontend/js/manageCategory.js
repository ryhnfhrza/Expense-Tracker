// js/manageCategory.js
import { API } from "./api.js";
import { toast } from "./utils/toast.js";

// Guard DOM refs inside a getter to avoid null at module load
function getRefs() {
  return {
    modal: document.getElementById("manage-cat-modal"),
    expensesGrid: document.getElementById("manage-expenses"),
    catList: document.getElementById("cat-list"),
    catSearch: document.getElementById("cat-search"),
  };
}

let currentCategoryId = null;
let allCategories = [];
let dragExpenseId = null;

// Safe helpers
function safeData(res) {
  if (!res) return null;
  if (res.data?.data !== undefined) return res.data.data;
  if (res.data !== undefined) return res.data;
  if (res.raw?.data !== undefined) return res.raw.data;
  return res.raw ?? res;
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
function formatCurrency(n) {
  const num = Number(n || 0);
  return "Rp " + num.toLocaleString("id-ID");
}
function formatUserTZ(iso) {
  if (!iso) return "";
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return new Date(iso).toLocaleString("id-ID", { timeZone: tz });
}

// Public API: open modal and load data
export async function openManageCategory(categoryId) {
  currentCategoryId = categoryId;

  const { modal, expensesGrid, catList } = getRefs();
  if (!modal || !expensesGrid || !catList) {
    console.warn("manageCategory modal elements missing");
    toast({
      title: "UI error",
      message: "Manage category UI not found in this page.",
      status: "error",
    });
    return;
  }

  // Show modal
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  // Load expenses of this category
  const expRes = await safeApiCall(
    API.getExpenses({
      category_id: categoryId,
      sort_by: "created_at",
      order: "desc",
      limit: 1000,
    }),
    "Failed to load category expenses"
  );
  const expenses = safeData(expRes) || [];

  // Render expense cards (draggable)
  expensesGrid.innerHTML = "";
  if (Array.isArray(expenses) && expenses.length > 0) {
    expenses.forEach((e) => {
      const card = document.createElement("div");
      card.className =
        "p-3 bg-[#0b1626] border border-cyan-500/30 rounded-md flex items-center justify-between gap-3";
      card.draggable = true;
      card.dataset.id = e.id;

      card.innerHTML = `
        <div class="flex flex-col">
          <span class="font-medium">${e.description ?? "-"}</span>
          <span class="text-xs text-gray-400">${formatUserTZ(
            e.created_at
          )}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-cyan-300 font-semibold">${formatCurrency(
            e.amount
          )}</span>
          <button class="text-red-400 border border-red-400/40 px-2 py-1 rounded text-xs" data-action="delete" data-id="${
            e.id
          }">Delete</button>
        </div>
      `;

      // Drag events
      card.addEventListener("dragstart", () => {
        dragExpenseId = e.id;
        card.classList.add("opacity-60");
      });
      card.addEventListener("dragend", () => {
        dragExpenseId = null;
        card.classList.remove("opacity-60");
      });

      expensesGrid.appendChild(card);
    });
  } else {
    expensesGrid.innerHTML = `<div class="text-gray-400 text-sm">No expenses in this category.</div>`;
  }

  // Load categories for target list
  const catRes = await safeApiCall(
    API.getCategories(),
    "Failed to load categories"
  );
  allCategories = safeData(catRes) || [];

  // Render target categories (droppable)
  renderCategoryTargets();
}

// Render category list with droppable behavior
function renderCategoryTargets(filterText = "") {
  const { catList } = getRefs();
  if (!catList) return;

  const items = (allCategories || []).filter((c) => {
    if (!filterText) return true;
    return String(c.name || "")
      .toLowerCase()
      .includes(filterText.toLowerCase());
  });

  catList.innerHTML = "";
  if (items.length === 0) {
    catList.innerHTML = `<li class="text-gray-400 text-sm">No categories found.</li>`;
    return;
  }

  items.forEach((c) => {
    const li = document.createElement("li");
    li.className =
      "p-2 bg-[#0b1626] border border-cyan-500/30 rounded-md flex items-center justify-between gap-3";
    li.dataset.id = c.id;

    li.innerHTML = `
      <span>${c.name}</span>
      <button class="text-yellow-300 border border-yellow-300/40 px-2 py-1 rounded text-xs" data-action="reassign-all" data-id="${c.id}">Move all here</button>
    `;

    // Make droppable
    li.addEventListener("dragover", (ev) => {
      ev.preventDefault();
      li.classList.add("border-cyan-300");
    });
    li.addEventListener("dragleave", () => {
      li.classList.remove("border-cyan-300");
    });
    li.addEventListener("drop", async () => {
      li.classList.remove("border-cyan-300");
      if (!dragExpenseId) return;
      await reassignSingleExpense(dragExpenseId, c.id);
    });

    catList.appendChild(li);
  });
}

// Reassign single expense to target category
async function reassignSingleExpense(expenseId, targetCategoryId) {
  if (!expenseId || !targetCategoryId) return;
  const res = await safeApiCall(
    API.updateExpense(expenseId, { category_id: Number(targetCategoryId) }),
    "Failed to move expense"
  );
  if (res?.ok) {
    toast({ title: "Moved", message: "Expense reassigned", status: "success" });
    // reload modal content after move
    await openManageCategory(currentCategoryId);
    // optionally refresh dashboard
    if (typeof window.__reloadDashboard === "function") {
      await window.__reloadDashboard();
    }
  }
}

// Bulk reassign all expenses in currentCategoryId to target category
async function reassignAllExpenses(targetCategoryId) {
  const { expensesGrid } = getRefs();
  const ids = Array.from(expensesGrid.querySelectorAll("[data-id]")).map(
    (el) => el.dataset.id
  );
  if (ids.length === 0) {
    toast({
      title: "No items",
      message: "This category has no expenses",
      status: "warn",
    });
    return;
  }
  if (!confirm(`Move ${ids.length} expense(s) to this category?`)) return;

  // naive sequential update (can be optimized / batched if API supports bulk)
  for (const id of ids) {
    await safeApiCall(
      API.updateExpense(id, { category_id: Number(targetCategoryId) }),
      "Failed to reassign expense"
    );
  }

  toast({
    title: "Moved",
    message: "All expenses reassigned",
    status: "success",
  });
  await openManageCategory(currentCategoryId);
  if (typeof window.__reloadDashboard === "function") {
    await window.__reloadDashboard();
  }
}

// Delete single expense (from modal)
async function deleteExpenseFromModal(expenseId) {
  if (!expenseId) return;
  if (!confirm("Delete this expense?")) return;

  const res = await safeApiCall(
    API.deleteExpense(expenseId),
    "Failed to delete expense"
  );
  if (res?.ok) {
    toast({ title: "Deleted", message: "Expense removed", status: "warn" });
    await openManageCategory(currentCategoryId);
    if (typeof window.__reloadDashboard === "function") {
      await window.__reloadDashboard();
    }
  }
}

// Close modal helper
function closeManageModal() {
  const { modal } = getRefs();
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  currentCategoryId = null;
  dragExpenseId = null;
}

// Bind once after DOM ready to avoid null addEventListener
document.addEventListener("DOMContentLoaded", () => {
  const { modal, expensesGrid, catList, catSearch } = getRefs();
  if (!modal) return;

  // click outside to close (optional)
  modal.addEventListener("click", (ev) => {
    if (ev.target === modal) {
      closeManageModal();
    }
  });

  // Escape to close
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !modal.classList.contains("hidden")) {
      closeManageModal();
    }
  });

  // Delegated: delete & bulk reassign buttons
  if (expensesGrid) {
    expensesGrid.addEventListener("click", async (ev) => {
      const btn = ev.target.closest("button");
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === "delete") {
        await deleteExpenseFromModal(id);
      }
    });
  }

  if (catList) {
    catList.addEventListener("click", async (ev) => {
      const btn = ev.target.closest("button");
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === "reassign-all") {
        await reassignAllExpenses(id);
      }
    });
  }

  if (catSearch) {
    catSearch.addEventListener("input", (ev) => {
      renderCategoryTargets(ev.target.value.trim());
    });
  }
});
