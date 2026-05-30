CREATE TABLE `arbeitszeit_manual_kuerzungen` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`kuerzung_hundredths` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `arbeitszeit_manual_kuerzungen_user_id_account_id_unique` ON `arbeitszeit_manual_kuerzungen` (`user_id`,`account_id`);