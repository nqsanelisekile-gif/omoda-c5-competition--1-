import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { AuditLogEntry } from "@/types";

export default function AdminAuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    const q = query(collection(db, "auditLogs"), orderBy("timestamp", "desc"), limit(200));
    return onSnapshot(q, (snap) =>
      setLogs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AuditLogEntry, "id">) })))
    );
  }, []);

  return (
    <div>
      <h2 className="text-xl normal-case tracking-normal">Audit Log</h2>
      <p className="mt-2 max-w-xl text-sm text-silver">
        Read-only. Entries here are written exclusively by Cloud Functions
        performing sensitive actions (role changes, winner selection) —
        never directly by client code — so this log can't be tampered with
        from the browser.
      </p>

      <div className="mt-6 space-y-2">
        {logs.map((l) => (
          <div key={l.id} className="panel flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div>
              <span className="font-mono text-ignition">{l.action}</span>
              <span className="ml-3 text-silver">target: {l.targetId}</span>
            </div>
            <div className="text-xs text-silver">
              by {l.adminUid} · {new Date(l.timestamp).toLocaleString("en-ZA")}
            </div>
          </div>
        ))}
        {logs.length === 0 && <p className="text-sm text-silver">No audit events yet.</p>}
      </div>
    </div>
  );
}
