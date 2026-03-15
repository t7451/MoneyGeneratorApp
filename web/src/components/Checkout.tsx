import { useEffect, useState } from 'react';
import './Checkout.css';
import { apiFetchJson } from '../lib/apiClient';

type BillingCycle = 'monthly' | 'annual';
type PaymentMethod = 'card' | 'paypal' | 'crypto' | 'saved';

type PaymentDetails = {
  method: PaymentMethod;
  savedMethodId?: string;
  autoRetry: boolean;
  rememberMethod: boolean;
  card?: {
    name: string;
    number: string;
    expiry: string;
    cvc: string;
  };
};

type SavedMethod = {
  id: string;
  label: string;
  type: string;
  expiry?: string;
  brand?: string;
  last4?: string;
};

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  popular?: boolean;
  cta?: string;
}

interface Addon {
  id: string;
  name: string;
  price: number;
  description: string;
}

const PLANS: Plan[] = [
  {
    id: 'plan_free',
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    features: ['Basic earnings tracking', 'Manual transaction entry', 'Monthly email reports'],
    cta: 'Get Started',
  },
  {
    id: 'plan_pro',
    name: 'Pro',
    monthlyPrice: 14.99,
    annualPrice: 119.88,
    features: [
      'Advanced analytics dashboard',
      'Bank account integration',
      'Instant payout tracking',
      'Smart automations',
      'Priority email support',
    ],
    popular: true,
    cta: 'Start Pro Trial',
  },
  {
    id: 'plan_enterprise',
    name: 'Enterprise',
    monthlyPrice: 49.99,
    annualPrice: 479.88,
    features: [
      'All Pro features',
      'Team management (up to 10)',
      'Custom integrations',
      'API access',
      'Dedicated account manager',
      'Phone support',
    ],
    cta: 'Contact Sales',
  },
];

const ADDONS: Addon[] = [
  {
    id: 'addon_shift_insights',
    name: 'Shift Insights',
    price: 4.99,
    description: 'Deep per-shift profitability analysis',
  },
  {
    id: 'addon_tax_prep',
    name: 'Tax Prep Bundle',
    price: 9.99,
    description: 'Automated tax categorization & export',
  },
  {
    id: 'addon_mileage',
    name: 'Mileage Tracker',
    price: 3.99,
    description: 'GPS-based mileage logging',
  },
];

interface CheckoutProps {
  currentPlan?: string;
  onSelectPlan: (planId: string, cycle: BillingCycle, addons: string[], payment: PaymentDetails) => void;
  onClose: () => void;
}

