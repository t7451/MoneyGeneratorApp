import React, { useState } from 'react';
import { Globe, Shield, CreditCard, LogOut, Download, KeyRound, Wallet } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { GuidedTour, useTourNavigation, useOnboarding, EducationalHint } from '../utils/onboardingSystem';
import './SettingsPage.css';

export const SettingsPage: React.FC = () => {
    const { userProfile, openCheckout } = useAppContext();
    const { showToast } = useToast();
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
          <div className="setting-input-group">
            <div className="setting-label-row">
              <Globe size={20} className="setting-icon" />
              <label className="setting-label">Language</label>
            </div>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="setting-select">
              <option value="en-US">English (US)</option>
              <option value="es-MX">Español (LatAm)</option>
              <option value="fr-FR">Français</option>
            </select>
          </div>
          <div className="setting-input-group">
            <div className="setting-label-row">
              <Globe size={20} className="setting-icon" />
              <label className="setting-label">Currency</label>
            </div>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="setting-select">
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="MXN">MXN</option>
            </select>
          </div>
          <div className="setting-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
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
            <label className="setting-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Preferred Payment Methods</label>
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
            <label className="setting-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Minimum Withdrawal Threshold</label>
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
            <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json')} className="setting-select">
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
