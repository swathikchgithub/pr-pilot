import type { OrgRole } from "./org";

export interface AuthUser {
  id: string;
  email: string;
  orgId: string;
  role: OrgRole;
}

export interface RegisterRequest {
  email: string;
  password: string;
  orgName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SessionResponse {
  user: AuthUser;
}
