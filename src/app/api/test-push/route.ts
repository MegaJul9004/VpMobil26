import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema, ensureMigrated } from "@/db";
import { fetchDay } from "@/lib/plan/fetch";
import { diffClassDay, filterLessons } from "@/lib/plan/diff";
import { addDays, defaultStartDate } from "@/lib/plan/dates";
import { sendPush } from "@/lib/push";
import type { ClassDay } from "@/lib/plan/types";

export const dynamic = "force-dynamic";

/**
 * POST { endpoint } – simuliert eine Änderung am echten Plan der abonnierten Klasse,
 * erzeugt den Text über die echte Diffing-Engine und sendet eine echte Push-Nachricht.
 */
export async function POST(req: NextRequest) {
  ensureMigrated();
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (!endpoint) return NextResponse.json({ error: "endpoint fehlt" }, { status: 400 });
  const sub = db.select().from(schema.subscriptions).where(eq(schema.subscriptions.endpoint, endpoint)).get();
  if (!sub) return NextResponse.json({ error: "Kein Abo gefunden – bitte zuerst Push aktivieren" }, { status: 404 });

  try {
    // nächster verfügbarer Tag mit Unterricht für die Klasse
    let date = defaultStartDate();
    let day: ClassDay | undefined;
    for (let i = 0; i < 10 && !day; i++) {
      const plan = await fetchDay(date);
      const c = plan?.plans[sub.className];
      if (c && filterLessons(c.lessons, sub.courses).some((l) => !l.cancelled)) day = c;
      else date = addDays(date, 1);
    }

    let title = `🚨 Planänderung ${sub.className} (Test)`;
    let body = "Dies ist eine simulierte Test-Änderung.";
    if (day) {
      const fresh: ClassDay = JSON.parse(JSON.stringify(day));
      const target = filterLessons(fresh.lessons, sub.courses).find((l) => !l.cancelled)!;
      Object.assign(target, { ra: "204", raChanged: true, le: "Mey", leChanged: true, info: "Test-Änderung (simuliert)" });
      const d = diffClassDay(day, fresh, date, sub.courses);
      if (d) ({ title, body } = d);
    }
    const ok = await sendPush(sub, { title, body, url: `/?class=${encodeURIComponent(sub.className)}&date=${date}`, tag: "test-push" });
    if (!ok) return NextResponse.json({ error: "Push konnte nicht zugestellt werden (Abo evtl. abgelaufen)" }, { status: 502 });
    return NextResponse.json({ ok: true, title, body });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
