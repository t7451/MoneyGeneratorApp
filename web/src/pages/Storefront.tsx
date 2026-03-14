/**
 * Connected Account Storefront
 * 
 * This page displays products from a connected account and allows
 * customers to purchase them via Stripe Checkout.
 * 
 * URL: /storefront/:accountId
 * 
 * IMPORTANT: In production, you should NOT use the Stripe account ID in the URL.
 * Instead, use a merchant-friendly slug or your own internal ID that maps to
 * the Stripe account ID on the backend. The account ID is used here for
 * demonstration purposes only.
 * 
 * TODO for production:
 * - Replace :accountId with a custom slug (e.g., /store/acme-coffee)
 * - Create a mapping table: slug -> stripe_account_id
 * - Add merchant branding (logo, colors, etc.)
 */

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
  Store, 
  ShoppingCart, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import './Storefront.css';

// =============================================================================
// TYPES
// =============================================================================

interface Product {
  id: string;
  name: string;
  description: string;
  images: string[];
  priceInCents: number;
  priceId: string;
  currency: string;
}

// =============================================================================
// API HELPER
// =============================================================================

const API_BASE = '/api/connect';

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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
// COMPONENT
// =============================================================================

export const Storefront: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasingProductId, setPurchasingProductId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(!!sessionId);
  
  // =============================================================================
  // EFFECTS
  // =============================================================================
  
  useEffect(() => {
    if (accountId) {
      loadProducts();
    }
  }, [accountId]);
  
  // =============================================================================
  // DATA LOADING
  // =============================================================================
  
  /**
   * Load products from the connected account.
   */
  async function loadProducts() {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiRequest<{ products: Product[] }>(
        `/accounts/${accountId}/products`
      );
      setProducts(data.products);
    } catch (err) {
      console.error('Failed to load products:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }
  
  // =============================================================================
  // ACTIONS
  // =============================================================================
  
  /**
   * Start checkout for a product.
   * This creates a Stripe Checkout session and redirects to it.
   */
  async function handleBuyProduct(product: Product) {
    setPurchasingProductId(product.id);
    
    try {
      const data = await apiRequest<{ checkoutUrl: string }>(
        `/accounts/${accountId}/checkout`,
        {
          method: 'POST',
          body: JSON.stringify({
            productId: product.id,
            productName: product.name,
            priceInCents: product.priceInCents,
            quantity: 1,
          }),
        }
      );
      
      // Redirect to Stripe Checkout
      window.location.href = data.checkoutUrl;
    } catch (err) {
      console.error('Checkout failed:', err);
      setError((err as Error).message);
      setPurchasingProductId(null);
    }
  }
  
  /**
   * Format price for display.
   */
  function formatPrice(cents: number, currency: string = 'usd') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  }

  // =============================================================================
  // RENDER
  // =============================================================================
  
  return (
    <div className="storefront">
      {/* Header */}
      <header className="storefront-header">
        <div className="storefront-header-content">
          <Store size={28} className="storefront-icon" />
          <div>
            <h1>Store</h1>
            {/* 
              TODO: In production, display the merchant's business name here
              instead of the account ID. Fetch this from your database or
              from the Stripe account's display_name.
            */}
            <p className="storefront-subtitle">
              Powered by Money Generator
            </p>
          </div>
        </div>
      </header>
      
      <main className="storefront-main">
        {/* Success Message */}
        {showSuccess && (
          <div className="storefront-alert storefront-alert-success">
            <CheckCircle size={20} />
            <div>
              <strong>Payment Successful!</strong>
              <p>Thank you for your purchase. You should receive a confirmation email shortly.</p>
            </div>
            <button onClick={() => setShowSuccess(false)}>×</button>
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="storefront-alert storefront-alert-error">
            <AlertCircle size={20} />
            <div>
              <strong>Error</strong>
              <p>{error}</p>
            </div>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}
        
        {/* Note about account ID in URL */}
        <div className="storefront-dev-note">
          <strong>Developer Note:</strong> This storefront uses the Stripe account ID ({accountId}) 
          in the URL for demonstration. In production, use a merchant-friendly slug 
          (e.g., /store/your-business-name) and map it to the account ID on the backend.
        </div>
        
        {/* Loading State */}
        {isLoading && (
          <div className="storefront-loading">
            <Loader2 size={32} className="storefront-spinner" />
            <p>Loading products...</p>
          </div>
        )}
        
        {/* Empty State */}
        {!isLoading && products.length === 0 && !error && (
          <div className="storefront-empty">
            <ShoppingCart size={48} />
            <h2>No Products Available</h2>
            <p>This store doesn't have any products yet. Check back later!</p>
          </div>
        )}
        
        {/* Products Grid */}
        {!isLoading && products.length > 0 && (
          <div className="storefront-products">
            <h2>Products</h2>
            <div className="storefront-grid">
              {products.map((product) => (
                <article key={product.id} className="storefront-product-card">
                  {/* Product Image */}
                  <div className="storefront-product-image">
                    {product.images && product.images.length > 0 ? (
                      <img src={product.images[0]} alt={product.name} />
                    ) : (
                      <div className="storefront-product-placeholder">
                        <ShoppingCart size={32} />
                      </div>
                    )}
                  </div>
                  
                  {/* Product Details */}
                  <div className="storefront-product-details">
                    <h3>{product.name}</h3>
                    {product.description && (
                      <p className="storefront-product-description">
                        {product.description}
                      </p>
                    )}
                    <div className="storefront-product-footer">
                      <span className="storefront-product-price">
                        {formatPrice(product.priceInCents, product.currency)}
                      </span>
                      <button
                        className="storefront-buy-btn"
                        onClick={() => handleBuyProduct(product)}
                        disabled={purchasingProductId === product.id}
                      >
                        {purchasingProductId === product.id ? (
                          <>
                            <Loader2 size={16} className="storefront-spinner" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <ShoppingCart size={16} />
                            Buy Now
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="storefront-footer">
        <p>
          Secure payments powered by <a href="https://stripe.com" target="_blank" rel="noopener noreferrer">Stripe</a>
        </p>
        <p className="storefront-footer-note">
          Platform fee: 10% of each transaction
        </p>
      </footer>
    </div>
  );
};

/**
 * Success Page Component
 * 
 * This is shown after a successful purchase.
 * Can be used as a standalone route: /storefront/:accountId/success
 */
export const StorefrontSuccess: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  
  return (
    <div className="storefront">
      <div className="storefront-success-page">
        <CheckCircle size={64} className="storefront-success-icon" />
        <h1>Thank You!</h1>
        <p>Your payment was successful.</p>
        <p className="storefront-success-detail">
          You should receive a confirmation email shortly with your receipt.
        </p>
        <a href={`/storefront/${accountId}`} className="storefront-btn">
          <ArrowLeft size={18} />
          Back to Store
        </a>
      </div>
    </div>
  );
};

export default Storefront;
