export type OrgRole = "OWNER" | "ADMIN" | "MEMBER";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface OrgMember {
  id: string;
  email: string;
  role: OrgRole;
  orgId: string;
  createdAt: string;
}
