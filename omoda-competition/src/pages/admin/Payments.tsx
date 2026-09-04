import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { Payment } from "@/types";

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    const q = query(collection(db, "payments"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) =>
      setPayments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Payment, "id">) })))
    );
  }, []);

  const totalSucceeded = payments
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + p.amountCents, 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl normal-case tracking-normal">Payments</h2>
        <p className="font-mono text-sm">
          Total: <span className="text-ignition">R{(totalSucceeded / 100).toFixed(2)}</span>
        </p>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-steel text-xs uppercase tracking-widest2 text-silver">
              <th className="py-3 pr-4">Amount</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Provider Charge ID</th>
              <th className="py-3 pr-4">Webhook Verified</th>
              <th className="py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-steel/50">
                <td className="py-3 pr-4 font-mono">R{(p.amountCents / 100).toFixed(2)}</td>
                <td className="py-3 pr-4">{p.status}</td>
                <td className="py-3 pr-4 font-mono text-xs text-silver">
                  {p.providerChargeId ?? "—"}
                </td>
                <td className="py-3 pr-4 text-silver">
                  {p.webhookVerifiedAt
                    ? new Date(p.webhookVerifiedAt).toLocaleString("en-ZA")
                    : "Not yet"}
                </td>
                <td className="py-3 text-silver">
                  {new Date(p.createdAt).toLocaleString("en-ZA")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.length === 0 && <p className="mt-4 text-sm text-silver">No payments yet.</p>}
      </div>
    </div>
  );
}
