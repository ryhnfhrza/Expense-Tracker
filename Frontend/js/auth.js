import { API } from "./api.js";
import { openModal, notify, triggerRefresh } from "./ui.js";

if (localStorage.getItem("token")) {
  window.location.href = "../dashboard.html";
}

let token = localStorage.getItem("token") || null;
export function getToken() {
  return token;
}

// ===== STATUS UI (AUTH FIRST) =====
if (token === null) {
  document.getElementById("auth-screen").classList.remove("hidden");
  document.getElementById("app").classList.add("hidden");
} else {
  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  triggerRefresh();
}

// ===================================================
// 🔥 REGISTER → lanjut wajib VERIFY email
// ===================================================
export function openRegister() {
  openModal(`
    <h2 class='font-semibold text-lg mb-2'>Register Account</h2>

    <form id="regForm" class="space-y-2">
        <input type="email" name="email" required placeholder="Email"
               class="p-2 border rounded w-full">

        <input type="text" name="username" required placeholder="Username"
               class="p-2 border rounded w-full">

        <input type="password" name="password" required placeholder="Password"
               class="p-2 border rounded w-full">

        <button class="w-full bg-green-600 text-white p-2 rounded">Register</button>
    </form>
`);

  document.querySelector("#regForm").onsubmit = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());

    const res = await API.register(body);

    if (res.code === 201 || res.status === "CREATED") {
      notify("Register berhasil ✔ Silakan lakukan verifikasi email anda");
      document.getElementById("modal-root").innerHTML = "";
      openVerify(body.email); // langsung menuju verify
    } else {
      notify(res.data?.message || "Register gagal");
    }
  };
}

// ===================================================
// 🔥 VERIFY EMAIL → jika berhasil → baru boleh login
// ===================================================
export function openVerify(emailDefault = "") {
  openModal(`
    <h2 class='font-semibold text-lg mb-2'>Verify Email</h2>

    <form id="verifyForm" class="space-y-2">
        <input type="email" name="email" value="${emailDefault}" required
               class="p-2 border rounded w-full">

        <input type="text" name="code" required placeholder="Masukkan kode verifikasi"
               class="p-2 border rounded w-full">

        <button class="w-full bg-purple-600 text-white p-2 rounded">Verify</button>
    </form>
`);

  document.querySelector("#verifyForm").onsubmit = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());

    const res = await API.verifyEmail(body);

    if (res.code === 200) {
      notify("Email berhasil diverifikasi ✔ Sekarang anda bisa login");
      document.getElementById("modal-root").innerHTML = "";
      openLogin();
    } else notify(res.data?.message || "Kode salah");
  };
}

// ===================================================
// 🔥 LOGIN → jika sukses → masuk dashboard
// ===================================================
export function openLogin() {
  openModal(`
    <h2 class='font-semibold text-lg mb-2'>Login</h2>

    <form id="loginForm" class="space-y-2">
        <input type="text" name="username" required placeholder="Username"
               class="p-2 border rounded w-full">

        <input type="password" name="password" required placeholder="Password"
               class="p-2 border rounded w-full">

        <button class="w-full bg-blue-600 text-white p-2 rounded">Login</button>
    </form>
`);

  document.querySelector("#loginForm").onsubmit = async (e) => {
    e.preventDefault();

    const body = Object.fromEntries(new FormData(e.target).entries());
    const res = await API.login(body);

    if (res?.data?.token) {
      token = res.data.token;
      localStorage.setItem("token", token);

      notify("Login berhasil — redirecting...");
      setTimeout(() => (location.href = "../dashboard.html"), 700);
    } else notify(res.data?.message || "Username atau password salah");
  };
}

// ===================================================
// 🔥 LOGOUT
// ===================================================
export function logout() {
  token = null;
  localStorage.removeItem("token");

  document.getElementById("app").classList.add("hidden");
  document.getElementById("auth-screen").classList.remove("hidden");

  notify("Berhasil logout");
}
