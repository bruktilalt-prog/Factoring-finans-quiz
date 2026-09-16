"use client";

import { useState } from "react";

export interface ContactFormValues {
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  company_name: string;
  org_number: string;
  consent_given: boolean;
  free_text_note: string;
}

interface ContactFormStepProps {
  title: string;
  description?: string;
  initialValues: ContactFormValues;
  submitting: boolean;
  onSubmit: (values: ContactFormValues) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactFormStep({
  title,
  description,
  initialValues,
  submitting,
  onSubmit,
}: ContactFormStepProps) {
  const [values, setValues] = useState<ContactFormValues>(initialValues);
  const [touched, setTouched] = useState(false);

  const errors = {
    contact_name: values.contact_name.trim().length === 0 ? "Fyll inn navn" : null,
    contact_email: !EMAIL_PATTERN.test(values.contact_email.trim())
      ? "Fyll inn en gyldig e-postadresse"
      : null,
    company_name: values.company_name.trim().length === 0 ? "Fyll inn firmanavn" : null,
    consent_given: !values.consent_given ? "Du må godkjenne for å gå videre" : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  function update<K extends keyof ContactFormValues>(key: K, value: ContactFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (hasErrors) return;
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h2>
      {description && <p className="mt-2 text-slate-500">{description}</p>}

      <div className="mt-6 flex flex-col gap-4">
        <Field label="Navn" error={touched ? errors.contact_name : null}>
          <input
            type="text"
            value={values.contact_name}
            onChange={(e) => update("contact_name", e.target.value)}
            className="input"
            placeholder="Ola Nordmann"
            autoComplete="name"
          />
        </Field>

        <Field label="E-post" error={touched ? errors.contact_email : null}>
          <input
            type="email"
            value={values.contact_email}
            onChange={(e) => update("contact_email", e.target.value)}
            className="input"
            placeholder="ola@bedrift.no"
            autoComplete="email"
          />
        </Field>

        <Field label="Telefon (valgfritt)">
          <input
            type="tel"
            value={values.contact_phone}
            onChange={(e) => update("contact_phone", e.target.value)}
            className="input"
            placeholder="+47 900 00 000"
            autoComplete="tel"
          />
        </Field>

        <Field label="Firmanavn" error={touched ? errors.company_name : null}>
          <input
            type="text"
            value={values.company_name}
            onChange={(e) => update("company_name", e.target.value)}
            className="input"
            placeholder="Bedriften AS"
            autoComplete="organization"
          />
        </Field>

        <Field label="Organisasjonsnummer (valgfritt)">
          <input
            type="text"
            value={values.org_number}
            onChange={(e) => update("org_number", e.target.value)}
            className="input"
            placeholder="123 456 789"
            inputMode="numeric"
          />
        </Field>

        <Field label="Noe du vil fortelle oss? (valgfritt)">
          <textarea
            value={values.free_text_note}
            onChange={(e) => update("free_text_note", e.target.value)}
            className="input"
            rows={3}
            placeholder="F.eks. spesielle behov, tidsfrister eller annet vi bør vite"
          />
        </Field>

        <label className="mt-2 flex items-start gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={values.consent_given}
            onChange={(e) => update("consent_given", e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span>
            Jeg samtykker til at opplysningene ovenfor lagres og brukes til å kontakte meg om et
            factoringtilbud.
          </span>
        </label>
        {touched && errors.consent_given && (
          <p className="-mt-2 text-sm text-red-600">{errors.consent_given}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {submitting ? "Sender..." : "Send inn tilbudsforespørsel"}
      </button>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(226 232 240);
          padding: 0.75rem 1rem;
          color: rgb(15 23 42);
        }
        .input:focus {
          outline: none;
          border-color: rgb(37 99 235);
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-red-600">{error}</span>}
    </label>
  );
}
