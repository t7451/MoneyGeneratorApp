/**
 * Subscription Service
 * Business logic layer for subscription operations
 * Integrates with Stripe for payment processing
 */

import Subscription from '../models/Subscription.js';
import { logger } from '../logger.js';

const SubscriptionService = {
  /**
   * Create or get user subscription
   */
  async getOrCreateSubscription(userId, plan = 'basic') {
    try {
      let subscription = await Subscription.findByUserId(userId);
      
      if (!subscription) {
        subscription = await Subscription.createOrUpdate(userId, plan);
      }

      return {
        success: true,
        subscription: formatSubscriptionResponse(subscription)
      };
    } catch (error) {
      logger.error('Error getting subscription:', error);
      throw error;
    }
  },

  /**
   * Upgrade subscription plan
   */
  async upgradePlan(userId, newPlan, billingCycle = 'monthly') {
    try {
      const validPlans = ['basic', 'pro', 'enterprise'];
      if (!validPlans.includes(newPlan)) {
        throw new Error(`Invalid plan: ${newPlan}`);
      }

      const subscription = await Subscription.upgradePlan(userId, newPlan, billingCycle);

      logger.info(`User ${userId} upgraded to ${newPlan} plan (${billingCycle})`);

      // TODO: In production, create Stripe payment/subscription here
      // if (newPlan !== 'basic') {
      //   await createStripeSubscription(userId, subscription);
      // }

      return {
        success: true,
        message: `Successfully upgraded to ${newPlan} plan`,
        subscription: formatSubscriptionResponse(subscription),
        nextPaymentDue: subscription.nextPaymentDue
      };
    } catch (error) {
      logger.error('Error upgrading plan:', error);
      throw error;
    }
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId, reason = null) {
    try {
      const subscription = await Subscription.cancel(userId);

      logger.info(`User ${userId} cancelled subscription. Reason: ${reason || 'none provided'}`);

      // TODO: In production, cancel Stripe subscription
      // if (subscription.stripeSubscriptionId) {
      //   await stripe.subscriptions.del(subscription.stripeSubscriptionId);
      // }

      return {
        success: true,
        message: 'Subscription cancelled',
        subscription: formatSubscriptionResponse(subscription),
        cancelledAt: subscription.cancelledAt
      };
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      throw error;
    }
  },

  /**
   * Check if user has feature access
   */
  async hasFeature(userId, featureName) {
    try {
      const subscription = await Subscription.findByUserId(userId);

      if (subscription.status !== 'active') {
        return false;
      }

      return subscription.features[featureName] || false;
    } catch (error) {
      logger.error('Error checking feature:', error);
      throw error;
    }
  },

  /**
   * Update payment method
   */
  async updatePaymentMethod(userId, paymentDetails) {
    try {
      if (!paymentDetails.type || !paymentDetails.last4 || !paymentDetails.brand) {
        throw new Error('Payment method requires type, last4, and brand');
      }

      const subscription = await Subscription.updatePaymentMethod(userId, paymentDetails);

      logger.info(`User ${userId} updated payment method`);

      return {
        success: true,
        message: 'Payment method updated',
        paymentMethod: subscription.paymentMethod
      };
    } catch (error) {
      logger.error('Error updating payment method:', error);
      throw error;
    }
  },

  /**
   * Start free trial
   */
  async startTrial(userId, days = 14) {
    try {
      const subscription = await Subscription.createTrial(userId, days);

      logger.info(`User ${userId} started ${days}-day trial`);

      return {
        success: true,
        message: `${days}-day trial activated! Access Pro features free.`,
        subscription: formatSubscriptionResponse(subscription),
        trialEndsAt: subscription.trialEndsAt
      };
    } catch (error) {
      logger.error('Error starting trial:', error);
      throw error;
    }
  },

  /**
   * Get subscription billing portal URL (Stripe)
   */
  async getBillingPortalUrl(userId) {
    try {
      const subscription = await Subscription.findByUserId(userId);

      if (!subscription.stripeCustomerId) {
        return {
          success: false,
          error: 'No billing information found'
        };
      }

      // TODO: Create Stripe billing portal session
      // const session = await stripe.billingPortal.sessions.create({
      //   customer: subscription.stripeCustomerId,
      //   return_url: `${process.env.APP_URL}/account/subscription`
      // });

      return {
        success: true,
        portalUrl: process.env.STRIPE_PORTAL_URL || '/account/subscription',
        features: {
          canUpdate: true,
          canCancel: true,
          canDowngrade: true
        }
      };
    } catch (error) {
      logger.error('Error getting billing portal URL:', error);
      throw error;
    }
  },

  /**
   * Get subscription stats (for admin dashboard)
   */
  async getSubscriptionStats() {
    try {
      const stats = await Subscription.getStats();

      return {
        success: true,
        stats: {
          totalSubscribers: stats.total,
          byPlan: stats.byPlan,
          monthlyRecurringRevenue: formatCurrency(stats.mrr),
          annualRunRate: formatCurrency(stats.arr),
          distribution: {
            basicPercentage: stats.total > 0 ? Math.round((stats.byPlan.basic / stats.total) * 100) : 0,
            proPercentage: stats.total > 0 ? Math.round((stats.byPlan.pro / stats.total) * 100) : 0,
            enterprisePercentage: stats.total > 0 ? Math.round((stats.byPlan.enterprise / stats.total) * 100) : 0
          }
        }
      };
    } catch (error) {
      logger.error('Error getting subscription stats:', error);
      throw error;
    }
  },

  /**
   * Get available plans with pricing
   */
  getPlans() {
    return {
      success: true,
      plans: [
        {
          id: 'basic',
          name: 'Basic',
          description: 'Perfect for getting started',
          price: { monthly: 0, annual: 0 },
          billing: ['monthly', 'annual'],
          features: Subscription.getPlanDetails('basic').features,
          popular: false,
          cta: 'Get Started',
          stripePriceId: process.env.STRIPE_PRICE_BASIC_MONTHLY
        },
        {
          id: 'pro',
          name: 'Pro',
          description: 'For serious money makers',
          price: { monthly: 9.99, annual: 99 },
          billing: ['monthly', 'annual'],
          savings: 'Save 17% with annual',
          features: Subscription.getPlanDetails('pro').features,
          popular: true,
          cta: 'Start Free Trial',
          badge: '14-day free trial',
          stripePriceId: {
            monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
            annual: process.env.STRIPE_PRICE_PRO_ANNUAL
          }
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          description: 'For teams and large organizations',
          price: { monthly: null, annual: null },
          billing: ['custom'],
          features: Subscription.getPlanDetails('enterprise').features,
          popular: false,
          cta: 'Contact Sales',
          contact: 'sales@moneygeneratorapp.com'
        }
      ]
    };
  },

  /**
   * Handle Stripe webhook for subscription events
   */
  async handleStripeWebhook(event) {
    try {
      switch (event.type) {
        case 'customer.subscription.updated':
          return await handleSubscriptionUpdated(event.data.object);
        
        case 'customer.subscription.deleted':
          return await handleSubscriptionDeleted(event.data.object);
        
        case 'invoice.payment_succeeded':
          return await handlePaymentSucceeded(event.data.object);
        
        case 'invoice.payment_failed':
          return await handlePaymentFailed(event.data.object);
        
        default:
          logger.info(`Unhandled Stripe event: ${event.type}`);
      }
    } catch (error) {
      logger.error('Error handling Stripe webhook:', error);
      throw error;
    }
  }
};

