import { login, signup } from "./auth.js";

// LOGIN
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const user = await login(email, password);
      const token = await user.getIdToken();

      chrome.storage.local.set({
        firebaseToken: token,
        uid: user.uid
      });

      console.log("✅ Login success");
      window.location.href = "template.html";
    } catch (err) {
      alert("Invalid email or password");
      console.error(err);
    }
  });
}

// SIGNUP
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirm = document.getElementById("confirm-password").value;

    if (password !== confirm) {
      alert("Passwords do not match");
      return;
    }

    try {
      const user = await signup(email, password);
      const token = await user.getIdToken();

      chrome.storage.local.set({
        firebaseToken: token,
        uid: user.uid
      });

      console.log("✅ Signup success");
      window.location.href = "template.html";
    } catch (err) {
      alert("Signup failed");
      console.error(err);
    }
  })
};