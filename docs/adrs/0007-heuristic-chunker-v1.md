# ADR 0007: Heuristic structural chunker for v1, not tree-sitter

## Status
Accepted — explicit upgrade path to v2

## Context
"AST-aware chunking" is a core positioning claim: splitting code by function/class
boundaries instead of arbitrary character windows meaningfully improves retrieval
precision. A real parser (tree-sitter, per-language grammars) is the textbook way to do
this correctly across many languages.

## Decision
Ship v1 with a **regex + brace/indentation-depth heuristic** chunker
(`structural-chunker.ts`): pattern-match function/class/method declarations, then find
the end of the block by counting `{`/`}` depth (brace languages) or indentation
(Python). Classes recurse into their own body to also chunk methods individually.
Files with no detected symbols fall back to fixed-size overlapping windows.

## Consequences
- No native/WASM parser dependency, no per-language grammar bundling, no risk of
  parser-version drift across languages — the worker stays a plain Node service
  deployable anywhere.
- Documented, tested limitations: no string/comment-aware brace counting (a `{`
  inside a string literal is still counted), and free-standing top-level statements
  between symbols aren't separately indexed. Both are covered by
  `structural-chunker.test.ts`, including a regression test proving control-flow
  blocks (`if`/`for`/`while`) aren't misidentified as method definitions.
- **v2 upgrade path**: swap `structural-chunker.ts`'s brace/Python paths for
  `web-tree-sitter` (WASM grammars, no native compilation) behind the same
  `chunkFile(filename, content): ExtractedChunk[]` signature — the rest of the
  ingestion pipeline (embedding, persistence, hybrid search) doesn't need to change.
