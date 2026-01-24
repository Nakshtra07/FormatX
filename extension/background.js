import { login } from "./auth.js";

chrome.runtime.onInstalled.addListener(async () => {
  // 1️⃣ Default format (your existing logic)
  await chrome.storage.local.set({ selectedFormat: "ieee" });

  // 2️⃣ TEMP AUTH TEST (FOR DEVELOPMENT ONLY)
  try {
    const user = await login("tanvi@gmail.com", "123456"); // real Firebase test user
    const token = await user.getIdToken();

    await chrome.storage.local.set({
      firebaseToken: token,
      uid: user.uid
    });

    console.log("✅ AUTH TEST SUCCESS");
    console.log("UID:", user.uid);
  } catch (err) {
    console.error("❌ AUTH TEST FAILED", err);
  }
});