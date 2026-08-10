import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { INGEST_QUEUE_NAME, type IngestJobPayload } from "@pr-pilot/types";
import { ingestRepo, type IngestDependencies } from "./ingest/ingest-repo";
import type { Logger } from "./logger";

const CONCURRENCY = 2;

export function createIngestWorker(connection: IORedis, deps: IngestDependencies, logger: Logger): Worker<IngestJobPayload> {
  const worker = new Worker<IngestJobPayload>(
    INGEST_QUEUE_NAME,
    async (job: Job<IngestJobPayload>) => {
      await ingestRepo(job.data, deps);
    },
    { connection, concurrency: CONCURRENCY },
  );

  worker.on("completed", (job) => logger.info(`Ingestion job completed`, { jobId: job.id, repoId: job.data.repoId }));
  worker.on("failed", (job, err) =>
    logger.error(`Ingestion job failed`, { jobId: job?.id, repoId: job?.data.repoId, error: err.message }),
  );

  return worker;
}
