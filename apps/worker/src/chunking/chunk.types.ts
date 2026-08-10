export interface ExtractedChunk {
  startLine: number;
  endLine: number;
  content: string;
  symbolKind: "function" | "class" | "method" | "window";
  symbolName: string | null;
}
