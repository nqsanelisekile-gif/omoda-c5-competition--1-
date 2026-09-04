import { useEffect, useState } from "react";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { db } from "@/firebase/config";

export default function Overview() {
  const [stats, setStats] = useState<{ entries: number; paidEntries: number; users: number } | null>(null);

  useEffect(() => {
    async function load() {
      const [entriesSnap, paidSnap, usersSnap] = await Promise.all([
        getCountFromServer(collection(db, "entries")),
        getCountFromServer(query(collection(db, "entries"), where("status", "==", "paid"))),
        getCountFromServer(collection(db, "users")),
      ]);
      setStats({
        entries: entriesSnap.data().count,
        paidEntries: paidSnap.data().count,
        users: usersSnap.data().count,
      });
    }
    load();
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label="Total Entries" value={stats?.entries} />
      <StatCard label="Paid Entries" value={stats?.paidEntries} />
      <StatCard label="Registered Users" value={stats?.users} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value?: number }) {
  return (
    <div className="panel p-6">
      <p className="text-xs uppercase tracking-widest2 text-silver">{label}</p>
      <p className="mt-2 font-mono text-3xl">{value ?? "—"}</p>
    </div>
  );
}
