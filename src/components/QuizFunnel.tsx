"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ProgressBar from "@/components/ProgressBar";
import SingleChoiceStep from "@/components/steps/SingleChoiceStep";
import MultiChoiceStep from "@/components/steps/MultiChoiceStep";
import ContactFormStep, { ContactFormValues } from "@/components/steps/ContactFormStep";
import MeetingTimeStep from "@/components/steps/MeetingTimeStep";
import { QUIZ_STEPS, TOTAL_STEPS } from "@/lib/quiz-config";
import { getOrCreateSessionId, getUtmParams, SESSION_STORAGE_KEY } from "@/lib/session";
import type { LeadAnswers, LeadRecord } from "@/lib/types";

type Phase = "loading" | "in-progress" | "submitting" | "done";

const EMPTY_ANSWERS: Partial<LeadAnswers> = {
  recognition_tags: [],
};

async function saveLead(sessionId: string, fields: Partial<LeadAnswers>) {
  const res = await fetch("/api/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, ...fields }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Kunne ikke lagre svaret");
  }
  return (await res.json()).lead as LeadRecord;
}

function firstUnansweredIndex(answers: Partial<LeadAnswers>): number {
  for (let i = 0; i < QUIZ_STEPS.length; i++) {
    const step = QUIZ_STEPS[i];
    if (step.kind === "contact-form") continue;
    const value = answers[step.field];
    const isEmpty =
      value === undefined ||
      value === null ||
      (Array.isArray(value) && value.length === 0);
    if (isEmpty) return i;
  }
  return QUIZ_STEPS.length - 1;
}

