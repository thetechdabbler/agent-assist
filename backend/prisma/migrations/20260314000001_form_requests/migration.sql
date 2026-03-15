-- CreateTable
CREATE TABLE "form_requests" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "resolved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "form_requests_message_id_key" ON "form_requests"("message_id");

-- CreateIndex
CREATE INDEX "form_requests_job_id_idx" ON "form_requests"("job_id");

-- CreateIndex
CREATE INDEX "form_requests_conversation_id_idx" ON "form_requests"("conversation_id");

-- AddForeignKey
ALTER TABLE "form_requests" ADD CONSTRAINT "form_requests_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_requests" ADD CONSTRAINT "form_requests_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_requests" ADD CONSTRAINT "form_requests_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
