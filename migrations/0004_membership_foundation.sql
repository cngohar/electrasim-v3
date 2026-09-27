CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`reason` text NOT NULL,
	`request_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_logs_time_idx` ON `audit_logs` (`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `audit_logs_target_idx` ON `audit_logs` (`target_type`,`target_id`);--> statement-breakpoint
CREATE TABLE `entitlements` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`status` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer,
	`no_expiry` integer NOT NULL,
	`reason` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`mutation_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "entitlements_validity" CHECK(("entitlements"."no_expiry" = 1 AND "entitlements"."ends_at" IS NULL) OR ("entitlements"."no_expiry" = 0 AND "entitlements"."ends_at" IS NOT NULL AND "entitlements"."ends_at" > "entitlements"."starts_at")),
	CONSTRAINT "entitlements_source" CHECK("entitlements"."source" = 'manual'),
	CONSTRAINT "entitlements_status" CHECK("entitlements"."status" IN ('active','suspended','revoked'))
);
--> statement-breakpoint
CREATE INDEX `entitlements_user_validity_idx` ON `entitlements` (`user_id`,`status`,`starts_at`,`ends_at`);--> statement-breakpoint
CREATE INDEX `entitlements_plan_idx` ON `entitlements` (`plan_id`);--> statement-breakpoint
CREATE TABLE `plan_features` (
	`plan_id` text NOT NULL,
	`feature_key` text NOT NULL,
	`enabled` integer NOT NULL,
	`config` text NOT NULL,
	PRIMARY KEY(`plan_id`, `feature_key`),
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`feature_key`) REFERENCES `pro_features`(`key`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `plan_features_key_idx` ON `plan_features` (`feature_key`);--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`price_minor` integer,
	`currency` text,
	`duration_days` integer,
	`no_expiry` integer NOT NULL,
	`status` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`mutation_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "plans_duration" CHECK(("plans"."no_expiry" = 1 AND "plans"."duration_days" IS NULL) OR ("plans"."no_expiry" = 0 AND "plans"."duration_days" IS NOT NULL AND "plans"."duration_days" > 0)),
	CONSTRAINT "plans_price" CHECK(("plans"."price_minor" IS NULL AND "plans"."currency" IS NULL) OR ("plans"."price_minor" IS NOT NULL AND "plans"."price_minor" >= 0 AND "plans"."currency" IS NOT NULL)),
	CONSTRAINT "plans_status" CHECK("plans"."status" IN ('draft','active','archived'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plans_slug_unique` ON `plans` (`slug`);--> statement-breakpoint
CREATE TABLE `pro_features` (
	`key` text PRIMARY KEY NOT NULL,
	`handler` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`archived_at` integer,
	`version` integer DEFAULT 1 NOT NULL,
	`mutation_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text,
	`updated_by` text,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `user` ADD `global_role` text DEFAULT 'individual' NOT NULL;
--> statement-breakpoint
-- Code-owned boolean benefit handlers. No commercial plan, price or grant is seeded.
INSERT INTO pro_features (key, handler, name, description, enabled, sort_order, version, mutation_id, created_at, updated_at) VALUES
('pro_components', 'pro_components', '{"en":"Pro components"}', '{"en":"Use the Pro component catalog."}', 1, 0, 1, 'migration-0004', 1790467200000, 1790467200000),
('advanced_faults', 'advanced_faults', '{"en":"Advanced faults"}', '{"en":"Advanced fault types and exercises with multiple injected faults."}', 1, 1, 1, 'migration-0004', 1790467200000, 1790467200000),
('advanced_diagnostics', 'advanced_diagnostics', '{"en":"Advanced diagnostics"}', '{"en":"Advanced diagnosis and Ohmageddon; scenarios may require other capabilities."}', 1, 2, 1, 'migration-0004', 1790467200000, 1790467200000);
