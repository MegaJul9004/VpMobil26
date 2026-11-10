import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { fetchDay } from "./plan/fetch";
import { diffClassDay } from "./plan/diff";
import { addDays, mondayOf, ymd } from "./plan/dates";
import { sendPush } from "./push";
import type { ClassDay } from "./plan/types";

/** Heute bis Freitag der nächsten Woche (nur Mo–Fr). */
export function datesToWatch(now = new Date()): string[] {
  const today = ymd(now);
  const end = addDays(mondayOf(today), 11); // Freitag nächste Woche
  const out: string[] = [];
  for (let d = today; d <= end; d = addDays(d, 1)) {
    const wd = new Date(Number(d.slice(0, 4)), Number(d.slice(4, 6)) - 1, Number(d.slice(6, 8))).getDay();
    if (wd !== 0 && wd !== 6) out.push(d);
  }
  return out;
}

export interface CheckStats {
  subscriptions: number;
  datesChecked: number;
  snapshotsUpdated: number;
  pushesSent: number;
}

/** Ein Durchlauf des Pollings: lädt Pläne, diffed, aktualisiert Snapshots, sendet Pushes. */
export async function runCheck(now = new Date()): Promise<CheckStats> {
  const subs = db.select().from(schema.subscriptions).where(eq(schema.subscriptions.active, true)).all();
  const stats: CheckStats = { subscriptions: subs.length, datesChecked: 0, snapshotsUpdated: 0, pushesSent: 0 };
  if (!subs.length) return stats;

  const schools = [...new Set(subs.map((s) => s.schoolNumber))];
  const dates = datesToWatch(now);

  for (const school of schools) {
    // Hinweis: fetchDay nutzt die Schule aus .env (Single-School-Setup)
    if (school !== process.env.SCHOOL_NUMBER) continue;
    for (const date of dates) {
      let plan;
      try {
        plan = await fetchDay(date, { fresh: true });
      } catch (e) {
        console.error(`[worker] Abruf ${date} fehlgeschlagen:`, (e as Error).message);
        continue;
      }
      stats.datesChecked++;
      if (!plan) continue;

      const classes = [...new Set(subs.filter((s) => s.schoolNumber === school).map((s) => s.className))];
      for (const className of classes) {
        const fresh = plan.plans[className];
        if (!fresh) continue;
        const snap = db
          .select()
          .from(schema.planSnapshots)
          .where(and(eq(schema.planSnapshots.schoolNumber, school), eq(schema.planSnapshots.date, date), eq(schema.planSnapshots.className, className)))
          .get();
        const old = (snap?.data as ClassDay | undefined) ?? null;
        if (old && JSON.stringify(old) === JSON.stringify(fresh)) continue;

        if (old) {
          for (const sub of subs.filter((s) => s.schoolNumber === school && s.className === className)) {
            const diff = diffClassDay(old, fresh, date, sub.courses);
            if (!diff) continue;
            const ok = await sendPush(sub, {
              title: diff.title,
              body: diff.body,
              url: `/?class=${encodeURIComponent(className)}&date=${date}`,
              tag: `${className}-${date}`,
            });
            if (ok) stats.pushesSent++;
          }
        }
        db.insert(schema.planSnapshots)
          .values({ schoolNumber: school, date, className, data: fresh, zeitstempel: plan.zeitstempel })
          .onConflictDoUpdate({
            target: [schema.planSnapshots.schoolNumber, schema.planSnapshots.date, schema.planSnapshots.className],
            set: { data: fresh, zeitstempel: plan.zeitstempel, updatedAt: new Date().toISOString() },
          })
          .run();
        stats.snapshotsUpdated++;
      }
    }
  }
  return stats;
}
