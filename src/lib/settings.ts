/** Benutzereinstellungen & Favoriten (lokal gespeichert) */
import {
  DEFAULT_UI_COLORS,
  MAX_CUSTOM_THEMES,
  type CustomTheme,
  type SubjectStyle,
  type UiColorOverrides,
} from "./themes";

export type SubjectFontMode = "all" | "per-subject";

export interface Settings {
  schoolNumber: string;
  username: string;
  password: string;
  pushEnabled: boolean;
  /** Anzahl Homescreen-Favoriten-Slots (1–10) */
  favoriteCount: number;
  /** Belegung der 10 Favoriten-Slots (leerer String = unbelegt) */
  favoriteSlots: string[];
  /** Ausgeblendete Kurse pro Klasse */
  hiddenCourses: Record<string, string[]>;
  /** Aktives Theme-Preset ("system", "light", "dark", "ocean" oder ID eines eigenen Themes) */
  activeThemeId: string;
  /** Eigene benutzerdefinierte Farb-Presets */
  customThemes: CustomTheme[];
  /** Zoom- und Position im Wochenplan merken (Standard: true) */
  rememberWeekZoomPosition: boolean;
  /** Vollständige Anpassung der UI-Elemente & App-Hintergrund (mit Verlaufs-Option) */
  uiColors: UiColorOverrides;
  /** Fächer ausgeschrieben anzeigen ("Mathematik" statt "MA") */
  showFullSubjectNames: boolean;
  /** Benutzerdefinierte ausgeschriebene Fachnamen pro Kürzel */
  subjectFullNames: Record<string, string>;
  /** Schriftmodus für Fächer: für alle gemeinsam ("all") oder pro Fach einzeln ("per-subject") */
  subjectFontMode: SubjectFontMode;
  /** Globale Fächer-Schriftart (bei Modus "all") */
  subjectFontFamily: string;
  /** Globale Fächer-Schriftfarbe (bei Modus "all", optional) */
  allSubjectsTextColor: string;
  /** Individuelle einfarbige Kachelfarbe & ggf. Schrift pro Fachkürzel */
  subjectStyles: Record<string, SubjectStyle>;
}

export const MIN_FAVORITES = 1;
export const MAX_FAVORITES = 10;
export const DEFAULT_FAVORITES = 3;

export const EMPTY_SLOTS = (): string[] => Array.from({ length: MAX_FAVORITES }, () => "");

/** Bewusst KEINE Voreinstellung für Schule/Klasse (alle Slots leer!). */
export const DEFAULT_SETTINGS: Settings = {
  schoolNumber: "",
  username: "",
  password: "",
  pushEnabled: false,
  favoriteCount: DEFAULT_FAVORITES,
  favoriteSlots: EMPTY_SLOTS(),
  hiddenCourses: {},
  activeThemeId: "system",
  customThemes: [],
  rememberWeekZoomPosition: true,
  uiColors: { ...DEFAULT_UI_COLORS },
  showFullSubjectNames: true,
  subjectFullNames: {},
  subjectFontMode: "all",
  subjectFontFamily: "inherit",
  allSubjectsTextColor: "",
  subjectStyles: {},
};

export const clampFavorites = (n: unknown): number => {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return DEFAULT_FAVORITES;
  return Math.min(MAX_FAVORITES, Math.max(MIN_FAVORITES, v));
};

function sanitizeSlots(raw: unknown): string[] {
  const out = EMPTY_SLOTS();
  if (!Array.isArray(raw)) return out;
  for (let i = 0; i < MAX_FAVORITES; i++) {
    const v = raw[i];
    if (typeof v === "string") out[i] = v.trim().slice(0, 30);
  }
  return out;
}

function sanitizeHidden(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(v)) {
      out[k] = v.filter((x): x is string => typeof x === "string").slice(0, 100);
    }
  }
  return out;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const hexOr = (v: unknown, fallback: string) =>
  typeof v === "string" && HEX_RE.test(v) ? v : fallback;
const optHex = (v: unknown) =>
  typeof v === "string" && HEX_RE.test(v) ? v : undefined;

