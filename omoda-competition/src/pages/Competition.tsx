import { Link } from "react-router-dom";
const steps = [
  {
    title: "Register",
    body: "Create an account with your name, email and phone number.",
  },
  {
    title: "Confirm Eligibility",
    body: "Confirm you meet the entry requirements set out in the official rules (age, residency, etc.).",
  },
  {
    title: "Pay & Enter",
    body: "Pay the R100 entry fee through our secure payment provider.",
  },
  {
    title: "Get Your Reference",
    body: "Once payment is verified, you receive a unique entry reference number by email and in My Account.",
  },
];

export default function CompetitionPage() {
  return (
    <div className="container-page py-16">
      <p className="eyebrow">The Competition</p>
      <h1 className="mt-4 text-4xl md:text-5xl">Win an OMODA C5</h1>

      <div className="mt-8 flex flex-wrap items-center gap-6">
        <div className="panel inline-flex items-center gap-2 px-5 py-3">
          <span className="h-2 w-2 rounded-full bg-ignition" />
          <span className="font-mono text-sm uppercase tracking-widest2 text-silver">
            Entries Open
          </span>
        </div>
        <Link to="/enter" className="btn-primary">Enter Now — R100</Link>
      </div>

      {/* Prize details — placeholder copy, replace with confirmed specs */}
      <section className="mt-20 grid gap-12 md:grid-cols-2">
        <div>
          <h2 className="text-2xl">The Prize</h2>
          <p className="mt-4 text-silver">
            [Insert confirmed prize description here — exact model, spec level,
            colour, on-the-road costs, registration and any included extras.
            Do not publish figures that haven't been confirmed with the
            supplying dealership/importer.]
          </p>
        </div>
        <div className="panel p-6">
          <h3 className="text-base normal-case tracking-normal">Key Dates</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between border-b border-steel pb-2">
              <dt className="text-silver">Entries Open</dt>
              <dd className="font-mono">[Date]</dd>
            </div>
            <div className="flex justify-between border-b border-steel pb-2">
              <dt className="text-silver">Entries Close</dt>
              <dd className="font-mono">Open-ended</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-silver">Winner Announced</dt>
              <dd className="font-mono">[Date]</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* How it works */}
      <section className="mt-20">
        <h2 className="text-2xl">How It Works</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="panel p-6">
              <span className="font-mono text-xs text-ignition">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 text-base normal-case tracking-normal">{s.title}</h3>
              <p className="mt-2 text-sm text-silver">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Rules summary — must match the full T&Cs, drafted/approved by a lawyer */}
      <section className="mt-20 panel p-8">
        <h2 className="text-2xl">Rules Summary</h2>
        <p className="mt-4 text-sm text-silver">
          This is a summary only. The full, binding rules are set out in our{" "}
          <Link to="/terms" className="text-ignition underline">
            Terms &amp; Conditions
          </Link>
          . Placeholder points below must be confirmed by a South African
          attorney before publishing:
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-silver">
          <li>Minimum entry age and South African residency requirements</li>
          <li>Whether a free/no-purchase entry route is offered (CPA s36 review pending)</li>
          <li>How and when the winner is selected (method, independence of the draw)</li>
          <li>Maximum number of entries per person</li>
          <li>What happens if an insufficient number of valid entries are received</li>
          <li>Prize delivery, registration and tax/duty responsibilities</li>
        </ul>
      </section>
    </div>
  );
}
