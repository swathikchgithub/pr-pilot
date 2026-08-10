import { randomBytes, createHash } from "node:crypto";
import * as bcrypt from "bcryptjs";
import { PrismaClient } from "@pr-pilot/db";

const DEMO_EMAIL = "demo@pr-pilot.dev";
const DEMO_PASSWORD = "demo-password-123";
const DEMO_ORG_NAME = "Demo Org";
const DEMO_ORG_SLUG = "demo-org";
const DEMO_REPO_URL = "https://github.com/vercel/next.js";

async function main() {
  const prisma = new PrismaClient();
  const pepper = process.env.API_KEY_PEPPER ?? "local-dev-pepper-not-for-production";

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const org = await prisma.organization.upsert({
    where: { slug: DEMO_ORG_SLUG },
    update: {},
    create: {
      name: DEMO_ORG_NAME,
      slug: DEMO_ORG_SLUG,
      users: { create: { email: DEMO_EMAIL, passwordHash, role: "OWNER" } },
    },
  });

  await prisma.repo.upsert({
    where: { orgId_githubUrl: { orgId: org.id, githubUrl: DEMO_REPO_URL } },
    update: {},
    create: { orgId: org.id, githubUrl: DEMO_REPO_URL, defaultBranch: "canary" },
  });

  const apiKeySecret = `prp_${randomBytes(32).toString("base64url")}`;
  const keyHash = createHash("sha256").update(`${pepper}:${apiKeySecret}`).digest("hex");
  await prisma.apiKey.create({
    data: { orgId: org.id, name: "Seed script key", keyPrefix: apiKeySecret.slice(0, 12), keyHash },
  });

  console.log("Seeded demo data:");
  console.log(`  Org:      ${DEMO_ORG_NAME} (${DEMO_ORG_SLUG})`);
  console.log(`  Login:    ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  Repo:     ${DEMO_REPO_URL} (registered, not yet indexed — start the worker to index it)`);
  console.log(`  API key:  ${apiKeySecret}`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
