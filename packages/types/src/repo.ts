export type RepoStatus = "PENDING" | "INDEXING" | "READY" | "FAILED";

export interface Repo {
  id: string;
  orgId: string;
  githubUrl: string;
  defaultBranch: string;
  status: RepoStatus;
  chunkCount: number;
  lastIndexedAt: string | null;
  lastError: string | null;
  createdAt: string;
}

export interface CreateRepoRequest {
  githubUrl: string;
  defaultBranch?: string;
}
