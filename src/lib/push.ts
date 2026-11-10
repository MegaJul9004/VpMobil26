import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

let configured = false;
function setup() {
  if (configured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY fehlen in .env");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@example.com", pub, priv);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

/** Sendet an eine Subscription. Entfernt tote Abos (404/410). Gibt true bei Erfolg zurück. */
export async function sendPush(sub: typeof schema.subscriptions.$inferSelect, payload: PushPayload): Promise<boolean> {
  setup();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 3600 }
    );
    return true;
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) {
      db.delete(schema.subscriptions).where(eq(schema.subscriptions.id, sub.id)).run();
    } else {
      console.error("[push] Fehler", code, (e as Error).message);
    }
    return false;
  }
}
