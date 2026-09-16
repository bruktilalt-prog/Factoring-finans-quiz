"use client";

import type { ChoiceOption } from "@/lib/quiz-config";

interface MultiChoiceStepProps {
  title: string;
  description?: string;
  options: ChoiceOption[];
  values: string[];
  minSelections?: number;
  onToggle: (value: string) => void;
  onContinue: () => void;
  disabled?: boolean;
}

export default function MultiChoiceStep({
  title,
  description,
  options,
  values,
  minSelections = 1,
  onToggle,
  onContinue,
  disabled,
}: MultiChoiceStepProps) {
  const canContinue = values.length >= minSelections && !disabled;

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h2>
      {description && <p className="mt-2 text-slate-500">{description}</p>}

      <div className="mt-6 flex flex-col gap-3">
        {options.map((option) => {
          const isSelected = values.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(option.value)}
              className={`flex w-full items-center gap-3 rounded-xl border px-5 py-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                isSelected
                  ? "border-blue-600 bg-blue-50 text-blue-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                  isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"
                }`}
              >
                {isSelected && (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path
                      fillRule="evenodd"
                      d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42L8.5 12.09l6.79-6.8a1 1 0 011.42 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </span>
              <span className="font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!canContinue}
        onClick={onContinue}
        className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
      >
        {disabled ? "Lagrer..." : "Neste"}
      </button>
    </div>
  );
}
