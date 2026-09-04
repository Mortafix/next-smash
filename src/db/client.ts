import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import * as schema from "./schema";

const defaultDatabasePath = ".data/next-smash.sqlite";

function databasePath() {
  return resolve(process.cwd(), process.env.DATABASE_PATH ?? defaultDatabasePath);
}

function createDatabase() {
  const path = databasePath();
  mkdirSync(dirname(path), { recursive: true });

  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  return drizzle(sqlite, { schema });
}

type NextSmashDatabase = ReturnType<typeof createDatabase>;

const globalDatabase = globalThis as typeof globalThis & {
  nextSmashDatabase?: NextSmashDatabase;
};

export function getDatabase() {
  const database = globalDatabase.nextSmashDatabase ?? createDatabase();
  globalDatabase.nextSmashDatabase = database;

  return database;
}
