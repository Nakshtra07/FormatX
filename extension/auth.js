import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

export async function signup(email, password) {
  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  return userCred.user;
}

export async function login(email, password) {
  const userCred = await signInWithEmailAndPassword(auth, email, password);
  return userCred.user;
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}