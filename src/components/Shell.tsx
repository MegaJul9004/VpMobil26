"use client";
import { CalendarDays, Home, Settings as SettingsIcon, Star } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSettings } from "@/lib/client/useSettings";
import { HomeScreen } from "./HomeScreen";
import { PlanScreen, type PlanViewMode } from "./PlanScreen";
import { SettingsScreen } from "./SettingsScreen";

type ViewState =
  | { screen: "home" }
  | { screen: "settings" }
  | { screen: "plan"; className: string };

/**
 * Adaptiver App-Rahmen (Anforderung 4):
 * - Mobile (< 768px): Fixierte untere Navigationsleiste (Bottom Bar), Standard-Modus = Tagesplan.
 * - Desktop & iPad (>= 768px): Aufgeräumte linke Sidebar + Vollbreiten-Hauptbereich, Standard-Modus = Wochenplan.
 */
export default function Shell() {
  const { settings, update, ready } = useSettings();
  const [view, setView] = useState<ViewState>({ screen: "home" });
  const [lastClass, setLastClass] = useState<string>("");
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);

  // Ansichtsmodus (Tagesplan vs. Wochenplan): Standard Mobile = "day", Desktop/iPad (>= 768px) = "week"
  const [userPickedMode, setUserPickedMode] = useState<PlanViewMode | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const planMode: PlanViewMode = userPickedMode ?? (isDesktop ? "week" : "day");

  // Lade verfügbare Klassen im Hintergrund für die Favoriten-Auswahl
  useEffect(() => {
    if (!ready) return;
    const headers: Record<string, string> = {};
    if (settings.schoolNumber) headers["x-school-number"] = settings.schoolNumber;
    if (settings.username) headers["x-school-user"] = settings.username;
    if (settings.password) headers["x-school-password"] = settings.password;
    fetch("/api/week", { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.classes?.length) setAvailableClasses(j.classes);
      })
      .catch(() => {});
  }, [ready, settings.schoolNumber, settings.username, settings.password]);

  // Browser-History-Synchronisation
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const st = e.state as ViewState | null;
      if (st?.screen === "settings") setView({ screen: "settings" });
      else if (st?.screen === "plan" && st.className) {
        setLastClass(st.className);
        setView({ screen: "plan", className: st.className });
      } else setView({ screen: "home" });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((next: ViewState) => {
    if (next.screen === "plan") setLastClass(next.className);
    history.pushState(next, "");
    setView(next);
  }, []);

  const configuredFavorites = useMemo(
    () =>
      settings.favoriteSlots
        .slice(0, settings.favoriteCount)
        .map((c) => c.trim())
        .filter(Boolean),
    [settings.favoriteSlots, settings.favoriteCount]
  );

  const activePlanClass =
    view.screen === "plan" ? view.className : lastClass || configuredFavorites[0] || "";

  if (!ready) return <div className="min-h-dvh" aria-busy="true" />;

  return (
    <div className="flex min-h-dvh w-full flex-col md:flex-row">
      {/* Desktop & iPad (>= 768px): Aufgeräumte linke Seitenleiste (Sidebar) */}
      <aside
        data-testid="desktop-sidebar"
        aria-label="Desktop-Navigation"
        className="vp-surface hidden w-60 shrink-0 flex-col justify-between border-r p-4 md:flex"
      >
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => navigate({ screen: "home" })}
            className="flex items-center gap-2.5 text-left"
          >
            <div className="vp-btn-primary grid h-9 w-9 place-items-center rounded-xl text-sm font-black shadow-sm">
              Vp
            </div>
            <div>
              <div className="text-base font-extrabold leading-tight">VpMobil24</div>
              <div className="vp-muted text-[11px]">Vertretungsplan</div>
            </div>
          </button>

          <nav className="space-y-1.5" aria-label="Hauptbereiche">
            <button
              type="button"
              onClick={() => navigate({ screen: "home" })}
              className={`flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-semibold transition ${
                view.screen === "home" ? "vp-btn-primary shadow-sm" : "hover:opacity-80"
              }`}
            >
              <Home size={17} />
              <span>Favoriten / Start</span>
            </button>

            {activePlanClass && (
              <button
                type="button"
                onClick={() => navigate({ screen: "plan", className: activePlanClass })}
                className={`flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-semibold transition ${
                  view.screen === "plan" ? "vp-btn-primary shadow-sm" : "hover:opacity-80"
                }`}
              >
                <CalendarDays size={17} />
                <span>Plan ({activePlanClass})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate({ screen: "settings" })}
              className={`flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-semibold transition ${
                view.screen === "settings" ? "vp-btn-primary shadow-sm" : "hover:opacity-80"
              }`}
            >
              <SettingsIcon size={17} />
              <span>Einstellungen</span>
            </button>
          </nav>

          {configuredFavorites.length > 0 && (
            <div className="space-y-2 border-t pt-4" style={{ borderColor: "var(--vp-border)" }}>
              <div className="vp-muted px-1 text-[11px] font-bold uppercase tracking-wider">
                Schnellwahl Favoriten
              </div>
              <div className="space-y-1">
                {configuredFavorites.map((c, i) => {
                  const isCurrent = view.screen === "plan" && view.className === c;
                  return (
                    <button
                      key={`${c}-${i}`}
                      type="button"
                      onClick={() => navigate({ screen: "plan", className: c })}
                      className={`flex h-9 w-full items-center justify-between rounded-xl px-3 text-xs font-bold transition ${
                        isCurrent ? "vp-btn-primary" : "vp-surface border hover:opacity-85"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Star size={12} /> Klasse {c}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <p className="vp-muted text-[11px]">VpMobil24 PWA</p>
      </aside>

      {/* Hauptinhalt */}
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        {view.screen === "settings" && (
          <SettingsScreen
            settings={settings}
            update={update}
            onBack={() => navigate({ screen: "home" })}
          />
        )}

        {view.screen === "plan" && (
          <PlanScreen
            className={view.className}
            settings={settings}
            update={update}
            onBack={() => navigate({ screen: "home" })}
            onClassesLoaded={setAvailableClasses}
            mode={planMode}
            onModeChange={setUserPickedMode}
          />
        )}

        {view.screen === "home" && (
          <HomeScreen
            settings={settings}
            update={update}
            availableClasses={availableClasses}
            onOpenSettings={() => navigate({ screen: "settings" })}
            onOpenPlan={(className) => navigate({ screen: "plan", className })}
          />
        )}
      </div>

      {/* Mobile (< 768px): Fixierte untere Navigationsleiste (Bottom Bar) für Einhand-Bedienung */}
      <nav
        data-testid="mobile-bottom-bar"
        aria-label="Mobile Navigation"
        className="vp-surface fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t pb-safe backdrop-blur md:hidden"
      >
        <button
          type="button"
          onClick={() => navigate({ screen: "home" })}
          aria-current={view.screen === "home" ? "page" : undefined}
          className={`flex min-h-[54px] flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${
            view.screen === "home" ? "" : "vp-muted"
          }`}
          style={view.screen === "home" ? { color: "var(--vp-primary)" } : undefined}
        >
          <Home size={20} />
          <span>Favoriten</span>
        </button>

        <button
          type="button"
          disabled={!activePlanClass}
          onClick={() => activePlanClass && navigate({ screen: "plan", className: activePlanClass })}
          aria-current={view.screen === "plan" ? "page" : undefined}
          className={`flex min-h-[54px] flex-col items-center justify-center gap-0.5 text-[11px] font-bold disabled:opacity-40 ${
            view.screen === "plan" ? "" : "vp-muted"
          }`}
          style={view.screen === "plan" ? { color: "var(--vp-primary)" } : undefined}
        >
          <CalendarDays size={20} />
          <span>{activePlanClass ? `Plan (${activePlanClass})` : "Plan"}</span>
        </button>

        <button
          type="button"
          onClick={() => navigate({ screen: "settings" })}
          aria-current={view.screen === "settings" ? "page" : undefined}
          className={`flex min-h-[54px] flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${
            view.screen === "settings" ? "" : "vp-muted"
          }`}
          style={view.screen === "settings" ? { color: "var(--vp-primary)" } : undefined}
        >
          <SettingsIcon size={20} />
          <span>Einstellungen</span>
        </button>
      </nav>
    </div>
  );
}
