interface ProgressBarProps {
  currentStep: number; // 0-indexed
  totalSteps: number;
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const percent = Math.round(((currentStep + 1) / totalSteps) * 100);

  return (
    <div className="mb-8 w-full">
      <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
        <span>
          Steg {currentStep + 1} av {totalSteps}
        </span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
