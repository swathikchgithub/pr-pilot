import { Module } from "@nestjs/common";
import { EmbeddingService } from "./embedding.service";
import { HybridSearchService } from "./hybrid-search.service";
import { RerankService } from "./rerank.service";
import { GenerationService } from "./generation.service";

@Module({
  providers: [EmbeddingService, HybridSearchService, RerankService, GenerationService],
  exports: [EmbeddingService, HybridSearchService, RerankService, GenerationService],
})
export class RetrievalModule {}
