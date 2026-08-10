import { describe, expect, it, vi } from "vitest";
import { PrPilotClient } from "./client";
import { PrPilotApiError } from "./errors";

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

describe("PrPilotClient", () => {
  it("throws when constructed without an apiKey", () => {
    expect(() => new PrPilotClient({ apiKey: "" })).toThrow(/apiKey/);
  });

  it("sends the API key as a bearer token and returns the parsed body", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, { answer: "It uses RRF.", citations: [], auditLogId: "log_1" }),
    );
    const client = new PrPilotClient({ apiKey: "key_test", fetchImpl, baseUrl: "https://api.test" });

    const result = await client.query({ repoId: "repo_1", question: "How does search work?" });

    expect(result.answer).toBe("It uses RRF.");
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.test/v1/query");
    expect(init.headers.Authorization).toBe("Bearer key_test");
  });

  it("retries on 503 and eventually succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { statusCode: 503, error: "Service Unavailable", message: "busy" }))
      .mockResolvedValueOnce(jsonResponse(200, { id: "repo_1" }));
    const client = new PrPilotClient({
      apiKey: "key_test",
      fetchImpl,
      baseUrl: "https://api.test",
      maxRetries: 2,
    });

    const repo = await client.getRepo("repo_1");

    expect(repo).toEqual({ id: "repo_1" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("throws PrPilotApiError with the response body on a non-retryable 4xx", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(403, { statusCode: 403, error: "Forbidden", message: "repo not owned by org" }));
    const client = new PrPilotClient({ apiKey: "key_test", fetchImpl, baseUrl: "https://api.test" });

    await expect(client.getRepo("repo_1")).rejects.toMatchObject({
      statusCode: 403,
      message: "repo not owned by org",
    });
    await expect(client.getRepo("repo_1")).rejects.toBeInstanceOf(PrPilotApiError);
  });

  it("gives up after maxRetries and surfaces the last error", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(429, { statusCode: 429, error: "Too Many Requests", message: "slow down" }));
    const client = new PrPilotClient({ apiKey: "key_test", fetchImpl, baseUrl: "https://api.test", maxRetries: 1 });

    await expect(client.listRepos()).rejects.toMatchObject({ statusCode: 429 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
