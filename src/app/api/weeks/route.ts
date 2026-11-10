import { NextResponse } from "next/server";
import { availableWeeks } from "@/lib/plan/fetch";
import { defaultStartDate } from "@/lib/plan/dates";

export const dynamic = "force-dynamic";

/** GET /api/weeks – verfügbare Kalenderwochen (aktuelle −1 … +3). */
export async function GET() {
  try {
    const weeks = await availableWeeks(defaultStartDate(), 1, 3);
    return NextResponse.json({ weeks: weeks.filter((w) => w.available) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
