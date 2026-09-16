import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { LeadRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("nb-NO", { dateStyle: "long", timeStyle: "short" });
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ session_id: string }>;
}) {
  const { session_id } = await params;

  const { data } = await supabaseAdmin
    .from("leads")
    .select("*")
    .eq("session_id", session_id)
    .maybeSingle();

  if (!data) notFound();
  const lead = data as LeadRecord;
  const research = lead.research;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/admin" className="text-sm font-medium text-slate-500 hover:text-slate-700">
          ← Alle leads
        </Link>

        <div className="mt-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">
            {lead.company_name || lead.contact_name || "Ukjent lead"}
          </h1>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              lead.status === "completed"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {lead.status === "completed" ? "Fullført" : "Pågår"}
          </span>
        </div>
        <p className="text-sm text-slate-500">Mottatt {formatDate(lead.created_at)}</p>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Kontakt</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row label="Navn" value={lead.contact_name} />
            <Row
              label="E-post"
              value={
                lead.contact_email ? (
                  <a href={`mailto:${lead.contact_email}`} className="text-blue-600 hover:underline">
                    {lead.contact_email}
                  </a>
                ) : null
              }
            />
            <Row
              label="Telefon"
              value={
                lead.contact_phone ? (
                  <a href={`tel:${lead.contact_phone}`} className="text-blue-600 hover:underline">
                    {lead.contact_phone}
                  </a>
                ) : null
              }
            />
            <Row label="Org.nr" value={lead.org_number} />
            {lead.preferred_meeting_at && (
              <Row label="Ønsket møtetidspunkt" value={formatDate(lead.preferred_meeting_at)} />
            )}
          </dl>
        </section>

        {research ? (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">{research.summary.headline}</h2>

            {research.summary.flags.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-sm">
                {research.summary.flags.map((flag, i) => (
                  <li key={i}>{flag}</li>
                ))}
              </ul>
            )}

            {research.summary.facts.length > 0 && (
              <>
                <h3 className="mt-5 text-sm font-medium text-slate-700">Svar fra quiz</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                  {research.summary.facts.map((fact, i) => (
                    <li key={i}>{fact}</li>
                  ))}
                </ul>
              </>
            )}
          </section>
        ) : (
          <p className="mt-6 text-sm text-slate-400">
            {lead.status === "completed"
              ? "Ingen analyse lagret ennå."
              : "Ikke fullført av besøkende ennå — ingen analyse tilgjengelig."}
          </p>
        )}

        {lead.free_text_note && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">Note fra lead</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{lead.free_text_note}</p>
          </section>
        )}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="inline text-slate-500">{label}: </dt>
      <dd className="inline text-slate-900">{value || "—"}</dd>
    </div>
  );
}
