export const ADMIN_SESSION_COOKIE = "admin_session";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Derived from the admin password — never store the password itself in the cookie. */
export async function getExpectedSessionToken(): Promise<string | null> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return sha256Hex(`admin-session-v1:${password}`);
}

export function checkPassword(candidate: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  return Boolean(password) && candidate === password;
}
