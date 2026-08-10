import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import { INGEST_QUEUE_NAME, type IngestJobPayload } from "@pr-pilot/types";
import type { AppConfig } from "../config/configuration";
import { createRedisConnection } from "../common/redis/redis-connection.factory";

@Injectable()
export class IngestQueueService implements OnModuleDestroy {
  private readonly queue: Queue<IngestJobPayload>;

  constructor(config: ConfigService) {
    const app = config.getOrThrow<AppConfig>("app");
    this.queue = new Queue<IngestJobPayload>(INGEST_QUEUE_NAME, {
      connection: createRedisConnection(app.redisUrl),
    });
  }

  async enqueue(payload: IngestJobPayload): Promise<void> {
    await this.queue.add("ingest", payload, {
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
