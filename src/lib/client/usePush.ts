"use client";
import { useCallback, useEffect, useState } from "react";

function urlBase64ToUint8Array(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export interface PushState {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
  busy: boolean;
  message: string;
  needsInstall: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  test: () => Promise<void>;
}

/** Verwaltung des Web-Push-Abos für die aktuelle Klasse und Kursauswahl. */
export function usePush(className: string, courses: string[]): PushState {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<PushState["permission"]>("unsupported");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [needsInstall, setNeedsInstall] = useState(false);

  const getReg = () => navigator.serviceWorker.ready;

  useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    setNeedsInstall(ios && !standalone);
    setSupported(ok);
    if (!ok) return;
    setPermission(Notification.permission);
    navigator.serviceWorker.register("/sw.js").catch(() => {});
    getReg()
      .then((r) => r.pushManager.getSubscription())
      .then((s) => setSubscribed(!!s))
      .catch(() => {});
  }, []);

  // Klasse/Kurse im Abo aktuell halten
  const coursesKey = JSON.stringify(courses);
  useEffect(() => {
    if (!subscribed) return;
    getReg()
      .then((r) => r.pushManager.getSubscription())
      .then((s) => {
        if (!s) return;
        return fetch("/api/subscribe", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: s.endpoint, className, courses: JSON.parse(coursesKey) }),
        });
      })
      .catch(() => {});
  }, [className, coursesKey, subscribed]);

  const enable = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") throw new Error("Benachrichtigungen wurden nicht erlaubt.");
      const { publicKey } = await (await fetch("/api/vapid")).json();
      const reg = await getReg();
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), className, courses }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Speichern fehlgeschlagen");
      setSubscribed(true);
      setMessage(`Push für ${className} aktiv.`);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [className, courses]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const sub = await (await getReg()).pushManager.getSubscription();
      if (sub) {
        await fetch("/api/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setMessage("Push deaktiviert.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  const test = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const sub = await (await getReg()).pushManager.getSubscription();
      if (!sub) throw new Error("Bitte zuerst Push aktivieren.");
      const res = await fetch("/api/test-push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Fehler");
      setMessage(`Gesendet: ${j.body}`);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  return { supported, permission, subscribed, busy, message, needsInstall, enable, disable, test };
}
