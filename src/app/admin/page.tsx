import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentSeller } from "@/lib/current-seller";
import LogoutButton from "@/components/admin/LogoutButton";
import LeadFilters from "@/components/admin/LeadFilters";
import Logo from "@/components/Logo";
import { formatKr } from "@/lib/format";
import { HANDLING_STATUS_LABELS, type LeadRecord, type Seller } from "@/lib/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

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
  return (lead.research?.summary?.flags ?? []).some((f) => f.startsWith("🚩"));
}

function isOverdue(lead: LeadRecord): boolean {
  if (!lead.follow_up_at) return false;
  return new Date(lead.follow_up_at) < new Date();
}

interface AdminPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    assigned?: string;
    mine?: string;
    page?: string;
  }>;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const currentSeller = await getCurrentSeller();
  const params = await searchParams;

  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabaseAdmin.from("leads").select("*", { count: "exact" });

  if (params.q) {
    const term = params.q.trim();
    query = query.or(
      `company_name.ilike.%${term}%,contact_name.ilike.%${term}%,contact_email.ilike.%${term}%`
    );
  }
  if (params.status) {
    query = query.eq("handling_status", params.status);
  }
  if (params.mine === "1" && currentSeller) {
    query = query.eq("assigned_to", currentSeller.id);
  } else if (params.assigned === "none") {
    query = query.is("assigned_to", null);
  } else if (params.assigned) {
    query = query.eq("assigned_to", params.assigned);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  const leads = (data ?? []) as LeadRecord[];
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const { data: sellersData } = await supabaseAdmin
    .from("sellers")
    .select("id, name")
    .order("name", { ascending: true });
  const sellers = (sellersData ?? []) as Pick<Seller, "id" | "name">[];
  const sellerNames = new Map(sellers.map((s) => [s.id, s.name]));

  // Stats always reflect everything, not the current filter — otherwise
  // "Krever oppfølging" would silently change meaning depending on what's
  // typed in the search box.
  const { data: allLeadsForStats } = await supabaseAdmin
    .from("leads")
    .select("status, updated_at, research, follow_up_at, estimated_frame_kr, handling_status");
  const statsSource = (allLeadsForStats ?? []) as LeadRecord[];
  const openPipelineKr = statsSource
    .filter((l) => l.handling_status !== "lost")
    .reduce((sum, l) => sum + (l.estimated_frame_kr ?? 0), 0);
  const stats = {
    total: statsSource.length,
    completedThisWeek: statsSource.filter(
      (l) => l.status === "completed" && isThisWeek(l.updated_at)
    ).length,
    needsFollowUp: statsSource.filter(needsFollowUp).length,
    inProgress: statsSource.filter((l) => l.status !== "completed").length,
    overdueFollowUp: statsSource.filter(isOverdue).length,
    openPipelineKr,
  };

  function pageLink(targetPage: number): string {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.status) sp.set("status", params.status);
    if (params.assigned) sp.set("assigned", params.assigned);
    if (params.mine) sp.set("mine", params.mine);
    sp.set("page", String(targetPage));
    return `/admin?${sp.toString()}`;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <Link href="/admin/rapporter" className="text-sm font-medium text-slate-500 hover:text-slate-700">
              Rapporter
            </Link>
            {currentSeller?.is_admin && (
              <Link href="/admin/selgere" className="text-sm font-medium text-slate-500 hover:text-slate-700">
                Selgere
              </Link>
            )}
            <span className="text-sm text-slate-500">{currentSeller?.name}</span>
            <LogoutButton />
          </div>
        </div>

        <h1 className="mb-4 text-2xl font-bold text-slate-900">Leads</h1>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-6">
          <StatCard label="Totalt" value={stats.total} />
          <StatCard label="Fullført denne uken" value={stats.completedThisWeek} accent="green" />
          <StatCard label="Krever oppfølging" value={stats.needsFollowUp} accent="red" />
          <StatCard label="Oppfølging forfalt" value={stats.overdueFollowUp} accent="red" />
          <StatCard label="Pågår" value={stats.inProgress} accent="amber" />
          <StatCard label="Anslått pipelineverdi" value={formatKr(stats.openPipelineKr)} />
        </div>

        <LeadFilters sellers={sellers} />

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            Feil ved henting: {error.message}
          </p>
        )}

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Mottatt</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Firma</th>
                <th className="px-4 py-3 font-medium">Kontakt</th>
                <th className="px-4 py-3 font-medium">Tildelt</th>
                <th className="px-4 py-3 font-medium">Oppfølging</th>
                <th className="px-4 py-3 font-medium text-right">Ramme</th>
                <th className="px-4 py-3 font-medium">Vurdering</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const flags = lead.research?.summary?.flags ?? [];
                const topFlag = flags.find((f) => f.startsWith("🚩")) ?? flags[0];
                return (
                  <tr
                    key={lead.session_id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            lead.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {lead.status === "completed" ? "Fullført" : "Pågår"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {HANDLING_STATUS_LABELS[lead.handling_status ?? "new"]}
                        </span>
                      </div>
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
                    <td className="px-4 py-3 text-slate-600">
                      {lead.assigned_to ? (sellerNames.get(lead.assigned_to) ?? "Ukjent") : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {lead.follow_up_at ? (
                        <span
                          className={
                            isOverdue(lead)
                              ? "font-medium text-red-600"
                              : "text-slate-600"
                          }
                        >
                          {formatDate(lead.follow_up_at)}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-slate-600">
                      {formatKr(lead.estimated_frame_kr)}
                    </td>
                    <td className="max-w-[280px] px-4 py-3 text-slate-600">
                      {topFlag ?? "—"}
                    </td>
                  </tr>
                );
              })}
              {leads.length === 0 && !error && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    Ingen leads matcher filteret.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span>
              Side {page} av {totalPages} ({totalCount} totalt)
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={pageLink(page - 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:border-slate-300">
                  ← Forrige
                </Link>
              )}
              {page < totalPages && (
                <Link href={pageLink(page + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:border-slate-300">
                  Neste →
                </Link>
              )}
            </div>
          </div>
        )}
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
  value: number | string;
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
