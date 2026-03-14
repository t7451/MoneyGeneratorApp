/**
 * Stripe Connect Service
 * 
 * This service handles all Stripe Connect functionality including:
 * - Creating and managing connected accounts (V2 API)
 * - Onboarding connected accounts via Account Links
 * - Creating products on connected accounts
 * - Processing direct charges with application fees
 * - Managing subscriptions for connected accounts
 * 
 * IMPORTANT: This uses the Stripe V2 Accounts API which has different
 * patterns than the legacy V1 API. Key differences:
 * - No 'type' parameter at account creation (no 'express', 'standard', 'custom')
 * - Uses 'configuration' object for capabilities
 * - Uses 'customer_account' instead of 'customer' for V2 accounts
 * 
 * @see https://docs.stripe.com/api/v2/core/accounts
 */

import Stripe from 'stripe';
import { config } from '../config.js';
import { isDatabaseConnected, queryOne, query } from '../database.js';

// =============================================================================
// STRIPE CLIENT INITIALIZATION
// =============================================================================

/**
 * Create a Stripe client instance using the secret key from environment.
 * 
 * PLACEHOLDER: If you see this error, you need to set your Stripe secret key.
 * Get your key from: https://dashboard.stripe.com/apikeys
 * 
 * The API version is automatically set by the SDK to the latest version.
 */
let stripeClient = null;

