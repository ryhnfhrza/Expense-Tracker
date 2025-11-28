if (localStorage.getItem("token")) {
  window.location.href = "dashboard.html";
}

import { API } from "./api.js";
import { toast } from "./utils/toast.js";

// element refs
const loginScreen = document.getElementById("login-screen");
const registerScreen = document.getElementById("register-screen");
const verifyScreen = document.getElementById("verify-screen");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const verifyForm = document.getElementById("verifyForm");

document.getElementById("go-register").onclick = () => {
  loginScreen.classList.add("hidden");
  registerScreen.classList.remove("hidden");
};
document.getElementById("back-to-login").onclick = () => {
  registerScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
};

// REGISTER -> call API -> open verify screen
registerForm.onsubmit = async (e) => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  try {
    const res = await API.register(body);

    if (res?.ok || res?.raw?.code === 201 || res?.raw?.status === "Created") {
      toast({
        title: "Account created",
        message: res.message || "Verification code sent to your email",
        status: "success",
        suggestion: "Check your inbox. Code valid for 5 minutes.",
      });
      document.getElementById("verify-email").value = body.email || "";
      registerScreen.classList.add("hidden");
      verifyScreen.classList.remove("hidden");
    } else {
      toast({
        title: "Register failed",
        message: res.data?.message || res.message || "Unable to create account",
        status: "error",
        suggestion: res.data?.suggestion || null,
      });
    }
  } catch (err) {
    console.error(err);
    toast({
      title: "Network error",
      message: "Cannot reach server. Check connection or server.",
      status: "error",
    });
  }
};

// VERIFY -> call API.verifyEmail
verifyForm.onsubmit = async (e) => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  try {
    const res = await API.verifyEmail(body);
    if (
      res &&
      (res?.ok || res?.raw?.code === 200 || res?.raw?.status === "OK")
    ) {
      toast({
        title: "Verified",
        message: res.message || "Email verified successfully",
        status: "success",
      });
      verifyScreen.classList.add("hidden");
      loginScreen.classList.remove("hidden");
    } else {
      toast({
        title: "Verification failed",
        message: res.data?.message || res.message || "Invalid or expired code",
        status: "warn",
        suggestion: "Request a new code and try again.",
      });
    }
  } catch (err) {
    console.error(err);
    toast({
      title: "Network error",
      message: "Cannot reach server.",
      status: "error",
    });
  }
};

// LOGIN -> username+password
loginForm.onsubmit = async (e) => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());

  try {
    const res = await API.login(body);

    if (res?.data?.token) {
      localStorage.setItem("token", res.data.token);

      toast({
        title: "Welcome back!",
        message: "Redirecting to dashboard...",
        status: "success",
      });

      // 🚀 Redirect works now!
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 700);
    } else {
      toast({
        title: "Login failed",
        message: res.data?.message || "Wrong credentials or email unverified",
        status: "error",
        suggestion: "Check email verification & password",
      });
    }
  } catch (err) {
    console.error(err);
    toast({
      title: "Network Error",
      message: "Backend unreachable.",
      status: "error",
    });
  }
};
