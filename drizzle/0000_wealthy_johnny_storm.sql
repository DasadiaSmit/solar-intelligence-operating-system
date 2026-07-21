CREATE TABLE `annotations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`site_id` text,
	`workspace_id` text,
	`scenario_id` text,
	`timestamp_utc` text,
	`spatial_ref_json` text,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`severity` text DEFAULT 'note' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`) REFERENCES `saved_workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`scenario_id`) REFERENCES `scenarios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `annotations_owner_idx` ON `annotations` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `annotations_workspace_idx` ON `annotations` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `annotations_scenario_idx` ON `annotations` (`scenario_id`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text,
	`actor_role` text DEFAULT 'anonymous' NOT NULL,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text,
	`request_id` text,
	`before_hash` text,
	`after_hash` text,
	`detail_json` text DEFAULT '{}' NOT NULL,
	`ip_hash` text,
	`occurred_at_utc` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_events_resource_idx` ON `audit_events` (`resource_type`,`resource_id`);--> statement-breakpoint
CREATE INDEX `audit_events_actor_time_idx` ON `audit_events` (`actor_id`,`occurred_at_utc`);--> statement-breakpoint
CREATE INDEX `audit_events_request_idx` ON `audit_events` (`request_id`);--> statement-breakpoint
CREATE TABLE `dataset_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_run_id` text,
	`provider_id` text NOT NULL,
	`data_class` text NOT NULL,
	`schema_version` text NOT NULL,
	`calculation_version` text NOT NULL,
	`canonical_content_hash` text NOT NULL,
	`raw_content_hash` text,
	`query_hash` text NOT NULL,
	`manifest_key` text,
	`canonical_object_key` text,
	`raw_object_key` text,
	`valid_from_utc` text NOT NULL,
	`valid_to_utc` text NOT NULL,
	`interval_seconds` integer NOT NULL,
	`record_count` integer NOT NULL,
	`quality_score` real NOT NULL,
	`units_json` text NOT NULL,
	`transformations_json` text NOT NULL,
	`assumptions_json` text NOT NULL,
	`parent_snapshot_ids_json` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`provider_run_id`) REFERENCES `provider_runs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dataset_snapshots_content_uq` ON `dataset_snapshots` (`provider_id`,`canonical_content_hash`,`query_hash`);--> statement-breakpoint
CREATE INDEX `dataset_snapshots_valid_range_idx` ON `dataset_snapshots` (`valid_from_utc`,`valid_to_utc`);--> statement-breakpoint
CREATE INDEX `dataset_snapshots_provider_run_idx` ON `dataset_snapshots` (`provider_run_id`);--> statement-breakpoint
CREATE TABLE `experiment_metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`experiment_id` text NOT NULL,
	`metric_name` text NOT NULL,
	`metric_value` real,
	`unit` text DEFAULT 'dimensionless' NOT NULL,
	`season` text,
	`forecast_horizon_hours` integer,
	`interval_level` real,
	`sample_count` integer,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`experiment_id`) REFERENCES `experiments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `experiment_metrics_slice_uq` ON `experiment_metrics` (`experiment_id`,`metric_name`,`season`,`forecast_horizon_hours`,`interval_level`);--> statement-breakpoint
CREATE INDEX `experiment_metrics_name_idx` ON `experiment_metrics` (`metric_name`);--> statement-breakpoint
CREATE TABLE `experiments` (
	`id` text PRIMARY KEY NOT NULL,
	`model_version_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`dataset_snapshot_id` text,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`evaluation_method` text NOT NULL,
	`split_definition_json` text NOT NULL,
	`random_seed` integer,
	`code_version` text NOT NULL,
	`started_at_utc` text NOT NULL,
	`completed_at_utc` text,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`model_version_id`) REFERENCES `model_versions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`dataset_snapshot_id`) REFERENCES `dataset_snapshots`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `experiments_model_idx` ON `experiments` (`model_version_id`,`started_at_utc`);--> statement-breakpoint
CREATE INDEX `experiments_dataset_idx` ON `experiments` (`dataset_snapshot_id`);--> statement-breakpoint
CREATE INDEX `experiments_owner_idx` ON `experiments` (`owner_id`,`started_at_utc`);--> statement-breakpoint
CREATE TABLE `job_state` (
	`job_key` text PRIMARY KEY NOT NULL,
	`job_type` text NOT NULL,
	`status` text NOT NULL,
	`lease_owner` text,
	`lease_expires_at_utc` text,
	`scheduled_for_utc` text,
	`last_started_at_utc` text,
	`last_completed_at_utc` text,
	`last_success_at_utc` text,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`consecutive_failures` integer DEFAULT 0 NOT NULL,
	`checkpoint_json` text DEFAULT '{}' NOT NULL,
	`last_error_code` text,
	`last_error_message` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `job_state_status_schedule_idx` ON `job_state` (`status`,`scheduled_for_utc`);--> statement-breakpoint
CREATE TABLE `model_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`family` text NOT NULL,
	`version` text NOT NULL,
	`lifecycle` text NOT NULL,
	`role` text DEFAULT 'research-candidate' NOT NULL,
	`feature_schema_json` text DEFAULT '{}' NOT NULL,
	`hyperparameters_json` text DEFAULT '{}' NOT NULL,
	`training_window_start_utc` text,
	`training_window_end_utc` text,
	`artifact_uri` text,
	`artifact_hash` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `model_versions_name_version_uq` ON `model_versions` (`name`,`version`);--> statement-breakpoint
