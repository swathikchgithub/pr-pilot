import type { Citation } from "./chunk";

export type AuditEventType = "QUERY" | "IMPACT_ANALYSIS";

export interface AuditLogEntry {
  id: string;
  orgId: string;
  repoId: string;
  apiKeyId: string | null;
  userId: string | null;
  eventType: AuditEventType;
  input: string;
  output: string;
  citations: Citation[];
  createdAt: string;
}

export interface ListAuditLogParams {
  repoId?: string;
  eventType?: AuditEventType;
  cursor?: string;
  limit?: number;
}

export interface ListAuditLogResponse {
  items: AuditLogEntry[];
  nextCursor: string | null;
}
