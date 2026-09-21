"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HANDLING_STATUS_LABELS, type HandlingStatus, type Seller } from "@/lib/types";

interface LeadActionsProps {
  sessionId: string;
  handlingStatus: HandlingStatus;
  assignedTo: string | null;
  followUpAt: string | null;
  estimatedFrameKr: number | null;
  sellers: Seller[];
}

const STATUS_OPTIONS = Object.entries(HANDLING_STATUS_LABELS) as [HandlingStatus, string][];

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export default function LeadActions({
  sessionId,
  handlingStatus,
  assignedTo,
  followUpAt,
  estimatedFrameKr,
  sellers,
}: LeadActionsProps) {
  const router = useRouter();
  const [status, setStatus] = useState(handlingStatus);
  const [assigned, setAssigned] = useState(assignedTo ?? "");
  const [followUp, setFollowUp] = useState(toDateInputValue(followUpAt));
  const [frame, setFrame] = useState(estimatedFrameKr != null ? String(estimatedFrameKr) : "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/leads/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Klarte ikke å lagre endringen.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleDelete() {
    if (!window.confirm("Slette denne leaden permanent? Dette kan ikke angres.")) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/leads/${sessionId}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleting(false);
      setError("Klarte ikke å slette.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="font-semibold text-slate-900">Behandling</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Status</span>
          <select
            value={status}
            disabled={saving}
            onChange={(e) => {
              const next = e.target.value as HandlingStatus;
              setStatus(next);
              patch({ handling_status: next });
            }}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          >
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Tildelt til</span>
          <select
            value={assigned}
            disabled={saving}
            onChange={(e) => {
              const next = e.target.value || null;
              setAssigned(next ?? "");
              patch({ assigned_to: next });
            }}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          >
            <option value="">Ikke tildelt</option>
            {sellers.map((seller) => (
              <option key={seller.id} value={seller.id}>
                {seller.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Oppfølgingsdato</span>
          <div className="flex gap-2">
            <input
              type="date"
              value={followUp}
              disabled={saving}
              onChange={(e) => {
                const next = e.target.value;
                setFollowUp(next);
                patch({ follow_up_at: next ? new Date(next).toISOString() : null });
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
            {followUp && (
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setFollowUp("");
                  patch({ follow_up_at: null });
                }}
                className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:border-slate-300"
              >
                Fjern
              </button>
            )}
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Anslått ramme (kr)</span>
          <input
            type="number"
            inputMode="numeric"
            step={50000}
            min={0}
            value={frame}
            disabled={saving}
            placeholder="Ikke anslått"
            onChange={(e) => setFrame(e.target.value)}
            onBlur={() => {
              const trimmed = frame.trim();
              const next = trimmed === "" ? null : Number(trimmed);
              if (next !== null && (!Number.isFinite(next) || next < 0)) {
                setFrame(estimatedFrameKr != null ? String(estimatedFrameKr) : "");
                return;
              }
              if (next === estimatedFrameKr) return;
              patch({ estimated_frame_kr: next });
            }}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="mt-5 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
      >
        {deleting ? "Sletter..." : "Slett denne leaden"}
      </button>
    </section>
  );
}
