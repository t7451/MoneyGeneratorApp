import React, { useState } from 'react';
import { Check, Zap, Crown, Building2, CreditCard, Calendar, Shield, ArrowRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import './PricingPage.css';

interface Plan {
  id: string;
  name: string;
  icon: React.ReactNode;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
  popular?: boolean;
  cta: string;
  highlight?: string;
}

interface Addon {
  id: string;
  name: string;
  price: number;
  description: string;
  icon: string;
}

const PLANS: Plan[] = [
  {
    id: 'plan_free',
    name: 'Free',
    icon: <Zap size={24} />,
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'Perfect for getting started with basic tracking',
    features: [
      'Basic earnings tracking',
      'Manual transaction entry',
      'Monthly email reports',
      'Community support',
      '1 connected platform',
    ],
    cta: 'Get Started Free',
  },
  {
    id: 'plan_pro',
    name: 'Pro',
    icon: <Crown size={24} />,
    monthlyPrice: 14.99,
    annualPrice: 119.88,
    description: 'For serious gig workers who want to maximize earnings',
    features: [
      'Everything in Free, plus:',
      'Advanced analytics dashboard',
      'Bank account integration',
      'Instant payout tracking',
      'Smart automations',
      'Priority email support',
      'Unlimited platforms',
      'Export to CSV/PDF',
    ],
    popular: true,
    cta: 'Start 14-Day Free Trial',
    highlight: 'Most Popular',
  },
  {
    id: 'plan_enterprise',
    name: 'Enterprise',
    icon: <Building2 size={24} />,
    monthlyPrice: 49.99,
    annualPrice: 479.88,
    description: 'For teams and power users who need advanced features',
    features: [
      'Everything in Pro, plus:',
      'Team management (up to 10)',
      'Custom integrations',
      'Full API access',
      'Dedicated account manager',
      'Phone support',
      'Custom reports',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
  },
];

const ADDONS: Addon[] = [
  {
    id: 'addon_shift_insights',
    name: 'Shift Insights',
    price: 4.99,
    description: 'Deep per-shift profitability analysis with AI recommendations',
    icon: '📊',
  },
  {
    id: 'addon_tax_prep',
    name: 'Tax Prep Bundle',
    price: 9.99,
    description: 'Automated tax categorization, quarterly estimates & export',
    icon: '📋',
  },
  {
    id: 'addon_mileage',
    name: 'Mileage Tracker',
    price: 3.99,
    description: 'GPS-based automatic mileage logging with IRS reports',
    icon: '🚗',
  },
  {
    id: 'addon_receipts',
    name: 'Receipt Scanner',
    price: 2.99,
    description: 'OCR receipt capture and automatic expense categorization',
    icon: '🧾',
  },
];

const PricingPage: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const { openCheckout, userProfile } = useAppContext();

  const annualSavings = Math.round(((14.99 * 12 - 119.88) / (14.99 * 12)) * 100);

  const getPrice = (plan: Plan) => {
    return billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice / 12;
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    return `$${price.toFixed(2)}`;
  };

  const toggleAddon = (addonId: string) => {
    setSelectedAddons(prev =>
      prev.includes(addonId)
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  const handleSelectPlan = (_planId: string) => {
    openCheckout();
  };

  const isCurrentPlan = (planId: string) => {
    return userProfile?.subscription === planId;
  };

  return (
    <div className="pricing-page">
      {/* Hero Section */}
      <div className="pricing-hero">
        <div className="hero-content">
          <h1>Simple, Transparent Pricing</h1>
          <p>Choose the plan that fits your gig economy lifestyle. All plans include a 14-day free trial.</p>
          
          {/* Billing Toggle */}
          <div className="billing-toggle">
            <button
              className={`toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </button>
            <button
              className={`toggle-btn ${billingCycle === 'annual' ? 'active' : ''}`}
              onClick={() => setBillingCycle('annual')}
            >
              Annual
              <span className="savings-badge">Save {annualSavings}%</span>
            </button>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="plans-container">
        <div className="plans-grid">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`plan-card ${plan.popular ? 'popular' : ''} ${isCurrentPlan(plan.id) ? 'current' : ''}`}
            >
              {plan.highlight && (
                <div className="plan-highlight">{plan.highlight}</div>
              )}
              
              <div className="plan-header">
                <div className="plan-icon">{plan.icon}</div>
                <h3 className="plan-name">{plan.name}</h3>
                <p className="plan-description">{plan.description}</p>
              </div>

              <div className="plan-pricing">
                <span className="price">{formatPrice(getPrice(plan))}</span>
                {plan.monthlyPrice > 0 && (
                  <span className="period">/month</span>
                )}
                {billingCycle === 'annual' && plan.annualPrice > 0 && (
                  <div className="annual-total">
                    Billed ${plan.annualPrice.toFixed(2)}/year
                  </div>
                )}
              </div>

              <ul className="plan-features">
                {plan.features.map((feature, index) => (
                  <li key={index}>
                    <Check size={16} className="feature-check" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`plan-cta ${plan.popular ? 'primary' : 'secondary'}`}
                onClick={() => handleSelectPlan(plan.id)}
                disabled={isCurrentPlan(plan.id)}
              >
                {isCurrentPlan(plan.id) ? 'Current Plan' : plan.cta}
                {!isCurrentPlan(plan.id) && <ArrowRight size={16} />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add-ons Section */}
      <div className="addons-section">
        <div className="section-header">
          <h2>Power Up with Add-ons</h2>
          <p>Enhance your plan with these powerful features</p>
        </div>

        <div className="addons-grid">
          {ADDONS.map((addon) => (
            <div
              key={addon.id}
              className={`addon-card ${selectedAddons.includes(addon.id) ? 'selected' : ''}`}
              onClick={() => toggleAddon(addon.id)}
            >
              <div className="addon-icon">{addon.icon}</div>
              <div className="addon-info">
                <h4>{addon.name}</h4>
                <p>{addon.description}</p>
              </div>
              <div className="addon-price">
                <span>${addon.price.toFixed(2)}</span>
                <span className="period">/mo</span>
              </div>
              <div className="addon-checkbox">
                {selectedAddons.includes(addon.id) && <Check size={16} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust Section */}
      <div className="trust-section">
        <div className="trust-badges">
          <div className="trust-item">
            <Shield size={24} />
            <span>Bank-level Security</span>
          </div>
          <div className="trust-item">
            <CreditCard size={24} />
            <span>Cancel Anytime</span>
          </div>
          <div className="trust-item">
            <Calendar size={24} />
            <span>14-Day Free Trial</span>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="faq-section">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-grid">
          <div className="faq-item">
            <h4>Can I switch plans anytime?</h4>
            <p>Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate your billing.</p>
          </div>
          <div className="faq-item">
            <h4>What happens after my trial ends?</h4>
            <p>Your trial converts to a paid subscription automatically. You can cancel anytime before the trial ends to avoid charges.</p>
          </div>
          <div className="faq-item">
            <h4>Is my data secure?</h4>
            <p>Absolutely. We use bank-level 256-bit encryption and never store your banking credentials. We're SOC 2 compliant.</p>
          </div>
          <div className="faq-item">
            <h4>Do you offer refunds?</h4>
            <p>Yes, we offer a 30-day money-back guarantee. If you're not satisfied, contact support for a full refund.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
