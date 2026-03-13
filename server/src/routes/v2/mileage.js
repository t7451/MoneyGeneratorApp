import express from 'express';
import { MileageService } from '../../services/mileageService.js';

const router = express.Router();

function requireUserId(req, res) {
  const userId = req.query.userId || req.body.userId || req.headers['x-user-id'];
  if (!userId) {
    res.status(400).json({ success: false, error: 'userId required' });
    return null;
  }
  return String(userId);
}

// GET /api/v2/mileage/current
router.get('/current', (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  res.json({ success: true, current: MileageService.getCurrent(userId) });
});

// POST /api/v2/mileage/start
router.post('/start', (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const { startLocation } = req.body || {};
  const current = MileageService.start(userId, { startLocation });
  res.json({ success: true, current });
});

// POST /api/v2/mileage/stop
router.post('/stop', (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const { endLocation, type } = req.body || {};
  const result = MileageService.stop(userId, { endLocation, type });
  if (result?.error === 'not_tracking') {
    return res.status(400).json({ success: false, error: 'not_tracking' });
  }
  res.json({ success: true, ...result });
});

// GET /api/v2/mileage/trips
router.get('/trips', (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const limit = req.query.limit;
  res.json({ success: true, trips: MileageService.listTrips(userId, limit) });
});

// PATCH /api/v2/mileage/trips/:tripId
router.patch('/trips/:tripId', (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const { tripId } = req.params;
  const { type } = req.body || {};
  if (!type || (type !== 'business' && type !== 'personal')) {
    return res.status(400).json({ success: false, error: 'invalid_type' });
  }
  const updated = MileageService.updateTripType(userId, tripId, type);
  if (!updated) return res.status(404).json({ success: false, error: 'trip_not_found' });
  res.json({ success: true, trip: updated });
});

// GET /api/v2/mileage/export-csv
router.get('/export-csv', (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const csv = MileageService.exportCsv(userId);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="mileage_log.csv"');
  res.send(csv);
});

export default router;
