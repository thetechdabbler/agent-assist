/**
 * Notification Channel Contract — Version 1.0
 *
 * All notification delivery mechanisms (in-app, email, Slack, etc.) implement this interface.
 */

export const NOTIFICATION_CONTRACT_VERSION = '1.0' as const;

export type NotificationCategory =
  | 'informational'
  | 'success'
  | 'action_required'
  | 'warning'
  | 'failure';

export interface NotificationPayload {
  userId: string;
  tenantId: string;
  category: NotificationCategory;
  title: string;
  body?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationResult {
  delivered: boolean;
  deliveredAt?: string;
  error?: string;
}

export interface NotificationChannelMetadata {
  pluginType: 'notification';
  name: string;
  version: string;
  contractVersion: typeof NOTIFICATION_CONTRACT_VERSION;
  channelType: string;
}

export interface INotificationChannel {
  readonly metadata: NotificationChannelMetadata;

  /**
   * Deliver a notification to the user via this channel.
   * Must be idempotent — safe to retry on network errors.
   */
  deliver(payload: NotificationPayload): Promise<NotificationResult>;

  /**
   * Health check.
   */
  getHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; latencyMs?: number }>;
}
