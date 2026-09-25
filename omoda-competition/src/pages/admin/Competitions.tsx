import { useEffect, useState, type FormEvent } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import type { Competition, CompetitionStatus } from "@/types";

export default function AdminCompetitions() {
  const { firebaseUser } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "competitions"), orderBy("updatedAt", "desc"));
    return onSnapshot(q, (snap) =>
      setCompetitions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Competition, "id">) })))
    );
  }, []);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!firebaseUser) return;
    const form = new FormData(e.currentTarget);
    const imageFile = form.get("image") as File | null;

    let imageUrl = "";
    if (imageFile && imageFile.size > 0) {
      const storageRef = ref(storage, `competitions/${crypto.randomUUID()}-${imageFile.name}`);
      await uploadBytes(storageRef, imageFile);
      imageUrl = await getDownloadURL(storageRef);
    }

    // NOTE: Firestore security rules must restrict writes to /competitions
    // to role == "admin" — see firestore/firestore.rules. This is a
    // legitimate direct client write (unlike payment status) because it's
    // gated purely by role, not by an external system of record.
    await addDoc(collection(db, "competitions"), {
      title: form.get("title"),
      name: form.get("title"),
      description: form.get("description"),
      prize: form.get("carModel"),
      carModel: form.get("carModel"),
      images: imageUrl ? [imageUrl] : [],
      entryFeeCents: Number(form.get("entryFeeCents")) || 10000,
      entryPrice: Number(form.get("entryFeeCents")) || 10000,
      currency: "ZAR",
      startDate: Date.now(),
      ...(form.get("closingAt")
        ? {
            closingAt: new Date(form.get("closingAt") as string).getTime(),
            endDate: new Date(form.get("closingAt") as string).getTime(),
          }
        : {}),
      totalEntries: 0,
      status: "draft" as CompetitionStatus,
      rulesText: form.get("rulesText"),
      freeEntryMethod: null,
      createdBy: firebaseUser.uid,
      updatedAt: serverTimestamp(),
    });
    setCreating(false);
    e.currentTarget.reset();
  }

  async function setStatus(id: string, status: CompetitionStatus) {
    await updateDoc(doc(db, "competitions", id), { status, updatedAt: serverTimestamp() });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl normal-case tracking-normal">Competitions</h2>
        <button onClick={() => setCreating((c) => !c)} className="btn-secondary !px-4 !py-2 !text-xs">
          {creating ? "Cancel" : "New Competition"}
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="panel mt-6 space-y-4 p-6">
          <Input name="title" label="Title" required />
          <Input name="carModel" label="Car Model" required defaultValue="OMODA C5" />
          <Textarea name="description" label="Description" required />
          <Input name="entryFeeCents" label="Entry Fee (cents)" type="number" defaultValue={10000} required />
          <Input name="closingAt" label="Closing Date/Time (optional)" type="datetime-local" />
          <Textarea name="rulesText" label="Rules Text" required />
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-widest2 text-silver">Hero Image</span>
            <input type="file" name="image" accept="image/*" className="input" />
          </label>
          <button type="submit" className="btn-primary">Save Competition</button>
        </form>
      )}

      <div className="mt-8 space-y-3">
        {competitions.map((c) => (
          <div key={c.id} className="panel flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="text-bone">{c.title}</p>
              <p className="text-xs text-silver">
                {c.carModel} · R{(c.entryFeeCents / 100).toFixed(2)} · {c.closingAt
                  ? `closes ${new Date(c.closingAt).toLocaleString("en-ZA")}`
                  : "no scheduled closing date"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase text-silver">{c.status}</span>
              <select
                value={c.status}
                onChange={(e) => setStatus(c.id, e.target.value as CompetitionStatus)}
                className="input !w-auto !py-1.5 !text-xs"
              >
                <option value="draft">draft</option>
                <option value="active">active</option>
                <option value="closed">closed</option>
                <option value="winner_announced">winner_announced</option>
              </select>
            </div>
          </div>
        ))}
        {competitions.length === 0 && <p className="text-sm text-silver">No competitions yet.</p>}
      </div>
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

function Textarea({
  name,
  label,
  ...rest
}: { name: string; label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-widest2 text-silver">{label}</span>
      <textarea name={name} rows={4} className="input" {...rest} />
    </label>
  );
}
