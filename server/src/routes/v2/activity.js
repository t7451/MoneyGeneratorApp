import express from 'express';

const router = express.Router();

// In-memory activity storage for demo
const activityStore = new Map();

// Activity types
const ActivityTypes = {
  INCOME: 'income',
  EXPENSE: 'expense',
  SHIFT_START: 'shift_start',
  SHIFT_END: 'shift_end',
  MILESTONE: 'milestone',
  REFERRAL: 'referral',
  SUBSCRIPTION: 'subscription',
  SYSTEM: 'system',
};

// Generate sample activities for a user
function generateSampleActivities(userId) {
  const now = Date.now();
  return [
    { 
      id: `act_${userId}_1`, 
      userId,
      type: ActivityTypes.INCOME, 
      title: 'Package Delivery - Downtown', 
      description: 'Amazon Flex delivery completed',
      occurredAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(), 
      amount: 45.0,
      platform: 'Amazon Flex',
      metadata: { deliveries: 3, miles: 12.5 }
    },
    { 
      id: `act_${userId}_2`, 
      userId,
      type: ActivityTypes.INCOME, 
      title: 'Rideshare Earnings', 
      description: '4 rides completed',
      occurredAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(), 
      amount: 62.5,
      platform: 'Uber',
      metadata: { rides: 4, tips: 12.5 }
    },
    { 
      id: `act_${userId}_3`, 
      userId,
      type: ActivityTypes.EXPENSE, 
      title: 'Gas Expense', 
      description: 'Shell Gas Station',
      occurredAt: new Date(now - 26 * 60 * 60 * 1000).toISOString(), 
      amount: -45.0,
      category: 'fuel',
      metadata: { gallons: 12.5, pricePerGallon: 3.60 }
    },
    { 
      id: `act_${userId}_4`, 
      userId,
      type: ActivityTypes.MILESTONE, 
      title: 'Weekly Goal Achieved!', 
      description: 'You reached your $500 weekly goal',
      occurredAt: new Date(now - 48 * 60 * 60 * 1000).toISOString(), 
      amount: null,
      metadata: { goalType: 'weekly_earnings', target: 500, achieved: 523.50 }
    },
    { 
      id: `act_${userId}_5`, 
      userId,
      type: ActivityTypes.SHIFT_END, 
      title: 'Shift Completed', 
      description: '6 hour shift with DoorDash',
      occurredAt: new Date(now - 72 * 60 * 60 * 1000).toISOString(), 
      amount: 127.50,
      platform: 'DoorDash',
      metadata: { duration: 6, deliveries: 15, avgPerDelivery: 8.50 }
    },
    { 
      id: `act_${userId}_6`, 
      userId,
      type: ActivityTypes.REFERRAL, 
      title: 'Referral Bonus', 
      description: 'John D. signed up using your code',
      occurredAt: new Date(now - 96 * 60 * 60 * 1000).toISOString(), 
      amount: 5.0,
      metadata: { referredUser: 'John D.', code: 'REF_ABC123' }
    },
  ];
}

// GET /api/v2/activity/recent
router.get('/recent', (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const offset = parseInt(req.query.offset || '0', 10);
  const type = req.query.type; // Filter by activity type

  // Get or generate activities for user
  if (!activityStore.has(userId)) {
    activityStore.set(userId, generateSampleActivities(userId));
  }

  let items = activityStore.get(userId) || [];

  // Filter by type if specified
  if (type && Object.values(ActivityTypes).includes(type)) {
    items = items.filter(item => item.type === type);
  }

  // Sort by date descending
  items.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  // Paginate
  const total = items.length;
  items = items.slice(offset, offset + limit);

  res.json({ 
    success: true, 
    items,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + items.length < total
    }
  });
});

// GET /api/v2/activity/summary
router.get('/summary', (req, res) => {
  const userId = req.query.userId || 'demo-user';
  const period = req.query.period || '7d'; // 7d, 30d, 90d

  // Get activities
  if (!activityStore.has(userId)) {
    activityStore.set(userId, generateSampleActivities(userId));
  }
  const items = activityStore.get(userId) || [];

  // Calculate period cutoff
  const periodDays = parseInt(period) || 7;
  const cutoff = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  const recentItems = items.filter(item => new Date(item.occurredAt) >= cutoff);

  // Calculate summary
  const income = recentItems
    .filter(i => i.type === ActivityTypes.INCOME || (i.amount && i.amount > 0))
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const expenses = Math.abs(recentItems
    .filter(i => i.type === ActivityTypes.EXPENSE || (i.amount && i.amount < 0))
    .reduce((sum, i) => sum + (i.amount || 0), 0));

  const byType = recentItems.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});

  const byPlatform = recentItems
    .filter(i => i.platform)
    .reduce((acc, item) => {
      if (!acc[item.platform]) {
        acc[item.platform] = { count: 0, earnings: 0 };
      }
      acc[item.platform].count++;
      acc[item.platform].earnings += item.amount || 0;
      return acc;
    }, {});

  res.json({
    success: true,
    period,
    summary: {
      totalActivities: recentItems.length,
      income,
      expenses,
      netIncome: income - expenses,
      byType,
      byPlatform
    }
  });
});

// GET /api/v2/activity/types
router.get('/types', (req, res) => {
  res.json({
    success: true,
    types: Object.entries(ActivityTypes).map(([key, value]) => ({
      id: value,
      label: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
    }))
  });
});

// POST /api/v2/activity - Create new activity (for manual entries)
router.post('/', (req, res) => {
  const { userId = 'demo-user', type, title, description, amount, platform, category, metadata } = req.body;

  if (!type || !title) {
    return res.status(400).json({ success: false, error: 'Type and title are required' });
  }

  const activity = {
    id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    type,
    title,
    description: description || '',
    occurredAt: new Date().toISOString(),
    amount: amount || null,
    platform: platform || null,
    category: category || null,
    metadata: metadata || {},
    isManual: true,
  };

  // Store activity
  if (!activityStore.has(userId)) {
    activityStore.set(userId, []);
  }
  activityStore.get(userId).unshift(activity);

  res.status(201).json({ success: true, activity });
});

export default router;
