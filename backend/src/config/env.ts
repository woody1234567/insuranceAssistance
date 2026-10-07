import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  DB_SOCKET_PATH: z.string().optional(),
  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().int().positive().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().optional(),

  PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(process.env.PORT ? Number(process.env.PORT) : 3000),
  CORS_ORIGIN: z.string().default("*"),

  AI_PROVIDER: z.enum(["google-vertex", "google"]).default("google"),
  AI_MODEL: z.string().min(1).default("gemini-3.5-flash"),
  AI_PROMPT_VERSION: z
    .string()
    .min(1)
    .default(
      process.env.AI_PROMPT_VERSION ??
        process.env.SYSTEM_PROMPT_VERSION ??
        "v2",
    ),

  GOOGLE_VERTEX_PROJECT: z
    .string()
    .min(1)
    .default(
      process.env.GOOGLE_CLOUD_PROJECT ??
        process.env.GCP_PROJECT_ID ??
        "insurance-assistance-project",
    ),
  GOOGLE_VERTEX_LOCATION: z.string().min(1).default("asia-east1"),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);

export function parseCorsOrigins(rawOrigin: string): string[] {
  if (!rawOrigin || rawOrigin.trim() === "*") {
    return [];
  }
  return rawOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export const parsedCorsOrigins = parseCorsOrigins(env.CORS_ORIGIN);
