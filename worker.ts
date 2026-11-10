import "dotenv/config";
import cron from "node-cron";
import { ensureMigrated } from "./src/db";
import { runCheck } from "./src/lib/monitor";

ensureMigrated();

let running = false;
async function tick() {
  if (running) return; // keine Überlappung
  running = true;
  const t0 = Date.now();
  try {
    const s = await runCheck();
    console.log(
      `[worker ${new Date().toLocaleTimeString("de-DE")}] ${s.subscriptions} Abos, ${s.datesChecked} Tage geprüft, ` +
        `${s.snapshotsUpdated} Snapshots aktualisiert, ${s.pushesSent} Pushes (${Date.now() - t0} ms)`
    );
  } catch (e) {
    console.error("[worker] Fehler im Durchlauf:", e);
  } finally {
    running = false;
  }
}

cron.schedule("*/5 * * * *", tick);
console.log("[worker] gestartet – Polling alle 5 Minuten");
void tick(); // sofort ein erster Durchlauf
