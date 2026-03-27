import express from 'express';
import { Models } from '../../models.js';

const router = express.Router();

// In-memory storage for onboarding progress
if (!Models.onboardingProgress) Models.onboardingProgress = new Map();
if (!Models.analyticsEvents) Models.analyticsEvents = new Map();
if (!Models.feedback) Models.feedback = new Map();

/**
 * GET /api/v2/onboarding/progress
 * Get the current user's onboarding progress
 */
router.get('/progress', (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter required' });
  }

  const progress = Models.onboardingProgress.get(userId) || {
    userId,
    completed: false,
    currentStep: 'welcome',
    stepsCompleted: [],
    role: null,
    bankConnected: false,
    platformsConnected: [],
    planSelected: null,
    goalsSet: false,
    completedAt: null,
    startedAt: null,
  };

  res.json({ success: true, progress });
});

/**
 * PUT /api/v2/onboarding/progress
 * Update onboarding progress
 */
router.put('/progress', (req, res) => {
  const { userId, step, data } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const existing = Models.onboardingProgress.get(userId) || {
    userId,
    completed: false,
    currentStep: 'welcome',
    stepsCompleted: [],
    role: null,
    bankConnected: false,
    platformsConnected: [],
    planSelected: null,
    goalsSet: false,
    completedAt: null,
    startedAt: new Date().toISOString(),
  };

  if (step) {
    existing.currentStep = step;
    if (!existing.stepsCompleted.includes(step)) {
      existing.stepsCompleted.push(step);
    }
  }

  if (data) {
    if (data.role) existing.role = data.role;
    if (typeof data.bankConnected === 'boolean') existing.bankConnected = data.bankConnected;
    if (data.platformsConnected) existing.platformsConnected = data.platformsConnected;
    if (data.planSelected) existing.planSelected = data.planSelected;
    if (typeof data.goalsSet === 'boolean') existing.goalsSet = data.goalsSet;
    if (typeof data.completed === 'boolean') {
      existing.completed = data.completed;
      if (data.completed) {
        existing.completedAt = new Date().toISOString();
      }
    }
  }

  existing.updatedAt = new Date().toISOString();
  Models.onboardingProgress.set(userId, existing);

  res.json({ success: true, progress: existing });
});

/**
 * POST /api/v2/analytics/events
 * Batch ingest analytics events for funnel tracking
 */
router.post('/analytics/events', (req, res) => {
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
router.get('/analytics/summary', (req, res) => {
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
 * POST /api/v2/feedback
 * Submit user feedback
 */
router.post('/feedback', (req, res) => {
  const { userId, context, rating, comment } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const entry = {
    id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    context: context || 'general',
    rating: rating || null,
    comment: comment || '',
    createdAt: new Date().toISOString(),
  };

  const userFeedback = Models.feedback.get(userId) || [];
  userFeedback.push(entry);
  Models.feedback.set(userId, userFeedback);

  res.json({ success: true, feedback: entry });
});

export default router;
