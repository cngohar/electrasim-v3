CREATE TABLE `app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `electrical_standards` (
	`code` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`shortLabel` text NOT NULL,
	`citation` text NOT NULL,
	`flag` text NOT NULL,
	`nominalVoltage` integer NOT NULL,
	`frequencyHz` integer NOT NULL,
	`wireColorsJson` text NOT NULL,
	`wireColorsDarkJson` text NOT NULL,
	`voltageDropJson` text NOT NULL,
	`defaultMcbCurve` text NOT NULL,
	`motorMcbCurve` text NOT NULL,
	`rcdThresholdMa` integer NOT NULL,
	`rcdRequiredOnSockets` integer NOT NULL,
	`socketCircuitAmps` integer NOT NULL,
	`lightingCircuitAmps` integer NOT NULL,
	`conductorLegendJson` text NOT NULL,
	`version` text DEFAULT '1' NOT NULL,
	`seededAt` integer NOT NULL
);
