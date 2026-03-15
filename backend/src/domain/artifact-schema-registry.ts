import { z } from 'zod';
import { agentAssistRendererValidationFailureTotal } from '../observability/metrics';

export const ARTIFACT_SCHEMA_VERSION = '1.0';

const tableColumnSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(['string', 'number', 'date', 'boolean']).optional(),
  sortable: z.boolean().optional(),
});

const tablePayloadSchema = z.object({
  columns: z.array(tableColumnSchema).min(1),
  rows: z.array(z.record(z.unknown())),
  totalRows: z.number().int().optional(),
  capabilities: z
    .object({
      sort: z.boolean().optional(),
      filter: z.boolean().optional(),
      paginate: z.boolean().optional(),
      export: z.array(z.enum(['csv', 'xlsx', 'json'])).optional(),
    })
    .optional(),
});

const chartSeriesSchema = z.object({
  name: z.string(),
  data: z.array(z.number()),
});

const chartPayloadSchema = z.object({
  kind: z.enum(['line', 'bar', 'pie', 'area', 'progress', 'trend']),
  title: z.string(),
  x: z.array(z.string()),
  series: z.array(chartSeriesSchema).min(1),
  yAxisLabel: z.string().optional(),
  xAxisLabel: z.string().optional(),
});

const filePayloadSchema = z.object({
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().optional(),
  downloadUrl: z.string().optional(),
  expiresAt: z.string().optional(),
});

const imagePayloadSchema = z.object({
  altText: z.string(),
  url: z.string().optional(),
  expiresAt: z.string().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
});

const textPayloadSchema = z.object({
  text: z.string(),
  format: z.enum(['plain', 'markdown']).optional(),
});

export type ArtifactType = 'table' | 'chart' | 'file' | 'image' | 'text';

const schemasByType: Record<
  ArtifactType,
  { [version: string]: z.ZodType<Record<string, unknown>> }
> = {
  table: { [ARTIFACT_SCHEMA_VERSION]: tablePayloadSchema as z.ZodType<Record<string, unknown>> },
  chart: { [ARTIFACT_SCHEMA_VERSION]: chartPayloadSchema as z.ZodType<Record<string, unknown>> },
  file: { [ARTIFACT_SCHEMA_VERSION]: filePayloadSchema as z.ZodType<Record<string, unknown>> },
  image: { [ARTIFACT_SCHEMA_VERSION]: imagePayloadSchema as z.ZodType<Record<string, unknown>> },
  text: { [ARTIFACT_SCHEMA_VERSION]: textPayloadSchema as z.ZodType<Record<string, unknown>> },
};

/**
 * Validates artifact payload against the versioned schema for the given type.
 * Returns the parsed payload or null if validation fails; on failure increments
 * agent_assist_renderer_validation_failure_total.
 */
export function validateArtifactPayload(
  artifactType: string,
  schemaVersion: string,
  payload: unknown,
): { ok: true; payload: Record<string, unknown> } | { ok: false } {
  const type = artifactType as ArtifactType;
  const versions = schemasByType[type];
  if (!versions) {
    agentAssistRendererValidationFailureTotal.add(1, {
      artifact_type: artifactType,
      schema_version: schemaVersion,
    });
    return { ok: false };
  }
  const schema = versions[schemaVersion];
  if (!schema) {
    agentAssistRendererValidationFailureTotal.add(1, {
      artifact_type: artifactType,
      schema_version: schemaVersion,
    });
    return { ok: false };
  }
  const result = schema.safeParse(payload);
  if (!result.success) {
    agentAssistRendererValidationFailureTotal.add(1, {
      artifact_type: artifactType,
      schema_version: schemaVersion,
    });
    return { ok: false };
  }
  return { ok: true, payload: result.data as Record<string, unknown> };
}

export function getSupportedTypes(): ArtifactType[] {
  return ['table', 'chart', 'file', 'image', 'text'];
}

export function getSupportedVersions(artifactType: ArtifactType): string[] {
  return Object.keys(schemasByType[artifactType] ?? {});
}
