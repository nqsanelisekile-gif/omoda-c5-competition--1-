import { useState, type FormEvent } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase/config";

export default function AdminWinners() {
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    const form = new FormData(e.currentTarget);
    try {
      // Recording a winner goes through a Cloud Function, not a direct
      // Firestore write, so there's a single authoritative, audit-logged
      // path for something this consequential (see functions/src/admin.ts
      // -> recordWinner, which also writes to /auditLogs).
      const recordWinner = httpsCallable(functions, "recordWinner");
      await recordWinner({
        competitionId: form.get("competitionId"),
        entryId: form.get("entryId"),
        prizeDescription: form.get("prizeDescription"),
        proofOfDrawUrl: form.get("proofOfDrawUrl") || null,
      });
      setStatus("Winner recorded and published.");
      e.currentTarget.reset();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to record winner.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl normal-case tracking-normal">Record Winner</h2>
      <p className="mt-2 max-w-xl text-sm text-silver">
        This publishes the Winner page and is logged in the audit log. Use
        the entry reference to look up the correct entry ID in the Entries
        tab first.
      </p>

      <form onSubmit={handleSubmit} className="panel mt-6 max-w-lg space-y-4 p-6">
        <Input name="competitionId" label="Competition ID" required />
        <Input name="entryId" label="Winning Entry ID" required />
        <Input name="prizeDescription" label="Prize Description" required />
        <Input name="proofOfDrawUrl" label="Proof of Draw URL (optional)" />

        {status && <p className="text-sm text-silver">{status}</p>}

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Recording…" : "Record & Publish Winner"}
        </button>
      </form>
    </div>
  );
}

function Input({
  name,
  label,
  ...rest
}: { name: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-widest2 text-silver">{label}</span>
      <input name={name} className="input" {...rest} />
    </label>
  );
}
