import "server-only";
import type { BrregData } from "./brreg";
import type { LeadRecord } from "./types";
import {
  ACTIVE_CUSTOMER_COUNT_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
  FINANCING_OPTIONS,
  INVOICE_VOLUME_OPTIONS,
  PAYMENT_TERMS_OPTIONS,
  RECOGNITION_OPTIONS,
  URGENCY_OPTIONS,
  type ChoiceOption,
} from "./quiz-config";

function labelFor(options: ChoiceOption[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

function labelsForJoined(options: ChoiceOption[], joined: string | null | undefined): string[] {
  if (!joined) return [];
  return joined.split(",").map((v) => labelFor(options, v));
}

export interface LeadSummary {
  headline: string;
  flags: string[];
  facts: string[];
  generatedAt: string;
}

/**
 * Rule-based read of a completed lead — no LLM call, so it's free and instant.
 * Flags the things that actually matter operationally (the 25% concentration
 * rule, urgency, existing financing) rather than restating every raw answer.
 */
export function buildLeadSummary(lead: LeadRecord, brreg: BrregData | null): LeadSummary {
  const flags: string[] = [];
  const facts: string[] = [];

  if (lead.customer_concentration === "over_50") {
    flags.push("🚩 Én kunde utgjør over 50 % av fakturavolumet — bryter 25 %-regelen tydelig");
  } else if (lead.customer_concentration === "25_50") {
    flags.push("▲ Én kunde utgjør 25–50 % av fakturavolumet — over 25 %-grensen, vurder nøye");
  } else if (lead.customer_concentration === "under_25") {
    flags.push("✓ Ingen enkeltkunde over 25 % — god spredning");
  }

  if (lead.urgency === "urgent") {
    flags.push("🚩 Akutt behov — prioriter rask oppfølging");
  } else if (lead.urgency === "soon") {
    flags.push("▲ Ønsker løsning innen få uker");
  }

  if (lead.existing_pledge === "both") {
    flags.push("• Har både factoring og kassekreditt i dag — avklar om noe skal avløses");
  } else if (lead.existing_pledge === "factoring") {
    flags.push("• Har factoring hos noen andre i dag");
  } else if (lead.existing_pledge === "overdraft") {
    flags.push("• Har kassekreditt i dag — sjekk om banken har pant i fordringene");
  }

  if (lead.decision_maker === false) {
    flags.push("▲ Kontaktperson er ikke selv beslutningstaker — identifiser riktig person");
  }

  if (brreg?.konkurs) flags.push("🚩 Registrert som konkurs i Brønnøysundregisteret");
  if (brreg?.underAvvikling) flags.push("🚩 Registrert under avvikling i Brønnøysundregisteret");

  if (lead.customer_type) {
    facts.push(`Kundetype: ${labelsForJoined(CUSTOMER_TYPE_OPTIONS, lead.customer_type).join(", ")}`);
  }
  if (lead.monthly_invoice_volume) {
    facts.push(`Fakturavolum/mnd: ${labelFor(INVOICE_VOLUME_OPTIONS, lead.monthly_invoice_volume)}`);
  }
  if (lead.payment_terms) {
    facts.push(`Betalingsfrister: ${labelsForJoined(PAYMENT_TERMS_OPTIONS, lead.payment_terms).join(", ")}`);
  }
  if (lead.active_customer_count) {
    facts.push(`Aktive kunder/mnd: ${labelFor(ACTIVE_CUSTOMER_COUNT_OPTIONS, lead.active_customer_count)}`);
  }
  if (lead.existing_pledge) {
    facts.push(`Finansiering i dag: ${labelFor(FINANCING_OPTIONS, lead.existing_pledge)}`);
  }
  if (lead.recognition_tags?.length) {
    facts.push(`Kjenner seg igjen i: ${lead.recognition_tags.map((t) => labelFor(RECOGNITION_OPTIONS, t)).join("; ")}`);
  }
  if (lead.urgency) {
    facts.push(`Hastegrad: ${labelFor(URGENCY_OPTIONS, lead.urgency)}`);
  }
  if (lead.free_text_note) {
    facts.push(`Note fra lead: "${lead.free_text_note}"`);
  }

  if (brreg) {
    facts.push(
      `Brreg: ${[brreg.organisasjonsform, brreg.naeringskode, brreg.stiftelsesdato && `stiftet ${brreg.stiftelsesdato}`, brreg.antallAnsatte != null && `${brreg.antallAnsatte} ansatte`]
        .filter(Boolean)
        .join(", ")}`
    );
    if (brreg.forretningsadresse) facts.push(`Adresse: ${brreg.forretningsadresse}`);
  }

  const headline = flags.some((f) => f.startsWith("🚩"))
    ? "Ny lead — krever oppmerksomhet"
    : "Ny lead mottatt";

  return { headline, flags, facts, generatedAt: new Date().toISOString() };
}
