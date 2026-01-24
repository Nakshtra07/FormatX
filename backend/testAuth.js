import { login } from "./auth.js";
import "./testAuth.js";

(async () => {
  const user = await login("test@email.com", "password123");
  const token = await user.getIdToken();

  chrome.storage.local.set({
    firebaseToken: token,
    uid: user.uid
  });

  console.log("✅ TOKEN STORED");
  console.log("UID:", user.uid);
  console.log("TOKEN:", token);
})();