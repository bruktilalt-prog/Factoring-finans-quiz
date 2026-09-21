import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentSeller } from "@/lib/current-seller";
import { hashPassword } from "@/lib/password";

export async function POST(request: NextRequest) {
  const currentSeller = await getCurrentSeller();
  if (!currentSeller?.is_admin) {
    return NextResponse.json({ error: "Kun admin kan legge til selgere" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = body?.name;
  const email = body?.email;
  const password = body?.password;
  const isAdmin = Boolean(body?.is_admin);
  const territories = Array.isArray(body?.territories) ? body.territories : [];

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Navn er påkrevd" }, { status: 400 });
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Gyldig e-post er påkrevd" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Passord må være minst 8 tegn" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("sellers")
    .insert({
      name: name.trim(),
      email: email.trim(),
      territories,
      is_admin: isAdmin,
      password_hash: await hashPassword(password),
    })
    .select("id, name, email, territories, is_admin, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ seller: data });
}
