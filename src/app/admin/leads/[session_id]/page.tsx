import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildLeadSummary } from "@/lib/lead-summary";
import LeadActions from "@/components/admin/LeadActions";
import { HANDLING_STATUS_LABELS, type LeadRecord, type Seller } from "@/lib/types";

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

  const { data: sellersData } = await supabaseAdmin
    .from("sellers")
    .select("*")
    .order("name", { ascending: true });
  const sellers = (sellersData ?? []) as Seller[];

  // Computed live from whatever fields are filled in so far — not only for
  // completed leads. This is what the visitor has actually answered, with
  // human-readable labels, regardless of whether the enrichment pipeline
  // (which only runs on completion) has ever touched this row.
  const liveSummary = buildLeadSummary(lead, research?.brreg ?? null);

  // The stored flags (when research exists) include the AI health check's
  // quick economic flags merged in — prefer those over the live ones, which
  // only know about quiz answers. Facts don't change either way, so those
  // stay live.
  const flags = research?.summary.flags ?? liveSummary.flags;

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
          <div className="flex shrink-0 gap-2">
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
        </div>
        <p className="text-sm text-slate-500">Mottatt {formatDate(lead.created_at)}</p>

        <LeadActions
          sessionId={lead.session_id}
          handlingStatus={lead.handling_status ?? "new"}
          assignedTo={lead.assigned_to ?? null}
          sellers={sellers}
        />

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
            <Row label="Firmanavn" value={lead.company_name} />
            <Row label="Org.nr" value={lead.org_number} />
            {lead.preferred_meeting_at && (
              <Row label="Ønsket møtetidspunkt" value={formatDate(lead.preferred_meeting_at)} />
            )}
          </dl>
        </section>

        {research?.brreg && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">Firmainfo (Brønnøysundregisteret)</h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Row label="Organisasjonsform" value={research.brreg.organisasjonsform} />
              <Row label="Bransje" value={research.brreg.naeringskode} />
              <Row label="Stiftet" value={research.brreg.stiftelsesdato} />
              <Row label="Antall ansatte" value={research.brreg.antallAnsatte ?? null} />
              <Row label="Adresse" value={research.brreg.forretningsadresse} />
              {(research.brreg.konkurs || research.brreg.underAvvikling) && (
                <Row
                  label="Status"
                  value={
                    <span className="font-medium text-red-600">
                      {[research.brreg.konkurs && "Konkurs", research.brreg.underAvvikling && "Under avvikling"]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  }
                />
              )}
            </dl>
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">{liveSummary.headline}</h2>

          {flags.length > 0 && (
            <>
              <h3 className="mt-3 text-sm font-medium text-slate-700">Vurdering</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {flags.map((flag, i) => (
                  <li key={i}>{flag}</li>
                ))}
              </ul>
            </>
          )}

          {research?.aiHealthCheck && (
            <>
              <h3 className="mt-5 text-sm font-medium text-slate-700">Kreditt-helsesjekk</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                {research.aiHealthCheck}
              </p>
            </>
          )}

          {liveSummary.facts.length > 0 ? (
            <>
              <h3 className="mt-5 text-sm font-medium text-slate-700">Svar fra quiz</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                {liveSummary.facts.map((fact, i) => (
                  <li key={i}>{fact}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-400">Ingen spørsmål besvart ennå.</p>
          )}

          {!research && lead.status !== "completed" && (
            <p className="mt-4 text-xs text-slate-400">
              Fullføres quizen vil et Brreg-oppslag og en AI-helsesjekk legges til her automatisk.
            </p>
          )}
        </section>

        {lead.free_text_note && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">Note fra lead</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{lead.free_text_note}</p>
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Metadata</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row label="Session-ID" value={<code className="text-xs">{lead.session_id}</code>} />
            <Row label="Sist oppdatert" value={formatDate(lead.updated_at)} />
            <Row
              label="Kilde (UTM)"
              value={
                [lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(Boolean).join(" / ") ||
                null
              }
            />
            <Row
              label="Samtykke"
              value={
                lead.consent_given
                  ? `Ja${lead.consent_at ? ` (${formatDate(lead.consent_at)})` : ""}`
                  : "Nei"
              }
            />
          </dl>
        </section>
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