export default function QuizFunnel() {
  const sessionIdRef = useRef<string>("");
  const [phase, setPhase] = useState<Phase>("loading");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<LeadAnswers>>(EMPTY_ANSWERS);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    sessionIdRef.current = sessionId;

    (async () => {
      try {
        const res = await fetch(`/api/lead?session_id=${encodeURIComponent(sessionId)}`);
        const body = await res.json();
        const existing = body.lead as LeadRecord | null;

        if (existing?.status === "completed") {
          setAnswers(existing);
          setPhase("done");
          return;
        }

        if (existing) {
          const merged: Partial<LeadAnswers> = { ...EMPTY_ANSWERS, ...existing };
          setAnswers(merged);
          setCurrentIndex(firstUnansweredIndex(merged));
        } else {
          const utm = getUtmParams();
          const hasUtm = utm.utm_source || utm.utm_medium || utm.utm_campaign;
          if (hasUtm) {
            await saveLead(sessionId, utm);
            setAnswers((prev) => ({ ...prev, ...utm }));
          }
        }
      } catch {
        // No existing session yet, or a transient network error — start fresh either way.
      } finally {
        setPhase((p) => (p === "done" ? p : "in-progress"));
      }
    })();
  }, []);

  const currentStep = QUIZ_STEPS[currentIndex];

  const title = useMemo(() => {
    if (!currentStep) return "";
    if (currentStep.kind === "single-choice" && currentStep.getTitle) {
      return currentStep.getTitle(answers);
    }
    return currentStep.title;
  }, [currentStep, answers]);

  function goBack() {
    setSaveError(null);
    setCurrentIndex((i) => Math.max(0, i - 1));
  }

  /**
   * Awaited by every handler below before advancing to the next step. This is
   * the fix for lost early answers: multi-choice used to fire a save per
   * checkbox tap and advance on "Neste" without waiting for it, so a save
   * still in flight when the step changed could get killed by the mobile
   * browser backgrounding/suspending the tab. Every step now saves-then-advances.
   */
  async function persist(fields: Partial<LeadAnswers>) {
    setSaveError(null);
    setIsSaving(true);
    try {
      await saveLead(sessionIdRef.current, fields);
      return true;
    } catch {
      setSaveError("Klarte ikke å lagre svaret. Sjekk internettforbindelsen og prøv igjen.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSingleSelect(value: string) {
    if (currentStep.kind !== "single-choice" || isSaving) return;
    const storedValue = currentStep.toStoredValue ? currentStep.toStoredValue(value) : value;
    setAnswers((prev) => ({ ...prev, [currentStep.field]: storedValue }));
    const ok = await persist({ [currentStep.field]: storedValue } as Partial<LeadAnswers>);
    if (ok) setCurrentIndex((i) => Math.min(TOTAL_STEPS - 1, i + 1));
  }

  function handleMultiToggle(value: string) {
    if (currentStep.kind !== "multi-choice" || isSaving) return;
    const stored = answers[currentStep.field];
    const current = currentStep.fromStoredValue
      ? currentStep.fromStoredValue(stored)
      : ((stored as string[] | undefined) ?? []);
    const nextValues = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    const storedValue = currentStep.toStoredValue
      ? currentStep.toStoredValue(nextValues)
      : nextValues;
    // Only updates local state here — the multi-choice step has its own explicit
    // "Neste", which is what actually persists (see handleMultiContinue).
    setAnswers((prev) => ({ ...prev, [currentStep.field]: storedValue }));
  }

  async function handleMultiContinue() {
    if (currentStep.kind !== "multi-choice" || isSaving) return;
    const storedValue = answers[currentStep.field];
    const ok = await persist({ [currentStep.field]: storedValue } as Partial<LeadAnswers>);
    if (ok) setCurrentIndex((i) => Math.min(TOTAL_STEPS - 1, i + 1));
  }

  async function handleMeetingContinue(preferredMeetingAt: string | null) {
    if (isSaving) return;
    setAnswers((prev) => ({ ...prev, preferred_meeting_at: preferredMeetingAt }));
    const ok = await persist({ preferred_meeting_at: preferredMeetingAt });
    if (ok) setCurrentIndex((i) => Math.min(TOTAL_STEPS - 1, i + 1));
  }

  async function handleContactSubmit(values: ContactFormValues) {
    setPhase("submitting");
    const fields: Partial<LeadAnswers> = {
      ...values,
      status: "completed",
      consent_at: new Date().toISOString(),
    };
    try {
      await saveLead(sessionIdRef.current, fields);
      setAnswers((prev) => ({ ...prev, ...fields }));
      setPhase("done");
    } catch {
      setSaveError("Klarte ikke å sende inn skjemaet. Prøv igjen.");
      setPhase("in-progress");
    }
  }

  if (phase === "loading") {
    return <div className="py-24 text-center text-slate-400">Laster...</div>;
  }

  if (phase === "done") {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-7 w-7">
            <path
              fillRule="evenodd"
              d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42L8.5 12.09l6.79-6.8a1 1 0 011.42 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-slate-900">Takk, vi har mottatt svarene dine</h2>
        <p className="mt-2 text-slate-500">
          Vi tar kontakt med et uforpliktende tilbud på factoring så snart vi har sett gjennom
          opplysningene.
        </p>
        <button
          type="button"
          onClick={() => {
            window.localStorage.removeItem(SESSION_STORAGE_KEY);
            window.location.reload();
          }}
          className="mt-6 text-sm font-medium text-slate-400 hover:text-slate-600"
        >
          Start på nytt
        </button>
      </div>
    );
  }

  return (
    <div>
      <ProgressBar currentStep={currentIndex} totalSteps={TOTAL_STEPS} />

      {currentIndex > 0 && (
        <button
          type="button"
          onClick={goBack}
          disabled={isSaving}
          className="mb-4 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M12.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L8.414 10l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Tilbake
        </button>
      )}

      {currentStep.kind === "single-choice" && (
        <SingleChoiceStep
          key={currentStep.id}
          title={title}
          description={currentStep.description}
          options={currentStep.getOptions(answers)}
          value={
            currentStep.fromStoredValue
              ? currentStep.fromStoredValue(answers[currentStep.field])
              : ((answers[currentStep.field] as string | undefined) ?? null)
          }
          onSelect={handleSingleSelect}
          disabled={isSaving}
        />
      )}

      {currentStep.kind === "multi-choice" && (
        <MultiChoiceStep
          key={currentStep.id}
          title={title}
          description={currentStep.description}
          options={currentStep.getOptions(answers)}
          values={
            currentStep.fromStoredValue
              ? currentStep.fromStoredValue(answers[currentStep.field])
              : ((answers[currentStep.field] as string[] | undefined) ?? [])
          }
          minSelections={currentStep.minSelections}
          onToggle={handleMultiToggle}
          onContinue={handleMultiContinue}
          disabled={isSaving}
        />
      )}

      {currentStep.kind === "meeting-picker" && (
        <MeetingTimeStep
          key={currentStep.id}
          title={title}
          description={currentStep.description}
          initialValue={answers.preferred_meeting_at}
          onContinue={handleMeetingContinue}
          disabled={isSaving}
        />
      )}

      {currentStep.kind === "contact-form" && (
        <ContactFormStep
          title={title}
          description={currentStep.description}
          submitting={phase === "submitting"}
          initialValues={{
            contact_name: answers.contact_name ?? "",
            contact_email: answers.contact_email ?? "",
            contact_phone: answers.contact_phone ?? "",
            company_name: answers.company_name ?? "",
            org_number: answers.org_number ?? "",
            consent_given: answers.consent_given ?? false,
            free_text_note: answers.free_text_note ?? "",
          }}
          onSubmit={handleContactSubmit}
        />
      )}

      {saveError && <p className="mt-4 text-sm text-red-600">{saveError}</p>}
    </div>
  );
}
