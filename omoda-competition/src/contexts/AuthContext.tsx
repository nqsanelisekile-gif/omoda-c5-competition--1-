import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import type { AppUser } from "@/types";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  appUser: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      try {
        if (user) {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) {
            setAppUser(snap.data() as AppUser);
          } else {
            // Should not normally happen (profile doc is created at sign-up),
            // but guard against orphaned auth accounts.
            setAppUser(null);
          }
        } else {
          setAppUser(null);
        }
      } catch (error) {
        console.error("Failed to load app user profile:", error);
        setAppUser(null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  async function signUp(email: string, password: string, displayName: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    const newUser: AppUser = {
      uid: cred.user.uid,
      email,
      displayName,
      role: "user", // role is always "user" on client-side creation;
      // promotion to "admin" can only be done by an existing admin via a
      // Cloud Function (see functions/src/admin.ts) — never by the client.
      createdAt: Date.now(),
    };
    await setDoc(doc(db, "users", cred.user.uid), {
      ...newUser,
      createdAt: serverTimestamp(),
    });
    setAppUser(newUser);
  }

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  const value: AuthContextValue = {
    firebaseUser,
    appUser,
    loading,
    isAdmin: appUser?.role === "admin",
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
