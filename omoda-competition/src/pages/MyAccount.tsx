import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/firebase/config";
import type { Entry, Payment } from "@/types";

export default function MyAccount() {
  const { appUser, firebaseUser, signOut } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (!firebaseUser) return;
    const entriesQ = query(
      collection(db, "entries"),
      where("userId", "==", firebaseUser.uid),
      orderBy("createdAt", "desc")
    );
    const unsubEntries = onSnapshot(entriesQ, (snap) =>
      setEntries(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Entry, "id">) })))
    );

    const paymentsQ = query(
      collection(db, "payments"),
      where("userId", "==", firebaseUser.uid),
      orderBy("createdAt", "desc")
    );
    const unsubPayments = onSnapshot(paymentsQ, (snap) =>
      setPayments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Payment, "id">) })))
    );

    return () => {
      unsubEntries();
      unsubPayments();
    };
  }, [firebaseUser]);

  return (
    <div className="container-page py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">My Account</p>
          <h1 className="mt-3 text-4xl">{appUser?.displayName ?? "Your Dashboard"}</h1>
          <p className="mt-2 text-sm text-silver">{appUser?.email}</p>
        </div>
        <div className="flex gap-3">
          <Link to="/enter" className="btn-primary">Enter Now — R100</Link>
          <button onClick={() => signOut()} className="btn-secondary">Log Out</button>
        </div>
      </div>

      <section className="mt-14">
        <h2 className="text-xl normal-case tracking-normal">My Entries</h2>
        {entries.length === 0 ? (
          <EmptyState message="No entries yet. Your reference numbers will appear here once you enter." />
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead>
                <tr className="border-b border-steel text-xs uppercase tracking-widest2 text-silver">
                  <th className="py-3 pr-4">Reference</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Method</th>
                  <th className="py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-steel/50">
                    <td className="py-3 pr-4 font-mono">{e.referenceNumber ?? "—"}</td>
                    <td className="py-3 pr-4">
                      <StatusPill status={e.status} />
                    </td>
                    <td className="py-3 pr-4 text-silver">{e.entryMethod}</td>
                    <td className="py-3 text-silver">
                      {new Date(e.createdAt).toLocaleDateString("en-ZA")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-14">
        <h2 className="text-xl normal-case tracking-normal">Payment History</h2>
        {payments.length === 0 ? (
          <EmptyState message="No payments yet." />
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead>
                <tr className="border-b border-steel text-xs uppercase tracking-widest2 text-silver">
                  <th className="py-3 pr-4">Amount</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Provider</th>
                  <th className="py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-steel/50">
                    <td className="py-3 pr-4 font-mono">
                      R{(p.amountCents / 100).toFixed(2)}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusPill status={p.status} />
                    </td>
                    <td className="py-3 pr-4 text-silver capitalize">{p.provider}</td>
                    <td className="py-3 text-silver">
                      {new Date(p.createdAt).toLocaleDateString("en-ZA")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="mt-6 panel p-6 text-sm text-silver">{message}</p>;
}

function StatusPill({ status }: { status: string }) {
  const color =
    status === "paid" || status === "succeeded"
      ? "text-green-400"
      : status === "failed"
      ? "text-ignition"
      : "text-silver";
  return <span className={`font-mono text-xs uppercase ${color}`}>{status}</span>;
}
