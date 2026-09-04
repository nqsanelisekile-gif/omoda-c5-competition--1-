import { useState, type FormEvent } from "react";

export default function Contact() {
  const [sent, setSent] = useState(false);

  // TODO: wire to a Cloud Function that emails the enquiry / writes to a
  // /contactMessages collection. Never write directly from client to a
  // collection an admin trusts without validation.
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div className="container-page max-w-2xl py-16">
      <p className="eyebrow">Get In Touch</p>
      <h1 className="mt-4 text-4xl">Contact Us</h1>
      <p className="mt-4 text-silver">
        Questions about your entry, payment, or the competition rules? We're
        here to help.
      </p>

      {sent ? (
        <div className="panel mt-10 p-8 text-center">
          <p className="text-bone">Thanks — we've received your message.</p>
          <p className="mt-2 text-sm text-silver">
            We aim to respond within 2 business days.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="panel mt-10 space-y-5 p-8">
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-widest2 text-silver">Name</span>
            <input required type="text" className="input" />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-widest2 text-silver">Email</span>
            <input required type="email" className="input" />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-widest2 text-silver">Message</span>
            <textarea required rows={5} className="input" />
          </label>
          <button type="submit" className="btn-primary w-full">Send Message</button>
        </form>
      )}
    </div>
  );
}
