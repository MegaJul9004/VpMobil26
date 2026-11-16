"use client";
import { Share2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WeekResponse } from "@/app/api/week/route";
import { formatDmy, parseYmd, weekdayShort } from "@/lib/plan/dates";
import type { Lesson } from "@/lib/plan/types";
import type { Settings } from "@/lib/settings";
import { CancelledTileOverlay, Room, Subject, Teacher, isChanged, normalBox, resolveLessonStyling } from "./ui";
import { getSubjectDisplayName } from "@/lib/themes";

export const ZOOM_STORAGE_KEY = "vp:weekZoomPan";

export interface ZoomPanState {
  scale: number;
  x: number;
  y: number;
}

const DEFAULT_TIMES: Record<number, { beginn: string; ende: string }> = {
  1: { beginn: "07:45", ende: "08:30" },
  2: { beginn: "08:30", ende: "09:15" },
  3: { beginn: "09:35", ende: "10:20" },
  4: { beginn: "10:20", ende: "11:05" },
  5: { beginn: "11:35", ende: "12:20" },
  6: { beginn: "12:20", ende: "13:05" },
  7: { beginn: "13:45", ende: "14:30" },
  8: { beginn: "14:30", ende: "15:15" },
  9: { beginn: "15:20", ende: "16:05" },
  10: { beginn: "16:05", ende: "16:50" },
};

const MIN_SCALE = 1.0;
const MAX_SCALE = 3.0;
const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(s.toFixed(3))));

/**
 * Begrenzt die Verschiebung (x, y) so, dass der Plan niemals kleiner als das Display wird
 * und beim Scrollen/Zoomen exakt innerhalb der Plan-Grenzen bleibt (Ecken bündig).
 */
export function clampZoomPan(
  rawScale: number,
  rawX: number,
  rawY: number,
  viewportW = 0,
  viewportH = 0,
  planeW = viewportW,
  planeH = viewportH
): ZoomPanState {
  const scale = clampScale(rawScale);
  const scaledW = planeW * scale;
  const scaledH = planeH * scale;
  const minX = viewportW > 0 ? Math.min(0, viewportW - scaledW) : rawScale <= 1.001 ? 0 : -Infinity;
  const minY = viewportH > 0 ? Math.min(0, viewportH - scaledH) : rawScale <= 1.001 ? 0 : -Infinity;
  const x = Math.min(0, Math.max(minX, rawX));
  const y = Math.min(0, Math.max(minY, rawY));
  return {
    scale: scale <= 1.001 ? 1 : scale,
    x: Object.is(x, -0) ? 0 : Math.round(x * 10) / 10,
    y: Object.is(y, -0) ? 0 : Math.round(y * 10) / 10,
  };
}

export function loadSavedZoomPan(remember: boolean): ZoomPanState {
  if (!remember || typeof window === "undefined") {
    return { scale: 1, x: 0, y: 0 };
  }
  try {
    const raw = localStorage.getItem(ZOOM_STORAGE_KEY);
    if (!raw) return { scale: 1, x: 0, y: 0 };
    const p = JSON.parse(raw) as Partial<ZoomPanState>;
    const scale = Number.isFinite(p.scale) ? clampScale(Number(p.scale)) : 1;
    const x = Number.isFinite(p.x) ? Number(p.x) : 0;
    const y = Number.isFinite(p.y) ? Number(p.y) : 0;
    return clampZoomPan(scale, x, y);
  } catch {
    return { scale: 1, x: 0, y: 0 };
  }
}

