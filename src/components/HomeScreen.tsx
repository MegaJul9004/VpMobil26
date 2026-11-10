"use client";
import { ArrowRight, Edit3, Plus, Settings as SettingsIcon, Star, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Settings } from "@/lib/settings";
import { Modal } from "./ui";

export function HomeScreen({
  settings,
  update,
  availableClasses,
  onOpenSettings,
  onOpenPlan,
}: {
  settings: Settings;
  update: (p: Partial<Settings> | ((prev: Settings) => Partial<Settings>)) => void;
  availableClasses: string[];
  onOpenSettings: () => void;
  onOpenPlan: (className: string) => void;
}) {
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [customInput, setCustomInput] = useState("");

  // Zeige exakt settings.favoriteCount Favoriten-Slots (1..10, Standard: 3)
  const visibleSlots = useMemo(
    () => settings.favoriteSlots.slice(0, settings.favoriteCount),
    [settings.favoriteSlots, settings.favoriteCount]
  );

  useEffect(() => {
    if (editingSlot != null) {
      setSearch("");
      setCustomInput(settings.favoriteSlots[editingSlot] ?? "");
    }
  }, [editingSlot, settings.favoriteSlots]);

  const filteredClasses = useMemo(
    () =>
      availableClasses.filter((c) =>
        c.toLowerCase().includes(search.trim().toLowerCase())
      ),
    [availableClasses, search]
  );

  const assignSlot = (slotIndex: number, className: string) => {
    const clean = className.trim();
    update((prev) => {
      const next = [...prev.favoriteSlots];
      next[slotIndex] = clean;
      return { favoriteSlots: next };
    });
    setEditingSlot(null);
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col">
      {/* Header mit Einstellungs-Button */}
      <header className="vp-surface sticky top-0 z-20 flex items-center justify-between border-b px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur md:px-6">
        <div className="flex items-center gap-2.5">
          <div className="vp-btn-primary grid h-9 w-9 place-items-center rounded-xl text-sm font-black shadow-sm md:hidden">
            Vp
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight md:text-xl">Deine Favoriten</h1>
            <p className="vp-muted text-xs">Wähle eine Klasse, um den Stundenplan zu öffnen</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Einstellungen"
          className="vp-surface flex h-11 w-11 items-center justify-center rounded-full border transition hover:opacity-80"
        >
          <SettingsIcon size={20} />
        </button>
      </header>

      {/* Grid-/Listenansicht der Favoriten-Slots */}
      <main className="flex-1 p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:p-6 md:pb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide opacity-75">
            Favoriten ({visibleSlots.filter(Boolean).length} / {settings.favoriteCount} belegt)
          </h2>
        </div>

        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3"
          data-testid="favorites-grid"
        >
          {visibleSlots.map((className, idx) => {
            const filled = className.trim().length > 0;
            return (
              <div
                key={idx}
                data-testid={`favorite-slot-${idx}`}
                className={`vp-surface group relative flex min-h-[6.5rem] flex-col justify-between rounded-2xl border p-4 shadow-sm transition ${
                  filled ? "hover:shadow-md" : "border-dashed opacity-90"
                }`}
              >
                {filled ? (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenPlan(className)}
                        className="flex flex-1 flex-col items-start text-left"
                      >
                        <span className="vp-muted flex items-center gap-1 text-xs font-medium">
                          <Star size={12} style={{ color: "var(--vp-primary)" }} /> Favorit {idx + 1}
                        </span>
                        <span className="mt-1 text-2xl font-extrabold tracking-tight">
                          Klasse {className}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSlot(idx)}
                        aria-label={`Favorit ${idx + 1} (${className}) ändern`}
                        className="vp-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:opacity-80"
                      >
                        <Edit3 size={16} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenPlan(className)}
                      className="mt-3 flex w-full items-center justify-between text-xs font-semibold"
                      style={{ color: "var(--vp-primary)" }}
                    >
                      <span>Stundenplan öffnen</span>
                      <ArrowRight size={15} />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingSlot(idx)}
                    className="flex h-full w-full flex-col items-center justify-center gap-1.5 py-2 text-center"
                  >
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-full border"
                      style={{ borderColor: "var(--vp-border)", color: "var(--vp-primary)" }}
                    >
                      <Plus size={20} />
                    </span>
                    <span className="text-sm font-semibold">Favorit {idx + 1} festlegen</span>
                    <span className="vp-muted text-xs">Klasse auswählen</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Modal zur Auswahl / Konfiguration eines Favoriten-Slots */}
      <Modal
        open={editingSlot != null}
        onClose={() => setEditingSlot(null)}
        title={editingSlot != null ? `Favorit ${editingSlot + 1} konfigurieren` : "Favorit"}
      >
        {editingSlot != null && (
          <div className="space-y-4">
            {/* Direkteingabe oder Suche */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (customInput.trim()) assignSlot(editingSlot, customInput);
              }}
              className="flex gap-2"
            >
              <input
                value={customInput}
                onChange={(e) => {
                  setCustomInput(e.target.value);
                  setSearch(e.target.value);
                }}
                placeholder="Klasse suchen oder eingeben (z. B. 8A, 10C)…"
                aria-label="Klasse suchen oder eingeben"
                className="vp-surface h-11 flex-1 rounded-xl border px-3 text-sm outline-none"
              />
              <button
                type="submit"
                disabled={!customInput.trim()}
                className="vp-btn-primary h-11 rounded-xl px-4 text-sm font-semibold disabled:opacity-40"
              >
                Übernehmen
              </button>
            </form>

            {settings.favoriteSlots[editingSlot] && (
              <button
                type="button"
                onClick={() => assignSlot(editingSlot, "")}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-xs font-semibold"
                style={{ borderColor: "var(--vp-accent)", color: "var(--vp-accent)" }}
              >
                <Trash2 size={14} /> Favoriten-Slot leeren
              </button>
            )}

            <div>
              <p className="vp-muted mb-2 text-xs font-medium">
                {filteredClasses.length > 0
                  ? "Verfügbare Klassen der Schule:"
                  : "Keine Klassenliste geladen – nutze das Eingabefeld oben."}
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {filteredClasses.map((c) => {
                  const active = settings.favoriteSlots[editingSlot] === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => assignSlot(editingSlot, c)}
                      className={`vp-surface h-11 rounded-xl border text-sm font-bold transition ${
                        active ? "ring-2" : "hover:opacity-85"
                      }`}
                      style={active ? { borderColor: "var(--vp-primary)" } : undefined}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
