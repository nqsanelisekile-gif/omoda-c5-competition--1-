import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

// All values come from environment variables — never hard-code Firebase
// config in source. Copy .env.example to .env.local and fill in your
// project's values from the Firebase console.
const requiredConfig = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingConfig = Object.entries(requiredConfig)
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missingConfig.length > 0) {
  throw new Error(`Missing Firebase configuration: ${missingConfig.join(", ")}`);
}

const firebaseConfig = {
  apiKey: requiredConfig.VITE_FIREBASE_API_KEY,
  authDomain: requiredConfig.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: requiredConfig.VITE_FIREBASE_PROJECT_ID,
  storageBucket: requiredConfig.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: requiredConfig.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: requiredConfig.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
// Region should match wherever you deploy functions (e.g. "europe-west1" is
// closest to South Africa at time of writing — confirm current options).
export const functions = getFunctions(app, "europe-west1");
