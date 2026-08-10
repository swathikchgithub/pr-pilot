export interface WorkerConfig {
  databaseUrl: string;
  redisUrl: string;
  googleApiKey: string;
  githubToken: string | null;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Fails fast on boot if required env vars are missing — never mid-job. */
export function loadConfig(): WorkerConfig {
  return {
    databaseUrl: requireEnv("DATABASE_URL"),
    redisUrl: requireEnv("REDIS_URL"),
    googleApiKey: requireEnv("GOOGLE_GENERATIVE_AI_API_KEY"),
    githubToken: process.env.GITHUB_TOKEN ?? null,
  };
}
