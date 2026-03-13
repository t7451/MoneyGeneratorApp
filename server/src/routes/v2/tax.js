import express from 'express';
import { TaxService } from '../../services/taxService.js';

const router = express.Router();

function requireUserId(req, res) {
  const userId = req.query.userId || req.body.userId || req.headers['x-user-id'];
  if (!userId) {
    res.status(400).json({ success: false, error: 'userId required' });
    return null;
  }
  return String(userId);
}

// GET /api/v2/tax/quarters?year=2026
router.get('/quarters', (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const year = parseInt(req.query.year || String(new Date().getFullYear()), 10);
  res.json({ success: true, year, quarters: TaxService.getSchedule(userId, year) });
});

// POST /api/v2/tax/quarters/mark-paid
router.post('/quarters/mark-paid', (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const year = parseInt(req.body.year || String(new Date().getFullYear()), 10);
  const { quarter } = req.body || {};
  if (!quarter) return res.status(400).json({ success: false, error: 'quarter required' });
  res.json({ success: true, year, quarters: TaxService.markPaid(userId, year, String(quarter)) });
});

export default router;
