/**
 * Stripe Connect Dashboard Page
 * 
 * This page provides a comprehensive dashboard for connected accounts:
 * - Create or view connected account
 * - Complete onboarding via Stripe Account Links
 * - View onboarding status
 * - Create and manage products
 * - Subscribe to platform features
 * - Access billing portal
 * 
 * This uses clean, simple HTML with basic styling matching the app's design system.
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Store, 
  CreditCard, 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ExternalLink,
  Plus,
  RefreshCw,
  Loader2,
  Settings
} from 'lucide-react';
import './ConnectDashboard.css';

// =============================================================================
// TYPES
// =============================================================================

interface OnboardingStatus {
  accountId: string;
  displayName: string;
  readyToProcessPayments: boolean;
  onboardingComplete: boolean;
  cardPaymentsStatus: string;
  requirementsStatus: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string;
  priceInCents: number;
  currency: string;
}

interface Subscription {
  id: string;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

// =============================================================================
// API HELPERS
// =============================================================================

const API_BASE = '/api/connect';

/**
 * Make an authenticated API request to the Connect endpoints.
 */
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

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ConnectDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  // State
  const [accountId, setAccountId] = useState<string | null>(() => 
    localStorage.getItem('connectAccountId')
  );
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [activeTab, setActiveTab] = useState(tabParam || 'overview');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state for account creation
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  
  // Form state for product creation
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');

  // =============================================================================
  // EFFECTS
  // =============================================================================
  
  // Load account status on mount and when returning from Stripe
  useEffect(() => {
    const returnedAccountId = searchParams.get('accountId');
    if (returnedAccountId) {
      // User returned from Stripe onboarding
      setAccountId(returnedAccountId);
      localStorage.setItem('connectAccountId', returnedAccountId);
      setSuccess('Welcome back! Checking your onboarding status...');
    }
    
    if (accountId) {
      loadAccountStatus();
      loadProducts();
      loadSubscription();
    }
  }, [accountId]);

  // =============================================================================
  // DATA LOADING
  // =============================================================================
  
  /**
   * Load the connected account's onboarding status.
   * This always fetches fresh data from Stripe (per demo requirements).
   */
  async function loadAccountStatus() {
    if (!accountId) return;
    
    try {
      const data = await apiRequest<{ status: OnboardingStatus }>(
        `/accounts/${accountId}/status`
      );
      setStatus(data.status);
      setError(null);
    } catch (err) {
      console.error('Failed to load account status:', err);
      // Account might have been deleted or invalid
      if ((err as Error).message.includes('No such account')) {
        localStorage.removeItem('connectAccountId');
        setAccountId(null);
      }
    }
  }
  
  /**
   * Load products from the connected account.
   */
  async function loadProducts() {
    if (!accountId) return;
    
    try {
      const data = await apiRequest<{ products: Product[] }>(
        `/accounts/${accountId}/products`
      );
      setProducts(data.products);
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  }
  
  /**
   * Load platform subscription status for this connected account.
   */
  async function loadSubscription() {
    if (!accountId) return;
    
    try {
      const data = await apiRequest<{ subscription: Subscription | null }>(
        `/accounts/${accountId}/subscription`
      );
      setSubscription(data.subscription);
    } catch (err) {
      console.error('Failed to load subscription:', err);
    }
  }

  // =============================================================================
  // ACTIONS
  // =============================================================================
  
  /**
   * Create a new connected account.
   */
  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiRequest<{ account: { id: string } }>('/accounts', {
        method: 'POST',
        body: JSON.stringify({ displayName, email }),
      });
      
      setAccountId(data.account.id);
      localStorage.setItem('connectAccountId', data.account.id);
      setSuccess('Account created! Now complete onboarding to start accepting payments.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }
  
  /**
   * Start or continue onboarding via Stripe Account Links.
   */
  async function handleStartOnboarding() {
    if (!accountId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiRequest<{ url: string }>(
        `/accounts/${accountId}/onboarding-link`,
        { method: 'POST' }
      );
      
      // Redirect to Stripe-hosted onboarding
      window.location.href = data.url;
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
    }
  }
  
  /**
   * Create a new product on the connected account.
   */
  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Convert price to cents
      const priceInCents = Math.round(parseFloat(productPrice) * 100);
      
      await apiRequest(`/accounts/${accountId}/products`, {
        method: 'POST',
        body: JSON.stringify({
          name: productName,
          description: productDescription,
          priceInCents,
        }),
      });
      
      // Reload products and clear form
      await loadProducts();
      setProductName('');
      setProductDescription('');
      setProductPrice('');
      setSuccess('Product created successfully!');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }
  
  /**
   * Start platform subscription checkout.
   */
  async function handleSubscribe() {
    if (!accountId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiRequest<{ checkoutUrl: string }>(
        `/accounts/${accountId}/subscribe`,
        { method: 'POST' }
      );
      
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
    }
  }
  
  /**
   * Open billing portal to manage subscription.
   */
  async function handleOpenBillingPortal() {
    if (!accountId) return;
    
    setIsLoading(true);
    
    try {
      const data = await apiRequest<{ url: string }>(
        `/accounts/${accountId}/billing-portal`,
        { method: 'POST' }
      );
      
      window.location.href = data.url;
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
    }
  }

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================
  
  /**
   * Render the status badge for onboarding.
   */
  function renderStatusBadge() {
    if (!status) return null;
    
    if (status.readyToProcessPayments) {
      return (
        <span className="connect-badge connect-badge-success">
          <CheckCircle2 size={14} />
          Ready to Accept Payments
        </span>
      );
    }
    
    if (status.requirementsStatus === 'past_due') {
      return (
        <span className="connect-badge connect-badge-error">
          <AlertCircle size={14} />
          Action Required
        </span>
      );
    }
    
    if (status.requirementsStatus === 'currently_due') {
      return (
        <span className="connect-badge connect-badge-warning">
          <Clock size={14} />
          Complete Onboarding
        </span>
      );
    }
    
    return (
      <span className="connect-badge connect-badge-pending">
        <Clock size={14} />
        Pending Verification
      </span>
    );
  }

  // =============================================================================
  // RENDER
  // =============================================================================
  
  // If no account yet, show creation form
  if (!accountId) {
    return (
      <div className="connect-page">
        <div className="connect-container connect-create">
          <div className="connect-header">
            <Store size={32} className="connect-icon" />
            <h1>Start Selling with Stripe Connect</h1>
            <p>Create your connected account to start accepting payments</p>
          </div>
          
          {error && (
            <div className="connect-alert connect-alert-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          
          <form onSubmit={handleCreateAccount} className="connect-form">
            <div className="connect-field">
              <label htmlFor="displayName">Business Name</label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your business or store name"
                required
              />
            </div>
            
            <div className="connect-field">
              <label htmlFor="email">Contact Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
                required
              />
            </div>
            
            <button 
              type="submit" 
              className="connect-btn connect-btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="connect-spinner" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Create Account
                </>
              )}
            </button>
          </form>
          
          <p className="connect-footer-note">
            By creating an account, you'll be able to accept payments through our platform.
            Stripe will securely handle all payment processing.
          </p>
        </div>
      </div>
    );
  }
  
  // Main dashboard view
  return (
    <div className="connect-page">
      <div className="connect-dashboard">
        {/* Header */}
        <header className="connect-dashboard-header">
          <div className="connect-dashboard-title">
            <Store size={24} />
            <div>
              <h1>{status?.displayName || 'Your Store'}</h1>
              <p className="connect-account-id">
                Account: {accountId}
                <button 
                  className="connect-btn-icon"
                  onClick={() => navigator.clipboard.writeText(accountId)}
                  title="Copy Account ID"
                >
                  📋
                </button>
              </p>
            </div>
          </div>
          
          <div className="connect-dashboard-status">
            {renderStatusBadge()}
            <button 
              className="connect-btn-icon"
              onClick={loadAccountStatus}
              title="Refresh Status"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </header>
        
        {/* Alerts */}
        {error && (
          <div className="connect-alert connect-alert-error">
            <AlertCircle size={16} />
            {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}
        
        {success && (
          <div className="connect-alert connect-alert-success">
            <CheckCircle2 size={16} />
            {success}
            <button onClick={() => setSuccess(null)}>×</button>
          </div>
        )}
        
        {/* Onboarding Banner */}
        {status && !status.readyToProcessPayments && (
          <div className="connect-onboarding-banner">
            <div className="connect-onboarding-content">
              <h2>Complete Your Onboarding</h2>
              <p>
                {status.requirementsStatus === 'past_due'
                  ? 'Your account has past-due requirements. Complete onboarding to continue accepting payments.'
                  : 'Finish setting up your account to start accepting payments from customers.'}
              </p>
            </div>
            <button 
              className="connect-btn connect-btn-primary"
              onClick={handleStartOnboarding}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 size={18} className="connect-spinner" />
              ) : (
                <ExternalLink size={18} />
              )}
              {status.onboardingComplete ? 'Update Information' : 'Complete Onboarding'}
            </button>
          </div>
        )}
        
        {/* Tab Navigation */}
        <nav className="connect-tabs">
          <button 
            className={`connect-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Store size={16} />
            Overview
          </button>
          <button 
            className={`connect-tab ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            <Package size={16} />
            Products
          </button>
          <button 
            className={`connect-tab ${activeTab === 'subscription' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscription')}
          >
            <CreditCard size={16} />
            Subscription
          </button>
        </nav>
        
        {/* Tab Content */}
        <div className="connect-tab-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="connect-overview">
              <div className="connect-stats">
                <div className="connect-stat-card">
                  <Package size={24} />
                  <div className="connect-stat-content">
                    <span className="connect-stat-value">{products.length}</span>
                    <span className="connect-stat-label">Products</span>
                  </div>
                </div>
                
                <div className="connect-stat-card">
                  <CreditCard size={24} />
                  <div className="connect-stat-content">
                    <span className="connect-stat-value">
                      {status?.readyToProcessPayments ? 'Active' : 'Pending'}
                    </span>
                    <span className="connect-stat-label">Payment Status</span>
                  </div>
                </div>
                
                <div className="connect-stat-card">
                  <Settings size={24} />
                  <div className="connect-stat-content">
                    <span className="connect-stat-value">
                      {subscription?.status || 'None'}
                    </span>
                    <span className="connect-stat-label">Subscription</span>
                  </div>
                </div>
              </div>
              
              <div className="connect-quick-actions">
                <h3>Quick Actions</h3>
                <div className="connect-action-grid">
                  <a 
                    href={`/storefront/${accountId}`} 
                    className="connect-action-card"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Store size={20} />
                    <span>View Storefront</span>
                    <ExternalLink size={14} />
                  </a>
                  
                  <button 
                    className="connect-action-card"
                    onClick={() => setActiveTab('products')}
                  >
                    <Plus size={20} />
                    <span>Add Product</span>
                  </button>
                  
                  <a 
                    href={`https://dashboard.stripe.com/connect/accounts/${accountId}`}
                    className="connect-action-card"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Settings size={20} />
                    <span>Stripe Dashboard</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          )}
          
          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="connect-products">
              <div className="connect-section">
                <h3>Create New Product</h3>
                <form onSubmit={handleCreateProduct} className="connect-product-form">
                  <div className="connect-form-row">
                    <div className="connect-field">
                      <label htmlFor="productName">Product Name</label>
                      <input
                        id="productName"
                        type="text"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="My Awesome Product"
                        required
                      />
                    </div>
                    
                    <div className="connect-field connect-field-price">
                      <label htmlFor="productPrice">Price (USD)</label>
                      <div className="connect-price-input">
                        <span className="connect-price-symbol">$</span>
                        <input
                          id="productPrice"
                          type="number"
                          step="0.01"
                          min="0.50"
                          value={productPrice}
                          onChange={(e) => setProductPrice(e.target.value)}
                          placeholder="19.99"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="connect-field">
                    <label htmlFor="productDescription">Description</label>
                    <textarea
                      id="productDescription"
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                      placeholder="Describe your product..."
                      rows={3}
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    className="connect-btn connect-btn-primary"
                    disabled={isLoading || !status?.readyToProcessPayments}
                  >
                    {isLoading ? (
                      <Loader2 size={18} className="connect-spinner" />
                    ) : (
                      <Plus size={18} />
                    )}
                    Create Product
                  </button>
                  
                  {!status?.readyToProcessPayments && (
                    <p className="connect-field-hint">
                      Complete onboarding to create products
                    </p>
                  )}
                </form>
              </div>
              
              <div className="connect-section">
                <h3>Your Products</h3>
                {products.length === 0 ? (
                  <div className="connect-empty">
                    <Package size={48} />
                    <p>No products yet. Create your first product above!</p>
                  </div>
                ) : (
                  <div className="connect-product-grid">
                    {products.map((product) => (
                      <div key={product.id} className="connect-product-card">
                        <h4>{product.name}</h4>
                        <p>{product.description || 'No description'}</p>
                        <div className="connect-product-price">
                          ${(product.priceInCents / 100).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <div className="connect-subscription">
              <div className="connect-section">
                <h3>Platform Subscription</h3>
                
                {subscription ? (
                  <div className="connect-subscription-card">
                    <div className="connect-subscription-status">
                      <span className={`connect-badge connect-badge-${subscription.status === 'active' ? 'success' : 'warning'}`}>
                        {subscription.status}
                      </span>
                      {subscription.cancelAtPeriodEnd && (
                        <span className="connect-badge connect-badge-warning">
                          Cancels at period end
                        </span>
                      )}
                    </div>
                    
                    <p className="connect-subscription-period">
                      Current period ends: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                    
                    <button 
                      className="connect-btn connect-btn-secondary"
                      onClick={handleOpenBillingPortal}
                      disabled={isLoading}
                    >
                      <Settings size={18} />
                      Manage Subscription
                    </button>
                  </div>
                ) : (
                  <div className="connect-subscription-promo">
                    <h4>Unlock Premium Features</h4>
                    <ul className="connect-feature-list">
                      <li>✓ Lower platform fees</li>
                      <li>✓ Priority support</li>
                      <li>✓ Advanced analytics</li>
                      <li>✓ Custom branding</li>
                    </ul>
                    
                    <button 
                      className="connect-btn connect-btn-primary"
                      onClick={handleSubscribe}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 size={18} className="connect-spinner" />
                      ) : (
                        <CreditCard size={18} />
                      )}
                      Subscribe Now
                    </button>
                    
                    <p className="connect-subscription-note">
                      Note: You'll need to set STRIPE_CONNECT_PLATFORM_PRICE_ID in your .env file
                      with a valid Stripe Price ID for subscriptions to work.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectDashboard;
