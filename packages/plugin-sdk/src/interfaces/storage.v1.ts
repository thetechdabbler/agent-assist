/**
 * Storage Plugin Contract — Version 1.0
 *
 * All binary storage backends (S3, GCS, Azure Blob, etc.) implement this interface.
 */

export const STORAGE_CONTRACT_VERSION = '1.0' as const;

export interface StorageMetadata {
  pluginType: 'storage';
  name: string;
  version: string;
  contractVersion: typeof STORAGE_CONTRACT_VERSION;
  provider: string;
}

export interface UploadOptions {
  mimeType: string;
  sizeBytes?: number;
  metadata?: Record<string, string>;
}

export interface SignedUrlOptions {
  ttlSeconds: number;
  filename?: string;
}

export interface IStoragePlugin {
  readonly metadata: StorageMetadata;

  /**
   * Upload a file. Returns the storage key for future retrieval.
   */
  upload(
    key: string,
    data: Uint8Array | NodeJS.ReadableStream,
    options: UploadOptions,
  ): Promise<string>;

  /**
   * Generate a time-limited signed download URL.
   */
  generateSignedDownloadUrl(key: string, options: SignedUrlOptions): Promise<string>;

  /**
   * Generate a time-limited signed upload URL (for client-direct uploads).
   */
  generateSignedUploadUrl(key: string, options: SignedUrlOptions): Promise<string>;

  /**
   * Delete a stored object.
   */
  delete(key: string): Promise<void>;

  /**
   * Trigger an async virus scan on an uploaded object.
   */
  triggerVirusScan(key: string): Promise<void>;
}
