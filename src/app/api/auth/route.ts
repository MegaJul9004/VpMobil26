import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, computeAuthToken, isValidAuthToken, verifyAppPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** GET /api/auth – Prüft, ob die Sitzung bereits per Cookie entsperrt ist. */
export async function GET(req: NextRequest) {
  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  const authenticated = isValidAuthToken(cookie);
  return NextResponse.json({ authenticated }, { headers: { "Cache-Control": "no-store" } });
}

/** POST /api/auth – Prüft das eingegebene Passwort gegen APP_PASSWORD in .env. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  if (!verifyAppPassword(body.password)) {
    return NextResponse.json(
      { ok: false, error: "Falsches Passwort. Bitte erneut versuchen." },
      { status: 401 }
    );
  }
  const token = computeAuthToken();
  const res = NextResponse.json({ ok: true, authenticated: true });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 Tage
  });
  return res;
}

/** DELETE /api/auth – Sperrt die Sitzung wieder (Logout). */
export async function DELETE() {
  const res = NextResponse.json({ ok: true, authenticated: false });
  res.cookies.delete(AUTH_COOKIE);
  return res;
}
