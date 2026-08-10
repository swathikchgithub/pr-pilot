import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import type { Request } from "express";
import type { OrgContext } from "../org-context";

export const CurrentOrgContext = createParamDecorator((_data: unknown, ctx: ExecutionContext): OrgContext => {
  const request = ctx.switchToHttp().getRequest<Request & { orgContext: OrgContext }>();
  return request.orgContext;
});
