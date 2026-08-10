const GITHUB_URL_PATTERN = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(\.git)?\/?$/;

export function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  const match = GITHUB_URL_PATTERN.exec(url.trim());
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}
