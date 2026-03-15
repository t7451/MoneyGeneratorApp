import express from 'express';
import { AuthService } from '../../services/authService.js';
import OpsService from '../../services/opsService.js';
import { Models } from '../../models.js';

const router = express.Router();

async function requireOperator(req, res, next) {
  if (req.user?.role === 'admin' || req.user?.role === 'operator' || req.user?.role === 'support') {
    return next();
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const user = token ? await AuthService.verifyAndGetUser(token) : null;
  if (user && ['admin', 'operator', 'support'].includes(user.role)) {
    req.user = user;
    return next();
  }

  return res.status(403).json({ error: 'Operator access required' });
}

router.get('/overview', requireOperator, (req, res) => {
  res.json(OpsService.getOverview());
});

router.get('/incidents', requireOperator, (req, res) => {
  res.json({ incidents: OpsService.listIncidents() });
});

router.post('/incidents', requireOperator, (req, res) => {
  const { source, severity, title, details } = req.body || {};
  if (!source || !title) {
    return res.status(400).json({ error: 'source and title are required' });
  }
  res.status(201).json({ incident: OpsService.createIncident({ source, severity, title, details }) });
});

router.post('/annotations', requireOperator, (req, res) => {
  const { targetType, targetId, note } = req.body || {};
  if (!targetType || !targetId || !note) {
    return res.status(400).json({ error: 'targetType, targetId, and note are required' });
  }
  const author = req.user?.email || req.user?.id || 'operator';
  res.status(201).json({ annotation: OpsService.annotate({ targetType, targetId, note, author }) });
});

router.post('/replays/outbound/:jobId', requireOperator, (req, res) => {
  const job = Models.outboundWebhookQueue.find((entry) => entry.id === req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'job_not_found' });
  }

  job.status = 'queued';
  job.retryAt = null;
  job.error = null;

  const replay = OpsService.recordReplayOutcome({
    targetId: job.id,
    outcome: 'queued_for_replay',
    operator: req.user?.email || req.user?.id || 'operator',
    details: { targetUrl: job.targetUrl },
  });

  res.json({ replay, job });
});

router.post('/background-jobs/:jobKey/heartbeat', requireOperator, (req, res) => {
  const { queueName = 'default', status = 'running', metadata = {} } = req.body || {};
  const job = OpsService.updateBackgroundJob({ jobKey: req.params.jobKey, queueName, status, metadata });
  res.json({ job });
});

router.get('/queue-health', requireOperator, (req, res) => {
  const overview = OpsService.getOverview();
  res.json({
    outboundQueue: overview.outboundQueue,
    backgroundJobs: overview.backgroundJobs,
    recentReplayOutcomes: overview.replayOutcomes,
  });
});

router.get('/webhooks', requireOperator, (req, res) => {
  const events = Array.from(Models.webhookEvents.values())
    .sort((a, b) => new Date(b.createdAt || b.processedAt || 0) - new Date(a.createdAt || a.processedAt || 0));
  res.json({ events });
});

router.post('/webhooks/:eventId/annotations', requireOperator, (req, res) => {
  const event = Models.webhookEvents.get(req.params.eventId);
  if (!event) {
    return res.status(404).json({ error: 'webhook_event_not_found' });
  }

  const { note } = req.body || {};
  if (!note) {
    return res.status(400).json({ error: 'note is required' });
  }

  const annotation = OpsService.annotate({
    targetType: 'webhook_event',
    targetId: req.params.eventId,
    note,
    author: req.user?.email || req.user?.id || 'operator',
  });

  res.status(201).json({ annotation });
});

router.get('/search', requireOperator, (req, res) => {
  const query = String(req.query.q || '').trim();
  if (!query) {
    return res.status(400).json({ error: 'q is required' });
  }
  res.json(OpsService.search(query));
});

export default router;