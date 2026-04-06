import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/Toast';
import { apiFetchJson, getUserId } from '../lib/apiClient';
import { trackEvent, FunnelEvents } from '../lib/analytics';

type BillingCycle = 'monthly' | 'annual';

type UpgradeOptions = {
  billingCycle?: BillingCycle;
  paymentMethod?: string;
  savedMethodId?: string;
  autoRetry?: boolean;
  rememberMethod?: boolean;
};

export type Product = {
  id: string;
  type: string;
  name: string;
  price: string;
  description: string;
};

export type UserRole = 'freelancer' | 'business' | 'individual' | null;

export type UserProfile = {
  role: UserRole;
  bankConnected: boolean;
  subscription: string | null;
  earnings: number;
  weeklyChange: number;
};

interface AppContextType {
  userProfile: UserProfile;
  products: Product[];
  apiConnected: boolean;
  isCheckoutOpen: boolean;
  showOnboarding: boolean;
  updateRole: (role: UserRole) => void;
  completeOnboarding: () => void;
  openCheckout: () => void;
  closeCheckout: () => void;
  connectBank: () => Promise<boolean>;
  connectPlatform: (platformId: string) => Promise<boolean>;
  setGoal: (goal: { type: string; target: number }) => Promise<boolean>;
  upgradeSubscription: (planId: string, addons: string[], options?: UpgradeOptions) => Promise<void>;
  cancelSubscription: (reason?: string) => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<UserProfile>({
    role: null,
    bankConnected: false,
    subscription: null,
    earnings: 0,
    weeklyChange: 0,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [apiConnected, setApiConnected] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { showToast } = useToast();

  type BackendPlan = 'basic' | 'pro' | 'enterprise';

  const uiPlanToBackend = (planId: string): BackendPlan => {
    if (planId === 'plan_free') return 'basic';
    if (planId === 'plan_pro') return 'pro';
    if (planId === 'plan_enterprise') return 'enterprise';
    if (planId === 'basic' || planId === 'pro' || planId === 'enterprise') return planId;
    return 'basic';
  };

  const backendPlanToUi = (plan: string | null | undefined): string | null => {
    if (!plan || plan === 'basic') return null;
    if (plan === 'pro') return 'plan_pro';
    if (plan === 'enterprise') return 'plan_enterprise';
    if (plan === 'plan_free') return null;
    if (plan === 'plan_pro' || plan === 'plan_enterprise') return plan;
    return null;
  };

  // Sync onboarding progress to backend
  const syncOnboardingProgress = useCallback((step: string, data?: Record<string, unknown>) => {
    const userId = getUserId();
    if (!userId) return;
    apiFetchJson('/api/v2/onboarding/progress', {
      method: 'PUT',
      body: { userId, step, data },
    }).catch(() => null);
  }, []);

  useEffect(() => {
    const onboardingComplete = localStorage.getItem('onboarding_complete');
    if (!onboardingComplete) {
      setShowOnboarding(true);
    } else {
      const storedRole = localStorage.getItem('user_role') as UserRole;
      if (storedRole) {
        setUserProfile(prev => ({ ...prev, role: storedRole }));
      }
    }
    refreshSubscription().catch(() => null);
    (async () => {
      try {
        const userId = getUserId();
        if (!userId) return;
        const data = await apiFetchJson<{ settings?: Record<string, unknown> }>(`/api/v1/profile/settings?userId=${encodeURIComponent(userId)}`);
        const settings = data?.settings;
        if (settings) {
          const updates: Partial<UserProfile> = {};
          if (typeof settings.bankConnected === 'boolean') {
            updates.bankConnected = settings.bankConnected;
          }
          if (settings.role && !localStorage.getItem('user_role')) {
            updates.role = settings.role as UserRole;
          }
          if (typeof settings.earnings === 'number') {
            updates.earnings = settings.earnings;
          }
          if (typeof settings.weeklyChange === 'number') {
            updates.weeklyChange = settings.weeklyChange;
          }
          if (Object.keys(updates).length > 0) {
            setUserProfile((prev) => ({ ...prev, ...updates }));
          }
        }
      } catch {
        // ignore
      }
    })();
    _fetchProducts();
  }, []);

  const updateRole = useCallback((role: UserRole) => {
    setUserProfile(prev => ({ ...prev, role }));
    if (role) localStorage.setItem('user_role', role);
    trackEvent('role_updated', { role });
    const userId = getUserId();
    apiFetchJson('/api/v1/profile/settings', {
      method: 'PUT',
      body: { userId, role },
    }).catch(() => null);
    syncOnboardingProgress('role', { role });
  }, [syncOnboardingProgress]);

  const completeOnboarding = useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem('onboarding_complete', 'true');
    showToast('Welcome to Money Generator!', 'success');
    trackEvent(FunnelEvents.ONBOARDING_COMPLETED);
    const userId = getUserId();
    apiFetchJson('/api/v1/profile/settings', {
      method: 'PUT',
      body: { userId, onboardingComplete: true },
    }).catch(() => null);
    syncOnboardingProgress('complete', { completed: true });
  }, [showToast, syncOnboardingProgress]);

