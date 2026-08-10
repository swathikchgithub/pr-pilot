import { QueryService } from "./query.service";
import { ReposService } from "../repos/repos.service";
import { EmbeddingService } from "../retrieval/embedding.service";
import { HybridSearchService } from "../retrieval/hybrid-search.service";
import { RerankService } from "../retrieval/rerank.service";
import { GenerationService } from "../retrieval/generation.service";
import { AuditService } from "../audit/audit.service";
import type { OrgContext } from "../common/org-context";

const CTX: OrgContext = { orgId: "org_1", apiKeyId: "key_1", userId: null, role: null, email: null };

function buildService() {
  const reposService = { getReadyOrThrow: jest.fn().mockResolvedValue({ id: "repo_1" }) };
  const embeddingService = { embed: jest.fn().mockResolvedValue([0.1, 0.2]) };
  const hybridSearch = { search: jest.fn().mockResolvedValue([{ id: "chunk_1" }]) };
  const rerankService = { rerank: jest.fn().mockResolvedValue([{ id: "chunk_1" }]) };
  const generationService = {
    answer: jest.fn().mockResolvedValue({ answer: "It uses RRF.", citations: [{ chunkId: "chunk_1" }] }),
  };
  const auditService = { record: jest.fn().mockResolvedValue("audit_1") };

  const service = new QueryService(
    reposService as unknown as ReposService,
    embeddingService as unknown as EmbeddingService,
    hybridSearch as unknown as HybridSearchService,
    rerankService as unknown as RerankService,
    generationService as unknown as GenerationService,
    auditService as unknown as AuditService,
  );

  return { service, reposService, embeddingService, hybridSearch, rerankService, generationService, auditService };
}

describe("QueryService", () => {
  it("orchestrates retrieval, reranking, generation, and audit logging in order", async () => {
    const { service, reposService, hybridSearch, rerankService, generationService, auditService } = buildService();

    const result = await service.run(CTX, { repoId: "repo_1", question: "How does search work?" });

    expect(reposService.getReadyOrThrow).toHaveBeenCalledWith("org_1", "repo_1");
    expect(hybridSearch.search).toHaveBeenCalledWith("repo_1", "How does search work?", [0.1, 0.2], 20);
    expect(rerankService.rerank).toHaveBeenCalled();
    expect(generationService.answer).toHaveBeenCalled();
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: "org_1", repoId: "repo_1", eventType: "QUERY", ctx: CTX }),
    );
    expect(result).toEqual({ answer: "It uses RRF.", citations: [{ chunkId: "chunk_1" }], auditLogId: "audit_1" });
  });

  it("respects a custom matchCount", async () => {
    const { service, hybridSearch } = buildService();
    await service.run(CTX, { repoId: "repo_1", question: "q", matchCount: 40 });
    expect(hybridSearch.search).toHaveBeenCalledWith("repo_1", "q", [0.1, 0.2], 40);
  });
});
