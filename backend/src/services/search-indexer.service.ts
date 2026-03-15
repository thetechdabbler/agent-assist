import { getOpenSearchClient } from '../db/opensearch';
import { createLogger } from '../observability/logger';
import { getConfig } from '../config';

const log = createLogger(getConfig());

export type IndexType = 'conversations' | 'messages' | 'goals' | 'jobs' | 'artifacts';

const INDEX_NAMES: Record<IndexType, string> = {
  conversations: 'agent_assist_conversations',
  messages: 'agent_assist_messages',
  goals: 'agent_assist_goals',
  jobs: 'agent_assist_jobs',
  artifacts: 'agent_assist_artifacts',
};

const INDEX_MAPPINGS: Record<IndexType, Record<string, unknown>> = {
  conversations: {
    properties: {
      tenant_id: { type: 'keyword' },
      title: { type: 'text' },
      owner_user_id: { type: 'keyword' },
      status: { type: 'keyword' },
      updated_at: { type: 'date' },
    },
  },
  messages: {
    properties: {
      tenant_id: { type: 'keyword' },
      conversation_id: { type: 'keyword' },
      payload_text: { type: 'text' },
      type: { type: 'keyword' },
      created_at: { type: 'date' },
      updated_at: { type: 'date' },
    },
  },
  goals: {
    properties: {
      tenant_id: { type: 'keyword' },
      conversation_id: { type: 'keyword' },
      title: { type: 'text' },
      description: { type: 'text' },
      goal_type: { type: 'keyword' },
      status: { type: 'keyword' },
      updated_at: { type: 'date' },
    },
  },
  jobs: {
    properties: {
      tenant_id: { type: 'keyword' },
      conversation_id: { type: 'keyword' },
      job_type: { type: 'keyword' },
      status: { type: 'keyword' },
      error_summary: { type: 'text' },
      updated_at: { type: 'date' },
    },
  },
  artifacts: {
    properties: {
      tenant_id: { type: 'keyword' },
      job_id: { type: 'keyword' },
      conversation_id: { type: 'keyword' },
      title: { type: 'text' },
      artifact_type: { type: 'keyword' },
      preview_json: { type: 'text', index: false },
      created_at: { type: 'date' },
    },
  },
};

let indicesEnsured = false;

async function ensureIndices(): Promise<void> {
  const os = getOpenSearchClient();
  if (!os) return;
  if (indicesEnsured) return;
  try {
    for (const type of Object.keys(INDEX_NAMES) as IndexType[]) {
      const index = INDEX_NAMES[type];
      const res = await os.indices.exists({ index });
      const exists = (res as { body?: boolean }).body === true;
      if (!exists) {
        await os.indices.create({
          index,
          body: { mappings: INDEX_MAPPINGS[type] },
        });
        log.info({ index }, 'OpenSearch index created');
      }
    }
    indicesEnsured = true;
  } catch (err) {
    log.warn({ err }, 'OpenSearch ensureIndices failed');
  }
}

function runFireAndForget(fn: () => Promise<void>): void {
  fn().catch((err) => log.warn({ err }, 'Search indexer fire-and-forget failed'));
}

export async function indexDocument(
  type: IndexType,
  id: string,
  document: Record<string, unknown> & { tenant_id: string },
): Promise<void> {
  const os = getOpenSearchClient();
  if (!os) return;
  await ensureIndices();
  const index = INDEX_NAMES[type];
  try {
    await os.index({
      index,
      id,
      body: document,
      refresh: false,
    });
  } catch (err) {
    log.warn({ err, index, id, type }, 'OpenSearch indexDocument failed');
    throw err;
  }
}

export function indexDocumentFireAndForget(
  type: IndexType,
  id: string,
  document: Record<string, unknown> & { tenant_id: string },
): void {
  runFireAndForget(() => indexDocument(type, id, document));
}

export async function updateDocument(
  type: IndexType,
  id: string,
  document: Record<string, unknown> & { tenant_id: string },
): Promise<void> {
  const os = getOpenSearchClient();
  if (!os) return;
  await ensureIndices();
  const index = INDEX_NAMES[type];
  try {
    await os.index({
      index,
      id,
      body: document,
      refresh: false,
    });
  } catch (err) {
    log.warn({ err, index, id, type }, 'OpenSearch updateDocument failed');
    throw err;
  }
}

export function updateDocumentFireAndForget(
  type: IndexType,
  id: string,
  document: Record<string, unknown> & { tenant_id: string },
): void {
  runFireAndForget(() => updateDocument(type, id, document));
}

export async function deleteDocument(type: IndexType, id: string): Promise<void> {
  const os = getOpenSearchClient();
  if (!os) return;
  const index = INDEX_NAMES[type];
  try {
    await os
      .delete({ index, id, refresh: false })
      .catch((e: { meta?: { statusCode?: number } }) => {
        if (e.meta?.statusCode === 404) return;
        throw e;
      });
  } catch (err) {
    log.warn({ err, index, id, type }, 'OpenSearch deleteDocument failed');
    throw err;
  }
}

export function deleteDocumentFireAndForget(type: IndexType, id: string): void {
  runFireAndForget(() => deleteDocument(type, id));
}

export function getIndexName(type: IndexType): string {
  return INDEX_NAMES[type];
}
