import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db, auth } from "../firebase-admin";
import type { Competition } from "../../functions/src/sharedTypes";
import { createYocoCheckout, ENTRY_AMOUNT_CENTS, ENTRY_CURRENCY } from "./shared";

function error(response: VercelResponse, status: number, message: string) {
  response.status(status).json({ error: message });
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    error(response, 405, "Method not allowed.");
    return;
  }

  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    error(response, 401, "You must be signed in.");
    return;
  }

  let userId: string;
  try {
    userId = (await auth.verifyIdToken(authorization.slice("Bearer ".length))).uid;
  } catch {
    error(response, 401, "Your sign-in session is invalid or expired.");
    return;
  }

  const competitionId = typeof request.body?.competitionId === "string" ? request.body.competitionId : "";
  if (!competitionId) {
    error(response, 400, "competitionId is required.");
    return;
  }

  const appBaseUrl = process.env.APP_BASE_URL;
  if (!appBaseUrl) {
    error(response, 500, "Payment checkout is not configured.");
    return;
  }

  try {
    const competitionSnapshot = await db.collection("competitions").doc(competitionId).get();
    if (!competitionSnapshot.exists) {
      error(response, 404, "Competition not found.");
      return;
    }
    const competition = competitionSnapshot.data() as Competition;
    const isActive = (competition.status?.toLowerCase() === "active") || competition.isActive === true;
    if (!isActive || !Number.isFinite(competition.closingAt) || Date.now() > competition.closingAt) {
      error(response, 412, "This competition is not currently open for entries.");
      return;
    }
    if (competition.entryFeeCents !== ENTRY_AMOUNT_CENTS) {
      error(response, 412, "This competition is not configured for the R100 entry price.");
      return;
    }

    const paymentRef = db.collection("payments").doc();
    const entryRef = db.collection("entries").doc();
    const now = Date.now();
    await db.runTransaction(async (transaction) => {
      transaction.create(paymentRef, {
        userId,
        entryId: entryRef.id,
        competitionId,
        provider: "yoco",
        providerChargeId: null,
        amountCents: ENTRY_AMOUNT_CENTS,
        currency: ENTRY_CURRENCY,
        competitionName: competition.name ?? competition.title ?? competition.id,
        status: "pending",
        webhookVerifiedAt: null,
        createdAt: now,
      });
      transaction.create(entryRef, {
        userId,
        competitionId,
        competitionName: competition.name ?? competition.title ?? competition.id,
        entryMethod: "paid",
        status: "pending",
        paymentId: paymentRef.id,
        referenceNumber: null,
        uniqueCode: null,
        paymentReference: null,
        amount: ENTRY_AMOUNT_CENTS,
        currency: ENTRY_CURRENCY,
        createdAt: now,
        paidAt: null,
      });
    });

    try {
      const checkout = await createYocoCheckout({
        paymentId: paymentRef.id,
        entryId: entryRef.id,
        competitionId,
        appBaseUrl,
      });
      await paymentRef.update({ providerChargeId: checkout.checkoutId });
      response.status(200).json({ paymentId: paymentRef.id, checkoutUrl: checkout.redirectUrl });
    } catch (checkoutError) {
      await Promise.all([
        paymentRef.update({ status: "failed" }),
        entryRef.update({ status: "failed" }),
      ]);
      console.error("Unable to create Yoco checkout", checkoutError instanceof Error ? checkoutError.message : "unknown error");
      error(response, 502, "Could not start payment. Please try again.");
    }
  } catch (requestError) {
    console.error("Unable to create payment records", requestError instanceof Error ? requestError.message : "unknown error");
    error(response, 500, "Could not create the payment. Please try again.");
  }
}