  const _fetchProducts = async () => {
    try {
      const data = await apiFetchJson<{ success: boolean; plans?: Array<{ id: string; name: string; description?: string; price?: { monthly?: number | null; annual?: number | null } }> }>(
        '/api/v2/subscriptions/plans'
      );

      if (data?.success && Array.isArray(data.plans)) {
        const plansAsProducts: Product[] = data.plans.map((p) => {
          const uiId = p.id === 'basic' ? 'plan_free' : p.id === 'pro' ? 'plan_pro' : p.id === 'enterprise' ? 'plan_enterprise' : `plan_${p.id}`;
          const monthly = p.price?.monthly;
          const priceText = monthly === null || monthly === undefined ? 'Custom' : monthly === 0 ? 'Free' : `$${Number(monthly).toFixed(2)}/mo`;
          return {
            id: uiId,
            type: 'plan',
            name: p.name,
            price: priceText,
            description: p.description || '',
          };
        });

        const catalogData = await apiFetchJson<{ products?: Array<{ id: string; type: string; name: string; price: string; description: string }> }>('/catalog');
        const catalogProducts = (catalogData.products || []).filter((p) => p.type !== 'plan');
        setProducts([...plansAsProducts, ...catalogProducts]);
        setApiConnected(true);
        return;
      }
    } catch {
      // fall back below
    }

    setApiConnected(false);
    setProducts([]);
  };

  const refreshSubscription = useCallback(async () => {
    try {
      const data = await apiFetchJson<{ success: boolean; subscription?: { plan?: string | null } }>('/api/v2/subscriptions');
      const uiPlan = backendPlanToUi(data?.subscription?.plan);
      setUserProfile((prev) => ({ ...prev, subscription: uiPlan }));
      setApiConnected(true);
    } catch {
      setApiConnected(false);
    }
  }, []);

  const connectBank = useCallback(async () => {
    try {
      showToast('Opening bank connection...', 'info');
      trackEvent(FunnelEvents.BANK_CONNECT_STARTED);
      const userId = getUserId();

      // Step 1: Get a Plaid link token from backend
      const tokenResp = await apiFetchJson<{ link_token: string }>('/api/v2/integrations/plaid/link-token', {
        method: 'POST',
        body: { userId },
      });

      // Step 2: Exchange the token (in a real app, Plaid Link UI would
      // return a public_token after user selects their bank; here we
      // simulate the exchange so the backend marks the account linked)
      await apiFetchJson<{ item_id: string }>('/api/v2/integrations/plaid/exchange', {
        method: 'POST',
        body: { userId, publicToken: tokenResp.link_token },
      });

      // Step 3: Persist bankConnected in user settings
      await apiFetchJson('/api/v1/profile/settings', {
        method: 'PUT',
        body: { userId, bankConnected: true },
      });

      setUserProfile((prev) => ({ ...prev, bankConnected: true }));
      showToast('Bank account connected successfully!', 'success');
      trackEvent(FunnelEvents.BANK_CONNECT_SUCCESS);
      syncOnboardingProgress('bank', { bankConnected: true });
      return true;
    } catch {
      showToast('Bank connection failed. Please retry.', 'error');
      trackEvent(FunnelEvents.BANK_CONNECT_FAILED);
      return false;
    }
  }, [showToast, syncOnboardingProgress]);

