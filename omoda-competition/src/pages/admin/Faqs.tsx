import { useEffect, useState, type FormEvent } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import type { Faq } from "@/types";

export default function AdminFaqs() {
  const [faqs, setFaqs] = useState<Faq[]>([]);

  useEffect(() => {
    const q = query(collection(db, "faqs"), orderBy("order", "asc"));
    return onSnapshot(q, (snap) =>
      setFaqs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Faq, "id">) })))
    );
  }, []);

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await addDoc(collection(db, "faqs"), {
      question: form.get("question"),
      answer: form.get("answer"),
      order: faqs.length + 1,
      published: true,
    });
    e.currentTarget.reset();
  }

  async function togglePublished(f: Faq) {
    await updateDoc(doc(db, "faqs", f.id), { published: !f.published });
  }

  async function remove(id: string) {
    await deleteDoc(doc(db, "faqs", id));
  }

  return (
    <div>
      <h2 className="text-xl normal-case tracking-normal">FAQs</h2>

      <form onSubmit={handleAdd} className="panel mt-6 space-y-4 p-6">
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-widest2 text-silver">Question</span>
          <input name="question" required className="input" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-widest2 text-silver">Answer</span>
          <textarea name="answer" required rows={3} className="input" />
        </label>
        <button type="submit" className="btn-primary">Add FAQ</button>
      </form>

      <div className="mt-8 space-y-3">
        {faqs.map((f) => (
          <div key={f.id} className="panel p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-bone">{f.question}</p>
                <p className="mt-1 text-sm text-silver">{f.answer}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => togglePublished(f)} className="btn-secondary !px-3 !py-1.5 !text-xs">
                  {f.published ? "Unpublish" : "Publish"}
                </button>
                <button onClick={() => remove(f.id)} className="btn-secondary !px-3 !py-1.5 !text-xs">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
