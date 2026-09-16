import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, checkPassword, getExpectedSessionToken } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const password = body?.password;

  if (typeof password !== "string" || !checkPassword(password)) {
    return NextResponse.json({ error: "Feil passord" }, { status: 401 });
  }

  const token = await getExpectedSessionToken();
  if (!token) {
    return NextResponse.json({ error: "ADMIN_PASSWORD er ikke satt på serveren" }, { status: 500 });
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
