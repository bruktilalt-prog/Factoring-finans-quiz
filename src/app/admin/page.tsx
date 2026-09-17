import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import LogoutButton from "@/components/admin/LogoutButton";
import Logo from "@/components/Logo";
import type { LeadRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("nb-NO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function isThisWeek(iso?: string | null): boolean {
  if (!iso) return false;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return new Date(iso) >= weekAgo;
}

function needsFollowUp(lead: LeadRecord): boolean {
  return (lead.research?.summary?.flags ?? []).some((f) => f.startsWith("🔴"));
}

export default async function AdminPage() {
  const { data, error } = await supabaseAdmin
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  const leads = (data ?? []) as LeadRecord[];

  const stats = {
    total: leads.length,
    completedThisWeek: leads.filter((l) => l.status === "completed" && isThisWeek(l.updated_at))
      .length,
    needsFollowUp: leads.filter(needsFollowUp).length,
    inProgress: leads.filter((l) => l.status !== "completed").length,
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <LogoutButton />
        </div>

        <h1 className="mb-4 text-2xl font-bold text-slate-900">Leads</h1>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Totalt" value={stats.total} />
          <StatCard label="Fullført denne uken" value={stats.completedThisWeek} accent="green" />
          <StatCard label="Krever oppfølging" value={stats.needsFollowUp} accent="red" />
          <StatCard label="Pågår" value={stats.inProgress} accent="amber" />
        </div>

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            Feil ved henting: {error.message}
          </p>
        )}

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Mottatt</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Firma</th>
                <th className="px-4 py-3 font-medium">Kontakt</th>
                <th className="px-4 py-3 font-medium">Vurdering</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const flags = lead.research?.summary?.flags ?? [];
                const topFlag = flags.find((f) => f.startsWith("🔴")) ?? flags[0];
                return (
                  <tr
                    key={lead.session_id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          lead.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {lead.status === "completed" ? "Fullført" : "Pågår"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/leads/${lead.session_id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {lead.company_name || "Ukjent firma"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-900">{lead.contact_name || "—"}</div>
                      <div className="text-slate-400">{lead.contact_email || ""}</div>
                    </td>
                    <td className="max-w-[280px] px-4 py-3 text-slate-600">
                      {topFlag ?? "—"}
                    </td>
                  </tr>
                );
              })}
              {leads.length === 0 && !error && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    Ingen leads ennå.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "green" | "red" | "amber";
}) {
  const valueColor =
    accent === "green"
      ? "text-green-600"
      : accent === "red"
        ? "text-red-600"
        : accent === "amber"
          ? "text-amber-600"
          : "text-slate-900";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className={`text-2xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}
