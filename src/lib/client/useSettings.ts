"use client";
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SETTINGS, sanitizeSettings, type Settings } from "@/lib/settings";
import { applyThemeToDom, resolveTheme } from "@/lib/themes";

const KEY = "vp:settings";

const isSystemDark = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

function syncDom(s: Settings) {
  applyThemeToDom(
    resolveTheme(s.activeThemeId, s.customThemes, isSystemDark()),
    s.uiColors,
    s.subjectFontFamily
  );
}

/** Zentraler Settings-State mit Persistenz in localStorage & automatischer Theme-/System-Anwendung. */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem(KEY);
        const next = raw ? sanitizeSettings(JSON.parse(raw)) : DEFAULT_SETTINGS;
        setSettings(next);
        syncDom(next);
      } catch {
        setSettings(DEFAULT_SETTINGS);
        syncDom(DEFAULT_SETTINGS);
      }
    };
    load();
    setReady(true);

    const onStorage = (e: StorageEvent) => e.key === KEY && load();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Aktualisiere DOM bei Theme-, Farb- oder Schrift-Änderung sowie bei System-Wechsel (Dark/Light Mode)
  useEffect(() => {
    if (!ready) return;
    syncDom(settings);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => syncDom(settings);
    mq.addEventListener("change", onSystemChange);
    return () => mq.removeEventListener("change", onSystemChange);
  }, [settings, ready]);

  const update = useCallback((patch: Partial<Settings> | ((prev: Settings) => Partial<Settings>)) => {
    setSettings((prev) => {
      const resolved = typeof patch === "function" ? patch(prev) : patch;
      const next = sanitizeSettings({ ...prev, ...resolved });
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      syncDom(next);
      return next;
    });
  }, []);

  return { settings, update, ready };
}
