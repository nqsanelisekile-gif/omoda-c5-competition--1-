import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import type { Entry } from "@/types";

/**
 * The PSP redirects here after checkout (success or cancel) with an
 * entryId query param. IMPORTANT: this page never trusts the redirect
 * itself as proof of payment — it listens to the /entries/{id} document,
 * which only the verified webhook Cloud Function can update to "paid".
 * If the user closes this tab before the webhook fires, the entry will
 * still update correctly in My Account once it does.
 */
export default function PaymentResult() {
  const [params] = useSearchParams();
  const entryId = params.get("entryId");
  const cancelled = params.get("cancelled") === "1";
  const failed = params.get("failed") === "1";
  const { firebaseUser } = useAuth();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    if (!entryId) return;
    if (cancelled && firebaseUser) {
      const cancelPayment = httpsCallable<{ entryId: string }, { ok: boolean }>(
        functions,
        "cancelEntryPayment"
      );
      void cancelPayment({ entryId });
    }
    if (failed && firebaseUser) {
      const failPayment = httpsCallable<{ entryId: string }, { ok: boolean }>(
        functions,
        "failEntryPayment"
      );
      void failPayment({ entryId });
    }
    const unsub = onSnapshot(doc(db, "entries", entryId), (snap) => {
      if (snap.exists()) setEntry({ id: snap.id, ...(snap.data() as Omit<Entry, "id">) });
    });
    const t = setTimeout(() => setWaited(true), 8000);
    return () => {
      unsub();
      clearTimeout(t);
    };
  }, [cancelled, entryId, failed, firebaseUser]);

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="panel max-w-lg p-10 text-center">
        {!entry && (
          <>
            <p className="eyebrow">Confirming Payment</p>
            <h1 className="mt-3 text-2xl">Please wait…</h1>
            <p className="mt-4 text-sm text-silver">
              We're verifying your payment with our provider. This is usually
              instant but can take up to a minute.
            </p>
            {waited && (
              <p className="mt-4 text-xs text-silver">
                Still working on it — you can safely close this tab and check{" "}
                <Link to="/account" className="text-ignition underline">My Account</Link> shortly.
              </p>
            )}
          </>
        )}

        {entry?.status === "paid" && (
          <>
            <p className="eyebrow">Entry Confirmed</p>
            <h1 className="mt-3 text-3xl">You're In!</h1>
            <p className="mt-4 font-mono text-lg text-ignition">
              {entry.referenceNumber}
            </p>
            <p className="mt-4 text-sm text-silver">
              Keep this reference number for your records. A confirmation
              has also been sent to your email.
            </p>
            <Link to="/account" className="btn-primary mt-8 inline-flex">
              View My Entries
            </Link>
          </>
        )}

        {entry?.status === "failed" && (
          <>
            <p className="eyebrow">Payment Failed</p>
            <h1 className="mt-3 text-2xl">Something Went Wrong</h1>
            <p className="mt-4 text-sm text-silver">
              Your payment could not be verified. You have not been charged
              for an entry that wasn't created. Please try again.
            </p>
            <Link to="/enter" className="btn-primary mt-8 inline-flex">
              Try Again
            </Link>
          </>
        )}

        {entry?.status === "cancelled" && (
          <>
            <p className="eyebrow">Payment Cancelled</p>
            <h1 className="mt-3 text-2xl">Your Entry Was Not Paid</h1>
            <p className="mt-4 text-sm text-silver">
              No competition entry was confirmed. You can return and try again whenever you are ready.
            </p>
            <Link to="/enter" className="btn-primary mt-8 inline-flex">
              Try Again
            </Link>
          </>
        )}

        {entry?.status === "pending" && waited && (
          <p className="mt-4 text-sm text-silver">
            Your payment is still being verified. Check{" "}
            <Link to="/account" className="text-ignition underline">My Account</Link> in a
            few minutes.
          </p>
        )}
      </div>
    </div>
  );
}
