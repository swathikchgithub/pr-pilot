import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { OrgAuthGuard } from "./org-auth.guard";
import { SessionTokenService } from "../token/session-token.service";
import { ApiKeyAuthService } from "../api-key-auth/api-key-auth.service";

function mockContext(req: Partial<Record<string, unknown>>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe("OrgAuthGuard", () => {
  it("authenticates via a valid session cookie", async () => {
    const sessionTokens = {
      verify: jest.fn().mockReturnValue({ sub: "user_1", orgId: "org_1", role: "OWNER", email: "a@acme.com" }),
    };
    const apiKeyAuth = { validate: jest.fn() };
    const guard = new OrgAuthGuard(sessionTokens as unknown as SessionTokenService, apiKeyAuth as unknown as ApiKeyAuthService);
    const req: Record<string, unknown> = { cookies: { pr_pilot_session: "valid.jwt" }, headers: {} };

    const result = await guard.canActivate(mockContext(req));

    expect(result).toBe(true);
    expect(req.orgContext).toEqual({
      orgId: "org_1",
      userId: "user_1",
      role: "OWNER",
      email: "a@acme.com",
      apiKeyId: null,
    });
    expect(apiKeyAuth.validate).not.toHaveBeenCalled();
  });

  it("falls back to an API key bearer token when there is no valid cookie", async () => {
    const sessionTokens = { verify: jest.fn().mockReturnValue(null) };
    const apiKeyAuth = { validate: jest.fn().mockResolvedValue({ orgId: "org_1", apiKeyId: "key_1" }) };
    const guard = new OrgAuthGuard(sessionTokens as unknown as SessionTokenService, apiKeyAuth as unknown as ApiKeyAuthService);
    const req: Record<string, unknown> = { cookies: {}, headers: { authorization: "Bearer prp_secret" } };

    const result = await guard.canActivate(mockContext(req));

    expect(result).toBe(true);
    expect(req.orgContext).toEqual({ orgId: "org_1", apiKeyId: "key_1", userId: null, role: null, email: null });
  });

  it("rejects requests with neither a valid cookie nor an API key", async () => {
    const sessionTokens = { verify: jest.fn().mockReturnValue(null) };
    const apiKeyAuth = { validate: jest.fn() };
    const guard = new OrgAuthGuard(sessionTokens as unknown as SessionTokenService, apiKeyAuth as unknown as ApiKeyAuthService);
    const req: Record<string, unknown> = { cookies: {}, headers: {} };

    await expect(guard.canActivate(mockContext(req))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
