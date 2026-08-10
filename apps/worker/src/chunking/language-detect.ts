export type LanguageFamily = "brace" | "python" | "unknown";

const BRACE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".go", ".java", ".c", ".h", ".cpp", ".hpp", ".cs", ".php", ".kt", ".swift", ".scala", ".rs",
]);

const PYTHON_EXTENSIONS = new Set([".py"]);

export function detectLanguageFamily(filename: string): LanguageFamily {
  const extension = filename.slice(filename.lastIndexOf("."));
  if (BRACE_EXTENSIONS.has(extension)) return "brace";
  if (PYTHON_EXTENSIONS.has(extension)) return "python";
  return "unknown";
}
