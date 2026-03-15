/**
 * Subscription Service
 * Business logic layer for subscription operations
 * Integrates with Stripe for payment processing
 */

import Subscription from '../models/Subscription.js';
import { logger } from '../logger.js';
import Stripe from 'stripe';

// Initialize Stripe client
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

/**
 * Create or retrieve Stripe customer for a user
 */
async function getOrCreateStripeCustomer(userId, email, name = null) {
  if (!stripe) {
    logger.warn('Stripe not configured, skipping customer creation');
    return null;
  }

  // Check if user already has a Stripe customer ID
  const subscription = await Subscription.findByUserId(userId);
  if (subscription?.stripeCustomerId) {
    return subscription.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
      source: 'money_generator_app'
    }
  });

  // Store customer ID in subscription record
  if (subscription) {
    subscription.stripeCustomerId = customer.id;
    await Subscription.createOrUpdate(userId, subscription.plan, {
      stripeCustomerId: customer.id
    });
  }

  return customer.id;
}

/**
 * Create Stripe subscription for a user
 */
async function createStripeSubscription(userId, plan, billingCycle, customerEmail) {
  if (!stripe) {
    logger.warn('Stripe not configured, skipping subscription creation');
    return null;
  }

  // Get or create customer
  const customerId = await getOrCreateStripeCustomer(userId, customerEmail);
  if (!customerId) return null;

  // Get price ID based on plan and billing cycle
  const priceId = getPriceId(plan, billingCycle);
  if (!priceId) {
    logger.warn(`No price ID configured for ${plan}/${billingCycle}`);
    return null;
  }

  // Create subscription
  const stripeSubscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription'
    },
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      userId,
      plan,
      billingCycle
    }
  });

  return stripeSubscription;
}

function inferCardBrand(cardNumber = '') {
  const sanitized = String(cardNumber).replace(/\s+/g, '');
  if (sanitized.startsWith('4')) return 'visa';
  if (/^5[1-5]/.test(sanitized)) return 'mastercard';
  if (/^3[47]/.test(sanitized)) return 'amex';
  if (/^6/.test(sanitized)) return 'discover';
  return 'card';
}

