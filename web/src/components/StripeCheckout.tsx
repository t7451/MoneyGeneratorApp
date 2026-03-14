/**
 * Stripe Checkout Integration
 * Handles Stripe checkout sessions and subscription management
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

// Types
export interface SubscriptionInfo {
  id?: string;
  planId: string;
  status: string;
  billingCycle?: string | null;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAt?: string | null;
  stripeSubscriptionId?: string;
}

export interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  features: string[];
}

interface StripeContextType {
  stripe: Stripe | null;
  isConfigured: boolean;
  isLoading: boolean;
  subscription: SubscriptionInfo | null;
  createCheckoutSession: (planId: string, billingCycle: 'monthly' | 'annual') => Promise<{ url: string }>;
  getSubscription: () => Promise<SubscriptionInfo>;
  cancelSubscription: (immediately?: boolean) => Promise<void>;
  openBillingPortal: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const StripeContext = createContext<StripeContextType | null>(null);

// Stripe promise (singleton)
let stripePromise: Promise<Stripe | null> | null = null;

async function getStripeInstance(): Promise<Stripe | null> {
  if (!stripePromise) {
    // Get publishable key from backend
    const response = await fetch('/api/payments/config');
    const { publishableKey, configured } = await response.json();
    
    if (!configured || !publishableKey) {
      console.warn('Stripe is not configured');
      return null;
    }
    
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

// API helpers
const API_BASE = '/api/payments';

async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  
  return data;
}

// Provider component
interface StripeProviderProps {
  children: ReactNode;
}

export function StripeProvider({ children }: StripeProviderProps) {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const stripeInstance = await getStripeInstance();
        setStripe(stripeInstance);
        setIsConfigured(stripeInstance !== null);
        
        // Load subscription if user is authenticated
        const token = localStorage.getItem('token');
        if (token) {
          const subData = await apiRequest<{ subscription: SubscriptionInfo }>('/subscription');
          setSubscription(subData.subscription);
        }
      } catch (error) {
        console.error('Failed to initialize Stripe:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    init();
  }, []);

  const createCheckoutSession = async (
    planId: string, 
    billingCycle: 'monthly' | 'annual'
  ) => {
    const data = await apiRequest<{ url: string; sessionId: string }>('/checkout', {
      method: 'POST',
      body: JSON.stringify({ planId, billingCycle }),
    });
    
    return { url: data.url };
  };

  const getSubscription = async () => {
    const data = await apiRequest<{ subscription: SubscriptionInfo }>('/subscription');
    setSubscription(data.subscription);
    return data.subscription;
  };

  const cancelSubscription = async (immediately = false) => {
    await apiRequest('/subscription/cancel', {
      method: 'POST',
      body: JSON.stringify({ immediately }),
    });
    await getSubscription();
  };

  const openBillingPortal = async () => {
    const data = await apiRequest<{ url: string }>('/billing-portal', {
      method: 'POST',
    });
    window.location.href = data.url;
  };

  const refreshSubscription = async () => {
    await getSubscription();
  };

  return (
    <StripeContext.Provider
      value={{
        stripe,
        isConfigured,
        isLoading,
        subscription,
        createCheckoutSession,
        getSubscription,
        cancelSubscription,
        openBillingPortal,
        refreshSubscription,
      }}
    >
      {children}
    </StripeContext.Provider>
  );
}

// Hook to use Stripe context
export function useStripe() {
  const context = useContext(StripeContext);
  if (!context) {
    throw new Error('useStripe must be used within a StripeProvider');
  }
  return context;
}

// Simple checkout button component
interface StripeCheckoutButtonProps {
  planId: string;
  billingCycle?: 'monthly' | 'annual';
  className?: string;
  children: ReactNode;
}

export function StripeCheckoutButton({ 
  planId, 
  billingCycle = 'monthly',
  className = '',
  children 
}: StripeCheckoutButtonProps) {
  const { isConfigured, createCheckoutSession } = useStripe();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (!isConfigured) {
      setError('Payment system is not configured');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { url } = await createCheckoutSession(planId, billingCycle);
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setLoading(false);
    }
  };

  return (
    <div>
      <button 
        className={className} 
        onClick={handleClick}
        disabled={loading || !isConfigured}
      >
        {loading ? 'Redirecting...' : children}
      </button>
      {error && <p className="checkout-error">{error}</p>}
    </div>
  );
}

// Subscription status display
export function SubscriptionStatus() {
  const { subscription, isLoading, openBillingPortal, cancelSubscription } = useStripe();
  const [canceling, setCanceling] = useState(false);

  if (isLoading) {
    return <div className="subscription-status loading">Loading...</div>;
  }

  if (!subscription || subscription.planId === 'free') {
    return (
      <div className="subscription-status free">
        <h3>Free Plan</h3>
        <p>You're on the free plan. Upgrade to unlock premium features.</p>
      </div>
    );
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;
    setCanceling(true);
    try {
      await cancelSubscription();
    } finally {
      setCanceling(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className={`subscription-status ${subscription.status}`}>
      <h3>{subscription.planId.charAt(0).toUpperCase() + subscription.planId.slice(1)} Plan</h3>
      <div className="subscription-details">
        <p><strong>Status:</strong> {subscription.status}</p>
        <p><strong>Billing:</strong> {subscription.billingCycle || 'Monthly'}</p>
        {subscription.currentPeriodEnd && (
          <p><strong>Next billing:</strong> {formatDate(subscription.currentPeriodEnd)}</p>
        )}
        {subscription.cancelAt && (
          <p className="cancel-notice">
            <strong>Cancels on:</strong> {formatDate(subscription.cancelAt)}
          </p>
        )}
      </div>
      <div className="subscription-actions">
        <button onClick={openBillingPortal} className="btn-manage">
          Manage Billing
        </button>
        {!subscription.cancelAt && (
          <button 
            onClick={handleCancel} 
            className="btn-cancel"
            disabled={canceling}
          >
            {canceling ? 'Canceling...' : 'Cancel Subscription'}
          </button>
        )}
      </div>
    </div>
  );
}
