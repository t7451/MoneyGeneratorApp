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
  // Database configuration
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().default('moneygenerator'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default(''),
  DB_SSL: z.enum(['true', 'false', 'require']).default('false'),
  DB_POOL_MIN: z.coerce.number().int().min(0).default(2),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  // JWT configuration  
  JWT_SECRET: z.string().min(32).optional(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  // Stripe configuration
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PRO_MONTHLY: z.string().default('price_pro_monthly'),
  STRIPE_PRICE_PRO_ANNUAL: z.string().default('price_pro_annual'),
  STRIPE_PRICE_ENTERPRISE_MONTHLY: z.string().default('price_enterprise_monthly'),
  STRIPE_PRICE_ENTERPRISE_ANNUAL: z.string().default('price_enterprise_annual'),
  OBJECT_STORAGE_PROVIDER: z.enum(['local', 's3', 'r2', 'gcs']).default('local'),
  OBJECT_STORAGE_BUCKET: z.string().default('moneygenerator-assets'),
  OBJECT_STORAGE_PUBLIC_BASE_URL: z.string().optional(),
  OBJECT_STORAGE_SIGNING_SECRET: z.string().default('local-object-storage-signing-secret'),
  ASSET_TEMP_RETENTION_HOURS: z.coerce.number().int().positive().default(24),
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
  jwt: {
    secret: parsed.data.JWT_SECRET,
    expiresIn: parsed.data.JWT_EXPIRES_IN,
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
  database: {
    url: parsed.data.DATABASE_URL,
    host: parsed.data.DB_HOST,
    port: parsed.data.DB_PORT,
    name: parsed.data.DB_NAME,
    user: parsed.data.DB_USER,
    password: parsed.data.DB_PASSWORD,
    ssl: parsed.data.DB_SSL === 'true' || parsed.data.DB_SSL === 'require',
    pool: {
      min: parsed.data.DB_POOL_MIN,
      max: parsed.data.DB_POOL_MAX,
    },
  },
  stripe: {
    secretKey: parsed.data.STRIPE_SECRET_KEY,
    publishableKey: parsed.data.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: parsed.data.STRIPE_WEBHOOK_SECRET,
    prices: {
      proMonthly: parsed.data.STRIPE_PRICE_PRO_MONTHLY,
      proAnnual: parsed.data.STRIPE_PRICE_PRO_ANNUAL,
      enterpriseMonthly: parsed.data.STRIPE_PRICE_ENTERPRISE_MONTHLY,
      enterpriseAnnual: parsed.data.STRIPE_PRICE_ENTERPRISE_ANNUAL,
    },
  },
  objectStorage: {
    provider: parsed.data.OBJECT_STORAGE_PROVIDER,
    bucket: parsed.data.OBJECT_STORAGE_BUCKET,
    publicBaseUrl: parsed.data.OBJECT_STORAGE_PUBLIC_BASE_URL,
    signingSecret: parsed.data.OBJECT_STORAGE_SIGNING_SECRET,
    tempRetentionHours: parsed.data.ASSET_TEMP_RETENTION_HOURS,
  },
};
