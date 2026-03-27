import express from 'express';
import { z } from 'zod';
import { GigPlatformService } from '../services/gigPlatforms.js';
import { CashAdvanceService } from '../services/cashAdvances.js';
import { BenefitsService } from '../services/benefits.js';
import { ExpenseService } from '../services/expenses.js';
import { NotificationService } from '../services/notifications.js';
import { UserProfileService } from '../services/userProfile.js';
import { RouteOptimizationService } from '../services/routeOptimization.js';
import { FraudDetectionService } from '../services/fraudDetection.js';
import { ApiGatewayService } from '../services/apiGateway.js';
import { AutomationService } from '../services/automations.js';
import { AnalyticsService } from '../services/analytics.js';
import { ComplianceService } from '../services/compliance.js';
import { MarketplaceService } from '../services/marketplace.js';
import { CreditsService } from '../services/credits.js';
import { validate, validateQuery } from '../validation.js';
import { cacheMiddleware, cacheUtils } from '../cache.js';
import { MetricsService } from '../metrics.js';

const router = express.Router();

// Validation schemas
const schemas = {
  connectPlatform: z.object({
    userId: z.string().min(1),
    platform: z.string().min(1),
    credentials: z.record(z.any()).optional(),
  }),
  recordShift: z.object({
    userId: z.string().min(1),
    platform: z.string().min(1),
    startTime: z.string(),
    endTime: z.string().optional(),
    earnings: z.number().optional(),
    mileage: z.number().optional(),
    expenses: z.number().optional(),
  }),
  recordEarnings: z.object({
    userId: z.string().min(1),
    platform: z.string().min(1),
    amount: z.number().positive(),
    shiftId: z.string().optional(),
  }),
  requestAdvance: z.object({
    userId: z.string().min(1),
    amount: z.number().positive(),
    deliveryMethod: z.enum(['standard', 'instant']).optional(),
    destination: z.string().optional(),
  }),
  allocateEarnings: z.object({
    userId: z.string().min(1),
    earningsAmount: z.number().positive(),
    source: z.string().optional(),
  }),
  bucketWithdraw: z.object({
    bucketId: z.string().min(1),
    userId: z.string().min(1),
    amount: z.number().positive(),
    reason: z.string().optional(),
  }),
  recordExpense: z.object({
    userId: z.string().min(1),
    amount: z.number().positive(),
    categoryId: z.string().min(1),
    description: z.string().optional(),
    date: z.string().optional(),
    receiptUrl: z.string().optional(),
  }),
  recordMileage: z.object({
    userId: z.string().min(1),
    miles: z.number().positive(),
    date: z.string().optional(),
    purpose: z.string().optional(),
    startLocation: z.string().optional(),
    endLocation: z.string().optional(),
    roundTrip: z.boolean().optional(),
  }),
  upsertProfile: z.object({
    userId: z.string().min(1),
    displayName: z.string().optional(),
    email: z.string().email().optional(),
    timezone: z.string().optional(),
    workMode: z.string().optional(),
    workAreas: z.array(z.string()).optional(),
  }),
  createGoal: z.object({
    userId: z.string().min(1),
    type: z.string().min(1),
    target: z.number().positive(),
    period: z.string().optional(),
  }),
};

// ==================== GIG PLATFORMS ====================

// Get supported platforms
router.get('/platforms', cacheMiddleware(3600), (req, res) => {
  res.json(GigPlatformService.getSupportedPlatforms());
});

// Connect a platform
router.post('/platforms/connect', validate(schemas.connectPlatform), (req, res) => {
  const result = GigPlatformService.connectPlatform({
    ...req.body,
    correlationId: req.correlationId,
  });
  req.log.info('platform_connected', { platform: req.body.platform });
  res.json(result);
});

// Get connected platforms
router.get('/platforms/connected', (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const platforms = GigPlatformService.getConnectedPlatforms(userId);
  res.json({ platforms });
});

// Disconnect a platform
router.post('/platforms/disconnect', (req, res) => {
  const { connectionId, userId } = req.body;
  const result = GigPlatformService.disconnectPlatform({ connectionId, userId });
  res.json(result);
});

// Get aggregated jobs
router.get('/jobs', (req, res) => {
  const { userId = 'demo-user', category, limit, offset } = req.query;
  const result = GigPlatformService.fetchAggregatedJobs({
    userId,
    category,
    limit: parseInt(limit) || 20,
    offset: parseInt(offset) || 0,
  });
  res.json(result);
});

// ==================== SHIFTS & EARNINGS ====================

// Record a shift
router.post('/shifts', validate(schemas.recordShift), (req, res) => {
  const shift = GigPlatformService.recordShift(req.body);
  req.log.info('shift_recorded', { shiftId: shift.id });
  
  // Auto-allocate earnings to benefits buckets if configured
  if (shift.earnings && shift.earnings > 0) {
    try {
      BenefitsService.allocateEarnings({
        userId: req.body.userId,
        earningsAmount: shift.earnings,
        source: 'shift_earnings',
      });
    } catch (e) {
      req.log.warn('auto_allocation_failed', { error: e.message });
    }
  }
  
  res.json(shift);
});

