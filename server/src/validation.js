import { z } from 'zod';

// Validation schemas
export const schemas = {
  // Subscription creation
  createSubscription: z.object({
    userId: z.string().min(1).max(100).optional(),
    planId: z.string().min(1).max(100).optional(),
  }),

  // Plaid link token
  plaidLinkToken: z.object({
    userId: z.string().min(1).max(100).optional(),
  }),

  // Plaid exchange
  plaidExchange: z.object({
    publicToken: z.string().min(1),
    userId: z.string().min(1).max(100).optional(),
  }),

  // PayPal subscription creation
  paypalSubscriptionCreate: z.object({
    userId: z.string().min(1).max(100).optional(),
    planId: z.string().min(1).max(100),
  }),

  // PayPal subscription confirm
  paypalSubscriptionConfirm: z.object({
    providerSubscriptionId: z.string().min(1),
    userId: z.string().min(1).max(100).optional(),
  }),

  // PayPal subscription cancel
  paypalSubscriptionCancel: z.object({
    providerSubscriptionId: z.string().min(1),
  }),

  // Purchase
  purchase: z.object({
    productId: z.string().min(1).max(100),
    userId: z.string().min(1).max(100).optional(),
  }),

  // Metrics event
  metricsEvent: z.object({
    eventType: z.string().min(1).max(100),
    userId: z.string().min(1).max(100).optional(),
    ts: z.number().optional(),
    properties: z.record(z.any()).optional(),
    correlationId: z.string().optional(),
    source: z.string().optional(),
  }),

  // Daily rollup query
  dailyRollup: z.object({
    userId: z.string().min(1).max(100).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
};

// Validation middleware factory
export function validate(schema) {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        req.log?.warn('validation_failed', { errors: result.error.issues });
        return res.status(400).json({
          error: 'validation_failed',
          details: result.error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }

      // Replace body with validated data
      req.body = result.data;
      next();
    } catch (error) {
      req.log?.error('validation_error', { error: error.message });
      res.status(500).json({ error: 'internal_error' });
    }
  };
}

// Query parameter validation
export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.query);
      
      if (!result.success) {
        req.log?.warn('query_validation_failed', { errors: result.error.issues });
        return res.status(400).json({
          error: 'validation_failed',
          details: result.error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }

      req.query = result.data;
      next();
    } catch (error) {
      req.log?.error('query_validation_error', { error: error.message });
      res.status(500).json({ error: 'internal_error' });
    }
  };
}
