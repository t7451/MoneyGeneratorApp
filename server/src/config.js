import { z } from 'zod';

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PAYPAL_WEBHOOK_SECRET: z.string().min(1).default('demo-paypal-secret'),
  PLAID_WEBHOOK_SECRET: z.string().min(1).default('demo-plaid-secret'),
  CRM_WEBHOOK_SECRET: z.string().min(1).default('demo-crm-secret'),
  AUTH_USER_TOKEN: z.string().min(1).default('demo-user-token'),
  AUTH_ADMIN_TOKEN: z.string().min(1).default('demo-admin-token'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  WEBHOOK_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  WEBHOOK_REPLAY_WINDOW_MS: z.coerce.number().int().positive().default(5 * 60_000),
  CORS_ORIGIN: z.string().optional(),
});

const parsed = ConfigSchema.safeParse(process.env);

if (!parsed.success) {
  const errors = parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message }));
  console.error('Invalid configuration', { errors });
  throw new Error('Configuration validation failed');
}

export const config = {
  env: parsed.data.NODE_ENV,
  secrets: {
    paypalWebhook: parsed.data.PAYPAL_WEBHOOK_SECRET,
    plaidWebhook: parsed.data.PLAID_WEBHOOK_SECRET,
    crmWebhook: parsed.data.CRM_WEBHOOK_SECRET,
  },
  auth: {
    userToken: parsed.data.AUTH_USER_TOKEN,
    adminToken: parsed.data.AUTH_ADMIN_TOKEN,
  },
  rateLimiting: {
    windowMs: parsed.data.RATE_LIMIT_WINDOW_MS,
    max: parsed.data.RATE_LIMIT_MAX,
    webhookMax: parsed.data.WEBHOOK_RATE_LIMIT_MAX,
  },
  security: {
    webhookReplayWindowMs: parsed.data.WEBHOOK_REPLAY_WINDOW_MS,
  },
  corsOrigin: parsed.data.CORS_ORIGIN,
};
