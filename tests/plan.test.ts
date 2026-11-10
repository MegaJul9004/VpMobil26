import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseDayXml } from "../src/lib/plan/parser";
import { diffClassDay } from "../src/lib/plan/diff";
import { isoWeek, mondayOf, defaultStartDate } from "../src/lib/plan/dates";
import type { ClassDay } from "../src/lib/plan/types";

const sample = fs.readFileSync(path.join(__dirname, "../samples/PlanKl20261110.xml"), "utf8");
const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

describe("Parser (echte XML der Schule)", () => {
  const plan = parseDayXml(sample);

  it("liest Kopf und alle Klassen", () => {
    expect(plan.date).toBe("20261110");
    expect(plan.zeitstempel).toBe("10.11.2026, 11:45");
    expect(plan.classes.length).toBeGreaterThan(40);
    expect(plan.classes).toContain("9F");
  });

  it("entfernt UTF-8-BOM", () => {
    expect(parseDayXml("\uFEFF" + sample).classes).toContain("9F");
  });

  it("liest Änderungs-Attribute und Info für 9F", () => {
    const l = plan.plans["9F"].lessons;
    expect(l[0]).toMatchObject({ st: 1, fa: "---", faChanged: true, cancelled: true });
    expect(l[0].info).toContain("verlegt nach St.3");
    const third = l.find((x) => x.st === 3)!;
    expect(third).toMatchObject({ fa: "EN", faChanged: true, le: "Wy", leChanged: true, ra: "B 135", raChanged: true });
    expect(third.origFa).toBe("EN");
  });

  it("extrahiert Kurse", () => {
    const keys = plan.plans["9F"].courses.map((c) => c.key);
    expect(keys).toEqual(expect.arrayContaining(["fr1", "la1", "re1", "re2"]));
  });
});

describe("Diffing-Engine", () => {
  const base = parseDayXml(sample).plans["9F"];

  it("ignoriert Änderungen ohne inhaltlichen Unterschied (z. B. nur Zeitstempel)", () => {
    expect(diffClassDay(base, clone(base), "20261110")).toBeNull();
  });

  it("kein Push beim Erstabruf (kein alter Snapshot)", () => {
    expect(diffClassDay(null, base, "20261110")).toBeNull();
  });

  it("erzeugt exakt den erwarteten Push-Text bei künstlicher Änderung", () => {
    const old: ClassDay = clone(base);
    const next: ClassDay = clone(base);
    const set = (day: ClassDay, st: number) => day.lessons.find((l) => l.st === st)!;

    // Ausgangslage: Std. 6 regulär Raum 102, Std. 7 regulär
    const o5 = set(old, 5);
    Object.assign(o5, { fa: "BI", le: "Bec", ra: "102", raChanged: false, leChanged: false, faChanged: false, info: "", cancelled: false, origFa: "BI", origLe: "Bec" });
    const n5 = set(next, 5);
    Object.assign(n5, { fa: "BI", le: "Mey", leChanged: true, ra: "204", raChanged: true, faChanged: false, info: "", cancelled: false, origFa: "BI", origLe: "Bec" });

    const o6 = set(old, 6);
    Object.assign(o6, { fa: "MA", origFa: "MA", faChanged: false, leChanged: false, raChanged: false, info: "", cancelled: false });
    const n6 = set(next, 6);
    Object.assign(n6, { fa: "---", origFa: "MA", faChanged: true, info: "Aufgaben im Hefter", cancelled: true });

    const res = diffClassDay(old, next, "20261110")!;
    expect(res).not.toBeNull();
    expect(res.title).toBe("🚨 Planänderung 9F (Di, 10.11.)");
    expect(res.lines).toContain("5. Std: BI jetzt in Raum 204 (statt 102) bei Mey (statt Bec)");
    expect(res.lines).toContain("6. Std: MA entfällt (Info: Aufgaben im Hefter)");
    expect(res.body.indexOf("5. Std")).toBeLessThan(res.body.indexOf("6. Std"));
    expect(res.body).toContain(" | ");
  });

  it("Kursfilter blendet abgewählte Kurse aus", () => {
    const old: ClassDay = clone(base);
    const next: ClassDay = clone(base);
    const l = next.lessons.find((x) => x.st === 5)!;
    Object.assign(l, { info: "Test-Info", group: "", origFa: "BI" });
    expect(diffClassDay(old, next, "20261110", ["BI"])).not.toBeNull();
    expect(diffClassDay(old, next, "20261110", ["fr1"])).toBeNull();
  });

  it("meldet aufgehobene Ausfälle", () => {
    const old: ClassDay = clone(base);
    const next: ClassDay = clone(base);
    const l = next.lessons[0];
    Object.assign(l, { fa: "EN", faChanged: false, cancelled: false, info: "" });
    const res = diffClassDay(old, next, "20261110")!;
    expect(res.lines[0]).toContain("findet wieder regulär statt");
  });
});

describe("Datums-Helfer", () => {
  it("KW und Montag", () => {
    expect(isoWeek("20261110")).toBe(46);
    expect(mondayOf("20261113")).toBe("20261109");
  });
  it("Wochenende/nach 14 Uhr springt auf nächsten Schultag", () => {
    expect(defaultStartDate(new Date(2026, 10, 14, 9))).toBe("20261116"); // Samstag
    expect(defaultStartDate(new Date(2026, 10, 10, 15))).toBe("20261111"); // Di 15 Uhr
    expect(defaultStartDate(new Date(2026, 10, 13, 15))).toBe("20261116"); // Fr 15 Uhr
  });
});
