export interface ImpactAnalysisRequest {
  repoId: string;
  /** Unified diff text of the proposed change. */
  diff: string;
}

export interface AffectedChunk {
  chunkId: string;
  filename: string;
  startLine: number;
  endLine: number;
  reason: string;
  relatedness: number;
}

export interface ImpactAnalysisResponse {
  summary: string;
  riskLevel: "low" | "medium" | "high";
  affectedChunks: AffectedChunk[];
  suggestedTests: string[];
  auditLogId: string;
}
