"use client";

import { useMemo, useState } from "react";

interface MeetingTimeStepProps {
  title: string;
  description?: string;
  initialValue: string | null | undefined;
  onContinue: (preferredMeetingAt: string | null) => void;
  disabled?: boolean;
}

type TimeSlot = "morning" | "afternoon" | "flexible";

const SLOT_HOUR: Record<TimeSlot, number> = {
  morning: 10,
  afternoon: 14,
  flexible: 12,
};

const SLOT_LABELS: { value: TimeSlot; label: string; helpText: string }[] = [
  { value: "morning", label: "Formiddag", helpText: "09–12" },
  { value: "afternoon", label: "Ettermiddag", helpText: "12–16" },
  { value: "flexible", label: "Fleksibelt", helpText: "Vi avtaler" },
];

function buildUpcomingWeekdays(count: number): Date[] {
  const days: Date[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() + 1);

  while (days.length < count) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      days.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

const weekdayFormatter = new Intl.DateTimeFormat("nb-NO", { weekday: "short" });
const dayMonthFormatter = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short" });

export default function MeetingTimeStep({
  title,
  description,
  initialValue,
  onContinue,
  disabled,
}: MeetingTimeStepProps) {
  const days = useMemo(() => buildUpcomingWeekdays(10), []);

  const initialDate = initialValue ? new Date(initialValue) : null;
  const [selectedDay, setSelectedDay] = useState<Date | null>(
    initialDate && !Number.isNaN(initialDate.getTime()) ? initialDate : null
  );
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const canContinue = selectedDay !== null && selectedSlot !== null;

  function handleConfirm() {
    if (!selectedDay || !selectedSlot) return;
    const meetingDate = new Date(selectedDay);
    meetingDate.setHours(SLOT_HOUR[selectedSlot], 0, 0, 0);
    onContinue(meetingDate.toISOString());
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h2>
      {description && <p className="mt-2 text-slate-500">{description}</p>}

      <div className="mt-6 grid grid-cols-5 gap-2">
        {days.map((day) => {
          const isSelected = selectedDay !== null && dateKey(day) === dateKey(selectedDay);
          return (
            <button
              key={dateKey(day)}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`flex flex-col items-center rounded-xl border px-2 py-3 text-center transition-colors ${
                isSelected
                  ? "border-blue-600 bg-blue-50 text-blue-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50"
              }`}
            >
              <span className="text-xs uppercase text-slate-400">
                {weekdayFormatter.format(day)}
              </span>
              <span className="mt-1 text-sm font-medium">{dayMonthFormatter.format(day)}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {SLOT_LABELS.map((slot) => {
          const isSelected = selectedSlot === slot.value;
          return (
            <button
              key={slot.value}
              type="button"
              onClick={() => setSelectedSlot(slot.value)}
              className={`flex-1 rounded-xl border px-4 py-3 text-left transition-colors ${
                isSelected
                  ? "border-blue-600 bg-blue-50 text-blue-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50"
              }`}
            >
              <span className="block font-medium">{slot.label}</span>
              <span className="block text-sm text-slate-500">{slot.helpText}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!canContinue || disabled}
        onClick={handleConfirm}
        className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
      >
        {disabled ? "Lagrer..." : "Neste"}
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onContinue(null)}
        className="mt-3 w-full text-center text-sm font-medium text-slate-400 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Vi avtaler tidspunkt senere
      </button>
    </div>
  );
}
