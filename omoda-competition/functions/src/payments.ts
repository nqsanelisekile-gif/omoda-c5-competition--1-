import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions/v2";
import { db } from "./admin";
import { createYocoProvider } from "./providers/yoco";
import { createPayFastProvider, payFastValidationUrl } from "./providers/payfast";
import { createEntryCode, EntryCodeCollision } from "./entryCode";
import { generateReferenceNumber } from "./referenceNumber";
import type { Competition } from "./sharedTypes";

const YOCO_SECRET_KEY = defineSecret("YOCO_SECRET_KEY");
const YOCO_WEBHOOK_SECRET = defineSecret("YOCO_WEBHOOK_SECRET");
const PAYFAST_MERCHANT_ID = defineSecret("PAYFAST_MERCHANT_ID");
const PAYFAST_MERCHANT_KEY = defineSecret("PAYFAST_MERCHANT_KEY");
const PAYFAST_PASSPHRASE = defineSecret("PAYFAST_PASSPHRASE");
const APP_BASE_URL = process.env.APP_BASE_URL;
const PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER ?? "yoco";
const PAYFAST_SANDBOX = process.env.PAYFAST_SANDBOX === "true";
const FUNCTION_REGION = "europe-west1";
const configuredAppOrigin = (() => {
  try {
    return process.env.APP_BASE_URL ? new URL(process.env.APP_BASE_URL).origin : null;
  } catch {
    return null;
  }
})();
const FUNCTION_CORS_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://drivemydream-75f83.web.app",
  "https://drivemydream-75f83.firebaseapp.com",
  ...(configuredAppOrigin ? [configuredAppOrigin] : []),
];

export const getActiveCompetition = onCall(
  { region: FUNCTION_REGION, cors: FUNCTION_CORS_ORIGINS },
  async () => {
    const snapshot = await db.collection("competitions").get();
    const active = snapshot.docs.find((document) => {
      const data = document.data() as Partial<Competition>;
      return (
        (typeof data.status === "string" && data.status.toLowerCase() === "active") ||
        data.isActive === true
      );
    });

    if (!active) {
      throw new HttpsError("not-found", "There is no active competition available right now.");
    }

    return { id: active.id, ...active.data() };
  }
);

/**
 * Called by the client from the Enter Now page. Runs entirely server-side
 * with the Admin SDK, so it's the only place that's allowed to create a
 * payment record and talk to the PSP.
 *
 * Sequence:
 *  1. Verify caller is authenticated.
 *  2. Verify the competition exists and is "active".
 *  3. Create a /payments doc with status "initiated".
 *  4. Ask the PSP for a hosted checkout URL.
 *  5. Create the paid /entries doc only after the verified webhook.
 *  6. Return the checkout URL — client just redirects, does nothing else.
 */
export const createEntrySession = onCall(
  { region: FUNCTION_REGION, cors: FUNCTION_CORS_ORIGINS, secrets: [YOCO_SECRET_KEY, YOCO_WEBHOOK_SECRET, PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in to enter.");
    }
    if (PAYMENT_PROVIDER === "yoco" && !APP_BASE_URL) {
      throw new HttpsError(
        "failed-precondition",
        "Payment checkout is not configured. Set APP_BASE_URL in the Functions environment."
      );
    }
    const userId = request.auth.uid;
    const competitionId = request.data?.competitionId as string | undefined;
    if (!competitionId) {
      throw new HttpsError("invalid-argument", "competitionId is required.");
    }

    const competitionSnap = await db.collection("competitions").doc(competitionId).get();
    if (!competitionSnap.exists) {
      throw new HttpsError("not-found", "Competition not found.");
    }
    const competition = competitionSnap.data() as Competition;
    const competitionIsActive =
      (typeof competition.status === "string" && competition.status.toLowerCase() === "active") ||
      competition.isActive === true;
    if (!competitionIsActive) {
      throw new HttpsError("failed-precondition", "This competition is not currently open for entries.");
    }
    if (Date.now() > competition.closingAt) {
      throw new HttpsError("failed-precondition", "Entries have closed for this competition.");
    }

    const paymentRef = db.collection("payments").doc();
    const now = Date.now();

    await paymentRef.set({
      userId,
      entryId: null,
      competitionId,
      provider: PAYMENT_PROVIDER,
      providerChargeId: null,
      amountCents: competition.entryFeeCents,
      currency: "ZAR",
      competitionName: competition.name ?? competition.title ?? competition.id,
      status: "initiated",
      webhookVerifiedAt: null,
      createdAt: now,
    });

    const provider = PAYMENT_PROVIDER === "yoco"
      ? createYocoProvider(YOCO_SECRET_KEY.value(), YOCO_WEBHOOK_SECRET.value())
      : createPayFastProvider(PAYFAST_MERCHANT_ID.value(), PAYFAST_MERCHANT_KEY.value(), PAYFAST_PASSPHRASE.value(), PAYFAST_SANDBOX);

    try {
      const checkout = await provider.createCheckout({
        amountCents: competition.entryFeeCents,
        currency: "ZAR",
        reference: paymentRef.id,
        successUrl: `${APP_BASE_URL}/payment-result?paymentId=${paymentRef.id}`,
        cancelUrl: `${APP_BASE_URL}/payment-result?paymentId=${paymentRef.id}&cancelled=1`,
        failureUrl: `${APP_BASE_URL}/payment-result?paymentId=${paymentRef.id}&failed=1`,
      });

      await paymentRef.update({ providerChargeId: checkout.providerReference });

      return { paymentId: paymentRef.id, checkoutUrl: checkout.checkoutUrl, formFields: checkout.formFields };
    } catch (err) {
      logger.error("Failed to create Yoco checkout", err);
      await paymentRef.update({ status: "failed" });
      throw new HttpsError("internal", "Could not start payment. Please try again.");
    }
  }
);

