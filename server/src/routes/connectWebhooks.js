/**
 * Stripe Connect Webhook Handlers
 * 
 * This module handles webhooks for Stripe Connect:
 * 
 * 1. V2 Account Events (thin events) - For connected account changes:
 *    - v2.core.account[requirements].updated
 *    - v2.core.account[configuration.merchant].capability_status_updated
 *    - v2.core.account[configuration.customer].capability_status_updated
 * 
 * 2. Standard Subscription Events - For platform subscriptions:
 *    - customer.subscription.created
 *    - customer.subscription.updated
 *    - customer.subscription.deleted
 *    - invoice.paid
 *    - invoice.payment_failed
 * 
 * WEBHOOK SETUP INSTRUCTIONS:
 * 
 * For V2 Account Events (thin events):
 * 1. Go to https://dashboard.stripe.com/webhooks
 * 2. Click "+ Add destination"
 * 3. In "Events from", select "Connected accounts"
 * 4. Click "Show advanced options"
 * 5. In "Payload style", select "Thin"
 * 6. Search for "v2" and select the events listed above
 * 7. Set endpoint URL to: https://your-domain.com/api/connect/webhooks/accounts
 * 
 * For Subscription Events (standard):
 * 1. Create another webhook endpoint
 * 2. Select "Account events"
 * 3. Select subscription-related events
 * 4. Set endpoint URL to: https://your-domain.com/api/connect/webhooks/subscriptions
 * 
 * For local development, use Stripe CLI:
 * 
 * # V2 thin events:
 * stripe listen --thin-events 'v2.core.account[requirements].updated,v2.core.account[configuration.merchant].capability_status_updated,v2.core.account[configuration.customer].capability_status_updated' --forward-thin-to http://localhost:4000/api/connect/webhooks/accounts
 * 
 * # Standard subscription events:
 * stripe listen --events 'customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed' --forward-to http://localhost:4000/api/connect/webhooks/subscriptions
 */

import { Router } from 'express';
import {
  parseThinEvent,
  fetchFullEvent,
  constructWebhookEvent,
  updateSubscriptionStatus,
  getOnboardingStatus,
} from '../services/stripeConnectService.js';

const router = Router();

// =============================================================================
// V2 ACCOUNT WEBHOOKS (THIN EVENTS)
// =============================================================================

/**
 * POST /api/connect/webhooks/accounts
 * 
 * Webhook endpoint for V2 account thin events.
 * 
 * V2 events use "thin" payloads - they only contain the event ID and type.
 * We must fetch the full event data separately using the events API.
 * 
 * Events handled:
 * - v2.core.account[requirements].updated - Account requirements changed
 * - v2.core.account[configuration.merchant].capability_status_updated - Merchant capability changed
 * - v2.core.account[configuration.customer].capability_status_updated - Customer capability changed
 * 
 * PLACEHOLDER: Set STRIPE_CONNECT_WEBHOOK_SECRET in your .env file
 */
