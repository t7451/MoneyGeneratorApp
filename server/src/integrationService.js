import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { config } from './config.js';
import { EventStatus, Models } from './models.js';
import { httpClient } from './httpClient.js';
import { MetricsService } from './metrics.js';

const {
  PAYPAL_WEBHOOK_SECRET = 'demo-paypal-secret',
  PLAID_WEBHOOK_SECRET = 'demo-plaid-secret',
  PAYPAL_API_BASE = 'https://api-m.sandbox.paypal.com',
  PLAID_API_BASE = 'https://sandbox.plaid.com',
  CRM_WEBHOOK_URL = 'https://crm.example.com/webhooks',
  ENABLE_PROVIDER_HTTP = 'false',
} = process.env;

const STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  CANCELED: 'canceled',
};

function signPayload(secret, body) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

function verifySignature(secret, body, signature) {
  const expected = signPayload(secret, body);
  const normalizedBody = safeNormalize(body);
  const normalizedExpected = normalizedBody ? signPayload(secret, normalizedBody) : expected;
  const provided = signature || '';
  const matches = compare(expected, provided) || compare(normalizedExpected, provided);
  return matches;
}

function verifySignatureWithTimestamp(secret, body, signature, timestamp, toleranceMs) {
  if (!timestamp) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const now = Date.now();
  if (Math.abs(now - ts) > toleranceMs) return false;
  const expected = signPayload(secret, `${timestamp}.${body}`);
  const normalizedBody = safeNormalize(body);
  const normalizedExpected = normalizedBody
    ? signPayload(secret, `${timestamp}.${normalizedBody}`)
    : expected;
  const provided = signature || '';
  return compare(expected, provided) || compare(normalizedExpected, provided);
}