  const connectPlatform = useCallback(async (platformId: string) => {
    try {
      const userId = getUserId();
      await apiFetchJson('/api/v1/platforms/connect', {
        method: 'POST',
        body: { userId, platform: platformId },
      });
      trackEvent('platform_connected', { platform: platformId });
      return true;
    } catch {
      return false;
    }
  }, []);

  const setGoal = useCallback(async (goal: { type: string; target: number }) => {
    try {
      const userId = getUserId();

      if (goal.type === 'tax_reserve_pct') {
        await apiFetchJson('/api/v1/profile/settings', {
          method: 'PUT',
          body: { userId, taxReservePct: goal.target },
        });
        return true;
      }

      await apiFetchJson('/api/v1/profile/goals', {
        method: 'POST',
        body: { userId, type: goal.type, target: goal.target },
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const upgradeSubscription = useCallback(async (planId: string, addons: string[], options: UpgradeOptions = {}) => {
    const {
      billingCycle = 'monthly',
      paymentMethod = 'card',
      savedMethodId,
      autoRetry = true,
      rememberMethod = true,
    } = options;
    setIsCheckoutOpen(false);
    trackEvent(FunnelEvents.CHECKOUT_STARTED, { plan: planId, billingCycle, addons: addons.length });
    try {
      const backendPlan = uiPlanToBackend(planId);
      const userId = getUserId();

      // If user is selecting Pro from Free, start a trial (best-effort).
      if (backendPlan === 'pro' && !userProfile.subscription) {
        const trialResult = await apiFetchJson<{ success: boolean; subscription?: { plan?: string | null } }>('/api/v2/subscriptions/trial', {
          method: 'POST',
          body: { days: 14, userId },
        });
        setUserProfile((prev) => ({ ...prev, subscription: backendPlanToUi(trialResult?.subscription?.plan) }));
        showToast('14-day Pro trial activated.', 'success');
        trackEvent(FunnelEvents.CHECKOUT_COMPLETED, { plan: planId, trial: true });
        syncOnboardingProgress('plan', { planSelected: planId });
        return;
      }

      const result = await apiFetchJson<{ success: boolean; subscription?: { plan?: string | null } }>('/api/v2/subscriptions/upgrade', {
        method: 'POST',
        body: { plan: backendPlan, billingCycle, userId, addons, paymentMethod, savedMethodId, autoRetry, rememberMethod },
      });

      setUserProfile((prev) => ({ ...prev, subscription: backendPlanToUi(result?.subscription?.plan) }));
      const addonText = addons.length > 0 ? ` with ${addons.length} add-on(s)` : '';
      showToast(`Subscribed to ${planId}${addonText} (${billingCycle}).`, 'success');
      trackEvent(FunnelEvents.CHECKOUT_COMPLETED, { plan: planId, billingCycle, addons: addons.length });
      syncOnboardingProgress('plan', { planSelected: planId });
    } catch (err) {
      console.error(err);
      showToast('Payment failed. Please try again.', 'error');
      trackEvent(FunnelEvents.CHECKOUT_ABANDONED, { plan: planId, reason: 'payment_failed' });
    }
  }, [showToast, userProfile.subscription, syncOnboardingProgress]);

  const cancelSubscription = useCallback(async (reason?: string) => {
    try {
      const userId = getUserId();
      const result = await apiFetchJson<{ success: boolean; subscription?: { plan?: string | null } }>('/api/v2/subscriptions/cancel', {
        method: 'POST',
        body: { reason, userId },
      });
      setUserProfile((prev) => ({ ...prev, subscription: backendPlanToUi(result?.subscription?.plan) }));
      showToast('Subscription cancelled.', 'success');
      trackEvent('subscription_cancelled', { reason });
    } catch (err) {
      console.error(err);
      showToast('Cancel failed. Please retry.', 'error');
    }
  }, [showToast]);

  const openCheckout = () => {
    trackEvent(FunnelEvents.PLAN_VIEWED);
    setIsCheckoutOpen(true);
  };
  const closeCheckout = () => setIsCheckoutOpen(false);

  return (
    <AppContext.Provider
      value={{
        userProfile,
        products,
        apiConnected,
        isCheckoutOpen,
        showOnboarding,
        updateRole,
        completeOnboarding,
        openCheckout,
        closeCheckout,
        connectBank,
        connectPlatform,
        setGoal,
        upgradeSubscription,
        cancelSubscription,
        refreshSubscription,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
