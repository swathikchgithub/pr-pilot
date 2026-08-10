import { PrPilotApiError } from "./errors";
import type { ApiErrorBody } from "@pr-pilot/types";

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

export interface RequestOptions {
  method: "GET" | "POST" | "DELETE";
  path: string;
  body?: unknown;
}

export interface HttpClientConfig {
  apiKey: string;
  baseUrl: string;
  fetchImpl: typeof fetch;
  maxRetries: number;
}

/** Sleeps for `ms` milliseconds. Extracted so tests can stub it out. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelayMs(attempt: number, retryAfterHeader: string | null): number {
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (!Number.isNaN(seconds)) return seconds * 1000;
  }
  const base = 250 * 2 ** attempt;
  const jitter = Math.random() * 100;
  return base + jitter;
}

export async function request<T>(config: HttpClientConfig, opts: RequestOptions): Promise<T> {
  const url = `${config.baseUrl}${opts.path}`;
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    let response: Response;
    try {
      response = await config.fetchImpl(url, {
        method: opts.method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });
    } catch (err) {
      lastError = err;
      if (attempt < config.maxRetries) {
        await sleep(backoffDelayMs(attempt, null));
        continue;
      }
      throw err;
    }

    if (response.ok) {
      return (await response.json()) as T;
    }

    if (RETRYABLE_STATUS.has(response.status) && attempt < config.maxRetries) {
      await sleep(backoffDelayMs(attempt, response.headers.get("Retry-After")));
      continue;
    }

    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new PrPilotApiError(response.status, body);
  }

  throw lastError instanceof Error ? lastError : new Error("PR-Pilot request failed");
}
