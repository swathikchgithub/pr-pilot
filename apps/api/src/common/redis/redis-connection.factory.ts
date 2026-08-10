import IORedis from "ioredis";

/** BullMQ requires `maxRetriesPerRequest: null` on connections used for blocking commands. */
export function createRedisConnection(redisUrl: string): IORedis {
  return new IORedis(redisUrl, { maxRetriesPerRequest: null });
}
