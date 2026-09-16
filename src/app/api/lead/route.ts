import { NextRequest, NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { lookupBrreg } from "@/lib/brreg";
import { buildLeadSummary } from "@/lib/lead-summary";
import { runAiHealthCheck } from "@/lib/ai-research";
import { sendLeadNotification } from "@/lib/notify";
import type { LeadAnswers, LeadRecord } from "@/lib/types";

const WRITABLE_FIELDS: (keyof LeadAnswers)[] = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "recognition_tags",
  "customer_type",
  "monthly_invoice_volume",
  "payment_terms",
  "existing_pledge",
  "customer_concentration",
  "active_customer_count",
  "urgency",
  "decision_maker",
  "preferred_meeting_at",
  "contact_name",
  "contact_email",
  "contact_phone",
  "org_number",
  "company_name",
  "consent_given",
  "consent_at",
  "free_text_note",
  "status",
];

/** Strips out anything that isn't an explicitly allowed column before it touches the DB. */
function pickWritableFields(body: Record<string, unknown>): Partial<LeadAnswers> {
  const result: Partial<LeadAnswers> = {};
  for (const field of WRITABLE_FIELDS) {
    if (field in body) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as any)[field] = body[field];
    }
  }
  return result;
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "session_id er påkrevd" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("leads")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead: data as LeadRecord | null });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const sessionId = body.session_id;
  if (typeof sessionId !== "string" || sessionId.length < 8) {
    return NextResponse.json({ error: "Gyldig session_id er påkrevd" }, { status: 400 });
  }

  const fields = pickWritableFields(body);

  const { data, error } = await supabaseAdmin
    .from("leads")
    .upsert({ session_id: sessionId, ...fields }, { onConflict: "session_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const lead = data as LeadRecord;

  if (fields.status === "completed") {
    // Runs after the response is already sent — the AI health check involves
    // a web search and can take several seconds; the visitor shouldn't wait
    // on it to see their "Takk" screen.
    after(() => enrichAndNotify(lead));
  }

  return NextResponse.json({ lead });
}

/**
 * Runs once, when a lead is marked completed: looks up the org number in
 * Brønnøysundregisteret, builds a rule-based summary, asks Claude to search
 * the web for a financial health check, saves it all to the `research`
 * column, and emails the internal notification. Never lets a failure here
 * affect the lead save itself.
 */
async function enrichAndNotify(lead: LeadRecord) {
  try {
    const brreg = lead.org_number ? await lookupBrreg(lead.org_number) : null;
    const summary = buildLeadSummary(lead, brreg);
    const aiHealthCheck = await runAiHealthCheck(lead, brreg, summary);

    await supabaseAdmin
      .from("leads")
      .update({
        research: { brreg, summary, aiHealthCheck },
        research_completed_at: new Date().toISOString(),
      })
      .eq("session_id", lead.session_id);

    await sendLeadNotification(lead, summary, aiHealthCheck);
  } catch (err) {
    console.error("Lead enrichment/notification failed", err);
  }
}
