export const Models = {
  users: new Map(),
  subscriptions: new Map(),
  subscriptionEvents: new Map(),
  entitlements: new Map(),
  auditLog: [],
  plaidItems: new Map(),
  plaidAccounts: new Map(),
  plaidTransactions: new Map(),
  webhookEvents: new Map(),
  outboundWebhookQueue: [],
  savedJobs: new Map(),
  jobAlerts: new Map(),
  incidents: [],
  operatorAnnotations: [],
  replayOutcomes: [],
  backgroundJobs: new Map(),
  assetObjects: new Map(),
  metricsEvents: new Map(),
  userMetricsDaily: new Map(),
  settings: {
    analyticsEnabled: process.env.ANALYTICS_ENABLED !== 'false',
  },
  metrics: {
    counters: {},
    increment(name) {
      this.counters[name] = (this.counters[name] || 0) + 1;
    },
  },
};

export const EventStatus = {
  PROCESSED: 'processed',
  DUPLICATE: 'duplicate',
};