export function WeekCanvas({
  days,
  visibleLessons,
  rememberZoomPosition,
  settings,
  shareMenuDate,
  onOpenShare,
  onCloseShare,
  onShareDay,
  onSelectDay,
}: {
  days: WeekResponse["days"];
  visibleLessons: (lessons: Lesson[]) => Lesson[];
  rememberZoomPosition: boolean;
  settings?: Settings;
  shareMenuDate: string | null;
  onOpenShare: (date: string) => void;
  onCloseShare: () => void;
  onShareDay: (day: WeekResponse["days"][number]) => void;
  onSelectDay?: (date: string) => void;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const planeRef = useRef<HTMLDivElement | null>(null);
  const [zp, setZp] = useState<ZoomPanState>(() => loadSavedZoomPan(rememberZoomPosition));
  const [dragging, setDragging] = useState(false);

  const clampWithDom = useCallback((scale: number, x: number, y: number): ZoomPanState => {
    const vp = viewportRef.current;
    const pl = planeRef.current;
    const vw = vp?.clientWidth ?? 0;
    const vh = vp?.clientHeight ?? 0;
    const pw = pl?.offsetWidth ?? vw;
    const ph = pl?.offsetHeight ?? vh;
    return clampZoomPan(scale, x, y, vw, vh, pw, ph);
  }, []);

  // Wenn die Einstellung "Zoom- und Position merken" umgeschaltet wird:
  useEffect(() => {
    if (!rememberZoomPosition) {
      setZp({ scale: 1, x: 0, y: 0 });
      try {
        localStorage.removeItem(ZOOM_STORAGE_KEY);
      } catch {}
    } else {
      setZp(loadSavedZoomPan(true));
    }
  }, [rememberZoomPosition]);

  // Persistiere Zoom & Pan in localStorage
  useEffect(() => {
    if (!rememberZoomPosition || typeof window === "undefined") return;
    try {
      localStorage.setItem(ZOOM_STORAGE_KEY, JSON.stringify(zp));
    } catch {}
  }, [zp, rememberZoomPosition]);

  // Stunden-Bereich (mindestens 1..6, bis max(10, höchste Stunde))
  const perDayLessons = useMemo(
    () => days.map((d) => visibleLessons(d.lessons)),
    [days, visibleLessons]
  );

  const periods = useMemo(() => {
    const maxFound = Math.max(6, ...perDayLessons.flat().map((l) => l.st));
    const count = Math.min(10, Math.max(6, maxFound));
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [perDayLessons]);

  const timeForPeriod = useCallback(
    (st: number) => {
      const found = perDayLessons.flat().find((l) => l.st === st && l.beginn);
      if (found) return { beginn: found.beginn, ende: found.ende };
      return DEFAULT_TIMES[st] ?? { beginn: "", ende: "" };
    },
    [perDayLessons]
  );

  // Desktop: Mausrad scrollt vertikal/horizontal; Strg/Pinch-Mausrad zoomt zum Cursor
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const delta = -e.deltaY * 0.002;
        setZp((prev) => {
          const nextScale = clampScale(prev.scale * (1 + delta));
          const ratio = nextScale / prev.scale;
          const nx = cx - (cx - prev.x) * ratio;
          const ny = cy - (cy - prev.y) * ratio;
          return clampWithDom(nextScale, nx, ny);
        });
      } else {
        const dx = -(e.deltaX || (e.shiftKey ? e.deltaY : 0));
        const dy = e.shiftKey && !e.deltaX ? 0 : -e.deltaY;
        setZp((prev) => clampWithDom(prev.scale, prev.x + dx, prev.y + dy));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [clampWithDom]);

  // Multi-Pointer Tracking: 1 Finger / Maus-Drag = Scrollen/Panning, 2 Finger = Pinch-to-Zoom
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPan = useRef<{ x: number; y: number } | null>(null);
  const lastPinchDist = useRef<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const downOrigin = useRef<{ x: number; y: number; date: string | null }>({ x: 0, y: 0, date: null });

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const getDistance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  const getMidpoint = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1) {
      lastPan.current = { x: e.clientX, y: e.clientY };
      lastPinchDist.current = null;
      setDragging(true);

      const dayEl = (e.target as HTMLElement).closest("[data-day-col]") as HTMLElement | null;
      const date = dayEl?.getAttribute("data-day-col") ?? null;
      downOrigin.current = { x: e.clientX, y: e.clientY, date };
      clearLongPress();
      if (date) {
        longPressTimer.current = setTimeout(() => {
          onOpenShare(date);
        }, 500);
      }
    } else if (pointers.current.size === 2) {
      clearLongPress();
      const [p1, p2] = [...pointers.current.values()];
      lastPinchDist.current = getDistance(p1, p2);
      lastPan.current = getMidpoint(p1, p2);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (
      Math.hypot(e.clientX - downOrigin.current.x, e.clientY - downOrigin.current.y) > 10
    ) {
      clearLongPress();
    }

    if (pointers.current.size === 1 && lastPan.current) {
      const dx = e.clientX - lastPan.current.x;
      const dy = e.clientY - lastPan.current.y;
      lastPan.current = { x: e.clientX, y: e.clientY };
      setZp((prev) => clampWithDom(prev.scale, prev.x + dx, prev.y + dy));
    } else if (pointers.current.size === 2) {
      const [p1, p2] = [...pointers.current.values()];
      const dist = getDistance(p1, p2);
      const mid = getMidpoint(p1, p2);
      const rect = viewportRef.current?.getBoundingClientRect();
      const cx = rect ? mid.x - rect.left : mid.x;
      const cy = rect ? mid.y - rect.top : mid.y;

      const prevDist = lastPinchDist.current ?? dist;
      const prevMid = lastPan.current ?? mid;
      const scaleFactor = prevDist > 0 ? dist / prevDist : 1;
      const dx = mid.x - prevMid.x;
      const dy = mid.y - prevMid.y;

      lastPinchDist.current = dist;
      lastPan.current = mid;

      setZp((prev) => {
        const nextScale = clampScale(prev.scale * scaleFactor);
        const ratio = nextScale / prev.scale;
        const nx = cx - (cx - prev.x) * ratio + dx;
        const ny = cy - (cy - prev.y) * ratio + dy;
        return clampWithDom(nextScale, nx, ny);
      });
    }
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent) => {
    clearLongPress();
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 1) {
      const [remaining] = [...pointers.current.values()];
      lastPan.current = { x: remaining.x, y: remaining.y };
      lastPinchDist.current = null;
    } else if (pointers.current.size === 0) {
      lastPan.current = null;
      lastPinchDist.current = null;
      setDragging(false);
    }
  };

  useEffect(() => clearLongPress, []);

  return (
    <div
      ref={viewportRef}
      data-testid="week-canvas-viewport"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
      className={`vp-surface relative h-[calc(100dvh-13.5rem)] w-full overflow-hidden rounded-2xl border shadow-sm touch-none select-none ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
    >
      {/* Transformiertes Wochenraster-Canvas */}
      <div
        ref={planeRef}
        data-testid="week-canvas-plane"
        style={{
          transform: `translate3d(${zp.x}px, ${zp.y}px, 0) scale(${zp.scale})`,
          transformOrigin: "0 0",
        }}
        className="w-full"
      >
        {/* Strenges 5-Tage-Wochenraster (Mo–Fr nebeneinander + linke Stundenspalte) */}
        <div
          data-testid="week-strict-grid"
          className="grid w-full grid-cols-[2.6rem_repeat(5,minmax(0,1fr))] md:grid-cols-[4.25rem_repeat(5,minmax(0,1fr))]"
        >
          {/* Linke obere Ecke (Stunden-Spaltenkopf) */}
          <div
            className="sticky left-0 z-20 flex items-center justify-center border-b border-r p-1.5 text-[10px] font-bold uppercase tracking-wider md:text-xs"
            style={{ backgroundColor: "var(--vp-surface)", borderColor: "var(--vp-border)" }}
          >
            Std.
          </div>

          {/* 5 Wochentags-Kopfzellen (Montag bis Freitag ausnahmslos nebeneinander) */}
          {days.map((d) => {
            const wd = weekdayShort(d.date);
            const dayNum = parseYmd(d.date).getDate();
            const monthNum = parseYmd(d.date).getMonth() + 1;
            const changes = visibleLessons(d.lessons).filter(isChanged).length;
            const shareOpen = shareMenuDate === d.date;

            return (
              <div
                key={d.date}
                data-day-col={d.date}
                data-testid={`week-col-header-${d.date}`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onOpenShare(d.date);
                }}
                onDoubleClick={() => onSelectDay?.(d.date)}
                className="relative flex flex-col items-center justify-center border-b border-r px-1 py-2 text-center last:border-r-0 md:py-2.5"
                style={{ backgroundColor: "var(--vp-surface)", borderColor: "var(--vp-border)" }}
              >
                <div className="flex items-center gap-1">
                  <span className="text-xs font-extrabold md:text-sm">{wd}</span>
                  <span className="vp-muted text-[10px] font-medium md:text-xs">
                    {String(dayNum).padStart(2, "0")}.{String(monthNum).padStart(2, "0")}.
                  </span>
                  {changes > 0 && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: "var(--vp-accent)" }}
                      title={`${changes} Änderung(en)`}
                    />
                  )}
                </div>

                {/* Teilen-Tooltip bei Long-Press / Rechtsklick */}
                {shareOpen && (
                  <div
                    role="menu"
                    onPointerDown={(e) => e.stopPropagation()}
                    className="vp-surface absolute left-1/2 top-full z-30 mt-1 flex -translate-x-1/2 items-center gap-1.5 rounded-xl border p-1.5 shadow-2xl ring-2"
                    style={{ borderColor: "var(--vp-primary)" }}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => onShareDay(d)}
                      className="vp-btn-primary flex h-7 items-center gap-1 rounded-lg px-2.5 text-[11px] font-bold whitespace-nowrap"
                    >
                      <Share2 size={12} /> Teilen
                    </button>
                    <button
                      type="button"
                      onClick={onCloseShare}
                      aria-label="Menü schließen"
                      className="vp-muted flex h-7 w-7 items-center justify-center rounded-lg"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Zeilen für 1. bis 10. Unterrichtsstunde */}
          {periods.map((st) => {
            const t = timeForPeriod(st);
            return (
              <PeriodRow
                key={st}
                st={st}
                beginn={t.beginn}
                ende={t.ende}
                days={days}
                cells={perDayLessons.map((ls) => ls.filter((l) => l.st === st))}
                settings={settings}
                onOpenShare={onOpenShare}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PeriodRow({
  st,
  beginn,
  ende,
  days,
  cells,
  settings,
  onOpenShare,
}: {
  st: number;
  beginn: string;
  ende: string;
  days: WeekResponse["days"];
  cells: Lesson[][];
  settings?: Settings;
  onOpenShare: (date: string) => void;
}) {
  return (
    <>
      {/* Fixierte linke Stundenspalte */}
      <div
        className="sticky left-0 z-10 flex flex-col items-center justify-center border-b border-r px-0.5 py-1.5 text-center"
        style={{ backgroundColor: "var(--vp-surface)", borderColor: "var(--vp-border)" }}
      >
        <span className="text-xs font-extrabold leading-none md:text-sm">{st}.</span>
        {beginn && (
          <span className="vp-muted mt-0.5 text-[8px] leading-tight md:text-[10px]">
            {beginn}
            {ende ? (
              <>
                <br />
                {ende}
              </>
            ) : null}
          </span>
        )}
      </div>

      {/* 5 Tagesspalten für diese Unterrichtsstunde */}
      {cells.map((ls, idx) => {
        const day = days[idx];
        return (
          <div
            key={day.date}
            data-day-col={day.date}
            onContextMenu={(e) => {
              e.preventDefault();
              onOpenShare(day.date);
            }}
            className="min-h-[3.4rem] min-w-0 border-b border-r p-0.5 last:border-r-0 md:min-h-[4.6rem] md:p-1.5"
            style={{ borderColor: "var(--vp-border)" }}
          >
            {ls.length > 0 && (
              <div className="flex h-full flex-col gap-1">
                {ls.map((l, k) => (
                  <GridLessonCell key={`${l.nr}-${k}`} l={l} date={day.date} settings={settings} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function GridLessonCell({
  l,
  date,
  settings,
}: {
  l: Lesson;
  date: string;
  settings?: Settings;
}) {
  const { cardStyle, subjectStyle } = resolveLessonStyling(l, settings);
  const fullName = getSubjectDisplayName(
    l.origFa || (l.fa && l.fa !== "---" ? l.fa : ""),
    settings?.showFullSubjectNames !== false,
    settings?.subjectFullNames
  );
  const tooltipParts = [
    `${formatDmy(date)} · ${l.st}. Std (${l.beginn}–${l.ende})`,
    l.cancelled
      ? `${fullName || "Unterricht"} entfällt`
      : `Fach: ${getSubjectDisplayName(l.fa || l.origFa, settings?.showFullSubjectNames !== false, settings?.subjectFullNames)}`,
    l.le ? `Lehrkraft: ${l.le}${l.leChanged && l.origLe && l.origLe !== l.le ? ` (statt ${l.origLe})` : ""}` : "",
    l.ra ? `Raum: ${l.ra}` : "",
    l.info ? `Info: ${l.info}` : "",
  ].filter(Boolean);

  return (
    <div
      title={tooltipParts.join("\n")}
      style={cardStyle}
      className={`relative flex h-full min-w-0 flex-1 flex-col justify-between overflow-hidden rounded-lg border px-1 py-1 text-left leading-tight transition md:rounded-xl md:px-2 md:py-1.5 ${normalBox}`}
    >
      {l.cancelled && <CancelledTileOverlay />}
      <div className="flex flex-wrap items-center justify-between gap-0.5">
        <span className="truncate text-[10px] font-extrabold sm:text-xs md:text-sm">
          <Subject l={l} style={subjectStyle} settings={settings} />
        </span>
      </div>

      <div className="vp-muted mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[9px] sm:text-[10px] md:text-xs">
        <Teacher l={l} />
        <Room l={l} />
      </div>

      {l.info && (
        <p
          className="mt-0.5 line-clamp-2 text-[8px] font-medium leading-snug sm:text-[10px] md:line-clamp-none md:text-xs"
          style={{ color: "var(--vp-accent)" }}
        >
          {l.info}
        </p>
      )}
    </div>
  );
}
