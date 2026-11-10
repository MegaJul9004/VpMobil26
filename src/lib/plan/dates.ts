/** Datums-Helfer (alles lokal, Format YYYYMMDD). */
export const ymd = (d: Date): string =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

export const parseYmd = (s: string): Date =>
  new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)), 12);

export const addDays = (s: string, n: number): string => {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};

export function mondayOf(s: string): string {
  const d = parseYmd(s);
  const wd = (d.getDay() + 6) % 7; // Mo=0
  d.setDate(d.getDate() - wd);
  return ymd(d);
}

/** ISO-8601-Kalenderwoche */
export function isoWeek(s: string): number {
  const d = parseYmd(s);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7);
}

const WD = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
export const weekdayShort = (s: string): string => WD[parseYmd(s).getDay()];
/** "Do, 12.11." */
export const prettyDate = (s: string): string =>
  `${weekdayShort(s)}, ${s.slice(6, 8)}.${s.slice(4, 6)}.`;

/** "12.11.2026" */
export const formatDmy = (s: string): string =>
  `${s.slice(6, 8)}.${s.slice(4, 6)}.${s.slice(0, 4)}`;

/** Berechnet A- oder B-Woche aus XML-<woche> oder anhand der ISO-Kalenderwoche. */
export function resolveWeekType(xmlWoche: string | undefined, kw: number): "A" | "B" {
  const w = (xmlWoche ?? "").trim().toUpperCase();
  if (w === "1" || w === "A") return "A";
  if (w === "2" || w === "B") return "B";
  // Fallback für Wochen ohne geladene XML: ungerade KW = A-Woche, gerade KW = B-Woche
  return kw % 2 === 1 ? "A" : "B";
}

/** Nach 14:00 oder am Wochenende → nächster Schultag (Mo–Fr). */
export function defaultStartDate(now = new Date()): string {
  let d = new Date(now);
  if (d.getHours() >= 14) d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return ymd(d);
}