export function Checkout({ currentPlan, onSelectPlan, onClose }: CheckoutProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [step, setStep] = useState<'plan' | 'addons' | 'confirm'>('plan');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [savedMethods, setSavedMethods] = useState<SavedMethod[]>([]);
  const [selectedSavedMethod, setSelectedSavedMethod] = useState<string>('');
  const [autoRetry, setAutoRetry] = useState(true);
  const [rememberMethod, setRememberMethod] = useState(true);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [paymentMethodsError, setPaymentMethodsError] = useState<string | null>(null);
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  const annualSavings = Math.round(((14.99 * 12 - 119.88) / (14.99 * 12)) * 100);

  useEffect(() => {
    let cancelled = false;

    const loadPaymentSetup = async () => {
      setLoadingPaymentMethods(true);
      try {
        const [methodsResponse, preferencesResponse] = await Promise.all([
          apiFetchJson<{
            methods?: Array<{ id: string; label: string; type: string; expiresAt?: string | null; brand?: string; last4?: string }>;
            defaultMethodId?: string | null;
          }>('/api/v2/subscriptions/payment-methods'),
          apiFetchJson<{ billingPreferences?: { autoRetry?: boolean; preferredMethod?: string } }>('/api/v2/subscriptions/billing-preferences'),
        ]);

        if (cancelled) return;

        const apiMethods = (methodsResponse.methods || []).map((method) => ({
          id: method.id,
          label: method.label,
          type: method.type,
          expiry: method.expiresAt ? new Date(method.expiresAt).toLocaleDateString(undefined, { month: '2-digit', year: '2-digit' }).replace('/', '/') : undefined,
          brand: method.brand,
          last4: method.last4,
        }));

        if (apiMethods.length > 0) {
          setSavedMethods(apiMethods);
          setSelectedSavedMethod(methodsResponse.defaultMethodId || apiMethods[0].id);
          setPaymentMethodsError(null);
        } else {
          setSavedMethods([]);
          setSelectedSavedMethod('');
        }

        if (preferencesResponse.billingPreferences?.autoRetry !== undefined) {
          setAutoRetry(Boolean(preferencesResponse.billingPreferences.autoRetry));
        }

        if (preferencesResponse.billingPreferences?.preferredMethod) {
          const preferredMethod = preferencesResponse.billingPreferences.preferredMethod as PaymentMethod;
          if (preferredMethod === 'saved' && apiMethods.length === 0) {
            setPaymentMethod('card');
          } else {
            setPaymentMethod(preferredMethod);
          }
        }
      } catch {
        if (!cancelled) {
          setSavedMethods([]);
          setSelectedSavedMethod('');
          setPaymentMethod('card');
          setPaymentMethodsError('Saved payment methods are unavailable right now.');
        }
      } finally {
        if (!cancelled) {
          setLoadingPaymentMethods(false);
        }
      }
    };

    loadPaymentSetup();

    return () => {
      cancelled = true;
    };
  }, []);

  const getPrice = (plan: Plan) => {
    return billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice / 12;
  };

  const formatPrice = (price: number) => {
    return price === 0 ? 'Free' : `$${price.toFixed(2)}`;
  };

  const toggleAddon = (addonId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId)
        ? prev.filter((id) => id !== addonId)
        : [...prev, addonId]
    );
  };

  const calculateTotal = () => {
    const plan = PLANS.find((p) => p.id === selectedPlan);
    if (!plan) return 0;

    const planPrice = getPrice(plan);
    const addonsTotal = selectedAddons.reduce((total, addonId) => {
      const addon = ADDONS.find((a) => a.id === addonId);
      return total + (addon?.price || 0);
    }, 0);

    return planPrice + addonsTotal;
  };

  const handleContinue = () => {
    if (step === 'plan' && selectedPlan) {
      const plan = PLANS.find((p) => p.id === selectedPlan);
      if (plan && plan.monthlyPrice > 0) {
        setStep('addons');
      } else {
        handleConfirm();
      }
    } else if (step === 'addons') {
      setStep('confirm');
    }
  };

  const handleConfirm = () => {
    if (!selectedPlan) return;

    const payment: PaymentDetails = {
      method: paymentMethod,
      savedMethodId: selectedSavedMethod,
      autoRetry,
      rememberMethod,
      card: paymentMethod === 'card' ? {
        name: cardName,
        number: cardNumber,
        expiry: cardExpiry,
        cvc: cardCvc,
      } : undefined,
    };

    onSelectPlan(selectedPlan, billingCycle, selectedAddons, payment);
  };

  return (
    <div className="checkout-overlay" onClick={onClose}>
      <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
        <button className="checkout-close" onClick={onClose}>
          ×
        </button>

        <div className="checkout-header">
          <h2>
            {step === 'plan' && 'Choose Your Plan'}
            {step === 'addons' && 'Supercharge Your Experience'}
            {step === 'confirm' && 'Confirm Your Selection'}
          </h2>
          {step === 'plan' && (
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
          )}
        </div>

        <div className="checkout-content">
          {step === 'plan' && (
            <div className="plans-container">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`plan-option ${selectedPlan === plan.id ? 'selected' : ''} ${plan.popular ? 'popular' : ''}`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.popular && <span className="popular-tag">Most Popular</span>}
                  <h3>{plan.name}</h3>
                  <div className="plan-pricing">
                    <span className="price">{formatPrice(getPrice(plan))}</span>
                    {plan.monthlyPrice > 0 && <span className="period">/month</span>}
                  </div>
                  {billingCycle === 'annual' && plan.annualPrice > 0 && (
                    <p className="annual-total">
                      Billed ${plan.annualPrice.toFixed(2)}/year
                    </p>
                  )}
                  <ul className="plan-feature-list">
                    {plan.features.map((feature, i) => (
                      <li key={i}>
                        <span className="feature-check">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    className={`btn-select ${selectedPlan === plan.id ? 'selected' : ''}`}
                  >
                    {currentPlan === plan.id
                      ? 'Current Plan'
                      : selectedPlan === plan.id
                      ? 'Selected'
                      : plan.cta}
                  </button>
                </div>
              ))}
            </div>
          )}

          {step === 'addons' && (
            <div className="addons-container">
              <p className="addons-intro">
                Enhance your subscription with powerful add-ons
              </p>
              <div className="addons-grid">
                {ADDONS.map((addon) => (
                  <div
                    key={addon.id}
                    className={`addon-card ${selectedAddons.includes(addon.id) ? 'selected' : ''}`}
                    onClick={() => toggleAddon(addon.id)}
                  >
                    <div className="addon-checkbox">
                      {selectedAddons.includes(addon.id) ? '✓' : ''}
                    </div>
                    <div className="addon-info">
                      <h4>{addon.name}</h4>
                      <p>{addon.description}</p>
                    </div>
                    <div className="addon-price">+${addon.price}/mo</div>
                  </div>
                ))}
              </div>
              <button className="btn-skip" onClick={() => setStep('confirm')}>
                Skip add-ons
              </button>
            </div>
          )}

          {step === 'confirm' && (
            <div className="confirm-container">
              <div className="order-summary">
                <h3>Order Summary</h3>
                <div className="summary-item">
                  <span>{PLANS.find((p) => p.id === selectedPlan)?.name} Plan</span>
                  <span>
                    ${getPrice(PLANS.find((p) => p.id === selectedPlan)!).toFixed(2)}/mo
                  </span>
                </div>
                {selectedAddons.map((addonId) => {
                  const addon = ADDONS.find((a) => a.id === addonId);
                  return addon ? (
                    <div key={addonId} className="summary-item addon">
                      <span>{addon.name}</span>
                      <span>${addon.price}/mo</span>
                    </div>
                  ) : null;
                })}
                <div className="summary-divider" />
                <div className="summary-total">
                  <span>Total</span>
                  <span>${calculateTotal().toFixed(2)}/mo</span>
                </div>
              </div>
              <div className="payment-section">
                <div className="payment-header">
                  <div>
                    <h3>Payment Method</h3>
                    <p className="payment-hint">Choose how you'd like to pay and we will remember your preference.</p>
                  </div>
                  <label className="remember-toggle">
                    <input
                      type="checkbox"
                      checked={rememberMethod}
                      onChange={(e) => setRememberMethod(e.target.checked)}
                    />
                    <span>Save method for future</span>
                  </label>
                </div>
                <div className="payment-options">
                  <button
                    type="button"
                    className={`payment-chip ${paymentMethod === 'card' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    💳 Card
                  </button>
                  <button
                    type="button"
                    className={`payment-chip ${paymentMethod === 'paypal' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('paypal')}
                  >
                    🅿️ PayPal
                  </button>
                  <button
                    type="button"
                    className={`payment-chip ${paymentMethod === 'crypto' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('crypto')}
                  >
                    ₿ Crypto
                  </button>
                  <button
                    type="button"
                    className={`payment-chip ${paymentMethod === 'saved' ? 'active' : ''}`}
                    onClick={() => {
                      if (savedMethods.length > 0) {
                        setPaymentMethod('saved');
                      }
                    }}
                    disabled={!loadingPaymentMethods && savedMethods.length === 0}
                  >
                    ⭐ Saved
                  </button>
                </div>

                {paymentMethodsError && (
                  <div className="payment-note payment-note-error">{paymentMethodsError}</div>
                )}

                {paymentMethod === 'saved' && (
                  <div className="saved-methods">
                    {savedMethods.map((method) => (
                      <label key={method.id} className={`saved-method ${selectedSavedMethod === method.id ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="saved-method"
                          checked={selectedSavedMethod === method.id}
                          onChange={() => setSelectedSavedMethod(method.id)}
                        />
                        <div>
                          <div className="saved-label">{method.label}</div>
                          {method.expiry && <div className="saved-meta">Exp {method.expiry}</div>}
                        </div>
                      </label>
                    ))}
                    {!loadingPaymentMethods && savedMethods.length === 0 && (
                      <div className="empty-saved">No saved methods yet</div>
                    )}
                    {loadingPaymentMethods && (
                      <div className="empty-saved">Loading saved methods...</div>
                    )}
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div className="card-form">
                    <div className="form-row">
                      <label>
                        Name on card
                        <input
                          type="text"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          placeholder="Your name"
                        />
                      </label>
                    </div>
                    <div className="form-row">
                      <label>
                        Card number
                        <input
                          type="text"
                          inputMode="numeric"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="4242 4242 4242 4242"
                        />
                      </label>
                    </div>
                    <div className="form-grid">
                      <label>
                        Expiry
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/YY"
                        />
                      </label>
                      <label>
                        CVC
                        <input
                          type="text"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          placeholder="123"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {paymentMethod === 'paypal' && (
                  <div className="payment-note">You'll be redirected to PayPal to complete this purchase.</div>
                )}

                {paymentMethod === 'crypto' && (
                  <div className="payment-note">We support USDC and BTC. A payment link will be generated on confirmation.</div>
                )}

                <div className="payment-footer">
                  <label className="checkbox-inline">
                    <input
                      type="checkbox"
                      checked={autoRetry}
                      onChange={(e) => setAutoRetry(e.target.checked)}
                    />
                    <span>Auto-retry failed renewals after 24 hours</span>
                  </label>
                </div>
              </div>
              <div className="trust-signals">
                <div className="trust-item">🔒 Secure checkout</div>
                <div className="trust-item">💳 Cancel anytime</div>
                <div className="trust-item">✓ 14-day money-back guarantee</div>
              </div>
            </div>
          )}
        </div>

        <div className="checkout-footer">
          {step !== 'plan' && (
            <button
              className="btn-back"
              onClick={() => setStep(step === 'confirm' ? 'addons' : 'plan')}
            >
              Back
            </button>
          )}
          <button
            className="btn-primary btn-checkout"
            onClick={step === 'confirm' ? handleConfirm : handleContinue}
            disabled={!selectedPlan}
          >
            {step === 'confirm' ? 'Complete Purchase' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface PlanCardProps {
  name: string;
  price: string;
  features: string[];
  isPopular?: boolean;
  isCurrentPlan?: boolean;
  onSelect: () => void;
}

export function PlanCard({
  name,
  price,
  features,
  isPopular,
  isCurrentPlan,
  onSelect,
}: PlanCardProps) {
  return (
    <div className={`plan-card-standalone ${isPopular ? 'popular' : ''}`}>
      {isPopular && <span className="popular-badge">Most Popular</span>}
      <h3>{name}</h3>
      <div className="plan-price">{price}</div>
      <ul>
        {features.map((f, i) => (
          <li key={i}>✓ {f}</li>
        ))}
      </ul>
      <button
        className={`btn-primary ${isCurrentPlan ? 'btn-disabled' : ''}`}
        onClick={onSelect}
        disabled={isCurrentPlan}
      >
        {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
      </button>
    </div>
  );
}
