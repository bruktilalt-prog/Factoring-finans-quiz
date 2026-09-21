import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentSeller } from "@/lib/current-seller";
import { HANDLING_STATUS_LABELS, type LeadRecord } from "@/lib/types";

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const currentSeller = await getCurrentSeller();

  let query = supabaseAdmin.from("leads").select("*");

  const q = params.get("q");
  if (q) {
    const term = q.trim();
    query = query.or(
      `company_name.ilike.%${term}%,contact_name.ilike.%${term}%,contact_email.ilike.%${term}%`
    );
  }
  const status = params.get("status");
  if (status) query = query.eq("handling_status", status);

  if (params.get("mine") === "1" && currentSeller) {
    query = query.eq("assigned_to", currentSeller.id);
  } else if (params.get("assigned") === "none") {
    query = query.is("assigned_to", null);
  } else if (params.get("assigned")) {
    query = query.eq("assigned_to", params.get("assigned") as string);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const leads = (data ?? []) as LeadRecord[];

  const { data: sellersData } = await supabaseAdmin.from("sellers").select("id, name");
  const sellerNames = new Map((sellersData ?? []).map((s) => [s.id, s.name]));

  const headers = [
    "Mottatt",
    "Status",
    "Behandlingsstatus",
    "Firmanavn",
    "Org.nr",
    "Kontaktperson",
    "E-post",
    "Telefon",
    "Tildelt",
    "Fakturavolum/mnd",
    "Hastegrad",
    "Anslått ramme (kr)",
  ];

  const rows = leads.map((lead) => [
    lead.created_at ?? "",
    lead.status === "completed" ? "Fullført" : "Pågår",
    HANDLING_STATUS_LABELS[lead.handling_status ?? "new"],
    lead.company_name ?? "",
    lead.org_number ?? "",
    lead.contact_name ?? "",
    lead.contact_email ?? "",
    lead.contact_phone ?? "",
    lead.assigned_to ? (sellerNames.get(lead.assigned_to) ?? "") : "",
    lead.monthly_invoice_volume ?? "",
    lead.urgency ?? "",
    lead.estimated_frame_kr ?? "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\r\n");

  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
