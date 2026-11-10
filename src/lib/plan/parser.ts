import { XMLParser } from "fast-xml-parser";
import type { ClassDay, CourseInfo, DayPlan, Lesson } from "./types";

const ARRAYS = new Set(["Kl", "Std", "Ue", "Ku", "KlSt", "ZiZeile", "ft", "Aktion"]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  isArray: (name) => ARRAYS.has(name),
});

/** Entfernt UTF-8-BOM und führende Whitespaces. */
export function stripBom(xml: string): string {
  return xml.replace(/^\uFEFF/, "").replace(/^\s+/, "");
}

type Any = any;

/** Textinhalt eines Knotens (string oder Objekt mit Attributen). */
function txt(v: Any): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (typeof v === "object" && "#text" in v) return String(v["#text"]).trim();
  return "";
}
const attr = (v: Any, name: string): string =>
  v && typeof v === "object" ? String(v[`@_${name}`] ?? "") : "";

const CANCEL_RE = /(fällt aus|entfällt|entfaellt|ausfall|fällt entfällt)/i;

function parseClass(kl: Any): ClassDay {
  const className = txt(kl.Kurz);

  // Unterricht: Nr → Fach/Lehrer/Gruppe
  const ue = new Map<string, { fa: string; le: string; gr: string }>();
  for (const u of kl.Unterricht?.Ue ?? []) {
    const n = u.UeNr;
    ue.set(txt(n), { fa: attr(n, "UeFa"), le: attr(n, "UeLe"), gr: attr(n, "UeGr") });
  }

  const lessons: Lesson[] = [];
  for (const s of kl.Pl?.Std ?? []) {
    const nr = txt(s.Nr);
    const orig = ue.get(nr);
    let fa = txt(s.Fa);
    // Kursstunden tragen als Fach oft die Gruppe ("la1") → auf das echte Fach ("LA") normalisieren
    if (orig?.gr && fa.toLowerCase() === orig.gr.toLowerCase() && orig.fa) fa = orig.fa;
    const info = txt(s.If);
    lessons.push({
      st: Number(txt(s.St)),
      beginn: txt(s.Beginn),
      ende: txt(s.Ende),
      fa,
      faChanged: attr(s.Fa, "FaAe") === "FaGeaendert",
      le: txt(s.Le),
      leChanged: attr(s.Le, "LeAe") === "LeGeaendert",
      ra: txt(s.Ra),
      raChanged: attr(s.Ra, "RaAe") === "RaGeaendert",
      nr,
      info,
      group: orig?.gr ?? "",
      origFa: orig?.fa ?? "",
      origLe: orig?.le ?? "",
      // Info-Texte wie "MA fällt aus" können sich auf andere Fächer beziehen -> nur Fach "---" zählt
      cancelled: fa === "---" || (fa === "" && CANCEL_RE.test(info)),
    });
  }
  lessons.sort((a, b) => a.st - b.st);

  // Kurse für Kursfilter: Gruppen (UeGr) bevorzugt, sonst Fächer
  const courseMap = new Map<string, CourseInfo>();
  for (const [, v] of ue) {
    const key = v.gr || v.fa;
    if (key && !courseMap.has(key)) courseMap.set(key, { key, fach: v.fa, lehrer: v.le });
  }
  return { className, lessons, courses: [...courseMap.values()] };
}

/** Parst eine Tagesdatei (PlanKlYYYYMMDD.xml, Indiware Mobil). */
export function parseDayXml(rawXml: string): DayPlan {
  const root = parser.parse(stripBom(rawXml)).VpMobil;
  if (!root?.Kopf) throw new Error("Kein gültiger VpMobil-Plan (Kopf fehlt)");
  const kopf = root.Kopf;
  const datei = txt(kopf.datei);
  const date = datei.match(/(\d{8})/)?.[1] ?? "";
  const plans: Record<string, ClassDay> = {};
  for (const kl of root.Klassen?.Kl ?? []) {
    const c = parseClass(kl);
    if (c.className) plans[c.className] = c;
  }
  const zi = root.ZusatzInfo?.ZiZeile ?? [];
  return {
    date,
    datumPlan: txt(kopf.DatumPlan),
    zeitstempel: txt(kopf.zeitstempel),
    woche: txt(kopf.woche),
    classes: Object.keys(plans),
    zusatzInfo: zi.map(txt).filter(Boolean),
    plans,
  };
}
