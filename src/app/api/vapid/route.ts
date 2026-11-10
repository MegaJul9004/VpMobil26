import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Öffentlicher VAPID-Schlüssel (der private bleibt serverseitig). */
export async function GET() {
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? "" });
}
