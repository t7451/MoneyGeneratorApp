import express from 'express';
import { Models } from '../../models.js';

const router = express.Router();

// Minimal v2 wrappers so the web app can call integrations via the existing Netlify /api/v2 proxy.

// POST /api/v2/integrations/plaid/link-token
router.post('/plaid/link-token', (req, res) => {
  const token = `plaid-sandbox-${Date.now()}`;
  res.json({ link_token: token });
});

// POST /api/v2/integrations/plaid/exchange
router.post('/plaid/exchange', (req, res) => {
  const { publicToken, userId } = req.body || {};
  const effectiveUserId = userId || req.headers['x-user-id'] || 'demo-user';
  if (!publicToken) {
    return res.status(400).json({ success: false, error: 'publicToken required' });
  }
  const itemId = `item-${Date.now()}`;
  Models.plaidItems.set(itemId, { id: itemId, userId: effectiveUserId, publicToken, accessToken: 'server-only' });
  res.json({ item_id: itemId });
});

export default router;
