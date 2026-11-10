/** Theme-Engine & Farb-Presets (Phase 5) */
export interface ThemePreset {
  id: string;
  name: string;
  builtIn?: boolean;
  isDark: boolean;
  /** Primärfarbe (Buttons, Fokus, aktive Elemente) */
  primary: string;
  /** Hintergrundfarbe der App */
  background: string;
  /** Karten-/Oberflächenfarbe */
  surface: string;
  /** Haupttextfarbe */
  text: string;
  /** Sekundäre Textfarbe */
  muted: string;
  /** Rahmenfarbe */
  border: string;
  /** Akzent-/Warnfarbe (Änderungen, Badges, Highlights) */
  accent: string;
}

export interface CustomTheme {
  id: string;
  name: string;
  primary: string;
  background: string;
  accent: string;
}

export const MAX_CUSTOM_THEMES = 12;

export const BUILTIN_THEMES: ThemePreset[] = [
  {
    id: "light",
    name: "Hell",
    builtIn: true,
    isDark: false,
    primary: "#4f46e5",
    background: "#f8fafc",
    surface: "#ffffff",
    text: "#0f172a",
    muted: "#64748b",
    border: "#e2e8f0",
    accent: "#ef4444",
  },
  {
    id: "dark",
    name: "Dunkel",
    builtIn: true,
    isDark: true,
    primary: "#6366f1",
    background: "#090d16",
    surface: "#111827",
    text: "#f8fafc",
    muted: "#94a3b8",
    border: "#1e293b",
    accent: "#f87171",
  },
  {
    id: "ocean",
    name: "Ozean",
    builtIn: true,
    isDark: true,
    primary: "#0ea5e9",
    background: "#082f49",
    surface: "#0c4a6e",
    text: "#f0f9ff",
    muted: "#bae6fd",
    border: "#0369a1",
    accent: "#fb923c",
  },
];

/** Berechnet relative Helligkeit eines #RRGGBB-Farbwerts (0 = schwarz, 1 = weiß). */
export function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return 1;
  const [r, g, b] = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Mischt zwei #RRGGBB-Farben im Verhältnis t (0..1). */
function mix(hexA: string, hexB: string, t: number): string {
  const p = (h: string) => {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h);
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
  };
  const a = p(hexA);
  const b = p(hexB);
  const ch = (i: number) =>
    Math.round(a[i] * (1 - t) + b[i] * t)
      .toString(16)
      .padStart(2, "0");
  return `#${ch(0)}${ch(1)}${ch(2)}`;
}

/** Erzeugt aus einem benutzerdefinierten Theme (Primär, Hintergrund, Akzent) eine vollständige Palette. */
export function buildCustomPreset(c: CustomTheme): ThemePreset {
  const dark = luminance(c.background) < 0.5;
  const surface = dark ? mix(c.background, "#ffffff", 0.08) : mix(c.background, "#ffffff", 0.75);
  const border = dark ? mix(c.background, "#ffffff", 0.18) : mix(c.background, "#000000", 0.12);
  const text = dark ? "#f8fafc" : "#0f172a";
  const muted = dark ? mix(c.background, "#ffffff", 0.62) : mix(c.background, "#000000", 0.55);
  return {
    id: c.id,
    name: c.name,
    builtIn: false,
    isDark: dark,
    primary: c.primary,
    background: c.background,
    surface,
    text,
    muted,
    border,
    accent: c.accent,
  };
}

export function resolveTheme(activeId: string, customThemes: CustomTheme[]): ThemePreset {
  const builtIn = BUILTIN_THEMES.find((t) => t.id === activeId);
  if (builtIn) return builtIn;
  const custom = customThemes.find((t) => t.id === activeId);
  if (custom) return buildCustomPreset(custom);
  return BUILTIN_THEMES[0];
}

/** Wendet das aktive Theme per CSS-Custom-Properties und .dark-Klasse auf <html> an. */
export function applyThemeToDom(preset: ThemePreset) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", preset.isDark);
  root.style.setProperty("--vp-primary", preset.primary);
  root.style.setProperty("--vp-bg", preset.background);
  root.style.setProperty("--vp-surface", preset.surface);
  root.style.setProperty("--vp-text", preset.text);
  root.style.setProperty("--vp-muted", preset.muted);
  root.style.setProperty("--vp-border", preset.border);
  root.style.setProperty("--vp-accent", preset.accent);
  root.style.setProperty("--vp-accent-soft", mix(preset.surface, preset.accent, preset.isDark ? 0.22 : 0.12));
}
