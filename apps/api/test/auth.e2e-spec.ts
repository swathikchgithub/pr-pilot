import { INestApplication, ValidationPipe } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import * as bcrypt from "bcryptjs";
import { AuthModule } from "../src/auth/auth.module";
import { PrismaModule } from "../src/prisma/prisma.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { TokenModule } from "../src/common/token/token.module";
import { ApiKeyAuthModule } from "../src/common/api-key-auth/api-key-auth.module";
import { HttpExceptionFilter } from "../src/common/filters/http-exception.filter";

/**
 * Full HTTP-level integration test for the auth flow: validation pipe,
 * OrgAuthGuard, cookie handling, and the exception filter — with Prisma
 * mocked so this never touches a real database. AuthModule doesn't pull in
 * Redis (unlike ReposModule/QueryModule), so it's safe to boot in isolation.
 */
describe("Auth (e2e)", () => {
  let app: INestApplication;
  const prisma = {
    user: { findUnique: jest.fn() },
    organization: { findUnique: jest.fn(), create: jest.fn() },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              app: {
                nodeEnv: "test",
                jwtSecret: "test-secret-test-secret-test-secret-32",
                jwtExpiresIn: "12h",
                apiKeyPepper: "test-pepper-test-pepper-test-pepper-32",
                corsOrigin: "http://localhost:3000",
                cookieDomain: "",
              },
            }),
          ],
        }),
        PrismaModule,
        TokenModule,
        ApiKeyAuthModule,
        AuthModule,
      ],
      providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => jest.clearAllMocks());

  it("rejects registration with a malformed email as 400, not 500", async () => {
    const res = await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send({ email: "not-an-email", password: "supersecret1", orgName: "Acme" });

    expect(res.status).toBe(400);
    expect(res.body.statusCode).toBe(400);
  });

  it("registers a new org, sets an httpOnly session cookie, and returns the user", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.organization.findUnique.mockResolvedValue(null);
    prisma.organization.create.mockResolvedValue({
      id: "org_1",
      users: [{ id: "user_1", email: "founder@acme.com", role: "OWNER" }],
    });

    const res = await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send({ email: "founder@acme.com", password: "supersecret1", orgName: "Acme" });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("founder@acme.com");
    const cookie = res.headers["set-cookie"][0];
    expect(cookie).toMatch(/pr_pilot_session=/);
    expect(cookie).toMatch(/HttpOnly/);
  });

  it("rejects login with the wrong password as 401", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user_1",
      orgId: "org_1",
      role: "OWNER",
      email: "founder@acme.com",
      passwordHash: await bcrypt.hash("correct-password", 4),
    });

    const res = await request(app.getHttpServer())
      .post("/v1/auth/login")
      .send({ email: "founder@acme.com", password: "wrong-password" });

    expect(res.status).toBe(401);
  });

  it("rejects /v1/auth/me with no session cookie as 401", async () => {
    const res = await request(app.getHttpServer()).get("/v1/auth/me");
    expect(res.status).toBe(401);
  });
});
