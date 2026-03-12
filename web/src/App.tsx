import { useEffect, useState } from 'react';
import './App.css';

type Product = {
  id: string;
  type: string;
  name: string;
  price: string;
  description: string;
};

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

function App() {
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [error, setError] = useState<string | null>(null);
  const [apiConnected, setApiConnected] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  useEffect(() => {
    // Try to fetch products from API in the background
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${apiUrl}/api/catalog`, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.products && Array.isArray(data.products)) {
          setProducts(data.products);
          setApiConnected(true);
        }
      }
      setError(null);
    } catch (err) {
      // Silently fail and keep using demo products
      setApiConnected(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Money Generator App</h1>
        <p className="tagline">Turn time into money with smart job matching</p>
        <div className="health-badge">
          <span className={apiConnected ? 'status-ok' : 'status-error'}>
            {apiConnected ? '✓ API Connected' : '○ Demo Mode'}
          </span>
        </div>
      </header>

      <main className="app-main">
        <div className="hero">
          <h2>Maximize Your Earnings</h2>
          <p>Choose the plan that works best for your gig economy needs</p>
        </div>

        {products.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            marginBottom: '3rem',
          }}>
            {products.map((product) => (
              <div
                key={product.id}
                style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '2rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#1f2937' }}>
                    {product.name}
                  </h3>
                  <span
                    style={{
                      display: 'inline-block',
                      background: '#f3f4f6',
                      color: '#6366f1',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      textTransform: 'capitalize',
                    }}
                  >
                    {product.type}
                  </span>
                </div>

                <p style={{
                  fontSize: '1rem',
                  color: '#6b7280',
                  marginBottom: '1.5rem',
                  lineHeight: '1.5',
                }}>
                  {product.description}
                </p>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{
                    fontSize: '1.75rem',
                    fontWeight: '700',
                    color: '#667eea',
                  }}>
                    {product.price}
                  </span>
                  <button
                    className="btn-primary"
                    style={{
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.95rem',
                    }}
                  >
                    Get Started
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#991b1b',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '2rem',
          }}>
            Error: {error}
          </div>
        )}
      </main>

      <footer style={{
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        padding: '2rem',
        textAlign: 'center',
        color: '#6b7280',
        marginTop: 'auto',
      }}>
        <p>&copy; 2026 Money Generator App. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
