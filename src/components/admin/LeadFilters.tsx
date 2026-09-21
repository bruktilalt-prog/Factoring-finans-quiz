"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { HANDLING_STATUS_LABELS, type Seller } from "@/lib/types";

interface LeadFiltersProps {
  sellers: Pick<Seller, "id" | "name">[];
}

export default function LeadFilters({ sellers }: LeadFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/admin?${params.toString()}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParam("q", q);
  }

  const mine = searchParams.get("mine") === "1";

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px]">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Søk firma, kontakt eller e-post..."
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
        />
      </form>

      <select
        value={searchParams.get("status") ?? ""}
        onChange={(e) => updateParam("status", e.target.value)}
        className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
      >
        <option value="">Alle statuser</option>
        {Object.entries(HANDLING_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("assigned") ?? ""}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          params.delete("mine");
          if (e.target.value) params.set("assigned", e.target.value);
          else params.delete("assigned");
          params.delete("page");
          router.push(`/admin?${params.toString()}`);
        }}
        className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
      >
        <option value="">Alle selgere</option>
        <option value="none">Ikke tildelt</option>
        {sellers.map((seller) => (
          <option key={seller.id} value={seller.id}>
            {seller.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => {
          const params = new URLSearchParams(searchParams.toString());
          params.delete("assigned");
          params.delete("page");
          if (mine) params.delete("mine");
          else params.set("mine", "1");
          router.push(`/admin?${params.toString()}`);
        }}
        className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
          mine
            ? "border-blue-600 bg-blue-50 text-blue-700"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
        }`}
      >
        Mine leads
      </button>

      <a
        href={`/api/admin/leads/export?${searchParams.toString()}`}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:border-slate-300"
      >
        Eksporter CSV
      </a>
    </div>
  );
}
