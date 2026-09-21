import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentSeller } from "@/lib/current-seller";
import type { LeadNote } from "@/lib/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ session_id: string }> }
) {
  const { session_id } = await params;
  const seller = await getCurrentSeller();
  if (!seller) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const noteBody = typeof body?.body === "string" ? body.body.trim() : "";
  if (!noteBody) {
    return NextResponse.json({ error: "Notatet kan ikke være tomt" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("lead_notes")
    .insert({ session_id, seller_id: seller.id, body: noteBody })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ note: data as LeadNote });
}
