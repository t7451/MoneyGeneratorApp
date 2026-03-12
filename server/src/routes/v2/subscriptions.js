/**
 * Subscription API Routes
 * v2 API endpoints for subscription management
 */

import express from 'express';
import SubscriptionService from '../../services/subscriptionService.js';
import { logger } from '../../logger.js';

const router = express.Router();

/**
 * GET /api/v2/subscriptions
 * Get current user's subscription
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const result = await SubscriptionService.getOrCreateSubscription(userId);
    res.json(result);
  } catch (error) {
    logger.error('Error in GET /:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch subscription'
    });
  }
});

/**
 * GET /api/v2/subscriptions/plans
 * Get all available subscription plans
 */
router.get('/plans', (req, res) => {
  try {
    const result = SubscriptionService.getPlans();
    res.json(result);
  } catch (error) {
    logger.error('Error in GET /plans:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch plans'
    });
  }
});

/**
 * POST /api/v2/subscriptions/upgrade
 * Upgrade plan
 * Body: { plan: "pro" | "enterprise", billingCycle?: "monthly" | "annual" }
 */
router.post('/upgrade', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'];
    const { plan, billingCycle = 'monthly' } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    if (!plan) {
      return res.status(400).json({
        success: false,
        error: 'Plan is required'
      });
    }

    const validBillingCycles = ['monthly', 'annual'];
    if (!validBillingCycles.includes(billingCycle)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid billing cycle'
      });
    }

    const result = await SubscriptionService.upgradePlan(userId, plan, billingCycle);
    res.json(result);
  } catch (error) {
    logger.error('Error in POST /upgrade:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upgrade subscription'
    });
  }
});

/**
 * POST /api/v2/subscriptions/cancel
 * Cancel subscription
 * Body: { reason?: string }
 */
router.post('/cancel', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'];
    const { reason } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const result = await SubscriptionService.cancelSubscription(userId, reason);
    res.json(result);
  } catch (error) {
    logger.error('Error in POST /cancel:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel subscription'
    });
  }
});

/**
 * POST /api/v2/subscriptions/trial
 * Start free trial
 * Body: { days?: number }
 */
router.post('/trial', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'];
    const { days = 14 } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    if (days < 1 || days > 90) {
      return res.status(400).json({
        success: false,
        error: 'Trial period must be between 1 and 90 days'
      });
    }

    const result = await SubscriptionService.startTrial(userId, days);
    res.json(result);
  } catch (error) {
    logger.error('Error in POST /trial:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start trial'
    });
  }
});

/**
 * POST /api/v2/subscriptions/payment-method
 * Update payment method
 * Body: { type: "card", last4: "4242", brand: "visa", expiresAt: Date }
 */
router.post('/payment-method', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'];
    const { type, last4, brand, expiresAt } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    if (!type || !last4 || !brand) {
      return res.status(400).json({
        success: false,
        error: 'Payment method type, last4, and brand are required'
      });
    }

    const result = await SubscriptionService.updatePaymentMethod(userId, {
      type,
      last4,
      brand,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });

    res.json(result);
  } catch (error) {
    logger.error('Error in POST /payment-method:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update payment method'
    });
  }
});

/**
 * GET /api/v2/subscriptions/billing-portal
 * Get Stripe billing portal URL
 */
router.get('/billing-portal', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const result = await SubscriptionService.getBillingPortalUrl(userId);
    res.json(result);
  } catch (error) {
    logger.error('Error in GET /billing-portal:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get billing portal URL'
    });
  }
});

/**
 * GET /api/v2/subscriptions/has-feature
 * Check if user has feature access
 * Query: ?feature=advancedAnalytics
 */
router.get('/has-feature', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'];
    const { feature } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    if (!feature) {
      return res.status(400).json({
        success: false,
        error: 'Feature name is required'
      });
    }

    const hasFeature = await SubscriptionService.hasFeature(userId, feature);

    res.json({
      success: true,
      feature,
      hasAccess: hasFeature
    });
  } catch (error) {
    logger.error('Error in GET /has-feature:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check feature access'
    });
  }
});

/**
 * GET /api/v2/subscriptions/stats
 * Get subscription statistics (admin only)
 */
router.get('/stats', async (req, res) => {
  try {
    // TODO: Add admin authorization check
    // if (!req.user?.isAdmin) {
    //   return res.status(403).json({ success: false, error: 'Admin access required' });
    // }

    const result = await SubscriptionService.getSubscriptionStats();
    res.json(result);
  } catch (error) {
    logger.error('Error in GET /stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch subscription stats'
    });
  }
});

/**
 * POST /api/v2/subscriptions/webhook
 * Handle Stripe webhook events
 * Body: Stripe event object
 */
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;

    if (!event.type) {
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook event'
      });
    }

    await SubscriptionService.handleStripeWebhook(event);

    res.json({
      success: true,
      message: 'Webhook processed'
    });
  } catch (error) {
    logger.error('Error in POST /webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process webhook'
    });
  }
});

export default router;
