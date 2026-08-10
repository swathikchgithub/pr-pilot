import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { OrgRole } from "@pr-pilot/types";

export interface SessionTokenPayload {
  sub: string;
  orgId: string;
  role: OrgRole;
  email: string;
}

@Injectable()
export class SessionTokenService {
  constructor(private readonly jwt: JwtService) {}

  sign(payload: SessionTokenPayload): string {
    return this.jwt.sign(payload);
  }

  /** Returns null instead of throwing so callers can fall back to other auth methods. */
  verify(token: string): SessionTokenPayload | null {
    try {
      return this.jwt.verify<SessionTokenPayload>(token);
    } catch {
      return null;
    }
  }
}
