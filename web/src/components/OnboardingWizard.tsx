import { useState } from 'react';
import { UserRole } from '../context/AppContext';
import { Briefcase, Building, User } from 'lucide-react';
import './OnboardingWizard.css';

type OnboardingStep = 'welcome' | 'role' | 'platforms' | 'bank' | 'goals' | 'plan' | 'complete';

interface OnboardingWizardProps {
  onComplete: () => void;
  onConnectBank: () => void;
  onSelectPlan: (planId: string) => void;
  onSelectRole: (role: UserRole) => void;
  onConnectPlatform?: (platformId: string) => void;
  onSetGoal?: (goal: { type: string; target: number }) => void;
}

const PLATFORMS = [
  { id: 'uber', name: 'Uber', icon: '🚗', category: 'Rideshare' },
  { id: 'lyft', name: 'Lyft', icon: '🚙', category: 'Rideshare' },
  { id: 'doordash', name: 'DoorDash', icon: '🍔', category: 'Delivery' },
  { id: 'ubereats', name: 'Uber Eats', icon: '🍕', category: 'Delivery' },
  { id: 'instacart', name: 'Instacart', icon: '🛒', category: 'Delivery' },
  { id: 'grubhub', name: 'Grubhub', icon: '🥡', category: 'Delivery' },
  { id: 'taskrabbit', name: 'TaskRabbit', icon: '🔧', category: 'Tasks' },
  { id: 'fiverr', name: 'Fiverr', icon: '💼', category: 'Freelance' },
  { id: 'upwork', name: 'Upwork', icon: '💻', category: 'Freelance' },
];

