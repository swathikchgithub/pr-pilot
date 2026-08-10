import { Injectable } from "@nestjs/common";
import type { ImpactAnalysisResponse } from "@pr-pilot/types";
import { ReposService } from "../repos/repos.service";
import { EmbeddingService } from "../retrieval/embedding.service";
import { HybridSearchService } from "../retrieval/hybrid-search.service";
import { RerankService } from "../retrieval/rerank.service";
import { AuditService } from "../audit/audit.service";
import type { OrgContext } from "../common/org-context";
import { extractChangedFiles } from "./diff-parser.util";
import { ImpactGenerationService } from "./impact-generation.service";
import type { ImpactAnalysisDto } from "./dto/impact-analysis.dto";

const CANDIDATE_MATCH_COUNT = 30;
const RERANK_TOP_N = 12;

@Injectable()
export class ImpactService {
  constructor(
    private readonly reposService: ReposService,
    private readonly embeddingService: EmbeddingService,
    private readonly hybridSearch: HybridSearchService,
    private readonly rerankService: RerankService,
    private readonly impactGeneration: ImpactGenerationService,
    private readonly auditService: AuditService,
  ) {}

  async run(ctx: OrgContext, dto: ImpactAnalysisDto): Promise<ImpactAnalysisResponse> {
    const repo = await this.reposService.getReadyOrThrow(ctx.orgId, dto.repoId);
    const changedFiles = extractChangedFiles(dto.diff);

    const embedding = await this.embeddingService.embed(dto.diff);
    const candidates = await this.hybridSearch.search(repo.id, dto.diff, embedding, CANDIDATE_MATCH_COUNT);
    const reranked = await this.rerankService.rerank(dto.diff, candidates, RERANK_TOP_N);

    const analysis = await this.impactGeneration.analyze(dto.diff, changedFiles, reranked);

    const auditLogId = await this.auditService.record({
      orgId: ctx.orgId,
      repoId: repo.id,
      ctx,
      eventType: "IMPACT_ANALYSIS",
      input: dto.diff,
      output: analysis.summary,
      citations: analysis.affectedChunks.map((c) => ({
        chunkId: c.chunkId,
        filename: c.filename,
        startLine: c.startLine,
        endLine: c.endLine,
        score: c.relatedness,
      })),
    });

    return { ...analysis, auditLogId };
  }
}