function sanitizeCustomThemes(raw: unknown): CustomTheme[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomTheme[] = [];
  for (const item of raw.slice(0, MAX_CUSTOM_THEMES)) {
    if (!item || typeof item !== "object") continue;
    const t = item as Record<string, unknown>;
    const id = typeof t.id === "string" && t.id.trim() ? t.id.trim().slice(0, 40) : "";
    const name = typeof t.name === "string" && t.name.trim() ? t.name.trim().slice(0, 40) : "";
    const primary = hexOr(t.primary, "#4f46e5");
    const background = hexOr(t.background, "#0f172a");
    const accent = hexOr(t.accent, "#ef4444");
    if (id && name) out.push({ id, name, primary, background, accent });
  }
  return out;
}

function sanitizeUiColors(raw: unknown): UiColorOverrides {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    enabled: r.enabled === true,
    primary: hexOr(r.primary, DEFAULT_UI_COLORS.primary),
    text: hexOr(r.text, DEFAULT_UI_COLORS.text),
    muted: hexOr(r.muted, DEFAULT_UI_COLORS.muted),
    accent: hexOr(r.accent, DEFAULT_UI_COLORS.accent),
    border: hexOr(r.border, DEFAULT_UI_COLORS.border),
    background: hexOr(r.background, DEFAULT_UI_COLORS.background),
    bgGradientEnabled: r.bgGradientEnabled === true,
    bgGradientTo: hexOr(r.bgGradientTo, DEFAULT_UI_COLORS.bgGradientTo),
    surface: hexOr(r.surface, DEFAULT_UI_COLORS.surface),
  };
}

function sanitizeSubjectStyle(raw: unknown): SubjectStyle {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const out: SubjectStyle = {};
  const bg = optHex(r.bgColor);
  const tc = optHex(r.textColor);
  if (bg) out.bgColor = bg;
  if (tc) out.textColor = tc;
  if (typeof r.fontFamily === "string" && r.fontFamily.trim()) {
    out.fontFamily = r.fontFamily.trim().slice(0, 40);
  }
  return out;
}

function sanitizeSubjectStyles(raw: unknown): Record<string, SubjectStyle> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, SubjectStyle> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>).slice(0, 100)) {
    const key = k.trim().toUpperCase().slice(0, 20);
    if (!key) continue;
    const st = sanitizeSubjectStyle(v);
    if (Object.keys(st).length > 0) out[key] = st;
  }
  return out;
}

function sanitizeFullNames(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>).slice(0, 100)) {
    const key = k.trim().toUpperCase().slice(0, 20);
    if (key && typeof v === "string" && v.trim()) {
      out[key] = v.trim().slice(0, 50);
    }
  }
  return out;
}

/** Macht beliebige (z. B. alte/manipulierte) gespeicherte Daten zu gültigen Settings. */
export function sanitizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown, max = 200) => (typeof v === "string" ? v.slice(0, max) : "");
  const customThemes = sanitizeCustomThemes(r.customThemes);
  const activeId = str(r.activeThemeId, 40) || "system";
  return {
    schoolNumber: str(r.schoolNumber, 20).replace(/\D/g, ""),
    username: str(r.username, 100),
    password: str(r.password, 200),
    pushEnabled: r.pushEnabled === true,
    favoriteCount: clampFavorites(r.favoriteCount ?? DEFAULT_FAVORITES),
    favoriteSlots: sanitizeSlots(r.favoriteSlots),
    hiddenCourses: sanitizeHidden(r.hiddenCourses),
    activeThemeId: activeId,
    customThemes,
    rememberWeekZoomPosition: r.rememberWeekZoomPosition !== false,
    uiColors: sanitizeUiColors(r.uiColors),
    showFullSubjectNames: r.showFullSubjectNames !== false,
    subjectFullNames: sanitizeFullNames(r.subjectFullNames),
    subjectFontMode: r.subjectFontMode === "per-subject" ? "per-subject" : "all",
    subjectFontFamily: str(r.subjectFontFamily, 40) || "inherit",
    allSubjectsTextColor: optHex(r.allSubjectsTextColor) ?? "",
    subjectStyles: sanitizeSubjectStyles(r.subjectStyles),
  };
}
