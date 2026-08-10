export interface RetrievedChunk {
  id: string;
  filename: string;
  startLine: number;
  endLine: number;
  content: string;
  symbolKind: string | null;
  symbolName: string | null;
  score: number;
}
