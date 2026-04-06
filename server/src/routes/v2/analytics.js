import express from 'express';
import { Models } from '../../models.js';

const router = express.Router();

// In-memory storage for analytics events
if (!Models.analyticsEvents) Models.analyticsEvents = new Map();

/**
 * POST /api/v2/analytics/events
 * Batch ingest analytics events for funnel tracking
 */
router.post('/events', (req, res) => {
  const { userId, events } = req.body;
  if (!userId || !Array.isArray(events)) {
    return res.status(400).json({ error: 'userId and events array are required' });
  }

  const userEvents = Models.analyticsEvents.get(userId) || [];
  const newEvents = events.map((e) => ({
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    event: e.event,
    properties: e.properties || {},
    timestamp: e.timestamp || new Date().toISOString(),
    ingestedAt: new Date().toISOString(),
  }));

  userEvents.push(...newEvents);

  // Keep only last 1000 events per user
  if (userEvents.length > 1000) {
    userEvents.splice(0, userEvents.length - 1000);
  }

  Models.analyticsEvents.set(userId, userEvents);

  res.json({ success: true, ingested: newEvents.length });
});

/**
 * GET /api/v2/analytics/summary
 * Get analytics summary for dashboard
 */
router.get('/summary', (req, res) => {
  const userId = req.query.userId;
  const period = req.query.period || '30d';

  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter required' });
  }

  // Generate summary from available data
  const earnings = Array.from(Models.earnings?.values() || [])
    .filter(e => e.userId === userId);

  const totalEarnings = earnings.reduce((sum, e) => sum + (e.amount || 0), 0);
  const expenses = Array.from(Models.expenses?.values() || [])
    .filter(e => e.userId === userId);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const shifts = Array.from(Models.shifts?.values() || [])
    .filter(s => s.userId === userId);
  const totalHours = shifts.reduce((sum, s) => {
    if (s.startTime && s.endTime) {
      return sum + (new Date(s.endTime) - new Date(s.startTime)) / (1000 * 60 * 60);
    }
    return sum;
  }, 0);

  res.json({
    summary: {
      totalEarnings,
      totalExpenses,
      netIncome: totalEarnings - totalExpenses,
      hoursWorked: totalHours,
      hourlyRate: totalHours > 0 ? totalEarnings / totalHours : 0,
      trend: {
        direction: 'up',
        percent: 12,
      },
      period,
    },
  });
});

/**
 * GET /api/v2/analytics/funnel
 * Get funnel metrics for a specific flow
 */
router.get('/funnel', (req, res) => {
  const { flow } = req.query;

  // Aggregate events across all users for the requested funnel
  const allEvents = [];
  for (const events of Models.analyticsEvents.values()) {
    allEvents.push(...events);
  }

  const funnelSteps = {
    onboarding: [
      'onboarding_step_viewed',
      'onboarding_role_selected',
      'onboarding_bank_connect_started',
      'onboarding_plan_selected',
      'onboarding_completed',
    ],
    checkout: [
      'plan_viewed',
      'checkout_started',
      'checkout_completed',
      'checkout_abandoned',
    ],
  };

  const steps = funnelSteps[flow] || funnelSteps.onboarding;
  const counts = steps.map(step => ({
    step,
    count: allEvents.filter(e => e.event === step).length,
  }));

  res.json({ success: true, flow: flow || 'onboarding', steps: counts });
});

export default router;
