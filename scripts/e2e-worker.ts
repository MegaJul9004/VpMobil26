import "dotenv/config";
process.env.DATABASE_PATH = "data/e2e-test.db";
import fs from "node:fs";
fs.rmSync("data/e2e-test.db", { force: true });

async function main() {
  const { db, schema, ensureMigrated } = await import("../src/db");
  const { runCheck } = await import("../src/lib/monitor");
  const { eq, and } = await import("drizzle-orm");
  ensureMigrated();
  db.insert(schema.subscriptions).values({ endpoint: "https://push.invalid/x", p256dh: "p", auth: "a", schoolNumber: process.env.SCHOOL_NUMBER!, className: "9F", courses: [] }).run();

  console.log("Lauf 1 (Baseline):", await runCheck());
  const snap = db.select().from(schema.planSnapshots).where(and(eq(schema.planSnapshots.className, "9F"), eq(schema.planSnapshots.date, "20261111"))).get();
  console.log("Snapshots:", db.select().from(schema.planSnapshots).all().length, "Beispiel:", snap?.date, snap?.zeitstempel);
  // Manipuliere Snapshot: entferne Info an 1. Stunde
  const data = snap!.data as { lessons: { info: string; ra: string }[] };
  data.lessons[0].ra = "XYZ"; data.lessons[0].info = "alt";
  db.update(schema.planSnapshots).set({ data }).where(eq(schema.planSnapshots.id, snap!.id)).run();
  console.log("Lauf 2 (nach Manipulation):", await runCheck());
}
main();