function compare(expected, provided) {
  if (!expected || expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

function safeNormalize(body) {
  try {
    const parsed = JSON.parse(body);
    return JSON.stringify(parsed);
  } catch {
    return null;
  }
}

function recordEvent(id, provider, body, correlationId) {
  if (Models.webhookEvents.has(id)) {
    return { status: EventStatus.DUPLICATE, event: Models.webhookEvents.get(id) };
  }
  const event = {
    id,
    provider,
    body,
    correlationId,
    createdAt: new Date().toISOString(),
    status: EventStatus.PROCESSED,
  };
  Models.webhookEvents.set(id, event);
  return { status: EventStatus.PROCESSED, event };
}

function emitInternalEvent(type, payload, log) {
  Models.metrics.increment(`event.${type}`);
  log?.info('internal_event', { type, payload });
}

function enqueueOutboundWebhook(event) {
  const targetUrl = event.targetUrl || CRM_WEBHOOK_URL;
  const serialized = JSON.stringify(event.payload);
  const timestamp = Date.now();
  const signature = signPayload(config.secrets.crmWebhook, `${timestamp}.${serialized}`);
  Models.outboundWebhookQueue.push({
    ...event,
    attempts: 0,
    status: 'queued',
    targetUrl,
    correlationId: event.correlationId,
  });
}

async function callProvider({ url, method = 'POST', headers = {}, body, log, tag, retryOnStatuses }) {
  if (ENABLE_PROVIDER_HTTP !== 'true') {
    log?.info('provider_http_skipped', { tag, url });
    return new Response(JSON.stringify({ skipped: true }), { status: 200 });
  }
  return httpClient.request({
    url,
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    retryOnStatuses,
    log,
    tag,
  });
}

async function sendPayPalRequest(path, { body, idempotencyKey, log }) {
  const url = `${PAYPAL_API_BASE}${path}`;
  const headers = {
    'content-type': 'application/json',
  };
  if (idempotencyKey) {
    headers['PayPal-Request-Id'] = idempotencyKey;
  }
  return callProvider({
    url,
    method: 'POST',
    headers,
    body,
    log,
    tag: 'paypal_api',
  });
}

async function sendPlaidRequest(path, { body, log }) {
  const url = `${PLAID_API_BASE}${path}`;
  return callProvider({
    url,
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body,
    log,
    tag: 'plaid_api',
  });
}

async function dispatchOutboundWebhooks(log) {
  const queue = Models.outboundWebhookQueue;
  for (const job of queue) {
    if (job.status === 'delivered') continue;
    if (job.status === 'failed' && !job.retryAt) continue;
    if (job.retryAt && job.retryAt > Date.now()) continue;
    try {
      const payloadBody = JSON.stringify(job.payload);
      const valid = verifySignatureWithTimestamp(
        config.secrets.crmWebhook,
        payloadBody,
        job.signature,
        job.timestamp,
        config.security.webhookReplayWindowMs,
      );
      if (!valid) {
        throw new Error('invalid_outbound_signature');
      }
      job.attempts += 1;
      const response = await httpClient.request({
        url: job.targetUrl,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-correlation-id': job.correlationId,
        },
        body: JSON.stringify(job.payload),
        retryOnStatuses: status => status >= 500 || status === 408 || status === 429,
        log,
        tag: 'outbound_webhook',
      });

      if (!response.ok) {
        const error = new Error(`non_retryable_status_${response.status}`);
        job.status = 'failed';
        job.error = error.message;
        emitInternalEvent('outbound_webhook.failed', { id: job.id, status: response.status }, log);
        continue;
      }

      job.status = 'delivered';
      job.deliveredAt = new Date().toISOString();
      emitInternalEvent('outbound_webhook.delivered', { id: job.id }, log);
    } catch (e) {
      job.status = 'failed';
      job.error = e.message;
      if (job.attempts < 5) {
        const delay = Math.min(30000, 1000 * 2 ** job.attempts);
        job.retryAt = Date.now() + delay;
        emitInternalEvent('outbound_webhook.retry_scheduled', { id: job.id, delay }, log);
      }
    }
  }
}

export const IntegrationService = {
  createSubscription: ({ userId, planId, correlationId, source = 'api' }) => {
    const subId = uuid();
    Models.subscriptions.set(subId, {
      id: subId,
      userId,
      planId,
      status: 'active',
    });
    Models.entitlements.set(subId, { id: subId, userId, planId, active: true });
    MetricsService.emitEvent({
      eventType: 'subscription.created',
      userId,
      ts: new Date(),
      correlationId,
      source,
      properties: { planId },
    });
    return { id: subId, status: 'active' };
  },

  createEntitlement: ({ userId, productId, kind, durationDays = 30 }) => {
    const id = uuid();
    const effectiveAt = new Date();
    const expiresAt =
      kind === 'one_time' ? null : new Date(effectiveAt.getTime() + durationDays * 86400000);
    const record = {
      id,
      userId,
      productId,
      kind,
      effectiveAt: effectiveAt.toISOString(),
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      createdAt: new Date().toISOString(),
    };
    Models.entitlements.set(id, record);
    Models.auditLog.push({ type: 'entitlement_created', record });
    Models.metrics.increment('entitlements.created');
    return record;
  },

  createPayPalSubscription: ({ userId, planId, correlationId, log, source = 'billing' }) => {
    const providerSubscriptionId = `paypal-${uuid()}`;
    const approvalUrl = `https://paypal.example/approve/${providerSubscriptionId}`;
    const sub = {
      id: uuid(),
      provider: 'paypal',
      providerSubscriptionId,
      status: STATUS.PENDING,
      planId,
      startedAt: null,
      canceledAt: null,
      currentPeriodEnd: null,
      userId,
    };
    const idempotencyKey = uuid();
    sendPayPalRequest('/v1/billing/subscriptions', {
      body: { plan_id: planId, custom_id: userId },
      idempotencyKey,
      log,
    }).catch(err => {
      log?.warn('paypal_create_subscription_failed', { error: err.message });
    });
    Models.subscriptions.set(sub.id, sub);
    Models.auditLog.push({ type: 'subscription_created', sub, idempotencyKey });
    Models.subscriptionEvents.set(providerSubscriptionId, sub.id);
    
    MetricsService.emitEvent({
      eventType: 'subscription.initiated',
      userId,
      ts: new Date(),
      correlationId,
      source,
      properties: { planId, providerSubscriptionId },
    });
    
    return { approvalUrl, subscriptionId: sub.id, providerSubscriptionId, idempotencyKey };
  },

  confirmPayPalSubscription: ({ providerSubscriptionId, userId, correlationId, log }) => {
    MetricsService.emitEvent({
      eventType: 'subscription.initiated',
      userId,
      ts: new Date(),
      correlationId,
      source,
      properties: { planId, providerSubscriptionId },
    });
    return { approvalUrl, subscriptionId: sub.id, providerSubscriptionId };
  },

  confirmPayPalSubscription: ({ providerSubscriptionId, userId, correlationId, source = 'billing' }) => {
    const id = Models.subscriptionEvents.get(providerSubscriptionId);
    if (!id) throw new Error('unknown_subscription');
    const sub = Models.subscriptions.get(id);
    if (sub.status === STATUS.CANCELED) throw new Error('invalid_transition');
    sub.status = STATUS.ACTIVE;
    sub.startedAt = new Date().toISOString();
    sub.currentPeriodEnd = new Date(Date.now() + 30 * 86400000).toISOString();
    Models.auditLog.push({ type: 'subscription_activated', sub });
    enqueueOutboundWebhook(
      {
        id: uuid(),
        type: 'subscription.updated',
        payload: { subscriptionId: id, status: sub.status, provider: 'paypal', userId },
      },
      correlationId,
    );
    sendPayPalRequest(`/v1/billing/subscriptions/${providerSubscriptionId}/activate`, {
      body: { reason: 'user_confirmed' },
      log,
    }).catch(err => log?.warn('paypal_confirm_subscription_failed', { error: err.message }));
    return sub;
  },

  cancelPayPalSubscription: ({ providerSubscriptionId, correlationId, log }) => {
    enqueueOutboundWebhook({
      id: uuid(),
      type: 'subscription.updated',
      payload: { subscriptionId: id, status: sub.status, provider: 'paypal', userId },
    });
    MetricsService.emitEvent({
      eventType: 'subscription.activated',
      userId,
      ts: new Date(),
      correlationId,
      source,
      properties: { providerSubscriptionId, subscriptionId: id },
    });
    return sub;
  },

  cancelPayPalSubscription: ({ providerSubscriptionId, correlationId, source = 'billing' }) => {
    const id = Models.subscriptionEvents.get(providerSubscriptionId);
    if (!id) throw new Error('unknown_subscription');
    const sub = Models.subscriptions.get(id);
    if (sub.status === STATUS.CANCELED) return sub;
    sub.status = STATUS.CANCELED;
    sub.canceledAt = new Date().toISOString();
    Models.auditLog.push({ type: 'subscription_canceled', sub });
    enqueueOutboundWebhook(
      {
        id: uuid(),
        type: 'subscription.updated',
        payload: { subscriptionId: id, status: sub.status, provider: 'paypal', userId: sub.userId },
      },
      correlationId,
    );
    sendPayPalRequest(`/v1/billing/subscriptions/${providerSubscriptionId}/cancel`, {
      body: { reason: 'user_requested' },
      log,
    }).catch(err => log?.warn('paypal_cancel_subscription_failed', { error: err.message }));
    enqueueOutboundWebhook({
      id: uuid(),
      type: 'subscription.updated',
      payload: { subscriptionId: id, status: sub.status, provider: 'paypal', userId: sub.userId },
    });
    MetricsService.emitEvent({
      eventType: 'subscription.canceled',
      userId: sub.userId,
      ts: new Date(),
      correlationId,
      source,
      properties: { providerSubscriptionId, subscriptionId: id },
    });
    return sub;
  },

  verifyAndProcessPayPalWebhook: (rawBody, signature, timestamp, log, correlationId) => {
    if (
      !verifySignatureWithTimestamp(
        config.secrets.paypalWebhook,
        rawBody,
        signature,
        timestamp,
        config.security.webhookReplayWindowMs,
      )
    ) {
      throw new Error('invalid_signature');
    }
    const payload = JSON.parse(rawBody);
    const eventId = payload.id || payload.event_id || uuid();
    const result = recordEvent(eventId, 'paypal', payload, correlationId);
    if (result.status === EventStatus.DUPLICATE) return result;

    // Simulated state handling
    if (payload.resource?.status === 'ACTIVE') {
      IntegrationService.confirmPayPalSubscription({
        providerSubscriptionId: payload.resource.id,
        userId: payload.resource.custom_id || 'demo-user',
        correlationId,
        log,
        source: 'paypal_webhook',
      });
    }
    emitInternalEvent('paypal.webhook', { id: eventId, type: payload.event_type }, log);
    enqueueOutboundWebhook(
      {
        id: uuid(),
        type: 'subscription.updated',
        payload: {
          eventId,
          provider: 'paypal',
          status: payload.resource?.status,
          providerSubscriptionId: payload.resource?.id,
        },
      },
      correlationId,
    );
    });
    MetricsService.emitEvent({
      eventType: 'webhook.paypal.processed',
      userId: payload.resource?.custom_id || 'demo-user',
      ts: new Date(),
      correlationId,
      source: 'paypal_webhook',
      properties: { eventType: payload.event_type, providerSubscriptionId: payload.resource?.id },
    });
    return result;
  },

  verifyAndProcessPlaidWebhook: (rawBody, signature, timestamp, log, correlationId) => {
    if (
      !verifySignatureWithTimestamp(
        config.secrets.plaidWebhook,
        rawBody,
        signature,
        timestamp,
        config.security.webhookReplayWindowMs,
      )
    ) {
      throw new Error('invalid_signature');
    }
    const payload = JSON.parse(rawBody);
    const eventId = payload.webhook_code ? `${payload.webhook_code}-${payload.item_id}` : uuid();
    const result = recordEvent(eventId, 'plaid', payload, correlationId);
    if (result.status === EventStatus.DUPLICATE) return result;

    emitInternalEvent('plaid.webhook', { code: payload.webhook_code, itemId: payload.item_id }, log);
    if (payload.webhook_code === 'SYNC_UPDATES_AVAILABLE') {
      MetricsService.emitEvent({
        eventType: 'plaid.sync.completed',
        userId: payload.user_id || 'demo-user',
        ts: new Date(),
        correlationId,
        source: 'plaid_webhook',
        properties: { itemId: payload.item_id },
      });
    }
    return result;
  },

  getMetrics: () => Models.metrics.counters,
  dispatchOutboundWebhooks,
};

