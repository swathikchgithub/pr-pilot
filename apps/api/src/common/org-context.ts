import type { OrgRole } from "@pr-pilot/types";

/** Attached to the request by OrgAuthGuard. Present on every authenticated route. */
export interface OrgContext {
  orgId: string;
  userId: string | null;
  apiKeyId: string | null;
  role: OrgRole | null;
  email: string | null;
}
