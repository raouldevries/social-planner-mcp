/**
 * Social Planner - API Configuration
 *
 * Validates and exports environment configuration using Zod.
 */

import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.string(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // S3/MinIO
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_BUCKET: z.string().default('planner-media'),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_REGION: z.string().default('us-east-1'),
  S3_PUBLIC_URL: z.string().optional(),

  // OAuth - Google
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),

  // OAuth - Microsoft
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_REDIRECT_URI: z.string().optional(),

  // OAuth - Instagram (for social account connection)
  INSTAGRAM_APP_ID: z.string().optional(),
  INSTAGRAM_APP_SECRET: z.string().optional(),
  INSTAGRAM_REDIRECT_URI: z.string().optional(),

  // OAuth - LinkedIn (for social account connection)
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_REDIRECT_URI: z.string().optional(),

  // Email
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('planner@planner.app'),

  // Frontend URL (for CORS and links)
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  // Analytics Sync
  ANALYTICS_SYNC_ENABLED: z.coerce.boolean().default(true),
  ANALYTICS_SYNC_INTERVAL_HOURS: z.coerce.number().default(6),
  ANALYTICS_MIN_POST_AGE_HOURS: z.coerce.number().default(1),

  // MCP (Model Context Protocol)
  MCP_ENABLED: z.coerce.boolean().default(true),
  MCP_ACCESS_TOKEN_EXPIRES_IN: z.string().default('1h'),
  MCP_REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),
  MCP_PENDING_ACTION_EXPIRES_IN: z.string().default('24h'),
  MCP_RATE_LIMIT_REQUESTS: z.coerce.number().default(100), // per minute
  MCP_AUDIT_RETENTION_DAYS: z.coerce.number().default(90),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const result = configSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment configuration:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();
