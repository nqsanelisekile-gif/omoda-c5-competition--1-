import { db } from "./admin";

/**
 * Generates a human-readable, sequential-looking reference number like
 * OMC5-2026-000123. Uses a Firestore transaction on a counter doc so
 * numbers are unique even under concurrent webhook calls.
 */
export async function generateReferenceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const counterRef = db.collection("counters").doc(`entries-${year}`);

  const nextValue = await db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists ? (snap.data()?.value as number) : 0;
    const next = current + 1;
    tx.set(counterRef, { value: next }, { merge: true });
    return next;
  });

  return `OMC5-${year}-${String(nextValue).padStart(6, "0")}`;
}
