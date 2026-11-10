import "dotenv/config";
import { ensureMigrated } from "../src/db";

ensureMigrated();
console.log("Migrationen angewendet.");
