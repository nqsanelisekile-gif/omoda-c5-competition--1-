import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

// All values come from environment variables — never hard-code Firebase
// config in source. Copy .env.example to .env.local and fill in your
// project's values from the Firebase console.
const firebaseConfig = {
  // Keep public pages renderable before `.env.local` is configured.
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "local-preview-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "local-preview.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "local-preview",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "local-preview.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "local-preview-sender",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "local-preview-app",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
// Region should match wherever you deploy functions (e.g. "europe-west1" is
// closest to South Africa at time of writing — confirm current options).
export const functions = getFunctions(app, "europe-west1");
