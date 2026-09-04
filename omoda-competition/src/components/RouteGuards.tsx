import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { firebaseUser, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;
  if (!firebaseUser) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { firebaseUser, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;
  if (!firebaseUser) return <Navigate to="/login" state={{ from: location }} replace />;
  // NOTE: this only hides the admin UI from non-admins in the browser.
  // The real enforcement is in Firestore security rules and Cloud Functions —
  // never rely on this component alone for security.
  if (!isAdmin) return <Navigate to="/account" replace />;
  return <>{children}</>;
}

function FullScreenLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <span className="font-mono text-xs uppercase tracking-widest2 text-silver">
        Loading…
      </span>
    </div>
  );
}
