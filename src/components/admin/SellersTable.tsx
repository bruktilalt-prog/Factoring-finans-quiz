"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Seller } from "@/lib/types";

interface SellersTableProps {
  sellers: Seller[];
  currentSellerId: string;
}

export default function SellersTable({ sellers, currentSellerId }: SellersTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Navn</th>
            <th className="px-4 py-3 font-medium">E-post</th>
            <th className="px-4 py-3 font-medium">Områder</th>
            <th className="px-4 py-3 font-medium">Admin</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {sellers.map((seller) =>
            editingId === seller.id ? (
              <EditRow
                key={seller.id}
                seller={seller}
                isSelf={seller.id === currentSellerId}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <tr key={seller.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-900">{seller.name}</td>
                <td className="px-4 py-3 text-slate-600">{seller.email}</td>
                <td className="px-4 py-3 text-slate-600">
                  {seller.territories.length > 0 ? seller.territories.join(", ") : "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">{seller.is_admin ? "Ja" : "—"}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setEditingId(seller.id)}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    Rediger
                  </button>
                </td>
              </tr>
            )
          )}
          {sellers.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                Ingen selgere lagt til ennå.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function EditRow({
  seller,
  isSelf,
  onDone,
}: {
  seller: Seller;
  isSelf: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(seller.name);
  const [email, setEmail] = useState(seller.email);
  const [territories, setTerritories] = useState(seller.territories.join(", "));
  const [isAdmin, setIsAdmin] = useState(seller.is_admin ?? false);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      name,
      email,
      is_admin: isAdmin,
      territories: territories
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    if (password) body.password = password;

    const res = await fetch(`/api/admin/sellers/${seller.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Noe gikk galt");
      return;
    }

    router.refresh();
    onDone();
  }

  return (
    <tr className="border-b border-slate-100 bg-slate-50 last:border-0">
      <td colSpan={5} className="px-4 py-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Navn"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-post"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
          <input
            type="text"
            value={territories}
            onChange={(e) => setTerritories(e.target.value)}
            placeholder="Områder (kommaseparert)"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nytt passord (valgfritt, minst 8 tegn)"
            minLength={8}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>

        <label
          className={`mt-3 flex items-center gap-2 text-sm ${
            isSelf ? "text-slate-400" : "text-slate-600"
          }`}
        >
          <input
            type="checkbox"
            checked={isAdmin}
            disabled={isSelf}
            onChange={(e) => setIsAdmin(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
          />
          Admin-tilgang{isSelf ? " (kan ikke fjernes fra deg selv)" : ""}
        </label>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? "Lagrer..." : "Lagre"}
          </button>
          <button
            type="button"
            onClick={onDone}
            disabled={saving}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-300"
          >
            Avbryt
          </button>
        </div>
      </td>
    </tr>
  );
}
