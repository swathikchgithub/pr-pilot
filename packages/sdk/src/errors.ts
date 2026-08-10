import type { ApiErrorBody } from "@pr-pilot/types";

export class PrPilotApiError extends Error {
  readonly statusCode: number;
  readonly body: ApiErrorBody | null;

  constructor(statusCode: number, body: ApiErrorBody | null) {
    const message = body
      ? Array.isArray(body.message)
        ? body.message.join("; ")
        : body.message
      : `PR-Pilot API request failed with status ${statusCode}`;
    super(message);
    this.name = "PrPilotApiError";
    this.statusCode = statusCode;
    this.body = body;
  }
}
