import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { useAuth } from "@/contexts/AuthContext";
import { functions } from "@/firebase/config";
import type { Competition } from "@/types";

type Step = "eligibility" | "payment" | "redirecting";

interface CreateEntrySessionResponse {
  paymentId: string;
  checkoutUrl: string;
  formFields?: Record<string, string>;
}

function toUserFacingCallableError(error: unknown, fallback: string) {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "";
  if (code === "functions/unauthenticated") return "Please sign in before starting payment.";
  if (code === "functions/not-found") return "There is no active competition available right now.";
  if (code === "functions/failed-precondition") return "This competition is not currently available for entry.";
  if (import.meta.env.DEV) console.error("Callable function failed:", error);
  return fallback;
}

export default function EnterNow() {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("eligibility");
  const [eligible, setEligible] = useState({ age: false, resident: false, rules: false });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [competition, setCompetition] = useState<(Competition & { id: string }) | null>(null);
  const [loadingCompetition, setLoadingCompetition] = useState(true);

  const allEligible = eligible.age && eligible.resident && eligible.rules;

  useEffect(() => {
    async function loadCompetition() {
      try {
        const getActiveCompetition = httpsCallable<void, Competition>(functions, "getActiveCompetition");
        const result = await getActiveCompetition();
        setCompetition(result.data);
      } catch (err) {
        setError(toUserFacingCallableError(err, "Unable to load the active competition."));
      } finally {
        setLoadingCompetition(false);
      }
    }
    void loadCompetition();
  }, []);

  async function startPayment() {
    if (!firebaseUser) {
      navigate("/login", { state: { from: { pathname: "/enter" } } });
      return;
    }
    setError(null);
    if (!competition) {
      setError("There is no active competition available right now.");
      return;
    }
    setSubmitting(true);
    try {
      // This Cloud Function creates only a pending payment record, calls the
      // PSP, and returns its hosted checkout URL. The final /entries document
      // is created only by the verified Yoco webhook.
      // The client NEVER marks the entry/payment as paid — only the PSP's
      // signed webhook (verified in a separate Cloud Function) can do that.
      const idToken = await firebaseUser.getIdToken();
      const response = await fetch("/api/yoco/create-checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ competitionId: competition.id }),
      });
      const result = (await response.json()) as CreateEntrySessionResponse & { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to start payment.");
      }
      setStep("redirecting");
      if (result.formFields) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = result.checkoutUrl;
        Object.entries(result.formFields).forEach(([name, value]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = name;
          input.value = value;
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
      } else {
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      setError(toUserFacingCallableError(err, "Unable to start payment. Please try again."));
      setSubmitting(false);
    }
  }

  return (
    <div className="container-page py-16">
      <p className="eyebrow">Enter Now</p>
      <h1 className="mt-4 text-4xl md:text-5xl">Secure Your Entry</h1>

      <div className="mt-4 flex gap-2 text-xs uppercase tracking-widest2 text-silver">
        <StepBadge active={step === "eligibility"} done={step !== "eligibility"} label="1. Eligibility" />
        <span>—</span>
        <StepBadge active={step === "payment"} done={step === "redirecting"} label="2. Payment" />
        <span>—</span>
        <StepBadge active={step === "redirecting"} done={false} label="3. Confirmation" />
      </div>

      {step === "eligibility" && (
        <div className="panel mt-10 max-w-xl space-y-5 p-8">
          <h2 className="text-xl normal-case tracking-normal">Confirm Your Eligibility</h2>
          <p className="text-sm text-silver">
            You must confirm all of the following to proceed, in line with the
            official{" "}
            <a href="/terms" className="text-ignition underline">Terms &amp; Conditions</a>.
          </p>

          <CheckRow
            checked={eligible.age}
            onChange={(v) => setEligible((s) => ({ ...s, age: v }))}
            label="I am 18 years or older."
          />
          <CheckRow
            checked={eligible.resident}
            onChange={(v) => setEligible((s) => ({ ...s, resident: v }))}
            label="I am a South African resident, as required by the official rules."
          />
          <CheckRow
            checked={eligible.rules}
            onChange={(v) => setEligible((s) => ({ ...s, rules: v }))}
            label="I have read and accept the Terms & Conditions and Privacy Policy."
          />

          <button
            disabled={!allEligible}
            onClick={() => setStep("payment")}
            className="btn-primary w-full"
          >
            Continue to Payment
          </button>
        </div>
      )}

      {step === "payment" && (
        <div className="panel mt-10 max-w-xl space-y-6 p-8">
          <h2 className="text-xl normal-case tracking-normal">Payment</h2>
          <div className="flex items-center justify-between border-b border-steel pb-4">
            <span className="text-silver">Entry Fee</span>
            <span className="font-mono text-lg">
              {competition ? `R${(competition.entryFeeCents / 100).toFixed(2)}` : "Loading…"}
            </span>
          </div>
          <p className="text-sm text-silver">
            You'll be redirected to our payment provider's secure checkout.
            We never see or store your card details. Your entry is confirmed
            only once payment is verified — this can take a few moments after
            you complete checkout.
          </p>

          {error && <p role="alert" className="text-sm text-ignition">{error}</p>}

          <button
            onClick={startPayment}
            disabled={submitting || loadingCompetition || !competition}
            className="btn-primary w-full"
          >
            {submitting
              ? "Redirecting…"
              : competition
                ? `Continue to Pay R${(competition.entryFeeCents / 100).toFixed(2)}`
                : "Continue to Pay"}
          </button>
          <button onClick={() => setStep("eligibility")} className="btn-secondary w-full">
            Back
          </button>
        </div>
      )}

      {step === "redirecting" && (
        <div className="panel mt-10 max-w-xl p-8 text-center">
          <p className="text-silver">Redirecting you to secure checkout…</p>
        </div>
      )}
    </div>
  );
}

function StepBadge({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <span className={active ? "text-ignition" : done ? "text-bone" : "text-silver"}>
      {label}
    </span>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-start gap-3 text-sm text-silver">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-ignition"
      />
      <span>{label}</span>
    </label>
  );
}
