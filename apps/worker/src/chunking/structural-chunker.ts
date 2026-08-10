import { detectLanguageFamily } from "./language-detect";
import type { ExtractedChunk } from "./chunk.types";

// v1 chunker: regex + brace/indent-depth heuristics, not a real parser.
// It captures top-level functions/classes/methods; free-standing top-level
// statements between symbols aren't separately indexed. Deliberately avoids
// pulling in a full parser (tree-sitter et al.) for v1 — see ADR 0006 for the
// tradeoff and the upgrade path.

const WINDOW_SIZE = 60;
const WINDOW_OVERLAP = 10;
const CONTROL_FLOW_BLACKLIST = new Set(["if", "for", "while", "switch", "catch", "return", "else", "do", "try"]);

interface DefinitionPattern {
  regex: RegExp;
  kind: "function" | "class" | "method";
}

const BRACE_PATTERNS: DefinitionPattern[] = [
  { regex: /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s+([A-Za-z0-9_$]+)/, kind: "function" },
  { regex: /^\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z0-9_$]+)/, kind: "class" },
  {
    regex: /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*(?::\s*[^=]+)?=>/,
    kind: "function",
  },
  { regex: /^\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z0-9_]+)\s*\(/, kind: "function" },
  { regex: /^\s*(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z0-9_]+)\s*[<(]/, kind: "function" },
  {
    // Class/object methods, with or without access modifiers (e.g. `login(username) {`
    // as well as `public async login(username) {`). The control-flow blacklist below
    // keeps this from misfiring on `if (x) {` / `for (...) {` / etc.
    regex: /^\s*(?:(?:public|private|protected|static|async|override|abstract|readonly|get|set)\s+)*([A-Za-z0-9_$]+)\s*\([^)]*\)\s*(?::\s*[^{;]+)?\s*\{\s*$/,
    kind: "method",
  },
];

const PYTHON_DEF_PATTERN = /^(\s*)(?:async\s+)?(def|class)\s+([A-Za-z0-9_]+)/;

export function chunkFile(filename: string, content: string): ExtractedChunk[] {
  const lines = content.split("\n");
  const family = detectLanguageFamily(filename);

  const symbolChunks = family === "python" ? extractPythonSymbols(lines) : family === "brace" ? extractBraceSymbols(lines) : [];

  return symbolChunks.length > 0 ? symbolChunks : windowChunks(lines);
}

function matchDefinition(line: string): { kind: "function" | "class" | "method"; name: string } | null {
  for (const pattern of BRACE_PATTERNS) {
    const match = pattern.regex.exec(line);
    if (match && !CONTROL_FLOW_BLACKLIST.has(match[1])) {
      return { kind: pattern.kind, name: match[1] };
    }
  }
  return null;
}

/**
 * Time: O(n · d) where n is the file's character count and d is the max class
 * nesting depth — each nesting level rescans its own body once to find methods
 * declared inside it. d is small in practice (classes are rarely nested more
 * than 1-2 levels), so this is near-linear for real-world files.
 */
function extractBraceSymbols(lines: string[]): ExtractedChunk[] {
  const chunks: ExtractedChunk[] = [];
  let i = 0;

  while (i < lines.length) {
    const match = matchDefinition(lines[i]);
    if (!match) {
      i++;
      continue;
    }
    const endIdx = findBraceBlockEnd(lines, i);
    chunks.push({
      startLine: i + 1,
      endLine: endIdx + 1,
      content: lines.slice(i, endIdx + 1).join("\n"),
      symbolKind: match.kind,
      symbolName: match.name,
    });

    // Classes get their methods indexed as their own chunks too (better
    // retrieval granularity), in addition to the whole-class chunk above.
    if (match.kind === "class" && endIdx > i + 1) {
      const innerLines = lines.slice(i + 1, endIdx);
      for (const inner of extractBraceSymbols(innerLines)) {
        chunks.push({ ...inner, startLine: inner.startLine + i + 1, endLine: inner.endLine + i + 1 });
      }
    }

    i = endIdx + 1;
  }

  return chunks;
}

function findBraceBlockEnd(lines: string[], startIdx: number): number {
  let depth = 0;
  let seenOpen = false;

  for (let i = startIdx; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === "{") {
        depth++;
        seenOpen = true;
      } else if (ch === "}") {
        depth--;
      }
    }
    if (seenOpen && depth <= 0) return i;
  }

  return seenOpen ? lines.length - 1 : startIdx;
}

/** Time: O(n) over the file's lines. */
function extractPythonSymbols(lines: string[]): ExtractedChunk[] {
  const chunks: ExtractedChunk[] = [];
  let i = 0;

  while (i < lines.length) {
    const match = PYTHON_DEF_PATTERN.exec(lines[i]);
    if (!match) {
      i++;
      continue;
    }
    const [, indent, keyword, name] = match;
    const baseIndent = indent.length;
    let end = i;

    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j];
      if (line.trim() === "") continue; // blank lines don't end the block, but don't extend it either
      const lineIndent = line.length - line.trimStart().length;
      if (lineIndent <= baseIndent) break;
      end = j;
    }

    chunks.push({
      startLine: i + 1,
      endLine: end + 1,
      content: lines.slice(i, end + 1).join("\n"),
      symbolKind: keyword === "class" ? "class" : "function",
      symbolName: name,
    });
    i = end + 1;
  }

  return chunks;
}

/** Fallback for files with no detected symbols. Time: O(n) over the file's lines. */
function windowChunks(lines: string[]): ExtractedChunk[] {
  if (lines.length === 0 || (lines.length === 1 && lines[0] === "")) return [];

  const chunks: ExtractedChunk[] = [];
  const step = WINDOW_SIZE - WINDOW_OVERLAP;
  let start = 0;

  while (start < lines.length) {
    const end = Math.min(start + WINDOW_SIZE, lines.length) - 1;
    chunks.push({
      startLine: start + 1,
      endLine: end + 1,
      content: lines.slice(start, end + 1).join("\n"),
      symbolKind: "window",
      symbolName: null,
    });
    if (end === lines.length - 1) break;
    start += step;
  }

  return chunks;
}
