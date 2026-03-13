import React, { useState } from 'react';
import { Globe, Shield, CreditCard, LogOut, Download, KeyRound, Wallet, Moon, Sun, Check } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { useTheme } from '../context/ThemeContext';
import { GuidedTour, useTourNavigation, useOnboarding, EducationalHint } from '../utils/onboardingSystem';
import './SettingsPage.css';

export const SettingsPage: React.FC = () => {
    const { userProfile, openCheckout } = useAppContext();
        // --- Billing/Subscription Management Enhancements ---
        const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
        const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
        const PLANS = [
          {
            id: 'plan_free',
            name: 'Free',
            price: 0,
            annualPrice: 0,
            features: [
              'Basic earnings tracking',
              'Manual transaction entry',
              'Monthly email reports',
              'Community support',
              '1 connected platform',
            ],
          },
          {
            id: 'plan_pro',
            name: 'Pro',
            price: 14.99,
            annualPrice: 119.88,
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
          },
          {
            id: 'plan_enterprise',
            name: 'Enterprise',
            price: 49.99,
            annualPrice: 479.88,
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
          },
        ];
        const ADDONS = [
          { id: 'addon_shift_insights', name: 'Shift Insights', price: 4.99, description: 'Deep per-shift profitability analysis with AI recommendations', icon: '📊' },
          { id: 'addon_tax_prep', name: 'Tax Prep Bundle', price: 9.99, description: 'Automated tax categorization, quarterly estimates & export', icon: '📋' },
          { id: 'addon_mileage', name: 'Mileage Tracker', price: 3.99, description: 'GPS-based automatic mileage logging with IRS reports', icon: '🚗' },
          { id: 'addon_receipts', name: 'Receipt Scanner', price: 2.99, description: 'OCR receipt capture and automatic expense categorization', icon: '🧾' },
        ];
        const isCurrentPlan = (planId: string) => userProfile?.subscription === planId;
        const getPrice = (plan: any) => billingCycle === 'monthly' ? plan.price : plan.annualPrice / 12;
        const formatPrice = (price: number) => price === 0 ? 'Free' : `$${price.toFixed(2)}`;
        const handleSelectPlan = (planId: string) => {
          if (isCurrentPlan(planId)) return;
          openCheckout();
        };
        const handleCancelPlan = () => {
          // TODO: Integrate with backend cancel endpoint
          showToast('Cancel subscription (not yet implemented)', 'info');
        };
        const handleDowngradePlan = () => {
          // TODO: Integrate with backend downgrade endpoint
          showToast('Downgrade to Free (not yet implemented)', 'info');
        };
        const toggleAddon = (addonId: string) => {
          setSelectedAddons(prev => prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId]);
        };
        const annualSavings = Math.round(((14.99 * 12 - 119.88) / (14.99 * 12)) * 100);
    const { showToast } = useToast();
    const { theme, toggleTheme } = useTheme();
    const { markTutorialWatched, user } = useOnboarding();
    const [language, setLanguage] = useState('en-US');
    const [currency, setCurrency] = useState('USD');
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [payoutMethods, setPayoutMethods] = useState({ paypal: true, crypto: false, giftcard: false });
    const [withdrawalThreshold, setWithdrawalThreshold] = useState('low');
    const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
    const [isExporting, setIsExporting] = useState(false);
    const [dismissedHints, setDismissedHints] = useState<string[]>([]);

    const settingsTourSteps = [
      {
        id: 'settings-profile',
        title: 'Profile Settings',
        description: 'Update your personal information and preferences here.',
        highlightSelector: '[data-tour="profile-section"]',
        position: 'bottom' as const,
      },
      {
        id: 'settings-security',
        title: 'Security & Privacy',
        description: 'Enable 2FA to secure your account from unauthorized access.',
        highlightSelector: '[data-tour="security-section"]',
        position: 'bottom' as const,
      },
      {
        id: 'settings-billing',
        title: 'Billing & Subscription',
        description: 'Manage your payment methods and upgrade your plan.',
        highlightSelector: '[data-tour="billing-section"]',
        position: 'bottom' as const,
      },
      {
        id: 'settings-data',
        title: 'Data & Export',
        description: 'Export your data anytime or delete your account.',
        highlightSelector: '[data-tour="data-section"]',
        position: 'top' as const,
      },
    ];

    const tour = useTourNavigation(settingsTourSteps, () => {
      markTutorialWatched('settings-tour');
      showToast('Settings tour complete! 🎉', 'success');
    });

    const shouldShowTour = user.role && !user.tutorialsWatched.includes('settings-tour');
    const shouldShow2FAHint = !dismissedHints.includes('2fa') && !twoFactorEnabled;

    const handleEnable2FA = () => {
      setTwoFactorEnabled(true);
      showToast('2FA enabled with backup codes created', 'success');
    };

    const handleExport = async () => {
      setIsExporting(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

      try {
        if (exportFormat === 'csv') {
          const res = await fetch(`${apiUrl}/api/v1/expenses/export?userId=demo-user&year=${new Date().getFullYear()}&format=csv`);
          if (!res.ok) throw new Error('export_failed');
          const data = await res.json();
          const expenseRows = data.expenses?.map((e: any) => [e.date, e.categoryName, e.amount, e.description].join(',')) || [];
          const header = 'date,category,amount,description';
          const csv = [header, ...expenseRows].join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `moneygen-export-${new Date().toISOString().slice(0,10)}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          const res = await fetch(`${apiUrl}/api/v1/compliance/export?userId=demo-user`);
          if (!res.ok) throw new Error('export_failed');
          const data = await res.json();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `moneygen-export-${new Date().toISOString().slice(0,10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }

        showToast('Export ready and downloaded.', 'success');
      } catch (e) {
        showToast('Export failed. Please retry.', 'error');
      } finally {
        setIsExporting(false);
      }
    };

  return (
    <div className="settings-page">
      {/* --- Subscription & Billing Section --- */}
      <div className="card elevated settings-card" data-tour="billing-section">
        <div className="settings-section-header">
          <h3>Subscription & Billing</h3>
        </div>
        <div className="settings-grid">
          <div className="setting-row">
            <div className="setting-info">
              <CreditCard size={20} className="setting-icon" />
              <div>
                <div className="setting-label">Current Plan</div>
                <div className="setting-value">{userProfile.subscription ? PLANS.find(p => p.id === userProfile.subscription)?.name : 'Free'}</div>
              </div>
            </div>
            {userProfile.subscription && userProfile.subscription !== 'plan_free' && (
              <div className="subscription-actions">
                <button className="button secondary" onClick={handleCancelPlan}>Cancel</button>
                <button className="button secondary" onClick={handleDowngradePlan}>Downgrade to Free</button>
              </div>
            )}
          </div>
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-label">Billing Cycle</span>
            </div>
            <div className="billing-toggle">
              <button className={`toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`} onClick={() => setBillingCycle('monthly')}>Monthly</button>
              <button className={`toggle-btn ${billingCycle === 'annual' ? 'active' : ''}`} onClick={() => setBillingCycle('annual')}>
                Annual <span className="savings-badge">Save {annualSavings}%</span>
              </button>
            </div>
          </div>
        </div>
        <div className="plans-grid plans-grid-top">
          {PLANS.map((plan) => (
            <div key={plan.id} className={`plan-card ${isCurrentPlan(plan.id) ? 'current' : ''}`}>
              <div className="plan-header">
                <h4>{plan.name}</h4>
                <p>{plan.features[1]}</p>
              </div>
              <div className="plan-pricing">
                <span className="price">{formatPrice(getPrice(plan))}</span>
                {plan.price > 0 && <span className="period">/month</span>}
                {billingCycle === 'annual' && plan.annualPrice > 0 && (
                  <div className="annual-total">Billed ${plan.annualPrice.toFixed(2)}/year</div>
                )}
              </div>
              <ul className="plan-features">
                {plan.features.map((feature, idx) => (
                  <li key={idx}><Check size={14} className="feature-check" /> {feature}</li>
                ))}
              </ul>
              <button className="button primary" onClick={() => handleSelectPlan(plan.id)} disabled={isCurrentPlan(plan.id)}>
                {isCurrentPlan(plan.id) ? 'Current Plan' : 'Select'}
              </button>
              {/* Trial/Proration Info */}
              {plan.id === 'plan_pro' && !isCurrentPlan(plan.id) && (
                <div className="trial-info">14-day free trial. Cancel anytime.</div>
              )}
              {isCurrentPlan(plan.id) && plan.id !== 'plan_free' && (
                <div className="proration-info">Prorated billing applies to plan changes.</div>
              )}
            </div>
          ))}
        </div>
        {/* Add-ons Section */}
        <div className="addons-section addons-section-top">
          <h4>Power Up with Add-ons</h4>
          <div className="addons-grid">
            {ADDONS.map((addon) => (
              <div key={addon.id} className={`addon-card ${selectedAddons.includes(addon.id) ? 'selected' : ''}`} onClick={() => toggleAddon(addon.id)}>
                <div className="addon-icon">{addon.icon}</div>
                <div className="addon-info">
                  <h5>{addon.name}</h5>
                  <p>{addon.description}</p>
                </div>
                <div className="addon-price">
                  <span>${addon.price.toFixed(2)}</span>
                  <span className="period">/mo</span>
                </div>
                <div className="addon-checkbox">{selectedAddons.includes(addon.id) && <Check size={14} />}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {tour.isActive && (
        <GuidedTour
          steps={settingsTourSteps}
          isActive={tour.isActive}
          currentStepIndex={tour.currentStepIndex}
          onStepChange={tour.goToStep}
          onComplete={tour.skipTour}
          onSkip={tour.skipTour}
          showSkip
        />
      )}
      
      {shouldShow2FAHint && (
        <EducationalHint
          type="warning"
          title="Enhance Your Security"
          description="Enable two-factor authentication to protect your account from unauthorized access."
          icon={<Shield size={20} />}
          onDismiss={() => setDismissedHints([...dismissedHints, '2fa'])}
        />
      )}
      
      <div className="page-header">
        <h1>Settings</h1>
        {shouldShowTour && (
          <button
            className="button primary"
            onClick={tour.startTour}
          >
            🎯 Start Tour
          </button>
        )}
      </div>

      {/* Account Settings */}
      <div className="card elevated settings-card" data-tour="profile-section">
        <div className="settings-section-header">
          <h3>Account Settings</h3>
        </div>
        <div className="settings-grid">
          <div className="setting-row">
            <div className="setting-info">
              <CreditCard size={20} className="setting-icon" />
              <div>
                <div className="setting-label">Subscription</div>
                <div className="setting-value">{userProfile.subscription || 'Free Plan'}</div>
              </div>
            </div>
            <button className="button primary" onClick={openCheckout}>Upgrade</button>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="card elevated settings-card" data-tour="security-section">
        <div className="settings-section-header">
          <h3>Preferences</h3>
        </div>
        <div className="settings-grid">
          <div className="setting-row">
            <div className="setting-info">
              {theme === 'dark' ? <Moon size={20} className="setting-icon" /> : <Sun size={20} className="setting-icon" />}
              <div>
                <div className="setting-label">Appearance</div>
                <div className="setting-value">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</div>
              </div>
            </div>
            <label className="toggle-switch-label">
              <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} aria-label="Toggle dark mode" />
              <span className="slider"></span>
            </label>
          </div>

          <div className="setting-input-group">
            <div className="setting-label-row">
              <Globe size={20} className="setting-icon" />
              <label htmlFor="setting-language" className="setting-label">Language</label>
            </div>
            <select 
              id="setting-language" 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)} 
              className="setting-select"
            >
              <option value="en-US">English (US)</option>
              <option value="es-MX">Español (LatAm)</option>
              <option value="fr-FR">Français</option>
            </select>
          </div>
          <div className="setting-input-group">
            <div className="setting-label-row">
              <Globe size={20} className="setting-icon" />
              <label htmlFor="setting-currency" className="setting-label">Currency</label>
            </div>
            <select 
              id="setting-currency" 
              value={currency} 
              onChange={(e) => setCurrency(e.target.value)} 
              className="setting-select"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="MXN">MXN</option>
            </select>
          </div>
          <div className="setting-row setting-row-no-border">
            <div className="setting-info">
              <Shield size={20} className="setting-icon" />
              <div>
                <div className="setting-label">Two-Factor Authentication</div>
                <div className="setting-value">{twoFactorEnabled ? '✓ Enabled' : '○ Not Enabled'}</div>
              </div>
            </div>
            {!twoFactorEnabled ? (
              <button className="button primary" onClick={handleEnable2FA}>Enable 2FA</button>
            ) : (
              <button className="button secondary"><KeyRound size={14} /> Backup codes</button>
            )}
          </div>
        </div>
      </div>

      {/* Payout Preferences */}
      <div className="card elevated settings-card">
        <div className="settings-section-header">
          <h3>
            <Wallet size={20} className="setting-icon" /> Payout Preferences
          </h3>
        </div>
        
        <div className="settings-grid">
          <div>
            <label className="setting-label setting-label-block">Preferred Payment Methods</label>
            <div className="payout-methods-group">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={payoutMethods.paypal} 
                  onChange={() => setPayoutMethods(p => ({...p, paypal: !p.paypal}))} 
                /> 
                PayPal
              </label>
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={payoutMethods.crypto} 
                  onChange={() => setPayoutMethods(p => ({...p, crypto: !p.crypto}))} 
                /> 
                Crypto (BTC/ETH)
              </label>
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={payoutMethods.giftcard} 
                  onChange={() => setPayoutMethods(p => ({...p, giftcard: !p.giftcard}))} 
                /> 
                Gift Cards
              </label>
            </div>
          </div>
          
          <div>
            <label className="setting-label setting-label-block">Minimum Withdrawal Threshold</label>
            <div className="payout-methods-group">
              <label className="checkbox-label">
                <input 
                  type="radio" 
                  name="threshold" 
                  value="low" 
                  checked={withdrawalThreshold === 'low'} 
                  onChange={() => setWithdrawalThreshold('low')} 
                /> 
                Low ($0.50 - $2)
              </label>
              <label className="checkbox-label">
                <input 
                  type="radio" 
                  name="threshold" 
                  value="medium" 
                  checked={withdrawalThreshold === 'medium'} 
                  onChange={() => setWithdrawalThreshold('medium')} 
                /> 
                Standard ($5 - $20)
              </label>
              <label className="checkbox-label">
                <input 
                  type="radio" 
                  name="threshold" 
                  value="high" 
                  checked={withdrawalThreshold === 'high'} 
                  onChange={() => setWithdrawalThreshold('high')} 
                /> 
                High ($20+)
              </label>
            </div>
            <p className="payout-footer">
              We'll highlight jobs that match your cashout preferences first.
            </p>
          </div>
        </div>
      </div>

      {/* Data Export */}
      <div className="card elevated settings-card" data-tour="billing-section">
        <div className="settings-section-header">
          <h3>Data & Export</h3>
        </div>
        <div className="export-section">
          <div>
            <div className="export-header">
              <Download size={20} className="setting-icon" />
              <span>Export your data</span>
            </div>
            <p className="export-description">CSV or JSON with all transactions, goals, and insights</p>
          </div>
          <div className="export-actions">
            <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json')} className="setting-select" aria-label="Export format">
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
            <button className="button primary" onClick={handleExport} disabled={isExporting}>{isExporting ? 'Preparing...' : 'Export'}</button>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="account-footer">
        <button className="button danger"><LogOut size={16} /> Sign Out</button>
        <div className="version-info">Version 1.0.0 (Build 2026.03.12)</div>
      </div>
    </div>
  );
};
