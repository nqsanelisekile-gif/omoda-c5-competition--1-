# OMODA C5 Competition Platform

A premium South African car-competition website: React + TypeScript + Vite +
Tailwind CSS on the frontend, Firebase (Auth, Firestore, Storage, Cloud
Functions) on the backend.

## ⚠️ Before you launch — legal review required

This codebase is engineered so payments and entries can't be faked from the
browser, but **it does not and cannot resolve the legal questions around
running a paid-entry car competition in South Africa.** Get a South African
attorney to review, specifically:

1. **Lotteries Act vs. Consumer Protection Act s36.** A paid-entry-only
   competition (no free/no-purchase entry route) risks being classified as
   an unlicensed lottery. Many SA "win a car" competitions add a free postal
   or SMS entry method to fall under the CPA's promotional-competition
   exemption instead. The schema here (`Entry.entryMethod`,
   `Competition.freeEntryMethod`) already supports adding that without a
   migration — but the actual legal decision has to be made by a lawyer.
2. **POPIA** — lawful basis for processing, Information Officer
   registration, cross-border data transfer (Firebase/Google Cloud may store
   data outside South Africa), data subject rights.
3. **Advertising claims** — ASA rules on promotional advertising, accuracy
   of prize/odds claims.
4. **Payment provider agreement** — Yoco (or your chosen PSP)'s merchant
   terms, PCI-DSS scope, settlement/refund terms.

`Terms.tsx`, `Privacy.tsx`, `Competition.tsx`, and `Faq.tsx` all contain
`[bracketed placeholder]` copy marking exactly what needs lawyer-approved
content before going live. Nothing with legal weight has been invented.

---

## Architecture

```
Frontend (Vite/React/TS/Tailwind)
  │
  ├─ Firebase Auth        → email/password sign-up & login
  ├─ Firestore (client)   → reads competitions/entries/payments/faqs/winners
  │                          (rules restrict what it can WRITE — see below)
  └─ Cloud Functions (callable) → the only way to:
       • create an entry + start a payment (createEntrySession)
       • change a user's role (setUserRole)
       • record a winner (recordWinner)

Cloud Functions (server, Admin SDK — fully trusted)
  ├─ createEntrySession   → creates pending entry+payment, opens PSP checkout
  ├─ yocoWebhook           → PSP → us, HMAC-verified, ONLY place that marks
  │                          an entry "paid" and issues a reference number
  ├─ setUserRole           → admin-only, audit-logged
  └─ recordWinner          → admin-only, validates entry is paid, audit-logged
```

**The core security principle:** the browser can ask to start a payment and
can read the result, but it can never assert that a payment succeeded. Only
a cryptographically verified webhook from the payment provider can do that
(see `functions/src/payments.ts` and `firestore/firestore.rules`).

### Firestore schema

See `src/types/index.ts` for the full annotated schema (`users`,
`competitions`, `entries`, `payments`, `winners`, `faqs`, `auditLogs`).
Money is stored in cents to avoid float errors; every field a client could
misuse to fake a payment is blocked at the Firestore rules layer *and*
never accepted by any Cloud Function from client input.

---

## Project structure

```
src/
  pages/            All 10 public pages + admin/ subfolder (8 admin views)
  components/       Navbar, Footer, CountdownTimer, route guards
  contexts/         AuthContext (Firebase Auth + Firestore user profile)
  hooks/            useCountdown
  firebase/config.ts
  types/index.ts    Full schema, shared conceptually with functions/

functions/
  src/
    payments.ts        createEntrySession, yocoWebhook
    adminActions.ts    setUserRole, recordWinner (+ audit logging)
    providers/         PaymentProvider interface + Yoco implementation
    referenceNumber.ts Transactional unique reference generator

firestore/
  firestore.rules       Security rules (see inline comments — this is the
                         actual enforcement, not the frontend code)
  storage.rules
  firestore.indexes.json
```

---

## Setup

### 1. Frontend

```bash
npm install
cp .env.example .env.local   # fill in Firebase config from the console
npm run dev
```

### 2. Firebase project

