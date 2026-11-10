import { NextRequest, NextResponse } from "next/server";
import { fetchBaseClasses, fetchWeek, type SchoolCredentials } from "@/lib/plan/fetch";
import { addDays, defaultStartDate } from "@/lib/plan/dates";
import type { CourseInfo, Lesson } from "@/lib/plan/types";

export const dynamic = "force-dynamic";

export interface WeekResponse {
  monday: string;
  friday: string;
  kw: number;
  weekType: "A" | "B";
  classes: string[];
  className: string;
  courses: CourseInfo[];
  days: {
    date: string;
    available: boolean;
    datumPlan?: string;
    zeitstempel?: string;
    zusatzInfo: string[];
    lessons: Lesson[];
  }[];
}

function readCreds(req: NextRequest): SchoolCredentials {
  return {
    schoolNumber: req.headers.get("x-school-number") ?? undefined,
    username: req.headers.get("x-school-user") ?? undefined,
    password: req.headers.get("x-school-password") ?? undefined,
  };
}

/** GET /api/week?date=YYYYMMDD&class=9F – Wochen-Aggregat für eine Klasse. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const date = /^\d{8}$/.test(q.get("date") ?? "") ? q.get("date")! : defaultStartDate();
  const className = q.get("class") ?? "";
  const creds = readCreds(req);
  try {
    const week = await fetchWeek(date, { fresh: q.get("fresh") === "1", creds });
    const first = week.days.find((d) => d.plan)?.plan;
    let classes = first?.classes ?? [];
    if (!classes.length) {
      classes = await fetchBaseClasses(creds);
    }
    const courseMap = new Map<string, CourseInfo>();
    const days = week.days.map(({ date, plan }) => {
      const c = className ? plan?.plans[className] : undefined;
      c?.courses.forEach((k) => courseMap.set(k.key, k));
      return {
        date,
        available: !!plan,
        datumPlan: plan?.datumPlan,
        zeitstempel: plan?.zeitstempel,
        zusatzInfo: plan?.zusatzInfo ?? [],
        lessons: c?.lessons ?? [],
      };
    });
    const body: WeekResponse = {
      monday: week.monday,
      friday: addDays(week.monday, 4),
      kw: week.kw,
      weekType: week.weekType,
      classes,
      className,
      courses: [...courseMap.values()].sort((a, b) => a.key.localeCompare(b.key, "de")),
      days,
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
