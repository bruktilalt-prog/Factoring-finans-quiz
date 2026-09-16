import type { LeadAnswers } from "./types";

export interface ChoiceOption {
  value: string;
  label: string;
  helpText?: string;
}

interface BaseStep {
  id: string;
  field: keyof LeadAnswers;
  title: string;
  /** Optional supporting copy shown under the title. */
  description?: string;
}

export interface SingleChoiceStepConfig extends BaseStep {
  kind: "single-choice";
  /** Options can depend on answers given so far (branching). */
  getOptions: (answers: Partial<LeadAnswers>) => ChoiceOption[];
  getTitle?: (answers: Partial<LeadAnswers>) => string;
  /** Maps the selected option value to the value stored in Supabase. */
  toStoredValue?: (value: string) => LeadAnswers[keyof LeadAnswers];
  fromStoredValue?: (value: LeadAnswers[keyof LeadAnswers]) => string;
}

export interface MultiChoiceStepConfig extends BaseStep {
  kind: "multi-choice";
  getOptions: (answers: Partial<LeadAnswers>) => ChoiceOption[];
  minSelections?: number;
  /** The DB column for this field is a single text column, so multi-selections are encoded as one value. */
  toStoredValue?: (values: string[]) => LeadAnswers[keyof LeadAnswers];
  fromStoredValue?: (value: LeadAnswers[keyof LeadAnswers]) => string[];
}

export interface ContactFormStepConfig extends BaseStep {
  kind: "contact-form";
}

export interface MeetingPickerStepConfig extends BaseStep {
  kind: "meeting-picker";
}

export type QuizStepConfig =
  | SingleChoiceStepConfig
  | MultiChoiceStepConfig
  | ContactFormStepConfig
  | MeetingPickerStepConfig;

export const RECOGNITION_OPTIONS: ChoiceOption[] = [
  {
    value: "waiting_on_payment",
    label: "Vi venter ofte 30–90 dager på betaling fra kunder",
  },
  {
    value: "growth_capital_gap",
    label: "Vi har vekst, men mangler arbeidskapital til å følge den",
  },
  {
    value: "turning_down_orders",
    label: "Vi har sagt nei til ordre på grunn av likviditet",
  },
  {
    value: "chasing_invoices",
    label: "Vi bruker mye tid på purringer og fakturaoppfølging",
  },
  {
    value: "first_time_factoring",
    label: "Vi vurderer factoring for første gang",
  },
];

export const CUSTOMER_TYPE_OPTIONS: ChoiceOption[] = [
  { value: "b2b", label: "Bedrifter (B2B)" },
  { value: "public", label: "Det offentlige (stat/kommune)" },
  { value: "b2c", label: "Privatpersoner (B2C)" },
];

export const INVOICE_VOLUME_OPTIONS: ChoiceOption[] = [
  { value: "under_200k", label: "Under 200 000 kr" },
  { value: "200k_500k", label: "200 000 – 500 000 kr" },
  { value: "500k_1_5m", label: "500 000 – 1 500 000 kr" },
  { value: "1_5m_5m", label: "1 500 000 – 5 000 000 kr" },
  { value: "over_5m", label: "Over 5 000 000 kr" },
];

export const PAYMENT_TERMS_OPTIONS: ChoiceOption[] = [
  { value: "under_14d", label: "Under 14 dager" },
  { value: "14_30d", label: "14–30 dager" },
  { value: "30_60d", label: "30–60 dager" },
  { value: "60_90d", label: "60–90 dager" },
  { value: "over_90d", label: "Over 90 dager" },
];

export const FINANCING_OPTIONS: ChoiceOption[] = [
  { value: "none", label: "Ingen finansiering" },
  { value: "factoring", label: "Factoring" },
  { value: "overdraft", label: "Kassekreditt" },
  { value: "both", label: "Både factoring og kassekreditt" },
];

export const ACTIVE_CUSTOMER_COUNT_OPTIONS: ChoiceOption[] = [
  { value: "1_5", label: "1–5" },
  { value: "6_20", label: "6–20" },
  { value: "21_50", label: "21–50" },
  { value: "over_50", label: "Over 50" },
];

export const CONCENTRATION_OPTIONS: ChoiceOption[] = [
  { value: "under_25", label: "Nei, ingen enkeltkunde over 25 %" },
  { value: "25_50", label: "Ja, én kunde utgjør 25–50 %" },
  { value: "over_50", label: "Ja, én kunde utgjør over 50 %" },
];

