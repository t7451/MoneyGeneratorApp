import { useState, useEffect } from 'react';
import { UserRole } from '../context/AppContext';
import { Briefcase, Building, User, Shield, CreditCard, Star, Zap, Check } from 'lucide-react';
import { useToast } from './Toast';
import { trackEvent } from '../lib/analytics';
import './OnboardingWizard.css';

type OnboardingStep = 'welcome' | 'role' | 'platforms' | 'bank' | 'goals' | 'plan' | 'payment' | 'complete';

type BillingCycle = 'monthly' | 'annual';

interface OnboardingWizardProps {
  onComplete: () => void;
  onConnectBank: () => Promise<boolean>;
  onSelectPlan: (planId: string) => void;
  onSelectRole: (role: UserRole) => void;
  onConnectPlatform?: (platformId: string) => Promise<boolean> | boolean;
  onSetGoal?: (goal: { type: string; target: number }) => Promise<boolean> | boolean;
}

const PLATFORMS = [
  { id: 'uber', name: 'Uber', icon: '\u{1F697}', category: 'Rideshare' },
  { id: 'lyft', name: 'Lyft', icon: '\u{1F699}', category: 'Rideshare' },
  { id: 'doordash', name: 'DoorDash', icon: '\u{1F354}', category: 'Delivery' },
  { id: 'ubereats', name: 'Uber Eats', icon: '\u{1F355}', category: 'Delivery' },
  { id: 'instacart', name: 'Instacart', icon: '\u{1F6D2}', category: 'Delivery' },
  { id: 'grubhub', name: 'Grubhub', icon: '\u{1F961}', category: 'Delivery' },
  { id: 'taskrabbit', name: 'TaskRabbit', icon: '\u{1F527}', category: 'Tasks' },
  { id: 'fiverr', name: 'Fiverr', icon: '\u{1F4BC}', category: 'Freelance' },
  { id: 'upwork', name: 'Upwork', icon: '\u{1F4BB}', category: 'Freelance' },
];

interface PlanOption {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  popular?: boolean;
  cta: string;
}

const PLANS: PlanOption[] = [
  {
    id: 'plan_free',
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    features: ['Basic earnings tracking', 'Manual entry', 'Monthly reports', '1 platform'],
    cta: 'Start Free',
  },
  {
    id: 'plan_pro',
    name: 'Pro',
    monthlyPrice: 14.99,
    annualPrice: 119.88,
    features: ['Advanced analytics', 'Bank integration', 'Instant payouts', 'Smart automations', 'Priority support', 'Unlimited platforms'],
    popular: true,
    cta: 'Start 14-Day Trial',
  },
  {
    id: 'plan_enterprise',
    name: 'Enterprise',
    monthlyPrice: 49.99,
    annualPrice: 479.88,
    features: ['All Pro features', 'Team management (10 users)', 'Custom integrations', 'API access', 'Dedicated support'],
    cta: 'Contact Sales',
  },
];

const ADDONS = [
  { id: 'addon_shift_insights', name: 'Shift Insights', price: 4.99, description: 'Deep per-shift profitability analysis' },
  { id: 'addon_tax_prep', name: 'Tax Prep Bundle', price: 9.99, description: 'Automated tax categorization & export' },
  { id: 'addon_mileage', name: 'Mileage Tracker', price: 3.99, description: 'GPS-based mileage logging' },
];

const STEP_LABELS: Record<OnboardingStep, string> = {
  welcome: 'Welcome',
  role: 'Select Role',
  platforms: 'Connect Platforms',
  bank: 'Link Bank',
  goals: 'Set Goals',
  plan: 'Choose Plan',
  payment: 'Payment',
  complete: 'All Done!',
};

