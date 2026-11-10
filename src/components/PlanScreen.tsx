"use client";
import {
  ArrowLeft,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Info,
  ListFilter,
  RotateCw,
  Share2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WeekResponse } from "@/app/api/week/route";
import {
  addDays,
  defaultStartDate,
  formatDmy,
  isoWeek,
  mondayOf,
  parseYmd,
  prettyDate,
  resolveWeekType,
  weekdayShort,
} from "@/lib/plan/dates";
import { lessonKey } from "@/lib/plan/diff";
import type { Lesson } from "@/lib/plan/types";
import type { Settings } from "@/lib/settings";
import { formatDayShareText } from "@/lib/share";
import { WeekCanvas } from "./WeekCanvas";
import { LessonRow, Modal, Toggle, isChanged } from "./ui";

export type PlanViewMode = "day" | "week";

const FULL_WEEKDAYS: Record<string, string> = {
  Mo: "Montag",
  Di: "Dienstag",
  Mi: "Mittwoch",
  Do: "Donnerstag",
  Fr: "Freitag",
};

export function PlanScreen({
  className,
  settings,
  update,
  onBack,
  onClassesLoaded,
  mode,
  onModeChange,
}: {
  className: string;
  settings: Settings;
  update: (p: Partial<Settings> | ((prev: Settings) => Partial<Settings>)) => void;
  onBack: () => void;
  onClassesLoaded?: (classes: string[]) => void;
  mode: PlanViewMode;
  onModeChange: (m: PlanViewMode) => void;
}) {
  const initialDate = useMemo(() => defaultStartDate(), []);
  const [monday, setMonday] = useState<string>(() => mondayOf(initialDate));
  const [selectedDay, setSelectedDay] = useState<string>(initialDate);
  const [week, setWeek] = useState<WeekResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadTick, setReloadTick] = useState(0);
  const [coursesOpen, setCoursesOpen] = useState(false);

  // Phase 4: Long-Press Kontextmenü-Status (welcher Tag zeigt das "Teilen"-Popup?)
  const [shareMenuDate, setShareMenuDate] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string>("");

  const friday = useMemo(() => addDays(monday, 4), [monday]);
  const kw = useMemo(() => week?.kw ?? isoWeek(monday), [week, monday]);
  const weekType = useMemo(
    () => week?.weekType ?? resolveWeekType(undefined, kw),
    [week, kw]
  );

  // Halte selectedDay immer innerhalb der aktuell gewählten Woche (Mo–Fr)
  useEffect(() => {
    const curMonday = mondayOf(selectedDay);
    if (curMonday !== monday) {
      const wdIdx = Math.min(4, Math.max(0, (parseYmd(selectedDay).getDay() + 6) % 7));
      setSelectedDay(addDays(monday, wdIdx));
    }
  }, [monday, selectedDay]);

  // Lade Wochendaten
  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError("");
    const freshParam = reloadTick > 0 ? "&fresh=1" : "";
    const headers: Record<string, string> = {};
    if (settings.schoolNumber) headers["x-school-number"] = settings.schoolNumber;
    if (settings.username) headers["x-school-user"] = settings.username;
    if (settings.password) headers["x-school-password"] = settings.password;

    fetch(`/api/week?date=${monday}&class=${encodeURIComponent(className)}${freshParam}`, {
      signal: ac.signal,
      headers,
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Fehler beim Laden des Stundenplans");
        const data = j as WeekResponse;
        setWeek(data);
        if (data.classes?.length && onClassesLoaded) {
          onClassesLoaded(data.classes);
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError((e as Error).message);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [monday, className, reloadTick, settings.schoolNumber, settings.username, settings.password, onClassesLoaded]);

  const hidden = useMemo(
    () => settings.hiddenCourses[className] ?? [],
    [settings.hiddenCourses, className]
  );

  const visibleLessons = useCallback(
    (lessons: Lesson[]) => lessons.filter((l) => !hidden.includes(lessonKey(l))),
    [hidden]
  );

  const toggleCourse = (key: string) => {
    update((prev) => {
      const cur = prev.hiddenCourses[className] ?? [];
      const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
      return { hiddenCourses: { ...prev.hiddenCourses, [className]: next } };
    });
  };

  const setAllCourses = (showAll: boolean) => {
    update((prev) => ({
      hiddenCourses: {
        ...prev.hiddenCourses,
        [className]: showAll ? [] : (week?.courses ?? []).map((c) => c.key),
      },
    }));
  };

  const daysToRender = useMemo(() => {
    if (week && week.monday === monday) return week.days;
    return [0, 1, 2, 3, 4].map((i) => ({
      date: addDays(monday, i),
      available: false,
      datumPlan: undefined,
      zeitstempel: undefined,
      zusatzInfo: [],
      lessons: [],
    }));
  }, [week, monday]);

  const activeDayObj = useMemo(
    () => daysToRender.find((d) => d.date === selectedDay) ?? daysToRender[0],
    [daysToRender, selectedDay]
  );

  const handleShareDay = async (day: WeekResponse["days"][number]) => {
    const lessons = visibleLessons(day.lessons);
    const payload = formatDayShareText({
      className,
      date: day.date,
      datumPlan: day.datumPlan,
      lessons,
      zusatzInfo: day.zusatzInfo,
    });
    setShareMenuDate(null);
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: payload.title, text: payload.text });
        setShareStatus(`Geteilt: ${payload.title}`);
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload.text);
        setShareStatus("In die Zwischenablage kopiert (Web Share API auf diesem Gerät nicht verfügbar).");
        return;
      }
      setShareStatus(payload.text);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setShareStatus(`Teilen fehlgeschlagen: ${(e as Error).message}`);
      }
    }
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      {/* Plan-Header mit Direkt-Umschalter [ 📅 Tagesplan | 🗓️ Wochenplan ] */}
      <header className="vp-surface sticky top-0 z-30 border-b px-3 pb-2.5 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              aria-label="Zurück zum Homescreen"
              className="vp-surface flex h-10 w-10 items-center justify-center rounded-full border hover:opacity-80 md:hidden"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-extrabold leading-tight md:text-xl">
                Klasse {className}
              </h1>
              <p className="vp-muted text-xs">Vertretungs- &amp; Stundenplan</p>
            </div>
          </div>

          {/* 1. Direkt-Umschalter [ 📅 Tagesplan | 🗓️ Wochenplan ] + Kurse + Aktualisieren */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Ansichtsmodus"
              data-testid="plan-mode-switcher"
              className="vp-surface inline-flex rounded-xl border p-1"
            >
              <button
                type="button"
                aria-pressed={mode === "day"}
                onClick={() => onModeChange("day")}
                className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition md:px-3 ${
                  mode === "day" ? "vp-btn-primary shadow-sm" : "vp-muted hover:opacity-85"
                }`}
              >
                <span aria-hidden>📅</span>
                <span>Tagesplan</span>
              </button>
              <button
                type="button"
                aria-pressed={mode === "week"}
                onClick={() => onModeChange("week")}
                className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition md:px-3 ${
                  mode === "week" ? "vp-btn-primary shadow-sm" : "vp-muted hover:opacity-85"
                }`}
              >
                <span aria-hidden>🗓️</span>
                <span>Wochenplan</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setCoursesOpen(true)}
              aria-label="Kurse"
              className="vp-surface flex h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition hover:opacity-85"
            >
              <ListFilter size={16} />
              <span>Kurse</span>
              {hidden.length > 0 && (
                <span className="vp-badge-accent ml-0.5 rounded-full px-1.5 py-0.2 text-[10px]">
                  {hidden.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setReloadTick((t) => t + 1)}
              aria-label="Plan aktualisieren"
              title="Aktualisieren"
              className="vp-surface flex h-10 w-10 items-center justify-center rounded-xl border transition hover:opacity-85"
            >
              <RotateCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Kalenderwoche, A/B-Woche, Datumsspanne & Pfeil-Navigation */}
        <div
          className="mt-2 flex items-center justify-between gap-2 rounded-2xl border px-2 py-1.5"
          style={{ borderColor: "var(--vp-border)" }}
        >
          <button
            type="button"
            onClick={() => setMonday((m) => addDays(m, -7))}
            aria-label="Vorherige Woche"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl hover:opacity-80"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="min-w-0 flex-1 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-sm font-extrabold md:text-base" data-testid="header-kw">
                KW {kw}
              </span>
              <span
                data-testid="header-weektype"
                className="vp-btn-primary rounded-full px-2.5 py-0.5 text-xs font-bold"
              >
                {weekType}-Woche
              </span>
            </div>
            <p className="vp-muted mt-0.5 text-xs font-medium" data-testid="header-daterange">
              von {formatDmy(monday)} bis {formatDmy(friday)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMonday((m) => addDays(m, 7))}
            aria-label="Nächste Woche"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl hover:opacity-80"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      {/* Hauptbereich */}
      <main className="flex flex-1 flex-col space-y-3 p-2.5 pb-[calc(5rem+env(safe-area-inset-bottom))] md:p-5 md:pb-6">
        {error && (
          <div className="vp-changed-box rounded-2xl border p-3.5 text-sm font-medium">
            ⚠️ {error}
          </div>
        )}

        {shareStatus && (
          <div
            role="status"
            className="vp-surface flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs"
          >
            <span className="truncate">{shareStatus}</span>
            <button
              type="button"
              onClick={() => setShareStatus("")}
              aria-label="Hinweis schließen"
              className="vp-muted p-1"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {mode === "week" ? (
          /* 2. & 3. Strenges 5-Tage-Wochenraster im interaktiven Zoom-/Pan-Canvas */
          <WeekCanvas
            days={daysToRender}
            visibleLessons={visibleLessons}
            rememberZoomPosition={settings.rememberWeekZoomPosition}
            shareMenuDate={shareMenuDate}
            onOpenShare={(date) => setShareMenuDate(date)}
            onCloseShare={() => setShareMenuDate(null)}
            onShareDay={handleShareDay}
            onSelectDay={(date) => {
              setSelectedDay(date);
              onModeChange("day");
            }}
          />
        ) : (
          /* 4. Tagesplan: Mobile mit Wochentag-Tabs & Kartenliste; Desktop als 2-Spalten-Dashboard (links Tagesplan, rechts Infoticker / Schulnachrichten) */
          <div
            data-testid="day-dashboard"
            className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_22rem]"
          >
            {/* Linke Hauptspalte: Wochentag-Tabs + Tageskarte */}
            <div className="min-w-0 space-y-3">
              {/* Wochentags-Leiste (Mo Di Mi Do Fr) zum schnellen Durchschalten */}
              <div
                role="tablist"
                aria-label="Wochentage"
                className="grid grid-cols-5 gap-1.5"
              >
                {daysToRender.map((d) => {
                  const sel = d.date === activeDayObj.date;
                  const chCount = visibleLessons(d.lessons).filter(isChanged).length;
                  return (
                    <button
                      key={d.date}
                      type="button"
                      role="tab"
                      aria-selected={sel}
                      onClick={() => setSelectedDay(d.date)}
                      className={`relative flex min-h-[48px] flex-col items-center justify-center rounded-xl border text-xs font-bold transition ${
                        sel ? "vp-btn-primary shadow-sm" : "vp-surface hover:opacity-85"
                      }`}
                    >
                      <span>{weekdayShort(d.date)}</span>
                      <span className="text-[11px] opacity-80">
                        {parseYmd(d.date).getDate()}.
                      </span>
                      {chCount > 0 && (
                        <span
                          className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: sel ? "#ffffff" : "var(--vp-accent)",
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <DayCard
                day={activeDayObj}
                lessons={visibleLessons(activeDayObj.lessons)}
                shareOpen={shareMenuDate === activeDayObj.date}
                onOpenShare={() => setShareMenuDate(activeDayObj.date)}
                onCloseShare={() => setShareMenuDate(null)}
                onShare={() => handleShareDay(activeDayObj)}
              />
            </div>

            {/* Rechte Dashboard-Spalte auf PC / iPad (>= 768px): Infoticker / Schulnachrichten & Wochenüberblick */}
            <aside
              data-testid="desktop-day-infoticker"
              className="hidden space-y-4 md:block"
            >
              <section className="vp-surface rounded-2xl border p-4 shadow-sm">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
                  <Info size={16} style={{ color: "var(--vp-primary)" }} />
                  <span>Infoticker / Schulnachrichten</span>
                </h3>
                {activeDayObj.zusatzInfo.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {activeDayObj.zusatzInfo.map((info, i) => (
                      <li
                        key={i}
                        className="rounded-xl border p-2.5 text-xs leading-relaxed"
                        style={{ borderColor: "var(--vp-border)" }}
                      >
                        {info}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="vp-muted text-xs">
                    Für {FULL_WEEKDAYS[weekdayShort(activeDayObj.date)]},{" "}
                    {formatDmy(activeDayObj.date)} liegen keine allgemeinen Schulnachrichten vor.
                  </p>
                )}
              </section>

              <section className="vp-surface rounded-2xl border p-4 shadow-sm">
                <h3 className="mb-2 text-sm font-bold">Wochenübersicht (KW {kw})</h3>
                <ul className="space-y-1.5">
                  {daysToRender.map((d) => {
                    const ch = visibleLessons(d.lessons).filter(isChanged).length;
                    const active = d.date === activeDayObj.date;
                    return (
                      <li key={d.date}>
                        <button
                          type="button"
                          onClick={() => setSelectedDay(d.date)}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                            active ? "ring-2" : "hover:opacity-85"
                          }`}
                          style={{
                            borderColor: active ? "var(--vp-primary)" : "var(--vp-border)",
                          }}
                        >
                          <span>
                            {FULL_WEEKDAYS[weekdayShort(d.date)]}, {formatDmy(d.date).slice(0, 6)}
                          </span>
                          <span
                            style={ch > 0 ? { color: "var(--vp-accent)" } : undefined}
                            className={ch > 0 ? "font-bold" : "vp-muted"}
                          >
                            {!d.available
                              ? "kein Plan"
                              : ch > 0
                              ? `${ch} Änderung${ch === 1 ? "" : "en"}`
                              : "regulär"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </aside>
          </div>
        )}
      </main>

      {/* Kurse-Modal */}
      <Modal
        open={coursesOpen}
        onClose={() => setCoursesOpen(false)}
        title={`Kurse filtern (${className})`}
      >
        <div className="space-y-3">
          <p className="vp-muted text-xs">
            Wähle aus, welche Kurse und Fächer der Klasse <b>{className}</b> im Plan angezeigt werden sollen.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAllCourses(true)}
              className="vp-surface h-10 flex-1 rounded-xl border text-xs font-semibold"
            >
              Alle einblenden
            </button>
            <button
              type="button"
              onClick={() => setAllCourses(false)}
              className="vp-surface h-10 flex-1 rounded-xl border text-xs font-semibold"
            >
              Alle ausblenden
            </button>
          </div>
          {(week?.courses ?? []).length === 0 ? (
            <p className="vp-muted py-6 text-center text-sm">
              Für diese Woche wurden noch keine Kursdaten geladen.
            </p>
          ) : (
            <ul className="space-y-2">
              {(week?.courses ?? []).map((c) => {
                const enabled = !hidden.includes(c.key);
                return (
                  <li
                    key={c.key}
                    className="vp-surface flex min-h-[52px] items-center justify-between gap-3 rounded-xl border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">
                        {c.fach || c.key}{" "}
                        {c.key !== c.fach && (
                          <span className="vp-muted text-xs font-normal">({c.key})</span>
                        )}
                      </div>
                      {c.lehrer && <div className="vp-muted text-xs">Lehrkraft: {c.lehrer}</div>}
                    </div>
                    <Toggle
                      checked={enabled}
                      onChange={() => toggleCourse(c.key)}
                      label={`Kurs ${c.key}`}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Modal>
    </div>
  );
}

/** Einzelne Tagesansicht mit Long-Press-Geste zum Teilen */
function DayCard({
  day,
  lessons,
  shareOpen,
  onOpenShare,
  onCloseShare,
  onShare,
}: {
  day: WeekResponse["days"][number];
  lessons: Lesson[];
  shareOpen: boolean;
  onOpenShare: () => void;
  onCloseShare: () => void;
  onShare: () => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    startPos.current = { x: e.clientX, y: e.clientY };
    clearTimer();
    timerRef.current = setTimeout(() => {
      onOpenShare();
    }, 450);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startPos.current) return;
    const dx = Math.abs(e.clientX - startPos.current.x);
    const dy = Math.abs(e.clientY - startPos.current.y);
    if (dx > 12 || dy > 12) clearTimer();
  };

  useEffect(() => clearTimer, []);

  const wdShort = weekdayShort(day.date);
  const wdFull = FULL_WEEKDAYS[wdShort] ?? wdShort;
  const changesCount = lessons.filter(isChanged).length;

  return (
    <section
      data-testid={`day-card-${day.date}`}
      onPointerDown={handlePointerDown}
      onPointerUp={clearTimer}
      onPointerLeave={clearTimer}
      onPointerCancel={clearTimer}
      onPointerMove={handlePointerMove}
      onContextMenu={(e) => {
        e.preventDefault();
        clearTimer();
        onOpenShare();
      }}
      className="vp-surface relative flex flex-col rounded-2xl border p-4 shadow-sm select-none"
    >
      {/* Kontextmenü / Tooltip nach Long-Press */}
      {shareOpen && (
        <div
          role="menu"
          aria-label={`Aktionen für ${wdFull}`}
          onPointerDown={(e) => e.stopPropagation()}
          className="vp-surface absolute right-3 top-12 z-30 flex items-center gap-2 rounded-2xl border p-2 shadow-2xl ring-2"
          style={{ borderColor: "var(--vp-primary)" }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={onShare}
            className="vp-btn-primary flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold shadow-sm"
          >
            <Share2 size={14} />
            <span>Teilen</span>
          </button>
          <button
            type="button"
            onClick={onCloseShare}
            aria-label="Menü schließen"
            className="vp-muted flex h-8 w-8 items-center justify-center rounded-lg"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Tages-Kopfzeile */}
      <div
        className="mb-3 flex items-baseline justify-between gap-2 border-b pb-2"
        style={{ borderColor: "var(--vp-border)" }}
      >
        <div>
          <h2 className="text-base font-extrabold">
            {wdFull}, {formatDmy(day.date)}
          </h2>
          {day.zeitstempel && (
            <p className="vp-muted text-[11px]">Stand: {day.zeitstempel}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {changesCount > 0 && (
            <span className="vp-badge-accent rounded-full px-2 py-0.5 text-[11px] font-semibold">
              {changesCount} {changesCount === 1 ? "Änderung" : "Änderungen"}
            </span>
          )}
        </div>
      </div>

      {/* Zusatzinfos des Tages (auf Mobile direkt im Tag sichtbar) */}
      {day.zusatzInfo.length > 0 && (
        <div
          className="mb-3 flex items-start gap-2 rounded-xl border p-2.5 text-xs md:hidden"
          style={{ borderColor: "var(--vp-border)" }}
        >
          <Info size={15} className="mt-0.5 shrink-0" style={{ color: "var(--vp-primary)" }} />
          <div>{day.zusatzInfo.join(" · ")}</div>
        </div>
      )}

      {/* Stundenliste */}
      {!day.available ? (
        <div className="vp-muted flex flex-1 flex-col items-center justify-center gap-1.5 py-8 text-center text-xs">
          <CalendarOff size={22} />
          <span>Für {prettyDate(day.date)} liegt noch kein Plan vor.</span>
        </div>
      ) : lessons.length === 0 ? (
        <div className="vp-muted flex flex-1 flex-col items-center justify-center gap-1.5 py-8 text-center text-xs">
          <CalendarOff size={22} />
          <span>Kein Unterricht (oder alle Kurse ausgeblendet).</span>
        </div>
      ) : (
        <div className="space-y-2">
          {lessons.map((l, idx) => (
            <LessonRow key={`${l.st}-${l.nr}-${idx}`} l={l} />
          ))}
        </div>
      )}
    </section>
  );
}
