import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentSeller } from "@/lib/current-seller";
import { hashPassword } from "@/lib/password";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentSeller = await getCurrentSeller();
  if (!currentSeller?.is_admin) {
    return NextResponse.json({ error: "Kun admin kan redigere selgere" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if ("name" in body) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ error: "Navn er påkrevd" }, { status: 400 });
    }
    update.name = body.name.trim();
  }

  if ("email" in body) {
    if (typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: "Gyldig e-post er påkrevd" }, { status: 400 });
    }
    update.email = body.email.trim();
  }

  if ("territories" in body) {
    if (!Array.isArray(body.territories) || !body.territories.every((t: unknown) => typeof t === "string")) {
      return NextResponse.json({ error: "Ugyldige områder" }, { status: 400 });
    }
    update.territories = body.territories;
  }

  if ("is_admin" in body) {
    if (typeof body.is_admin !== "boolean") {
      return NextResponse.json({ error: "Ugyldig is_admin" }, { status: 400 });
    }
    if (id === currentSeller.id && body.is_admin === false) {
      return NextResponse.json(
        { error: "Du kan ikke fjerne din egen admin-tilgang." },
        { status: 400 }
      );
    }
    update.is_admin = body.is_admin;
  }

  if ("password" in body && body.password) {
    if (typeof body.password !== "string" || body.password.length < 8) {
      return NextResponse.json({ error: "Passord må være minst 8 tegn" }, { status: 400 });
    }
    update.password_hash = await hashPassword(body.password);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Ingenting å oppdatere" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("sellers")
    .update(update)
    .eq("id", id)
    .select("id, name, email, territories, is_admin, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ seller: data });
}
