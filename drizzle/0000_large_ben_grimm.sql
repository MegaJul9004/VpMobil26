CREATE TABLE `plan_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`school_number` text NOT NULL,
	`date` text NOT NULL,
	`class_name` text NOT NULL,
	`data` text NOT NULL,
	`zeitstempel` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plan_snapshots_uq` ON `plan_snapshots` (`school_number`,`date`,`class_name`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`school_number` text NOT NULL,
	`class_name` text NOT NULL,
	`courses` text DEFAULT '[]' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_endpoint_uq` ON `subscriptions` (`endpoint`);--> statement-breakpoint
CREATE INDEX `subscriptions_class_idx` ON `subscriptions` (`school_number`,`class_name`);