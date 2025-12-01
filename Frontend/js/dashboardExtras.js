window.clickDate = null;

// dashboardExtras.js
import { API } from "./api.js";
import { toast } from "./utils/toast.js";

Object.keys(window.dailyExpenses);

async function showDayListForHeatmap(key) {
  // key = "YYYY-MM-DD" lokal
  const startIso = new Date(key + "T00:00:00").toISOString();
  const endIso = new Date(key + "T23:59:59").toISOString();

  const resDay = await API.getExpenses({
    created_after: startIso,
    created_before: endIso,
    sort_by: "created_at",
    order: "desc",
  });
  const dataDay = safeData(resDay) || [];
  if (typeof window.renderExpensesArray === "function") {
    window.renderExpensesArray(dataDay);
  }
}
window.showDayListForHeatmap = showDayListForHeatmap;

function safeData(res) {
  if (!res) return null;
  if (res?.data?.data !== undefined) return res.data.data;
  if (res?.data !== undefined) return res.data;
  if (res?.raw?.data !== undefined) return res.raw.data;
  return res?.raw ?? res;
}

function localDateTimeToUTCISO(localDateStr) {
  if (!localDateStr) return null;
  const hasTime = localDateStr.includes("T");
  // new Date(...) sudah menganggap input sebagai waktu lokal
  const d = hasTime
    ? new Date(localDateStr) // contoh: "2025-11-03T08:15"
    : new Date(localDateStr + "T00:00"); // contoh: "2025-11-03"
  return d.toISOString(); // otomatis konversi ke UTC tanpa geser manual
}

function toLocalDateKey(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10); // hasil YYYY-MM-DD sesuai lokal
}

// ===== Natural Language Input Parser =====
export async function parseExpenseInput(raw) {
  const text = String(raw || "")
    .toLowerCase()
    .trim();

  // Tangkap angka fleksibel: "rp 25k", "25rb", "25.000", "25,000"
  const amountMatch = text.match(/(?:rp\s*)?(\d+(?:[.,]\d+)?\s?(k|rb)?)/i);

  let amount = undefined;
  console.log("Raw input:", raw, "Match:", amountMatch, "Amount:", amount);
  if (amountMatch) {
    let rawAmount = amountMatch[1].replace(/[^\d]/g, "");
    let unit = amountMatch[2]?.toLowerCase();

    if (unit === "k" || unit === "rb") {
      amount = parseInt(rawAmount, 10) * 1000;
    } else {
      amount = parseInt(rawAmount, 10);
    }

    if (isNaN(amount)) amount = undefined;
  }

  // Fallback kategori default (ambil kategori pertama)
  const categoriesRes = await API.getCategories();
  const categories = safeData(categoriesRes);
  const defaultCatId =
    Array.isArray(categories) && categories.length > 0
      ? categories[0].id
      : null;

  return {
    description: raw,
    amount,
    category_id: defaultCatId,
    created_at: new Date().toISOString(),
  };
}

// Event listener Quick Add
const quickInput = document.getElementById("quick-input");
quickInput?.addEventListener("keydown", async (e) => {
  if (e.key !== "Enter") return;
  const parsed = await parseExpenseInput(e.target.value);

  if (!parsed.amount) {
    toast({
      title: "Invalid",
      message: "Amount is required atau tidak terparse (contoh: Rp 25k)",
      status: "error",
    });
    return;
  }
  if (!parsed.category_id) {
    toast({
      title: "Invalid",
      message: "Tidak ada kategori default. Buat minimal 1 kategori dulu.",
      status: "error",
    });
    return;
  }

  const res = await API.addExpense(parsed);
  if (res?.ok || res?.status === 201 || res?.raw?.code === 201) {
    toast({
      title: "Added",
      message: "Expense parsed & added",
      status: "success",
    });
    e.target.value = "";

    // 👉 tambahkan ke cache global dailyExpenses
    const day = parsed.created_at.slice(0, 10);
    if (window.dailyExpenses) {
      if (!window.dailyExpenses[day]) window.dailyExpenses[day] = [];
      window.dailyExpenses[day].push({
        id: res.data?.id || res.raw?.data?.id, // ambil ID dari response
        ...parsed,
      });
    }

    // 👉 refresh heatmap grid dengan data terbaru
    const resAll = await API.getExpenses({
      sort_by: "created_at",
      order: "desc",
      limit: 500,
    });
    const dataAll = safeData(resAll);
    renderHeatmap(Array.isArray(dataAll) ? dataAll : []);

    await window.__reloadDashboard();
  } else {
    const msg = res?.raw?.data?.message || res?.raw?.message || "Bad request";
    toast({ title: "Add failed", message: msg, status: "error" });
  }
});

// ===== Gamification: Streak =====
function updateStreak() {
  const today = new Date().toISOString().slice(0, 10);
  const lastDay = localStorage.getItem("lastExpenseDay");
  let streak = parseInt(localStorage.getItem("streak") || "0");

  if (lastDay !== today) {
    streak += 1;
    localStorage.setItem("streak", streak);
    localStorage.setItem("lastExpenseDay", today);
    toast({
      title: "Streak!",
      message: `🔥 ${streak} hari berturut-turut catat pengeluaran`,
      status: "success",
    });
  }
}

