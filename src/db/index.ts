import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "vpmobil.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("busy_timeout = 5000");

export const db = drizzle(sqlite, { schema });

let migrated = false;
/** Wendet ausstehende Migrationen an (idempotent). */
export function ensureMigrated() {
  if (migrated) return;
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  migrated = true;
}
export { schema };
