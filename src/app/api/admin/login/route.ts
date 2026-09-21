import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ADMIN_SESSION_COOKIE, createSessionToken } from "@/lib/admin-auth";
import { verifyPassword } from "@/lib/password";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = body?.email;
  const password = body?.password;

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "E-post og passord er påkrevd" }, { status: 400 });
  }

  const { data: seller } = await supabaseAdmin
    .from("sellers")
    .select("id, password_hash")
    .ilike("email", email.trim())
    .maybeSingle();

  if (!seller?.password_hash || !(await verifyPassword(password, seller.password_hash))) {
    return NextResponse.json({ error: "Feil e-post eller passord" }, { status: 401 });
  }

  const token = await createSessionToken(seller.id);
  if (!token) {
    return NextResponse.json({ error: "Serverfeil: mangler SESSION_SECRET/ADMIN_PASSWORD" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