// ===== Heatmap Calendar =====
// Tambahkan <div id="heatmap" class="grid grid-cols-7 gap-1"></div> di HTML
export async function renderHeatmap(expenses) {
  window.expensesData = expenses;

  const heatmap = document.getElementById("heatmap");
  if (!heatmap) return;
  heatmap.innerHTML = "";

  // Hitung total, jumlah, dan simpan expense per hari
  const dailyTotals = {};
  const dailyCounts = {};
  window.dailyExpenses = {};

  (expenses || []).forEach((e) => {
    const day = toLocalDateKey(e.created_at);
    if (day) {
      const amt = Number(e.amount || 0);
      dailyTotals[day] = (dailyTotals[day] || 0) + (isNaN(amt) ? 0 : amt);
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
      if (!window.dailyExpenses[day]) window.dailyExpenses[day] = [];
      window.dailyExpenses[day].push(e);
    }
  });

  // Ambil kategori untuk map id → nama
  const categoriesRes = await API.getCategories();
  const categories = safeData(categoriesRes) || [];
  const categoryMap = {};
  categories.forEach((c) => (categoryMap[c.id] = c.name));

  // Ambil 365 hari terakhir
  const today = new Date();
  const days = [];

  for (let i = 0; i < 365; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (364 - i)); // arah benar → kanan = hari terbaru

    // format agar cocok dengan key database
    const key = toLocalDateKey(date.toISOString());

    const total = dailyTotals[key] || 0;
    const count = dailyCounts[key] || 0;
    const intensity = count === 0 ? 0.1 : Math.min(1, count / 5);

    // ⬅ ini yang benar, BUKAN "count:0"
    days.push({
      key,
      total,
      count,
      intensity,
    });
  }
  // days.reverse();

  const grid = document.createElement("div");
  grid.className = "grid grid-flow-col grid-rows-7 gap-[3px]";

  // Hitung weekday hari pertama
  const firstDayWeekday = new Date(days[0].key).getDay();

  // Placeholder untuk alignment awal
  for (let i = 0; i < firstDayWeekday; i++) {
    const empty = document.createElement("div");
    empty.className = "aspect-square opacity-0";
    grid.appendChild(empty);
  }

  // Render setiap hari sebagai kotak heatmap
  days.forEach(({ key, total, intensity }) => {
    const cell = document.createElement("div");
    cell.style.width = "var(--cell-size)";
    cell.style.height = "var(--cell-size)";
    cell.className =
      "rounded hover:scale-105 transition border border-transparent hover:border-red-300";
    cell.style.backgroundColor = `rgba(255,0,0,${intensity})`;

    const count = dailyCounts[key] || 0;
    cell.title = `${key}: Rp ${total.toLocaleString(
      "id-ID"
    )} • ${count} expense`;

    // Ketika cell diklik → tampilkan daftar pengeluaran hari itu
    cell.addEventListener("click", () => {
      window.clickedDate = key;
      const list = document.getElementById("expense-list");
      list.innerHTML = "";

      let totalDay = 0;

      const expensesForDay = (window.expensesData || []).filter(
        (e) => toLocalDateKey(e.created_at) === key
      );

      expensesForDay.forEach((exp) => {
        totalDay += Number(exp.amount || 0);

        const li = document.createElement("li");
        li.className =
          "p-2 bg-[#071a2e] rounded border border-cyan-900 text-sm flex justify-between items-center";

        const info = document.createElement("div");
        info.innerHTML = `
          <div><span class="font-bold text-cyan-400">Rp ${Number(
            exp.amount
          ).toLocaleString("id-ID")}</span></div>
          <div>${exp.description || "No desc"}</div>
          <div class="text-xs text-gray-400">
            Category: ${categoryMap[exp.category_id] || "-"} |   ${new Date(
          exp.created_at
        ).toLocaleString("id-ID")}
</div>
        `;

        const actions = document.createElement("div");
        actions.className = "flex gap-2";

        const editBtn = document.createElement("button");
        editBtn.className =
          "px-2 py-1 border border-cyan-500 rounded text-cyan-300 text-xs";
        editBtn.textContent = "Edit";
        editBtn.onclick = () =>
          typeof window.openModal === "function" && window.openModal(exp);

        const delBtn = document.createElement("button");
        delBtn.className =
          "px-2 py-1 border border-red-500 rounded text-red-300 text-xs";
        delBtn.textContent = "Delete";
        delBtn.onclick = async () => {
          if (
            !confirm(
              `Hapus expense "${exp.description}" senilai Rp ${Number(
                exp.amount
              ).toLocaleString("id-ID")}?`
            )
          )
            return;
          const res = await API.deleteExpense(exp.id);
          if (res?.ok) {
            li.remove();
            totalDay -= Number(exp.amount || 0);
            document.getElementById(
              "total-expenses"
            ).textContent = `Rp ${totalDay.toLocaleString("id-ID")}`;

            // Hapus dari cache
            window.dailyExpenses[key] = window.dailyExpenses[key].filter(
              (e) => e.id !== exp.id
            );
            if (window.expensesData) {
              window.expensesData = window.expensesData.filter(
                (x) => x.id !== exp.id
              );
            }

            // 🔥 Fetch ulang data terbaru dari DB
            const refresh = await API.getExpenses({
              sort_by: "created_at",
              order: "desc",
              limit: 500,
            });
            const newData = safeData(refresh);

            // 🔥 Render heatmap ulang pake data fresh (bukan cache)
            await renderHeatmap(Array.isArray(newData) ? newData : []);

            if (typeof window.__reloadDashboard === "function") {
              await window.__reloadDashboard();
            }

            toast({
              title: "Deleted",
              message: "Heatmap updated tanpa reload 🔥",
              status: "success",
            });
          } else
            toast({
              title: "Error",
              message: "Gagal menghapus expense",
              status: "error",
            });
        };

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        li.appendChild(info);
        li.appendChild(actions);
        list.appendChild(li);
      });

      document.getElementById(
        "total-expenses"
      ).textContent = `Rp ${totalDay.toLocaleString("id-ID")}`;
      showDayListForHeatmap(key);
      toast({
        title: "Expenses loaded",
        message: `Menampilkan ${expensesForDay.length} expense pada ${key}`,
        status: "success",
      });
    });

    grid.appendChild(cell);
  });

  // Label hari (Sen, Rab, Jum)
  const dayLabels = ["Sen", "Rab", "Jum"];
  const dayLabelContainer = document.createElement("div");
  dayLabelContainer.className =
    "flex flex-col justify-between mr-2 text-xs text-gray-400";
  dayLabels.forEach((label, i) => {
    const el = document.createElement("div");
    el.className = "h-[16px] sm:h-[18px] md:h-[20px]";
    el.style.marginTop = i === 0 ? "0px" : "32px";
    el.textContent = label;
    dayLabelContainer.appendChild(el);
  });

  // 🔥 Label bulan baru — mengikuti jarak kolom, tidak rapat
  // 🔥 Label bulan otomatis mengikuti jarak hari & tidak saling menumpuk
  const monthLabels = document.createElement("div");
  monthLabels.className =
    "relative w-max h-4 mb-1 ml-[28px] select-none text-[7px] sm:text-[9px] md:text-[11px] lg:text-[12px] text-gray-300";

  // ambil ulang cell-size setelah media query aktif
  const cellSize = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--cell-size")
  );
  const gap = 3; // dari tailwind
  const colWidth = cellSize + gap; // total lebar 1 kolom

  const weeks = Math.ceil(days.length / 7);

  for (let w = 0; w < weeks; w++) {
    const date = new Date(days[w * 7].key);

    if (date.getDate() <= 7) {
      const label = document.createElement("span");
      label.textContent = date.toLocaleString("id-ID", { month: "short" });

      label.style.position = "absolute";
      label.style.top = "-8px"; // 📌 tidak menabrak kotak lagi
      label.style.left = `${w * colWidth}px`;

      monthLabels.appendChild(label);
    }
  }

  // gabungkan semua
  const container = document.createElement("div");
  container.className = "flex";
  container.appendChild(dayLabelContainer);
  container.appendChild(grid);

  const scrollWrap = document.createElement("div");
  scrollWrap.className = "overflow-x-auto";
  scrollWrap.appendChild(monthLabels);
  scrollWrap.appendChild(container);

  heatmap.appendChild(scrollWrap);

  setTimeout(() => (scrollWrap.scrollLeft = scrollWrap.scrollWidth), 0);
}

