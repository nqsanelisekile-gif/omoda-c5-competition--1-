import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/firebase/config";
import type { AppUser } from "@/types";

export default function AdminUsers() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState("");
  const [busyUid, setBusyUid] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => setUsers(snap.docs.map((d) => d.data() as AppUser)));
  }, []);

  async function toggleAdmin(uid: string, makeAdmin: boolean) {
    setBusyUid(uid);
    try {
      // Role changes MUST go through a Cloud Function that itself checks
      // the caller is an existing admin (see functions/src/admin.ts).
      // Firestore rules block clients from writing their own `role` field
      // directly, so there is no client-only path to self-promote.
      const setUserRole = httpsCallable<{ uid: string; role: "admin" | "user" }, void>(
        functions,
        "setUserRole"
      );
      await setUserRole({ uid, role: makeAdmin ? "admin" : "user" });
    } finally {
      setBusyUid(null);
    }
  }

  const filtered = users.filter(
    (u) =>
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.displayName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl normal-case tracking-normal">Users</h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email…"
          className="input !w-64"
        />
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-steel text-xs uppercase tracking-widest2 text-silver">
              <th className="py-3 pr-4">Name</th>
              <th className="py-3 pr-4">Email</th>
              <th className="py-3 pr-4">Role</th>
              <th className="py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.uid} className="border-b border-steel/50">
                <td className="py-3 pr-4">{u.displayName}</td>
                <td className="py-3 pr-4 text-silver">{u.email}</td>
                <td className="py-3 pr-4 font-mono text-xs">{u.role}</td>
                <td className="py-3">
                  <button
                    disabled={busyUid === u.uid}
                    onClick={() => toggleAdmin(u.uid, u.role !== "admin")}
                    className="btn-secondary !px-3 !py-1.5 !text-xs"
                  >
                    {u.role === "admin" ? "Revoke Admin" : "Make Admin"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="mt-4 text-sm text-silver">No users found.</p>}
      </div>
    </div>
  );
}
