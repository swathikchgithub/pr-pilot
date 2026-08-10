import { SetMetadata } from "@nestjs/common";
import type { OrgRole } from "@pr-pilot/types";

export const ROLES_KEY = "roles";

/** Restricts a route to dashboard users (JWT auth only) holding one of the given roles. */
export const Roles = (...roles: OrgRole[]) => SetMetadata(ROLES_KEY, roles);
