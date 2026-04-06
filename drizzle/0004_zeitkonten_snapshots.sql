CREATE TABLE `zeitkonten_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`snapshot_date` text NOT NULL,
	`captured_at` integer NOT NULL,
	`sap_leave_type_id` text NOT NULL,
	`zeitsaldo_beschreibung` text NOT NULL,
	`anzahl` text NOT NULL,
	`einheit` text NOT NULL,
	`datenstand_von` text NOT NULL,
	`periode` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX `zeitkonten_snapshots_user_snapshot_leave_unique` ON `zeitkonten_snapshots` (`user_id`,`snapshot_date`,`sap_leave_type_id`);
