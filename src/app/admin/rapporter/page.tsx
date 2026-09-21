import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentSeller } from "@/lib/current-seller";
import Logo from "@/components/Logo";
import LogoutButton from "@/components/admin/LogoutButton";
import { formatKr } from "@/lib/format";
import { HANDLING_STATUS_LABELS, type HandlingStatus, type LeadRecord, type Seller } from "@/lib/types";

export const dynamic = "force-dynamic";

function count<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

function sumBy<T>(items: T[], key: (item: T) => string, value: (item: T) => number): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    map.set(k, (map.get(k) ?? 0) + value(item));
  }
  return map;
}

function Bar({
  label,
  value,
  max,
  format = String,
}: {
  label: string;
  value: number;
  max: number;
  format?: (value: number) => string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="font-medium text-slate-900">{format(value)}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function ReportsPage() {
  const currentSeller = await getCurrentSeller();

  const { data: leadsData } = await supabaseAdmin
    .from("leads")
    .select("handling_status, assigned_to, utm_source, status, estimated_frame_kr");
  const leads = (leadsData ?? []) as LeadRecord[];
  const frameValue = (l: LeadRecord) => l.estimated_frame_kr ?? 0;

  const { data: sellersData } = await supabaseAdmin
    .from("sellers")
    .select("id, name")
    .order("name", { ascending: true });
  const sellers = (sellersData ?? []) as Pick<Seller, "id" | "name">[];

  const statusCounts = count(leads, (l) => l.handling_status ?? "new");
  const statusOrder: HandlingStatus[] = ["new", "contacted", "won", "lost"];
  const maxStatus = Math.max(1, ...statusOrder.map((s) => statusCounts.get(s) ?? 0));

  const statusValue = sumBy(leads, (l) => l.handling_status ?? "new", frameValue);
  const maxStatusValue = Math.max(1, ...statusOrder.map((s) => statusValue.get(s) ?? 0));

  const sellerCounts = count(
    leads.filter((l) => l.assigned_to),
    (l) => l.assigned_to as string
  );
  const unassignedCount = leads.filter((l) => !l.assigned_to).length;
  const maxSeller = Math.max(1, unassignedCount, ...sellers.map((s) => sellerCounts.get(s.id) ?? 0));

  const sellerValue = sumBy(
    leads.filter((l) => l.assigned_to),
    (l) => l.assigned_to as string,
    frameValue
  );
  const unassignedValue = leads.filter((l) => !l.assigned_to).reduce((sum, l) => sum + frameValue(l), 0);
  const maxSellerValue = Math.max(
    1,
    unassignedValue,
    ...sellers.map((s) => sellerValue.get(s.id) ?? 0)
  );

  const utmCounts = count(leads, (l) => l.utm_source || "Ukjent kilde");
  const maxUtm = Math.max(1, ...utmCounts.values());

  const totalPipelineKr = leads.reduce((sum, l) => sum + frameValue(l), 0);
  const wonPipelineKr = leads
    .filter((l) => l.handling_status === "won")
    .reduce((sum, l) => sum + frameValue(l), 0);
  const leadsWithFrame = leads.filter((l) => l.estimated_frame_kr != null).length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{currentSeller?.name}</span>
            <LogoutButton />
          </div>
        </div>

        <Link href="/admin" className="text-sm font-medium text-slate-500 hover:text-slate-700">
          ← Alle leads
        </Link>
        <h1 className="mt-2 mb-6 text-2xl font-bold text-slate-900">Rapporter</h1>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-2xl font-bold tabular-nums text-slate-900">{formatKr(totalPipelineKr)}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">Total anslått rammeverdi</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-2xl font-bold tabular-nums text-green-600">{formatKr(wonPipelineKr)}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">Herav vunnet</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-2xl font-bold tabular-nums text-slate-900">
              {leadsWithFrame} / {leads.length}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">Leads med anslått ramme</p>
          </div>
        </div>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Status-funnel</h2>
          <div className="mt-4 space-y-3">
            {statusOrder.map((s) => (
              <Bar key={s} label={HANDLING_STATUS_LABELS[s]} value={statusCounts.get(s) ?? 0} max={maxStatus} />
            ))}
          </div>

          <h3 className="mt-6 text-sm font-medium text-slate-500">Anslått rammeverdi per status</h3>
          <div className="mt-3 space-y-3">
            {statusOrder.map((s) => (
              <Bar
                key={s}
                label={HANDLING_STATUS_LABELS[s]}
                value={statusValue.get(s) ?? 0}
                max={maxStatusValue}
                format={formatKr}
              />
            ))}
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Leads per selger</h2>
          <div className="mt-4 space-y-3">
            {sellers.map((seller) => (
              <Bar
                key={seller.id}
                label={seller.name}
                value={sellerCounts.get(seller.id) ?? 0}
                max={maxSeller}
              />
            ))}
            <Bar label="Ikke tildelt" value={unassignedCount} max={maxSeller} />
          </div>

          <h3 className="mt-6 text-sm font-medium text-slate-500">Anslått rammeverdi per selger</h3>
          <div className="mt-3 space-y-3">
            {sellers.map((seller) => (
              <Bar
                key={seller.id}
                label={seller.name}
                value={sellerValue.get(seller.id) ?? 0}
                max={maxSellerValue}
                format={formatKr}
              />
            ))}
            <Bar label="Ikke tildelt" value={unassignedValue} max={maxSellerValue} format={formatKr} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Leads per kilde (UTM)</h2>
          <div className="mt-4 space-y-3">
            {[...utmCounts.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([source, value]) => (
                <Bar key={source} label={source} value={value} max={maxUtm} />
              ))}
          </div>
        </section>
      </div>
    </main>
  );
}
