import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getEnv } from "../agent/envUtil";

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY") || "AIzaSyCu4GQa-EOaPhpQP_y_QcsJxs05adQU2-M",
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN") || "math314-app.firebaseapp.com",
  databaseURL: getEnv("VITE_FIREBASE_DATABASE_URL") || "https://math314-app-default-rtdb.firebaseio.com",
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID") || "math314-app",
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET") || "math314-app.firebasestorage.app",
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID") || "9019551034",
  appId: getEnv("VITE_FIREBASE_APP_ID") || "1:9019551034:web:de0c5e2b8b20c18ca0b403",
  measurementId: getEnv("VITE_FIREBASE_MEASUREMENT_ID") || "G-VWYDTY9LF6",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

