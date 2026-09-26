CREATE TABLE `content_pages` (
	`slug` text NOT NULL,
	`locale` text DEFAULT 'en' NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`seoJson` text,
	`status` text DEFAULT 'published' NOT NULL,
	`authorId` text,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `i18n_strings` (
	`key` text NOT NULL,
	`locale` text NOT NULL,
	`value` text NOT NULL,
	`namespace` text DEFAULT 'common' NOT NULL,
	`updatedAt` integer NOT NULL
);
