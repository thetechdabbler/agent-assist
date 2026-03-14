/**
 * Renderer Plugin Contract — Version 1.0
 *
 * Constitution reference: Principle III (Structured Payloads)
 * Renderers MUST NOT execute agent-supplied code.
 */

export const RENDERER_CONTRACT_VERSION = '1.0' as const;

export type SupportedMessageType =
  | 'text'
  | 'table'
  | 'chart'
  | 'file'
  | 'image'
  | 'form_request'
  | 'error'
  | 'goal_update'
  | 'job_status'
  | 'file_reference'
  | 'image_reference'
  | 'action_card'
  | 'status_card'
  | string;

export interface RendererMetadata {
  pluginType: 'renderer';
  name: string;
  version: string;
  contractVersion: typeof RENDERER_CONTRACT_VERSION;
  supportedTypes: SupportedMessageType[];
}

/**
 * All renderer plugins must implement this interface.
 * Renderers receive validated, sanitized payloads — never raw agent output.
 */
export interface IRenderer {
  readonly metadata: RendererMetadata;

  /**
   * Returns true if this renderer can handle the given message type.
   */
  canRender(type: SupportedMessageType): boolean;

  /**
   * Validate the payload shape for the given type.
   * Returns an error string if invalid, null if valid.
   */
  validatePayload(type: SupportedMessageType, payload: unknown): string | null;
}
