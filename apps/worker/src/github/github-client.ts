import type { GithubTreeEntry } from "./file-filters";

const GITHUB_API_BASE = "https://api.github.com";
const RATE_LIMIT_MAX_RETRIES = 2;

export class GithubApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GithubApiError";
  }
}

export class GithubClient {
  constructor(private readonly token: string | null) {}

  async fetchTree(owner: string, repo: string, branch: string): Promise<GithubTreeEntry[]> {
    const body = await this.request<{ tree: GithubTreeEntry[]; truncated: boolean }>(
      `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    );
    return body.tree;
  }

  async fetchBlobContent(owner: string, repo: string, sha: string): Promise<string> {
    const body = await this.request<{ content: string; encoding: string }>(
      `/repos/${owner}/${repo}/git/blobs/${sha}`,
    );
    return Buffer.from(body.content, body.encoding as BufferEncoding).toString("utf-8");
  }

  private async request<T>(path: string, attempt = 0): Promise<T> {
    const response = await fetch(`${GITHUB_API_BASE}${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
    });

    if (response.status === 403 && attempt < RATE_LIMIT_MAX_RETRIES) {
      const resetAt = Number(response.headers.get("x-ratelimit-reset") ?? 0) * 1000;
      const waitMs = Math.max(resetAt - Date.now(), 1000);
      await new Promise((resolve) => setTimeout(resolve, Math.min(waitMs, 30_000)));
      return this.request<T>(path, attempt + 1);
    }

    if (!response.ok) {
      throw new GithubApiError(`GitHub API request to ${path} failed with ${response.status}`, response.status);
    }

    return (await response.json()) as T;
  }
}
