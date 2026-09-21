"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddSellerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [territories, setTerritories] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/sellers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        is_admin: isAdmin,
        territories: territories
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Noe gikk galt");
      return;
    }

    setName("");
    setEmail("");
    setPassword("");
    setIsAdmin(false);
    setTerritories("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="font-semibold text-slate-900">Legg til selger</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          placeholder="Navn"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
        />
        <input
          type="email"
          placeholder="E-post"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
        />
        <input
          type="password"
          placeholder="Passord (minst 8 tegn)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
        />
        <input
          type="text"
          placeholder="Områder (valgfritt, kommaseparert)"
          value={territories}
          onChange={(e) => setTerritories(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
        />
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={isAdmin}
          onChange={(e) => setIsAdmin(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        Admin-tilgang (kan legge til selgere og se alt)
      </label>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {loading ? "Legger til..." : "Legg til"}
      </button>
    </form>
  );
}
