
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB-gIPR9I5rOwsypvPDEOysRbz_H47sm6A",
  authDomain: "glamurosa-3a5ad.firebaseapp.com",
  projectId: "glamurosa-3a5ad",
  storageBucket: "glamurosa-3a5ad.firebasestorage.app",
  messagingSenderId: "670099016750",
  appId: "1:670099016750:web:e4a01bf964618908fd23bf"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