function parseExpiry(expiry = '') {
  const match = String(expiry).match(/^(\d{1,2})\/(\d{2,4})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const year = Number(match[2].length === 2 ? `20${match[2]}` : match[2]);
  if (!month || month < 1 || month > 12 || !year) return null;
  return new Date(year, month, 0);
}

async function syncPaymentPreferences(userId, paymentOptions = {}) {
  const {
    paymentMethod = 'card',
    savedMethodId,
    autoRetry = true,
    rememberMethod = true,
    card,
  } = paymentOptions;

  await Subscription.updateBillingPreferences(userId, {
    autoRetry,
    preferredMethod: paymentMethod,
  });

  if (paymentMethod === 'saved' && savedMethodId) {
    await Subscription.setDefaultPaymentMethod(userId, savedMethodId);
    return;
  }

  if (!rememberMethod) {
    return;
  }

  if (paymentMethod === 'card' && card?.number) {
    const last4 = String(card.number).replace(/\D+/g, '').slice(-4);
    await Subscription.updatePaymentMethod(userId, {
      type: 'card',
      last4,
      brand: inferCardBrand(card.number),
      expiresAt: parseExpiry(card.expiry),
      label: `${inferCardBrand(card.number).toUpperCase()} •••• ${last4}`,
      save: true,
      setDefault: true,
    });
    return;
  }

  if (paymentMethod === 'paypal') {
    await Subscription.updatePaymentMethod(userId, {
      type: 'paypal',
      last4: 'PPAL',
      brand: 'paypal',
      label: 'PayPal',
      providerRef: `paypal_${userId}`,
      save: true,
      setDefault: true,
    });
    return;
  }

  if (paymentMethod === 'crypto') {
    await Subscription.updatePaymentMethod(userId, {
      type: 'crypto',
      last4: 'WALLET',
      brand: 'crypto',
      label: 'Crypto Wallet',
      providerRef: `crypto_${userId}`,
      save: true,
      setDefault: true,
    });
  }
}

/**
 * Get Stripe price ID for a plan/cycle combination
 */
function getPriceId(plan, billingCycle = 'monthly') {
  const priceMap = {
    'pro-monthly': process.env.STRIPE_PRICE_PRO_MONTHLY,
    'pro-annual': process.env.STRIPE_PRICE_PRO_ANNUAL,
    'enterprise-monthly': process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    'enterprise-annual': process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL,
  };
  return priceMap[`${plan}-${billingCycle}`] || null;
}

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
  async upgradePlan(userId, newPlan, billingCycle = 'monthly', customerEmail = null, paymentOptions = {}) {
    try {
      const validPlans = ['basic', 'pro', 'enterprise'];
      if (!validPlans.includes(newPlan)) {
        throw new Error(`Invalid plan: ${newPlan}`);
      }

      const subscription = await Subscription.upgradePlan(userId, newPlan, billingCycle);

      logger.info(`User ${userId} upgraded to ${newPlan} plan (${billingCycle})`);

      // Create Stripe subscription for paid plans
      let stripeSubscription = null;
      if (newPlan !== 'basic' && stripe && customerEmail) {
        try {
          stripeSubscription = await createStripeSubscription(userId, newPlan, billingCycle, customerEmail);
          
          if (stripeSubscription) {
            // Update local record with Stripe subscription ID
            await Subscription.createOrUpdate(userId, newPlan, {
              stripeSubscriptionId: stripeSubscription.id,
              stripeCustomerId: stripeSubscription.customer
            });
            
            logger.info(`Stripe subscription created: ${stripeSubscription.id}`);
          }
        } catch (stripeError) {
          logger.error('Stripe subscription creation failed:', stripeError);
          // Continue with local upgrade even if Stripe fails
        }
      }

      await syncPaymentPreferences(userId, paymentOptions);

      return {
        success: true,
        message: `Successfully upgraded to ${newPlan} plan`,
        subscription: formatSubscriptionResponse(subscription),
        nextPaymentDue: subscription.nextPaymentDue,
        stripeClientSecret: stripeSubscription?.latest_invoice?.payment_intent?.client_secret || null,
        requiresPayment: !!stripeSubscription?.latest_invoice?.payment_intent?.client_secret
      };
    } catch (error) {
      logger.error('Error upgrading plan:', error);
      throw error;
    }
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId, reason = null, cancelImmediately = false) {
    try {
      const subscription = await Subscription.findByUserId(userId);
      
      // Cancel Stripe subscription if exists
      if (subscription?.stripeSubscriptionId && stripe) {
        try {
          if (cancelImmediately) {
            await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
            logger.info(`Stripe subscription cancelled immediately: ${subscription.stripeSubscriptionId}`);
          } else {
            // Cancel at period end (user keeps access until billing period ends)
            await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
              cancel_at_period_end: true,
              metadata: {
                cancellation_reason: reason || 'user_requested'
              }
            });
            logger.info(`Stripe subscription set to cancel at period end: ${subscription.stripeSubscriptionId}`);
          }
        } catch (stripeError) {
          logger.error('Stripe cancellation failed:', stripeError);
          // Continue with local cancellation
        }
      }

      const cancelledSubscription = await Subscription.cancel(userId);
      logger.info(`User ${userId} cancelled subscription. Reason: ${reason || 'none provided'}`);

      return {
        success: true,
        message: cancelImmediately 
          ? 'Subscription cancelled immediately'
          : 'Subscription will be cancelled at the end of the billing period',
        subscription: formatSubscriptionResponse(cancelledSubscription),
        cancelledAt: cancelledSubscription.cancelledAt,
        accessEndsAt: cancelledSubscription.currentPeriodEnd
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
  async getBillingPortalUrl(userId, returnUrl = null) {
    try {
      const subscription = await Subscription.findByUserId(userId);

      if (!subscription?.stripeCustomerId) {
        return {
          success: false,
          error: 'No billing information found. Please subscribe to a plan first.'
        };
      }

      if (!stripe) {
        logger.warn('Stripe not configured');
        return {
          success: false,
          error: 'Payment provider not configured'
        };
      }

      // Create Stripe billing portal session
      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: returnUrl || process.env.APP_URL + '/account/subscription'
      });

      logger.info(`Created billing portal session for user ${userId}`);

      return {
        success: true,
        portalUrl: session.url,
        features: {
          canUpdate: true,
          canCancel: true,
          canDowngrade: true,
          canViewInvoices: true
        }
      };
    } catch (error) {
      logger.error('Error getting billing portal URL:', error);
      
      // Fallback for development
      if (error.type === 'StripeInvalidRequestError') {
        return {
          success: true,
          portalUrl: process.env.STRIPE_PORTAL_URL || '/account/subscription',
          features: {
            canUpdate: true,
            canCancel: true,
            canDowngrade: true
          },
          note: 'Using fallback URL - Stripe billing portal not configured'
        };
      }
      
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
  ,

  async getPaymentMethods(userId) {
    try {
      const result = await Subscription.getPaymentMethods(userId);
      const billingPreferences = await Subscription.updateBillingPreferences(userId, {});
      return {
        success: true,
        ...result,
        billingPreferences,
      };
    } catch (error) {
      logger.error('Error getting payment methods:', error);
      throw error;
    }
  },

  async savePaymentMethod(userId, paymentDetails) {
    try {
      const subscription = await Subscription.updatePaymentMethod(userId, {
        ...paymentDetails,
        save: true,
        setDefault: paymentDetails.setDefault !== false,
      });
      return {
        success: true,
        paymentMethod: subscription.paymentMethod,
        savedPaymentMethods: subscription.savedPaymentMethods || [],
        defaultMethodId: subscription.preferredPaymentMethodId || null,
      };
    } catch (error) {
      logger.error('Error saving payment method:', error);
      throw error;
    }
  },

  async deletePaymentMethod(userId, methodId) {
    try {
      const subscription = await Subscription.removePaymentMethod(userId, methodId);
      return {
        success: true,
        savedPaymentMethods: subscription.savedPaymentMethods || [],
        defaultMethodId: subscription.preferredPaymentMethodId || null,
      };
    } catch (error) {
      logger.error('Error deleting payment method:', error);
      throw error;
    }
  },

  async setDefaultPaymentMethod(userId, methodId) {
    try {
      const subscription = await Subscription.setDefaultPaymentMethod(userId, methodId);
      return {
        success: true,
        paymentMethod: subscription.paymentMethod,
        defaultMethodId: subscription.preferredPaymentMethodId || null,
      };
    } catch (error) {
      logger.error('Error setting default payment method:', error);
      throw error;
    }
  },

  async getBillingPreferences(userId) {
    try {
      const subscription = await Subscription.findByUserId(userId);
      return {
        success: true,
        billingPreferences: subscription.billingPreferences || {
          autoRetry: true,
          preferredMethod: 'card',
          retryDelayHours: 24,
        },
      };
    } catch (error) {
      logger.error('Error getting billing preferences:', error);
      throw error;
    }
  },

  async updateBillingPreferences(userId, preferences) {
    try {
      const billingPreferences = await Subscription.updateBillingPreferences(userId, preferences);
      return {
        success: true,
        billingPreferences,
      };
    } catch (error) {
      logger.error('Error updating billing preferences:', error);
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
    trialEndsAt: subscription.trialEndsAt,
    paymentMethod: subscription.paymentMethod || null,
    savedPaymentMethods: subscription.savedPaymentMethods || [],
    defaultPaymentMethodId: subscription.preferredPaymentMethodId || null,
    billingPreferences: subscription.billingPreferences || {
      autoRetry: true,
      preferredMethod: 'card',
      retryDelayHours: 24,
    }
  };
}

function formatCurrency(amount) {
  return `$${(Math.round(amount * 100) / 100).toFixed(2)}`;
}

async function handleSubscriptionUpdated(stripeSubscription) {
  // Find user by Stripe customer ID
  const userId = stripeSubscription.metadata?.userId;
  
  if (!userId) {
    logger.warn(`No userId in subscription metadata: ${stripeSubscription.id}`);
    return;
  }

  // Map Stripe status to our status
  const statusMap = {
    'active': 'active',
    'past_due': 'past_due',
    'canceled': 'cancelled',
    'unpaid': 'unpaid',
    'trialing': 'trialing',
    'incomplete': 'incomplete',
    'incomplete_expired': 'expired'
  };

  const plan = stripeSubscription.metadata?.plan || 'pro';
  const status = statusMap[stripeSubscription.status] || 'active';
  
  // Update local subscription record
  await Subscription.createOrUpdate(userId, plan, {
    status,
    stripeSubscriptionId: stripeSubscription.id,
    stripeCustomerId: stripeSubscription.customer,
    currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
    currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
  });

  logger.info(`Subscription updated: ${stripeSubscription.id} -> ${status}`);
}

async function handleSubscriptionDeleted(stripeSubscription) {
  const userId = stripeSubscription.metadata?.userId;
  
  if (!userId) {
    logger.warn(`No userId in subscription metadata: ${stripeSubscription.id}`);
    return;
  }

  // Mark subscription as cancelled
  await Subscription.cancel(userId);
  
  logger.info(`Subscription deleted/cancelled: ${stripeSubscription.id}`);
}

async function handlePaymentSucceeded(invoice) {
  const subscriptionId = invoice.subscription;
  const customerId = invoice.customer;
  
  logger.info(`Payment succeeded for subscription ${subscriptionId}, invoice ${invoice.id}`);
  
  // Update payment status if needed
  // This typically doesn't require action since subscription.updated handles status changes
}

async function handlePaymentFailed(invoice) {
  const subscriptionId = invoice.subscription;
  // invoice.customer available if needed for notification emails
  logger.warn(`Payment failed for subscription ${subscriptionId}, invoice ${invoice.id}`);

  const userId = invoice.metadata?.userId || invoice.customer;
  const subscription = userId ? await Subscription.findByUserId(userId) : null;

  if (subscription?.billingPreferences?.autoRetry) {
    logger.info(`Auto-retry enabled for failed invoice ${invoice.id}`);
  }
}

export default SubscriptionService;
