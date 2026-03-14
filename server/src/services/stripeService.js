/**
 * Stripe Payment Service
 * Handles all Stripe payment processing, subscriptions, and webhooks
 */

import Stripe from 'stripe';
import { config } from '../config.js';
import { isDatabaseConnected, queryOne, query } from '../database.js';

// Initialize Stripe (may be null if no API key configured)
let stripe = null;
if (config.stripe.secretKey) {
  stripe = new Stripe(config.stripe.secretKey, {
    apiVersion: '2023-10-16',
  });
}

// Plan configuration
const PLANS = {
  free: {
    id: 'plan_free',
    name: 'Free',
    priceMonthly: 0,
    priceAnnual: 0,
    features: ['basic_tracking', 'manual_entry', 'monthly_reports'],
  },
  pro: {
    id: 'plan_pro',
    name: 'Pro',
    priceMonthly: 1499, // cents
    priceAnnual: 11988,
    stripePriceMonthly: config.stripe.prices.proMonthly,
    stripePriceAnnual: config.stripe.prices.proAnnual,
    features: ['advanced_analytics', 'bank_integration', 'instant_payouts', 'automations', 'priority_support'],
  },
  enterprise: {
    id: 'plan_enterprise',
    name: 'Enterprise',
    priceMonthly: 4999,
    priceAnnual: 47988,
    stripePriceMonthly: config.stripe.prices.enterpriseMonthly,
    stripePriceAnnual: config.stripe.prices.enterpriseAnnual,
    features: ['all_pro_features', 'team_management', 'custom_integrations', 'api_access', 'dedicated_manager', 'phone_support'],
  },
};

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured() {
  return stripe !== null;
}

/**
 * Get the Stripe instance (throws if not configured)
 */
export function getStripe() {
  if (!stripe) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.');
  }
  return stripe;
}

/**
 * Create or retrieve a Stripe customer for a user
 */
export async function getOrCreateCustomer(userId, email, name) {
  // Check database for existing customer ID
  if (isDatabaseConnected()) {
    const profile = await queryOne('SELECT stripe_customer_id FROM user_profiles WHERE user_id = $1', [userId]);
    if (profile?.stripe_customer_id) {
      return profile.stripe_customer_id;
    }
  }

  // Create new Stripe customer
  const customer = await getStripe().customers.create({
    email,
    name,
    metadata: { userId },
  });

  // Save customer ID to database
  if (isDatabaseConnected()) {
    await query(`
      INSERT INTO user_profiles (user_id, stripe_customer_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = $2, updated_at = NOW()
    `, [userId, customer.id]);
  }

  return customer.id;
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession({ userId, email, name, planId, billingCycle = 'monthly', successUrl, cancelUrl }) {
  const plan = PLANS[planId];
  if (!plan || planId === 'free') {
    throw new Error(`Invalid plan for checkout: ${planId}`);
  }

  const priceId = billingCycle === 'annual' ? plan.stripePriceAnnual : plan.stripePriceMonthly;
  if (!priceId) {
    throw new Error(`Price not configured for ${planId} ${billingCycle}`);
  }

  const customerId = await getOrCreateCustomer(userId, email, name);

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pricing`,
    metadata: {
      userId,
      planId,
      billingCycle,
    },
    subscription_data: {
      metadata: {
        userId,
        planId,
      },
    },
  });

  return {
    sessionId: session.id,
    url: session.url,
  };
}

/**
 * Create a payment intent for one-time purchase
 */
export async function createPaymentIntent({ userId, email, name, amount, currency = 'usd', description }) {
  const customerId = await getOrCreateCustomer(userId, email, name);

  const paymentIntent = await getStripe().paymentIntents.create({
    amount, // in cents
    currency,
    customer: customerId,
    description,
    metadata: { userId },
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
}

/**
 * Get subscription status for a user
 */
export async function getSubscription(userId) {
  if (isDatabaseConnected()) {
    const sub = await queryOne(`
      SELECT * FROM subscriptions 
      WHERE user_id = $1 AND status IN ('active', 'trialing', 'past_due')
      ORDER BY created_at DESC LIMIT 1
    `, [userId]);
    
    if (sub) {
      return {
        id: sub.id,
        planId: sub.plan_id,
        status: sub.status,
        billingCycle: sub.billing_cycle,
        currentPeriodStart: sub.current_period_start,
        currentPeriodEnd: sub.current_period_end,
        cancelAt: sub.cancel_at,
        stripeSubscriptionId: sub.external_id,
      };
    }
  }
  
  // Default to free plan
  return {
    planId: 'free',
    status: 'active',
    billingCycle: null,
  };
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(userId, { immediately = false, reason } = {}) {
  const sub = await getSubscription(userId);
  
  if (!sub.stripeSubscriptionId) {
    throw new Error('No active paid subscription found');
  }

  if (immediately) {
    await getStripe().subscriptions.cancel(sub.stripeSubscriptionId);
  } else {
    await getStripe().subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
      metadata: { cancelReason: reason },
    });
  }

  // Update database
  if (isDatabaseConnected()) {
    await query(`
      UPDATE subscriptions 
      SET status = $1, cancel_at = $2, canceled_at = NOW(), updated_at = NOW()
      WHERE external_id = $3
    `, [immediately ? 'canceled' : 'active', immediately ? 'NOW()' : sub.currentPeriodEnd, sub.stripeSubscriptionId]);
  }

  return { success: true, canceledImmediately: immediately };
}

/**
 * Update subscription (change plan)
 */
export async function updateSubscription(userId, { newPlanId, billingCycle }) {
  const sub = await getSubscription(userId);
  
  if (!sub.stripeSubscriptionId) {
    throw new Error('No active subscription to update');
  }

  const newPlan = PLANS[newPlanId];
  if (!newPlan) {
    throw new Error(`Invalid plan: ${newPlanId}`);
  }

  const newPriceId = billingCycle === 'annual' ? newPlan.stripePriceAnnual : newPlan.stripePriceMonthly;

  // Get current subscription from Stripe
  const stripeSub = await getStripe().subscriptions.retrieve(sub.stripeSubscriptionId);

  // Update the subscription
  const updated = await getStripe().subscriptions.update(sub.stripeSubscriptionId, {
    items: [
      {
        id: stripeSub.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'create_prorations',
    metadata: {
      planId: newPlanId,
    },
  });

  // Update database
  if (isDatabaseConnected()) {
    await query(`
      UPDATE subscriptions 
      SET plan_id = $1, billing_cycle = $2, updated_at = NOW()
      WHERE external_id = $3
    `, [newPlanId, billingCycle, sub.stripeSubscriptionId]);
  }

  return {
    success: true,
    subscription: {
      planId: newPlanId,
      billingCycle,
      status: updated.status,
    },
  };
}

/**
 * Create a billing portal session
 */
export async function createBillingPortalSession(userId, returnUrl) {
  if (!isDatabaseConnected()) {
    throw new Error('Database required for billing portal');
  }

  const profile = await queryOne('SELECT stripe_customer_id FROM user_profiles WHERE user_id = $1', [userId]);
  if (!profile?.stripe_customer_id) {
    throw new Error('No billing account found');
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: returnUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings`,
  });

  return { url: session.url };
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhookEvent(event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      await handleCheckoutComplete(session);
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      await syncSubscription(subscription);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      await handleSubscriptionDeleted(subscription);
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object;
      await handleInvoicePaid(invoice);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      await handlePaymentFailed(invoice);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return { received: true };
}

