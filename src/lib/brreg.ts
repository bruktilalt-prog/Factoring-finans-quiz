import "server-only";

export interface BrregData {
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
