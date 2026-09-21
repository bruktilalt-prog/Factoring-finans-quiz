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
  color = "bg-blue-600",
}: {
  label: string;
  value: number;
  max: number;
  format?: (value: number) => string;
  color?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="font-medium text-slate-900">{format(value)}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatTile({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: "green" | "red";
}) {
  const valueColor = accent === "green" ? "text-green-600" : accent === "red" ? "text-red-600" : "text-slate-900";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className={`text-2xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function weekStart(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function formatWeekLabel(d: Date): string {
  return d.toLocaleDateString("nb-NO", { day: "2-digit", month: "2-digit" });
}

/** Rounded-top, flat-bottom bar path — the data-end (top) is rounded, the
 *  baseline end stays square so bars read as anchored to the axis. */
function roundedTopBarPath(x: number, yTop: number, yBottom: number, width: number, radius: number): string {
  const r = Math.min(radius, width / 2, Math.max(0, yBottom - yTop));
  if (r <= 0) return `M${x},${yBottom} L${x},${yTop} L${x + width},${yTop} L${x + width},${yBottom} Z`;
  return `M${x},${yBottom} L${x},${yTop + r} Q${x},${yTop} ${x + r},${yTop} L${x + width - r},${yTop} Q${x + width},${yTop} ${x + width},${yTop + r} L${x + width},${yBottom} Z`;
}

function WeeklyTrendChart({ weeks }: { weeks: { label: string; value: number }[] }) {
  const slotWidth = 60;
  const barWidth = 28;
  const chartHeight = 90;
  const topMargin = 22;
  const bottomMargin = 22;
  const width = weeks.length * slotWidth;
  const height = topMargin + chartHeight + bottomMargin;
  const baselineY = topMargin + chartHeight;
  const max = Math.max(1, ...weeks.map((w) => w.value));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Antall leads mottatt per uke, siste 8 uker"
    >
      <line x1={0} y1={baselineY} x2={width} y2={baselineY} stroke="#e2e8f0" strokeWidth={1} />
      {weeks.map((w, i) => {
        const x = i * slotWidth + (slotWidth - barWidth) / 2;
        const barHeight = w.value > 0 ? Math.max(4, (w.value / max) * chartHeight) : 0;
        const yTop = baselineY - barHeight;
        return (
          <g key={i}>
            {w.value > 0 ? (
              <path d={roundedTopBarPath(x, yTop, baselineY, barWidth, 4)} fill="#2563eb" />
            ) : (
              <line x1={x} y1={baselineY} x2={x + barWidth} y2={baselineY} stroke="#cbd5e1" strokeWidth={2} />
            )}
            <text
              x={x + barWidth / 2}
              y={yTop - 6}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              fill="#334155"
            >
              {w.value}
            </text>
            <text
              x={x + barWidth / 2}
              y={baselineY + 16}
              textAnchor="middle"
              fontSize={10}
              fill="#94a3b8"
            >
              {w.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

type FlagCategory = "critical" | "warning" | "good" | "neutral" | "none";

const FLAG_CATEGORY_META: Record<Exclude<FlagCategory, "none">, { label: string; color: string }> = {
  critical: { label: "Kritisk (🚩)", color: "bg-red-500" },
  warning: { label: "Følg med (▲)", color: "bg-amber-500" },
  good: { label: "Positivt (✓)", color: "bg-green-600" },
  neutral: { label: "Nøytralt (•)", color: "bg-slate-400" },
};

function topFlagCategory(lead: LeadRecord): FlagCategory {
  const flags = lead.research?.summary?.flags ?? [];
  const top = flags.find((f) => f.startsWith("🚩")) ?? flags[0];
  if (!top) return "none";
  if (top.startsWith("🚩")) return "critical";
  if (top.startsWith("▲")) return "warning";
  if (top.startsWith("✓") || top.startsWith("✅")) return "good";
  return "neutral";
}

export default async function ReportsPage() {
  const currentSeller = await getCurrentSeller();

  const { data: leadsData } = await supabaseAdmin
    .from("leads")
    .select("handling_status, assigned_to, utm_source, status, estimated_frame_kr, research, created_at");
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

  const wonCount = statusCounts.get("won") ?? 0;
  const lostCount = statusCounts.get("lost") ?? 0;
  const conversionRate = leads.length > 0 ? Math.round((wonCount / leads.length) * 100) : null;
  const winRate = wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : null;

  const now = weekStart(new Date());
  const weeklyTrend = Array.from({ length: 8 }, (_, i) => {
    const start = new Date(now);
    start.setDate(start.getDate() - (7 - i) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const value = leads.filter((l) => {
      if (!l.created_at) return false;
      const created = new Date(l.created_at);
      return created >= start && created < end;
    }).length;
    return { label: formatWeekLabel(start), value };
  });

  const flagCategories = count(leads, topFlagCategory) as Map<FlagCategory, number>;
  const maxFlagCategory = Math.max(1, ...Object.keys(FLAG_CATEGORY_META).map((k) => flagCategories.get(k as FlagCategory) ?? 0));

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

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatTile value={formatKr(totalPipelineKr)} label="Total anslått rammeverdi" />
          <StatTile value={formatKr(wonPipelineKr)} label="Herav vunnet" accent="green" />
          <StatTile value={`${leadsWithFrame} / ${leads.length}`} label="Leads med anslått ramme" />
          <StatTile value={conversionRate != null ? `${conversionRate} %` : "—"} label="Konverteringsrate (av alle)" />
          <StatTile
            value={winRate != null ? `${winRate} %` : "—"}
            label="Vinnrate (av avgjorte)"
            accent={winRate != null && winRate >= 50 ? "green" : undefined}
          />
        </div>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Leads over tid</h2>
          <p className="mt-1 text-xs text-slate-500">Mottatte leads per uke, siste 8 uker</p>
          <div className="mt-4">
            <WeeklyTrendChart weeks={weeklyTrend} />
          </div>
        </section>

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
          <h2 className="font-semibold text-slate-900">Risikofordeling</h2>
          <p className="mt-1 text-xs text-slate-500">Basert på det viktigste vurderingsflagget per lead</p>
          <div className="mt-4 space-y-3">
            {(Object.keys(FLAG_CATEGORY_META) as Exclude<FlagCategory, "none">[]).map((cat) => (
              <Bar
                key={cat}
                label={FLAG_CATEGORY_META[cat].label}
                value={flagCategories.get(cat) ?? 0}
                max={maxFlagCategory}
                color={FLAG_CATEGORY_META[cat].color}
              />
            ))}
            {(flagCategories.get("none") ?? 0) > 0 && (
              <Bar
                label="Ingen vurdering ennå"
                value={flagCategories.get("none") ?? 0}
                max={maxFlagCategory}
                color="bg-slate-200"
              />
            )}
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
