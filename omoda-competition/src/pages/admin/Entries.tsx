import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { Entry } from "@/types";

export default function AdminEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(collection(db, "entries"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) =>
      setEntries(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Entry, "id">) })))
    );
  }, []);

  const filtered = entries.filter(
    (e) =>
      !search ||
      e.referenceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      e.userId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl normal-case tracking-normal">Entries</h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reference or user ID…"
          className="input !w-64"
        />
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-steel text-xs uppercase tracking-widest2 text-silver">
              <th className="py-3 pr-4">Reference</th>
              <th className="py-3 pr-4">User</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Method</th>
              <th className="py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-b border-steel/50">
                <td className="py-3 pr-4 font-mono">{e.referenceNumber ?? "—"}</td>
                <td className="py-3 pr-4 font-mono text-xs text-silver">{e.userId}</td>
                <td className="py-3 pr-4">{e.status}</td>
                <td className="py-3 pr-4 text-silver">{e.entryMethod}</td>
                <td className="py-3 text-silver">
                  {new Date(e.createdAt).toLocaleString("en-ZA")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="mt-4 text-sm text-silver">No entries found.</p>}
      </div>
    </div>
  );
}
