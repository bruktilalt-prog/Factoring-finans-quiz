import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendAssignmentNotification } from "@/lib/notify";
import type { HandlingStatus, LeadRecord, Seller } from "@/lib/types";

const VALID_STATUSES: HandlingStatus[] = ["new", "contacted", "won", "lost"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ session_id: string }> }
) {
  const { session_id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  const update: Partial<Pick<LeadRecord, "handling_status" | "assigned_to">> = {};

  if ("handling_status" in body) {
    if (!VALID_STATUSES.includes(body.handling_status)) {
      return NextResponse.json({ error: "Ugyldig status" }, { status: 400 });
    }
    update.handling_status = body.handling_status;
  }

  if ("assigned_to" in body) {
    if (body.assigned_to !== null && typeof body.assigned_to !== "string") {
      return NextResponse.json({ error: "Ugyldig assigned_to" }, { status: 400 });
    }
    update.assigned_to = body.assigned_to;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Ingenting å oppdatere" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("leads")
    .update(update)
    .eq("session_id", session_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify the newly-assigned seller — fire-and-forget-ish, but we do wait
  // for it since this is a low-frequency admin action, not the public quiz.
  if (update.assigned_to) {
    const { data: seller } = await supabaseAdmin
      .from("sellers")
      .select("*")
      .eq("id", update.assigned_to)
      .maybeSingle();
    if (seller) {
      await sendAssignmentNotification(data as LeadRecord, seller as Seller);
    }
  }

  return NextResponse.json({ lead: data as LeadRecord });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ session_id: string }> }
) {
  const { session_id } = await params;

  const { error } = await supabaseAdmin.from("leads").delete().eq("session_id", session_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
