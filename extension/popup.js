import { login, signup, loginWithGoogle } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const enableBtn = document.getElementById("enableBtn");
  const formatSelect = document.getElementById("formatSelect");

  if (enableBtn) {
    enableBtn.addEventListener("click", () => {
      const selectedFormat = formatSelect.value;
      chrome.storage.local.set({ selectedFormat });
      alert(`Amarika formatting enabled: ${selectedFormat}`);
    });
  }

  document.getElementById("loginBtn")?.addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const user = await login(email, password);
      const token = await user.getIdToken();

      chrome.storage.local.set({
        firebaseToken: token,
        uid: user.uid
      });

      console.log("User logged in & token stored");
      showTemplatesScreen();
    } catch (err) {
      alert("Login failed");
      console.error(err);
    }
  });

  document.getElementById("signupBtn")?.addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const user = await signup(email, password);
    const token = await user.getIdToken();

    chrome.storage.local.set({
      firebaseToken: token,
      uid: user.uid
    });

    showTemplatesScreen();
  });
});

function showTemplatesScreen() {
  console.log("Templates screen (to be implemented)");
}