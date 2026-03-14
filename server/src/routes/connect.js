/**
 * Stripe Connect Routes
 * 
 * This module provides API routes for Stripe Connect functionality:
 * - Connected account creation and management
 * - Account onboarding via Account Links
 * - Product management on connected accounts
 * - Checkout for connected account products
 * - Platform subscriptions for connected accounts
 * 
 * All routes are prefixed with /api/connect when mounted in app.js
 */

import { Router } from 'express';
import { config } from '../config.js';
import {
  StripeConnectService,
  createConnectedAccount,
  getOnboardingStatus,
  createAccountLink,
  createProductOnConnectedAccount,
  listConnectedAccountProducts,
  createCheckoutSessionForConnectedAccount,
  createPlatformSubscriptionCheckout,
  createBillingPortalForConnectedAccount,
  getConnectedAccountSubscription,
  isConnectConfigured,
} from '../services/stripeConnectService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// =============================================================================
// HELPER: Get base URL for redirects
// =============================================================================

/**
 * Get the base URL for the application.
 * Uses environment variable or falls back to request host.
 */
function getBaseUrl(req) {
  // In production, use configured URL
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  // In development, construct from request
  const protocol = req.secure ? 'https' : 'http';
  return `${protocol}://${req.get('host')}`;
}

// =============================================================================
// CONFIGURATION CHECK
// =============================================================================

/**
 * GET /api/connect/config
 * 
 * Check if Stripe Connect is properly configured.
 * Use this to show/hide Connect features in the UI.
 */
router.get('/config', (req, res) => {
  res.json({
    configured: isConnectConfigured(),
    // Include publishable key for frontend Stripe.js usage
    publishableKey: config.stripe.publishableKey || null,
  });
});

// =============================================================================
// CONNECTED ACCOUNT MANAGEMENT
// =============================================================================

/**
 * POST /api/connect/accounts
 * 
 * Create a new connected account.
 * Requires authentication - the connected account will be linked to the current user.
 * 
 * Request body:
 * {
 *   "displayName": "Business Name",
 *   "email": "owner@business.com",
 *   "country": "us" (optional, defaults to "us")
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "account": { ... Stripe account object ... }
 * }
 */
router.post('/accounts', authenticateToken, async (req, res) => {
  try {
    const { displayName, email, country = 'us' } = req.body;
    
    // Validate required fields
    if (!displayName || !email) {
      return res.status(400).json({
        success: false,
        error: 'displayName and email are required',
      });
    }
    
    // Create the connected account
    // Pass the authenticated user's ID to link the account
    const account = await createConnectedAccount({
      displayName,
      email,
      country,
      userId: req.user.id,
    });
    
    res.status(201).json({
      success: true,
      account: {
        id: account.id,
        displayName: account.display_name,
        email: account.contact_email,
        // Account is created but needs onboarding
        requiresOnboarding: true,
      },
    });
  } catch (error) {
    console.error('Error creating connected account:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create connected account',
    });
  }
});

/**
 * GET /api/connect/accounts/:accountId/status
 * 
 * Get the onboarding status of a connected account.
 * 
 * Response:
 * {
 *   "success": true,
 *   "status": {
 *     "accountId": "acct_...",
 *     "readyToProcessPayments": true/false,
 *     "onboardingComplete": true/false,
 *     "cardPaymentsStatus": "active" | "pending" | "inactive",
 *     "requirementsStatus": "currently_due" | "past_due" | "pending_verification" | null,
 *     "displayName": "Business Name"
 *   }
 * }
 */
router.get('/accounts/:accountId/status', async (req, res) => {
  try {
    const { accountId } = req.params;
    
    // Always fetch fresh status from Stripe API (per demo requirements)
    const status = await getOnboardingStatus(accountId);
    
    res.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('Error fetching account status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch account status',
    });
  }
});

// =============================================================================
// ACCOUNT ONBOARDING
// =============================================================================

/**
 * POST /api/connect/accounts/:accountId/onboarding-link
 * 
 * Create an Account Link for onboarding.
 * The user should be redirected to the returned URL.
 * 
 * Response:
 * {
 *   "success": true,
 *   "url": "https://connect.stripe.com/setup/..."
 * }
 */
router.post('/accounts/:accountId/onboarding-link', async (req, res) => {
  try {
    const { accountId } = req.params;
    const baseUrl = getBaseUrl(req);
    
    // Create account link for onboarding
    const accountLink = await createAccountLink(
      accountId,
      // Return URL after successful onboarding
      `${baseUrl}/connect/onboarding/return`,
      // Refresh URL if link expires
      `${baseUrl}/connect/onboarding/refresh`
    );
    
    res.json({
      success: true,
      url: accountLink.url,
    });
  } catch (error) {
    console.error('Error creating onboarding link:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create onboarding link',
    });
  }
});

// =============================================================================
// PRODUCT MANAGEMENT
// =============================================================================

/**
 * POST /api/connect/accounts/:accountId/products
 * 
 * Create a product on a connected account.
 * 
 * Request body:
 * {
 *   "name": "Product Name",
 *   "description": "Product description",
 *   "priceInCents": 1999,
 *   "currency": "usd" (optional)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "product": { ... Stripe product object ... }
 * }
 */
