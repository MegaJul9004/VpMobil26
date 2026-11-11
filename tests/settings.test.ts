import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, clampFavorites, sanitizeSettings } from "../src/lib/settings";
import { buildCustomPreset, resolveTheme } from "../src/lib/themes";
import { formatDayShareText } from "../src/lib/share";
import { formatDmy, resolveWeekType } from "../src/lib/plan/dates";
import { clampZoomPan } from "../src/components/WeekCanvas";
import { computeAuthToken, isValidAuthToken, verifyAppPassword } from "../src/lib/auth";

describe("Settings & Favoriten (Phase 1 & 2)", () => {
  it("Defaults: 3 Favoriten, alle 10 Slots leer (kein Preset wie 9F), rememberWeekZoomPosition=true", () => {
    expect(DEFAULT_SETTINGS.favoriteCount).toBe(3);
    expect(DEFAULT_SETTINGS.schoolNumber).toBe("");
    expect(DEFAULT_SETTINGS.favoriteSlots).toHaveLength(10);
    expect(DEFAULT_SETTINGS.favoriteSlots.every((s) => s === "")).toBe(true);
    expect(DEFAULT_SETTINGS.rememberWeekZoomPosition).toBe(true);
  });

  it("begrenzt Favoriten auf 1–10", () => {
    expect(clampFavorites(0)).toBe(1);
    expect(clampFavorites(11)).toBe(10);
    expect(clampFavorites(4.6)).toBe(5);
    expect(clampFavorites("x")).toBe(3);
  });

  it("bereinigt gespeicherte Daten inkl. Slots und Custom-Themes", () => {
    const s = sanitizeSettings({
      schoolNumber: "12a34",
      favoriteCount: 99,
      pushEnabled: "yes",
      favoriteSlots: ["8A", "10C"],
      customThemes: [
        { id: "c1", name: "Mein Theme", primary: "#123456", background: "#000000", accent: "#abcdef" },
      ],
    });
    expect(s.schoolNumber).toBe("1234");
    expect(s.favoriteCount).toBe(10);
    expect(s.pushEnabled).toBe(false);
    expect(s.favoriteSlots[0]).toBe("8A");
    expect(s.favoriteSlots[1]).toBe("10C");
    expect(s.favoriteSlots[2]).toBe("");
    expect(s.customThemes).toHaveLength(1);
  });
});

describe("Kalender & A/B-Woche (Phase 3)", () => {
  it("erkennt A-Woche und B-Woche aus XML und KW-Fallback", () => {
    expect(resolveWeekType("1", 46)).toBe("A");
    expect(resolveWeekType("2", 46)).toBe("B");
    expect(resolveWeekType(undefined, 45)).toBe("A");
    expect(resolveWeekType(undefined, 46)).toBe("B");
  });

  it("formatiert Datum als DD.MM.YYYY", () => {
    expect(formatDmy("20261109")).toBe("09.11.2026");
  });
});

describe("Share-Formatierung (Phase 4)", () => {
  it("erzeugt lesbaren Share-Text mit Zeiten, Fächern und Ausfällen", () => {
    const res = formatDayShareText({
      className: "8A",
      date: "20261110",
      datumPlan: "Dienstag, 10. November 2026",
      lessons: [
        {
          st: 1,
          beginn: "07:45",
          ende: "08:30",
          fa: "---",
          faChanged: true,
          le: "",
          leChanged: false,
          ra: "",
          raChanged: false,
          nr: "1",
          info: "Aufgaben im Buch",
          group: "",
          origFa: "MA",
          origLe: "Mey",
          cancelled: true,
        },
        {
          st: 2,
          beginn: "08:30",
          ende: "09:15",
          fa: "EN",
          faChanged: false,
          le: "Wy",
          leChanged: false,
          ra: "B 135",
          raChanged: true,
          nr: "2",
          info: "Raumwechsel",
          group: "",
          origFa: "EN",
          origLe: "Wy",
          cancelled: false,
        },
      ],
    });
    expect(res.title).toContain("8A");
    expect(res.text).toContain("1. Std (07:45–08:30): ❌ MA entfällt – Aufgaben im Buch");
    expect(res.text).toContain("2. Std (08:30–09:15): EN (Wy, B 135) ⚠️ Raumwechsel");
  });
});

describe("Theme-Engine (Phase 5)", () => {
  it("löst Hell, Dunkel und eigene Farb-Presets auf", () => {
    expect(resolveTheme("light", []).name).toBe("Hell");
    expect(resolveTheme("dark", []).isDark).toBe(true);
    const custom = { id: "my1", name: "Neon", primary: "#00ff88", background: "#050510", accent: "#ff0055" };
    const built = buildCustomPreset(custom);
    expect(built.isDark).toBe(true);
    expect(resolveTheme("my1", [custom]).name).toBe("Neon");
  });
});

describe("Wochenplan Zoom & Eck-Begrenzung (WeekCanvas)", () => {
  it("lässt nicht weiter als 100% herauszoomen und setzt die Ansicht auf die Plan-Ecke (0, 0) zurück", () => {
    expect(clampZoomPan(0.7, -150, -200, 400, 600, 400, 600)).toEqual({ scale: 1, x: 0, y: 0 });
    expect(clampZoomPan(1.0, 50, -80, 400, 600, 400, 600)).toEqual({ scale: 1, x: 0, y: 0 });
  });

  it("begrenzt das Verschieben beim Hineinzoomen exakt an den Ecken des Vertretungsplans", () => {
    // Bei 2x Zoom auf 400x600 Viewport (Plan ist 800x1200 groß): x darf nur zwischen -400 und 0 liegen, y zwischen -600 und 0
    expect(clampZoomPan(2.0, 120, 80, 400, 600, 400, 600)).toEqual({ scale: 2, x: 0, y: 0 });
    expect(clampZoomPan(2.0, -900, -950, 400, 600, 400, 600)).toEqual({ scale: 2, x: -400, y: -600 });
  });
});

describe("App-Passwortschutz (.env APP_PASSWORD)", () => {
  it("prüft das Passwort gegen process.env.APP_PASSWORD und validiert Auth-Tokens", () => {
    process.env.APP_PASSWORD = "1717";
    expect(verifyAppPassword("1717")).toBe(true);
    expect(verifyAppPassword(" 1717 ")).toBe(true);
    expect(verifyAppPassword("0000")).toBe(false);
    expect(verifyAppPassword("")).toBe(false);
    const tok = computeAuthToken();
    expect(isValidAuthToken(tok)).toBe(true);
    expect(isValidAuthToken("invalid")).toBe(false);
  });
});
