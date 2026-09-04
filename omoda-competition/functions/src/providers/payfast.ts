import { createHash, timingSafeEqual } from "crypto";
import type { CheckoutSession, PaymentProvider, WebhookVerificationResult } from "./types";

const LIVE_URL = "https://www.payfast.co.za/eng/process";
const SANDBOX_URL = "https://sandbox.payfast.co.za/eng/process";

function encode(value: string) {
  return encodeURIComponent(value).replace(/%20/g, "+");
}

function createSignature(fields: Record<string, string>, passphrase: string) {
  const pairs = Object.entries(fields)
    .filter(([key, value]) => key !== "signature" && value !== "")
    .map(([key, value]) => `${key}=${encode(value)}`);
  if (passphrase) pairs.push(`passphrase=${encode(passphrase)}`);
  return createHash("md5").update(pairs.join("&")).digest("hex");
}

export function createPayFastProvider(
  merchantId: string,
  merchantKey: string,
  passphrase: string,
  sandbox = false
): PaymentProvider {
  const checkoutUrl = sandbox ? SANDBOX_URL : LIVE_URL;

  return {
    name: "payfast",

    async createCheckout({ amountCents, reference, successUrl, cancelUrl }) {
      const fields: Record<string, string> = {
        merchant_id: merchantId,
        merchant_key: merchantKey,
        return_url: successUrl,
        cancel_url: cancelUrl,
        notify_url: process.env.PAYFAST_NOTIFY_URL ?? "https://your-region-your-project.cloudfunctions.net/payfastWebhook",
        name_first: "DriveMyDream",
        item_name: "DriveMyDream competition entry",
        m_payment_id: reference,
        amount: (amountCents / 100).toFixed(2),
        email_confirmation: "1",
      };
      return {
        checkoutUrl,
        providerReference: reference,
        formFields: { ...fields, signature: createSignature(fields, passphrase) },
      } satisfies CheckoutSession;
    },

    verifyWebhook(rawBody, headers): WebhookVerificationResult {
      const contentType = headers["content-type"];
      if (contentType && String(contentType).split(";")[0] !== "application/x-www-form-urlencoded") {
        return { valid: false, eventType: "unknown", providerReference: null, internalReference: null, amountCents: null, currency: null };
      }
      const fields = Object.fromEntries(new URLSearchParams(rawBody.toString("utf8")));
      const received = fields.signature ?? "";
      const expected = createSignature(fields, passphrase);
      const receivedBuffer = Buffer.from(received, "utf8");
      const expectedBuffer = Buffer.from(expected, "utf8");
      const valid = receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
      if (!valid || fields.merchant_id !== merchantId || fields.merchant_key !== merchantKey) {
        return { valid: false, eventType: "unknown", providerReference: null, internalReference: null, amountCents: null, currency: null };
      }
      const amount = Number(fields.amount);
      return {
        valid: true,
        eventType: fields.payment_status === "COMPLETE" ? "payment.succeeded" : "payment.failed",
        providerReference: fields.m_payment_id ?? null,
        internalReference: null,
        amountCents: Number.isFinite(amount) ? Math.round(amount * 100) : null,
        currency: "ZAR",
      };
    },
  };
}

export function payFastValidationUrl(sandbox = false) {
  return `${sandbox ? "https://sandbox.payfast.co.za" : "https://www.payfast.co.za"}/eng/query/validate`;
}
