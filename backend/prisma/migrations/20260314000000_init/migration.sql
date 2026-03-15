-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "config_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "tenant_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "title" TEXT,
    "owner_user_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "active_goal_id" UUID,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "source_type" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "payload_json" JSONB NOT NULL,
    "correlation_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "malware_scan_status" TEXT NOT NULL,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "conversation_id" UUID,
    "goal_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "schedule" TEXT,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "goal_id" UUID,
    "tenant_id" UUID NOT NULL,
    "external_job_ref" TEXT,
    "job_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress_percent" INTEGER,
    "schedule_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "input_ref" UUID,
    "result_ref" UUID,
    "error_code" TEXT,
    "error_summary" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifacts" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "artifact_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "storage_uri" TEXT,
    "payload_json" JSONB,
    "preview_json" JSONB,
    "schema_version" TEXT NOT NULL,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "conversation_id" UUID,
    "job_id" UUID,
    "artifact_id" UUID,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "delivered_at" TIMESTAMPTZ,
    "acknowledged_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plugin_registry" (
    "id" UUID NOT NULL,
    "plugin_type" TEXT NOT NULL,
    "plugin_name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "contract_version" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "config_json" JSONB,
    "health_last_checked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "plugin_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_plugins" (
    "tenant_id" UUID NOT NULL,
    "plugin_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config_override_json" JSONB,
    "enabled_at" TIMESTAMPTZ,

    CONSTRAINT "tenant_plugins_pkey" PRIMARY KEY ("tenant_id","plugin_id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "event_type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "before_state" TEXT,
    "after_state" TEXT,
    "correlation_id" UUID,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "conversations_owner_user_id_status_idx" ON "conversations"("owner_user_id", "status");

-- CreateIndex
CREATE INDEX "conversations_tenant_id_status_idx" ON "conversations"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_correlation_id_idx" ON "messages"("correlation_id");

-- CreateIndex
CREATE INDEX "attachments_conversation_id_idx" ON "attachments"("conversation_id");

-- CreateIndex
CREATE INDEX "attachments_message_id_idx" ON "attachments"("message_id");

-- CreateIndex
CREATE INDEX "goals_user_id_status_idx" ON "goals"("user_id", "status");

-- CreateIndex
CREATE INDEX "goals_tenant_id_status_idx" ON "goals"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "goals_user_id_goal_type_idx" ON "goals"("user_id", "goal_type");

-- CreateIndex
CREATE INDEX "jobs_conversation_id_status_idx" ON "jobs"("conversation_id", "status");

-- CreateIndex
CREATE INDEX "jobs_tenant_id_status_idx" ON "jobs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "jobs_goal_id_idx" ON "jobs"("goal_id");

-- CreateIndex
CREATE INDEX "jobs_schedule_at_idx" ON "jobs"("schedule_at");

-- CreateIndex
CREATE INDEX "artifacts_job_id_idx" ON "artifacts"("job_id");

-- CreateIndex
CREATE INDEX "artifacts_conversation_id_idx" ON "artifacts"("conversation_id");

-- CreateIndex
CREATE INDEX "artifacts_tenant_id_artifact_type_idx" ON "artifacts"("tenant_id", "artifact_type");

-- CreateIndex
CREATE INDEX "artifacts_created_at_idx" ON "artifacts"("created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_idx" ON "notifications"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "plugin_registry_plugin_type_plugin_name_key" ON "plugin_registry"("plugin_type", "plugin_name");

-- CreateIndex
CREATE INDEX "audit_log_entity_id_entity_type_idx" ON "audit_log"("entity_id", "entity_type");

-- CreateIndex
CREATE INDEX "audit_log_tenant_id_created_at_idx" ON "audit_log"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_correlation_id_idx" ON "audit_log"("correlation_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_active_goal_id_fkey" FOREIGN KEY ("active_goal_id") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_artifact_id_fkey" FOREIGN KEY ("artifact_id") REFERENCES "artifacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_plugins" ADD CONSTRAINT "tenant_plugins_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_plugins" ADD CONSTRAINT "tenant_plugins_plugin_id_fkey" FOREIGN KEY ("plugin_id") REFERENCES "plugin_registry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

