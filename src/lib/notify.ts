import "server-only";
import { Resend } from "resend";
import type { LeadRecord, Seller } from "./types";
import type { LeadSummary } from "./lead-summary";

const resendApiKey = process.env.RESEND_API_KEY;
const notifyEmail = process.env.NOTIFY_EMAIL;
const siteUrl = process.env.SITE_URL;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function leadLink(lead: LeadRecord): string | null {
  return siteUrl ? `${siteUrl}/admin/leads/${lead.session_id}` : null;
}

/**
 * The shared lead-detail body used by both the internal notification and
 * the seller assignment email — only the heading and an optional intro
 * line differ between the two.
 */
function renderEmailHtml(
  lead: LeadRecord,
  summary: LeadSummary | null,
  aiHealthCheck: string | null,
  options: { heading: string; intro?: string } = { heading: summary?.headline ?? "Ny lead" }
): string {
  const flagsHtml = (summary?.flags ?? []).map((f) => `<li>${escapeHtml(f)}</li>`).join("");
  const factsHtml = (summary?.facts ?? []).map((f) => `<li>${escapeHtml(f)}</li>`).join("");
  const link = leadLink(lead);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px;">
      <h2>${escapeHtml(options.heading)}</h2>
      ${options.intro ? `<p>${escapeHtml(options.intro)}</p>` : ""}
      <p>
        <strong>${escapeHtml(lead.company_name ?? "Ukjent firma")}</strong>
        ${lead.org_number ? ` (org.nr ${escapeHtml(lead.org_number)})` : ""}
      </p>
      <p>
        ${escapeHtml(lead.contact_name ?? "")}<br/>
        ${lead.contact_email ? `<a href="mailto:${escapeHtml(lead.contact_email)}">${escapeHtml(lead.contact_email)}</a><br/>` : ""}
        ${lead.contact_phone ? escapeHtml(lead.contact_phone) : ""}
      </p>
      ${
        link
          ? `<p><a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Åpne leaden i admin →</a></p>`
          : ""
      }
      ${flagsHtml ? `<h3>Vurdering</h3><ul>${flagsHtml}</ul>` : ""}
      ${
        aiHealthCheck
          ? `<h3>Kreditt-helsesjekk (AI)</h3><p>${escapeHtml(aiHealthCheck).replace(/\n/g, "<br/>")}</p>`
          : ""
      }
      ${factsHtml ? `<h3>Svar fra quiz</h3><ul>${factsHtml}</ul>` : ""}
      <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
        Session ${escapeHtml(lead.session_id)}${summary ? ` · ${escapeHtml(summary.generatedAt)}` : ""}
      </p>
    </div>
  `;
}

/**
 * Sends the internal "new lead" notification. Never throws — a failed email
 * must not affect whether the lead's own submission is treated as successful.
 */
export async function sendLeadNotification(
  lead: LeadRecord,
  summary: LeadSummary,
  aiHealthCheck: string | null = null
) {
  if (!resendApiKey || !notifyEmail) return;

  try {
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: "Factoring Finans <onboarding@resend.dev>",
      to: notifyEmail,
      subject: `${summary.headline}: ${lead.company_name ?? lead.contact_name ?? "Ny lead"}`,
      html: renderEmailHtml(lead, summary, aiHealthCheck, { heading: summary.headline }),
    });
  } catch (err) {
    console.error("Failed to send lead notification email", err);
  }
}

/**
 * Sent when a lead is (manually or, later, automatically) delegated to a
 * seller. Reuses the same rich body as the internal notification — the lead
 * passed in already carries `research` (flags, AI health check) whenever
 * enrichment has finished, since it comes straight from a Supabase
 * `.select().single()`. Never throws — same reasoning as sendLeadNotification.
 */
export async function sendAssignmentNotification(lead: LeadRecord, seller: Seller) {
  if (!resendApiKey) return;

  try {
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: "Factoring Finans <onboarding@resend.dev>",
      to: seller.email,
      subject: `Ny lead tildelt: ${lead.company_name ?? lead.contact_name ?? "Ukjent firma"}`,
      html: renderEmailHtml(lead, lead.research?.summary ?? null, lead.research?.aiHealthCheck ?? null, {
        heading: `Du har fått tildelt en lead: ${lead.company_name ?? lead.contact_name ?? "Ukjent firma"}`,
        intro: `Hei ${seller.name.split(" ")[0]}, denne leaden er nå din å følge opp.`,
      }),
    });
  } catch (err) {
    console.error("Failed to send assignment notification email", err);
  }
}
