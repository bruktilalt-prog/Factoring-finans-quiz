import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { BrregData } from "./brreg";
import type { LeadRecord } from "./types";
import type { LeadSummary } from "./lead-summary";

const apiKey = process.env.ANTHROPIC_API_KEY;

function buildPrompt(lead: LeadRecord, brreg: BrregData | null, ruleSummary: LeadSummary): string {
  const brregBlock = brreg
    ? `Offisiell info fra Brønnøysundregisteret:
- Organisasjonsform: ${brreg.organisasjonsform ?? "ukjent"}
- Bransje: ${brreg.naeringskode ?? "ukjent"}
- Stiftet: ${brreg.stiftelsesdato ?? "ukjent"}
- Antall ansatte: ${brreg.antallAnsatte ?? "ukjent"}
- Adresse: ${brreg.forretningsadresse ?? "ukjent"}
- Konkurs: ${brreg.konkurs ? "JA" : "nei"}
- Under avvikling: ${brreg.underAvvikling ? "JA" : "nei"}`
    : "Fant ingen treff i Brønnøysundregisteret på oppgitt org.nr.";

  return `Firma: ${lead.company_name ?? "ukjent"} (org.nr ${lead.org_number ?? "ukjent"})

${brregBlock}

Allerede beregnede observasjoner fra søknaden (ikke gjenta disse ordrett):
${ruleSummary.flags.join("\n") || "Ingen"}

Søk opp regnskapstall og nøkkeltall for dette firmaet (prøv proff.no, purehelp.no eller lignende), og skriv en kort kreditt-helsesjekk for et factoringselskap som vurderer å inngå avtale med dem. Prioriter det NYESTE regnskapsåret du finner treff på — sidene du henter kan vise eldre, cachede tall enn det som faktisk ligger ute, så nevn alltid eksplisitt hvilket år/periode tallene er fra, slik at leseren kan vurdere om de bør dobbeltsjekke selv. Fokuser på økonomisk soliditet, omsetningsutvikling og eventuelle røde flagg — ikke gjenta ting som allerede er dekket over. Maks 4-5 setninger, på norsk, rett på sak. Hvis du ikke finner regnskapstall, si det kort i stedet for å gjette.`;
}

/**
 * Runs a bounded web-search-backed health check via Claude Haiku — cheap and
 * fast enough to run inline in the request/response cycle for one lead.
 * Returns null on any failure (missing key, refusal, rate limit, timeout)
 * so this is always a nice-to-have on top of the free rule-based summary,
 * never something that can break a lead submission.
 */
export async function runAiHealthCheck(
  lead: LeadRecord,
  brreg: BrregData | null,
  ruleSummary: LeadSummary
): Promise<string | null> {
  if (!apiKey || !lead.org_number) return null;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system:
        "Du er kredittanalytiker hos et norsk factoringselskap. Du skriver korte, konkrete vurderinger på norsk, uten fyllord eller disclaimers. Ikke fortell hva du gjør underveis (f.eks. \"jeg søker opp...\", \"jeg henter...\") — svar KUN med den ferdige vurderingen som løpende tekst, ingen overskrifter i store bokstaver.",
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: 3,
          allowed_domains: ["proff.no", "purehelp.no", "brreg.no"],
          allowed_callers: ["direct"],
        },
        {
          type: "web_fetch_20260209",
          name: "web_fetch",
          max_uses: 2,
          allowed_domains: ["proff.no", "purehelp.no"],
          max_content_tokens: 4000,
          allowed_callers: ["direct"],
        },
      ],
      messages: [{ role: "user", content: buildPrompt(lead, brreg, ruleSummary) }],
    });

    // Haiku narrates each web_search/web_fetch call in its own short text
    // block ("Jeg søker opp...", "Jeg henter...") right before the tool_use
    // block that follows it. Those blocks are short and start predictably,
    // unlike the analysis itself — drop them and keep the rest, in order.
    const NARRATION_PATTERN = /^(jeg (søker|henter|ser|sjekker|leter)|la meg)\b/i;
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text.trim())
      .filter((line) => line.length > 0 && !(line.length < 120 && NARRATION_PATTERN.test(line)))
      .join("\n")
      .trim();

    return text.length > 0 ? text : null;
  } catch (err) {
    console.error("AI health check failed", err);
    return null;
  }
}
