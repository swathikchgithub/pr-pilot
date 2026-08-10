import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Response } from "express";
import type { ApiErrorBody } from "@pr-pilot/types";

/** Normalizes every thrown error into a consistent shape and never leaks stack traces to clients. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { statusCode, error, message } = this.normalize(exception);

    if (statusCode >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    const body: ApiErrorBody = { statusCode, error, message };
    response.status(statusCode).json(body);
  }

  private normalize(exception: unknown): { statusCode: number; error: string; message: string | string[] } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === "object" && payload !== null && "message" in payload) {
        const p = payload as { message: string | string[]; error?: string };
        return { statusCode, error: p.error ?? exception.name, message: p.message };
      }
      return { statusCode, error: exception.name, message: exception.message };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    };
  }
}
