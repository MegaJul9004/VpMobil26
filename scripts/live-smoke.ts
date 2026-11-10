import "dotenv/config";
import { fetchWeek, availableWeeks } from "../src/lib/plan/fetch";
import { ymd } from "../src/lib/plan/dates";

async function main() {
  const today = ymd(new Date());
  const w = await fetchWeek(today, { fresh: true });
  console.log(`KW ${w.kw} (Mo ${w.monday})`);
  for (const d of w.days) {
    const c = d.plan?.plans["9F"];
    console.log(d.date, d.plan ? `${d.plan.classes.length} Klassen, Stand ${d.plan.zeitstempel}, 9F: ${c?.lessons.length} Std, ${c?.lessons.filter((l) => l.cancelled).length} Ausfälle` : "nicht verfügbar");
  }
  console.log("Wochen:", JSON.stringify(await availableWeeks(today)));
}
main();
