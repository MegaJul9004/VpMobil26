import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema, ensureMigrated } from "@/db";

export const dynamic = "force-dynamic";

const school = () => process.env.SCHOOL_NUMBER ?? "";

interface Body {
  subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  endpoint?: string;
  className?: string;
  courses?: string[];
}

const cleanCourses = (c: unknown): string[] =>
  Array.isArray(c) ? c.filter((x): x is string => typeof x === "string").slice(0, 100) : [];

/** GET ?endpoint=… – Status des Abos */
export async function GET(req: NextRequest) {
  ensureMigrated();
  const endpoint = req.nextUrl.searchParams.get("endpoint");
  if (!endpoint) return NextResponse.json({ subscribed: false });
  const sub = db.select().from(schema.subscriptions).where(eq(schema.subscriptions.endpoint, endpoint)).get();
  return NextResponse.json({ subscribed: !!sub, className: sub?.className, courses: sub?.courses ?? [] });
}

/** POST – Abo anlegen/aktualisieren (Upsert über Endpoint) */
export async function POST(req: NextRequest) {
  ensureMigrated();
  const b = (await req.json().catch(() => ({}))) as Body;
  const s = b.subscription;
  if (!s?.endpoint || !s.keys?.p256dh || !s.keys.auth || !b.className) {
    return NextResponse.json({ error: "Ungültige Subscription oder Klasse fehlt" }, { status: 400 });
  }
  const values = {
    endpoint: s.endpoint,
    p256dh: s.keys.p256dh,
    auth: s.keys.auth,
    schoolNumber: school(),
    className: b.className,
    courses: cleanCourses(b.courses),
    active: true,
  };
  db.insert(schema.subscriptions)
    .values(values)
    .onConflictDoUpdate({ target: schema.subscriptions.endpoint, set: values })
    .run();
  return NextResponse.json({ ok: true });
}

/** PATCH – Klasse/Kurse eines bestehenden Abos ändern */
export async function PATCH(req: NextRequest) {
  ensureMigrated();
  const b = (await req.json().catch(() => ({}))) as Body;
  if (!b.endpoint) return NextResponse.json({ error: "endpoint fehlt" }, { status: 400 });
  const set: Partial<typeof schema.subscriptions.$inferInsert> = {};
  if (b.className) set.className = b.className;
  if (b.courses) set.courses = cleanCourses(b.courses);
  db.update(schema.subscriptions).set(set).where(eq(schema.subscriptions.endpoint, b.endpoint)).run();
  return NextResponse.json({ ok: true });
}

/** DELETE – Abo entfernen */
export async function DELETE(req: NextRequest) {
  ensureMigrated();
  const b = (await req.json().catch(() => ({}))) as Body;
  if (!b.endpoint) return NextResponse.json({ error: "endpoint fehlt" }, { status: 400 });
  db.delete(schema.subscriptions).where(eq(schema.subscriptions.endpoint, b.endpoint)).run();
  return NextResponse.json({ ok: true });
}
