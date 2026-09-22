import { formatKr } from "@/lib/format";
import { estimateLiquidity } from "@/lib/liquidity-estimate";
import type { LeadAnswers } from "@/lib/types";
import type { LiquidityEstimate, LiquidityStep } from "@/lib/liquidity-estimate";

const PLOT_X0 = 20;
const PLOT_X1 = 320;
const PLOT_Y0 = 20;
const PLOT_Y1 = 150;

function buildStepPath(
  steps: LiquidityStep[],
  xDay: (day: number) => number,
  yVal: (kr: number) => number,
  windowDays: number
): string {
  let d = `M${PLOT_X0},${PLOT_Y1}`;
  let prevY = PLOT_Y1;
  for (const step of steps) {
    const x = xDay(step.day);
    const y = yVal(step.cumulativeKr);
    d += ` L${x.toFixed(1)},${prevY.toFixed(1)} L${x.toFixed(1)},${y.toFixed(1)}`;
    prevY = y;
  }
  d += ` L${xDay(windowDays).toFixed(1)},${prevY.toFixed(1)}`;
  return d;
}

/** First step where the cumulative value reaches the "day 1 impact" figure —
 *  robust to how the advance/reserve events happen to interleave. */
function findMilestoneStep(steps: LiquidityStep[], targetKr: number): LiquidityStep | undefined {
  return steps.find((s) => s.cumulativeKr >= targetKr - 1);
}

function LiquidityChart({ estimate }: { estimate: LiquidityEstimate }) {
  const { withFactoring, withoutFactoring, chartWindowDays, immediateKr, finalTotalKr, paymentTermDays } = estimate;

  const xDay = (day: number) => PLOT_X0 + (day / chartWindowDays) * (PLOT_X1 - PLOT_X0);
  const maxKr = finalTotalKr * 1.08;
  const yVal = (kr: number) => PLOT_Y1 - (kr / maxKr) * (PLOT_Y1 - PLOT_Y0);

  const factoringPath = buildStepPath(withFactoring, xDay, yVal, chartWindowDays);
  const factoringArea = `${factoringPath} L${xDay(chartWindowDays).toFixed(1)},${PLOT_Y1} L${PLOT_X0},${PLOT_Y1} Z`;
  const noFactoringPath = buildStepPath(withoutFactoring, xDay, yVal, chartWindowDays);

  const milestone = findMilestoneStep(withFactoring, immediateKr);

  return (
    <>
      <div className="mt-3 flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5 font-medium text-blue-600">
          <span className="h-2 w-2 rounded-full bg-blue-600" /> Med factoring
        </span>
        <span className="flex items-center gap-1.5 font-medium text-slate-400">
          <span className="h-2 w-2 rounded-full bg-slate-400" /> Uten factoring
        </span>
      </div>

      <svg
        viewBox="0 0 340 190"
        width="100%"
        height="190"
        role="img"
        aria-label={`Med factoring har dere typisk ${formatKr(immediateKr)} tilgjengelig i løpet av kort tid — normalt utbetales 70 til 85 prosent av fakturabeløpet ved fakturering, og resten når kunden betaler. Uten factoring venter dere ${paymentTermDays} dager på de første kronene.`}
      >
        <line x1={PLOT_X0} y1={PLOT_Y1} x2={PLOT_X1} y2={PLOT_Y1} stroke="#e2e8f0" strokeWidth={1} />

        <path d={noFactoringPath} fill="none" stroke="#94a3b8" strokeWidth={2} strokeLinejoin="round" strokeDasharray="4 3" />

        <path d={factoringArea} fill="#2563eb" fillOpacity={0.1} />
        <path d={factoringPath} fill="none" stroke="#2563eb" strokeWidth={2.5} strokeLinejoin="round" />

        {milestone && (
          <>
            <circle cx={xDay(milestone.day)} cy={yVal(milestone.cumulativeKr)} r={3.5} fill="#2563eb" stroke="#ffffff" strokeWidth={1.5} />
            <text
              x={Math.min(xDay(milestone.day) + 4, PLOT_X1 - 60)}
              y={Math.max(yVal(milestone.cumulativeKr) - 8, 14)}
              fontSize={11}
              fontWeight={800}
              fill="#0f172a"
            >
              {formatKr(immediateKr)}
            </text>
          </>
        )}

        <text x={PLOT_X0} y={166} fontSize={9.5} fill="#cbd5e1">Dag 0</text>
        <text x={xDay(Math.round(chartWindowDays / 2))} y={166} textAnchor="middle" fontSize={9.5} fill="#cbd5e1">
          Dag {Math.round(chartWindowDays / 2)}
        </text>
        <text x={PLOT_X1} y={166} textAnchor="end" fontSize={9.5} fill="#cbd5e1">Dag {chartWindowDays}</text>
      </svg>
    </>
  );
}

export default function LiquidityEstimateSection({ answers }: { answers: Partial<LeadAnswers> }) {
  const estimate = estimateLiquidity(answers);
  if (!estimate) return null;

  return (
    <>
      <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-center">
        <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">Basert på svarene dine</p>
        <p className="mt-1.5 text-3xl font-extrabold leading-none text-slate-900">
          {formatKr(estimate.immediateKr)}
        </p>
        <p className="mt-1.5 text-sm text-slate-500">i frigjort arbeidskapital</p>
      </div>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 text-left">
        <h3 className="font-semibold text-slate-900">Hva betyr dette for dere?</h3>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
          Gjennomsnittlig anslag basert på deres egne svar — slik ser tilgjengelig kapital ut, dag for dag:
        </p>

        <LiquidityChart estimate={estimate} />

        <div className="mt-1 h-px bg-slate-100" />
        <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-900">Med factoring</strong> har dere typisk{" "}
          {formatKr(estimate.immediateKr)} tilgjengelig i løpet av kort tid — normalt utbetales 70–85 % av
          fakturabeløpet ved fakturering, og resten når kunden betaler.{" "}
          <strong className="text-slate-500">Uten factoring</strong> venter dere {estimate.paymentTermDays} dager på
          de første kronene.
        </p>
        <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
          Gjennomsnittlig anslag basert på deres egne svar på fakturavolum og betalingsfrist. Endelig ramme avhenger
          av kredittvurderingen.
        </p>
      </section>
    </>
  );
}
