import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { SessionTokenService } from "../token/session-token.service";
import { ApiKeyAuthService } from "../api-key-auth/api-key-auth.service";
import { looksLikeApiKey } from "../api-key-auth/api-key-crypto.util";
import type { OrgContext } from "../org-context";

export const SESSION_COOKIE_NAME = "pr_pilot_session";

/**
 * Accepts either a dashboard session cookie (human users) or a `prp_...`
 * API key bearer token (agents/CI), and normalizes both into `req.orgContext`.
 */
@Injectable()
export class OrgAuthGuard implements CanActivate {
  constructor(
    private readonly sessionTokens: SessionTokenService,
    private readonly apiKeyAuth: ApiKeyAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { orgContext: OrgContext }>();

    const sessionCookie = request.cookies?.[SESSION_COOKIE_NAME];
    if (sessionCookie) {
      const payload = this.sessionTokens.verify(sessionCookie);
      if (payload) {
        request.orgContext = {
          orgId: payload.orgId,
          userId: payload.sub,
          role: payload.role,
          email: payload.email,
          apiKeyId: null,
        };
        return true;
      }
    }

    const bearer = this.extractBearer(request);
    if (bearer && looksLikeApiKey(bearer)) {
      const principal = await this.apiKeyAuth.validate(bearer);
      request.orgContext = {
        orgId: principal.orgId,
        apiKeyId: principal.apiKeyId,
        userId: null,
        role: null,
        email: null,
      };
      return true;
    }

    throw new UnauthorizedException("Missing or invalid credentials");
  }

  private extractBearer(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) return null;
    return header.slice("Bearer ".length);
  }
}
