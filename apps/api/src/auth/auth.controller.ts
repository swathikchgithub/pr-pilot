import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import type { SessionResponse } from "@pr-pilot/types";
import type { AppConfig } from "../config/configuration";
import { OrgAuthGuard } from "../common/guards/org-auth.guard";
import { CurrentOrgContext } from "../common/decorators/org-context.decorator";
import type { OrgContext } from "../common/org-context";
import { SESSION_COOKIE_NAME } from "../common/guards/org-auth.guard";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

const SESSION_COOKIE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

@Controller("v1/auth")
export class AuthController {
  private readonly isProd: boolean;
  private readonly cookieDomain: string;

  constructor(
    private readonly authService: AuthService,
    config: ConfigService,
  ) {
    const app = config.getOrThrow<AppConfig>("app");
    this.isProd = app.nodeEnv === "production";
    this.cookieDomain = app.cookieDomain;
  }

  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response): Promise<SessionResponse> {
    const { session, token } = await this.authService.register(dto);
    this.setSessionCookie(res, token);
    return session;
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<SessionResponse> {
    const { session, token } = await this.authService.login(dto);
    this.setSessionCookie(res, token);
    return session;
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(SESSION_COOKIE_NAME, { domain: this.cookieDomain || undefined });
  }

  @Get("me")
  @UseGuards(OrgAuthGuard)
  me(@CurrentOrgContext() ctx: OrgContext): SessionResponse {
    if (!ctx.userId || !ctx.role || !ctx.email) {
      throw new UnauthorizedException("This endpoint requires a dashboard session, not an API key");
    }
    return { user: { id: ctx.userId, orgId: ctx.orgId, role: ctx.role, email: ctx.email } };
  }

  private setSessionCookie(res: Response, token: string): void {
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.isProd,
      sameSite: this.isProd ? "none" : "lax",
      domain: this.cookieDomain || undefined,
      maxAge: SESSION_COOKIE_MAX_AGE_MS,
      path: "/",
    });
  }
}
