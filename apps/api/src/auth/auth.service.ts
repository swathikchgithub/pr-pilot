import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import type { AuthUser, SessionResponse } from "@pr-pilot/types";
import { PrismaService } from "../prisma/prisma.service";
import { SessionTokenService } from "../common/token/session-token.service";
import { slugify } from "../common/utils/slugify";
import type { RegisterDto } from "./dto/register.dto";
import type { LoginDto } from "./dto/login.dto";

const BCRYPT_ROUNDS = 12;
const SLUG_COLLISION_RETRIES = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionTokens: SessionTokenService,
  ) {}

  async register(dto: RegisterDto): Promise<{ session: SessionResponse; token: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const slug = await this.uniqueOrgSlug(dto.orgName);

    const org = await this.prisma.organization.create({
      data: {
        name: dto.orgName,
        slug,
        users: {
          create: { email: dto.email, passwordHash, role: "OWNER" },
        },
      },
      include: { users: true },
    });

    const user = org.users[0];
    return this.issueSession(user.id, org.id, user.role, user.email);
  }

  async login(dto: LoginDto): Promise<{ session: SessionResponse; token: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }
    return this.issueSession(user.id, user.orgId, user.role, user.email);
  }

  private issueSession(
    userId: string,
    orgId: string,
    role: AuthUser["role"],
    email: string,
  ): { session: SessionResponse; token: string } {
    const token = this.sessionTokens.sign({ sub: userId, orgId, role, email });
    return { session: { user: { id: userId, orgId, role, email } }, token };
  }

  private async uniqueOrgSlug(orgName: string): Promise<string> {
    const base = slugify(orgName) || "org";
    for (let attempt = 0; attempt < SLUG_COLLISION_RETRIES; attempt++) {
      const candidate = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 7)}`;
      const existing = await this.prisma.organization.findUnique({ where: { slug: candidate } });
      if (!existing) return candidate;
    }
    throw new ConflictException("Could not allocate a unique organization slug, please try again");
  }
}
