"use client";

import type { ChoiceOption } from "@/lib/quiz-config";

interface SingleChoiceStepProps {
  title: string;
  description?: string;
  options: ChoiceOption[];
  value: string | null;
  onSelect: (value: string) => void;
  disabled?: boolean;
}

export default function SingleChoiceStep({
  title,
  description,
  options,
  value,
  onSelect,
  disabled,
}: SingleChoiceStepProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h2>
      {description && <p className="mt-2 text-slate-500">{description}</p>}

      <div className="mt-6 flex flex-col gap-3">
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(option.value)}
              className={`w-full rounded-xl border px-5 py-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                isSelected
                  ? "border-blue-600 bg-blue-50 text-blue-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50"
              }`}
            >
              <span className="font-medium">{option.label}</span>
              {option.helpText && (
                <span className="mt-1 block text-sm text-slate-500">{option.helpText}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