const STEP_LABELS: Record<OnboardingStep, string> = {
  welcome: 'Welcome',
  role: 'Select Role',
  platforms: 'Connect Platforms',
  bank: 'Link Bank',
  goals: 'Set Goals',
  plan: 'Choose Plan',
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
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [role, setRole] = useState<UserRole>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [bankConnected, setBankConnected] = useState(false);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState<number>(500);
  const [taxReserve, setTaxReserve] = useState<number>(25);

  // Dynamic steps based on role
  const getSteps = (): OnboardingStep[] => {
    const baseSteps: OnboardingStep[] = ['welcome', 'role'];
    
    if (role === 'freelancer') {
      baseSteps.push('platforms');
    }
    // Business and Individual skip platforms for now
    
    baseSteps.push('bank', 'goals', 'plan', 'complete');
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
        // If somehow at end, treat as complete
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
    setTimeout(() => {
        // Determine next step
        const nextStep = selectedRole === 'freelancer' ? 'platforms' : 'bank';
        setStep(nextStep);
    }, 300);
  };

  const handleConnectBank = () => {
    onConnectBank();
    setBankConnected(true);
  };

  const handlePlatformToggle = (platformId: string) => {
    setConnectedPlatforms(prev => {
      if (prev.includes(platformId)) {
        return prev.filter(p => p !== platformId);
      }
      onConnectPlatform?.(platformId);
      return [...prev, platformId];
    });
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    onSelectPlan(planId);
  }

  const handleGoalSave = () => {
    onSetGoal?.({ type: 'weekly_earnings', target: weeklyGoal });
    handleNext();
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
      completedAt: new Date().toISOString(),
    }));
    onComplete();
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-wizard">
        <div className="onboarding-progress" aria-hidden="true">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>

        <div className="onboarding-step-label" aria-live="polite">
          Step {currentIndex + 1} of {steps.length}: {STEP_LABELS[step]}
        </div>

        <div className="onboarding-content">
          {step === 'welcome' && (
            <div className="onboarding-step">
              <div className="step-icon">👋</div>
              <h2>Welcome to Money Generator</h2>
              <p>
                Transform your financial tracking with smart insights and powerful tools.
                Let's customize the app for your needs.
              </p>
              <button className="btn-primary btn-large" onClick={handleNext}>
                Get Started
              </button>
              <p className="setup-time">Setup takes about 2 minutes</p>
            </div>
          )}

          {step === 'role' && (
            <div className="onboarding-step">
              <div className="step-icon">👤</div>
              <h2>How will you use Money Generator?</h2>
              <p>We'll tailor your experience based on your selection.</p>
              
              <div className="role-cards">
                <button
                  type="button"
                  className={`role-card ${role === 'freelancer' ? 'selected' : ''}`}
                  onClick={() => handleRoleSelect('freelancer')}
                  aria-pressed={role === 'freelancer'}
                  aria-label="Select Freelancer or Gig Worker role"
                >
                    <div className="role-icon"><Briefcase size={24} /></div>
                    <h3>Freelancer / Gig Worker</h3>
                    <p>I want to track gig earnings, mileage, and optimize my schedule.</p>
                </button>

                <button
                  type="button"
                  className={`role-card ${role === 'business' ? 'selected' : ''}`}
                  onClick={() => handleRoleSelect('business')}
                  aria-pressed={role === 'business'}
                  aria-label="Select Business Owner role"
                >
                    <div className="role-icon"><Building size={24} /></div>
                    <h3>Business Owner</h3>
                    <p>I manage a team and need to track shared expenses and payouts.</p>
                </button>

                <button
                  type="button"
                  className={`role-card ${role === 'individual' ? 'selected' : ''}`}
                  onClick={() => handleRoleSelect('individual')}
                  aria-pressed={role === 'individual'}
                  aria-label="Select Individual role"
                >
                    <div className="role-icon"><User size={24} /></div>
                    <h3>Individual</h3>
                    <p>I want to track personal finances, subscriptions, and savings goals.</p>
                </button>
              </div>
            </div>
          )}

          {step === 'platforms' && (
            <div className="onboarding-step onboarding-step-wide">
              <div className="step-icon">📱</div>
              <h2>Connect Your Gig Platforms</h2>
              <p>
                Select the platforms you work with. We'll automatically sync your earnings.
              </p>
              <div className="platforms-grid">
                {PLATFORMS.map((platform) => (
                  <button
                    type="button"
                    key={platform.id}
                    className={`platform-card ${connectedPlatforms.includes(platform.id) ? 'selected' : ''}`}
                    onClick={() => handlePlatformToggle(platform.id)}
                    aria-pressed={connectedPlatforms.includes(platform.id)}
                    aria-label={`Toggle ${platform.name}`}
                  >
                    <span className="platform-icon">{platform.icon}</span>
                    <span className="platform-name">{platform.name}</span>
                    <span className="platform-category">{platform.category}</span>
                    {connectedPlatforms.includes(platform.id) && (
                      <span className="platform-check">✓</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="step-nav">
                <button className="btn-back" onClick={handleBack}>Back</button>
                <button className="btn-primary" onClick={handleNext}>
                  {connectedPlatforms.length > 0 ? 'Continue' : 'Skip'}
                </button>
              </div>
            </div>
          )}

          {step === 'bank' && (
            <div className="onboarding-step">
              <div className="step-icon">🏦</div>
              <h2>Connect Your Bank</h2>
              <p>
                Link your bank account to automatically track income and expenses.
                {role === 'business' ? ' Connect your business account for automated bookkeeping.' : ' We use Plaid for secure, read-only access.'}
              </p>
              {bankConnected ? (
                <div className="success-message">
                  <span className="success-icon">✓</span>
                  Bank connected successfully!
                </div>
              ) : (
                <button className="btn-primary btn-large" onClick={handleConnectBank}>
                  Connect Bank Account
                </button>
              )}
              <div className="step-nav">
                <button className="btn-back" onClick={handleBack}>Back</button>
                <button className="btn-text" onClick={handleNext}>
                    {bankConnected ? 'Continue' : 'Skip for now'}
                </button>
              </div>
            </div>
          )}

          {step === 'goals' && (
            <div className="onboarding-step">
              <div className="step-icon">🎯</div>
              <h2>Set Your {role === 'business' ? 'Business ' : ''}Goals</h2>
              <p>
                Define your targets. We'll help you track progress.
              </p>
              
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
                    aria-valuemin={100}
                    aria-valuemax={5000}
                    aria-valuenow={weeklyGoal}
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
                    aria-valuemin={10}
                    aria-valuemax={40}
                    aria-valuenow={taxReserve}
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

          {step === 'plan' && (
            <div className="onboarding-step onboarding-step-wide">
              <h2>Choose Your Plan</h2>
              <p>Start with a plan that fits your current stage.</p>
              <div className="plans-grid">
                    <button
                    type="button"
                    className={`plan-card ${selectedPlan === 'plan_free' ? 'selected' : ''}`}
                    onClick={() => handlePlanSelect('plan_free')}
                    aria-pressed={selectedPlan === 'plan_free'}
                    aria-label="Select Free plan"
                    >
                      <h3>Free</h3>
                      <div className="price">$0<span>/mo</span></div>
                      <ul>
                          <li>Basic Tracking</li>
                          <li>Manual Entry</li>
                      </ul>
                      {selectedPlan === 'plan_free' && <span className="check">✓</span>}
                    </button>
                    <button
                    type="button"
                    className={`plan-card ${selectedPlan === 'plan_pro' ? 'selected' : ''}`}
                    onClick={() => handlePlanSelect('plan_pro')}
                    aria-pressed={selectedPlan === 'plan_pro'}
                    aria-label="Select Pro plan"
                    >
                      <h3>Pro</h3>
                      <div className="price">$14.99<span>/mo</span></div>
                      <ul>
                          <li>Advanced Analytics</li>
                          <li>Automation</li>
                      </ul>
                      {selectedPlan === 'plan_pro' && <span className="check">✓</span>}
                    </button>
              </div>
               <div className="step-nav">
                <button className="btn-back" onClick={handleBack}>Back</button>
                <button className="btn-primary" onClick={() => {
                   if(selectedPlan) handleNext();
                   else {
                       handlePlanSelect('plan_free');
                       handleNext(); // Or enforce selection?
                   }
                }}>
                  {selectedPlan ? 'Continue' : 'Start with Free Plan'}
                </button>
              </div>
            </div>
          )}
          
          {step === 'complete' && (
            <div className="onboarding-step">
               <div className="step-icon">🎉</div>
               <h2>You're All Set!</h2>
               <p>Your profile is ready. Start exploring Money Generator.</p>
               <button className="btn-primary btn-large" onClick={handleFinish}>
                   Go to Dashboard
               </button>
            </div>
          )}

        </div>
      </div>
      <style>{`
        .role-cards {
            display: grid;
            gap: 1rem;
            width: 100%;
        }
        .role-card {
            border: 2px solid #e2e8f0;
            border-radius: 0.75rem;
            padding: 1rem;
            cursor: pointer;
            text-align: left;
            transition: all 0.2s;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        .role-card:hover {
            border-color: #cbd5e1;
            background-color: #f8fafc;
        }
        .role-card.selected {
            border-color: #2563eb;
            background-color: #eff6ff;
        }
        .role-icon {
            color: #2563eb;
            margin-bottom: 0.25rem;
        }
        .role-card h3 {
            margin: 0;
            font-size: 1rem;
            color: #1e293b;
        }
        .role-card p {
            margin: 0;
            font-size: 0.85rem;
            color: #64748b;
        }
        .plans-grid {
             display: grid;
             grid-template-columns: 1fr 1fr;
             gap: 1rem;
             width: 100%;
             margin-bottom: 1rem;
        }
        .plan-card {
             border: 2px solid #e2e8f0;
             border-radius: 0.75rem;
             padding: 1.5rem;
             cursor: pointer;
             text-align: center;
             transition: all 0.2s;
             position: relative;
        }
        .plan-card.selected {
             border-color: #2563eb;
             background-color: #eff6ff;
        }
        .plan-card .price {
             font-size: 1.5rem;
             font-weight: 700;
             color: #1e293b;
             margin: 0.5rem 0;
        }
        .plan-card .price span {
             font-size: 0.85rem;
             font-weight: 400;
             color: #64748b;
        }
        .plan-card ul {
             list-style: none;
             padding: 0;
             font-size: 0.85rem;
             color: #475569;
             margin: 0.5rem 0;
        }
        .plan-card .check {
             position: absolute;
             top: 0.5rem;
             right: 0.5rem;
             background: #2563eb;
             color: white;
             border-radius: 50%;
             width: 20px;
             height: 20px;
             font-size: 12px;
             display: flex;
             align-items: center;
             justify-content: center;
        }
      `}</style>
    </div>
  );
}
