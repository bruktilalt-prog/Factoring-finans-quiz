import type { LeadAnswers } from "./types";

/** Representative kr/month for each fakturavolum bucket — midpoint where the
 *  range is bounded, a reasonable single estimate where it isn't. */
const VOLUME_MIDPOINT_KR: Record<string, number> = {
  under_200k: 150_000,
  "200k_500k": 350_000,
  "500k_1_5m": 1_000_000,
  "1_5m_5m": 3_250_000,
  over_5m: 7_000_000,
};

/** Representative days for each betalingsfrist bucket. */
const PAYMENT_TERM_MIDPOINT_DAYS: Record<string, number> = {
  under_14d: 10,
  "14_30d": 22,
  "30_60d": 45,
  "60_90d": 75,
  over_90d: 100,
};

/** Representative invoice count per month, used only as a proxy for how many
 *  steps the chart shows — never affects the total kr figure. */
const CUSTOMER_COUNT_MIDPOINT: Record<string, number> = {
  "1_5": 3,
  "6_20": 13,
  "21_50": 35,
  over_50: 50,
};

/** Share of an invoice's value paid out immediately by factoring — a fixed
 *  business assumption, not derived from quiz answers. The remaining share
 *  is released when the customer actually pays, same as without factoring —
 *  factoring moves capital forward in time, it doesn't create extra kr, so
 *  both scenarios must converge to the same total. */
const ADVANCE_RATE = 0.85;

const MIN_CHART_INVOICES = 4;
const MAX_CHART_INVOICES = 15;
const INVOICING_WINDOW_DAYS = 30;

export interface LiquidityStep {
  day: number;
  cumulativeKr: number;
}

export interface LiquidityEstimate {
  monthlyVolumeKr: number;
  paymentTermDays: number;
  advanceRate: number;
  /** The "day 1" headline figure — the portion available almost immediately,
   *  well before either line reaches the shared final total. */
  immediateKr: number;
  /** What both scenarios eventually add up to — factoring doesn't change
   *  this, only how fast you get there. */
  finalTotalKr: number;
  withFactoring: LiquidityStep[];
  withoutFactoring: LiquidityStep[];
  chartWindowDays: number;
}

/** Picks the longest (most conservative-to-illustrate) of a multi-select
 *  payment_terms answer — that's the one that actually creates the gap. */
function longestPaymentTermDays(stored: string | null | undefined): number | null {
  const codes = (stored ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const days = codes.map((c) => PAYMENT_TERM_MIDPOINT_DAYS[c]).filter((d): d is number => d != null);
  if (days.length === 0) return null;
  return Math.max(...days);
}

interface RawEvent {
  day: number;
  amount: number;
}

/** Turns dated cash events into a cumulative step series, sorted and summed. */
function toCumulativeSteps(events: RawEvent[]): LiquidityStep[] {
  const byDay = new Map<number, number>();
  for (const e of events) {
    byDay.set(e.day, (byDay.get(e.day) ?? 0) + e.amount);
  }
  const days = [...byDay.keys()].sort((a, b) => a - b);
  let cumulative = 0;
  return days.map((day) => {
    cumulative += byDay.get(day)!;
    return { day, cumulativeKr: cumulative };
  });
}

/**
 * Builds the "med/uten factoring" cumulative-liquidity comparison from a
 * lead's own quiz answers — an illustrative average estimate, not the
 * verified figure the credit check produces later. Returns null when the
 * two required answers (volume, payment terms) aren't both in yet.
 */
export function estimateLiquidity(answers: Partial<LeadAnswers>): LiquidityEstimate | null {
  const monthlyVolumeKr = VOLUME_MIDPOINT_KR[answers.monthly_invoice_volume ?? ""];
  const paymentTermDays = longestPaymentTermDays(answers.payment_terms);
  if (!monthlyVolumeKr || !paymentTermDays) return null;

  const invoiceCount = Math.min(
    MAX_CHART_INVOICES,
    Math.max(MIN_CHART_INVOICES, CUSTOMER_COUNT_MIDPOINT[answers.active_customer_count ?? ""] ?? 8)
  );
  const invoiceAmountKr = monthlyVolumeKr / invoiceCount;
  const interval = INVOICING_WINDOW_DAYS / invoiceCount;

  const factoringEvents: RawEvent[] = [];
  const noFactoringEvents: RawEvent[] = [];

  for (let i = 1; i <= invoiceCount; i++) {
    const issueDay = Math.round(i * interval);
    // Factoring: most of the invoice next day, the reserved remainder on the
    // same schedule the customer would have paid on anyway.
    factoringEvents.push({ day: issueDay + 1, amount: invoiceAmountKr * ADVANCE_RATE });
    factoringEvents.push({ day: issueDay + paymentTermDays, amount: invoiceAmountKr * (1 - ADVANCE_RATE) });
    // No factoring: the full invoice, only when the customer pays.
    noFactoringEvents.push({ day: issueDay + paymentTermDays, amount: invoiceAmountKr });
  }

  const withFactoring = toCumulativeSteps(factoringEvents);
  const withoutFactoring = toCumulativeSteps(noFactoringEvents);

  const lastDay = Math.max(
    withFactoring[withFactoring.length - 1]?.day ?? 0,
    withoutFactoring[withoutFactoring.length - 1]?.day ?? 0
  );
  const chartWindowDays = Math.max(55, lastDay + 5);

  return {
    monthlyVolumeKr,
    paymentTermDays,
    advanceRate: ADVANCE_RATE,
    immediateKr: monthlyVolumeKr * ADVANCE_RATE,
    finalTotalKr: monthlyVolumeKr,
    withFactoring,
    withoutFactoring,
    chartWindowDays,
  };
}
