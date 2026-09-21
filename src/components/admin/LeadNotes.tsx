"use client";

import { useState } from "react";
import type { LeadNote } from "@/lib/types";

interface DisplayNote extends LeadNote {
  sellerName: string;
}

interface LeadNotesProps {
  sessionId: string;
  initialNotes: DisplayNote[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" });
}

export default function LeadNotes({ sessionId, initialNotes }: LeadNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/leads/${sessionId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: trimmed }),
    });
    setSaving(false);

    if (!res.ok) {
      setError("Klarte ikke å lagre notatet.");
      return;
    }
    const { note } = (await res.json()) as { note: LeadNote };
    setNotes((prev) => [{ ...note, sellerName: "Deg" }, ...prev]);
    setBody("");
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="font-semibold text-slate-900">Interne notater</h2>

      <form onSubmit={handleSubmit} className="mt-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Skriv et notat..."
          rows={3}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
        />
        <div className="mt-2 flex items-center justify-between">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving || !body.trim()}
            className="ml-auto rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Lagrer..." : "Legg til notat"}
          </button>
        </div>
      </form>

      {notes.length > 0 ? (
        <ul className="mt-5 space-y-3 border-t border-slate-100 pt-4">
          {notes.map((note) => (
            <li key={note.id} className="text-sm">
              <p className="whitespace-pre-wrap text-slate-700">{note.body}</p>
              <p className="mt-1 text-xs text-slate-400">
                {note.sellerName} · {formatDate(note.created_at)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-400">Ingen notater ennå.</p>
      )}
    </section>
  );
}
