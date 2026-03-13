import express from 'express';
import { featureFlagsService } from '../services/featureFlags.js';
import referralsRouter from './v2/referrals.js';
import subscriptionsRouter from './v2/subscriptions.js';
import reportingRouter from './v2/reporting.js';
import teamRouter from './v2/team.js';
import integrationsRouter from './v2/integrations.js';
import mileageRouter from './v2/mileage.js';
import activityRouter from './v2/activity.js';
import taxRouter from './v2/tax.js';

const router = express.Router();

// Mount v2 sub-routers
router.use('/referrals', referralsRouter);
router.use('/subscriptions', subscriptionsRouter);
router.use('/reporting', reportingRouter);
router.use('/team', teamRouter);
router.use('/integrations', integrationsRouter);
router.use('/mileage', mileageRouter);
router.use('/activity', activityRouter);
router.use('/tax', taxRouter);

/**
 * Feature Flags V2 Routes
 */

// Get all feature flags for the user
router.get('/features/flags', (req, res) => {
  const userId = req.query.userId;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter required' });
  }

  const flags = featureFlagsService.getUserFeatures(userId);
  res.json({ flags });
});

// Get specific feature flag status
router.get('/features/flags/:featureKey', (req, res) => {
  const { featureKey } = req.params;
  const userId = req.query.userId;

  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter required' });
  }

  const enabled = featureFlagsService.isFeatureEnabled(featureKey, userId);
  res.json({ feature: featureKey, enabled });
});

/**
 * Export / Data Download Routes
 */

// Get exportable data summary (what's available to export)
router.get('/export/summary', (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter required' });
  }

  // Return mock export summary
  res.json({
    userId,
    availableExports: [
      { type: 'earnings', label: 'Earnings Report', format: ['csv', 'pdf'] },
      { type: 'expenses', label: 'Expense Report', format: ['csv', 'pdf'] },
      { type: 'mileage', label: 'Mileage Log', format: ['csv', 'pdf'] },
      { type: 'tax', label: 'Tax Summary', format: ['pdf'] },
      { type: 'full', label: 'Full Data Export', format: ['json', 'csv'] },
    ],
    lastExportDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    totalRecords: {
      earnings: 156,
      expenses: 42,
      mileage: 89,
      shifts: 34,
    },
  });
});

// Request data export
router.post('/export/request', (req, res) => {
  const { userId, exportType, format, dateRange } = req.body;

  if (!userId || !exportType) {
    return res.status(400).json({ error: 'userId and exportType required' });
  }

  // Mock: Create export job
  const exportId = `exp_${Date.now()}`;

  res.json({
    exportId,
    status: 'processing',
    type: exportType,
    format: format || 'csv',
    createdAt: new Date().toISOString(),
    estimatedCompletionTime: '5-10 minutes',
    downloadUrl: null, // Will be populated when ready
  });
});

// Get export status
router.get('/export/:exportId', (req, res) => {
  const { exportId } = req.params;

  // Mock: Simulate export in progress
  res.json({
    exportId,
    status: 'completed',
    type: 'earnings',
    format: 'csv',
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    fileSize: '245 KB',
    downloadUrl: `https://api.moneygenerator.app/exports/${exportId}/download`,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
});

/**
 * Job Marketplace V2 Routes
 */

// Get job marketplace metadata
router.get('/jobs/metadata', (req, res) => {
  res.json({
    categories: [
      { id: 'delivery', label: 'Delivery & Driving', count: 234 },
      { id: 'rideshare', label: 'Rideshare', count: 456 },
      { id: 'tasks', label: 'Tasks & Services', count: 789 },
      { id: 'freelance', label: 'Freelance & Writing', count: 321 },
      { id: 'consulting', label: 'Consulting', count: 87 },
    ],
    sortOptions: [
      { value: 'relevance', label: 'Most Relevant' },
      { value: 'earnings', label: 'Highest Earnings' },
      { value: 'distance', label: 'Closest' },
      { value: 'rating', label: 'Best Rated' },
      { value: 'new', label: 'Newest' },
    ],
    filters: [
      { key: 'category', label: 'Category', type: 'multi-select' },
      { key: 'minPay', label: 'Minimum Pay', type: 'slider', min: 0, max: 500 },
      { key: 'distance', label: 'Distance (miles)', type: 'slider', min: 0, max: 50 },
      { key: 'availability', label: 'Availability', type: 'select' },
      { key: 'rating', label: 'Min Employer Rating', type: 'slider', min: 0, max: 5 },
    ],
  });
});

// Get recommended jobs for user
router.get('/jobs/recommended', (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter required' });
  }

  // Mock: Return personalized job recommendations
  res.json({
    userId,
    recommendations: [
      {
        id: 'job_001',
        title: 'Package Delivery - Downtown Route',
        platform: 'Amazon Flex',
        category: 'delivery',
        pay: { amount: 85, estimate: 'per 2 hours' },
        distance: 2.3,
        rating: 4.8,
        matches: [
          { type: 'skill', label: 'Delivery experience' },
          { type: 'schedule', label: 'Morning availability' },
          { type: 'earning', label: 'Your typical hourly rate' },
        ],
      },
      {
        id: 'job_002',
        title: 'Rideshare Driver Needed',
        platform: 'Uber',
        category: 'rideshare',
        pay: { amount: '$18-$25', estimate: 'per trip' },
        distance: 1.1,
        rating: 4.7,
        matches: [
          { type: 'schedule', label: 'Evening hours (your peak)' },
          { type: 'earning', label: 'Surge pricing expected' },
        ],
      },
      {
        id: 'job_003',
        title: 'Furniture Assembly Tasks',
        platform: 'TaskRabbit',
        category: 'tasks',
        pay: { amount: '120', estimate: 'per 2 hours' },
        distance: 5.2,
        rating: 4.9,
        matches: [
          { type: 'skill', label: 'DIY skills' },
          { type: 'earning', label: 'Premium hourly rate' },
        ],
      },
    ],
    reason: 'Based on your work history, ratings, and availability',
  });
});

// Save/unsave a job
router.post('/jobs/:jobId/save', (req, res) => {
  const { jobId } = req.params;
  const { userId, saved } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  res.json({
    jobId,
    saved: saved !== false,
    savedAt: new Date().toISOString(),
  });
});

// Get saved jobs
router.get('/jobs/saved', (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter required' });
  }

  res.json({
    userId,
    savedJobs: [
      {
        id: 'job_001',
        title: 'Package Delivery - Downtown Route',
        platform: 'Amazon Flex',
        savedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'job_003',
        title: 'Furniture Assembly Tasks',
        platform: 'TaskRabbit',
        savedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      },
    ],
    totalSaved: 2,
  });
});

