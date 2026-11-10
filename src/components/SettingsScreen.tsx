"use client";
import { ArrowLeft, Bell, Check, Eye, EyeOff, Maximize2, Minus, Palette, Plus, School, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { MAX_FAVORITES, MIN_FAVORITES, type Settings } from "@/lib/settings";
import { BUILTIN_THEMES, MAX_CUSTOM_THEMES, buildCustomPreset, type CustomTheme, type ThemePreset } from "@/lib/themes";
import { Toggle } from "./ui";

const card = "vp-surface rounded-2xl border p-4 shadow-sm";
const input =
  "vp-surface h-12 w-full rounded-xl border px-4 text-base outline-none focus:ring-2";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: (id: string) => React.ReactNode;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children(id)}
      {hint && <p className="vp-muted text-xs">{hint}</p>}
    </div>
  );
}

export function SettingsScreen({
  settings,
  update,
  onBack,
}: {
  settings: Settings;
  update: (p: Partial<Settings> | ((prev: Settings) => Partial<Settings>)) => void;
  onBack: () => void;
}) {
  const [showPw, setShowPw] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [bgColor, setBgColor] = useState("#0f172a");
  const [accentColor, setAccentColor] = useState("#f59e0b");
  const [themeMsg, setThemeMsg] = useState("");

  const fav = settings.favoriteCount;

  const handleTogglePush = async (next: boolean) => {
    update({ pushEnabled: next });
    if (next && typeof window !== "undefined" && "Notification" in window) {
      try {
        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }
      } catch {}
    }
  };

  const handleCreatePreset = (e: React.FormEvent) => {
    e.preventDefault();
    const name = presetName.trim();
    if (!name) {
      setThemeMsg("Bitte gib einen Namen für das Farb-Preset ein.");
      return;
    }
    if (settings.customThemes.length >= MAX_CUSTOM_THEMES) {
      setThemeMsg(`Maximal ${MAX_CUSTOM_THEMES} eigene Presets möglich.`);
      return;
    }
    const id = `custom-${Date.now()}`;
    const newTheme: CustomTheme = {
      id,
      name,
      primary: primaryColor,
      background: bgColor,
      accent: accentColor,
    };
    update((prev) => ({
      customThemes: [...prev.customThemes, newTheme],
      activeThemeId: id,
    }));
    setPresetName("");
    setThemeMsg(`Preset „${name}“ gespeichert und aktiviert.`);
  };

  const handleDeletePreset = (id: string) => {
    update((prev) => {
      const nextCustom = prev.customThemes.filter((t) => t.id !== id);
      const nextActive = prev.activeThemeId === id ? "light" : prev.activeThemeId;
      return { customThemes: nextCustom, activeThemeId: nextActive };
    });
  };

  const allPresets: ThemePreset[] = [
    ...BUILTIN_THEMES,
    ...settings.customThemes.map(buildCustomPreset),
  ];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col">
      <header className="vp-surface sticky top-0 z-20 flex items-center gap-2 border-b px-2 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur">
        <button
          onClick={onBack}
          aria-label="Zurück zum Homescreen"
          className="flex h-11 w-11 items-center justify-center rounded-full hover:opacity-80"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-bold">Einstellungen</h1>
      </header>

      <main className="flex-1 space-y-4 p-3 pb-[calc(5rem+env(safe-area-inset-bottom))] md:p-5 md:pb-8">
        {/* Login & Schuldaten */}
        <section className={`${card} space-y-4`} aria-labelledby="h-login">
          <h2 id="h-login" className="flex items-center gap-2 font-semibold">
            <School size={18} /> Login &amp; Schuldaten
          </h2>
          <Field label="Schulnummer" hint="Leer lassen, um die hinterlegte Server-Schule zu verwenden.">
            {(id) => (
              <input
                id={id}
                className={input}
                inputMode="numeric"
                autoComplete="off"
                placeholder="z. B. 53111842"
                value={settings.schoolNumber}
                onChange={(e) => update({ schoolNumber: e.target.value })}
              />
            )}
          </Field>
          <Field label="Benutzername">
            {(id) => (
              <input
                id={id}
                className={input}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="z. B. schueler"
                value={settings.username}
                onChange={(e) => update({ username: e.target.value })}
              />
            )}
          </Field>
          <Field label="Passwort" hint="Wird geschützt lokal auf diesem Gerät gespeichert.">
            {(id) => (
              <div className="relative">
                <input
                  id={id}
                  className={`${input} pr-12`}
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={settings.password}
                  onChange={(e) => update({ password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? "Passwort verbergen" : "Passwort anzeigen"}
                  className="vp-muted absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            )}
          </Field>
        </section>

        {/* Push-Benachrichtigungen */}
        <section className={`${card} flex items-center justify-between gap-4`} aria-labelledby="h-push">
          <div>
            <h2 id="h-push" className="flex items-center gap-2 font-semibold">
              <Bell size={18} /> Push-Benachrichtigungen
            </h2>
            <p className="vp-muted mt-1 text-sm">{settings.pushEnabled ? "An" : "Aus"}</p>
          </div>
          <Toggle
            checked={settings.pushEnabled}
            onChange={handleTogglePush}
            label="Push-Benachrichtigungen"
          />
        </section>

        {/* Zoom- und Position im Wochenplan merken */}
        <section className={`${card} flex items-center justify-between gap-4`} aria-labelledby="h-zoom-persist">
          <div>
            <h2 id="h-zoom-persist" className="flex items-center gap-2 font-semibold">
              <Maximize2 size={18} /> Zoom- und Position im Wochenplan merken
            </h2>
            <p className="vp-muted mt-1 text-sm">
              {settings.rememberWeekZoomPosition
                ? "Aktiviert – Wochenplan startet im zuletzt gewählten Ausschnitt."
                : "Deaktiviert – Wochenplan startet immer in der Standardansicht (100% Fit)."}
            </p>
          </div>
          <Toggle
            checked={settings.rememberWeekZoomPosition}
            onChange={(v) => {
              update({ rememberWeekZoomPosition: v });
              if (!v && typeof window !== "undefined") {
                try {
                  localStorage.removeItem("vp:weekZoomPan");
                } catch {}
              }
            }}
            label="Zoom- und Position im Wochenplan merken"
          />
        </section>

        {/* Anzahl der Favoriten */}
        <section className={card} aria-labelledby="h-fav">
          <h2 id="h-fav" className="font-semibold">
            Anzahl der Favoriten auf dem Homescreen
          </h2>
          <p className="vp-muted mt-1 text-sm">
            {MIN_FAVORITES} bis {MAX_FAVORITES} (Standard: 3)
          </p>
          <div className="mt-3 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => update({ favoriteCount: fav - 1 })}
              disabled={fav <= MIN_FAVORITES}
              aria-label="Weniger Favoriten"
              className="vp-surface flex h-12 w-12 items-center justify-center rounded-full border disabled:opacity-30"
            >
              <Minus size={20} />
            </button>
            <output
              aria-live="polite"
              aria-label="Anzahl Favoriten"
              className="w-14 text-center text-3xl font-bold tabular-nums"
            >
              {fav}
            </output>
            <button
              type="button"
              onClick={() => update({ favoriteCount: fav + 1 })}
              disabled={fav >= MAX_FAVORITES}
              aria-label="Mehr Favoriten"
              className="vp-surface flex h-12 w-12 items-center justify-center rounded-full border disabled:opacity-30"
            >
              <Plus size={20} />
            </button>
          </div>
        </section>

        {/* Phase 5: Theming & Farb-Presets */}
        <section className={`${card} space-y-4`} aria-labelledby="h-theme">
          <div>
            <h2 id="h-theme" className="flex items-center gap-2 font-semibold">
              <Palette size={18} /> Themes &amp; Farb-Presets
            </h2>
            <p className="vp-muted mt-1 text-sm">
              Wähle ein vordefiniertes Preset (Hell / Dunkel) oder erstelle ein eigenes Farbschema.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Farb-Presets">
            {allPresets.map((p) => {
              const active = settings.activeThemeId === p.id;
              return (
                <div
                  key={p.id}
                  className={`relative flex items-center justify-between rounded-xl border p-2.5 transition ${
                    active ? "ring-2" : ""
                  }`}
                  style={{
                    backgroundColor: p.surface,
                    color: p.text,
                    borderColor: active ? p.primary : p.border,
                  }}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => update({ activeThemeId: p.id })}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="flex shrink-0 items-center -space-x-1">
                      <span
                        className="inline-block h-4 w-4 rounded-full border border-white/40"
                        style={{ backgroundColor: p.primary }}
                      />
                      <span
                        className="inline-block h-4 w-4 rounded-full border border-white/40"
                        style={{ backgroundColor: p.background }}
                      />
                      <span
                        className="inline-block h-4 w-4 rounded-full border border-white/40"
                        style={{ backgroundColor: p.accent }}
                      />
                    </span>
                    <span className="truncate text-sm font-semibold">{p.name}</span>
                  </button>
                  {active && <Check size={16} className="shrink-0" style={{ color: p.primary }} />}
                  {!p.builtIn && (
                    <button
                      type="button"
                      onClick={() => handleDeletePreset(p.id)}
                      aria-label={`Preset ${p.name} löschen`}
                      className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:opacity-75"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Benutzerdefiniertes Farb-Preset erstellen */}
          <form onSubmit={handleCreatePreset} className="space-y-3 border-t pt-4" style={{ borderColor: "var(--vp-border)" }}>
            <h3 className="text-sm font-semibold">Eigenes Farb-Preset erstellen</h3>
            <Field label="Preset-Name">
              {(id) => (
                <input
                  id={id}
                  className={input}
                  placeholder="z. B. Mitternachtsblau"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                />
              )}
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium">
                <span>Primärfarbe</span>
                <div className="vp-surface flex items-center gap-2 rounded-xl border p-1.5">
                  <input
                    type="color"
                    aria-label="Primärfarbe"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent"
                  />
                  <span className=" font-mono text-[11px]">{primaryColor}</span>
                </div>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">
                <span>Hintergrundfarbe</span>
                <div className="vp-surface flex items-center gap-2 rounded-xl border p-1.5">
                  <input
                    type="color"
                    aria-label="Hintergrundfarbe"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent"
                  />
                  <span className="font-mono text-[11px]">{bgColor}</span>
                </div>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">
                <span>Akzentfarbe</span>
                <div className="vp-surface flex items-center gap-2 rounded-xl border p-1.5">
                  <input
                    type="color"
                    aria-label="Akzentfarbe"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent"
                  />
                  <span className="font-mono text-[11px]">{accentColor}</span>
                </div>
              </label>
            </div>
            <button
              type="submit"
              className="vp-btn-primary flex h-11 w-full items-center justify-center gap-2 rounded-xl font-semibold shadow-sm transition hover:opacity-95"
            >
              <Plus size={18} /> Farb-Preset speichern &amp; aktivieren
            </button>
            {themeMsg && (
              <p role="status" className="vp-muted text-xs">
                {themeMsg}
              </p>
            )}
          </form>
        </section>

        <p className="vp-muted text-center text-xs">
          Alle Einstellungen werden automatisch lokal gespeichert.
        </p>
      </main>
    </div>
  );
}
