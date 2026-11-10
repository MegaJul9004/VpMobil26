"use client";
import { AlertTriangle, X } from "lucide-react";
import { useEffect } from "react";
import type { Lesson } from "@/lib/plan/types";

export const isChanged = (l: Lesson) =>
  l.cancelled || l.faChanged || l.leChanged || l.raChanged || !!l.info;

const Old = ({ children }: { children: React.ReactNode }) => (
  <s className="mr-1 opacity-60" style={{ textDecorationColor: "var(--vp-accent)" }}>
    {children}
  </s>
);

/** Fach mit durchgestrichenem altem Fach */
export function Subject({ l }: { l: Lesson }) {
  if (l.cancelled) {
    return (
      <>
        <Old>{l.origFa || "Unterricht"}</Old>
        <span style={{ color: "var(--vp-accent)" }}>Entfällt</span>
      </>
    );
  }
  const oldFa = l.faChanged && l.origFa && l.origFa !== l.fa ? l.origFa : "";
  return (
    <>
      {oldFa && <Old>{oldFa}</Old>}
      {l.fa || l.origFa}
    </>
  );
}

export function Teacher({ l }: { l: Lesson }) {
  if (l.cancelled) return null;
  const oldLe = l.leChanged && l.origLe && l.origLe !== l.le ? l.origLe : "";
  const cur = l.le || (l.leChanged ? "" : l.origLe);
  if (!oldLe && !cur) return null;
  return (
    <span
      className={l.leChanged ? "font-semibold" : ""}
      style={l.leChanged ? { color: "var(--vp-accent)" } : undefined}
    >
      {oldLe && <Old>{oldLe}</Old>}
      {cur || "—"}
    </span>
  );
}

export function Room({ l }: { l: Lesson }) {
  if (l.cancelled || !l.ra) return null;
  return (
    <span
      className={l.raChanged ? "font-semibold" : ""}
      style={l.raChanged ? { color: "var(--vp-accent)" } : undefined}
    >
      {l.ra}
    </span>
  );
}

export const changedBox = "vp-changed-box";
export const normalBox = "vp-surface";

export function WarnBadge({ cancelled }: { cancelled?: boolean }) {
  return (
    <span className="vp-badge-accent inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold">
      <AlertTriangle size={11} aria-hidden /> {cancelled ? "Entfall" : "Änderung"}
    </span>
  );
}

/** Zeile einer Unterrichtsstunde innerhalb einer Tageskarte */
export function LessonRow({ l }: { l: Lesson }) {
  const changed = isChanged(l);
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-2.5 transition ${
        changed ? changedBox : normalBox
      }`}
    >
      <div className="w-12 shrink-0 text-center">
        <div className="text-lg font-bold leading-none">{l.st}.</div>
        <div className="vp-muted mt-1 text-[10px] leading-tight">
          {l.beginn}
          <br />
          {l.ende}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold">
            <Subject l={l} />
          </span>
          {changed && <WarnBadge cancelled={l.cancelled} />}
        </div>
        <div className="vp-muted mt-0.5 flex flex-wrap gap-x-3 text-sm">
          <Teacher l={l} />
          <Room l={l} />
          {l.group && <span className="opacity-75">Kurs {l.group}</span>}
        </div>
        {l.info && (
          <p className="mt-1 text-sm font-medium" style={{ color: "var(--vp-accent)" }}>
            {l.info}
          </p>
        )}
      </div>
    </div>
  );
}

/** Modal / Sheet für Auswahl-Dialoge (z. B. Klasse wählen, Kurse filtern) */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="animate-fade absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="vp-surface animate-slide-up relative z-10 flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-3xl border p-4 shadow-2xl sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:opacity-80"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pb-safe">{children}</div>
      </div>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={checked ? { backgroundColor: "var(--vp-primary)" } : undefined}
      className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
        checked ? "" : "bg-slate-300 dark:bg-slate-700"
      }`}
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
          checked ? "left-7" : "left-1"
        }`}
      />
    </button>
  );
}
