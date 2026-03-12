import { auth } from "./firebase-init.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginMessage = document.getElementById("loginMessage");
const loginBtn = document.getElementById("loginBtn");

// If already logged in, send straight to dashboard
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "admin/dashboard.html";
  }
});

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();

    loginMessage.textContent = "Logging in...";
    loginBtn.disabled = true;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      loginMessage.textContent = "Login successful. Redirecting...";
      window.location.href = "admin/dashboard.html";
    } catch (error) {
      console.error("Login error:", error);

      switch (error.code) {
        case "auth/invalid-email":
          loginMessage.textContent = "That email address is not valid.";
          break;
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          loginMessage.textContent = "Incorrect email or password.";
          break;
        case "auth/too-many-requests":
          loginMessage.textContent =
            "Too many attempts. Please try again later.";
          break;
        default:
          loginMessage.textContent = "Login failed. Please try again.";
      }
    } finally {
      loginBtn.disabled = false;
    }
  });
}