export const cancelEntryPayment = onCall(
  { region: FUNCTION_REGION, cors: FUNCTION_CORS_ORIGINS },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
    const userId = request.auth.uid;
    const paymentId = request.data?.paymentId as string | undefined;
    if (!paymentId) throw new HttpsError("invalid-argument", "paymentId is required.");
    const paymentRef = db.collection("payments").doc(paymentId);

    await db.runTransaction(async (transaction) => {
      const paymentSnap = await transaction.get(paymentRef);
      if (!paymentSnap.exists || paymentSnap.data()?.userId !== userId) {
        throw new HttpsError("not-found", "Payment not found.");
      }
      const paymentStatus = paymentSnap.data()?.status;
      if (paymentStatus === "initiated") {
        transaction.update(paymentRef, { status: "cancelled" });
      }
    });
    return { ok: true };
  }
);

export const failEntryPayment = onCall(
  { region: FUNCTION_REGION, cors: FUNCTION_CORS_ORIGINS },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
    const userId = request.auth.uid;
    const paymentId = request.data?.paymentId as string | undefined;
    if (!paymentId) throw new HttpsError("invalid-argument", "paymentId is required.");
    const paymentRef = db.collection("payments").doc(paymentId);
    await db.runTransaction(async (transaction) => {
      const paymentSnap = await transaction.get(paymentRef);
      if (!paymentSnap.exists || paymentSnap.data()?.userId !== userId) {
        throw new HttpsError("not-found", "Payment not found.");
      }
      if (paymentSnap.data()?.status === "initiated") {
        transaction.update(paymentRef, { status: "failed" });
      }
    });
    return { ok: true };
  }
);

/**
 * Webhook receiver — the ONLY place in the entire system that can mark an
 * entry/payment as paid. Must be registered with Yoco as the webhook URL
 * for this function's deployed endpoint.
 *
 * Security properties:
 *  - Signature is verified against the raw request body before anything
 *    else happens (see providers/yoco.ts).
 *  - We look up the payment by the internal reference we sent when
 *    creating the checkout — never trust an id the client could have sent.
 *  - The amount on the webhook is cross-checked against the amount we
 *    recorded when the payment was initiated, to catch tampering or
 *    provider-side bugs.
 *  - This function is idempotent: if the same webhook is retried (PSPs
 *    commonly do this), a payment already marked "succeeded" is a no-op.
 */
