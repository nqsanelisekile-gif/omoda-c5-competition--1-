import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, auth as adminAuth } from "./admin";
import type { Entry } from "./sharedTypes";

const FUNCTION_REGION = "europe-west1";

async function assertCallerIsAdmin(callerUid: string) {
  const snap = await db.collection("users").doc(callerUid).get();
  if (!snap.exists || snap.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin privileges required.");
  }
}

async function writeAuditLog(adminUid: string, action: string, targetId: string, details?: Record<string, unknown>) {
  await db.collection("auditLogs").add({
    adminUid,
    action,
    targetId,
    timestamp: Date.now(),
    details: details ?? null,
  });
}

/**
 * The ONLY way a user's role can change. Requires the caller to already be
 * an admin, which closes off any client-side path to self-promotion (the
 * Firestore rules separately block writing `role` directly, so this is
 * defence in depth, not the only barrier).
 */
export const setUserRole = onCall({ region: FUNCTION_REGION }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
  await assertCallerIsAdmin(request.auth.uid);

  const { uid, role } = request.data as { uid: string; role: "admin" | "user" };
  if (!uid || (role !== "admin" && role !== "user")) {
    throw new HttpsError("invalid-argument", "uid and a valid role are required.");
  }
  if (uid === request.auth.uid && role === "user") {
    throw new HttpsError("failed-precondition", "You can't revoke your own admin access.");
  }

  await db.collection("users").doc(uid).update({ role });

  // Optional: also set a custom claim so security-sensitive checks can use
  // request.auth.token.admin in rules/functions without a Firestore read.
  await adminAuth.setCustomUserClaims(uid, { admin: role === "admin" });

  await writeAuditLog(request.auth.uid, "setUserRole", uid, { role });
  return { success: true };
});

/**
 * Records the winning entry and publishes the Winner page. Validates that
 * the entry is actually paid and belongs to the stated competition before
 * accepting it — an admin fat-fingering an entry ID shouldn't be able to
 * publish an unpaid or mismatched entry as the winner.
 */
export const recordWinner = onCall({ region: FUNCTION_REGION }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
  await assertCallerIsAdmin(request.auth.uid);

  const { competitionId, entryId, prizeDescription, proofOfDrawUrl } = request.data as {
    competitionId: string;
    entryId: string;
    prizeDescription: string;
    proofOfDrawUrl?: string | null;
  };

  if (!competitionId || !entryId || !prizeDescription) {
    throw new HttpsError("invalid-argument", "competitionId, entryId and prizeDescription are required.");
  }

  const entrySnap = await db.collection("entries").doc(entryId).get();
  if (!entrySnap.exists) {
    throw new HttpsError("not-found", "Entry not found.");
  }
  const entry = entrySnap.data() as Entry;

  if (entry.competitionId !== competitionId) {
    throw new HttpsError("failed-precondition", "Entry does not belong to this competition.");
  }
  if (entry.status !== "paid") {
    throw new HttpsError("failed-precondition", "Only a paid entry can be recorded as the winner.");
  }

  const userSnap = await db.collection("users").doc(entry.userId).get();
  const displayName = userSnap.exists ? (userSnap.data()?.displayName as string) : "Winner";

  await db.collection("winners").doc(competitionId).set({
    competitionId,
    entryId,
    displayName,
    announcedAt: Date.now(),
    prizeDescription,
    proofOfDrawUrl: proofOfDrawUrl ?? null,
  });

  await db.collection("competitions").doc(competitionId).update({
    status: "winner_announced",
    updatedAt: Date.now(),
  });

  await writeAuditLog(request.auth.uid, "recordWinner", competitionId, { entryId });

  return { success: true };
});
