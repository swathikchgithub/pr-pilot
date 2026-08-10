import type { Citation } from "./chunk";

export interface QueryRequest {
  repoId: string;
  question: string;
  /** Max chunks to retrieve before reranking. Defaults to 20. */
  matchCount?: number;
}

export interface QueryResponse {
  answer: string;
  citations: Citation[];
  auditLogId: string;
}
