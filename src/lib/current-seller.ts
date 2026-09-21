import "server-only";
import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase-admin";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "./admin-auth";
import type { Seller } from "./types";

/** Never selects password_hash — this return value can end up rendered
 *  into pages, so keep it to columns that are safe to expose. */
const SAFE_SELLER_COLUMNS = "id, name, email, territories, is_admin, created_at";

export async function getCurrentSeller(): Promise<Seller | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const sellerId = await verifySessionToken(token);
  if (!sellerId) return null;

  const { data } = await supabaseAdmin
    .from("sellers")
    .select(SAFE_SELLER_COLUMNS)
    .eq("id", sellerId)
    .maybeSingle();

  return (data as Seller | null) ?? null;
}
