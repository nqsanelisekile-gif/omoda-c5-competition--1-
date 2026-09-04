/**
 * Payment provider abstraction. Implement this interface for any South
 * African PSP (Yoco, PayFast, Peach Payments, etc.) and swap providers in
 * payments.ts without touching the rest of the app. This is the "modular"
 * seam requested — createEntrySession() and the webhook handler only ever
 * talk to this interface, never to a specific SDK directly.
 */
export interface CheckoutSession {
  checkoutUrl: string;
  providerReference: string; // provider's id for this checkout/charge
  formFields?: Record<string, string>;
}

export interface WebhookVerificationResult {
  valid: boolean;
  eventType: "payment.succeeded" | "payment.failed" | "unknown";
  providerReference: string | null;
  internalReference: string | null;
  amountCents: number | null;
  currency: string | null;
}

export interface PaymentProvider {
  readonly name: string;

  /** Create a hosted checkout session and return the URL to redirect the user to. */
  createCheckout(params: {
    amountCents: number;
    currency: "ZAR";
    reference: string; // our internal paymentId, passed through as metadata
    successUrl: string;
    cancelUrl: string;
    failureUrl: string;
  }): Promise<CheckoutSession>;

  /**
   * Verify an incoming webhook's authenticity (e.g. HMAC signature check)
   * and extract the outcome. MUST reject anything that isn't provably from
   * the provider — this is the function that stands between "someone POSTed
   * to our webhook claiming success" and actually marking an entry paid.
   */
  verifyWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): WebhookVerificationResult;
}
