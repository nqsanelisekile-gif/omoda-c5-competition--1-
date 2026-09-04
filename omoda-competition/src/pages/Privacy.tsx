export default function Privacy() {
  return (
    <div className="container-page max-w-3xl py-16">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-4 text-4xl">Privacy Policy</h1>

      <div className="mt-6 panel border-ignition/40 p-6">
        <p className="text-sm text-silver">
          <strong className="text-bone">Placeholder document.</strong> This
          must be reviewed against the Protection of Personal Information
          Act (POPIA) by a South African attorney, and should reflect your
          registered Information Officer's details, before launch.
        </p>
      </div>

      <div className="mt-10 space-y-8 text-sm text-silver">
        <Section title="1. Responsible Party">
          [Legal entity name and Information Officer contact details,
          registered with the Information Regulator.]
        </Section>
        <Section title="2. What We Collect">
          Name, email address, phone number, and payment-related metadata
          (not full card details — those are handled entirely by our
          payment provider).
        </Section>
        <Section title="3. Why We Collect It">
          To process competition entries, verify eligibility and payment,
          contact winners, and comply with legal and record-keeping
          obligations.
        </Section>
        <Section title="4. Legal Basis for Processing">
          [Consent / performance of a contract / legitimate interest — to be
          confirmed per processing activity.]
        </Section>
        <Section title="5. Third Parties">
          Firebase/Google Cloud (hosting and data storage) and our payment
          provider (payment processing only). [List any others, and note
          cross-border transfer safeguards under POPIA s72 if data leaves
          South Africa.]
        </Section>
        <Section title="6. Security Measures">
          Data is stored using Firebase's access-controlled infrastructure.
          Payment card data is never handled or stored by us directly.
        </Section>
        <Section title="7. Your Rights">
          You may request access to, correction of, or deletion of your
          personal information, and may object to certain processing,
          subject to our legal retention obligations. [Insert request
          process and contact details.]
        </Section>
        <Section title="8. Data Retention">
          [How long entry, payment and account data is kept, and why.]
        </Section>
        <Section title="9. Complaints">
          You have the right to lodge a complaint with the Information
          Regulator of South Africa if you believe your information has
          been processed unlawfully.
        </Section>
        <Section title="10. Changes to This Policy">
          [How and where updates will be communicated.]
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base normal-case tracking-normal text-bone">{title}</h2>
      <p className="mt-2">{children}</p>
    </section>
  );
}
