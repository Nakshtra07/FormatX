import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";


const firebaseConfig = {
  apiKey: "AIzaSyApyqSx41fXvuP6puuz_owAbQxUF8pyv-c",
  authDomain: "amarika-4a798.firebaseapp.com",
  projectId: "amarika-4a798",
  appId: "1:1094597518877:web:fd44be3fdf32bacc05c8f4"
};



const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);