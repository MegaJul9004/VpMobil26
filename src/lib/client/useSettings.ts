"use client";
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SETTINGS, sanitizeSettings, type Settings } from "@/lib/settings";
import { applyThemeToDom, resolveTheme } from "@/lib/themes";

const KEY = "vp:settings";

/** Zentraler Settings-State mit Persistenz in localStorage & automatischer Theme-Anwendung. */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem(KEY);
        const next = raw ? sanitizeSettings(JSON.parse(raw)) : DEFAULT_SETTINGS;
        setSettings(next);
        applyThemeToDom(resolveTheme(next.activeThemeId, next.customThemes));
      } catch {
        setSettings(DEFAULT_SETTINGS);
        applyThemeToDom(resolveTheme(DEFAULT_SETTINGS.activeThemeId, DEFAULT_SETTINGS.customThemes));
      }
    };
    load();
    setReady(true);
    const onStorage = (e: StorageEvent) => e.key === KEY && load();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyThemeToDom(resolveTheme(settings.activeThemeId, settings.customThemes));
  }, [settings.activeThemeId, settings.customThemes, ready]);

  const update = useCallback((patch: Partial<Settings> | ((prev: Settings) => Partial<Settings>)) => {
    setSettings((prev) => {
      const resolved = typeof patch === "function" ? patch(prev) : patch;
      const next = sanitizeSettings({ ...prev, ...resolved });
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      applyThemeToDom(resolveTheme(next.activeThemeId, next.customThemes));
      return next;
    });
  }, []);

  return { settings, update, ready };
}
