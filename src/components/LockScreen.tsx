"use client";
import { Eye, EyeOff, Lock, LogIn } from "lucide-react";
import { useState } from "react";

export function LockScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Falsches Passwort.");
        return;
      }
      onUnlocked();
    } catch {
      setError("Verbindungsfehler. Bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh w-full items-center justify-center p-4">
      <div className="vp-surface w-full max-w-sm rounded-3xl border p-6 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="vp-btn-primary mb-3 flex h-14 w-14 items-center justify-center rounded-2xl shadow-md">
            <Lock size={26} />
          </div>
          <h1 className="text-xl font-extrabold">VpMobil24 geschützt</h1>
          <p className="vp-muted mt-1 text-xs">
            Bitte gib das Zugangs-Passwort ein, um die Web-App zu öffnen.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              inputMode="numeric"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              placeholder="Passwort eingeben…"
              aria-label="App-Passwort"
              data-testid="app-password-input"
              className="vp-surface h-12 w-full rounded-xl border px-4 pr-12 text-center text-lg font-bold tracking-widest outline-none focus:ring-2"
              style={{ borderColor: error ? "var(--vp-accent)" : "var(--vp-border)" }}
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              aria-label={showPw ? "Passwort verbergen" : "Passwort anzeigen"}
              className="vp-muted absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-lg"
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <p
              role="alert"
              data-testid="app-password-error"
              className="text-center text-xs font-semibold"
              style={{ color: "var(--vp-accent)" }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!password.trim() || busy}
            data-testid="app-password-submit"
            className="vp-btn-primary flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold shadow-sm transition hover:opacity-95 disabled:opacity-40"
          >
            <LogIn size={18} />
            <span>{busy ? "Prüfe…" : "Entsperren"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
