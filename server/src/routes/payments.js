/**
 * Payment Routes
 * Handles Stripe payments, subscriptions, and billing
 */

import { Router } from 'express';
import { config } from '../config.js';
import { StripeService, verifyWebhookSignature } from '../services/stripeService.js';
import { authenticateToken } from '../middleware/auth.js';
import { Models } from '../models.js';
import OpsService from '../services/opsService.js';

const router = Router();

function recordStripeWebhookEvent(event, correlationId) {
  const existing = Models.webhookEvents.get(event.id);
  if (existing) {
    return { duplicate: true, event: existing };
  }

  const record = {
    id: event.id,
    provider: 'stripe',
    type: event.type,
    correlationId,
    payload: {
      id: event.id,
      type: event.type,
      created: event.created,
      livemode: event.livemode,
    },
    status: 'received',
    createdAt: new Date().toISOString(),
  };
  Models.webhookEvents.set(event.id, record);
  return { duplicate: false, event: record };
}

/**
 * Get current subscription status
 * GET /api/payments/subscription
 */
router.get('/subscription', authenticateToken, async (req, res) => {
  try {
    const subscription = await StripeService.getSubscription(req.user.id);
    res.json({ success: true, subscription });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription' });
  }
});

/**
 * Get available plans
 * GET /api/payments/plans
 */
router.get('/plans', (req, res) => {
  const plans = StripeService.listPlans();
  res.json({ success: true, plans });
});

/**
 * Create checkout session
 * POST /api/payments/checkout
 */
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    if (!StripeService.isStripeConfigured()) {
      return res.status(503).json({ 
        success: false, 
        error: 'Payment processing is not configured' 
      });
    }

    const { planId, billingCycle = 'monthly', successUrl, cancelUrl } = req.body;

    if (!planId || planId === 'free') {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid plan selected' 
      });
    }

    const plan = StripeService.getPlanDetails(planId);
    if (!plan) {
      return res.status(400).json({ 
        success: false, 
        error: `Unknown plan: ${planId}` 
      });
    }

    const session = await StripeService.createCheckoutSession({
      userId: req.user.id,
      email: req.user.email,
      name: req.user.name || req.user.email,
      planId,
      billingCycle,
      successUrl,
      cancelUrl,
    });

    res.json({ success: true, ...session });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create checkout session' 
    });
  }
});

/**
 * Create payment intent for one-time purchase
 * POST /api/payments/intent
 */
router.post('/intent', authenticateToken, async (req, res) => {
  try {
    if (!StripeService.isStripeConfigured()) {
      return res.status(503).json({ 
        success: false, 
        error: 'Payment processing is not configured' 
      });
    }

    const { amount, currency = 'usd', description } = req.body;

    if (!amount || amount < 50) { // Stripe minimum is $0.50
      return res.status(400).json({ 
        success: false, 
        error: 'Amount must be at least 50 cents' 
      });
    }

    const paymentIntent = await StripeService.createPaymentIntent({
      userId: req.user.id,
      email: req.user.email,
      name: req.user.name || req.user.email,
      amount,
      currency,
      description,
    });

    res.json({ success: true, ...paymentIntent });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create payment intent' 
    });
  }
});

/**
 * Cancel subscription
 * POST /api/payments/subscription/cancel
 */
router.post('/subscription/cancel', authenticateToken, async (req, res) => {
  try {
    const { immediately = false, reason } = req.body;
    
    const result = await StripeService.cancelSubscription(req.user.id, { 
      immediately, 
      reason 
    });
    
    res.json({ 
      success: true, 
      message: immediately 
        ? 'Subscription canceled immediately' 
        : 'Subscription will cancel at end of billing period',
      ...result,
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to cancel subscription' 
    });
  }
});

/**
 * Update subscription (change plan)
 * PATCH /api/payments/subscription
 */
router.patch('/subscription', authenticateToken, async (req, res) => {
  try {
    const { planId, billingCycle } = req.body;

    if (!planId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Plan ID required' 
      });
    }

    const result = await StripeService.updateSubscription(req.user.id, {
      newPlanId: planId,
      billingCycle,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to update subscription' 
    });
  }
});

/**
 * Create billing portal session
 * POST /api/payments/billing-portal
 */
router.post('/billing-portal', authenticateToken, async (req, res) => {
  try {
    if (!StripeService.isStripeConfigured()) {
      return res.status(503).json({ 
        success: false, 
        error: 'Payment processing is not configured' 
      });
    }

    const { returnUrl } = req.body;
    const session = await StripeService.createBillingPortalSession(req.user.id, returnUrl);
    
    res.json({ success: true, ...session });
  } catch (error) {
    console.error('Error creating billing portal:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create billing portal session' 
    });
  }
});

/**
 * Stripe webhook handler
 * POST /api/payments/webhook
 * Note: This endpoint must NOT use authenticateToken - Stripe signs requests differently
 */
router.post('/webhook', async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const correlationId = req.headers['x-correlation-id'] || `stripe_${Date.now()}`;

  if (!signature) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event;
  try {
    // req.body must be the raw body for signature verification
    event = verifyWebhookSignature(req.body, signature);
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    OpsService.createIncident({
      source: 'stripe.webhook',
      severity: 'warning',
      title: 'Stripe webhook signature verification failed',
      details: { error: error.message, correlationId },
    });
    return res.status(400).json({ error: `Webhook Error: ${error.message}` });
  }

  const recorded = recordStripeWebhookEvent(event, correlationId);
  if (recorded.duplicate) {
    OpsService.recordReplayOutcome({
      targetId: event.id,
      outcome: 'duplicate_ignored',
      operator: 'system',
      details: { type: event.type, correlationId },
    });
    return res.json({ received: true, duplicate: true });
  }

  try {
    await StripeService.handleWebhookEvent(event);
    const stored = Models.webhookEvents.get(event.id);
    if (stored) {
      stored.status = 'processed';
      stored.processedAt = new Date().toISOString();
    }
    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook event:', error);
    const stored = Models.webhookEvents.get(event.id);
    if (stored) {
      stored.status = 'failed';
      stored.failureReason = error.message;
      stored.failedAt = new Date().toISOString();
    }
    OpsService.createIncident({
      source: 'stripe.webhook',
      severity: 'critical',
      title: `Stripe webhook processing failed: ${event.type}`,
      details: { eventId: event.id, correlationId, error: error.message },
    });
    // Return 200 to acknowledge receipt (Stripe will retry otherwise)
    res.json({ received: true, error: error.message });
  }
});

/**
 * Get publishable key (for frontend)
 * GET /api/payments/config
 */
router.get('/config', (req, res) => {
  res.json({
    publishableKey: config.stripe.publishableKey || null,
    configured: StripeService.isStripeConfigured(),
  });
});

export default router;
