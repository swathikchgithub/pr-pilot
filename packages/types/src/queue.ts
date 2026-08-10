export const INGEST_QUEUE_NAME = "repo-ingestion";

export interface IngestJobPayload {
  repoId: string;
  orgId: string;
  githubUrl: string;
  defaultBranch: string;
}
