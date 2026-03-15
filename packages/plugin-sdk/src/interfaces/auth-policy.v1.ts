/**
 * Auth Policy Contract — Version 1.0
 *
 * Custom authorization policies for tenant-specific access control rules.
 * All built-in authz is handled by middleware; this interface extends with tenant overrides.
 */

export const AUTH_POLICY_CONTRACT_VERSION = '1.0' as const;

export interface AuthPolicyMetadata {
  pluginType: 'auth_policy';
  name: string;
  version: string;
  contractVersion: typeof AUTH_POLICY_CONTRACT_VERSION;
}

export interface AuthContext {
  userId: string;
  tenantId: string;
  resourceType: string;
  resourceId: string;
  action: 'read' | 'write' | 'delete' | 'admin';
}

export interface AuthDecision {
  allowed: boolean;
  reason?: string;
}

export interface IAuthPolicy {
  readonly metadata: AuthPolicyMetadata;

  /**
   * Evaluate whether the authenticated context is allowed to perform the action.
   * Returning allowed=false will result in a 403 response.
   */
  evaluate(ctx: AuthContext): Promise<AuthDecision>;
}