export const yocoWebhook = onRequest(
  { region: FUNCTION_REGION, secrets: [YOCO_SECRET_KEY, YOCO_WEBHOOK_SECRET] },
  async (req, res) => {
    const provider = createYocoProvider(YOCO_SECRET_KEY.value(), YOCO_WEBHOOK_SECRET.value());

    // req.rawBody is provided by the Cloud Functions runtime for exactly
    // this purpose — signature verification needs the untouched bytes.
    const verification = provider.verifyWebhook(req.rawBody, req.headers);

    if (!verification.valid) {
      logger.warn("Rejected webhook with invalid signature");
      res.status(401).send("Invalid signature");
      return;
    }

    if (verification.eventType === "unknown" || !verification.providerReference) {
      res.status(200).send("Ignored"); // acknowledge so the PSP doesn't retry forever
      return;
    }

    const paymentsQuery = await db
      .collection("payments")
      .where("providerChargeId", "==", verification.providerReference)
      .limit(1)
      .get();

    if (paymentsQuery.empty) {
      logger.error("Webhook referenced unknown providerChargeId", verification.providerReference);
      res.status(404).send("Payment not found");
      return;
    }

    const paymentDoc = paymentsQuery.docs[0];
    const payment = paymentDoc.data();
    if (verification.internalReference !== null && verification.internalReference !== paymentDoc.id) {
      logger.error("Webhook metadata did not match payment reference", {
        expected: paymentDoc.id,
        received: verification.internalReference,
      });
      res.status(400).send("Payment reference mismatch");
      return;
    }

    // Idempotency guard.
    if (payment.status === "succeeded" || payment.status === "failed" || payment.status === "cancelled") {
      res.status(200).send("Already processed");
      return;
    }

    if (verification.eventType === "payment.failed") {
      await db.runTransaction(async (transaction) => {
        const current = await transaction.get(paymentDoc.ref);
        if (current.data()?.status === "initiated") {
          transaction.update(paymentDoc.ref, { status: "failed", webhookVerifiedAt: Date.now() });
        }
      });
      res.status(200).send("OK");
      return;
    }

    // payment.succeeded from here.
    if (
      verification.amountCents !== null &&
      verification.amountCents !== payment.amountCents
    ) {
      logger.error("Webhook amount mismatch — possible tampering", {
        expected: payment.amountCents,
        received: verification.amountCents,
      });
      res.status(400).send("Amount mismatch");
      return;
    }
    if (verification.currency !== null && verification.currency !== payment.currency) {
      res.status(400).send("Currency mismatch");
      return;
    }

    let finalized = false;
    for (let attempt = 0; attempt < 5 && !finalized; attempt += 1) {
      const uniqueCode = createEntryCode();
      try {
        finalized = await db.runTransaction(async (transaction) => {
          const current = await transaction.get(paymentDoc.ref);
          if (current.data()?.status !== "initiated") return true;

          const entryRef = db.collection("entries").doc();
          const codeRef = db.collection("entryCodes").doc(uniqueCode);
          const codeSnap = await transaction.get(codeRef);
          const userRef = db.collection("users").doc(payment.userId);
          const userSnap = await transaction.get(userRef);
          const competitionRef = db.collection("competitions").doc(payment.competitionId);
          const competitionSnap = await transaction.get(competitionRef);

          if (codeSnap.exists) throw new EntryCodeCollision();
          const now = Date.now();
          transaction.create(codeRef, { entryId: entryRef.id, createdAt: now });
          transaction.create(entryRef, {
            userId: payment.userId,
            competitionId: payment.competitionId,
            competitionName: payment.competitionName ?? payment.competitionId,
            entryMethod: "paid",
            status: "paid",
            paymentId: paymentDoc.id,
            uniqueCode,
            referenceNumber: uniqueCode,
            paymentReference: payment.providerChargeId,
            amount: payment.amountCents,
            currency: payment.currency,
            createdAt: now,
            paidAt: now,
          });
          transaction.update(paymentDoc.ref, {
            status: "succeeded",
            entryId: entryRef.id,
            webhookVerifiedAt: now,
          });

          if (userSnap.exists) {
            transaction.update(userRef, {
              entriesCount: Number(userSnap.data()?.entriesCount ?? 0) + 1,
              updatedAt: now,
            });
          }
          if (competitionSnap.exists) {
            transaction.update(competitionRef, {
              totalEntries: Number(competitionSnap.data()?.totalEntries ?? 0) + 1,
            });
          }
          return true;
        });
      } catch (error) {
        if (!(error instanceof EntryCodeCollision)) throw error;
      }
    }
    if (!finalized) {
      logger.error("Could not allocate a unique entry code", { paymentId: paymentDoc.id });
      res.status(500).send("Could not finalize entry");
      return;
    }

    // TODO: trigger a confirmation email here (e.g. via a transactional
    // email provider) once one is chosen.

    res.status(200).send("OK");
  }
);

export const payfastWebhook = onRequest(
  { region: FUNCTION_REGION, secrets: [PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE] },
  async (req, res) => {
    const provider = createPayFastProvider(
      PAYFAST_MERCHANT_ID.value(),
      PAYFAST_MERCHANT_KEY.value(),
      PAYFAST_PASSPHRASE.value(),
      PAYFAST_SANDBOX
    );
    const verification = provider.verifyWebhook(req.rawBody, req.headers);

    if (!verification.valid || !verification.providerReference) {
      res.status(401).send("Invalid ITN");
      return;
    }

    const validation = await fetch(payFastValidationUrl(PAYFAST_SANDBOX), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: req.rawBody,
    });
    if (!validation.ok || (await validation.text()).trim() !== "VALID") {
      logger.warn("Rejected PayFast ITN that failed server validation");
      res.status(400).send("Invalid ITN");
      return;
    }

    const paymentDoc = await db.collection("payments").doc(verification.providerReference).get();
    if (!paymentDoc.exists) {
      res.status(404).send("Payment not found");
      return;
    }
    const payment = paymentDoc.data()!;
    if (payment.status === "succeeded" || payment.status === "failed") {
      res.status(200).send("Already processed");
      return;
    }

    if (verification.eventType === "payment.failed") {
      await Promise.all([
        paymentDoc.ref.update({ status: "failed", webhookVerifiedAt: Date.now() }),
        db.collection("entries").doc(payment.entryId).update({ status: "failed" }),
      ]);
      res.status(200).send("OK");
      return;
    }

    if (verification.amountCents !== payment.amountCents) {
      res.status(400).send("Amount mismatch");
      return;
    }

    const now = Date.now();
    const referenceNumber = await generateReferenceNumber();
    await Promise.all([
      paymentDoc.ref.update({
        status: "succeeded",
        providerChargeId: verification.providerReference,
        webhookVerifiedAt: now,
      }),
      db.collection("entries").doc(payment.entryId).update({
        status: "paid",
        referenceNumber,
        paidAt: now,
      }),
    ]);
    res.status(200).send("OK");
  }
);