router.post('/accounts', async (req, res) => {
  // Get the signature from headers
  const signature = req.headers['stripe-signature'];
  
  if (!signature) {
    console.error('Missing stripe-signature header');
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }
  
  // Get webhook secret from environment
  // PLACEHOLDER: You must set this in your .env file
  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error(`
╔══════════════════════════════════════════════════════════════════════════════╗
║  WEBHOOK ERROR: Missing STRIPE_CONNECT_WEBHOOK_SECRET                        ║
║                                                                              ║
║  To handle Connect webhooks, set this environment variable.                 ║
║  Get it from https://dashboard.stripe.com/webhooks when you create the     ║
║  webhook endpoint, or from Stripe CLI output when using 'stripe listen'.   ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }
  
  let thinEvent;
  
  try {
    // Parse the thin event with signature verification
    // req.body must be the raw body (Buffer or string) for signature verification
    thinEvent = parseThinEvent(req.body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }
  
  // Log the thin event for debugging
  console.log('Received thin event:', {
    id: thinEvent.id,
    type: thinEvent.type,
  });
  
  try {
    // Fetch the full event data to understand what changed
    const event = await fetchFullEvent(thinEvent.id);
    
    // Route to appropriate handler based on event type
    switch (event.type) {
      case 'v2.core.account[requirements].updated':
        await handleRequirementsUpdated(event);
        break;
        
      case 'v2.core.account[configuration.merchant].capability_status_updated':
        await handleMerchantCapabilityUpdated(event);
        break;
        
      case 'v2.core.account[configuration.customer].capability_status_updated':
        await handleCustomerCapabilityUpdated(event);
        break;
        
      default:
        console.log(`Unhandled V2 event type: ${event.type}`);
    }
    
    // Acknowledge receipt - always return 200 to prevent retries
    res.json({ received: true });
    
  } catch (err) {
    console.error('Error processing webhook event:', err);
    // Still return 200 to acknowledge receipt
    // Stripe will retry if we return an error, which could cause issues
    res.json({ received: true, error: err.message });
  }
});

/**
 * Handle v2.core.account[requirements].updated event.
 * 
 * This event fires when account requirements change, often due to:
 * - Changes by financial regulators
 * - Card network policy updates
 * - Periodic verification requirements
 * - User-initiated changes that require additional verification
 * 
 * When this happens, you should:
 * 1. Check what new requirements are needed
 * 2. Prompt the user to complete onboarding again if necessary
 * 3. Potentially restrict functionality if requirements are past_due
 */
async function handleRequirementsUpdated(event) {
  console.log('=== Account Requirements Updated ===');
  
  // Extract account ID from the event
  // The exact structure depends on the event data
  const accountId = event.data?.account_id || event.related_object?.id;
  
  if (!accountId) {
    console.error('No account ID found in requirements updated event');
    return;
  }
  
  console.log('Account ID:', accountId);
  
  // Fetch current status to see what's needed
  try {
    const status = await getOnboardingStatus(accountId);
    
    console.log('Current onboarding status:', {
      readyToProcessPayments: status.readyToProcessPayments,
      onboardingComplete: status.onboardingComplete,
      requirementsStatus: status.requirementsStatus,
    });
    
    // TODO: Implement your business logic here
    // Examples:
    // - Send email notification to connected account owner
    // - Update UI to show "action required" banner
    // - Restrict certain features if past_due
    
    if (status.requirementsStatus === 'past_due') {
      console.warn(`Account ${accountId} has past_due requirements - may need to restrict access`);
      // TODO: Implement restriction logic
      // await restrictConnectedAccount(accountId);
    } else if (status.requirementsStatus === 'currently_due') {
      console.log(`Account ${accountId} has requirements due - should notify user`);
      // TODO: Send notification
      // await notifyAccountOwner(accountId, 'requirements_due');
    }
    
  } catch (error) {
    console.error('Error fetching account status:', error);
  }
}

/**
 * Handle v2.core.account[configuration.merchant].capability_status_updated event.
 * 
 * This event fires when a merchant capability status changes, such as:
 * - card_payments becoming active (account can now process payments)
 * - card_payments becoming inactive (payments disabled)
 * - card_payments becoming pending (under review)
 * 
 * Use this to:
 * - Enable/disable payment features in your UI
 * - Notify users when they can start accepting payments
 * - Alert users if their payment capability is restricted
 */
async function handleMerchantCapabilityUpdated(event) {
  console.log('=== Merchant Capability Status Updated ===');
  
  const accountId = event.data?.account_id || event.related_object?.id;
  const capability = event.data?.capability;
  const newStatus = event.data?.status;
  
  console.log('Capability update:', {
    accountId,
    capability,
    newStatus,
  });
  
  if (newStatus === 'active') {
    console.log(`✅ Account ${accountId} can now process ${capability}`);
    // TODO: Notify user, enable features
    // await notifyAccountOwner(accountId, 'payments_enabled');
  } else if (newStatus === 'inactive') {
    console.log(`❌ Account ${accountId} can no longer process ${capability}`);
    // TODO: Notify user, disable features
    // await notifyAccountOwner(accountId, 'payments_disabled');
  } else if (newStatus === 'pending') {
    console.log(`⏳ Account ${accountId} ${capability} is pending review`);
  }
}

/**
 * Handle v2.core.account[configuration.customer].capability_status_updated event.
 * 
 * This event fires when customer-related capabilities change.
 * Similar handling to merchant capabilities.
 */
async function handleCustomerCapabilityUpdated(event) {
  console.log('=== Customer Capability Status Updated ===');
  
  const accountId = event.data?.account_id || event.related_object?.id;
  const capability = event.data?.capability;
  const newStatus = event.data?.status;
  
  console.log('Customer capability update:', {
    accountId,
    capability,
    newStatus,
  });
  
  // TODO: Handle as needed for your platform
}

// =============================================================================
// STANDARD SUBSCRIPTION WEBHOOKS
// =============================================================================

/**
 * POST /api/connect/webhooks/subscriptions
 * 
 * Webhook endpoint for standard subscription events.
 * 
 * These are NOT thin events - they include the full event data.
 * 
 * Events handled:
 * - customer.subscription.created - New subscription started
 * - customer.subscription.updated - Subscription changed (upgrade, downgrade, cancel pending)
 * - customer.subscription.deleted - Subscription ended
 * - invoice.paid - Invoice successfully paid
 * - invoice.payment_failed - Invoice payment failed
 * - payment_method.attached - Customer added a payment method
 * - payment_method.detached - Customer removed a payment method
 * 
 * PLACEHOLDER: Set STRIPE_SUBSCRIPTION_WEBHOOK_SECRET in your .env file
 */
router.post('/subscriptions', async (req, res) => {
  const signature = req.headers['stripe-signature'];
  
  if (!signature) {
    console.error('Missing stripe-signature header');
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }
  
  // Get webhook secret from environment
  // PLACEHOLDER: You must set this in your .env file
  const webhookSecret = process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error(`
╔══════════════════════════════════════════════════════════════════════════════╗
║  WEBHOOK ERROR: Missing STRIPE_SUBSCRIPTION_WEBHOOK_SECRET                   ║
║                                                                              ║
║  To handle subscription webhooks, set this environment variable.            ║
║  Get it from https://dashboard.stripe.com/webhooks or Stripe CLI.          ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }
  
  let event;
  
  try {
    // Verify and construct the event
    event = constructWebhookEvent(req.body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }
  
  console.log('Received subscription event:', event.type);
  
  try {
    // Route to appropriate handler
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;
        
      case 'invoice.paid':
        await handleInvoicePaid(event);
        break;
        
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event);
        break;
        
      case 'payment_method.attached':
        await handlePaymentMethodAttached(event);
        break;
        
      case 'payment_method.detached':
        await handlePaymentMethodDetached(event);
        break;
        
      case 'customer.updated':
        await handleCustomerUpdated(event);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    res.json({ received: true });
    
  } catch (err) {
    console.error('Error processing subscription webhook:', err);
    res.json({ received: true, error: err.message });
  }
});

/**
 * Handle customer.subscription.created event.
 * 
 * Fires when a new subscription is created.
 */
async function handleSubscriptionCreated(event) {
  const subscription = event.data.object;
  
  // For V2 accounts, use customer_account instead of customer
  // The shape is acct_... not cus_...
  const accountId = subscription.customer_account;
  
  console.log('=== Subscription Created ===');
  console.log('Account ID:', accountId);
  console.log('Subscription ID:', subscription.id);
  console.log('Status:', subscription.status);
  
  // Store in database
  await updateSubscriptionStatus(accountId, {
    id: subscription.id,
    status: subscription.status,
    priceId: subscription.items.data[0]?.price?.id,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
  
  // TODO: Grant access to premium features
  // await grantPremiumAccess(accountId);
  
  // TODO: Send welcome email
  // await sendSubscriptionWelcomeEmail(accountId);
}

/**
 * Handle customer.subscription.updated event.
 * 
 * Fires when a subscription is changed:
 * - Upgraded or downgraded to a different price
 * - Quantity changed
 * - Scheduled to cancel at period end
 * - Reactivated after scheduled cancellation
 * - Payment collection paused/resumed
 */
async function handleSubscriptionUpdated(event) {
  const subscription = event.data.object;
  const previousAttributes = event.data.previous_attributes;
  
  // For V2 accounts, use customer_account
  const accountId = subscription.customer_account;
  
  console.log('=== Subscription Updated ===');
  console.log('Account ID:', accountId);
  console.log('Subscription ID:', subscription.id);
  console.log('Previous attributes:', previousAttributes);
  
  // Check for plan changes (upgrades/downgrades)
  if (previousAttributes?.items) {
    const oldPriceId = previousAttributes.items.data?.[0]?.price?.id;
    const newPriceId = subscription.items.data[0]?.price?.id;
    
    if (oldPriceId !== newPriceId) {
      console.log(`Plan changed from ${oldPriceId} to ${newPriceId}`);
      // TODO: Update feature access based on new plan
      // await updatePlanAccess(accountId, newPriceId);
    }
  }
  
  // Check for quantity changes
  if (previousAttributes?.items?.data?.[0]?.quantity !== undefined) {
    const newQuantity = subscription.items.data[0]?.quantity;
    console.log(`Quantity changed to ${newQuantity}`);
    // TODO: Adjust access based on quantity
  }
  
  // Check for cancellation scheduling
  if (subscription.cancel_at_period_end && !previousAttributes?.cancel_at_period_end) {
    console.log('Subscription scheduled for cancellation at period end');
    // TODO: Send retention email, show cancellation notice
    // await sendRetentionEmail(accountId);
  }
  
  // Check for reactivation
  if (!subscription.cancel_at_period_end && previousAttributes?.cancel_at_period_end) {
    console.log('Subscription reactivated');
    // TODO: Welcome back email
  }
  
  // Check for paused collection
  if (subscription.pause_collection) {
    console.log('Collection paused:', subscription.pause_collection);
    const resumesAt = subscription.pause_collection.resumes_at;
    if (resumesAt) {
      console.log(`Will resume at: ${new Date(resumesAt * 1000)}`);
    }
    // TODO: Handle paused state
  } else if (previousAttributes?.pause_collection) {
    console.log('Collection resumed');
    // TODO: Handle resumed state
  }
  
  // Update database
  await updateSubscriptionStatus(accountId, {
    id: subscription.id,
    status: subscription.status,
    priceId: subscription.items.data[0]?.price?.id,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

/**
 * Handle customer.subscription.deleted event.
 * 
 * Fires when a subscription is fully canceled (not just scheduled).
 */
async function handleSubscriptionDeleted(event) {
  const subscription = event.data.object;
  
  // For V2 accounts, use customer_account
  const accountId = subscription.customer_account;
  
  console.log('=== Subscription Deleted ===');
  console.log('Account ID:', accountId);
  console.log('Subscription ID:', subscription.id);
  
  // Update database
  await updateSubscriptionStatus(accountId, {
    id: subscription.id,
    status: 'canceled',
    priceId: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  });
  
  // TODO: Revoke premium access
  // await revokePremiumAccess(accountId);
  
  // TODO: Send cancellation confirmation email
  // await sendCancellationEmail(accountId);
}

/**
 * Handle invoice.paid event.
 * 
 * Fires when an invoice is successfully paid.
 * Use this to confirm subscription renewals.
 */
async function handleInvoicePaid(event) {
  const invoice = event.data.object;
  
  console.log('=== Invoice Paid ===');
  console.log('Invoice ID:', invoice.id);
  console.log('Customer Account:', invoice.customer_account);
  console.log('Amount Paid:', invoice.amount_paid);
  console.log('Subscription:', invoice.subscription);
  
  // TODO: Send receipt email
  // TODO: Update billing records
}

/**
 * Handle invoice.payment_failed event.
 * 
 * Fires when an invoice payment fails.
 * This could be due to:
 * - Expired card
 * - Insufficient funds
 * - Card declined
 */
async function handleInvoicePaymentFailed(event) {
  const invoice = event.data.object;
  
  console.log('=== Invoice Payment Failed ===');
  console.log('Invoice ID:', invoice.id);
  console.log('Customer Account:', invoice.customer_account);
  console.log('Amount Due:', invoice.amount_due);
  console.log('Payment Intent:', invoice.payment_intent);
  
  // TODO: Send payment failed notification
  // TODO: Prompt user to update payment method
  // await sendPaymentFailedEmail(invoice.customer_account);
}

/**
 * Handle payment_method.attached event.
 * 
 * Fires when a customer adds a payment method.
 */
async function handlePaymentMethodAttached(event) {
  const paymentMethod = event.data.object;
  
  console.log('=== Payment Method Attached ===');
  console.log('Payment Method ID:', paymentMethod.id);
  console.log('Type:', paymentMethod.type);
  console.log('Customer:', paymentMethod.customer);
  
  // TODO: Update local records if needed
}

/**
 * Handle payment_method.detached event.
 * 
 * Fires when a customer removes a payment method.
 */
async function handlePaymentMethodDetached(event) {
  const paymentMethod = event.data.object;
  
  console.log('=== Payment Method Detached ===');
  console.log('Payment Method ID:', paymentMethod.id);
  
  // TODO: Update local records if needed
}

/**
 * Handle customer.updated event.
 * 
 * Fires when customer data changes.
 * IMPORTANT: Only treat this as billing information changes.
 * Do NOT use the email as a login credential.
 */
async function handleCustomerUpdated(event) {
  const customer = event.data.object;
  const previousAttributes = event.data.previous_attributes;
  
  console.log('=== Customer Updated ===');
  console.log('Customer:', customer.id);
  
  // Check for default payment method change
  if (previousAttributes?.invoice_settings?.default_payment_method !== undefined) {
    const newDefault = customer.invoice_settings?.default_payment_method;
    console.log('Default payment method changed to:', newDefault);
    // TODO: Update local records
  }
  
  // TODO: Sync any relevant billing info changes
  // Do NOT use email for authentication
}

export default router;
