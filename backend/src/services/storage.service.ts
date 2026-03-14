import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getConfig } from '../config';

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!client) {
    const env = getConfig();
    client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials:
        env.S3_ACCESS_KEY && env.S3_SECRET_KEY
          ? { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY }
          : undefined,
      forcePathStyle: !!env.S3_ENDPOINT,
    });
  }
  return client;
}

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  mimeType: string,
): Promise<void> {
  const env = getConfig();
  const bucket = env.S3_BUCKET;
  if (!bucket) throw new Error('S3_BUCKET not configured');
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: mimeType,
    }),
  );
}

export async function generateSignedDownloadUrl(
  key: string,
  ttlSeconds: number = 3600,
): Promise<string> {
  const env = getConfig();
  const bucket = env.S3_BUCKET;
  if (!bucket) throw new Error('S3_BUCKET not configured');
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(getClient(), cmd, { expiresIn: ttlSeconds });
}

export async function deleteFile(key: string): Promise<void> {
  const env = getConfig();
  const bucket = env.S3_BUCKET;
  if (!bucket) return;
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function triggerVirusScan(_key: string): Promise<void> {
  // Hook for virus scan pipeline; no-op in base implementation
}
