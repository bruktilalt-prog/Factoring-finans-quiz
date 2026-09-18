import "server-only";

export interface BrregData {
  organisasjonsnummer: string;
  navn: string | null;
  organisasjonsform: string | null;
  naeringskode: string | null;
  stiftelsesdato: string | null;
  antallAnsatte: number | null;
  forretningsadresse: string | null;
  konkurs: boolean;
  underAvvikling: boolean;
}

/**
 * Looks up a Norwegian organization number in Brønnøysundregisteret's free,
 * public API. Returns null on any failure (invalid number, not found, or the
 * API being unreachable) — this is a nice-to-have enrichment, never something
 * that should block or fail a lead submission.
 */
export async function lookupBrreg(orgNumber: string): Promise<BrregData | null> {
  const cleaned = orgNumber.replace(/\s+/g, "");
  if (!/^\d{9}$/.test(cleaned)) return null;

  try {
    const res = await fetch(
      `https://data.brreg.no/enhetsregisteret/api/enheter/${cleaned}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const adresse = data.forretningsadresse;

    return {
      organisasjonsnummer: cleaned,
      navn: data.navn ?? null,
      organisasjonsform: data.organisasjonsform?.beskrivelse ?? null,
      naeringskode: data.naeringskode1?.beskrivelse ?? null,
      stiftelsesdato: data.stiftelsesdato ?? null,
      antallAnsatte: typeof data.antallAnsatte === "number" ? data.antallAnsatte : null,
      forretningsadresse: adresse
        ? [adresse.adresse?.join(" "), adresse.postnummer, adresse.poststed]
            .filter(Boolean)
            .join(", ")
        : null,
      konkurs: Boolean(data.konkurs),
      underAvvikling: Boolean(data.underAvvikling),
    };
  } catch {
    return null;
  }
}

/**
 * Falls back to searching by company name when the lead didn't provide an
 * org number (it's an optional field in the contact step). Picks the exact
 * (case-insensitive) name match if there is one, otherwise the top hit —
 * good enough for a real company name, but genuinely ambiguous for a very
 * generic one, so callers should treat the result as "likely", not certain.
 */
export async function searchBrregByName(name: string): Promise<BrregData | null> {
  const trimmed = name.trim();
  if (trimmed.length < 2) return null;

  try {
    const res = await fetch(
      `https://data.brreg.no/enhetsregisteret/api/enheter?navn=${encodeURIComponent(trimmed)}&size=5`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;

    const json = await res.json();
    const candidates: { navn?: string; organisasjonsnummer: string }[] =
      json._embedded?.enheter ?? [];
    if (candidates.length === 0) return null;

    const normalized = trimmed.toLowerCase();
    const chosen =
      candidates.find((c) => c.navn?.trim().toLowerCase() === normalized) ?? candidates[0];

    return lookupBrreg(chosen.organisasjonsnummer);
  } catch {
    return null;
  }
}
