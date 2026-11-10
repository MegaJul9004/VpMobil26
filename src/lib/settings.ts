/** Benutzereinstellungen & Favoriten (lokal gespeichert) */
import { MAX_CUSTOM_THEMES, type CustomTheme } from "./themes";

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
  /** Aktives Theme-Preset ("light", "dark", oder ID eines eigenen Themes) */
  activeThemeId: string;
  /** Eigene benutzerdefinierte Farb-Presets */
  customThemes: CustomTheme[];
  /** Zoom- und Position im Wochenplan merken (Standard: true) */
  rememberWeekZoomPosition: boolean;
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
  activeThemeId: "light",
  customThemes: [],
  rememberWeekZoomPosition: true,
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
function sanitizeCustomThemes(raw: unknown): CustomTheme[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomTheme[] = [];
  for (const item of raw.slice(0, MAX_CUSTOM_THEMES)) {
    if (!item || typeof item !== "object") continue;
    const t = item as Record<string, unknown>;
    const id = typeof t.id === "string" && t.id.trim() ? t.id.trim().slice(0, 40) : "";
    const name = typeof t.name === "string" && t.name.trim() ? t.name.trim().slice(0, 40) : "";
    const primary = typeof t.primary === "string" && HEX_RE.test(t.primary) ? t.primary : "#4f46e5";
    const background = typeof t.background === "string" && HEX_RE.test(t.background) ? t.background : "#0f172a";
    const accent = typeof t.accent === "string" && HEX_RE.test(t.accent) ? t.accent : "#ef4444";
    if (id && name) out.push({ id, name, primary, background, accent });
  }
  return out;
}

/** Macht beliebige (z. B. alte/manipulierte) gespeicherte Daten zu gültigen Settings. */
export function sanitizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown, max = 200) => (typeof v === "string" ? v.slice(0, max) : "");
  const customThemes = sanitizeCustomThemes(r.customThemes);
  const activeId = str(r.activeThemeId, 40) || "light";
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
  };
}
