PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_electrical_standards` (
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
	`defaultMcbCurve` text,
	`motorMcbCurve` text,
	`rcdThresholdMa` integer NOT NULL,
	`rcdRequiredOnSockets` integer NOT NULL,
	`socketCircuitAmps` integer NOT NULL,
	`lightingCircuitAmps` integer NOT NULL,
	`conductorLegendJson` text NOT NULL,
	`metadataJson` text DEFAULT '{}' NOT NULL,
	`version` text DEFAULT '2' NOT NULL,
	`seededAt` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_electrical_standards`("code", "label", "shortLabel", "citation", "flag", "nominalVoltage", "frequencyHz", "wireColorsJson", "wireColorsDarkJson", "voltageDropJson", "defaultMcbCurve", "motorMcbCurve", "rcdThresholdMa", "rcdRequiredOnSockets", "socketCircuitAmps", "lightingCircuitAmps", "conductorLegendJson", "metadataJson", "version", "seededAt") SELECT "code", "label", "shortLabel", "citation", "flag", "nominalVoltage", "frequencyHz", "wireColorsJson", "wireColorsDarkJson", "voltageDropJson", "defaultMcbCurve", "motorMcbCurve", "rcdThresholdMa", "rcdRequiredOnSockets", "socketCircuitAmps", "lightingCircuitAmps", "conductorLegendJson", '{}', "version", "seededAt" FROM `electrical_standards`;--> statement-breakpoint
DROP TABLE `electrical_standards`;--> statement-breakpoint
ALTER TABLE `__new_electrical_standards` RENAME TO `electrical_standards`;--> statement-breakpoint
PRAGMA foreign_keys=ON;