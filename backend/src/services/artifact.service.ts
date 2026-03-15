import { prisma } from '../db/client';
import * as storageService from './storage.service';
import * as auditService from './audit.service';
import { indexDocumentFireAndForget } from './search-indexer.service';
import {
  validateArtifactPayload,
  ARTIFACT_SCHEMA_VERSION,
} from '../domain/artifact-schema-registry';

const DOWNLOAD_URL_TTL_SECONDS = 3600;

export interface CreateArtifactInput {
  jobId: string;
  conversationId: string;
  tenantId: string;
  artifactType: string;
  title: string;
  version?: number;
  storageUri?: string | null;
  payloadJson?: Record<string, unknown> | null;
  previewJson?: Record<string, unknown> | null;
  schemaVersion?: string;
  metadataJson?: Record<string, unknown> | null;
}

export async function createArtifact(input: CreateArtifactInput): Promise<
  | {
      ok: true;
      artifact: {
        id: string;
        jobId: string;
        conversationId: string;
        tenantId: string;
        artifactType: string;
        title: string;
        version: number;
        storageUri: string | null;
        payloadJson: unknown;
        previewJson: unknown;
        schemaVersion: string;
        metadataJson: unknown;
        createdAt: Date;
      };
    }
  | { ok: false; reason: 'validation_failed' | 'job_not_found' }
> {
  const job = await prisma.job.findFirst({
    where: { id: input.jobId, tenantId: input.tenantId },
    select: { id: true, conversationId: true },
  });
  if (!job) return { ok: false, reason: 'job_not_found' };

  const schemaVersion = input.schemaVersion ?? ARTIFACT_SCHEMA_VERSION;
  const payload = input.payloadJson ?? null;
  if (payload !== null && typeof payload === 'object') {
    const validated = validateArtifactPayload(input.artifactType, schemaVersion, payload);
    if (!validated.ok) return { ok: false, reason: 'validation_failed' };
  }

  const artifact = await prisma.artifact.create({
    data: {
      jobId: input.jobId,
      conversationId: input.conversationId,
      tenantId: input.tenantId,
      artifactType: input.artifactType,
      title: input.title,
      version: input.version ?? 1,
      storageUri: input.storageUri ?? null,
      payloadJson: input.payloadJson != null ? (input.payloadJson as object) : undefined,
      previewJson: input.previewJson != null ? (input.previewJson as object) : undefined,
      schemaVersion,
      metadataJson: input.metadataJson != null ? (input.metadataJson as object) : undefined,
    },
  });

  const previewText =
    input.previewJson && typeof input.previewJson === 'object'
      ? JSON.stringify(input.previewJson).slice(0, 5000)
      : '';
  indexDocumentFireAndForget('artifacts', artifact.id, {
    tenant_id: input.tenantId,
    job_id: input.jobId,
    conversation_id: input.conversationId,
    title: input.title,
    artifact_type: input.artifactType,
    preview_json: previewText,
    created_at: artifact.createdAt.toISOString(),
  });

  return {
    ok: true,
    artifact: {
      id: artifact.id,
      jobId: artifact.jobId,
      conversationId: artifact.conversationId,
      tenantId: artifact.tenantId,
      artifactType: artifact.artifactType,
      title: artifact.title,
      version: artifact.version,
      storageUri: artifact.storageUri,
      payloadJson: artifact.payloadJson,
      previewJson: artifact.previewJson,
      schemaVersion: artifact.schemaVersion,
      metadataJson: artifact.metadataJson,
      createdAt: artifact.createdAt,
    },
  };
}

export async function listArtifactsByJob(
  jobId: string,
  tenantId: string,
): Promise<
  Array<{
    id: string;
    jobId: string;
    artifactType: string;
    title: string;
    version: number;
    schemaVersion: string;
    createdAt: Date;
  }>
> {
  const list = await prisma.artifact.findMany({
    where: { jobId, tenantId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      jobId: true,
      artifactType: true,
      title: true,
      version: true,
      schemaVersion: true,
      createdAt: true,
    },
  });
  return list;
}

export async function getArtifactById(
  id: string,
  tenantId: string,
): Promise<{
  id: string;
  jobId: string;
  conversationId: string;
  tenantId: string;
  artifactType: string;
  title: string;
  version: number;
  storageUri: string | null;
  payloadJson: unknown;
  previewJson: unknown;
  schemaVersion: string;
  metadataJson: unknown;
  createdAt: Date;
} | null> {
  const artifact = await prisma.artifact.findFirst({
    where: { id, tenantId },
  });
  return artifact;
}

export async function generateSignedDownloadUrl(
  artifactId: string,
  tenantId: string,
  userId: string,
  correlationId?: string,
): Promise<
  { ok: true; url: string; expiresIn: number } | { ok: false; reason: 'not_found' | 'no_storage' }
> {
  const artifact = await prisma.artifact.findFirst({
    where: { id: artifactId, tenantId },
    select: { id: true, storageUri: true },
  });
  if (!artifact) return { ok: false, reason: 'not_found' };
  if (!artifact.storageUri) return { ok: false, reason: 'no_storage' };

  const url = await storageService.generateSignedDownloadUrl(
    artifact.storageUri,
    DOWNLOAD_URL_TTL_SECONDS,
  );
  await auditService.logArtifactAccess(artifactId, userId, tenantId, correlationId);
  return { ok: true, url, expiresIn: DOWNLOAD_URL_TTL_SECONDS };
}
