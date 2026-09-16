import "server-only";
import { Resend } from "resend";
import type { LeadRecord } from "./types";
import type { LeadSummary } from "./lead-summary";

const resendApiKey = process.env.RESEND_API_KEY;
const notifyEmail = process.env.NOTIFY_EMAIL;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderEmailHtml(
  lead: LeadRecord,
  summary: LeadSummary,
  aiHealthCheck: string | null
): string {
  const flagsHtml = summary.flags.map((f) => `<li>${escapeHtml(f)}</li>`).join("");
  const factsHtml = summary.facts.map((f) => `<li>${escapeHtml(f)}</li>`).join("");

  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px;">
      <h2>${escapeHtml(summary.headline)}</h2>
      <p>
        <strong>${escapeHtml(lead.company_name ?? "Ukjent firma")}</strong>
        ${lead.org_number ? ` (org.nr ${escapeHtml(lead.org_number)})` : ""}
      </p>
      <p>
        ${escapeHtml(lead.contact_name ?? "")}<br/>
        ${lead.contact_email ? `<a href="mailto:${escapeHtml(lead.contact_email)}">${escapeHtml(lead.contact_email)}</a><br/>` : ""}
        ${lead.contact_phone ? escapeHtml(lead.contact_phone) : ""}
      </p>
      ${flagsHtml ? `<h3>Vurdering</h3><ul>${flagsHtml}</ul>` : ""}
      ${
        aiHealthCheck
          ? `<h3>Kreditt-helsesjekk (AI)</h3><p>${escapeHtml(aiHealthCheck).replace(/\n/g, "<br/>")}</p>`
          : ""
      }
      ${factsHtml ? `<h3>Svar fra quiz</h3><ul>${factsHtml}</ul>` : ""}
      <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
        Session ${escapeHtml(lead.session_id)} · ${escapeHtml(summary.generatedAt)}
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
      html: renderEmailHtml(lead, summary, aiHealthCheck),
    });
  } catch (err) {
    console.error("Failed to send lead notification email", err);
  }
}
