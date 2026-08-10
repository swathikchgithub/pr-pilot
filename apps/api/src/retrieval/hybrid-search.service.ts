import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { toVectorLiteral } from "./vector-literal.util";
import type { RetrievedChunk } from "./retrieval.types";

interface HybridSearchRow {
  id: string;
  filename: string;
  start_line: number;
  end_line: number;
  content: string;
  symbol_kind: string | null;
  symbol_name: string | null;
  score: number;
}

@Injectable()
export class HybridSearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Vector similarity + full-text search merged via Reciprocal Rank Fusion,
   * computed inside Postgres by the `match_code_chunks_hybrid` function.
   * Time: O(n log n) for the two ORDER BY scans inside Postgres (index-assisted).
   */
  async search(repoId: string, queryText: string, queryEmbedding: number[], matchCount = 20): Promise<RetrievedChunk[]> {
    const vectorLiteral = toVectorLiteral(queryEmbedding);

    const rows = await this.prisma.$queryRaw<HybridSearchRow[]>`
      SELECT * FROM match_code_chunks_hybrid(
        ${repoId},
        ${queryText},
        ${vectorLiteral}::vector,
        ${matchCount},
        60
      )
    `;

    return rows.map((row) => ({
      id: row.id,
      filename: row.filename,
      startLine: row.start_line,
      endLine: row.end_line,
      content: row.content,
      symbolKind: row.symbol_kind,
      symbolName: row.symbol_name,
      score: row.score,
    }));
  }
}
