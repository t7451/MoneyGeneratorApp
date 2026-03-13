import express from 'express';

const router = express.Router();

// GET /api/v2/activity/recent
router.get('/recent', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);

  const items = [
    { id: 'act_1', type: 'income', title: 'Package Delivery - Downtown', occurredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), amount: 45.0 },
    { id: 'act_2', type: 'income', title: 'Rideshare Earnings', occurredAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), amount: 32.5 },
    { id: 'act_3', type: 'expense', title: 'Gas Expense', occurredAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(), amount: -45.0 },
  ].slice(0, limit);

  res.json({ success: true, items });
});

export default router;