// Create or update job alert
router.post('/jobs/alerts', (req, res) => {
  const { userId, name, filters, channels } = req.body;

  if (!userId || !name || !filters) {
    return res.status(400).json({ error: 'userId, name, and filters required' });
  }

  const alertId = `alert_${Date.now()}`;

  res.json({
    alertId,
    userId,
    name,
    filters,
    channels: channels || ['email', 'in-app'],
    isActive: true,
    createdAt: new Date().toISOString(),
  });
});

// Get user's job alerts
router.get('/jobs/alerts', (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter required' });
  }

  res.json({
    userId,
    alerts: [
      {
        id: 'alert_001',
        name: 'High-Pay Delivery Jobs',
        filters: {
          platform: ['Amazon Flex', 'Instacart'],
          minPay: 80,
          category: 'delivery',
        },
        channels: ['email', 'in-app', 'push'],
        isActive: true,
        createdAt: '2026-03-01T10:00:00Z',
        recentMatches: 3,
      },
      {
        id: 'alert_002',
        name: 'Evening Rideshare',
        filters: {
          platform: ['Uber', 'Lyft'],
          category: 'rideshare',
          availability: 'evening',
        },
        channels: ['in-app'],
        isActive: true,
        createdAt: '2026-02-15T14:30:00Z',
        recentMatches: 8,
      },
    ],
  });
});

/**
 * Analytics & Metrics V2 Routes
 */

// Get advanced analytics summary
router.get('/analytics/summary', (req, res) => {
  const { userId, period = '30d' } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter required' });
  }

  res.json({
    userId,
    period,
    summary: {
      totalEarnings: 2847.53,
      totalExpenses: 342.19,
      netIncome: 2505.34,
      hoursWorked: 142.5,
      hourlyRate: 17.59,
      bestDay: { date: '2026-03-10', earnings: 245.50 },
      worstDay: { date: '2026-03-05', earnings: 62.30 },
      trend: {
        direction: 'up',
        percent: 12.5,
        message: 'You earned 12.5% more than last month',
      },
    },
  });
});

// Get earning breakdown by platform/category
router.get('/analytics/breakdown', (req, res) => {
  const { userId, period = '30d', groupBy = 'platform' } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter required' });
  }

  const breakdown = {
    'Amazon Flex': { earnings: 1200.50, hours: 65, jobs: 24 },
    'Uber/Lyft': { earnings: 890.30, hours: 50, jobs: 156 },
    'TaskRabbit': { earnings: 756.73, hours: 27.5, jobs: 11 },
  };

  res.json({
    userId,
    period,
    groupBy,
    breakdown,
  });
});

// Get earning forecast
router.get('/analytics/forecast', (req, res) => {
  const { userId, daysAhead = 30 } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId query parameter required' });
  }

  // Mock: Generate forecast
  const forecast = [];
  for (let i = 0; i < Math.min(daysAhead, 30); i++) {
    const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
    forecast.push({
      date: date.toISOString().split('T')[0],
      predicted: Math.floor(50 + Math.random() * 150),
      confidence: 0.75 + Math.random() * 0.2,
    });
  }

  res.json({
    userId,
    forecast,
    methodology: 'ML-based prediction using historical work patterns',
  });
});

export default router;
