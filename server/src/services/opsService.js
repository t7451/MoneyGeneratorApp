import { Models } from '../models.js';

function nowIso() {
  return new Date().toISOString();
}

export const OpsService = {
  listIncidents() {
    return [...Models.incidents].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  createIncident({ source, severity = 'warning', title, details = {} }) {
    const incident = {
      id: `inc_${Date.now()}`,
      source,
      severity,
      title,
      details,
      status: 'open',
      createdAt: nowIso(),
    };
    Models.incidents.unshift(incident);
    return incident;
  },

  annotate({ targetType, targetId, note, author }) {
    const annotation = {
      id: `note_${Date.now()}`,
      targetType,
      targetId,
      note,
      author,
      createdAt: nowIso(),
    };
    Models.operatorAnnotations.unshift(annotation);
    return annotation;
  },

  recordReplayOutcome({ targetId, outcome, operator, details = {} }) {
    const replay = {
      id: `replay_${Date.now()}`,
      targetId,
      outcome,
      operator,
      details,
      createdAt: nowIso(),
    };
    Models.replayOutcomes.unshift(replay);
    return replay;
  },

  updateBackgroundJob({ jobKey, queueName, status, metadata = {} }) {
    const existing = Models.backgroundJobs.get(jobKey) || {
      jobKey,
      queueName,
      createdAt: nowIso(),
      attempts: 0,
    };
    const next = {
      ...existing,
      queueName,
      status,
      metadata: { ...existing.metadata, ...metadata },
      lastHeartbeatAt: nowIso(),
      startedAt: status === 'running' ? existing.startedAt || nowIso() : existing.startedAt,
      completedAt: status === 'completed' ? nowIso() : existing.completedAt,
      attempts: status === 'retrying' ? (existing.attempts || 0) + 1 : existing.attempts || 0,
    };
    Models.backgroundJobs.set(jobKey, next);
    return next;
  },

  getOverview() {
    const queue = Models.outboundWebhookQueue;
    const failedQueue = queue.filter((job) => job.status === 'failed');
    const deliveredQueue = queue.filter((job) => job.status === 'delivered');
    const recentIncidents = this.listIncidents().slice(0, 10);
    const recentAnnotations = Models.operatorAnnotations.slice(0, 10);
    const backgroundJobs = Array.from(Models.backgroundJobs.values());
    const stuckJobs = backgroundJobs.filter((job) => job.status === 'running' && job.lastHeartbeatAt && Date.now() - new Date(job.lastHeartbeatAt).getTime() > 15 * 60_000);

    const errorClasses = failedQueue.reduce((acc, job) => {
      const key = job.error || 'unknown_error';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return {
      webhookEvents: Models.webhookEvents.size,
      outboundQueue: {
        total: queue.length,
        failed: failedQueue.length,
        delivered: deliveredQueue.length,
      },
      incidents: recentIncidents,
      recentAnnotations,
      replayOutcomes: Models.replayOutcomes.slice(0, 10),
      backgroundJobs: {
        total: backgroundJobs.length,
        stuck: stuckJobs.length,
      },
      errorClasses,
    };
  },

  search(query) {
    const lowered = query.toLowerCase();
    return {
      incidents: this.listIncidents().filter((item) => JSON.stringify(item).toLowerCase().includes(lowered)).slice(0, 20),
      annotations: Models.operatorAnnotations.filter((item) => JSON.stringify(item).toLowerCase().includes(lowered)).slice(0, 20),
      replays: Models.replayOutcomes.filter((item) => JSON.stringify(item).toLowerCase().includes(lowered)).slice(0, 20),
    };
  },
};

export default OpsService;