import * as bcrypt from "bcryptjs";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { SessionTokenService } from "../common/token/session-token.service";

function buildService() {
  const prisma = {
    user: { findUnique: jest.fn() },
    organization: { findUnique: jest.fn(), create: jest.fn() },
  };
  const sessionTokens = { sign: jest.fn().mockReturnValue("signed.jwt.token") };
  const service = new AuthService(prisma as unknown as PrismaService, sessionTokens as unknown as SessionTokenService);
  return { service, prisma, sessionTokens };
}

describe("AuthService", () => {
  describe("register", () => {
    it("rejects when the email is already taken", async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({ id: "user_1" });

      await expect(
        service.register({ email: "a@acme.com", password: "supersecret1", orgName: "Acme" }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("creates an org + OWNER user and returns a signed session", async () => {
      const { service, prisma, sessionTokens } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.organization.findUnique.mockResolvedValue(null);
      prisma.organization.create.mockResolvedValue({
        id: "org_1",
        users: [{ id: "user_1", email: "a@acme.com", role: "OWNER" }],
      });

      const result = await service.register({ email: "a@acme.com", password: "supersecret1", orgName: "Acme Corp" });

      expect(prisma.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: "acme-corp" }),
        }),
      );
      expect(sessionTokens.sign).toHaveBeenCalledWith({
        sub: "user_1",
        orgId: "org_1",
        role: "OWNER",
        email: "a@acme.com",
      });
      expect(result.token).toBe("signed.jwt.token");
      expect(result.session.user.orgId).toBe("org_1");
    });
  });

  describe("login", () => {
    it("rejects an unknown email", async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login({ email: "nope@acme.com", password: "x" })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it("rejects an incorrect password", async () => {
      const { service, prisma } = buildService();
      const passwordHash = await bcrypt.hash("correct-password", 4);
      prisma.user.findUnique.mockResolvedValue({ id: "user_1", orgId: "org_1", role: "OWNER", email: "a@acme.com", passwordHash });

      await expect(service.login({ email: "a@acme.com", password: "wrong-password" })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it("returns a signed session for a correct password", async () => {
      const { service, prisma, sessionTokens } = buildService();
      const passwordHash = await bcrypt.hash("correct-password", 4);
      prisma.user.findUnique.mockResolvedValue({ id: "user_1", orgId: "org_1", role: "OWNER", email: "a@acme.com", passwordHash });

      const result = await service.login({ email: "a@acme.com", password: "correct-password" });

      expect(sessionTokens.sign).toHaveBeenCalled();
      expect(result.session.user.email).toBe("a@acme.com");
    });
  });
});