/**
 * Handle successful checkout
 */
async function handleCheckoutComplete(session) {
  const { userId, planId, billingCycle } = session.metadata || {};
  
  if (!userId || !planId) {
    console.error('Missing metadata in checkout session:', session.id);
    return;
  }

  // Subscription will be synced via customer.subscription.created event
  console.log(`Checkout complete for user ${userId}: ${planId} (${billingCycle})`);
}

/**
 * Sync subscription from Stripe to database
 */
async function syncSubscription(subscription) {
  if (!isDatabaseConnected()) return;

  const { userId, planId } = subscription.metadata || {};
  if (!userId) {
    console.error('Missing userId in subscription metadata:', subscription.id);
    return;
  }

  await query(`
    INSERT INTO subscriptions (
      user_id, plan_id, status, billing_cycle, 
      current_period_start, current_period_end,
      payment_provider, external_id, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (external_id) DO UPDATE SET
      status = $3,
      current_period_start = $5,
      current_period_end = $6,
      updated_at = NOW()
  `, [
    userId,
    planId || 'pro',
    subscription.status,
    subscription.items?.data?.[0]?.plan?.interval || 'month',
    new Date(subscription.current_period_start * 1000),
    new Date(subscription.current_period_end * 1000),
    'stripe',
    subscription.id,
    JSON.stringify(subscription.metadata || {}),
  ]);

  // Update user profile
  await query(`
    UPDATE user_profiles 
    SET subscription_plan = $1, subscription_status = $2, updated_at = NOW()
    WHERE user_id = $3
  `, [planId || 'pro', subscription.status, userId]);
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(subscription) {
  if (!isDatabaseConnected()) return;

  await query(`
    UPDATE subscriptions 
    SET status = 'canceled', canceled_at = NOW(), updated_at = NOW()
    WHERE external_id = $1
  `, [subscription.id]);

  const { userId } = subscription.metadata || {};
  if (userId) {
    await query(`
      UPDATE user_profiles 
      SET subscription_plan = 'free', subscription_status = 'active', updated_at = NOW()
      WHERE user_id = $1
    `, [userId]);
  }
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaid(invoice) {
  console.log(`Invoice paid: ${invoice.id} for ${invoice.customer_email}`);
  // Could send confirmation email, update records, etc.
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice) {
  console.log(`Payment failed: ${invoice.id} for ${invoice.customer_email}`);
  // Could send notification, update subscription status, etc.

  if (isDatabaseConnected() && invoice.subscription) {
    await query(`
      UPDATE subscriptions 
      SET status = 'past_due', updated_at = NOW()
      WHERE external_id = $1
    `, [invoice.subscription]);
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(payload, signature) {
  if (!config.stripe.webhookSecret) {
    throw new Error('Stripe webhook secret not configured');
  }
  
  return getStripe().webhooks.constructEvent(
    payload,
    signature,
    config.stripe.webhookSecret
  );
}

/**
 * Get plan details
 */
export function getPlanDetails(planId) {
  return PLANS[planId] || null;
}

/**
 * List all plans
 */
export function listPlans() {
  return Object.values(PLANS);
}

export const StripeService = {
  isStripeConfigured,
  getOrCreateCustomer,
  createCheckoutSession,
  createPaymentIntent,
  getSubscription,
  cancelSubscription,
  updateSubscription,
  createBillingPortalSession,
  handleWebhookEvent,
  verifyWebhookSignature,
  getPlanDetails,
  listPlans,
};

export default StripeService;
