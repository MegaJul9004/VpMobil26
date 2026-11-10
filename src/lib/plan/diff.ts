import { prettyDate } from "./dates";
import type { ClassDay, Lesson } from "./types";

export interface DiffResult {
  title: string;
  body: string;
  lines: string[];
}

/** Schlüssel eines Unterrichts für den Kursfilter (identisch zu CourseInfo.key). */
export const lessonKey = (l: Lesson): string => l.group || l.origFa || l.fa;

export function filterLessons(lessons: Lesson[], courses: string[]): Lesson[] {
  if (!courses.length) return lessons;
  const set = new Set(courses);
  return lessons.filter((l) => set.has(lessonKey(l)));
}

const isNoteworthy = (l: Lesson) =>
  l.cancelled || l.faChanged || l.leChanged || l.raChanged || l.info !== "";

const idOf = (l: Lesson) => `${l.st}|${l.nr}|${l.group}`;

/** Lesbare Beschreibung einer auffälligen Stunde (oder null). */
function describe(l: Lesson, old?: Lesson): string | null {
  if (!isNoteworthy(l)) return null;
  const name = l.cancelled ? l.origFa || old?.fa || "Unterricht" : l.fa || l.origFa;
  const info = l.info ? ` (Info: ${l.info})` : "";
  if (l.cancelled) return `${l.st}. Std: ${name} entfällt${info}`;

  const parts: string[] = [];
  if (l.faChanged && l.origFa && l.origFa !== l.fa) parts.push(`statt ${l.origFa}`);
  if (l.raChanged && l.ra) {
    const oldRa = old && !old.raChanged ? old.ra : "";
    parts.push(`jetzt in Raum ${l.ra}${oldRa && oldRa !== l.ra ? ` (statt ${oldRa})` : ""}`);
  }
  if (l.leChanged && l.le) {
    parts.push(`bei ${l.le}${l.origLe && l.origLe !== l.le ? ` (statt ${l.origLe})` : ""}`);
  }
  return `${l.st}. Std: ${name}${parts.length ? " " + parts.join(" ") : ""}${info}`;
}

const sig = (l: Lesson) => [l.fa, l.le, l.ra, l.info, l.cancelled, l.faChanged, l.leChanged, l.raChanged].join("¦");

/**
 * Vergleicht alten und neuen Stand einer Klasse (gefiltert nach Kursen).
 * Reine Zeitstempel-Änderungen erzeugen kein Ergebnis.
 * Ohne alten Snapshot (Erstabruf) gibt es bewusst keinen Push.
 */
export function diffClassDay(
  oldDay: ClassDay | null | undefined,
  newDay: ClassDay,
  date: string,
  courses: string[] = []
): DiffResult | null {
  if (!oldDay) return null;
  const oldL = new Map(filterLessons(oldDay.lessons, courses).map((l) => [idOf(l), l]));
  const newL = new Map(filterLessons(newDay.lessons, courses).map((l) => [idOf(l), l]));
  const lines: string[] = [];

  for (const [id, n] of newL) {
    const o = oldL.get(id);
    if (o && sig(o) === sig(n)) continue;
    const d = describe(n, o);
    if (d) lines.push(d);
    else if (o && describe(o)) lines.push(`${n.st}. Std: ${n.fa || n.origFa} findet wieder regulär statt`);
  }
  for (const [id, o] of oldL) {
    if (!newL.has(id) && isNoteworthy(o)) lines.push(`${o.st}. Std: Änderung für ${o.origFa || o.fa} aufgehoben`);
  }
  if (!lines.length) return null;

  lines.sort((a, b) => parseInt(a) - parseInt(b));
  let body = lines.join(" | ");
  if (body.length > 400) body = body.slice(0, 397) + "…";
  return { title: `🚨 Planänderung ${newDay.className} (${prettyDate(date)})`, body, lines };
}
