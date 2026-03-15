import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/Toast';
import { apiFetchJson, getUserId } from '../lib/apiClient';

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

const DEMO_PRODUCTS: Product[] = [
  {
    id: 'plan_pro',
    type: 'plan',
    name: 'Pro Plan',
    price: '$14.99/mo',
    description: 'Advanced analytics, instant payouts, and smart automations to maximize your earnings.',
  },
  {
    id: 'addon_shift_insights',
    type: 'addon',
    name: 'Shift Insights',
    price: '$4.99/mo',
    description: 'Deep per-shift profitability analysis and mileage rollups for gig work.',
  },
  {
    id: 'onetime_boost',
    type: 'one_time',
    name: 'Priority Boost',
    price: '$19.99',
    description: 'Get priority placement for 14 days to attract more high-paying opportunities.',
  },
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<UserProfile>({
    role: null,
    bankConnected: false,
    subscription: null,
    earnings: 2847,
    weeklyChange: 12,
  });
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
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
    // If backend ever returns UI ids, pass through.
    if (plan === 'plan_free') return null;
    if (plan === 'plan_pro' || plan === 'plan_enterprise') return plan;
    return null;
  };

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
        const data = await apiFetchJson<{ settings?: any }>(`/api/v1/profile/settings?userId=${encodeURIComponent(userId)}`);
        const settings = data?.settings;
        if (settings) {
          if (typeof settings.bankConnected === 'boolean') {
            setUserProfile((prev) => ({ ...prev, bankConnected: settings.bankConnected }));
          }
          if (settings.role && !localStorage.getItem('user_role')) {
            setUserProfile((prev) => ({ ...prev, role: settings.role as UserRole }));
          }
        }
      } catch {
        // ignore
      }
    })();
    fetchProducts();
  }, []);

  const updateRole = useCallback((role: UserRole) => {
      setUserProfile(prev => ({ ...prev, role }));
      if (role) localStorage.setItem('user_role', role);
      const userId = getUserId();
      apiFetchJson('/api/v1/profile/settings', {
        method: 'PUT',
        body: { userId, role },
      }).catch(() => null);
  }, []);

  const completeOnboarding = useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem('onboarding_complete', 'true');
    showToast('Welcome to Money Generator!', 'success');
    const userId = getUserId();
    apiFetchJson('/api/v1/profile/settings', {
      method: 'PUT',
      body: { userId, onboardingComplete: true },
    }).catch(() => null);
  }, [showToast]);

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

        // Preserve any non-plan demo products for now (add-ons / one-time).
        const nonPlans = DEMO_PRODUCTS.filter((p) => p.type !== 'plan');
        setProducts([...plansAsProducts, ...nonPlans]);
        setApiConnected(true);
        return;
      }
    } catch {
      // fall back below
    }

    setApiConnected(false);
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
      showToast('Opening bank connection…', 'info');
      const userId = getUserId();
      const token = await apiFetchJson<{ link_token: string }>('/api/v2/integrations/plaid/link-token', {
        method: 'POST',
        body: { userId },
      });

      await apiFetchJson<{ item_id: string }>('/api/v2/integrations/plaid/exchange', {
        method: 'POST',
        body: { userId, publicToken: token.link_token },
      });

      await apiFetchJson('/api/v1/profile/settings', {
        method: 'PUT',
        body: { userId, bankConnected: true },
      });

      setUserProfile((prev) => ({ ...prev, bankConnected: true }));
      showToast('Bank account connected successfully!', 'success');
      return true;
    } catch {
      showToast('Bank connection failed. Please retry.', 'error');
      return false;
    }
  }, [showToast]);

  const connectPlatform = useCallback(async (platformId: string) => {
    try {
      const userId = getUserId();
      await apiFetchJson('/api/v1/platforms/connect', {
        method: 'POST',
        body: { userId, platform: platformId },
      });
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
        return;
      }

      const result = await apiFetchJson<{ success: boolean; subscription?: { plan?: string | null } }>('/api/v2/subscriptions/upgrade', {
        method: 'POST',
        body: { plan: backendPlan, billingCycle, userId, addons, paymentMethod, savedMethodId, autoRetry, rememberMethod },
      });

      setUserProfile((prev) => ({ ...prev, subscription: backendPlanToUi(result?.subscription?.plan) }));
      const addonText = addons.length > 0 ? ` with ${addons.length} add-on(s)` : '';
      showToast(`Subscribed to ${planId}${addonText} (${billingCycle}).`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Payment failed. Please try again.', 'error');
    }
  }, [showToast, userProfile.subscription]);

  const cancelSubscription = useCallback(async (reason?: string) => {
    try {
      const userId = getUserId();
      const result = await apiFetchJson<{ success: boolean; subscription?: { plan?: string | null } }>('/api/v2/subscriptions/cancel', {
        method: 'POST',
        body: { reason, userId },
      });
      setUserProfile((prev) => ({ ...prev, subscription: backendPlanToUi(result?.subscription?.plan) }));
      showToast('Subscription cancelled.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Cancel failed. Please retry.', 'error');
    }
  }, [showToast]);

  const openCheckout = () => setIsCheckoutOpen(true);
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
