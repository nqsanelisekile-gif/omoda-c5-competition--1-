import { createHmac, timingSafeEqual } from "crypto";
import type { CheckoutSession, PaymentProvider, WebhookVerificationResult } from "./types";

/**
 * Yoco "Online" checkout integration.
 *
 * Secrets (YOCO_SECRET_KEY, YOCO_WEBHOOK_SECRET) are provided via Firebase
 * Secrets Manager — see index.ts for how they're wired in — and are never
 * present in client code or committed to source control.
 */
export function createYocoProvider(secretKey: string, webhookSecret: string): PaymentProvider {
  const API_BASE = "https://payments.yoco.com/api";

  return {
    name: "yoco",

    async createCheckout({ amountCents, currency, reference, successUrl, cancelUrl, failureUrl }) {
      const res = await fetch(`${API_BASE}/checkouts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Idempotency-Key": reference,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountCents,
          currency,
          metadata: { internalReference: reference },
          successUrl,
          cancelUrl,
          failureUrl,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Yoco checkout creation failed (${res.status}): ${errText}`);
      }

      const data = (await res.json()) as { redirectUrl?: string; id?: string };
      if (!data.redirectUrl || !data.id) {
        throw new Error("Yoco returned an incomplete checkout response.");
      }
      return { checkoutUrl: data.redirectUrl, providerReference: data.id } satisfies CheckoutSession;
    },

    verifyWebhook(rawBody, headers): WebhookVerificationResult {
      const getHeader = (name: string) => {
        const value = headers[name];
        return Array.isArray(value) ? value[0] : value;
      };
      const webhookId = getHeader("webhook-id");
      const timestamp = getHeader("webhook-timestamp");
      const signatureHeader = getHeader("webhook-signature");

      if (!webhookId || !timestamp || !signatureHeader) {
        return { valid: false, eventType: "unknown", providerReference: null, internalReference: null, amountCents: null, currency: null };
      }

      const timestampSeconds = Number(timestamp);
      if (!Number.isInteger(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 180) {
        return { valid: false, eventType: "unknown", providerReference: null, internalReference: null, amountCents: null, currency: null };
      }

      const secretBytes = Buffer.from(webhookSecret.replace(/^whsec_/, ""), "base64");
      const signedContent = `${webhookId}.${timestamp}.${rawBody.toString("utf8")}`;
      const expected = createHmac("sha256", secretBytes).update(signedContent).digest("base64");
      const valid = signatureHeader.split(" ").some((candidate) => {
        const signature = candidate.replace(/^v\d+,/, "");
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expected);
        return sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf);
      });

      if (!valid) {
        return { valid: false, eventType: "unknown", providerReference: null, internalReference: null, amountCents: null, currency: null };
      }

      let payload: {
        type: string;
        payload?: {
          id?: string;
          amount?: number;
          currency?: string;
          status?: string;
          metadata?: { internalReference?: string };
        };
      };
      try {
        payload = JSON.parse(rawBody.toString("utf8")) as typeof payload;
      } catch {
        return { valid: false, eventType: "unknown", providerReference: null, internalReference: null, amountCents: null, currency: null };
      }

      const eventType =
        payload.type === "payment.succeeded"
          ? "payment.succeeded"
          : payload.type === "payment.failed"
          ? "payment.failed"
          : "unknown";

      return {
        valid: true,
        eventType,
        providerReference: payload.payload?.id ?? null,
        internalReference: payload.payload?.metadata?.internalReference ?? null,
        amountCents: payload.payload?.amount ?? null,
        currency: payload.payload?.currency ?? null,
      };
    },
  };
}