// Get shift analytics
router.get('/shifts/analytics', (req, res) => {
  const { userId = 'demo-user', startDate, endDate } = req.query;
  const analytics = GigPlatformService.getShiftAnalytics({ userId, startDate, endDate });
  res.json(analytics);
});

// Record earnings
router.post('/earnings', validate(schemas.recordEarnings), (req, res) => {
  const earning = GigPlatformService.recordEarnings(req.body);
  res.json(earning);
});

// Get earnings summary
router.get('/earnings/summary', (req, res) => {
  const { userId = 'demo-user', startDate, endDate, groupBy } = req.query;
  const summary = GigPlatformService.getEarningsSummary({ userId, startDate, endDate, groupBy });
  res.json(summary);
});

// ==================== CASH ADVANCES ====================

// Get advance terms
router.get('/advances/terms', cacheMiddleware(3600), (req, res) => {
  res.json(CashAdvanceService.getTerms());
});

// Check eligibility
router.get('/advances/eligibility', (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const eligibility = CashAdvanceService.checkEligibility({ userId });
  res.json(eligibility);
});

// Request advance
router.post('/advances/request', validate(schemas.requestAdvance), (req, res) => {
  try {
    const advance = CashAdvanceService.requestAdvance(req.body);
    req.log.info('advance_requested', { advanceId: advance.id, amount: advance.amount });
    
    // Simulate processing for instant delivery
    if (req.body.deliveryMethod === 'instant') {
      setTimeout(() => {
        try {
          CashAdvanceService.processAdvance({ advanceId: advance.id });
        } catch (e) {
          console.warn('advance_process_failed', e.message);
        }
      }, 5000);
    }
    
    res.json(advance);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get advance history
router.get('/advances/history', (req, res) => {
  const { userId = 'demo-user', status, limit } = req.query;
  const history = CashAdvanceService.getAdvanceHistory({
    userId,
    status,
    limit: parseInt(limit) || 20,
  });
  res.json(history);
});

// ==================== BENEFITS & TAX ====================

// Initialize benefits buckets
router.post('/benefits/initialize', (req, res) => {
  const { userId = 'demo-user', allocations } = req.body;
  const result = BenefitsService.initializeBuckets({ userId, allocations });
  res.json(result);
});

// Get benefits buckets
router.get('/benefits/buckets', (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const buckets = BenefitsService.getBuckets({ userId });
  res.json(buckets);
});

// Update bucket allocation
router.put('/benefits/buckets/:bucketId/allocation', (req, res) => {
  const { bucketId } = req.params;
  const { userId, allocationPercent } = req.body;
  try {
    const bucket = BenefitsService.updateAllocation({ bucketId, userId, allocationPercent });
    res.json(bucket);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Allocate earnings to buckets
router.post('/benefits/allocate', validate(schemas.allocateEarnings), (req, res) => {
  const result = BenefitsService.allocateEarnings(req.body);
  res.json(result);
});

// Withdraw from bucket
router.post('/benefits/withdraw', validate(schemas.bucketWithdraw), (req, res) => {
  try {
    const result = BenefitsService.withdraw(req.body);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get benefits summary
router.get('/benefits/summary', (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const summary = BenefitsService.getSummary({ userId });
  res.json(summary);
});

// Calculate estimated tax
router.get('/benefits/tax-estimate', (req, res) => {
  const { userId = 'demo-user', annualIncome } = req.query;
  const estimate = BenefitsService.calculateEstimatedTax({
    userId,
    annualIncome: annualIncome != null ? parseFloat(annualIncome) : 50000,
  });
  res.json(estimate);
});

// ==================== EXPENSES ====================

// Get expense categories
router.get('/expenses/categories', cacheMiddleware(3600), (req, res) => {
  res.json({ categories: ExpenseService.getCategories() });
});

// Get mileage rate
router.get('/expenses/mileage-rate', cacheMiddleware(86400), (req, res) => {
  res.json(ExpenseService.getMileageRate());
});

// Record expense
router.post('/expenses', validate(schemas.recordExpense), (req, res) => {
  const expense = ExpenseService.recordExpense(req.body);
  res.json(expense);
});

// Record mileage
router.post('/expenses/mileage', validate(schemas.recordMileage), (req, res) => {
  const record = ExpenseService.recordMileage(req.body);
  res.json(record);
});

// Get expenses
router.get('/expenses', (req, res) => {
  const { userId = 'demo-user', startDate, endDate, categoryId, limit, offset } = req.query;
  const expenses = ExpenseService.getExpenses({
    userId,
    startDate,
    endDate,
    categoryId,
    limit: parseInt(limit) || 50,
    offset: parseInt(offset) || 0,
  });
  res.json(expenses);
});

// Get mileage records
router.get('/expenses/mileage', (req, res) => {
  const { userId = 'demo-user', startDate, endDate, limit } = req.query;
  const records = ExpenseService.getMileageRecords({
    userId,
    startDate,
    endDate,
    limit: parseInt(limit) || 50,
  });
  res.json(records);
});

// Get expense summary
router.get('/expenses/summary', (req, res) => {
  const { userId = 'demo-user', startDate, endDate, groupBy } = req.query;
  const summary = ExpenseService.getExpenseSummary({ userId, startDate, endDate, groupBy });
  res.json(summary);
});

// Export expenses
router.get('/expenses/export', (req, res) => {
  const { userId = 'demo-user', year } = req.query;
  const exportData = ExpenseService.exportExpenses({
    userId,
    year: parseInt(year) || new Date().getFullYear(),
  });
  res.json(exportData);
});

// Delete expense
router.delete('/expenses/:expenseId', (req, res) => {
  const { expenseId } = req.params;
  const userId = req.query.userId || 'demo-user';
  try {
    const result = ExpenseService.deleteExpense({ expenseId, userId });
    res.json(result);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// ==================== NOTIFICATIONS ====================

// Get notifications
router.get('/notifications', (req, res) => {
  const { userId = 'demo-user', unreadOnly, limit, offset } = req.query;
  const notifications = NotificationService.getNotifications({
    userId,
    unreadOnly: unreadOnly === 'true',
    limit: parseInt(limit) || 50,
    offset: parseInt(offset) || 0,
  });
  res.json(notifications);
});

// Get notification types
router.get('/notifications/types', cacheMiddleware(3600), (req, res) => {
  res.json({ types: NotificationService.getNotificationTypes() });
});

// Get notification preferences
router.get('/notifications/preferences', (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const preferences = NotificationService.getPreferences({ userId });
  res.json({ preferences });
});

// Update notification preferences
router.put('/notifications/preferences', (req, res) => {
  const { userId = 'demo-user', preferences } = req.body;
  const updated = NotificationService.updatePreferences({ userId, preferences });
  res.json({ preferences: updated });
});

// Mark notification as read
router.post('/notifications/:notificationId/read', (req, res) => {
  const { notificationId } = req.params;
  const userId = req.query.userId || req.body.userId || 'demo-user';
  try {
    const notification = NotificationService.markAsRead({ notificationId, userId });
    res.json(notification);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// Mark all notifications as read
router.post('/notifications/read-all', (req, res) => {
  const userId = req.body.userId || 'demo-user';
  const result = NotificationService.markAllAsRead({ userId });
  res.json(result);
});

// Dismiss notification
router.post('/notifications/:notificationId/dismiss', (req, res) => {
  const { notificationId } = req.params;
  const userId = req.query.userId || req.body.userId || 'demo-user';
  try {
    const result = NotificationService.dismiss({ notificationId, userId });
    res.json(result);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// Register push subscription
router.post('/notifications/push/subscribe', (req, res) => {
  const { userId, subscription, platform } = req.body;
  const result = NotificationService.registerPushSubscription({ userId, subscription, platform });
  res.json(result);
});

// ==================== USER PROFILE ====================

// Get work modes
router.get('/profile/work-modes', cacheMiddleware(3600), (req, res) => {
  res.json({ workModes: UserProfileService.getWorkModes() });
});

// Get goal types
router.get('/profile/goal-types', cacheMiddleware(3600), (req, res) => {
  res.json({ goalTypes: UserProfileService.getGoalTypes() });
});

// Get user profile
router.get('/profile', (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const profile = UserProfileService.getProfile({ userId });
  res.json({ profile });
});

// Update user profile
router.put('/profile', validate(schemas.upsertProfile), (req, res) => {
  const profile = UserProfileService.upsertProfile({ userId: req.body.userId, data: req.body });
  res.json({ profile });
});

// Get user settings
router.get('/profile/settings', (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const settings = UserProfileService.getSettings({ userId });
  res.json({ settings });
});

// Update user settings
router.put('/profile/settings', (req, res) => {
  const { userId = 'demo-user', ...settings } = req.body;
  const updated = UserProfileService.updateSettings({ userId, settings });
  res.json({ settings: updated });
});

// Set work mode
router.post('/profile/work-mode', (req, res) => {
  const { userId, workMode } = req.body;
  try {
    const profile = UserProfileService.setWorkMode({ userId, workMode });
    res.json({ profile });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get user goals
router.get('/profile/goals', (req, res) => {
  const { userId = 'demo-user', status } = req.query;
  const goals = UserProfileService.getGoals({ userId, status });
  res.json({ goals });
});

// Create goal
router.post('/profile/goals', validate(schemas.createGoal), (req, res) => {
  const goal = UserProfileService.createGoal(req.body);
  res.json({ goal });
});

// Update goal progress
router.put('/profile/goals/:goalId/progress', (req, res) => {
  const { goalId } = req.params;
  const { userId, progress } = req.body;
  try {
    const goal = UserProfileService.updateGoalProgress({ goalId, userId, progress });
    res.json({ goal });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Delete goal
router.delete('/profile/goals/:goalId', (req, res) => {
  const { goalId } = req.params;
  const userId = req.query.userId || 'demo-user';
  try {
    const result = UserProfileService.deleteGoal({ goalId, userId });
    res.json(result);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// Get dashboard
router.get('/dashboard', (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const dashboard = UserProfileService.getDashboard({ userId });
  MetricsService.emitEvent({
    eventType: 'dashboard.viewed',
    userId,
    correlationId: req.correlationId,
    source: 'app',
  });
  res.json(dashboard);
});

// ==================== ROUTE OPTIMIZATION ====================

// Record surge zone
router.post('/routes/surge-zones', (req, res) => {
  const zone = RouteOptimizationService.recordSurgeZone(req.body);
  res.json(zone);
});

// Get active surge zones
router.get('/routes/surge-zones', (req, res) => {
  const zones = RouteOptimizationService.getActiveSurgeZones(req.query);
  res.json(zones);
});

// Optimize route
router.post('/routes/optimize', (req, res) => {
  const { locations, startLocation, returnToStart } = req.body;
  const route = RouteOptimizationService.optimizeRoute({ locations, startLocation, returnToStart });
  res.json(route);
});

// Get earnings heatmap
router.get('/routes/heatmap', (req, res) => {
  const { userId = 'demo-user', bounds, resolution } = req.query;
  const heatmap = RouteOptimizationService.getEarningsHeatmap({ userId, bounds, resolution });
  res.json(heatmap);
});

// Get best work times
router.get('/routes/best-times', (req, res) => {
  const { userId = 'demo-user' } = req.query;
  const times = RouteOptimizationService.suggestBestTimes({ userId });
  res.json(times);
});

// Record location
router.post('/routes/location', (req, res) => {
  const { userId, latitude, longitude, accuracy } = req.body;
  const location = RouteOptimizationService.recordLocation({ userId, latitude, longitude, accuracy });
  res.json(location);
});

// Batch deliveries
router.post('/routes/batch-deliveries', (req, res) => {
  const { deliveries, maxPerBatch } = req.body;
  const batches = RouteOptimizationService.batchDeliveries({ deliveries, maxPerBatch });
  res.json(batches);
});

// ==================== FRAUD DETECTION ====================

// Assess risk
router.post('/fraud/assess', (req, res) => {
  const assessment = FraudDetectionService.assessRisk(req.body);
  res.json(assessment);
});

// Register device
router.post('/fraud/device', (req, res) => {
  const { userId, fingerprint, metadata } = req.body;
  const result = FraudDetectionService.registerDevice({ userId, fingerprint, metadata });
  res.json(result);
});

// Generate device fingerprint
router.post('/fraud/fingerprint', (req, res) => {
  const fingerprint = FraudDetectionService.generateFingerprint(req.body);
  res.json({ fingerprint });
});

// Get user risk profile
router.get('/fraud/profile', (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const profile = FraudDetectionService.getUserRiskProfile({ userId });
  res.json(profile);
});

// Get fraud alerts (admin)
router.get('/fraud/alerts', (req, res) => {
  const { status, severity, userId, limit } = req.query;
  const alerts = FraudDetectionService.getAlerts({ status, severity, userId, limit: parseInt(limit) || 50 });
  res.json(alerts);
});

// Resolve fraud alert
router.post('/fraud/alerts/:alertId/resolve', (req, res) => {
  const { alertId } = req.params;
  const { resolvedBy, resolution } = req.body;
  try {
    const alert = FraudDetectionService.resolveAlert({ alertId, resolvedBy, resolution });
    res.json(alert);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// Block entity
router.post('/fraud/block', (req, res) => {
  const block = FraudDetectionService.blockEntity(req.body);
  res.json(block);
});

// Unblock entity
router.post('/fraud/unblock', (req, res) => {
  try {
    const result = FraudDetectionService.unblockEntity(req.body);
    res.json(result);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// ==================== API GATEWAY ====================

// Generate API key
router.post('/api-keys', (req, res) => {
  const { userId, tier, name, expiresIn } = req.body;
  const key = ApiGatewayService.generateApiKey({ userId, tier, name, expiresIn });
  res.json(key);
});

// List user's API keys
router.get('/api-keys', (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const keys = ApiGatewayService.listApiKeys({ userId });
  res.json(keys);
});

// Revoke API key
router.delete('/api-keys/:keyId', (req, res) => {
  const { keyId } = req.params;
  const userId = req.query.userId || 'demo-user';
  try {
    const result = ApiGatewayService.revokeApiKey({ keyId, userId });
    res.json(result);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// Get available tiers
router.get('/tiers', cacheMiddleware(3600), (req, res) => {
  const tiers = ApiGatewayService.getTiers();
  res.json({ tiers });
});

// Upgrade tier
router.post('/tiers/upgrade', (req, res) => {
  const { userId, newTier } = req.body;
  try {
    const result = ApiGatewayService.upgradeTier({ userId, newTier });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get usage stats
router.get('/usage', (req, res) => {
  const { userId = 'demo-user', startDate, endDate } = req.query;
  const stats = ApiGatewayService.getUsageStats({ userId, startDate, endDate });
  res.json(stats);
});

// Check feature access
router.get('/access/feature', (req, res) => {
  const { tier = 'free', feature } = req.query;
  const access = ApiGatewayService.checkFeatureAccess({ tier, feature });
  res.json(access);
});

// Get provider health
router.get('/providers/health', (req, res) => {
  const health = ApiGatewayService.getProviderHealth();
  res.json(health);
});

// ==================== AUTOMATIONS ====================

// Get available triggers and actions
router.get('/automations/options', cacheMiddleware(3600), (req, res) => {
  const options = AutomationService.getAvailableOptions();
  res.json(options);
});

// Get automation templates
router.get('/automations/templates', cacheMiddleware(3600), (req, res) => {
  const templates = AutomationService.getTemplates();
  res.json({ templates });
});

// Create automation
router.post('/automations', (req, res) => {
  try {
    const automation = AutomationService.createAutomation(req.body);
    res.json(automation);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Create from template
router.post('/automations/from-template', (req, res) => {
  const { userId, templateId, customConfig } = req.body;
  try {
    const automation = AutomationService.createFromTemplate({ userId, templateId, customConfig });
    res.json(automation);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get user's automations
router.get('/automations', (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const automations = AutomationService.getAutomations({ userId });
  res.json(automations);
});

// Update automation
router.put('/automations/:automationId', (req, res) => {
  const { automationId } = req.params;
  const { userId, ...updates } = req.body;
  try {
    const automation = AutomationService.updateAutomation({ automationId, userId, updates });
    res.json(automation);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// Delete automation
router.delete('/automations/:automationId', (req, res) => {
  const { automationId } = req.params;
  const userId = req.query.userId || 'demo-user';
  try {
    const result = AutomationService.deleteAutomation({ automationId, userId });
    res.json(result);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// Get execution logs
router.get('/automations/:automationId/logs', (req, res) => {
  const { automationId } = req.params;
  const { userId = 'demo-user', limit } = req.query;
  try {
    const logs = AutomationService.getExecutionLogs({ automationId, userId, limit: parseInt(limit) || 50 });
    res.json(logs);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// Fire trigger (for testing)
router.post('/automations/trigger', (req, res) => {
  const { triggerType, userId, payload } = req.body;
  AutomationService.fireTrigger({ triggerType, userId, payload })
    .then(result => res.json(result))
    .catch(e => res.status(400).json({ error: e.message }));
});

// Create webhook endpoint
router.post('/webhooks/incoming', (req, res) => {
  const { userId, name, triggerType } = req.body;
  const endpoint = AutomationService.createWebhookEndpoint({ userId, name, triggerType });
  res.json(endpoint);
});

// Handle incoming webhook
router.post('/webhooks/incoming/:token', (req, res) => {
  const { token } = req.params;
  AutomationService.handleIncomingWebhook({ token, payload: req.body })
    .then(result => res.json(result))
    .catch(e => res.status(404).json({ error: e.message }));
});

// ==================== ANALYTICS ====================

// Get earnings analytics
router.get('/analytics/earnings', (req, res) => {
  const { userId = 'demo-user', startDate, endDate, groupBy } = req.query;
  const analytics = AnalyticsService.getEarningsAnalytics({ userId, startDate, endDate, groupBy });
  res.json(analytics);
});

// Get profitability analysis
router.get('/analytics/profitability', (req, res) => {
  const { userId = 'demo-user', startDate, endDate } = req.query;
  const analysis = AnalyticsService.getProfitabilityAnalysis({ userId, startDate, endDate });
  res.json(analysis);
});

// Get time analysis
router.get('/analytics/time', (req, res) => {
  const { userId = 'demo-user', startDate, endDate } = req.query;
  const analysis = AnalyticsService.getTimeAnalysis({ userId, startDate, endDate });
  res.json(analysis);
});

// Get goal progress
router.get('/analytics/goals', (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const progress = AnalyticsService.getGoalProgress({ userId });
  res.json(progress);
});

// Get tax summary
router.get('/analytics/tax', (req, res) => {
  const { userId = 'demo-user', startDate, endDate } = req.query;
  AnalyticsService.getTaxSummary({ userId, startDate, endDate })
    .then(summary => res.json(summary))
    .catch(e => res.status(400).json({ error: e.message }));
});

// Compare periods
router.get('/analytics/compare', (req, res) => {
  const { userId = 'demo-user', period1Start, period1End, period2Start, period2End } = req.query;
  const comparison = AnalyticsService.comparePeriods({ userId, period1Start, period1End, period2Start, period2End });
  res.json(comparison);
});

// Generate report
router.post('/reports', (req, res) => {
  const { userId, reportType, startDate, endDate, options } = req.body;
  AnalyticsService.generateReport({ userId, reportType, startDate, endDate, options })
    .then(report => res.json(report))
    .catch(e => res.status(400).json({ error: e.message }));
});

// Get saved reports
router.get('/reports', (req, res) => {
  const { userId = 'demo-user', limit } = req.query;
  const reports = AnalyticsService.getReports({ userId, limit: parseInt(limit) || 20 });
  res.json(reports);
});

// ==================== COMPLIANCE ====================

// Initiate KYC
router.post('/compliance/kyc/initiate', (req, res) => {
  const { userId, level } = req.body;
  const session = ComplianceService.initiateKyc({ userId, level });
  res.json(session);
});

// Get KYC status
router.get('/compliance/kyc/status', (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const status = ComplianceService.getKycStatus({ userId });
  res.json(status);
});

// Submit identity verification
router.post('/compliance/kyc/identity', (req, res) => {
  const { sessionId, ...data } = req.body;
  try {
    const result = ComplianceService.submitIdentity({ sessionId, data });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Submit address verification
router.post('/compliance/kyc/address', (req, res) => {
  const { sessionId, ...data } = req.body;
  try {
    const result = ComplianceService.submitAddress({ sessionId, data });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Submit document verification
router.post('/compliance/kyc/document', (req, res) => {
  const { sessionId, documentType, documentData } = req.body;
  try {
    ComplianceService.submitDocument({ sessionId, documentType, documentData })
      .then(result => res.json(result))
      .catch(e => res.status(400).json({ error: e.message }));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Record consent
router.post('/compliance/consent', (req, res) => {
  const consent = ComplianceService.recordConsent(req.body);
  res.json(consent);
});

// Check consent
router.get('/compliance/consent/check', (req, res) => {
  const { userId = 'demo-user', consentType, requiredVersion } = req.query;
  const result = ComplianceService.checkConsent({ userId, consentType, requiredVersion });
  res.json(result);
});

// Revoke consent
router.post('/compliance/consent/revoke', (req, res) => {
  const { userId, consentType } = req.body;
  try {
    const result = ComplianceService.revokeConsent({ userId, consentType });
    res.json(result);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// Create data request (GDPR/CCPA)
router.post('/compliance/data-request', (req, res) => {
  const { userId, requestType } = req.body;
  try {
    const request = ComplianceService.createDataRequest({ userId, requestType });
    res.json(request);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Export user data
router.get('/compliance/export', (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const exportData = ComplianceService.exportUserData({ userId });
  res.json(exportData);
});

// Get compliance summary
router.get('/compliance/summary', (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const summary = ComplianceService.getComplianceSummary({ userId });
  res.json(summary);
});

// Admin: Get pending KYC reviews
router.get('/compliance/kyc/pending', (req, res) => {
  const { limit } = req.query;
  const pending = ComplianceService.getPendingReviews({ limit: parseInt(limit) || 50 });
  res.json(pending);
});

// Admin: Review KYC
router.post('/compliance/kyc/review', (req, res) => {
  const { sessionId, decision, reviewerId, notes } = req.body;
  try {
    const result = ComplianceService.reviewKyc({ sessionId, decision, reviewerId, notes });
    res.json(result);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// ==================== MARKETPLACE ====================

// Register as developer
router.post('/marketplace/developers', (req, res) => {
  const developer = MarketplaceService.registerDeveloper(req.body);
  res.json(developer);
});

// Create plugin
router.post('/marketplace/plugins', (req, res) => {
  try {
    const plugin = MarketplaceService.createPlugin(req.body);
    res.json(plugin);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// List plugins
router.get('/marketplace/plugins', (req, res) => {
  const { category, search, sort, page, limit } = req.query;
  const plugins = MarketplaceService.listPlugins({
    category,
    search,
    sort,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
  });
  res.json(plugins);
});

// Get plugin details
router.get('/marketplace/plugins/:pluginId', (req, res) => {
  const { pluginId } = req.params;
  try {
    const plugin = MarketplaceService.getPlugin({ pluginId });
    res.json(plugin);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// Install plugin
router.post('/marketplace/plugins/:pluginId/install', (req, res) => {
  const { pluginId } = req.params;
  const userId = req.body.userId || 'demo-user';
  try {
    const installation = MarketplaceService.installPlugin({ userId, pluginId });
    res.json(installation);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Uninstall plugin
router.delete('/marketplace/plugins/:pluginId/install', (req, res) => {
  const { pluginId } = req.params;
  const userId = req.query.userId || 'demo-user';
  try {
    const result = MarketplaceService.uninstallPlugin({ userId, pluginId });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get installed plugins
router.get('/marketplace/installed', (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const plugins = MarketplaceService.getInstalledPlugins({ userId });
  res.json(plugins);
});

// Update plugin settings
router.put('/marketplace/plugins/:pluginId/settings', (req, res) => {
  const { pluginId } = req.params;
  const { userId, settings } = req.body;
  try {
    const installation = MarketplaceService.updatePluginSettings({ userId, pluginId, settings });
    res.json(installation);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// Rate plugin
router.post('/marketplace/plugins/:pluginId/rate', (req, res) => {
  const { pluginId } = req.params;
  const { userId, rating, review } = req.body;
  try {
    const result = MarketplaceService.ratePlugin({ userId, pluginId, rating, review });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get marketplace stats
router.get('/marketplace/stats', (req, res) => {
  const stats = MarketplaceService.getMarketplaceStats();
  res.json(stats);
});

// Create white-label config
router.post('/marketplace/whitelabel', (req, res) => {
  const config = MarketplaceService.createWhiteLabelConfig(req.body);
  res.json(config);
});

// Get white-label config
router.get('/marketplace/whitelabel', (req, res) => {
  const { partnerId, customDomain } = req.query;
  const config = MarketplaceService.getWhiteLabelConfig({ partnerId, customDomain });
  if (config) {
    res.json(config);
  } else {
    res.status(404).json({ error: 'config_not_found' });
  }
});

// Update white-label config
router.put('/marketplace/whitelabel/:partnerId', (req, res) => {
  const { partnerId } = req.params;
  try {
    const config = MarketplaceService.updateWhiteLabelConfig({ partnerId, updates: req.body });
    res.json(config);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// Admin: Approve developer
router.post('/marketplace/developers/:developerId/approve', (req, res) => {
  const { developerId } = req.params;
  const { reviewerId } = req.body;
  try {
    const developer = MarketplaceService.approveDeveloper({ developerId, reviewerId });
    res.json(developer);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// Admin: Publish plugin
router.post('/marketplace/plugins/:pluginId/publish', (req, res) => {
  const { pluginId } = req.params;
  const { reviewerId } = req.body;
  try {
    const plugin = MarketplaceService.publishPlugin({ pluginId, reviewerId });
    res.json(plugin);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// ==================== CREDITS SYSTEM (GPT) ====================

// Get credit balance
router.get('/credits/balance', (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const balance = CreditsService.getBalance({ userId });
  res.json(balance);
});

// Get credits dashboard
router.get('/credits/dashboard', (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const dashboard = CreditsService.getDashboard({ userId });
  res.json(dashboard);
});

// Get transaction history
router.get('/credits/transactions', (req, res) => {
  const { userId = 'demo-user', type, limit, offset } = req.query;
  const history = CreditsService.getTransactionHistory({
    userId,
    type,
    limit: parseInt(limit) || 50,
    offset: parseInt(offset) || 0,
  });
  res.json(history);
});

// Daily check-in
router.post('/credits/checkin', (req, res) => {
  const { userId = 'demo-user' } = req.body;
  const result = CreditsService.dailyCheckin({ userId });
  res.json(result);
});

// Get streak info
router.get('/credits/streak', (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const streak = CreditsService.getStreakInfo({ userId });
  res.json(streak);
});

// ==================== SURVEYS ====================

// Get available surveys
router.get('/credits/surveys', (req, res) => {
  const { userId = 'demo-user', category, limit } = req.query;
  const surveys = CreditsService.getAvailableSurveys({
    userId,
    category,
    limit: parseInt(limit) || 20,
  });
  res.json(surveys);
});

// Start a survey
router.post('/credits/surveys/:surveyId/start', (req, res) => {
  const { surveyId } = req.params;
  const { userId = 'demo-user' } = req.body;
  try {
    const survey = CreditsService.startSurvey({ userId, surveyId });
    res.json(survey);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Complete a survey
router.post('/credits/surveys/:surveyId/complete', (req, res) => {
  const { surveyId } = req.params;
  const { userId = 'demo-user', answers } = req.body;
  try {
    const result = CreditsService.completeSurvey({ userId, surveyId, answers });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ==================== GAMES ====================

// Get available games
router.get('/credits/games', cacheMiddleware(300), (req, res) => {
  const games = CreditsService.getAvailableGames();
  res.json(games);
});

// Record game play
router.post('/credits/games/:gameId/play', (req, res) => {
  const { gameId } = req.params;
  const { userId = 'demo-user', result, score } = req.body;
  try {
    const playResult = CreditsService.recordGamePlay({ userId, gameId, result, score });
    res.json(playResult);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ==================== OFFERS ====================

// Get available offers
router.get('/credits/offers', (req, res) => {
  const { userId = 'demo-user', category } = req.query;
  const offers = CreditsService.getAvailableOffers({ userId, category });
  res.json(offers);
});

// Start an offer (click tracking)
router.post('/credits/offers/:offerId/start', (req, res) => {
  const { offerId } = req.params;
  const { userId = 'demo-user' } = req.body;
  const result = CreditsService.startOffer({ userId, offerId });
  res.json(result);
});

// Complete an offer
router.post('/credits/offers/:offerId/complete', (req, res) => {
  const { offerId } = req.params;
  const { userId = 'demo-user', trackingId } = req.body;
  try {
    const result = CreditsService.completeOffer({ userId, offerId, trackingId });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ==================== VIDEO ADS ====================

// Get video ad availability
router.get('/credits/ads/video', (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const availability = CreditsService.getAvailableVideoAds({ userId });
  res.json(availability);
});

// Watch video ad
router.post('/credits/ads/video/watch', (req, res) => {
  const { userId = 'demo-user', adId, duration } = req.body;
  const result = CreditsService.recordVideoAdWatch({ userId, adId, duration });
  res.json(result);
});

// ==================== SEARCH ====================

// Record search
router.post('/credits/search', (req, res) => {
  const { userId = 'demo-user', query } = req.body;
  const result = CreditsService.recordSearch({ userId, query });
  res.json(result);
});

// ==================== CASHBACK ====================

// Get cashback retailers
router.get('/credits/cashback/retailers', cacheMiddleware(3600), (req, res) => {
  const retailers = CreditsService.getCashbackRetailers();
  res.json(retailers);
});

// Record cashback purchase
router.post('/credits/cashback/purchase', (req, res) => {
  const { userId = 'demo-user', retailerId, purchaseAmount, orderId } = req.body;
  try {
    const result = CreditsService.recordCashbackPurchase({
      userId,
      retailerId,
      purchaseAmount,
      orderId,
    });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ==================== SOCIAL ====================

// Record social share
router.post('/credits/social/share', (req, res) => {
  const { userId = 'demo-user', platform, contentType, contentId } = req.body;
  const result = CreditsService.recordSocialShare({ userId, platform, contentType, contentId });
  res.json(result);
});

// Record social post
router.post('/credits/social/post', (req, res) => {
  const { userId = 'demo-user', platform, postUrl, hashtag } = req.body;
  try {
    const result = CreditsService.recordSocialPost({ userId, platform, postUrl, hashtag });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ==================== REFERRALS ====================

// Get/generate referral code
router.get('/credits/referral', (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const referral = CreditsService.generateReferralCode({ userId });
  res.json(referral);
});

// Apply referral code
router.post('/credits/referral/apply', (req, res) => {
  const { userId = 'demo-user', referralCode } = req.body;
  try {
    const result = CreditsService.applyReferralCode({ userId, referralCode });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ==================== ACHIEVEMENTS ====================

// Get achievements
router.get('/credits/achievements', (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const achievements = CreditsService.getAchievements({ userId });
  res.json(achievements);
});

// ==================== TASKS ====================

// Get available tasks
router.get('/credits/tasks', (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const tasks = CreditsService.getAvailableTasks({ userId });
  res.json(tasks);
});

// Complete a task
router.post('/credits/tasks/:taskId/complete', (req, res) => {
  const { taskId } = req.params;
  const { userId = 'demo-user', result } = req.body;
  try {
    const taskResult = CreditsService.completeTask({ userId, taskId, result });
    res.json(taskResult);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ==================== RECEIPTS ====================

// Submit receipt
router.post('/credits/receipts', (req, res) => {
  const { userId = 'demo-user', retailer, purchaseAmount, receiptImageUrl, items } = req.body;
  const result = CreditsService.submitReceipt({
    userId,
    retailer,
    purchaseAmount,
    receiptImageUrl,
    items,
  });
  res.json(result);
});

// ==================== REDEMPTIONS ====================

// Get redemption options
router.get('/credits/redemptions/options', cacheMiddleware(3600), (req, res) => {
  const options = CreditsService.getRedemptionOptions();
  res.json(options);
});

// Request redemption
router.post('/credits/redemptions', (req, res) => {
  const { userId = 'demo-user', type, credits, destination } = req.body;
  try {
    const result = CreditsService.requestRedemption({ userId, type, credits, destination });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get redemption history
router.get('/credits/redemptions', (req, res) => {
  const { userId = 'demo-user', status, limit } = req.query;
  const history = CreditsService.getRedemptionHistory({
    userId,
    status,
    limit: parseInt(limit) || 20,
  });
  res.json(history);
});

// ==================== LEADERBOARD ====================

// Get leaderboard
router.get('/credits/leaderboard', cacheMiddleware(300), (req, res) => {
  const { period = 'week', limit } = req.query;
  const leaderboard = CreditsService.getLeaderboard({
    period,
    limit: parseInt(limit) || 100,
  });
  res.json(leaderboard);
});

// ==================== BONUS EVENTS ====================

// Get active bonus events
router.get('/credits/events', cacheMiddleware(60), (req, res) => {
  const events = CreditsService.getActiveBonusEvents();
  res.json(events);
});

// ==================== DEMO ====================

// Seed demo data
router.post('/credits/demo/seed', (req, res) => {
  const { userId = 'demo-user' } = req.body;
  const result = CreditsService.seedDemoData({ userId });
  res.json(result);
});

export default router;
