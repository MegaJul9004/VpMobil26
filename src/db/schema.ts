import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    schoolNumber: text("school_number").notNull(),
    className: text("class_name").notNull(),
    /** JSON-Array der abonnierten Kurse/Fächer (leer = alle) */
    courses: text("courses", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    uniqueIndex("subscriptions_endpoint_uq").on(t.endpoint),
    index("subscriptions_class_idx").on(t.schoolNumber, t.className),
  ]
);

export type PlanSnapshotData = unknown;

export const planSnapshots = sqliteTable(
  "plan_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    schoolNumber: text("school_number").notNull(),
    /** YYYYMMDD */
    date: text("date").notNull(),
    className: text("class_name").notNull(),
    /** normalisierter Tagesplan als JSON */
    data: text("data", { mode: "json" }).$type<PlanSnapshotData>().notNull(),
    /** <zeitstempel> aus dem XML-Kopf */
    zeitstempel: text("zeitstempel"),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [uniqueIndex("plan_snapshots_uq").on(t.schoolNumber, t.date, t.className)]
);

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type PlanSnapshot = typeof planSnapshots.$inferSelect;