export const URGENCY_OPTIONS: ChoiceOption[] = [
  { value: "urgent", label: "Akutt — vi trenger kapital nå" },
  { value: "soon", label: "Innen få uker" },
  {
    value: "planned_growth",
    label: "Vi ser økt volum komme (f.eks. nye kontrakter) og planlegger fremover",
  },
  { value: "exploring", label: "Utforsker/tester markedet, ingen hast" },
];

export const ROLE_OPTIONS: ChoiceOption[] = [
  { value: "yes", label: "Ja, jeg tar beslutningen" },
  {
    value: "no",
    label: "Nei, men jeg kan sette dere i kontakt med riktig person",
  },
];

function joinValues(values: string[]): string {
  return values.join(",");
}

function splitValues(value: unknown): string[] {
  return typeof value === "string" && value.length > 0 ? value.split(",") : [];
}

/** The concentration question's wording changes depending on who the customer's own customers are. */
function concentrationTitle(answers: Partial<LeadAnswers>): string {
  const types = splitValues(answers.customer_type);
  const subject = types.includes("public") && types.length === 1 ? "oppdragsgiver" : "kunde";
  return `Utgjør én enkelt ${subject} mer enn 25 % av fakturavolumet deres?`;
}

export const QUIZ_STEPS: QuizStepConfig[] = [
  {
    id: "recognition",
    field: "recognition_tags",
    kind: "multi-choice",
    title: "Hva kjenner du deg igjen i?",
    description: "Velg alt som stemmer for din bedrift.",
    minSelections: 1,
    getOptions: () => RECOGNITION_OPTIONS,
  },
  {
    id: "customer_type",
    field: "customer_type",
    kind: "multi-choice",
    title: "Hvem er kundene deres, altså de dere fakturerer?",
    description: "Velg alle som stemmer — mange har flere typer kunder.",
    minSelections: 1,
    getOptions: () => CUSTOMER_TYPE_OPTIONS,
    toStoredValue: joinValues,
    fromStoredValue: splitValues,
  },
  {
    id: "invoice_volume",
    field: "monthly_invoice_volume",
    kind: "single-choice",
    title: "Hvor stort er fakturavolumet per måned?",
    getOptions: () => INVOICE_VOLUME_OPTIONS,
  },
  {
    id: "payment_terms",
    field: "payment_terms",
    kind: "multi-choice",
    title: "Hvilke betalingsfrister har kundene deres?",
    description:
      "Velg alle som er vanlige hos dere — mange har flere, og noen kunder bestemmer selv fristen.",
    minSelections: 1,
    getOptions: () => PAYMENT_TERMS_OPTIONS,
    toStoredValue: joinValues,
    fromStoredValue: splitValues,
  },
  {
    id: "financing",
    field: "existing_pledge",
    kind: "single-choice",
    title: "Har dere factoring eller kassekreditt i dag?",
    getOptions: () => FINANCING_OPTIONS,
  },
  {
    id: "active_customer_count",
    field: "active_customer_count",
    kind: "single-choice",
    title: "Hvor mange aktive kunder fakturerer dere til i en typisk måned?",
    getOptions: () => ACTIVE_CUSTOMER_COUNT_OPTIONS,
  },
  {
    id: "customer_concentration",
    field: "customer_concentration",
    kind: "single-choice",
    title: "Utgjør én enkelt kunde mer enn 25 % av fakturavolumet deres?",
    getTitle: concentrationTitle,
    getOptions: () => CONCENTRATION_OPTIONS,
  },
  {
    id: "urgency",
    field: "urgency",
    kind: "single-choice",
    title: "Hvor akutt er behovet deres?",
    getOptions: () => URGENCY_OPTIONS,
  },
  {
    id: "role",
    field: "decision_maker",
    kind: "single-choice",
    title: "Er du beslutningstaker for en eventuell factoringavtale?",
    getOptions: () => ROLE_OPTIONS,
    toStoredValue: (value) => value === "yes",
    fromStoredValue: (value) => (value === true ? "yes" : value === false ? "no" : ""),
  },
  {
    id: "meeting",
    field: "preferred_meeting_at",
    kind: "meeting-picker",
    title: "Når passer det med et kort møte?",
    description: "Velg en dag og et tidspunkt som passer, så booker vi deg inn.",
  },
  {
    id: "contact",
    field: "contact_name",
    kind: "contact-form",
    title: "Nesten i mål — hvor sender vi tilbudet?",
    description:
      "Vi bruker opplysningene til å sette opp et uforpliktende tilbud på factoring.",
  },
];

export const TOTAL_STEPS = QUIZ_STEPS.length;
