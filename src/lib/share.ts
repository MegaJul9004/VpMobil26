import { prettyDate } from "./plan/dates";
import type { Lesson } from "./plan/types";

/** Formatiert einen kompletten Schultag als übersichtlichen Text für die Web Share API. */
export function formatDayShareText(params: {
  className: string;
  date: string;
  datumPlan?: string;
  lessons: Lesson[];
  zusatzInfo?: string[];
}): { title: string; text: string } {
  const { className, date, datumPlan, lessons, zusatzInfo = [] } = params;
  const headerDate = datumPlan || prettyDate(date);
  const title = `Stundenplan ${className} – ${headerDate}`;
  const lines: string[] = [`📅 ${title}`];

  if (lessons.length === 0) {
    lines.push("Kein Unterricht eingetragen.");
  } else {
    for (const l of lessons) {
      const time = l.beginn && l.ende ? ` (${l.beginn}–${l.ende})` : "";
      if (l.cancelled) {
        const orig = l.origFa || "Unterricht";
        const info = l.info ? ` – ${l.info}` : "";
        lines.push(`${l.st}. Std${time}: ❌ ${orig} entfällt${info}`);
      } else {
        const fa = l.fa || l.origFa || "—";
        const details = [l.le, l.ra].filter(Boolean).join(", ");
        const info = l.info ? ` ⚠️ ${l.info}` : "";
        lines.push(`${l.st}. Std${time}: ${fa}${details ? ` (${details})` : ""}${info}`);
      }
    }
  }

  if (zusatzInfo.length > 0) {
    lines.push("", `ℹ️ Hinweise: ${zusatzInfo.join(" | ")}`);
  }

  return { title, text: lines.join("\n") };
}
