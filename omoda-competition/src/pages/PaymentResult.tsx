import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { Entry, Payment } from "@/types";

/**
 * The PSP redirects here after checkout (success or cancel) with a
 * paymentId query param. IMPORTANT: this page never trusts the redirect
 * itself as proof of payment — it listens to the /payments/{id} document,
 * then follows the server-created entry after the verified webhook marks
 * the payment succeeded.
 * If the user closes this tab before the webhook fires, the entry will
 * still update correctly in My Account once it does.
 */
export default function PaymentResult() {
  const [params] = useSearchParams();
  const paymentId = params.get("paymentId");
  const cancelled = params.get("cancelled") === "1";
  const failed = params.get("failed") === "1";
  const [payment, setPayment] = useState<Payment | null>(null);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [waited, setWaited] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentId) return;
    // Redirect query parameters are only a user-experience hint. They never
    // update a payment: only the signed Yoco webhook can do that server-side.
    let unsubscribeEntry: () => void = () => undefined;
    const unsubscribePayment = onSnapshot(
      doc(db, "payments", paymentId),
      (snap) => {
        if (!snap.exists()) return;
        const nextPayment = { id: snap.id, ...(snap.data() as Omit<Payment, "id">) };
        setPayment(nextPayment);
        if (nextPayment.entryId) {
          unsubscribeEntry();
          unsubscribeEntry = onSnapshot(doc(db, "entries", nextPayment.entryId), (entrySnap) => {
            if (entrySnap.exists()) setEntry({ id: entrySnap.id, ...(entrySnap.data() as Omit<Entry, "id">) });
          });
        }
      },
      (error) => {
        if (import.meta.env.DEV) console.error("Unable to read payment verification status:", error);
        setVerificationError("Payment could not be verified. Please contact support.");
      }
    );
    const t = setTimeout(() => setWaited(true), 8000);
    return () => {
      unsubscribePayment();
      unsubscribeEntry();
      clearTimeout(t);
    };
  }, [paymentId]);

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="panel max-w-lg p-10 text-center">
        {!paymentId && (
          <p role="alert" className="text-sm text-ignition">
            Payment could not be verified. Please contact support.
          </p>
        )}
        {verificationError && <p role="alert" className="text-sm text-ignition">{verificationError}</p>}
        {!payment && (
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

        {(entry?.status === "failed" || payment?.status === "failed") && (
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

        {(payment?.status === "cancelled" || (payment?.status === "initiated" && cancelled)) && (
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

        {payment?.status === "succeeded" && !entry && (
          <>
            <p className="eyebrow">Finalizing Entry</p>
            <h1 className="mt-3 text-2xl">Payment Verified</h1>
            <p className="mt-4 text-sm text-silver">
              Your unique entry code is being generated. This usually takes only a moment.
            </p>
          </>
        )}

        {payment?.status === "initiated" && failed && (
          <p className="mt-4 text-sm text-silver">
            The checkout reported a problem. Payment is still being verified;
            no entry will be created unless Yoco confirms it.
          </p>
        )}

        {payment?.status === "initiated" && waited && !cancelled && !failed && (
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
