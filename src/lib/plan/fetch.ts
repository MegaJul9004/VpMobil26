import { parseDayXml } from "./parser";
import { addDays, isoWeek, mondayOf, resolveWeekType } from "./dates";
import type { DayPlan, WeekPlan } from "./types";

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; plan: DayPlan | null }>();

export interface SchoolCredentials {
  schoolNumber?: string;
  username?: string;
  password?: string;
}

function resolveCreds(creds?: SchoolCredentials) {
  const school = creds?.schoolNumber?.trim() || process.env.SCHOOL_NUMBER;
  const user = creds?.username?.trim() || process.env.SCHOOL_USER;
  const pw = creds?.password || process.env.SCHOOL_PASSWORD;
  if (!school || !user || !pw) {
    throw new Error("Schulzugangsdaten fehlen. Bitte in den Einstellungen hinterlegen.");
  }
  return { school, auth: "Basic " + Buffer.from(`${user}:${pw}`).toString("base64") };
}

export const defaultSchool = () => process.env.SCHOOL_NUMBER ?? "";

/** Lädt eine Tagesdatei. `null` = nicht vorhanden (404). Wirft bei anderen Fehlern. */
export async function fetchDay(
  date: string,
  opts: { fresh?: boolean; creds?: SchoolCredentials } = {}
): Promise<DayPlan | null> {
  const { school, auth } = resolveCreds(opts.creds);
  const key = `${school}:${date}`;
  const hit = cache.get(key);
  if (!opts.fresh && hit && Date.now() - hit.at < TTL_MS) return hit.plan;

  const url = `https://www.stundenplan24.de/${school}/mobil/mobdaten/PlanKl${date}.xml`;
  const res = await fetch(url, {
    headers: { Authorization: auth },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 404) {
    cache.set(key, { at: Date.now(), plan: null });
    return null;
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error("Zugangsdaten ungültig (HTTP 401). Bitte Schulnummer, Benutzername und Passwort prüfen.");
  }
  if (!res.ok) throw new Error(`stundenplan24 antwortete ${res.status} für ${date}`);
  const plan = parseDayXml(await res.text());
  if (!plan.date) plan.date = date;
  cache.set(key, { at: Date.now(), plan });
  return plan;
}

/** Lädt die Stammdatei Klassen.xml als Fallback für die Klassenliste. */
export async function fetchBaseClasses(creds?: SchoolCredentials): Promise<string[]> {
  try {
    const { school, auth } = resolveCreds(creds);
    const key = `${school}:Klassen`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL_MS * 5 && hit.plan) return hit.plan.classes;
    const url = `https://www.stundenplan24.de/${school}/mobil/mobdaten/Klassen.xml`;
    const res = await fetch(url, {
      headers: { Authorization: auth },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const plan = parseDayXml(await res.text());
    cache.set(key, { at: Date.now(), plan });
    return plan.classes;
  } catch {
    return [];
  }
}

/** Wochen-Aggregator: lädt Mo–Fr parallel und setzt sie zusammen. */
export async function fetchWeek(
  anyDateInWeek: string,
  opts: { fresh?: boolean; creds?: SchoolCredentials } = {}
): Promise<WeekPlan> {
  const monday = mondayOf(anyDateInWeek);
  const dates = [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
  let authErr: Error | null = null;
  const days = await Promise.all(
    dates.map(async (date) => {
      try {
        return { date, plan: await fetchDay(date, opts) };
      } catch (e) {
        if ((e as Error).message.includes("401") || (e as Error).message.includes("Zugangsdaten")) {
          authErr = e as Error;
        }
        return { date, plan: null };
      }
    })
  );
  if (authErr) throw authErr;
  const kw = isoWeek(monday);
  const xmlWoche = days.find((d) => d.plan?.woche)?.plan?.woche;
  const weekType = resolveWeekType(xmlWoche, kw);
  return { monday, kw, weekType, days };
}

/** Findet verfügbare Wochen (Mo-Daten), ausgehend von der aktuellen, ± Spanne. */
export async function availableWeeks(
  from: string,
  before = 1,
  after = 3
): Promise<{ monday: string; kw: number; available: boolean }[]> {
  const base = mondayOf(from);
  const mondays: string[] = [];
  for (let i = -before; i <= after; i++) mondays.push(addDays(base, i * 7));
  return Promise.all(
    mondays.map(async (m) => {
      const week = await fetchWeek(m);
      return { monday: m, kw: week.kw, available: week.days.some((d) => d.plan) };
    })
  );
}