```bash
npm install -g firebase-tools
firebase login
firebase init   # select Firestore, Functions, Storage, Hosting
                 # point Firestore/Storage rules at firestore/firestore.rules
                 # and firestore/storage.rules (already configured in firebase.json)
```

### 3. Cloud Functions

```bash
cd functions
npm install

# Secrets — never put these in .env files that get committed:
firebase functions:secrets:set YOCO_SECRET_KEY
firebase functions:secrets:set YOCO_WEBHOOK_SECRET

# Put these in functions/.env (server-side configuration only)
APP_BASE_URL=https://your-domain.example
PAYMENT_PROVIDER=yoco

# PayFast credentials (required when PAYMENT_PROVIDER=payfast)
firebase functions:secrets:set PAYFAST_MERCHANT_ID
firebase functions:secrets:set PAYFAST_MERCHANT_KEY
firebase functions:secrets:set PAYFAST_PASSPHRASE

npm run build
firebase deploy --only functions
```

Set `PAYMENT_PROVIDER=payfast` and `PAYFAST_SANDBOX=true` while testing. Set
`PAYFAST_NOTIFY_URL` to the deployed `payfastWebhook` URL, then register that
same URL in the PayFast merchant dashboard. PayFast sends an ITN to this URL;
the function validates the signature and asks PayFast to validate the full
notification before updating the entry.

For Yoco deployments, keep `PAYMENT_PROVIDER=yoco` and register the deployed
`yocoWebhook` function URL in Yoco's Checkout API webhook settings. The
webhook subscription returns the `whsec_...` secret once; store that value
with `firebase functions:secrets:set YOCO_WEBHOOK_SECRET`.

The integration uses Yoco's current Checkout API endpoint
`POST https://payments.yoco.com/api/checkouts`, redirects to its returned
`redirectUrl`, and verifies webhook signatures using the documented
`webhook-id`, `webhook-timestamp`, and `webhook-signature` headers. Only the
verified webhook can mark an entry paid.

### 4. Deploy rules & hosting

```bash
firebase deploy --only firestore:rules,storage,hosting
```

### 5. First admin user

There's intentionally no way to become an admin through the UI (that would
be a privilege-escalation hole). Promote your first admin manually once,
directly in the Firebase console or via the CLI:

```bash
# Firestore: set users/{uid}.role = "admin" for your account, OR
# run this once via `firebase functions:shell`:
#   setUserRole({ uid: "<your-uid>", role: "admin" })
# (only works if you're already an admin — for the very first admin,
# edit the Firestore document directly instead)
```

---

## What's stubbed vs. production-ready

| Area | Status |
|---|---|
| Pages, routing, design system | Built, typechecks, builds cleanly |
| Auth (sign up/in/out, role loading) | Functional |
| Firestore security rules | Written, needs `firebase deploy` + testing with the emulator suite before trusting in production |
| Entry/payment flow (client) | Functional, calls the callable function |
| `createEntrySession` / `yocoWebhook` | Structurally complete; **Yoco endpoint/webhook details need verification against current docs** before first real transaction |
| Admin dashboard | Functional CRUD for competitions/FAQs/entries/payments/users; winner recording and role changes are audit-logged |
| Confirmation emails | Not implemented — `TODO` left in `payments.ts` where a transactional email call belongs |
| Terms / Privacy / competition rules copy | Placeholder structure only — **do not publish without lawyer-approved content** |
| Hero/car imagery | Placeholder `<img>` paths (`/omoda-c5-hero.jpg` etc.) — add licensed images to `public/` |

## Recommended next steps

1. Get the legal review (see top of this file) — this determines your entry
   model, which affects copy on Home, Competition, Enter Now, and Terms.
2. Confirm Yoco's current API against their docs and test with their sandbox.
3. Run `firebase emulators:start` and test the full entry → payment →
   webhook → confirmation flow end-to-end before deploying rules to
   production.
4. Add real OMODA C5 imagery (licensed/supplied by the dealership or
   importer) to replace the placeholder image paths.
5. Wire up a transactional email provider for entry confirmations.