CREATE INDEX `model_versions_role_idx` ON `model_versions` (`role`,`created_at`);--> statement-breakpoint
CREATE TABLE `provider_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text NOT NULL,
	`provider_version` text NOT NULL,
	`product` text NOT NULL,
	`requested_data_class` text NOT NULL,
	`actual_data_class` text,
	`query_json` text NOT NULL,
	`query_hash` text NOT NULL,
	`status` text NOT NULL,
	`scheduled_time_utc` text,
	`started_at_utc` text NOT NULL,
	`completed_at_utc` text,
	`issue_time_utc` text,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`http_status` integer,
	`rate_limit_reset_utc` text,
	`fallback_from_provider_id` text,
	`semantic_substitution` integer DEFAULT false NOT NULL,
	`quality_score` real,
	`elapsed_ms` integer,
	`error_code` text,
	`error_message` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `provider_runs_provider_time_idx` ON `provider_runs` (`provider_id`,`started_at_utc`);--> statement-breakpoint
CREATE INDEX `provider_runs_status_idx` ON `provider_runs` (`status`,`started_at_utc`);--> statement-breakpoint
CREATE INDEX `provider_runs_query_hash_idx` ON `provider_runs` (`query_hash`);--> statement-breakpoint
CREATE TABLE `saved_workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`site_id` text,
	`name` text NOT NULL,
	`workspace_type` text NOT NULL,
	`layout_json` text NOT NULL,
	`linked_state_json` text DEFAULT '{}' NOT NULL,
	`schema_version` text DEFAULT 'workspace-layout-v1' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `saved_workspaces_owner_idx` ON `saved_workspaces` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `saved_workspaces_site_idx` ON `saved_workspaces` (`site_id`);--> statement-breakpoint
CREATE TABLE `scenarios` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`site_id` text,
	`base_configuration_id` text,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`lifecycle` text DEFAULT 'experimental' NOT NULL,
	`branch_from_scenario_id` text,
	`inputs_json` text NOT NULL,
	`inputs_hash` text NOT NULL,
	`result_snapshot_id` text,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`base_configuration_id`) REFERENCES `system_configurations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `scenarios_owner_updated_idx` ON `scenarios` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `scenarios_site_idx` ON `scenarios` (`site_id`);--> statement-breakpoint
CREATE INDEX `scenarios_branch_idx` ON `scenarios` (`branch_from_scenario_id`);--> statement-breakpoint
CREATE TABLE `sites` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`elevation_m` real DEFAULT 0 NOT NULL,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sites_owner_idx` ON `sites` (`owner_id`);--> statement-breakpoint
CREATE INDEX `sites_location_idx` ON `sites` (`latitude`,`longitude`);--> statement-breakpoint
CREATE TABLE `system_configurations` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`configuration_json` text NOT NULL,
	`configuration_hash` text NOT NULL,
	`calculation_version` text NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `configurations_site_idx` ON `system_configurations` (`site_id`);--> statement-breakpoint
CREATE INDEX `configurations_owner_idx` ON `system_configurations` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `configurations_hash_revision_uq` ON `system_configurations` (`site_id`,`configuration_hash`,`revision`);