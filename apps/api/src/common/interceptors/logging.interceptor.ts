import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import type { Request } from "express";
import { Observable, tap } from "rxjs";

/** Logs method, path, status, and latency for every request. Never logs bodies, headers, or secrets. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.log(request, start),
        error: () => this.log(request, start),
      }),
    );
  }

  private log(request: Request, start: number): void {
    const durationMs = Date.now() - start;
    this.logger.log(`${request.method} ${request.originalUrl} ${durationMs}ms`);
  }
}
