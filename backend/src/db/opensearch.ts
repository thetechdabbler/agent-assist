import { Client } from '@opensearch-project/opensearch';
import { getConfig } from '../config';

let client: Client | null = null;

export function getOpenSearchClient(): Client | null {
  if (client) return client;
  const url = getConfig().OPENSEARCH_URL;
  if (!url) return null;
  client = new Client({ node: url });
  return client;
}
