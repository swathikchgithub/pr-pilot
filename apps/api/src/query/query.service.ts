import { Injectable } from "@nestjs/common";
import type { QueryResponse } from "@pr-pilot/types";
import { ReposService } from "../repos/repos.service";
import { EmbeddingService } from "../retrieval/embedding.service";
import { HybridSearchService } from "../retrieval/hybrid-search.service";
import { RerankService } from "../retrieval/rerank.service";
import { GenerationService } from "../retrieval/generation.service";
import { AuditService } from "../audit/audit.service";
import type { OrgContext } from "../common/org-context";
import type { QueryDto } from "./dto/query.dto";

const RERANK_TOP_N = 8;

@Injectable()
export class QueryService {
  constructor(
    private readonly reposService: ReposService,
    private readonly embeddingService: EmbeddingService,
    private readonly hybridSearch: HybridSearchService,
    private readonly rerankService: RerankService,
    private readonly generationService: GenerationService,
    private readonly auditService: AuditService,
  ) {}

  async run(ctx: OrgContext, dto: QueryDto): Promise<QueryResponse> {
    const repo = await this.reposService.getReadyOrThrow(ctx.orgId, dto.repoId);

    const embedding = await this.embeddingService.embed(dto.question);
    const retrieved = await this.hybridSearch.search(repo.id, dto.question, embedding, dto.matchCount ?? 20);
    const reranked = await this.rerankService.rerank(dto.question, retrieved, RERANK_TOP_N);
    const { answer, citations } = await this.generationService.answer(dto.question, reranked);

    const auditLogId = await this.auditService.record({
      orgId: ctx.orgId,
      repoId: repo.id,
      ctx,
      eventType: "QUERY",
      input: dto.question,
      output: answer,
      citations,
    });

    return { answer, citations, auditLogId };
  }
}
