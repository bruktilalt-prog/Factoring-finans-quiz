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

Svarene firmaet selv ga i søknadsskjemaet:
${ruleSummary.facts.join("\n") || "Ingen"}

Allerede beregnede observasjoner fra svarene (ikke gjenta disse ordrett):
${ruleSummary.flags.join("\n") || "Ingen"}

Gjør en kredittanalyse av dette firmaet for et factoringselskap som vurderer å inngå avtale med dem. Søk opp regnskapstall på proff.no, purehelp.no eller lignende. Skriv svaret som separate, klart merkede avsnitt (blank linje mellom hvert, ingen markdown-stjerner, kort ord/frase + kolon som start på hvert avsnitt), i denne rekkefølgen:

0. "Hurtigflagg:" — 2-4 korte linjer (hver på egen linje) som oppsummerer de VIKTIGSTE økonomiske funnene, i samme stil som disse eksemplene: "🔴 Egenkapitalandel falt til 6,8 % i 2025" / "🟡 Omsetning svingende, ingen klar trend" / "🟢 Jevn vekst i driftsinntekter siste 3 år" / "ℹ️ Fant ingen regnskapstall nyere enn 2023". Start hver linje med nøyaktig ett av emojiene 🔴 (alvorlig bekymring), 🟡 (noe å følge med på), 🟢 (positivt), eller ℹ️ (nøytral info/usikkerhet). Hver linje maks ca. 12 ord — dette er hurtigoversikt, ikke forklaring (forklaringen kommer i avsnittene under).
1. "Omsetning og resultat:" — driftsinntekter og driftsresultat for så mange av de siste 3-5 regnskapsårene du finner, år for år. Vurder om trenden er vekst, nedgang eller stabil. Oppgi alltid hvilke år tallene gjelder.
2. "Gjeldsgrad:" — gjeldsgrad/soliditet hvis du finner det (f.eks. egenkapitalandel). Si "ikke funnet" hvis du ikke finner det, ikke gjett.
3. "Kundefordringer:" — størrelse på kundefordringer i regnskapet hvis oppgitt på proff.no eller lignende, og hva det eventuelt sier om fakturavolumet sammenlignet med det de selv oppga i søknaden.
4. "Samsvar med søknaden:" — stemmer det du fant (omsetning, størrelse, bransje) overens med det firmaet selv oppga i quizen (fakturavolum, kundetype, osv.)? Flagg eventuelle avvik eksplisitt som konkrete spørsmål selgeren bør stille i møte med kunden — ikke bare "sjekk dette", men formuler det som et spørsmål å stille.
5. "Konklusjon:" — 2-3 setninger, rett på sak: er dette en solid kunde for factoring eller ikke, og hvorfor.

Prioriter det NYESTE regnskapsåret du finner treff på — sidene du henter kan vise eldre, cachede tall enn det som faktisk ligger ute, så nevn alltid eksplisitt hvilket år/periode tallene er fra. Hvis du ikke finner regnskapstall i det hele tatt, si det kort under "Hurtigflagg:" (med ℹ️) og "Omsetning og resultat:" i stedet for å gjette, men fyll fortsatt ut de andre avsnittene basert på det du har. Skriv på norsk, konsist og rett på sak — dette skal leses av travle folk i et salgsmøte, ikke være en lang rapport.`;
}

const FLAG_EMOJI = "🔴🟡🟢ℹ️";
const FLAG_LINE_PATTERN = new RegExp(`[${FLAG_EMOJI}][^${FLAG_EMOJI}]*`, "gu");

/** Pulls the "Hurtigflagg:" section out of the raw response text and splits
 *  it into individual emoji-prefixed flags, returning the remaining text
 *  (the long-form analysis) separately. */
function extractQuickFlags(rawText: string): { flags: string[]; rest: string } {
  const match = rawText.match(/Hurtigflagg:\s*([\s\S]*?)(?=\s*Omsetning og resultat:|$)/i);
  if (!match) return { flags: [], rest: rawText };

  const flags = (match[1].match(FLAG_LINE_PATTERN) ?? [])
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter((line) => line.length > 0)
    .map((line) => (line.length > 160 ? line.slice(0, 157) + "…" : line));

  const rest = (rawText.slice(0, match.index) + rawText.slice(match.index! + match[0].length)).trim();
  return { flags, rest };
}

export interface AiHealthCheckResult {
  /** Short emoji-prefixed lines meant to sit alongside the quiz-based flags
   *  under "Vurdering" — the quick, skimmable version. */
  flags: string[];
  /** The full long-form analysis (5 sections), for the "Kreditt-helsesjekk
   *  (AI)" block. */
  analysis: string;
}

/**
 * Runs a bounded web-search-backed health check via Claude Sonnet — real
 * financial reasoning, not just a lookup, so it's slower than the rest of
 * the pipeline. Returns null on any failure (missing key, refusal, rate
 * limit, timeout) so this is always a nice-to-have on top of the free
 * rule-based summary, never something that can break a lead submission.
 */
export async function runAiHealthCheck(
  lead: LeadRecord,
  brreg: BrregData | null,
  ruleSummary: LeadSummary
): Promise<AiHealthCheckResult | null> {
  if (!apiKey || !lead.org_number) return null;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      // Sonnet, not Haiku: this now involves real financial reasoning
      // (multi-year trend, debt ratio, cross-checking against the quiz
      // answers) that gets read out loud in sales meetings — worth the
      // small extra cost per lead over Haiku.
      model: "claude-sonnet-5",
      max_tokens: 8192,
      system:
        "Du er kredittanalytiker hos et norsk factoringselskap. Du skriver konkrete, faktabaserte vurderinger på norsk, uten fyllord eller disclaimers. Ikke fortell hva du gjør underveis (f.eks. \"jeg søker opp...\", \"jeg henter...\") — svar KUN med den ferdige analysen.",
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: 5,
          allowed_domains: ["proff.no", "purehelp.no", "brreg.no"],
          allowed_callers: ["direct"],
        },
        {
          type: "web_fetch_20260209",
          name: "web_fetch",
          max_uses: 4,
          allowed_domains: ["proff.no", "purehelp.no"],
          max_content_tokens: 6000,
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
      // Join with a space, not a paragraph break: citations often land as
      // their own separate text block mid-sentence, so treating every block
      // boundary as a new paragraph fragments normal sentences. Genuine
      // section breaks survive because the model puts its own blank line
      // *inside* a block (per the prompt's "blank linje mellom hvert").
      .join(" ")
      .replace(/([^\n])\n(?!\n)([^\n])/g, "$1 $2")
      .replace(/[ \t]+([,.;:)])/g, "$1")
      .replace(/[ \t]{2,}/g, " ")
      .trim();

    if (text.length === 0) {
      console.error(
        "AI health check returned no usable text",
        `stop_reason=${response.stop_reason}`,
        `blocks=${response.content.map((b) => b.type).join(",")}`,
        `usage=${JSON.stringify(response.usage)}`
      );
      return null;
    }

    const { flags, rest } = extractQuickFlags(text);
    return { flags, analysis: rest };
  } catch (err) {
    console.error("AI health check failed", err);
    return null;
  }
}
