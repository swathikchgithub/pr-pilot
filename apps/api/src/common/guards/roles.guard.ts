import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { OrgRole } from "@pr-pilot/types";
import { ROLES_KEY } from "../decorators/roles.decorator";
import type { OrgContext } from "../org-context";

/** Must run after OrgAuthGuard. Rejects API-key principals — roles only apply to dashboard users. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<OrgRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request & { orgContext: OrgContext }>();
    const { role } = request.orgContext;

    if (!role || !requiredRoles.includes(role)) {
      throw new ForbiddenException(`Requires one of roles: ${requiredRoles.join(", ")}`);
    }
    return true;
  }
}
