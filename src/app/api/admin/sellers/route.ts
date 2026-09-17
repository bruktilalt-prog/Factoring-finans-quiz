import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const name = body?.name;
  const email = body?.email;
  const territories = Array.isArray(body?.territories) ? body.territories : [];

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Navn er påkrevd" }, { status: 400 });
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Gyldig e-post er påkrevd" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("sellers")
    .insert({ name: name.trim(), email: email.trim(), territories })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ seller: data });
}
