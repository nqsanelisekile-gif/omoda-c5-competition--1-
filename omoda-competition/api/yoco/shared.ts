import { createHmac, timingSafeEqual } from "node:crypto";

export const ENTRY_AMOUNT_CENTS = 10_000;
export const ENTRY_CURRENCY = "ZAR";

export function requiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function verifyYocoWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>) {
  const getHeader = (name: string) => {
    const value = headers[name];
    return Array.isArray(value) ? value[0] : value;
  };
  const webhookId = getHeader("webhook-id");
  const timestamp = getHeader("webhook-timestamp");
  const signatureHeader = getHeader("webhook-signature");
  const secret = requiredEnvironment("YOCO_WEBHOOK_SECRET");

  if (!webhookId || !timestamp || !signatureHeader) return false;
  const timestampSeconds = Number(timestamp);
  if (!Number.isInteger(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 180) {
    return false;
  }

  const signedContent = `${webhookId}.${timestamp}.${rawBody.toString("utf8")}`;
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", secretBytes).update(signedContent).digest("base64");
  return signatureHeader.split(" ").some((candidate) => {
    const signature = candidate.replace(/^v\d+,/, "");
    const signatureBytes = Buffer.from(signature);
    const expectedBytes = Buffer.from(expected);
    return signatureBytes.length === expectedBytes.length && timingSafeEqual(signatureBytes, expectedBytes);
  });
}

export async function createYocoCheckout(params: {
  paymentId: string;
  entryId: string;
  competitionId: string;
  appBaseUrl: string;
}) {
  const secretKey = requiredEnvironment("YOCO_SECRET_KEY");
  const response = await fetch("https://payments.yoco.com/api/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Idempotency-Key": params.paymentId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: ENTRY_AMOUNT_CENTS,
      currency: ENTRY_CURRENCY,
      successUrl: `${params.appBaseUrl}/payment-result?paymentId=${params.paymentId}`,
      cancelUrl: `${params.appBaseUrl}/payment-result?paymentId=${params.paymentId}&cancelled=1`,
      failureUrl: `${params.appBaseUrl}/payment-result?paymentId=${params.paymentId}&failed=1`,
      metadata: {
        paymentId: params.paymentId,
        entryId: params.entryId,
        competitionId: params.competitionId,
      },
      clientReferenceId: params.paymentId,
      externalId: params.paymentId,
      lineItems: [{
        displayName: "DRIVRYOURDREAM competition entry",
        quantity: 1,
        pricingDetails: { price: ENTRY_AMOUNT_CENTS },
      }],
    }),
  });

  if (!response.ok) {
    console.error("Yoco checkout creation failed", { status: response.status });
    throw new Error("Yoco checkout creation failed.");
  }
  const data = (await response.json()) as { id?: string; redirectUrl?: string };
  if (!data.id || !data.redirectUrl) throw new Error("Yoco returned an incomplete checkout.");
  return { checkoutId: data.id, redirectUrl: data.redirectUrl };
}

export async function readRawBody(request: AsyncIterable<Uint8Array>) {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    length += buffer.length;
    if (length > 1_000_000) throw new Error("Webhook payload is too large.");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}