router.post('/accounts/:accountId/products', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { name, description, priceInCents, currency = 'usd' } = req.body;
    
    // Validate required fields
    if (!name || !priceInCents) {
      return res.status(400).json({
        success: false,
        error: 'name and priceInCents are required',
      });
    }
    
    // Create product on the connected account
    const product = await createProductOnConnectedAccount({
      accountId,
      name,
      description: description || '',
      priceInCents: parseInt(priceInCents, 10),
      currency,
    });
    
    res.status(201).json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        priceId: product.default_price?.id || product.default_price,
        priceInCents: product.default_price?.unit_amount,
        currency: product.default_price?.currency,
      },
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create product',
    });
  }
});

/**
 * GET /api/connect/accounts/:accountId/products
 * 
 * List products from a connected account.
 * 
 * Response:
 * {
 *   "success": true,
 *   "products": [
 *     {
 *       "id": "prod_...",
 *       "name": "Product Name",
 *       "description": "...",
 *       "priceInCents": 1999,
 *       "currency": "usd"
 *     }
 *   ]
 * }
 */
router.get('/accounts/:accountId/products', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit = 20 } = req.query;
    
    // List products from the connected account
    const products = await listConnectedAccountProducts(accountId, parseInt(limit, 10));
    
    // Transform to simpler format for frontend
    const formattedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      images: product.images,
      priceId: product.default_price?.id,
      priceInCents: product.default_price?.unit_amount,
      currency: product.default_price?.currency,
    }));
    
    res.json({
      success: true,
      products: formattedProducts,
    });
  } catch (error) {
    console.error('Error listing products:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list products',
    });
  }
});

// =============================================================================
// CHECKOUT
// =============================================================================

/**
 * POST /api/connect/accounts/:accountId/checkout
 * 
 * Create a checkout session for purchasing a product.
 * Uses Direct Charges with application fees.
 * 
 * Request body:
 * {
 *   "productId": "prod_...",
 *   "productName": "Product Name",
 *   "priceInCents": 1999,
 *   "quantity": 1
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "checkoutUrl": "https://checkout.stripe.com/..."
 * }
 */
router.post('/accounts/:accountId/checkout', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { productId, productName, priceInCents, quantity = 1 } = req.body;
    const baseUrl = getBaseUrl(req);
    
    // Validate required fields
    if (!productName || !priceInCents) {
      return res.status(400).json({
        success: false,
        error: 'productName and priceInCents are required',
      });
    }
    
    // Create checkout session with application fee
    const session = await createCheckoutSessionForConnectedAccount({
      accountId,
      productId,
      productName,
      priceInCents: parseInt(priceInCents, 10),
      quantity: parseInt(quantity, 10),
      // 10% application fee for the platform
      applicationFeePercent: 10,
      successUrl: `${baseUrl}/storefront/${accountId}/success`,
      cancelUrl: `${baseUrl}/storefront/${accountId}`,
    });
    
    res.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create checkout session',
    });
  }
});

// =============================================================================
// PLATFORM SUBSCRIPTIONS FOR CONNECTED ACCOUNTS
// =============================================================================

/**
 * POST /api/connect/accounts/:accountId/subscribe
 * 
 * Create a subscription checkout for a connected account to subscribe to the platform.
 * 
 * Response:
 * {
 *   "success": true,
 *   "checkoutUrl": "https://checkout.stripe.com/..."
 * }
 */
router.post('/accounts/:accountId/subscribe', async (req, res) => {
  try {
    const { accountId } = req.params;
    const baseUrl = getBaseUrl(req);
    
    // Get platform subscription price from environment
    // PLACEHOLDER: Set this in your .env file
    const priceId = process.env.STRIPE_CONNECT_PLATFORM_PRICE_ID;
    
    if (!priceId) {
      return res.status(503).json({
        success: false,
        error: 'Platform subscription not configured. Set STRIPE_CONNECT_PLATFORM_PRICE_ID in .env',
        hint: 'Create a subscription product at https://dashboard.stripe.com/products',
      });
    }
    
    // Create subscription checkout
    const session = await createPlatformSubscriptionCheckout(
      accountId,
      priceId,
      `${baseUrl}/connect/dashboard?tab=subscription`,
      `${baseUrl}/connect/dashboard`
    );
    
    res.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Error creating subscription checkout:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create subscription checkout',
    });
  }
});

/**
 * GET /api/connect/accounts/:accountId/subscription
 * 
 * Get the platform subscription status for a connected account.
 * 
 * Response:
 * {
 *   "success": true,
 *   "subscription": {
 *     "id": "sub_...",
 *     "status": "active",
 *     "currentPeriodEnd": "2024-02-01T00:00:00Z",
 *     "cancelAtPeriodEnd": false
 *   }
 * }
 */
router.get('/accounts/:accountId/subscription', async (req, res) => {
  try {
    const { accountId } = req.params;
    
    const subscription = await getConnectedAccountSubscription(accountId);
    
    res.json({
      success: true,
      subscription: subscription || null,
      hasSubscription: subscription !== null,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch subscription',
    });
  }
});

/**
 * POST /api/connect/accounts/:accountId/billing-portal
 * 
 * Create a billing portal session for managing subscription.
 * 
 * Response:
 * {
 *   "success": true,
 *   "url": "https://billing.stripe.com/..."
 * }
 */
router.post('/accounts/:accountId/billing-portal', async (req, res) => {
  try {
    const { accountId } = req.params;
    const baseUrl = getBaseUrl(req);
    
    const session = await createBillingPortalForConnectedAccount(
      accountId,
      `${baseUrl}/connect/dashboard`
    );
    
    res.json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating billing portal:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create billing portal',
    });
  }
});

export default router;
