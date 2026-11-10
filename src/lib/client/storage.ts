"use client";
import { useCallback, useEffect, useState } from "react";

/** localStorage-State, hydration-sicher (Default zuerst, Wert nach dem Mount). */
export function useLocalStorage<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`vp:${key}`);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {}
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (v: T | ((p: T) => T)) => {
      setValue((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
        try {
          localStorage.setItem(`vp:${key}`, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [key]
  );
  return [value, set, ready];
}
