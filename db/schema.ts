import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const createdAt = () => text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`);
const updatedAt = () => text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`);

export const sites = sqliteTable(
  "sites",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    name: text("name").notNull(),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    elevationM: real("elevation_m").notNull().default(0),
    timezone: text("timezone").notNull().default("UTC"),
    status: text("status").notNull().default("active"),
    metadataJson: text("metadata_json").notNull().default("{}"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("sites_owner_idx").on(table.ownerId),
    index("sites_location_idx").on(table.latitude, table.longitude),
  ],
);

export const systemConfigurations = sqliteTable(
  "system_configurations",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull(),
    name: text("name").notNull(),
    revision: integer("revision").notNull().default(1),
    configurationJson: text("configuration_json").notNull(),
    configurationHash: text("configuration_hash").notNull(),
    calculationVersion: text("calculation_version").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("configurations_site_idx").on(table.siteId),
    index("configurations_owner_idx").on(table.ownerId),
    uniqueIndex("configurations_hash_revision_uq").on(
      table.siteId,
      table.configurationHash,
      table.revision,
    ),
  ],
);

export const scenarios = sqliteTable(
  "scenarios",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    siteId: text("site_id").references(() => sites.id, { onDelete: "set null" }),
    baseConfigurationId: text("base_configuration_id").references(
      () => systemConfigurations.id,
      { onDelete: "set null" },
    ),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("draft"),
    lifecycle: text("lifecycle").notNull().default("experimental"),
    branchFromScenarioId: text("branch_from_scenario_id"),
    inputsJson: text("inputs_json").notNull(),
    inputsHash: text("inputs_hash").notNull(),
    resultSnapshotId: text("result_snapshot_id"),
    tagsJson: text("tags_json").notNull().default("[]"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("scenarios_owner_updated_idx").on(table.ownerId, table.updatedAt),
    index("scenarios_site_idx").on(table.siteId),
    index("scenarios_branch_idx").on(table.branchFromScenarioId),
  ],
);

export const savedWorkspaces = sqliteTable(
  "saved_workspaces",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    siteId: text("site_id").references(() => sites.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    workspaceType: text("workspace_type").notNull(),
    layoutJson: text("layout_json").notNull(),
    linkedStateJson: text("linked_state_json").notNull().default("{}"),
    schemaVersion: text("schema_version").notNull().default("workspace-layout-v1"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("saved_workspaces_owner_idx").on(table.ownerId, table.updatedAt),
    index("saved_workspaces_site_idx").on(table.siteId),
  ],
);

export const annotations = sqliteTable(
  "annotations",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    siteId: text("site_id").references(() => sites.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id").references(() => savedWorkspaces.id, {
      onDelete: "cascade",
    }),
    scenarioId: text("scenario_id").references(() => scenarios.id, { onDelete: "cascade" }),
    timestampUtc: text("timestamp_utc"),
    spatialRefJson: text("spatial_ref_json"),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    severity: text("severity").notNull().default("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("annotations_owner_idx").on(table.ownerId, table.createdAt),
    index("annotations_workspace_idx").on(table.workspaceId),
    index("annotations_scenario_idx").on(table.scenarioId),
  ],
);

export const providerRuns = sqliteTable(
  "provider_runs",
  {
    id: text("id").primaryKey(),
    providerId: text("provider_id").notNull(),
    providerVersion: text("provider_version").notNull(),
    product: text("product").notNull(),
    requestedDataClass: text("requested_data_class").notNull(),
    actualDataClass: text("actual_data_class"),
    queryJson: text("query_json").notNull(),
    queryHash: text("query_hash").notNull(),
    status: text("status").notNull(),
    scheduledTimeUtc: text("scheduled_time_utc"),
    startedAtUtc: text("started_at_utc").notNull(),
    completedAtUtc: text("completed_at_utc"),
    issueTimeUtc: text("issue_time_utc"),
    attemptCount: integer("attempt_count").notNull().default(0),
    httpStatus: integer("http_status"),
    rateLimitResetUtc: text("rate_limit_reset_utc"),
    fallbackFromProviderId: text("fallback_from_provider_id"),
    semanticSubstitution: integer("semantic_substitution", { mode: "boolean" })
      .notNull()
      .default(false),
    qualityScore: real("quality_score"),
    elapsedMs: integer("elapsed_ms"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: createdAt(),
  },
  (table) => [
    index("provider_runs_provider_time_idx").on(table.providerId, table.startedAtUtc),
    index("provider_runs_status_idx").on(table.status, table.startedAtUtc),
    index("provider_runs_query_hash_idx").on(table.queryHash),
  ],
);

export const datasetSnapshots = sqliteTable(
  "dataset_snapshots",
  {
    id: text("id").primaryKey(),
    providerRunId: text("provider_run_id").references(() => providerRuns.id, {
      onDelete: "set null",
    }),
    providerId: text("provider_id").notNull(),
    dataClass: text("data_class").notNull(),
    schemaVersion: text("schema_version").notNull(),
    calculationVersion: text("calculation_version").notNull(),
    canonicalContentHash: text("canonical_content_hash").notNull(),
    rawContentHash: text("raw_content_hash"),
    queryHash: text("query_hash").notNull(),
    manifestKey: text("manifest_key"),
    canonicalObjectKey: text("canonical_object_key"),
    rawObjectKey: text("raw_object_key"),
    validFromUtc: text("valid_from_utc").notNull(),
    validToUtc: text("valid_to_utc").notNull(),
    intervalSeconds: integer("interval_seconds").notNull(),
    recordCount: integer("record_count").notNull(),
    qualityScore: real("quality_score").notNull(),
    unitsJson: text("units_json").notNull(),
    transformationsJson: text("transformations_json").notNull(),
    assumptionsJson: text("assumptions_json").notNull(),
    parentSnapshotIdsJson: text("parent_snapshot_ids_json").notNull().default("[]"),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("dataset_snapshots_content_uq").on(
      table.providerId,
      table.canonicalContentHash,
      table.queryHash,
    ),
    index("dataset_snapshots_valid_range_idx").on(table.validFromUtc, table.validToUtc),
    index("dataset_snapshots_provider_run_idx").on(table.providerRunId),
  ],
);

export const modelVersions = sqliteTable(
  "model_versions",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    family: text("family").notNull(),
    version: text("version").notNull(),
    lifecycle: text("lifecycle").notNull(),
    role: text("role").notNull().default("research-candidate"),
    featureSchemaJson: text("feature_schema_json").notNull().default("{}"),
    hyperparametersJson: text("hyperparameters_json").notNull().default("{}"),
    trainingWindowStartUtc: text("training_window_start_utc"),
    trainingWindowEndUtc: text("training_window_end_utc"),
    artifactUri: text("artifact_uri"),
    artifactHash: text("artifact_hash"),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("model_versions_name_version_uq").on(table.name, table.version),
    index("model_versions_role_idx").on(table.role, table.createdAt),
  ],
);

