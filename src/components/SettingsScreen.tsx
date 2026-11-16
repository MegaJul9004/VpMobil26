"use client";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Check,
  Eye,
  EyeOff,
  Maximize2,
  Minus,
  Monitor,
  Paintbrush,
  Palette,
  Plus,
  RotateCcw,
  School,
  Send,
  Trash2,
} from "lucide-react";
import { useId, useMemo, useState } from "react";
import { MAX_FAVORITES, MIN_FAVORITES, type Settings } from "@/lib/settings";
import { usePush } from "@/lib/client/usePush";
import {
  BUILTIN_THEMES,
  DEFAULT_SUBJECTS,
  DEFAULT_UI_COLORS,
  MAX_CUSTOM_THEMES,
  SUBJECT_FONTS,
  buildCustomPreset,
  type CustomTheme,
  type SubjectStyle,
  type ThemePreset,
  type UiColorOverrides,
} from "@/lib/themes";
import { Toggle } from "./ui";

const card = "vp-surface rounded-2xl border p-4 shadow-sm md:p-5";
const input =
  "vp-surface h-11 w-full rounded-xl border px-3.5 text-sm outline-none focus:ring-2";

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

function ColorPick({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium">
      <span>{label}</span>
      <div className="vp-surface flex items-center gap-2 rounded-xl border p-1.5">
        <input
          type="color"
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-9 shrink-0 cursor-pointer rounded border-0 bg-transparent"
        />
        <span className="truncate font-mono text-[11px]">{value}</span>
      </div>
    </label>
  );
}

