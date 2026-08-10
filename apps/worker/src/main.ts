import IORedis from "ioredis";
import { PrismaClient } from "@pr-pilot/db";
import { loadConfig } from "./config";
import { GithubClient } from "./github/github-client";
import { EmbeddingClient } from "./embedding/embed-chunks";
import { createIngestWorker } from "./processor";
import { logger } from "./logger";

async function main() {
  const config = loadConfig();

  const prisma = new PrismaClient();
  const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });
  const github = new GithubClient(config.githubToken);
  const embeddingClient = new EmbeddingClient(config.googleApiKey);

  const worker = createIngestWorker(connection, { prisma, github, embeddingClient, logger }, logger);
  logger.info("PR-Pilot worker started, listening for ingestion jobs");

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    await worker.close();
    await prisma.$disconnect();
    await connection.quit();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((error) => {
  logger.error("Worker failed to start", { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
