import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../firebase-admin";
import { createEntryCode, EntryCodeCollision } from "../../functions/src/entryCode";
import { readRawBody, verifyYocoWebhook, ENTRY_AMOUNT_CENTS, ENTRY_CURRENCY } from "./shared";

export const config = { api: { bodyParser: false } };

type YocoPaymentEvent = {
  id?: string;
  type?: string;
  payload?: {
    id?: string;
    amount?: number;
    currency?: string;
    status?: string;
    metadata?: { paymentId?: string; entryId?: string; competitionId?: string };
  };
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).send("Method not allowed");
    return;
  }

  let rawBody: Buffer;
  try {
    rawBody = await readRawBody(request);
  } catch {
    response.status(400).send("Invalid webhook body");
    return;
  }

  try {
    if (!verifyYocoWebhook(rawBody, request.headers)) {
      response.status(401).send("Invalid signature");
      return;
    }
    const event = JSON.parse(rawBody.toString("utf8")) as YocoPaymentEvent;
    if (event.type !== "payment.succeeded" && event.type !== "payment.failed") {
      response.status(200).send("Ignored");
      return;
    }

    const paymentId = event.payload?.metadata?.paymentId;
    const eventId = event.id;
    const providerPaymentId = event.payload?.id;
    if (!paymentId || !eventId || !providerPaymentId) {
      response.status(400).send("Incomplete payment event");
      return;
    }

    const paymentRef = db.collection("payments").doc(paymentId);
    const eventRef = db.collection("yocoWebhookEvents").doc(eventId);
    const paymentSnapshot = await paymentRef.get();
    if (!paymentSnapshot.exists) {
      response.status(404).send("Payment not found");
      return;
    }
    const payment = paymentSnapshot.data()!;
    if (payment.provider !== "yoco" || payment.amountCents !== ENTRY_AMOUNT_CENTS || payment.currency !== ENTRY_CURRENCY) {
      response.status(400).send("Payment does not match the expected amount");
      return;
    }
    if (event.type === "payment.failed") {
      await db.runTransaction(async (transaction) => {
        if ((await transaction.get(eventRef)).exists) return;
        const current = await transaction.get(paymentRef);
        if (current.data()?.status === "pending") {
          transaction.set(eventRef, { paymentId, eventType: event.type, receivedAt: Date.now() });
          transaction.update(paymentRef, {
            status: "failed",
            providerPaymentId,
            yocoEventId: eventId,
            webhookVerifiedAt: Date.now(),
          });
          if (payment.entryId) transaction.update(db.collection("entries").doc(payment.entryId), { status: "failed" });
        }
      });
      response.status(200).send("OK");
      return;
    }

    if (event.payload?.status !== "succeeded" || event.payload.amount !== ENTRY_AMOUNT_CENTS || event.payload.currency !== ENTRY_CURRENCY) {
      response.status(400).send("Payment verification failed");
      return;
    }

    let finalized = false;
    for (let attempt = 0; attempt < 5 && !finalized; attempt += 1) {
      const uniqueCode = createEntryCode();
      try {
        finalized = await db.runTransaction(async (transaction) => {
          if ((await transaction.get(eventRef)).exists) return true;
          const current = await transaction.get(paymentRef);
          if (current.data()?.status === "succeeded") {
            transaction.set(eventRef, { paymentId, eventType: event.type, receivedAt: Date.now() });
            return true;
          }
          if (current.data()?.status !== "pending") return false;
          const entryRef = db.collection("entries").doc(payment.entryId);
          const codeRef = db.collection("entryCodes").doc(uniqueCode);
          if ((await transaction.get(codeRef)).exists) throw new EntryCodeCollision();
          const now = Date.now();
          transaction.create(codeRef, { entryId: entryRef.id, createdAt: now });
          transaction.update(entryRef, {
            status: "paid",
            uniqueCode,
            referenceNumber: uniqueCode,
            paymentReference: providerPaymentId,
            paidAt: now,
          });
          transaction.update(paymentRef, {
            status: "succeeded",
            providerPaymentId,
            yocoEventId: eventId,
            webhookVerifiedAt: now,
          });
          transaction.set(eventRef, { paymentId, eventType: event.type, receivedAt: now });
          return true;
        });
      } catch (transactionError) {
        if (!(transactionError instanceof EntryCodeCollision)) throw transactionError;
      }
    }
    if (!finalized) {
      response.status(500).send("Could not finalize entry");
      return;
    }
    response.status(200).send("OK");
  } catch (webhookError) {
    console.error("Yoco webhook processing failed", webhookError instanceof Error ? webhookError.message : "unknown error");
    response.status(500).send("Webhook processing failed");
  }
}