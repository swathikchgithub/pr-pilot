import type {
  CreateRepoRequest,
  ImpactAnalysisRequest,
  ImpactAnalysisResponse,
  QueryRequest,
  QueryResponse,
  Repo,
} from "@pr-pilot/types";
import { request, type HttpClientConfig } from "./http";

export interface PrPilotClientOptions {
  /** An org-scoped API key created from the PR-Pilot dashboard. */
  apiKey: string;
  /** Defaults to the hosted PR-Pilot API. */
  baseUrl?: string;
  /** Injectable for testing / non-global fetch environments. */
  fetchImpl?: typeof fetch;
  /** Retries on 429/502/503/504 and network errors. Defaults to 3. */
  maxRetries?: number;
}

/**
 * Client for AI coding agents and CI pipelines to pull grounded, cited
 * code context and run pre-merge impact analysis against an indexed repo.
 */
export class PrPilotClient {
  private readonly config: HttpClientConfig;

  constructor(options: PrPilotClientOptions) {
    if (!options.apiKey) {
      throw new Error("PrPilotClient requires an apiKey");
    }
    this.config = {
      apiKey: options.apiKey,
      baseUrl: options.baseUrl ?? "https://api.pr-pilot.dev",
      fetchImpl: options.fetchImpl ?? fetch,
      maxRetries: options.maxRetries ?? 3,
    };
  }

  /** Retrieves a cited, grounded answer to a question about an indexed repo. */
  query(req: QueryRequest): Promise<QueryResponse> {
    return request<QueryResponse>(this.config, {
      method: "POST",
      path: "/v1/query",
      body: req,
    });
  }

  /** Runs blast-radius impact analysis on a unified diff before merge. */
  impactAnalysis(req: ImpactAnalysisRequest): Promise<ImpactAnalysisResponse> {
    return request<ImpactAnalysisResponse>(this.config, {
      method: "POST",
      path: "/v1/impact-analysis",
      body: req,
    });
  }

  listRepos(): Promise<Repo[]> {
    return request<Repo[]>(this.config, { method: "GET", path: "/v1/repos" });
  }

  getRepo(repoId: string): Promise<Repo> {
    return request<Repo>(this.config, { method: "GET", path: `/v1/repos/${repoId}` });
  }

  createRepo(req: CreateRepoRequest): Promise<Repo> {
    return request<Repo>(this.config, { method: "POST", path: "/v1/repos", body: req });
  }
}
