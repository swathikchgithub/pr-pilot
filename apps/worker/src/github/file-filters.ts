const CODE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".go", ".java", ".rb", ".rs", ".c", ".h", ".cpp", ".hpp",
  ".cs", ".php", ".kt", ".swift", ".scala",
]);

const EXCLUDED_PATH_SEGMENTS = [
  "node_modules/", "/dist/", "/build/", "/.next/", "/vendor/",
  "/target/", "/.git/", "/coverage/", "/__pycache__/", "/.venv/",
];

const MAX_FILE_SIZE_BYTES = 500_000;

export interface GithubTreeEntry {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

export function isIngestableFile(entry: GithubTreeEntry): boolean {
  if (entry.type !== "blob") return false;
  if (entry.size !== undefined && entry.size > MAX_FILE_SIZE_BYTES) return false;

  const path = `/${entry.path}`;
  if (EXCLUDED_PATH_SEGMENTS.some((segment) => path.includes(segment))) return false;

  const extension = entry.path.slice(entry.path.lastIndexOf("."));
  return CODE_EXTENSIONS.has(extension);
}
