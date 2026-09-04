import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const tournaments = sqliteTable(
  "tournaments",
  {
    id: text("id").primaryKey(),
    source: text("source", { enum: ["fitp", "tpra"] }).notNull(),
    sourceId: text("source_id").notNull(),
    title: text("title").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    venueName: text("venue_name"),
    city: text("city"),
    province: text("province"),
    provinceCode: text("province_code"),
    region: text("region"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    locationPrecision: text("location_precision", {
      enum: ["municipality", "unknown"],
    })
      .notNull()
      .default("unknown"),
    gendersJson: text("genders_json").notNull().default("[]"),
    competitionTypesJson: text("competition_types_json").notNull().default("[]"),
    rankCategoriesJson: text("rank_categories_json").notNull().default("[]"),
    ageCategoriesJson: text("age_categories_json").notNull().default("[]"),
    tpraLevel: text("tpra_level"),
    registrationOnline: integer("registration_online", { mode: "boolean" })
      .notNull()
      .default(false),
    officialUrl: text("official_url").notNull(),
    sourceStatus: text("source_status"),
    rawJson: text("raw_json").notNull(),
    checksum: text("checksum").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    firstSeenAt: integer("first_seen_at", { mode: "timestamp_ms" }).notNull(),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
    syncedAt: integer("synced_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("tournaments_start_date_idx").on(table.startDate),
    index("tournaments_source_active_idx").on(table.source, table.active),
    index("tournaments_region_idx").on(table.region),
    index("tournaments_province_code_idx").on(table.provinceCode),
  ],
);

export const syncRuns = sqliteTable(
  "sync_runs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    source: text("source", { enum: ["fitp", "tpra", "all"] }).notNull(),
    status: text("status", { enum: ["running", "success", "failed"] })
      .notNull()
      .default("running"),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    recordsSeen: integer("records_seen").notNull().default(0),
    recordsStored: integer("records_stored").notNull().default(0),
    errorMessage: text("error_message"),
  },
  (table) => [index("sync_runs_completed_at_idx").on(table.completedAt)],
);

export const pageViews = sqliteTable(
  "page_views",
  {
    day: text("day").notNull(),
    path: text("path").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.day, table.path] }),
    index("page_views_day_idx").on(table.day),
  ],
);

export type TournamentRow = typeof tournaments.$inferSelect;
export type NewTournamentRow = typeof tournaments.$inferInsert;
