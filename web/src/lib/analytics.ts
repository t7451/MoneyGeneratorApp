import { apiFetchJson, getUserId } from './apiClient';

type EventProperties = Record<string, string | number | boolean | null | undefined>;

const EVENT_QUEUE: Array<{ event: string; properties: EventProperties; timestamp: string }> = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 5000;
const BATCH_SIZE = 20;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, FLUSH_INTERVAL);
}

async function flush() {
  flushTimer = null;
  if (EVENT_QUEUE.length === 0) return;

  const batch = EVENT_QUEUE.splice(0, BATCH_SIZE);
  const userId = getUserId();

  try {
    await apiFetchJson('/api/v2/analytics/events', {
      method: 'POST',
      body: { userId, events: batch },
    });
  } catch {
    // Re-queue failed events (drop if queue is too large)
    if (EVENT_QUEUE.length < 100) {
      EVENT_QUEUE.push(...batch);
    }
  }

  if (EVENT_QUEUE.length > 0) {
    scheduleFlush();
  }
}

export function trackEvent(event: string, properties: EventProperties = {}) {
  EVENT_QUEUE.push({
    event,
    properties: {
      ...properties,
      url: window.location.pathname,
      referrer: document.referrer || undefined,
    },
    timestamp: new Date().toISOString(),
  });
  scheduleFlush();
}

export function trackPageView(path?: string) {
  trackEvent('page_view', { path: path || window.location.pathname });
}

// Predefined funnel events
export const FunnelEvents = {
  SIGNUP_STARTED: 'signup_started',
  SIGNUP_COMPLETED: 'signup_completed',
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP: 'onboarding_step_viewed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  PLAN_VIEWED: 'plan_viewed',
  PLAN_SELECTED: 'plan_selected',
  CHECKOUT_STARTED: 'checkout_started',
  CHECKOUT_COMPLETED: 'checkout_completed',
  CHECKOUT_ABANDONED: 'checkout_abandoned',
  BANK_CONNECT_STARTED: 'bank_connect_started',
  BANK_CONNECT_SUCCESS: 'bank_connect_success',
  BANK_CONNECT_FAILED: 'bank_connect_failed',
  PLAID_LINK_OPENED: 'plaid_link_opened',
  PLAID_LINK_SUCCESS: 'plaid_link_success',
  FEATURE_USED: 'feature_used',
  EXPORT_CLICKED: 'export_clicked',
  DASHBOARD_VIEWED: 'dashboard_viewed',
} as const;
