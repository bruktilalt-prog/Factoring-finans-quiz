export const ADMIN_SESSION_COOKIE = "admin_session";

const encoder = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Falls back to ADMIN_PASSWORD so no new required env var — but set
 *  SESSION_SECRET explicitly once this is a real multi-user system. */
function sessionSecret(): string | null {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || null;
}

/** Cookie value is `<sellerId>.<hmac>` — proves the sellerId wasn't
 *  tampered with, without needing a DB lookup just to check the signature
 *  (that happens separately, in getCurrentSeller, when full details are
 *  actually needed). */
export async function createSessionToken(sellerId: string): Promise<string | null> {
  const secret = sessionSecret();
  if (!secret) return null;
  return `${sellerId}.${await hmacHex(secret, sellerId)}`;
}

/** Returns the seller id the token was issued for, or null if missing,
 *  malformed, or the signature doesn't match. */
export async function verifySessionToken(token: string | undefined | null): Promise<string | null> {
  const secret = sessionSecret();
  if (!secret || !token) return null;

  const separatorIndex = token.lastIndexOf(".");
  if (separatorIndex === -1) return null;
  const sellerId = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  if (!sellerId || !signature) return null;

  const expected = await hmacHex(secret, sellerId);
  if (expected.length !== signature.length) return null;

  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0 ? sellerId : null;
}
