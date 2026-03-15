-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "agent_id" UUID;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "plugin_registry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