// Tutup modal ketika tombol ✕ ditekan
document.getElementById("modal-close")?.addEventListener("click", () => {
  document.getElementById("modal").classList.add("hidden");
});

// Hook ke reload dashboard
const oldReload = window.__reloadDashboard;
window.__reloadDashboard = async function () {
  await oldReload();
  const res = await API.getExpenses({
    sort_by: "created_at",
    order: "desc",
    limit: 500,
  });
  const data = safeData(res);
  renderHeatmap(Array.isArray(data) ? data : []);
};

// ===== Saved Filters =====
export function saveCurrentFilter(name, query) {
  localStorage.setItem("filter_" + name, JSON.stringify(query));
  toast({
    title: "Saved",
    message: `Filter "${name}" disimpan`,
    status: "success",
  });
}

export function applySavedFilter(name) {
  const q = JSON.parse(localStorage.getItem("filter_" + name) || "{}");
  window.loadExpenses(q);
}

// ===== Masked Mode =====
let masked = false;
document.getElementById("toggle-mask")?.addEventListener("click", () => {
  masked = !masked;
  document.querySelectorAll(".text-cyan-400.font-bold").forEach((el) => {
    el.classList.toggle("masked", masked);
  });

  toast({
    title: masked ? "Masked" : "Unmasked",
    message: masked ? "Angka disembunyikan" : "Angka ditampilkan",
    status: masked ? "warn" : "success",
  });
});
window.renderHeatmap = renderHeatmap;
