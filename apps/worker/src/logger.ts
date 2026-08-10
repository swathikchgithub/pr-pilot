export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

function log(level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>): void {
  const entry = { level, message, timestamp: new Date().toISOString(), ...meta };
  const method = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  method(JSON.stringify(entry));
}

export const logger: Logger = {
  info: (message, meta) => log("info", message, meta),
  warn: (message, meta) => log("warn", message, meta),
  error: (message, meta) => log("error", message, meta),
};
