/**
 * Plugin SDK — Version 1.0
 *
 * Versioned interfaces for all five plugin categories.
 * Breaking changes require a MAJOR version bump and a new interface file.
 *
 * Constitution reference: Principle II (Pluggable Architecture)
 */

export * from './interfaces/agent-adapter.v1';
export * from './interfaces/event-bus.v1';
export * from './interfaces/renderer.v1';
export {
  NOTIFICATION_CONTRACT_VERSION,
  type NotificationPayload,
  type NotificationResult,
  type NotificationChannelMetadata,
  type INotificationChannel,
} from './interfaces/notification.v1';
export * from './interfaces/storage.v1';
export * from './interfaces/auth-policy.v1';
