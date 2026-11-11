import crypto from "node:crypto";

export const AUTH_COOKIE = "vp_auth";

function getExpectedPassword(): string {
  return process.env.APP_PASSWORD ?? "";
}

/** Erzeugt einen deterministischen HMAC-Token aus dem in .env gesetzten APP_PASSWORD. */
export function computeAuthToken(): string {
  const pw = getExpectedPassword();
  const secret = process.env.VAPID_PRIVATE_KEY ?? "vpmobil24-auth-secret";
  return crypto.createHmac("sha256", secret).update(`vp-auth:${pw}`).digest("hex");
}

/** Vergleicht das vom Nutzer eingegebene Passwort konstantzeitig mit APP_PASSWORD aus .env. */
export function verifyAppPassword(input: unknown): boolean {
  if (typeof input !== "string") return false;
  const expected = getExpectedPassword();
  if (!expected) return false;
  const a = Buffer.from(input.trim(), "utf8");
  const b = Buffer.from(expected.trim(), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Prüft, ob ein übergebenes Cookie-Token gültig ist. */
export function isValidAuthToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const expected = computeAuthToken();
  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
