const DIFF_FILE_HEADER_PATTERN = /^\+\+\+ b\/(.+)$/;

/**
 * Extracts the set of changed filenames from a unified diff.
 * Time: O(n) over the diff's lines. Space: O(f) for the distinct filenames.
 */
export function extractChangedFiles(diff: string): string[] {
  const files = new Set<string>();
  for (const line of diff.split("\n")) {
    const match = DIFF_FILE_HEADER_PATTERN.exec(line);
    if (match) {
      files.add(match[1].trim());
    }
  }
  return [...files];
}
