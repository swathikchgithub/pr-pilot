export interface CodeChunk {
  id: string;
  repoId: string;
  filename: string;
  startLine: number;
  endLine: number;
  content: string;
  symbolKind: "function" | "class" | "method" | "window" | null;
  symbolName: string | null;
}

export interface Citation {
  chunkId: string;
  filename: string;
  startLine: number;
  endLine: number;
  score: number;
}
