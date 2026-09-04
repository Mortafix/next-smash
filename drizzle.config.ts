import "dotenv/config";

import { defineConfig } from "drizzle-kit";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const databaseUrl = resolve(
  process.cwd(),
  process.env.DATABASE_PATH ?? ".data/next-smash.sqlite",
);

mkdirSync(dirname(databaseUrl), { recursive: true });

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
