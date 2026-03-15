/**
 * Subscription Model
 * Manages user subscriptions, plans, and billing
 */

function createPaymentMethodId() {
  return `pm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const subscriptionSchema = {
  userId: String,
  plan: {
    type: String,
    enum: ['basic', 'pro', 'enterprise'],
    default: 'basic'
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'suspended', 'past_due'],
    default: 'active'
  },
  
  // Stripe integration
  stripeCustomerId: String,
  stripeSubscriptionId: String,
  stripeProductId: String,
  stripePriceId: String,

  // Billing cycle
  billingCycle: {
    type: String,
    enum: ['monthly', 'annual'],
    default: 'monthly'
  },
  currentPeriodStart: Date,
  currentPeriodEnd: Date,

  // Pricing
  monthlyPrice: Number,        // In cents ($9.99 = 999)
  annualPrice: Number,         // In cents ($99 = 9900)
  discount: Number,            // Percentage discount (e.g., 17 for annual)

  // Dates
  createdAt: { type: Date, default: () => new Date() },
  cancelledAt: Date,
  lastPaymentAt: Date,
  nextPaymentDue: Date,

  // Payment method
  paymentMethod: {
    id: String,
    type: String,             // card, bank_account, etc.
    last4: String,            // Last 4 digits
    brand: String,            // visa, mastercard, amex
    expiresAt: Date,
    label: String,
    providerRef: String
  },

  savedPaymentMethods: [],
  preferredPaymentMethodId: String,
  billingPreferences: {
    autoRetry: Boolean,
    preferredMethod: String,
    retryDelayHours: Number
  },

  // Features unlocked by plan
  features: {
    jobsPerMonth: Number,
    advancedAnalytics: Boolean,
    apiAccess: Boolean,
    savedProfiles: Number,
    emailSupport: Boolean,
    adFree: Boolean,
    exportReports: Boolean,
    jobNotifications: Boolean,
    resumeBuilder: Boolean,
    prioritySupport: Boolean,
    customReporting: Boolean,
    teamAccounts: Boolean
  },

  // Trial information
  trialEndsAt: Date,
  trialActive: Boolean,

  metadata: {}
};

// In-memory storage
let subscriptions = [];
let subscriptionCounter = 1000;

// Plan definitions
const PLANS = {
  basic: {
    name: 'Basic',
    price: {
      monthly: 0,        // Free
      annual: 0
    },
    features: {
      jobsPerMonth: 5,
      advancedAnalytics: false,
      apiAccess: false,
      savedProfiles: 1,
      emailSupport: false,
      adFree: false,
      exportReports: false,
      jobNotifications: false,
      resumeBuilder: false,
      prioritySupport: false,
      customReporting: false,
      teamAccounts: false
    }
  },
  pro: {
    name: 'Pro',
    price: {
      monthly: 999,      // $9.99
      annual: 9900       // $99/year (2 months free)
    },
    features: {
      jobsPerMonth: -1,  // Unlimited
      advancedAnalytics: true,
      apiAccess: true,
      savedProfiles: 5,
      emailSupport: true,
      adFree: true,
      exportReports: true,
      jobNotifications: true,
      resumeBuilder: true,
      prioritySupport: false,
      customReporting: false,
      teamAccounts: false
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: {
      monthly: null,     // Custom
      annual: null
    },
    features: {
      jobsPerMonth: -1,  // Unlimited
      advancedAnalytics: true,
      apiAccess: true,
      savedProfiles: -1, // Unlimited
      emailSupport: true,
      adFree: true,
      exportReports: true,
      jobNotifications: true,
      resumeBuilder: true,
      prioritySupport: true,
      customReporting: true,
      teamAccounts: true
    }
  }
};

const Subscription = {
  // Create or update subscription
  async createOrUpdate(userId, plan = 'basic', billingCycle = 'monthly') {
    let subscription = subscriptions.find(s => s.userId === userId);
    const planConfig = PLANS[plan];

    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const nextYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

    const subscriptionData = {
      _id: `subscription_${subscriptionCounter++}`,
      userId,
      plan,
      status: 'active',
      billingCycle,
      currentPeriodStart: now,
      currentPeriodEnd: billingCycle === 'monthly' ? nextMonth : nextYear,
      monthlyPrice: planConfig.price.monthly,
      annualPrice: planConfig.price.annual,
      discount: billingCycle === 'annual' ? 17 : 0,
      createdAt: subscription?.createdAt || now,
      nextPaymentDue: billingCycle === 'monthly' ? nextMonth : nextYear,
      features: { ...planConfig.features },
      trialActive: false,
      paymentMethod: subscription?.paymentMethod || null,
      savedPaymentMethods: subscription?.savedPaymentMethods || [],
      preferredPaymentMethodId: subscription?.preferredPaymentMethodId || null,
      billingPreferences: subscription?.billingPreferences || {
        autoRetry: true,
        preferredMethod: 'card',
        retryDelayHours: 24
      },
      metadata: {}
    };

    if (subscription) {
      subscription = { ...subscription, ...subscriptionData };
      const idx = subscriptions.findIndex(s => s.userId === userId);
      subscriptions[idx] = subscription;
    } else {
      subscriptions.push(subscriptionData);
      subscription = subscriptionData;
    }

    return subscription;
  },

  // Get user's subscription
  async findByUserId(userId) {
    return subscriptions.find(s => s.userId === userId) || await this.createOrUpdate(userId, 'basic');
  },

  // Check if user has feature
  async hasFeature(userId, featureName) {
    const sub = await this.findByUserId(userId);
    if (sub.status !== 'active') return false;
    return sub.features[featureName] || false;
  },

  // Upgrade plan
  async upgradePlan(userId, newPlan, billingCycle = 'monthly') {
    const subscription = await this.findByUserId(userId);
    
    if (!PLANS[newPlan]) {
      throw new Error('Invalid subscription plan');
    }

    return this.createOrUpdate(userId, newPlan, billingCycle);
  },

  // Cancel subscription
  async cancel(userId) {
    const subscription = await this.findByUserId(userId);
    if (subscription) {
      subscription.status = 'cancelled';
      subscription.cancelledAt = new Date();
      // Revert to basic plan
      subscription.plan = 'basic';
      subscription.features = PLANS.basic.features;
    }
    return subscription;
  },

  // Update payment method
  async updatePaymentMethod(userId, paymentDetails) {
    const subscription = await this.findByUserId(userId);
    if (subscription) {
      const normalizedMethod = {
        id: paymentDetails.id || createPaymentMethodId(),
        type: paymentDetails.type || 'card',
        last4: paymentDetails.last4,
        brand: paymentDetails.brand,
        expiresAt: paymentDetails.expiresAt,
        label: paymentDetails.label || `${paymentDetails.brand || paymentDetails.type} •••• ${paymentDetails.last4 || '----'}`,
        providerRef: paymentDetails.providerRef || null
      };
      subscription.paymentMethod = normalizedMethod;
      subscription.lastPaymentAt = new Date();

      if (!Array.isArray(subscription.savedPaymentMethods)) {
        subscription.savedPaymentMethods = [];
      }

      if (paymentDetails.save !== false) {
        const existingIndex = subscription.savedPaymentMethods.findIndex((method) => method.id === normalizedMethod.id);
        if (existingIndex >= 0) {
          subscription.savedPaymentMethods[existingIndex] = normalizedMethod;
        } else {
          subscription.savedPaymentMethods.push(normalizedMethod);
        }
      }

      if (paymentDetails.setDefault !== false) {
        subscription.preferredPaymentMethodId = normalizedMethod.id;
      }
    }
    return subscription;
  },

  async getPaymentMethods(userId) {
    const subscription = await this.findByUserId(userId);
    return {
      methods: subscription.savedPaymentMethods || [],
      defaultMethodId: subscription.preferredPaymentMethodId || null,
      currentMethod: subscription.paymentMethod || null,
    };
  },

  async removePaymentMethod(userId, methodId) {
    const subscription = await this.findByUserId(userId);
    subscription.savedPaymentMethods = (subscription.savedPaymentMethods || []).filter((method) => method.id !== methodId);
    if (subscription.preferredPaymentMethodId === methodId) {
      subscription.preferredPaymentMethodId = subscription.savedPaymentMethods[0]?.id || null;
    }
    if (subscription.paymentMethod?.id === methodId) {
      subscription.paymentMethod = subscription.savedPaymentMethods[0] || null;
    }
    return subscription;
  },

  async setDefaultPaymentMethod(userId, methodId) {
    const subscription = await this.findByUserId(userId);
    const method = (subscription.savedPaymentMethods || []).find((entry) => entry.id === methodId);
    if (!method) {
      throw new Error('Payment method not found');
    }
    subscription.preferredPaymentMethodId = methodId;
    subscription.paymentMethod = method;
    return subscription;
  },

  async updateBillingPreferences(userId, preferences = {}) {
    const subscription = await this.findByUserId(userId);
    subscription.billingPreferences = {
      autoRetry: preferences.autoRetry ?? subscription.billingPreferences?.autoRetry ?? true,
      preferredMethod: preferences.preferredMethod ?? subscription.billingPreferences?.preferredMethod ?? 'card',
      retryDelayHours: preferences.retryDelayHours ?? subscription.billingPreferences?.retryDelayHours ?? 24,
    };
    return subscription.billingPreferences;
  },

  // Get all subscriptions by plan
  async findByPlan(plan) {
    return subscriptions.filter(s => s.plan === plan && s.status === 'active');
  },

  // Get subscription stats
  async getStats() {
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
    
    return {
      total: activeSubscriptions.length,
      byPlan: {
        basic: activeSubscriptions.filter(s => s.plan === 'basic').length,
        pro: activeSubscriptions.filter(s => s.plan === 'pro').length,
        enterprise: activeSubscriptions.filter(s => s.plan === 'enterprise').length
      },
      mrr: calculateMRR(activeSubscriptions),
      arr: calculateARR(activeSubscriptions)
    };
  },

  // Get plan details
  getPlanDetails(plan) {
    return PLANS[plan] || null;
  },

  // Create free trial
  async createTrial(userId, days = 14) {
    const subscription = await this.createOrUpdate(userId, 'pro', 'monthly');
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + days);
    
    subscription.trialActive = true;
    subscription.trialEndsAt = trialEndDate;
    
    return subscription;
  },

  // Sync payment status (called by Stripe webhook)
  async syncStripeStatus(userId, stripeData) {
    const subscription = await this.findByUserId(userId);
    if (subscription) {
      subscription.stripeCustomerId = stripeData.customerId;
      subscription.stripeSubscriptionId = stripeData.subscriptionId;
      subscription.status = mapStripeStatus(stripeData.status);
      
      if (stripeData.currentPeriodEnd) {
        subscription.currentPeriodEnd = new Date(stripeData.currentPeriodEnd * 1000);
      }
    }
    return subscription;
  }
};

function calculateMRR(subscriptions) {
  return subscriptions.reduce((sum, sub) => {
    const monthlyPrice = sub.billingCycle === 'monthly'
      ? sub.monthlyPrice
      : Math.ceil(sub.annualPrice / 12);
    return sum + (monthlyPrice || 0);
  }, 0) / 100; // Convert from cents to dollars
}

function calculateARR(subscriptions) {
  return subscriptions.reduce((sum, sub) => {
    const annualPrice = sub.billingCycle === 'annual'
      ? sub.annualPrice
      : (sub.monthlyPrice * 12);
    return sum + (annualPrice || 0);
  }, 0) / 100; // Convert from cents to dollars
}

function mapStripeStatus(stripeStatus) {
  const mapping = {
    'active': 'active',
    'past_due': 'past_due',
    'canceled': 'cancelled',
    'unpaid': 'suspended',
    'incomplete': 'suspended',
    'incomplete_expired': 'cancelled'
  };
  return mapping[stripeStatus] || 'suspended';
}

export default Subscription;
export { PLANS };