if (!config.stripe.secretKey) {
  console.error(`
╔══════════════════════════════════════════════════════════════════════════════╗
║  STRIPE CONNECT ERROR: Missing STRIPE_SECRET_KEY                              ║
║                                                                              ║
║  To use Stripe Connect, you must set the following environment variable:    ║
║                                                                              ║
║  STRIPE_SECRET_KEY=sk_live_... or sk_test_...                                ║
║                                                                              ║
║  Get your API keys from: https://dashboard.stripe.com/apikeys                ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);
} else {
  // Initialize the Stripe client
  // The SDK automatically uses the latest API version (2026-02-25.clover)
  stripeClient = new Stripe(config.stripe.secretKey);
}

/**
 * Get the Stripe client instance.
 * Throws a helpful error if not configured.
 */
export function getStripeClient() {
  if (!stripeClient) {
    throw new Error(
      'Stripe is not configured. Please set STRIPE_SECRET_KEY in your .env file. ' +
      'Get your API keys from: https://dashboard.stripe.com/apikeys'
    );
  }
  return stripeClient;
}

/**
 * Check if Stripe Connect is properly configured.
 */
export function isConnectConfigured() {
  return stripeClient !== null;
}

// =============================================================================
// CONNECTED ACCOUNT MANAGEMENT (V2 API)
// =============================================================================

/**
 * Create a new connected account using the V2 Accounts API.
 * 
 * This creates a connected account with:
 * - Full dashboard access for the connected account
 * - Stripe handling fees and losses (recommended for most platforms)
 * - Card payments capability enabled
 * 
 * IMPORTANT: We do NOT pass 'type' at the top level. The V2 API doesn't use
 * 'express', 'standard', or 'custom' types. Instead, capabilities and
 * responsibilities are configured explicitly.
 * 
 * @param {Object} params - Account creation parameters
 * @param {string} params.displayName - Business or individual name shown to customers
 * @param {string} params.email - Contact email for the connected account
 * @param {string} params.country - Two-letter ISO country code (default: 'us')
 * @param {string} [params.userId] - Your platform's user ID to associate with this account
 * @returns {Promise<Object>} The created Stripe account object
 * 
 * @example
 * const account = await createConnectedAccount({
 *   displayName: 'Acme Coffee Shop',
 *   email: 'owner@acmecoffee.com',
 *   country: 'us',
 *   userId: 'user_12345'
 * });
 */
export async function createConnectedAccount({ displayName, email, country = 'us', userId = null }) {
  const client = getStripeClient();
  
  // Create the connected account using V2 API
  // Note: We never pass 'type' at the top level - this is V2 API pattern
  const account = await client.v2.core.accounts.create({
    // Display name shown to customers during checkout and on receipts
    display_name: displayName,
    
    // Contact email for the connected account owner
    contact_email: email,
    
    // Identity information - country is required
    identity: {
      country: country,
    },
    
    // 'full' gives the connected account access to their own Stripe Dashboard
    // Use 'none' if you want to build your own dashboard
    dashboard: 'full',
    
    // Default responsibilities determine who handles fees and losses
    defaults: {
      responsibilities: {
        // 'stripe' means Stripe collects their standard fees
        // 'application' would mean your platform handles fee collection
        fees_collector: 'stripe',
        
        // 'stripe' means Stripe handles disputes and fraud losses
        // 'application' would make your platform liable
        losses_collector: 'stripe',
      },
    },
    
    // Configuration for different account capabilities
    configuration: {
      // Customer configuration - empty object enables customer features
      customer: {},
      
      // Merchant configuration with specific capabilities
      merchant: {
        capabilities: {
          // Request card payment capability
          // This will be 'pending' until onboarding is complete
          card_payments: {
            requested: true,
          },
        },
      },
    },
    
    // Store your platform's user ID in metadata for easy lookup
    metadata: userId ? { platform_user_id: userId } : undefined,
  });
  
  // If database is connected, store the mapping between user and account
  if (isDatabaseConnected() && userId) {
    await storeConnectedAccountMapping(userId, account.id);
  }
  
  return account;
}

/**
 * Retrieve a connected account with full details including requirements.
 * 
 * This fetches the account with expanded configuration and requirements
 * to determine onboarding status and capability states.
 * 
 * @param {string} accountId - The Stripe account ID (acct_...)
 * @returns {Promise<Object>} The account object with requirements
 */
export async function getConnectedAccount(accountId) {
  const client = getStripeClient();
  
  // Include configuration.merchant and requirements to check onboarding status
  const account = await client.v2.core.accounts.retrieve(accountId, {
    include: ['configuration.merchant', 'requirements'],
  });
  
  return account;
}

/**
 * Get the onboarding status of a connected account.
 * 
 * This analyzes the account's requirements and capabilities to determine:
 * - Whether the account can process payments
 * - Whether onboarding is complete
 * - What requirements are still needed
 * 
 * Note: For this demo, we always fetch fresh data from the API.
 * In production, you might cache this and update via webhooks.
 * 
 * @param {string} accountId - The Stripe account ID
 * @returns {Promise<Object>} Onboarding status details
 */
export async function getOnboardingStatus(accountId) {
  const account = await getConnectedAccount(accountId);
  
  // Check if card payments capability is active
  // This means the account can actually process payments
  const cardPaymentsStatus = account?.configuration?.merchant?.capabilities?.card_payments?.status;
  const readyToProcessPayments = cardPaymentsStatus === 'active';
  
  // Check requirements status
  // 'currently_due' = requirements needed now
  // 'past_due' = overdue requirements (account may be restricted)
  // 'eventually_due' = requirements needed in the future
  // 'pending_verification' = submitted but not yet verified
  const requirementsStatus = account?.requirements?.summary?.minimum_deadline?.status;
  
  // Onboarding is complete when there are no currently_due or past_due requirements
  const onboardingComplete = 
    requirementsStatus !== 'currently_due' && 
    requirementsStatus !== 'past_due';
  
  return {
    accountId,
    readyToProcessPayments,
    onboardingComplete,
    cardPaymentsStatus,
    requirementsStatus,
    // Include raw requirements for detailed handling
    requirements: account?.requirements,
    // Display name for UI
    displayName: account?.display_name,
  };
}

/**
 * Store the mapping between a platform user and their connected account.
 * 
 * @param {string} userId - Your platform's user ID
 * @param {string} accountId - The Stripe connected account ID
 */
async function storeConnectedAccountMapping(userId, accountId) {
  if (!isDatabaseConnected()) return;
  
  // TODO: Create this table in your migrations:
  // CREATE TABLE connected_accounts (
  //   id SERIAL PRIMARY KEY,
  //   user_id VARCHAR(255) NOT NULL UNIQUE,
  //   stripe_account_id VARCHAR(255) NOT NULL,
  //   created_at TIMESTAMP DEFAULT NOW(),
  //   updated_at TIMESTAMP DEFAULT NOW()
  // );
  
  await query(`
    INSERT INTO connected_accounts (user_id, stripe_account_id)
    VALUES ($1, $2)
    ON CONFLICT (user_id) DO UPDATE SET 
      stripe_account_id = $2, 
      updated_at = NOW()
  `, [userId, accountId]);
}

/**
 * Get the connected account ID for a platform user.
 * 
 * @param {string} userId - Your platform's user ID
 * @returns {Promise<string|null>} The Stripe account ID or null
 */
export async function getConnectedAccountIdForUser(userId) {
  if (!isDatabaseConnected()) return null;
  
  const result = await queryOne(
    'SELECT stripe_account_id FROM connected_accounts WHERE user_id = $1',
    [userId]
  );
  
  return result?.stripe_account_id || null;
}

// =============================================================================
// ACCOUNT ONBOARDING (Account Links)
// =============================================================================

/**
 * Create an account link for onboarding a connected account.
 * 
 * Account Links provide a Stripe-hosted onboarding flow where connected
 * accounts can provide the required information (identity verification,
 * bank account details, business information, etc.)
 * 
 * The link expires after a short time, so generate it right before redirecting.
 * 
 * @param {string} accountId - The Stripe account ID to onboard
 * @param {string} returnUrl - URL to redirect to after successful onboarding
 * @param {string} refreshUrl - URL to redirect to if the link expires
 * @returns {Promise<Object>} The account link object with URL
 * 
 * @example
 * const link = await createAccountLink(
 *   'acct_1234',
 *   'https://myapp.com/connect/return',
 *   'https://myapp.com/connect/refresh'
 * );
 * // Redirect user to link.url
 */
export async function createAccountLink(accountId, returnUrl, refreshUrl) {
  const client = getStripeClient();
  
  // Create account link using V2 API
  const accountLink = await client.v2.core.accountLinks.create({
    // The connected account to onboard
    account: accountId,
    
    // Use case configuration
    use_case: {
      // 'account_onboarding' collects all required information
      type: 'account_onboarding',
      
      account_onboarding: {
        // Configurations to collect - 'merchant' for payments, 'customer' for platform features
        configurations: ['merchant', 'customer'],
        
        // URL to redirect to if the link expires or user needs to restart
        refresh_url: refreshUrl,
        
        // URL to redirect to after successful onboarding
        // Include accountId so you can verify status on return
        return_url: `${returnUrl}?accountId=${accountId}`,
      },
    },
  });
  
  return accountLink;
}

// =============================================================================
// PRODUCT MANAGEMENT ON CONNECTED ACCOUNTS
// =============================================================================

/**
 * Create a product on a connected account.
 * 
 * This creates a product with a default price on the connected account's
 * Stripe account (not your platform account). The product will appear
 * in the connected account's dashboard and can be sold via their storefront.
 * 
 * IMPORTANT: We use { stripeAccount: accountId } to make the request
 * on behalf of the connected account (this sets the Stripe-Account header).
 * 
 * @param {Object} params - Product creation parameters
 * @param {string} params.accountId - The connected account ID
 * @param {string} params.name - Product name
 * @param {string} params.description - Product description
 * @param {number} params.priceInCents - Price in cents (e.g., 1999 = $19.99)
 * @param {string} params.currency - Three-letter currency code (default: 'usd')
 * @returns {Promise<Object>} The created product object
 */
export async function createProductOnConnectedAccount({
  accountId,
  name,
  description,
  priceInCents,
  currency = 'usd',
}) {
  const client = getStripeClient();
  
  // Create product with default price on the connected account
  // The { stripeAccount } option sets the Stripe-Account header
  const product = await client.products.create(
    {
      name,
      description,
      // default_price_data creates a price along with the product
      default_price_data: {
        // Amount in smallest currency unit (cents for USD)
        unit_amount: priceInCents,
        currency: currency,
      },
    },
    {
      // This header makes the request on the connected account's behalf
      stripeAccount: accountId,
    }
  );
  
  return product;
}

/**
 * List products from a connected account's catalog.
 * 
 * This retrieves active products with their prices for display in a storefront.
 * 
 * @param {string} accountId - The connected account ID
 * @param {number} limit - Maximum number of products to return (default: 20)
 * @returns {Promise<Array>} Array of product objects with prices
 */
export async function listConnectedAccountProducts(accountId, limit = 20) {
  const client = getStripeClient();
  
  // List active products with expanded price data
  const products = await client.products.list(
    {
      limit,
      active: true,
      // Expand default_price to include price details in the response
      expand: ['data.default_price'],
    },
    {
      // Make request on behalf of connected account
      stripeAccount: accountId,
    }
  );
  
  return products.data;
}

/**
 * Get a single product from a connected account.
 * 
 * @param {string} accountId - The connected account ID
 * @param {string} productId - The product ID
 * @returns {Promise<Object>} The product object
 */
export async function getConnectedAccountProduct(accountId, productId) {
  const client = getStripeClient();
  
  const product = await client.products.retrieve(
    productId,
    {
      expand: ['default_price'],
    },
    {
      stripeAccount: accountId,
    }
  );
  
  return product;
}

// =============================================================================
// CHECKOUT AND PAYMENTS (Direct Charges)
// =============================================================================

/**
 * Create a checkout session for purchasing a product from a connected account.
 * 
 * This uses Direct Charges, meaning:
 * - The payment is made directly to the connected account
 * - Your platform earns money via an application_fee_amount
 * - The connected account is the merchant of record
 * 
 * @param {Object} params - Checkout parameters
 * @param {string} params.accountId - The connected account ID
 * @param {string} params.productId - The product ID to purchase
 * @param {number} params.priceInCents - Price in cents
 * @param {string} params.productName - Product name for line item
 * @param {number} params.quantity - Quantity to purchase (default: 1)
 * @param {number} params.applicationFeePercent - Your platform's fee percentage (default: 10)
 * @param {string} params.successUrl - URL after successful payment
 * @param {string} params.cancelUrl - URL if customer cancels
 * @returns {Promise<Object>} The checkout session object
 */
export async function createCheckoutSessionForConnectedAccount({
  accountId,
  productId,
  priceInCents,
  productName,
  quantity = 1,
  applicationFeePercent = 10,
  successUrl,
  cancelUrl,
}) {
  const client = getStripeClient();
  
  // Calculate application fee (your platform's revenue)
  // For example, 10% of a $19.99 item = $1.99 = 199 cents
  const applicationFeeAmount = Math.round(priceInCents * quantity * (applicationFeePercent / 100));
  
  // Create checkout session on the connected account
  const session = await client.checkout.sessions.create(
    {
      // Line items for the checkout
      line_items: [
        {
          // Use price_data for dynamic pricing
          price_data: {
            currency: 'usd',
            unit_amount: priceInCents,
            product_data: {
              name: productName,
            },
          },
          quantity: quantity,
        },
      ],
      
      // Payment configuration
      payment_intent_data: {
        // Application fee is your platform's cut of the transaction
        // This is automatically transferred to your platform account
        application_fee_amount: applicationFeeAmount,
      },
      
      // 'payment' mode for one-time payments
      mode: 'payment',
      
      // Redirect URLs - {CHECKOUT_SESSION_ID} is replaced by Stripe
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
    },
    {
      // Make the payment on the connected account
      stripeAccount: accountId,
    }
  );
  
  return session;
}

// =============================================================================
// PLATFORM SUBSCRIPTIONS FOR CONNECTED ACCOUNTS
// =============================================================================

/**
 * Create a subscription checkout session for a connected account.
 * 
 * This allows connected accounts to subscribe to your platform's services.
 * With V2 accounts, we use 'customer_account' instead of 'customer'.
 * 
 * PLACEHOLDER: Set STRIPE_CONNECT_PLATFORM_PRICE_ID in your .env file
 * Create a subscription product/price in your Stripe Dashboard first.
 * 
 * @param {string} accountId - The connected account ID (they become the subscriber)
 * @param {string} priceId - The price ID for the subscription
 * @param {string} successUrl - URL after successful subscription
 * @param {string} cancelUrl - URL if user cancels
 * @returns {Promise<Object>} The checkout session object
 */
export async function createPlatformSubscriptionCheckout(accountId, priceId, successUrl, cancelUrl) {
  const client = getStripeClient();
  
  // Validate price ID is configured
  if (!priceId) {
    throw new Error(
      'Platform subscription price not configured. ' +
      'Set STRIPE_CONNECT_PLATFORM_PRICE_ID in your .env file. ' +
      'Create a subscription product first at: https://dashboard.stripe.com/products'
    );
  }
  
  // Create subscription checkout session
  // Note: We use 'customer_account' for V2 accounts, NOT 'customer'
  const session = await client.checkout.sessions.create({
    // The connected account ID is used as customer_account
    // This is the V2 pattern - the account acts as both merchant and customer
    customer_account: accountId,
    
    // Subscription mode for recurring payments
    mode: 'subscription',
    
    // The subscription items
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    
    // Redirect URLs
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
  });
  
  return session;
}

/**
 * Create a billing portal session for a connected account.
 * 
 * The billing portal allows connected accounts to manage their
 * subscription to your platform (update payment method, cancel, etc.)
 * 
 * @param {string} accountId - The connected account ID
 * @param {string} returnUrl - URL to return to after portal session
 * @returns {Promise<Object>} The billing portal session with URL
 */
export async function createBillingPortalForConnectedAccount(accountId, returnUrl) {
  const client = getStripeClient();
  
  // Create billing portal session using customer_account for V2 accounts
  const session = await client.billingPortal.sessions.create({
    // Use customer_account instead of customer for V2 accounts
    customer_account: accountId,
    return_url: returnUrl,
  });
  
  return session;
}

/**
 * Get subscription status for a connected account.
 * 
 * Retrieves the platform subscription status for a connected account.
 * 
 * @param {string} accountId - The connected account ID
 * @returns {Promise<Object|null>} Subscription details or null if none
 */
export async function getConnectedAccountSubscription(accountId) {
  const client = getStripeClient();
  
  try {
    // List subscriptions where the connected account is the customer_account
    const subscriptions = await client.subscriptions.list({
      customer_account: accountId,
      limit: 1,
      status: 'all',
    });
    
    if (subscriptions.data.length === 0) {
      return null;
    }
    
    const subscription = subscriptions.data[0];
    
    return {
      id: subscription.id,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      priceId: subscription.items.data[0]?.price?.id,
      // For V2 accounts, use customer_account not customer
      accountId: subscription.customer_account,
    };
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
}

// =============================================================================
// WEBHOOK EVENT PARSING
// =============================================================================

/**
 * Parse a thin event from Stripe webhooks (V2 accounts).
 * 
 * V2 account events use "thin" event payloads that contain only the event ID
 * and type. You must fetch the full event data separately.
 * 
 * @param {string|Buffer} payload - Raw request body
 * @param {string} signature - Stripe-Signature header value
 * @param {string} webhookSecret - Your webhook endpoint secret
 * @returns {Object} Parsed thin event object
 */
export function parseThinEvent(payload, signature, webhookSecret) {
  const client = getStripeClient();
  
  if (!webhookSecret) {
    throw new Error(
      'Webhook secret not configured. ' +
      'Set STRIPE_CONNECT_WEBHOOK_SECRET in your .env file. ' +
      'Get it from: https://dashboard.stripe.com/webhooks'
    );
  }
  
  // Parse the thin event with signature verification
  const thinEvent = client.parseThinEvent(payload, signature, webhookSecret);
  
  return thinEvent;
}

/**
 * Fetch full event data for a thin event.
 * 
 * After parsing a thin event, use this to get the complete event data.
 * 
 * @param {string} eventId - The event ID from the thin event
 * @returns {Promise<Object>} The full event object
 */
export async function fetchFullEvent(eventId) {
  const client = getStripeClient();
  
  // Retrieve the full event from V2 events API
  const event = await client.v2.core.events.retrieve(eventId);
  
  return event;
}

/**
 * Construct and verify a standard webhook event (V1 style).
 * 
 * Used for subscription webhooks which still use the standard event format.
 * 
 * @param {string|Buffer} payload - Raw request body
 * @param {string} signature - Stripe-Signature header value
 * @param {string} webhookSecret - Your webhook endpoint secret
 * @returns {Object} Verified event object
 */
export function constructWebhookEvent(payload, signature, webhookSecret) {
  const client = getStripeClient();
  
  if (!webhookSecret) {
    throw new Error(
      'Webhook secret not configured. ' +
      'Set STRIPE_SUBSCRIPTION_WEBHOOK_SECRET in your .env file.'
    );
  }
  
  // Construct event with signature verification
  const event = client.webhooks.constructEvent(payload, signature, webhookSecret);
  
  return event;
}

// =============================================================================
// DATABASE HELPERS FOR SUBSCRIPTION STATUS
// =============================================================================

/**
 * Update subscription status in database.
 * 
 * Called from webhook handlers to keep local state in sync.
 * 
 * @param {string} accountId - The connected account ID
 * @param {Object} subscriptionData - Subscription data to store
 */
export async function updateSubscriptionStatus(accountId, subscriptionData) {
  if (!isDatabaseConnected()) {
    // TODO: Store subscription status in database
    // When database is set up, create a table:
    // CREATE TABLE connected_account_subscriptions (
    //   id SERIAL PRIMARY KEY,
    //   account_id VARCHAR(255) NOT NULL UNIQUE,
    //   subscription_id VARCHAR(255),
    //   status VARCHAR(50),
    //   price_id VARCHAR(255),
    //   current_period_end TIMESTAMP,
    //   cancel_at_period_end BOOLEAN DEFAULT FALSE,
    //   updated_at TIMESTAMP DEFAULT NOW()
    // );
    console.log('TODO: Store subscription status for', accountId, subscriptionData);
    return;
  }
  
  await query(`
    INSERT INTO connected_account_subscriptions 
      (account_id, subscription_id, status, price_id, current_period_end, cancel_at_period_end)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (account_id) DO UPDATE SET
      subscription_id = $2,
      status = $3,
      price_id = $4,
      current_period_end = $5,
      cancel_at_period_end = $6,
      updated_at = NOW()
  `, [
    accountId,
    subscriptionData.id,
    subscriptionData.status,
    subscriptionData.priceId,
    subscriptionData.currentPeriodEnd,
    subscriptionData.cancelAtPeriodEnd,
  ]);
}

// =============================================================================
// EXPORTS
// =============================================================================

export const StripeConnectService = {
  // Configuration
  getStripeClient,
  isConnectConfigured,
  
  // Account management
  createConnectedAccount,
  getConnectedAccount,
  getOnboardingStatus,
  getConnectedAccountIdForUser,
  
  // Onboarding
  createAccountLink,
  
  // Products
  createProductOnConnectedAccount,
  listConnectedAccountProducts,
  getConnectedAccountProduct,
  
  // Checkout
  createCheckoutSessionForConnectedAccount,
  
  // Platform subscriptions
  createPlatformSubscriptionCheckout,
  createBillingPortalForConnectedAccount,
  getConnectedAccountSubscription,
  
  // Webhooks
  parseThinEvent,
  fetchFullEvent,
  constructWebhookEvent,
  updateSubscriptionStatus,
};

export default StripeConnectService;
