import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ErrorState } from '../components/ErrorState';
import './ProductsPage.css';

export const ProductsPage: React.FC = () => {
  const { products: contextProducts, openCheckout, connectBank, apiConnected } = useAppContext();
  const [products, setProducts] = useState(contextProducts);

  useEffect(() => {
    setProducts(contextProducts || []);
  }, [contextProducts]);

  if (!apiConnected && products.length === 0) {
    return (
      <div className="products-page">
        <ErrorState
          type="server"
          title="Products unavailable"
          message="We couldn't load live catalog data right now. Retry after the API is available."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="products-page">
      <div className="products-banner">
        <h2>Maximize Your Earnings</h2>
        <p>Choose the plan that works best for your gig economy needs</p>
        <div className="products-actions">
          <button className="button primary" onClick={openCheckout}>
            View Plans
          </button>
          <button className="button secondary" onClick={connectBank}>
            Connect Bank
          </button>
        </div>
      </div>

      <div className="featured-section">
        <h3 className="featured-title">Featured Products</h3>
        <div className="products-grid">
          {products.map((product: any) => (
            <div key={product.id} className="product-card">
              <div className="product-badge-wrapper">
                <span className={`badge ${product.type === 'plan' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                  {product.type}
                </span>
              </div>
              <h3 className="product-title">{product.name}</h3>
              <p className="product-description">{product.description}</p>
              
              <div className="product-footer">
                <span className="product-price">{product.price}</span>
                <button className="button primary" onClick={openCheckout}>
                  Select
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