export function SettingsScreen({
  settings,
  update,
  availableSubjects = DEFAULT_SUBJECTS,
  activeClass,
  onBack,
}: {
  settings: Settings;
  update: (p: Partial<Settings> | ((prev: Settings) => Partial<Settings>)) => void;
  availableSubjects?: string[];
  activeClass?: string;
  onBack: () => void;
}) {
  const [showPw, setShowPw] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [bgColor, setBgColor] = useState("#0f172a");
  const [accentColor, setAccentColor] = useState("#f59e0b");
  const [themeMsg, setThemeMsg] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [pushFeedback, setPushFeedback] = useState("");
  const [pushBusy, setPushBusy] = useState(false);

  const targetClass = activeClass || settings.favoriteSlots.find((s) => s.trim()) || "9F";
  const push = usePush(targetClass, []);
  const fav = settings.favoriteCount;

  const handleTogglePush = async (next: boolean) => {
    update({ pushEnabled: next });
    setPushFeedback("");
    if (next) {
      await push.enable();
    } else {
      await push.disable();
    }
  };

  /** Sendet eine Test-Push-Nachricht (per Server-Web-Push oder lokalem Notification-Fallback). */
  const handleSendTestPush = async () => {
    setPushBusy(true);
    setPushFeedback("");
    try {
      const title = `🚨 Test-Push VpMobil26 (${targetClass})`;
      const body = "Push-Benachrichtigungen funktionieren einwandfrei!";

      // 1) Falls Web-Push über Service Worker aktiv ist -> echten Server-Test-Push probieren
      if ("serviceWorker" in navigator && "PushManager" in window) {
        const reg = await navigator.serviceWorker.ready.catch(() => null);
        const sub = reg ? await reg.pushManager.getSubscription().catch(() => null) : null;
        if (sub) {
          const res = await fetch("/api/test-push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          const j = (await res.json().catch(() => ({}))) as { ok?: boolean; body?: string; error?: string };
          if (res.ok && j.ok) {
            setPushFeedback(`✅ Test-Push über Server gesendet: ${j.body ?? body}`);
            return;
          }
        }
      }

      // 2) Fallback: Direkte System-Benachrichtigung im Browser / Service Worker
      if ("Notification" in window) {
        let perm = Notification.permission;
        if (perm === "default") {
          perm = await Notification.requestPermission();
        }
        if (perm === "granted") {
          const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.ready.catch(() => null) : null;
          if (reg && "showNotification" in reg) {
            await reg.showNotification(title, {
              body,
              icon: "/icons/icon-192.png",
              tag: "vpmobil26-test",
            });
          } else {
            new Notification(title, { body, icon: "/icons/icon-192.png" });
          }
          setPushFeedback(`✅ Test-Benachrichtigung ausgelöst: "${body}"`);
          return;
        }
        if (perm === "denied") {
          setPushFeedback("⚠️ Benachrichtigungen wurden im Browser blockiert. Bitte in den Browser-Einstellungen erlauben.");
          return;
        }
      }

      setPushFeedback(`ℹ️ Simulation: ${title} – ${body} (Dieser Browser unterstützt keine Push-Notifications)`);
    } catch (e) {
      setPushFeedback(`⚠️ Fehler beim Test-Push: ${(e as Error).message}`);
    } finally {
      setPushBusy(false);
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
      const nextActive = prev.activeThemeId === id ? "system" : prev.activeThemeId;
      return { customThemes: nextCustom, activeThemeId: nextActive };
    });
  };

  const patchUiColors = (patch: Partial<UiColorOverrides>) => {
    update((prev) => ({ uiColors: { ...prev.uiColors, ...patch } }));
  };

  const patchAllSubjects = (patch: Partial<SubjectStyle>) => {
    update((prev) => ({
      allSubjectsStyle: { ...prev.allSubjectsStyle, ...patch },
    }));
  };

  const patchSingleSubject = (subj: string, patch: Partial<SubjectStyle>) => {
    const key = subj.trim().toUpperCase();
    update((prev) => ({
      subjectStyles: {
        ...prev.subjectStyles,
        [key]: { ...(prev.subjectStyles[key] ?? {}), ...patch },
      },
    }));
  };

  const resetSingleSubject = (subj: string) => {
    const key = subj.trim().toUpperCase();
    update((prev) => {
      const next = { ...prev.subjectStyles };
      delete next[key];
      return { subjectStyles: next };
    });
  };

  const subjectList = useMemo(() => {
    const set = new Set<string>([
      ...DEFAULT_SUBJECTS,
      ...availableSubjects,
      ...Object.keys(settings.subjectStyles),
    ]);
    return [...set].sort((a, b) => a.localeCompare(b, "de"));
  }, [availableSubjects, settings.subjectStyles]);

  const allPresets: ThemePreset[] = [
    ...BUILTIN_THEMES,
    ...settings.customThemes.map(buildCustomPreset),
  ];

  const ui = settings.uiColors;
  const allSub = settings.allSubjectsStyle;

  return (
    <div className="flex min-h-dvh w-full flex-col">
      <header className="vp-surface sticky top-0 z-20 flex items-center gap-2 border-b px-3 pb-2.5 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur md:px-6">
        <button
          onClick={onBack}
          aria-label="Zurück zum Homescreen"
          className="flex h-11 w-11 items-center justify-center rounded-full hover:opacity-80"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-bold">Einstellungen</h1>
      </header>

      {/* Vollbreites responsives Grid ohne ungenutzten Seitenrand auf dem PC */}
      <main className="w-full flex-1 p-3 pb-[calc(5rem+env(safe-area-inset-bottom))] md:p-6 md:pb-10 lg:p-8">
        <div className="grid w-full grid-cols-1 gap-5 xl:grid-cols-2">
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
                  placeholder="Schulnummer"
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
                  placeholder="Benutzername"
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
                    className="vp-muted absolute right-1 top-0.5 flex h-10 w-10 items-center justify-center rounded-lg"
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              )}
            </Field>
          </section>

          {/* Push-Benachrichtigungen + Test-Push + Zoom/Favoriten */}
          <div className="flex flex-col gap-5">
            <section className={`${card} space-y-3`} aria-labelledby="h-push">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 id="h-push" className="flex items-center gap-2 font-semibold">
                    <Bell size={18} /> Push-Benachrichtigungen
                  </h2>
                  <p className="vp-muted mt-1 text-sm">
                    {settings.pushEnabled ? "Aktiviert" : "Deaktiviert"}
                  </p>
                </div>
                <Toggle
                  checked={settings.pushEnabled}
                  onChange={handleTogglePush}
                  label="Push-Benachrichtigungen"
                />
              </div>

              <button
                type="button"
                data-testid="test-push-btn"
                onClick={handleSendTestPush}
                disabled={pushBusy || push.busy}
                className="vp-btn-primary flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold shadow-sm transition hover:opacity-95 disabled:opacity-50"
              >
                <Send size={16} />
                <span>{pushBusy ? "Sende Test-Push…" : "Test-Push-Benachrichtigung senden"}</span>
              </button>

              {(pushFeedback || push.message) && (
                <p role="status" className="vp-muted rounded-xl border p-2.5 text-xs" style={{ borderColor: "var(--vp-border)" }}>
                  {pushFeedback || push.message}
                </p>
              )}
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
                    : "Deaktiviert – Wochenplan startet immer bei 100%."}
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
                  className="vp-surface flex h-11 w-11 items-center justify-center rounded-full border disabled:opacity-30"
                >
                  <Minus size={18} />
                </button>
                <output
                  aria-live="polite"
                  aria-label="Anzahl Favoriten"
                  className="w-14 text-center text-2xl font-bold tabular-nums"
                >
                  {fav}
                </output>
                <button
                  type="button"
                  onClick={() => update({ favoriteCount: fav + 1 })}
                  disabled={fav >= MAX_FAVORITES}
                  aria-label="Mehr Favoriten"
                  className="vp-surface flex h-11 w-11 items-center justify-center rounded-full border disabled:opacity-30"
                >
                  <Plus size={18} />
                </button>
              </div>
            </section>
          </div>

          {/* Themes & System Dark/Light-Mode */}
          <section className={`${card} space-y-4`} aria-labelledby="h-theme">
            <div>
              <h2 id="h-theme" className="flex items-center gap-2 font-semibold">
                <Palette size={18} /> Themes &amp; System-Modus
              </h2>
              <p className="vp-muted mt-1 text-sm">
                Standardmäßig folgt die App automatisch dem Dark-/Light-Mode deines Geräts.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Farb-Presets">
              {/* System-Modus (Auto) */}
              <div
                className={`relative flex items-center justify-between rounded-xl border p-2.5 transition ${
                  settings.activeThemeId === "system" ? "ring-2" : ""
                }`}
                style={{
                  borderColor:
                    settings.activeThemeId === "system" ? "var(--vp-primary)" : "var(--vp-border)",
                }}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={settings.activeThemeId === "system"}
                  onClick={() => update({ activeThemeId: "system" })}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <Monitor size={16} style={{ color: "var(--vp-primary)" }} />
                  <span className="truncate text-sm font-semibold">System</span>
                </button>
                {settings.activeThemeId === "system" && (
                  <Check size={16} className="shrink-0" style={{ color: "var(--vp-primary)" }} />
                )}
              </div>

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

            {/* Eigenes Theme-Preset erstellen */}
            <form onSubmit={handleCreatePreset} className="space-y-3 border-t pt-4" style={{ borderColor: "var(--vp-border)" }}>
              <h3 className="text-sm font-semibold">Eigenes Farb-Preset speichern</h3>
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
              <div className="grid grid-cols-3 gap-2.5">
                <ColorPick label="Primär" value={primaryColor} onChange={setPrimaryColor} />
                <ColorPick label="Hintergrund" value={bgColor} onChange={setBgColor} />
                <ColorPick label="Akzent" value={accentColor} onChange={setAccentColor} />
              </div>
              <button
                type="submit"
                className="vp-btn-primary flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold shadow-sm transition hover:opacity-95"
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

          {/* Vollständige Farbanpassung (Schrift, Hintergrund, Kachelfarben, Farbverläufe) */}
          <section className={`${card} space-y-4`} aria-labelledby="h-uicolors">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 id="h-uicolors" className="flex items-center gap-2 font-semibold">
                  <Paintbrush size={18} /> Alle Farben &amp; Verläufe anpassen
                </h2>
                <p className="vp-muted mt-1 text-xs">
                  Schrift, Hintergrund, Kachelfarben und fließende Farbverläufe frei festlegen.
                </p>
              </div>
              <Toggle
                checked={ui.enabled}
                onChange={(v) => patchUiColors({ enabled: v })}
                label="Eigene App-Farben aktivieren"
              />
            </div>

            {ui.enabled && (
              <div className="space-y-4 border-t pt-3" style={{ borderColor: "var(--vp-border)" }}>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  <ColorPick label="Schriftfarbe" value={ui.text} onChange={(v) => patchUiColors({ text: v })} />
                  <ColorPick label="Nebenschrift" value={ui.muted} onChange={(v) => patchUiColors({ muted: v })} />
                  <ColorPick label="Primärfarbe" value={ui.primary} onChange={(v) => patchUiColors({ primary: v })} />
                  <ColorPick label="Änderungsfarbe" value={ui.accent} onChange={(v) => patchUiColors({ accent: v })} />
                  <ColorPick label="Rahmenfarbe" value={ui.border} onChange={(v) => patchUiColors({ border: v })} />
                </div>

                {/* Hintergrund & Hintergrund-Verlauf */}
                <div className="rounded-xl border p-3 space-y-2.5" style={{ borderColor: "var(--vp-border)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">App-Hintergrund &amp; Verlauf</span>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={ui.bgGradientEnabled}
                        onChange={(e) => patchUiColors({ bgGradientEnabled: e.target.checked })}
                      />
                      <span>Farbverlauf</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <ColorPick label="Hintergrund Start" value={ui.background} onChange={(v) => patchUiColors({ background: v })} />
                    {ui.bgGradientEnabled && (
                      <ColorPick label="Verlauf Ziel" value={ui.bgGradientTo} onChange={(v) => patchUiColors({ bgGradientTo: v })} />
                    )}
                  </div>
                </div>

                {/* Kachelfarben & Kachel-Verlauf */}
                <div className="rounded-xl border p-3 space-y-2.5" style={{ borderColor: "var(--vp-border)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Kachelfarbe &amp; Kachel-Verlauf</span>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={ui.surfaceGradientEnabled}
                        onChange={(e) => patchUiColors({ surfaceGradientEnabled: e.target.checked })}
                      />
                      <span>Farbverlauf</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <ColorPick label="Kachel Start" value={ui.surface} onChange={(v) => patchUiColors({ surface: v })} />
                    {ui.surfaceGradientEnabled && (
                      <ColorPick label="Kachel Verlauf Ziel" value={ui.surfaceGradientTo} onChange={(v) => patchUiColors({ surfaceGradientTo: v })} />
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => update({ uiColors: { ...DEFAULT_UI_COLORS } })}
                  className="vp-surface flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-xs font-semibold"
                >
                  <RotateCcw size={14} /> App-Farben zurücksetzen
                </button>
              </div>
            )}
          </section>

          {/* Fächer-Design: Separate Schriftart & Farben (für alle oder jedes Fach einzeln) */}
          <section className={`${card} space-y-4 xl:col-span-2`} aria-labelledby="h-subjects">
            <div>
              <h2 id="h-subjects" className="flex items-center gap-2 font-semibold">
                <BookOpen size={18} /> Fächer-Schrift &amp; Fächer-Farben
              </h2>
              <p className="vp-muted mt-1 text-sm">
                Separate Schriftart für Fächer wählen und Farben entweder für alle Fächer oder für jedes Fach einzeln festlegen.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Separate Schriftart für Fächer">
                {(id) => (
                  <select
                    id={id}
                    value={settings.subjectFontFamily}
                    onChange={(e) => update({ subjectFontFamily: e.target.value })}
                    className={input}
                  >
                    {SUBJECT_FONTS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                )}
              </Field>

              <div className="space-y-1.5">
                <span className="text-sm font-medium">Farbmodus für Fächer</span>
                <div className="vp-surface grid grid-cols-2 gap-1 rounded-xl border p-1">
                  <button
                    type="button"
                    onClick={() => update({ subjectColorMode: "all" })}
                    className={`h-9 rounded-lg text-xs font-bold transition ${
                      settings.subjectColorMode === "all" ? "vp-btn-primary" : "vp-muted"
                    }`}
                  >
                    Für alle Fächer
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ subjectColorMode: "per-subject" })}
                    className={`h-9 rounded-lg text-xs font-bold transition ${
                      settings.subjectColorMode === "per-subject" ? "vp-btn-primary" : "vp-muted"
                    }`}
                  >
                    Für jedes Fach einzeln
                  </button>
                </div>
              </div>
            </div>

            {settings.subjectColorMode === "all" ? (
              <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--vp-border)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Einheitliche Farben für alle Fächer</span>
                  <button
                    type="button"
                    onClick={() => update({ allSubjectsStyle: {} })}
                    className="vp-muted flex items-center gap-1 text-xs font-semibold hover:opacity-80"
                  >
                    <RotateCcw size={13} /> Zurücksetzen
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <ColorPick
                    label="Fächer-Kachelfarbe"
                    value={allSub.bgColor ?? "#ffffff"}
                    onChange={(v) => patchAllSubjects({ bgColor: v })}
                  />
                  <ColorPick
                    label="Verlauf Zielfarbe"
                    value={allSub.bgGradientTo ?? "#e0e7ff"}
                    onChange={(v) => patchAllSubjects({ bgGradientTo: v, bgGradientEnabled: true })}
                  />
                  <ColorPick
                    label="Fächer-Schriftfarbe"
                    value={allSub.textColor ?? "#0f172a"}
                    onChange={(v) => patchAllSubjects({ textColor: v })}
                  />
                  <label className="flex items-center gap-2 self-end pb-2 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={allSub.bgGradientEnabled === true}
                      onChange={(e) => patchAllSubjects({ bgGradientEnabled: e.target.checked })}
                    />
                    <span>Verlauf aktiv</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Neues Fachkürzel hinzufügen */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const code = newSubjectCode.trim().toUpperCase();
                    if (!code) return;
                    patchSingleSubject(code, { bgColor: "#eef2ff", textColor: "#1e1b4b" });
                    setNewSubjectCode("");
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={newSubjectCode}
                    onChange={(e) => setNewSubjectCode(e.target.value)}
                    placeholder="Weiteres Fachkürzel hinzufügen (z. B. SW, PGW, CH)…"
                    className={input}
                  />
                  <button type="submit" className="vp-btn-primary h-11 shrink-0 rounded-xl px-4 text-xs font-bold">
                    Hinzufügen
                  </button>
                </form>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
                  {subjectList.map((subj) => {
                    const st = settings.subjectStyles[subj] ?? {};
                    const hasCustom = Object.keys(st).length > 0;
                    return (
                      <div
                        key={subj}
                        className="rounded-xl border p-3 space-y-2"
                        style={{
                          borderColor: hasCustom ? "var(--vp-primary)" : "var(--vp-border)",
                          backgroundColor: st.bgColor,
                          backgroundImage:
                            st.bgColor && st.bgGradientEnabled && st.bgGradientTo
                              ? `linear-gradient(135deg, ${st.bgColor}, ${st.bgGradientTo})`
                              : undefined,
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="vp-subject-font text-base font-extrabold"
                            style={st.textColor ? { color: st.textColor } : undefined}
                          >
                            {subj}
                          </span>
                          {hasCustom && (
                            <button
                              type="button"
                              onClick={() => resetSingleSubject(subj)}
                              aria-label={`${subj} zurücksetzen`}
                              className="vp-surface flex h-7 items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold"
                            >
                              <RotateCcw size={11} /> Reset
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <ColorPick
                            label="Kachel"
                            value={st.bgColor ?? "#ffffff"}
                            onChange={(v) => patchSingleSubject(subj, { bgColor: v })}
                          />
                          <ColorPick
                            label="Verlauf"
                            value={st.bgGradientTo ?? "#e0e7ff"}
                            onChange={(v) => patchSingleSubject(subj, { bgGradientTo: v, bgGradientEnabled: true })}
                          />
                          <ColorPick
                            label="Schrift"
                            value={st.textColor ?? "#0f172a"}
                            onChange={(v) => patchSingleSubject(subj, { textColor: v })}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <label className="vp-surface flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px]">
                            <input
                              type="checkbox"
                              checked={st.bgGradientEnabled === true}
                              onChange={(e) => patchSingleSubject(subj, { bgGradientEnabled: e.target.checked })}
                            />
                            <span>Verlauf</span>
                          </label>
                          <select
                            value={st.fontFamily ?? ""}
                            onChange={(e) =>
                              patchSingleSubject(subj, {
                                fontFamily: e.target.value || undefined,
                              })
                            }
                            aria-label={`Schriftart für ${subj}`}
                            className="vp-surface h-8 flex-1 rounded-lg border px-2 text-xs"
                          >
                            <option value="">Schrift: Global</option>
                            {SUBJECT_FONTS.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>

        <p className="vp-muted mt-6 text-center text-xs">
          Alle Einstellungen werden automatisch lokal gespeichert.
        </p>
      </main>
    </div>
  );
}
