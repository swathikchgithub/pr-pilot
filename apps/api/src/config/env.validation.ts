import { IsIn, IsInt, IsOptional, IsString, MinLength, validateSync } from "class-validator";
import { plainToInstance } from "class-transformer";

class EnvironmentVariables {
  @IsIn(["development", "production", "test"])
  @IsOptional()
  NODE_ENV = "development";

  @IsInt()
  @IsOptional()
  PORT = 4000;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  REDIS_URL!: string;

  @IsString()
  @MinLength(32, { message: "JWT_SECRET must be at least 32 characters" })
  JWT_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN = "12h";

  @IsString()
  @MinLength(32, { message: "API_KEY_PEPPER must be at least 32 characters" })
  API_KEY_PEPPER!: string;

  @IsString()
  CORS_ORIGIN!: string;

  @IsString()
  @IsOptional()
  COOKIE_DOMAIN = "";

  @IsString()
  GOOGLE_GENERATIVE_AI_API_KEY!: string;

  @IsString()
  COHERE_API_KEY!: string;
}

/** Fails fast on boot if required env vars are missing or malformed — never at request time. */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, { enableImplicitConversion: true });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
    throw new Error(`Invalid environment configuration:\n${messages.join("\n")}`);
  }

  return validated;
}