export function OnboardingWizard({
  onComplete,
  onConnectBank,
  onSelectPlan,
  onSelectRole,
  onConnectPlatform,
  onSetGoal,
}: OnboardingWizardProps) {
  const { showToast } = useToast();
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [role, setRole] = useState<UserRole>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [bankConnected, setBankConnected] = useState(false);
  const [bankConnecting, setBankConnecting] = useState(false);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState<number>(500);
  const [taxReserve, setTaxReserve] = useState<number>(25);
  const [showConfetti, setShowConfetti] = useState(false);

  const annualSavings = Math.round(((14.99 * 12 - 119.88) / (14.99 * 12)) * 100);

  // Track step changes
  useEffect(() => {
    trackEvent('onboarding_step_viewed', { step, role });
  }, [step, role]);

  // Dynamic steps based on role and plan
  const getSteps = (): OnboardingStep[] => {
    const baseSteps: OnboardingStep[] = ['welcome', 'role'];

    if (role === 'freelancer') {
      baseSteps.push('platforms');
    }

    baseSteps.push('bank', 'goals', 'plan');

    // Add payment step for paid plans
    if (selectedPlan && selectedPlan !== 'plan_free') {
      baseSteps.push('payment');
    }

    baseSteps.push('complete');
    return baseSteps;
  };

  const steps = getSteps();
  const currentIndex = steps.indexOf(step);
  const progress = ((currentIndex + 1) / steps.length) * 100;

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    } else {
      if (step === 'complete') handleFinish();
    }
  };

  const handleBack = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  };

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
    onSelectRole(selectedRole);
    trackEvent('onboarding_role_selected', { role: selectedRole });
    const nextStep = selectedRole === 'freelancer' ? 'platforms' : 'bank';
    setStep(nextStep);
  };

  const handleConnectBank = async () => {
    setBankConnecting(true);
    trackEvent('onboarding_bank_connect_started');
    try {
      const ok = await onConnectBank();
      setBankConnected(ok);
      if (ok) {
        trackEvent('onboarding_bank_connect_success');
      }
    } finally {
      setBankConnecting(false);
    }
  };

  const handlePlatformToggle = async (platformId: string) => {
    if (connectedPlatforms.includes(platformId)) {
      setConnectedPlatforms(prev => prev.filter(p => p !== platformId));
      return;
    }

    const platformName = PLATFORMS.find((p) => p.id === platformId)?.name ?? 'platform';

    try {
      const result = await onConnectPlatform?.(platformId);
      const ok = result !== false;
      if (!ok) {
        showToast(`Could not connect ${platformName}. Please retry.`, 'error');
        return;
      }
      setConnectedPlatforms((prev) => [...prev, platformId]);
      trackEvent('onboarding_platform_connected', { platform: platformId });
    } catch {
      showToast(`Could not connect ${platformName}. Please retry.`, 'error');
    }
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    trackEvent('onboarding_plan_selected', { plan: planId, billingCycle });
  };

  const handlePlanContinue = () => {
    if (!selectedPlan) {
      handlePlanSelect('plan_free');
    }
    const plan = selectedPlan || 'plan_free';
    onSelectPlan(plan);

    if (plan !== 'plan_free') {
      // Go to payment step for paid plans
      setStep('payment');
    } else {
      setStep('complete');
      triggerConfetti();
    }
  };

  const handlePaymentConfirm = () => {
    trackEvent('onboarding_payment_confirmed', { plan: selectedPlan, addons: selectedAddons, billingCycle });
    setStep('complete');
    triggerConfetti();
  };

  const toggleAddon = (addonId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId)
        ? prev.filter((id) => id !== addonId)
        : [...prev, addonId]
    );
  };

  const handleGoalSave = async () => {
    try {
      const r1 = await onSetGoal?.({ type: 'weekly_earnings', target: weeklyGoal });
      const r2 = await onSetGoal?.({ type: 'tax_reserve_pct', target: taxReserve });
      const ok1 = r1 !== false;
      const ok2 = r2 !== false;
      if (ok1 && ok2) {
        trackEvent('onboarding_goals_set', { weeklyGoal, taxReserve });
        handleNext();
        return;
      }
      showToast('Could not save goals. Please retry.', 'error');
    } catch {
      showToast('Could not save goals. Please retry.', 'error');
    }
  };

  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const handleFinish = () => {
    localStorage.setItem('onboarding_complete', 'true');
    localStorage.setItem('onboarding_data', JSON.stringify({
      role,
      platforms: connectedPlatforms,
      bankConnected,
      weeklyGoal,
      taxReserve,
      plan: selectedPlan,
      billingCycle,
      addons: selectedAddons,
      completedAt: new Date().toISOString(),
    }));
    trackEvent('onboarding_completed', { role, plan: selectedPlan });
    onComplete();
  };

  const getSelectedPlanDetails = () => PLANS.find(p => p.id === selectedPlan);

  const calculateTotal = () => {
    const plan = getSelectedPlanDetails();
    if (!plan) return 0;
    const planPrice = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice / 12;
    const addonsTotal = selectedAddons.reduce((total, addonId) => {
      const addon = ADDONS.find((a) => a.id === addonId);
      return total + (addon?.price || 0);
    }, 0);
    return planPrice + addonsTotal;
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-wizard">
        {/* Progress bar */}
        <div className="onboarding-progress" aria-hidden="true">
          <progress className="progress-bar" value={progress} max={100} />
        </div>

        {/* Step indicator dots */}
        <div className="onboarding-step-indicators">
          {steps.map((s, idx) => (
            <div
              key={s}
              className={`step-dot ${idx < currentIndex ? 'completed' : ''} ${idx === currentIndex ? 'active' : ''}`}
              title={STEP_LABELS[s]}
            />
          ))}
        </div>

        <div className="onboarding-step-label" aria-live="polite">
          Step {currentIndex + 1} of {steps.length}: {STEP_LABELS[step]}
        </div>

        <div className="onboarding-content">
          {/* Step: Welcome */}
          {step === 'welcome' && (
            <div className="onboarding-step onboarding-step-animate">
              <div className="step-icon step-icon-welcome">
                <Zap size={48} className="welcome-icon-pulse" />
              </div>
              <h2>Welcome to Money Generator</h2>
              <p className="welcome-tagline">
                The all-in-one platform to track earnings, optimize finances, and grow your income.
              </p>
              <div className="value-props">
                <div className="value-prop">
                  <Check size={18} />
                  <span>Auto-sync earnings from 20+ platforms</span>
                </div>
                <div className="value-prop">
                  <Check size={18} />
                  <span>Smart tax savings and deduction tracking</span>
                </div>
                <div className="value-prop">
                  <Check size={18} />
                  <span>Real-time insights and spending analytics</span>
                </div>
              </div>
              <button className="btn-primary btn-large" onClick={handleNext}>
                Get Started
              </button>
              <p className="setup-time">Setup takes about 2 minutes</p>
            </div>
          )}

          {/* Step: Role Selection */}
          {step === 'role' && (
            <div className="onboarding-step onboarding-step-animate">
              <div className="step-icon"><User size={36} /></div>
              <h2>How will you use Money Generator?</h2>
              <p>We'll tailor your experience based on your selection.</p>

              <div className="role-cards">
                <button
                  type="button"
                  className={`role-card ${role === 'freelancer' ? 'selected' : ''}`}
                  onClick={() => handleRoleSelect('freelancer')}
                  aria-label="Select Freelancer or Gig Worker role"
                >
                  <div className="role-icon"><Briefcase size={24} /></div>
                  <h3>Freelancer / Gig Worker</h3>
                  <p>Track gig earnings, mileage, and optimize your schedule.</p>
                </button>

                <button
                  type="button"
                  className={`role-card ${role === 'business' ? 'selected' : ''}`}
                  onClick={() => handleRoleSelect('business')}
                  aria-label="Select Business Owner role"
                >
                  <div className="role-icon"><Building size={24} /></div>
                  <h3>Business Owner</h3>
                  <p>Manage a team and track shared expenses and payouts.</p>
                </button>

                <button
                  type="button"
                  className={`role-card ${role === 'individual' ? 'selected' : ''}`}
                  onClick={() => handleRoleSelect('individual')}
                  aria-label="Select Individual role"
                >
                  <div className="role-icon"><User size={24} /></div>
                  <h3>Individual</h3>
                  <p>Track personal finances, subscriptions, and savings goals.</p>
                </button>
              </div>
            </div>
          )}

          {/* Step: Platforms (freelancer only) */}
          {step === 'platforms' && (
            <div className="onboarding-step onboarding-step-wide onboarding-step-animate">
              <div className="step-icon"><Zap size={36} /></div>
              <h2>Connect Your Gig Platforms</h2>
              <p>Select the platforms you work with. We'll automatically sync your earnings.</p>
              <div className="platforms-grid">
                {PLATFORMS.map((platform) => (
                  <button
                    type="button"
                    key={platform.id}
                    className={`platform-card ${connectedPlatforms.includes(platform.id) ? 'selected' : ''}`}
                    onClick={() => handlePlatformToggle(platform.id)}
                    aria-label={`Toggle ${platform.name}`}
                  >
                    <span className="platform-icon">{platform.icon}</span>
                    <span className="platform-name">{platform.name}</span>
                    <span className="platform-category">{platform.category}</span>
                    {connectedPlatforms.includes(platform.id) && (
                      <span className="platform-check"><Check size={16} /></span>
                    )}
                  </button>
                ))}
              </div>
              <div className="step-nav">
                <button className="btn-back" onClick={handleBack}>Back</button>
                <button className="btn-primary" onClick={handleNext}>
                  {connectedPlatforms.length > 0 ? `Continue (${connectedPlatforms.length} connected)` : 'Skip'}
                </button>
              </div>
            </div>
          )}

          {/* Step: Bank Connection */}
          {step === 'bank' && (
            <div className="onboarding-step onboarding-step-animate">
              <div className="step-icon"><CreditCard size={36} /></div>
              <h2>Connect Your Bank</h2>
              <p>
                Link your bank account to automatically track income and expenses.
                {role === 'business' ? ' Connect your business account for automated bookkeeping.' : ' We use Plaid for secure, read-only access.'}
              </p>
              {bankConnected ? (
                <div className="success-message success-message-animate">
                  <div className="success-checkmark">
                    <Check size={32} />
                  </div>
                  <span>Bank connected successfully!</span>
                  <p className="success-hint">Your transactions will sync within a few minutes.</p>
                </div>
              ) : (
                <>
                  <button
                    className="btn-primary btn-large"
                    onClick={handleConnectBank}
                    disabled={bankConnecting}
                  >
                    {bankConnecting ? 'Connecting...' : 'Connect Bank Account'}
                  </button>
                  <div className="bank-trust-signals">
                    <div className="trust-signal">
                      <Shield size={14} />
                      <span>256-bit encryption</span>
                    </div>
                    <div className="trust-signal">
                      <Shield size={14} />
                      <span>Read-only access</span>
                    </div>
                    <div className="trust-signal">
                      <Shield size={14} />
                      <span>Bank-level security</span>
                    </div>
                  </div>
                </>
              )}
              <div className="step-nav">
                <button className="btn-back" onClick={handleBack}>Back</button>
                <button className="btn-text" onClick={handleNext}>
                  {bankConnected ? 'Continue' : 'Skip for now'}
                </button>
              </div>
            </div>
          )}

          {/* Step: Goals */}
          {step === 'goals' && (
            <div className="onboarding-step onboarding-step-animate">
              <div className="step-icon"><Star size={36} /></div>
              <h2>Set Your {role === 'business' ? 'Business ' : ''}Goals</h2>
              <p>Define your targets. We'll help you track progress.</p>

              <div className="goal-input-group">
                <label htmlFor="weekly-goal">Weekly {role === 'business' ? 'Revenue' : 'Earnings'} Goal</label>
                <div className="goal-slider-row">
                  <span className="goal-value">${weeklyGoal}</span>
                  <input
                    id="weekly-goal"
                    type="range"
                    min="100"
                    max="5000"
                    step="100"
                    value={weeklyGoal}
                    onChange={(e) => setWeeklyGoal(Number(e.target.value))}
                    className="goal-slider"
                    aria-label="Weekly goal"
                  />
                </div>
              </div>

              <div className="goal-input-group">
                <label htmlFor="tax-reserve">Tax Reserve Percentage</label>
                <div className="goal-slider-row">
                  <span className="goal-value">{taxReserve}%</span>
                  <input
                    id="tax-reserve"
                    type="range"
                    min="10"
                    max="40"
                    step="5"
                    value={taxReserve}
                    onChange={(e) => setTaxReserve(Number(e.target.value))}
                    className="goal-slider"
                    aria-label="Tax reserve percentage"
                  />
                </div>
                <p className="goal-hint">
                  We'll auto-save ${Math.round(weeklyGoal * taxReserve / 100)}/week for taxes
                </p>
              </div>

              <div className="step-nav">
                <button className="btn-back" onClick={handleBack}>Back</button>
                <button className="btn-primary" onClick={handleGoalSave}>
                  Save & Continue
                </button>
              </div>
            </div>
          )}

          {/* Step: Plan Selection (enhanced) */}
          {step === 'plan' && (
            <div className="onboarding-step onboarding-step-wide onboarding-step-animate">
              <h2>Choose Your Plan</h2>
              <p>Start with a plan that fits your needs. Upgrade or downgrade anytime.</p>

              {/* Billing toggle */}
              <div className="billing-toggle-onboarding">
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

              <div className="plans-grid plans-grid-enhanced">
                {PLANS.map((plan) => {
                  const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice / 12;
                  return (
                    <button
                      type="button"
                      key={plan.id}
                      className={`plan-card-enhanced ${selectedPlan === plan.id ? 'selected' : ''} ${plan.popular ? 'popular' : ''}`}
                      onClick={() => handlePlanSelect(plan.id)}
                      aria-label={`Select ${plan.name} plan`}
                    >
                      {plan.popular && <span className="popular-tag">Most Popular</span>}
                      <h3>{plan.name}</h3>
                      <div className="price">
                        {price === 0 ? 'Free' : `$${price.toFixed(2)}`}
                        {price > 0 && <span className="price-period">/mo</span>}
                      </div>
                      {billingCycle === 'annual' && plan.annualPrice > 0 && (
                        <p className="annual-note">Billed ${plan.annualPrice.toFixed(2)}/year</p>
                      )}
                      <ul>
                        {plan.features.map((f, i) => (
                          <li key={i}><Check size={14} /> {f}</li>
                        ))}
                      </ul>
                      <span className="plan-cta">{plan.cta}</span>
                      {selectedPlan === plan.id && <span className="plan-selected-check"><Check size={18} /></span>}
                    </button>
                  );
                })}
              </div>

              <div className="step-nav">
                <button className="btn-back" onClick={handleBack}>Back</button>
                <button className="btn-primary" onClick={handlePlanContinue}>
                  {selectedPlan && selectedPlan !== 'plan_free' ? 'Continue to Payment' : 'Start with Free Plan'}
                </button>
              </div>
            </div>
          )}

          {/* Step: Payment & Add-ons (for paid plans) */}
          {step === 'payment' && (
            <div className="onboarding-step onboarding-step-wide onboarding-step-animate">
              <h2>Complete Your Setup</h2>
              <p>Review your selection and add optional extras.</p>

              {/* Add-on suggestions */}
              <div className="payment-addons">
                <h3 className="addons-heading">Supercharge your plan</h3>
                <div className="addons-grid-onboarding">
                  {ADDONS.map((addon) => (
                    <button
                      key={addon.id}
                      type="button"
                      className={`addon-card-onboarding ${selectedAddons.includes(addon.id) ? 'selected' : ''}`}
                      onClick={() => toggleAddon(addon.id)}
                    >
                      <div className="addon-check">
                        {selectedAddons.includes(addon.id) ? <Check size={16} /> : null}
                      </div>
                      <div className="addon-info">
                        <strong>{addon.name}</strong>
                        <p>{addon.description}</p>
                      </div>
                      <div className="addon-price">+${addon.price}/mo</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Order summary */}
              <div className="order-summary-onboarding">
                <h3>Order Summary</h3>
                <div className="summary-line">
                  <span>{getSelectedPlanDetails()?.name} Plan ({billingCycle})</span>
                  <span>
                    ${(billingCycle === 'monthly'
                      ? getSelectedPlanDetails()?.monthlyPrice
                      : (getSelectedPlanDetails()?.annualPrice || 0) / 12
                    )?.toFixed(2)}/mo
                  </span>
                </div>
                {selectedAddons.map((addonId) => {
                  const addon = ADDONS.find((a) => a.id === addonId);
                  return addon ? (
                    <div key={addonId} className="summary-line summary-line-addon">
                      <span>{addon.name}</span>
                      <span>+${addon.price}/mo</span>
                    </div>
                  ) : null;
                })}
                <div className="summary-divider" />
                <div className="summary-line summary-total">
                  <span>Total</span>
                  <span>${calculateTotal().toFixed(2)}/mo</span>
                </div>
              </div>

              {/* Trust signals */}
              <div className="checkout-trust-signals">
                <div className="trust-item"><Shield size={14} /> Secure checkout</div>
                <div className="trust-item"><CreditCard size={14} /> Cancel anytime</div>
                <div className="trust-item"><Check size={14} /> 14-day money-back guarantee</div>
              </div>

              <div className="step-nav">
                <button className="btn-back" onClick={handleBack}>Back</button>
                <button className="btn-primary btn-large" onClick={handlePaymentConfirm}>
                  Start {getSelectedPlanDetails()?.name} Plan
                </button>
              </div>
            </div>
          )}

          {/* Step: Complete (with confetti) */}
          {step === 'complete' && (
            <div className="onboarding-step onboarding-step-animate">
              {showConfetti && (
                <div className="confetti-container" aria-hidden="true">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div
                      key={i}
                      className="confetti-piece"
                      style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 0.5}s`,
                        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5],
                      }}
                    />
                  ))}
                </div>
              )}
              <div className="success-checkmark-large">
                <Check size={48} />
              </div>
              <h2>You're All Set!</h2>
              <p>Your profile is ready. Here's what you can do next:</p>

              <div className="next-steps">
                <div className="next-step-item">
                  <span className="next-step-number">1</span>
                  <span>Explore your personalized dashboard</span>
                </div>
                <div className="next-step-item">
                  <span className="next-step-number">2</span>
                  <span>{bankConnected ? 'View your synced transactions' : 'Connect your bank for automatic tracking'}</span>
                </div>
                <div className="next-step-item">
                  <span className="next-step-number">3</span>
                  <span>{role === 'freelancer' ? 'Start logging shifts and mileage' : 'Set up your first budget'}</span>
                </div>
              </div>

              <button className="btn-primary btn-large" onClick={handleFinish}>
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
