CREATE TABLE `zeitkonten_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`snapshot_date` text NOT NULL,
	`captured_at` integer NOT NULL,
	`sap_leave_type_id` text NOT NULL,
	`zeitsaldo_beschreibung` text NOT NULL,
	`anzahl` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `zeitkonten_snapshots_user_id_snapshot_date_sap_leave_type_id_unique` ON `zeitkonten_snapshots` (`user_id`,`snapshot_date`,`sap_leave_type_id`);