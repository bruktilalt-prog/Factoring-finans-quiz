export type LeadStatus = "in_progress" | "completed";

/** Sales workflow status — separate from `status`, which only tracks quiz completion. */
export type HandlingStatus = "new" | "contacted" | "won" | "lost";

export const HANDLING_STATUS_LABELS: Record<HandlingStatus, string> = {
  new: "Ny",
  contacted: "Kontaktet",
  won: "Vunnet",
  lost: "Tapt",
};

export interface Seller {
  id: string;
  name: string;
  email: string;
  territories: string[];
  is_admin?: boolean;
  created_at?: string;
}

export interface LeadResearch {
  brreg: import("./brreg").BrregData | null;
  /** flags here already includes the AI health check's short economic
   *  flags merged in alongside the quiz-based ones — see route.ts. */
  summary: import("./lead-summary").LeadSummary;
  aiHealthCheck?: string | null;
}

/** Mirrors the public.leads table schema in Supabase. */
export interface LeadRecord {
  id?: string;
  session_id: string;
  status?: LeadStatus;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  recognition_tags?: string[] | null;
  /** Comma-joined when the customer has more than one customer type (e.g. "b2b,b2c"). */
  customer_type?: string | null;
  monthly_invoice_volume?: string | null;
  payment_terms?: string | null;
  existing_pledge?: string | null;
  customer_concentration?: string | null;
  active_customer_count?: string | null;
  urgency?: string | null;
  decision_maker?: boolean | null;
  preferred_meeting_at?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  org_number?: string | null;
  company_name?: string | null;
  consent_given?: boolean | null;
  consent_at?: string | null;
  free_text_note?: string | null;
  research?: LeadResearch | null;
  research_completed_at?: string | null;
  handling_status?: HandlingStatus;
  assigned_to?: string | null;
  follow_up_at?: string | null;
  /** Estimated factoring frame in kr — AI-suggested on enrichment, always
   *  editable afterwards. Never overwritten once set. */
  estimated_frame_kr?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface LeadNote {
  id: string;
  session_id: string;
  seller_id: string;
  body: string;
  created_at: string;
}

/** Fields the quiz UI is allowed to write. Keeps the API route from accepting arbitrary columns. */
export type LeadAnswers = Pick<
  LeadRecord,
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "recognition_tags"
  | "customer_type"
  | "monthly_invoice_volume"
  | "payment_terms"
  | "existing_pledge"
  | "customer_concentration"
  | "active_customer_count"
  | "urgency"
  | "decision_maker"
  | "preferred_meeting_at"
  | "contact_name"
  | "contact_email"
  | "contact_phone"
  | "org_number"
  | "company_name"
  | "consent_given"
  | "consent_at"
  | "free_text_note"
  | "status"
>;