export const experiments = sqliteTable(
  "experiments",
  {
    id: text("id").primaryKey(),
    modelVersionId: text("model_version_id")
      .notNull()
      .references(() => modelVersions.id, { onDelete: "restrict" }),
    ownerId: text("owner_id").notNull(),
    datasetSnapshotId: text("dataset_snapshot_id").references(() => datasetSnapshots.id, {
      onDelete: "restrict",
    }),
    name: text("name").notNull(),
    status: text("status").notNull(),
    evaluationMethod: text("evaluation_method").notNull(),
    splitDefinitionJson: text("split_definition_json").notNull(),
    randomSeed: integer("random_seed"),
    codeVersion: text("code_version").notNull(),
    startedAtUtc: text("started_at_utc").notNull(),
    completedAtUtc: text("completed_at_utc"),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
  },
  (table) => [
    index("experiments_model_idx").on(table.modelVersionId, table.startedAtUtc),
    index("experiments_dataset_idx").on(table.datasetSnapshotId),
    index("experiments_owner_idx").on(table.ownerId, table.startedAtUtc),
  ],
);

export const experimentMetrics = sqliteTable(
  "experiment_metrics",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    experimentId: text("experiment_id")
      .notNull()
      .references(() => experiments.id, { onDelete: "cascade" }),
    metricName: text("metric_name").notNull(),
    metricValue: real("metric_value"),
    unit: text("unit").notNull().default("dimensionless"),
    season: text("season"),
    forecastHorizonHours: integer("forecast_horizon_hours"),
    intervalLevel: real("interval_level"),
    sampleCount: integer("sample_count"),
    metadataJson: text("metadata_json").notNull().default("{}"),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("experiment_metrics_slice_uq").on(
      table.experimentId,
      table.metricName,
      table.season,
      table.forecastHorizonHours,
      table.intervalLevel,
    ),
    index("experiment_metrics_name_idx").on(table.metricName),
  ],
);

export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id"),
    actorRole: text("actor_role").notNull().default("anonymous"),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    requestId: text("request_id"),
    beforeHash: text("before_hash"),
    afterHash: text("after_hash"),
    detailJson: text("detail_json").notNull().default("{}"),
    ipHash: text("ip_hash"),
    occurredAtUtc: text("occurred_at_utc").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("audit_events_resource_idx").on(table.resourceType, table.resourceId),
    index("audit_events_actor_time_idx").on(table.actorId, table.occurredAtUtc),
    index("audit_events_request_idx").on(table.requestId),
  ],
);

export const jobState = sqliteTable(
  "job_state",
  {
    jobKey: text("job_key").primaryKey(),
    jobType: text("job_type").notNull(),
    status: text("status").notNull(),
    leaseOwner: text("lease_owner"),
    leaseExpiresAtUtc: text("lease_expires_at_utc"),
    scheduledForUtc: text("scheduled_for_utc"),
    lastStartedAtUtc: text("last_started_at_utc"),
    lastCompletedAtUtc: text("last_completed_at_utc"),
    lastSuccessAtUtc: text("last_success_at_utc"),
    attemptCount: integer("attempt_count").notNull().default(0),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    checkpointJson: text("checkpoint_json").notNull().default("{}"),
    lastErrorCode: text("last_error_code"),
    lastErrorMessage: text("last_error_message"),
    updatedAt: updatedAt(),
  },
  (table) => [index("job_state_status_schedule_idx").on(table.status, table.scheduledForUtc)],
);

