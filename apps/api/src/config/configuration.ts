export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  apiKeyPepper: string;
  corsOrigin: string;
  cookieDomain: string;
  googleApiKey: string;
  cohereApiKey: string;
}

export default (): { app: AppConfig } => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: Number(process.env.PORT ?? 4000),
    databaseUrl: process.env.DATABASE_URL!,
    redisUrl: process.env.REDIS_URL!,
    jwtSecret: process.env.JWT_SECRET!,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "12h",
    apiKeyPepper: process.env.API_KEY_PEPPER!,
    corsOrigin: process.env.CORS_ORIGIN!,
    cookieDomain: process.env.COOKIE_DOMAIN ?? "",
    googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
    cohereApiKey: process.env.COHERE_API_KEY!,
  },
});
