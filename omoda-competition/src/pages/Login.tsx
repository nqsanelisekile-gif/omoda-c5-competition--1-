import { useState, type FormEvent } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname || "/account";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signIn") {
        await signIn(email, password);
      } else {
        await signUp(email, password, firstName, lastName, phone);
      }
      navigate(from, { replace: true });
    } catch (err) {
      const code = typeof err === "object" && err !== null && "code" in err
        ? String(err.code)
        : "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        setError("Incorrect email or password.");
      } else if (code === "auth/operation-not-allowed") {
        setError("Email and password sign-in is not enabled for this Firebase project.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container-page flex min-h-[80vh] items-center justify-center py-16">
      <div className="w-full max-w-md">
        <p className="eyebrow text-center">
          {mode === "signIn" ? "Welcome Back" : "Create Your Account"}
        </p>
        <h1 className="mt-3 text-center text-3xl">
          {mode === "signIn" ? "Log In" : "Sign Up"}
        </h1>

        <form onSubmit={handleSubmit} className="panel mt-8 space-y-5 p-8">
          {mode === "signUp" && (
            <>
              <Field label="First Name">
                <input
                  required
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="input"
                  autoComplete="given-name"
                />
              </Field>
              <Field label="Last Name">
                <input required type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="input" autoComplete="family-name" />
              </Field>
              <Field label="Phone">
                <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" autoComplete="tel" />
              </Field>
            </>
          )}
          <Field label="Email">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              autoComplete="email"
            />
          </Field>
          <Field label="Password">
            <input
              required
              minLength={8}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
            />
          </Field>

          {error && (
            <p role="alert" className="text-sm text-ignition">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Please wait…" : mode === "signIn" ? "Log In" : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-silver">
          {mode === "signIn" ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
            className="text-ignition underline"
          >
            {mode === "signIn" ? "Create an account" : "Log in"}
          </button>
        </p>
        <p className="mt-2 text-center text-xs text-silver">
          By continuing you agree to our{" "}
          <Link to="/terms" className="underline">Terms</Link> and{" "}
          <Link to="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-widest2 text-silver">
        {label}
      </span>
      {children}
    </label>
  );
}