/**
 * Helper functions
 */

function formatSubscriptionResponse(subscription) {
  return {
    id: subscription._id,
    plan: subscription.plan,
    status: subscription.status,
    billingCycle: subscription.billingCycle,
    price: subscription.billingCycle === 'monthly'
      ? subscription.monthlyPrice / 100
      : subscription.annualPrice / 100,
    currentPeriod: {
      start: subscription.currentPeriodStart,
      end: subscription.currentPeriodEnd
    },
    nextPaymentDue: subscription.nextPaymentDue,
    features: subscription.features,
    isActive: subscription.status === 'active',
    trialActive: subscription.trialActive,
    trialEndsAt: subscription.trialEndsAt
  };
}

function formatCurrency(amount) {
  return `$${(Math.round(amount * 100) / 100).toFixed(2)}`;
}

async function handleSubscriptionUpdated(stripeSubscription) {
  // TODO: Update subscription in database
  logger.info(`Subscription updated: ${stripeSubscription.id}`);
}

async function handleSubscriptionDeleted(stripeSubscription) {
  // TODO: Mark subscription as cancelled
  logger.info(`Subscription deleted: ${stripeSubscription.id}`);
}

async function handlePaymentSucceeded(invoice) {
  // TODO: Log successful payment
  logger.info(`Payment succeeded: ${invoice.id}`);
}

async function handlePaymentFailed(invoice) {
  // TODO: Send failed payment notification
  logger.warn(`Payment failed: ${invoice.id}`);
}

export default SubscriptionService;
