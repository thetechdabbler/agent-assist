import { getOpenSearchClient } from '../db/opensearch';
import { getIndexName, type IndexType } from './search-indexer.service';
import { agentAssistSearchLatencySeconds } from '../observability/metrics';

const SEARCH_TIMEOUT_MS = 3000;

export interface SearchFilters {
  q?: string;
  type?: IndexType;
  status?: string;
  from?: string;
  to?: string;
  artifact_type?: string;
}

export interface SearchResultItem {
  type: IndexType;
  id: string;
  conversationId?: string;
  messageId?: string;
  title?: string;
  jobType?: string;
  status?: string;
  artifactType?: string;
  updatedAt?: string;
  snippet?: string;
}

export type SearchResult =
  | { ok: true; results: SearchResultItem[] }
  | { ok: false; unavailable: true };

export async function search(tenantId: string, filters: SearchFilters): Promise<SearchResult> {
  const os = getOpenSearchClient();
  if (!os) return { ok: false, unavailable: true };

  const start = Date.now();
  try {
    const indices = filters.type
      ? [getIndexName(filters.type)]
      : (['conversations', 'messages', 'goals', 'jobs', 'artifacts'] as const).map(getIndexName);

    const must: Record<string, unknown>[] = [{ term: { tenant_id: tenantId } }];

    if (filters.q?.trim()) {
      must.push({
        multi_match: {
          query: filters.q.trim(),
          fields: ['title^2', 'payload_text', 'description', 'error_summary', 'preview_json'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      });
    }

    if (filters.status) {
      must.push({ term: { status: filters.status } });
    }

    if (filters.artifact_type) {
      must.push({ term: { artifact_type: filters.artifact_type } });
    }

    const range: Record<string, { gte?: string; lte?: string }> = {};
    if (filters.from) range.updated_at = { ...range.updated_at, gte: filters.from };
    if (filters.to) range.updated_at = { ...range.updated_at, lte: filters.to };
    if (Object.keys(range).length > 0) {
      must.push({ range });
    }

    const body = {
      query: { bool: { must } },
      size: 50,
      sort: [
        { updated_at: { order: 'desc' as const, missing: '_last' } },
        { created_at: { order: 'desc' as const, missing: '_last' } },
      ],
      _source: true,
    };

    const response = await Promise.race([
      os.search({
        index: indices.join(','),
        body,
        timeout: `${SEARCH_TIMEOUT_MS}ms`,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Search timeout')), SEARCH_TIMEOUT_MS),
      ),
    ]);

    const hits =
      (
        response as {
          body?: {
            hits?: {
              hits?: Array<{ _index: string; _id: string; _source?: Record<string, unknown> }>;
            };
          };
        }
      ).body?.hits?.hits ?? [];
    const typeByIndex: Record<string, IndexType> = {
      agent_assist_conversations: 'conversations',
      agent_assist_messages: 'messages',
      agent_assist_goals: 'goals',
      agent_assist_jobs: 'jobs',
      agent_assist_artifacts: 'artifacts',
    };

    const results: SearchResultItem[] = hits.map((hit) => {
      const type = typeByIndex[hit._index] ?? 'conversations';
      const src = hit._source ?? {};
      const conversationId =
        type === 'conversations' ? hit._id : ((src.conversation_id as string) ?? undefined);
      const item: SearchResultItem = {
        type,
        id: hit._id,
        conversationId,
        messageId: type === 'messages' ? hit._id : undefined,
        title: (src.title as string) ?? undefined,
        jobType: (src.job_type as string) ?? undefined,
        status: (src.status as string) ?? undefined,
        artifactType: (src.artifact_type as string) ?? undefined,
        updatedAt: typeof src.updated_at === 'string' ? src.updated_at : undefined,
        snippet:
          (src.payload_text as string)?.slice(0, 200) ?? (src.title as string)?.slice(0, 200),
      };
      return item;
    });

    const elapsed = (Date.now() - start) / 1000;
    agentAssistSearchLatencySeconds.record(elapsed, { tenant_id: tenantId });

    return { ok: true, results };
  } catch {
    return { ok: false, unavailable: true };
  }
}
