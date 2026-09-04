CREATE TABLE `page_views` (
	`day` text NOT NULL,
	`path` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`day`, `path`)
);
--> statement-breakpoint
CREATE INDEX `page_views_day_idx` ON `page_views` (`day`);--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`records_seen` integer DEFAULT 0 NOT NULL,
	`records_stored` integer DEFAULT 0 NOT NULL,
	`error_message` text
);
--> statement-breakpoint
CREATE INDEX `sync_runs_completed_at_idx` ON `sync_runs` (`completed_at`);--> statement-breakpoint
CREATE TABLE `tournaments` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`source_id` text NOT NULL,
	`title` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`venue_name` text,
	`city` text,
	`province` text,
	`province_code` text,
	`region` text,
	`latitude` real,
	`longitude` real,
	`location_precision` text DEFAULT 'unknown' NOT NULL,
	`genders_json` text DEFAULT '[]' NOT NULL,
	`competition_types_json` text DEFAULT '[]' NOT NULL,
	`rank_categories_json` text DEFAULT '[]' NOT NULL,
	`age_categories_json` text DEFAULT '[]' NOT NULL,
	`tpra_level` text,
	`registration_online` integer DEFAULT false NOT NULL,
	`official_url` text NOT NULL,
	`source_status` text,
	`raw_json` text NOT NULL,
	`checksum` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`first_seen_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`synced_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `tournaments_start_date_idx` ON `tournaments` (`start_date`);--> statement-breakpoint
CREATE INDEX `tournaments_source_active_idx` ON `tournaments` (`source`,`active`);--> statement-breakpoint
CREATE INDEX `tournaments_region_idx` ON `tournaments` (`region`);--> statement-breakpoint
CREATE INDEX `tournaments_province_code_idx` ON `tournaments` (`province_code`);