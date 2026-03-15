import { v4 as uuid } from 'uuid';
import { Models } from '../models.js';

// Supported gig platform integrations
export const GigPlatforms = {
  LOCAL_MISSIONS: ['taskrabbit', 'instawork', 'handy', 'thumbtack'],
  DIGITAL_SERVICES: ['fiverr', 'upwork', 'contra', 'toptal', 'freelancer'],
  SHIFT_BASED: ['uber', 'lyft', 'doordash', 'instacart', 'shipt', 'grubhub', 'amazon_flex'],
};

// Initialize storage
if (!Models.gigConnections) Models.gigConnections = new Map();
if (!Models.gigJobs) Models.gigJobs = new Map();
if (!Models.gigEarnings) Models.gigEarnings = new Map();
if (!Models.gigShifts) Models.gigShifts = new Map();

export const GigPlatformService = {
  // Connect a user to a gig platform
  connectPlatform: ({ userId, platform, credentials, correlationId }) => {
    const connection = {
      id: uuid(),
      userId,
      platform,
      status: 'connected',
      connectedAt: new Date().toISOString(),
      lastSyncAt: null,
      credentials: { token: '***REDACTED***' }, // Never store raw credentials
      correlationId,
    };
    Models.gigConnections.set(connection.id, connection);
    Models.auditLog.push({ type: 'gig_platform_connected', connection: { ...connection, credentials: undefined } });
    Models.metrics.increment('gig.platforms.connected');
    return { id: connection.id, platform, status: 'connected' };
  },

  // Disconnect a platform
  disconnectPlatform: ({ connectionId, userId }) => {
    const connection = Models.gigConnections.get(connectionId);
    if (!connection || connection.userId !== userId) {
      throw new Error('connection_not_found');
    }
    connection.status = 'disconnected';
    connection.disconnectedAt = new Date().toISOString();
    Models.auditLog.push({ type: 'gig_platform_disconnected', connectionId });
    return { id: connectionId, status: 'disconnected' };
  },

  // Get user's connected platforms
  getConnectedPlatforms: (userId) => {
    return Array.from(Models.gigConnections.values())
      .filter(c => c.userId === userId && c.status === 'connected')
      .map(c => ({
        id: c.id,
        platform: c.platform,
        status: c.status,
        connectedAt: c.connectedAt,
        lastSyncAt: c.lastSyncAt,
      }));
  },

  // Fetch jobs from connected platforms (aggregated feed)
  fetchAggregatedJobs: ({ userId, category, limit = 20, offset = 0 }) => {
    // In production, this would call each connected platform's API
    const _connections = GigPlatformService.getConnectedPlatforms(userId);
    const platformCategories = {
      local: GigPlatforms.LOCAL_MISSIONS,
      digital: GigPlatforms.DIGITAL_SERVICES,
      shift: GigPlatforms.SHIFT_BASED,
    };

    const filterPlatforms = category ? platformCategories[category] || [] : null;
    
    // Simulated job feed - in production would aggregate from real APIs
    const jobs = Array.from(Models.gigJobs.values())
      .filter(job => {
        if (filterPlatforms && !filterPlatforms.includes(job.platform)) return false;
        return true;
      })
      .slice(offset, offset + limit);

    return {
      jobs,
      total: jobs.length,
      hasMore: jobs.length === limit,
    };
  },

  // Record earnings from a gig
  recordEarnings: ({ userId, platform, amount, currency = 'USD', shiftId, metadata }) => {
    const earning = {
      id: uuid(),
      userId,
      platform,
      amount,
      currency,
      shiftId,
      recordedAt: new Date().toISOString(),
      metadata: metadata || {},
    };
    Models.gigEarnings.set(earning.id, earning);
    Models.metrics.increment('gig.earnings.recorded');
    return earning;
  },

  // Get earnings summary
  getEarningsSummary: ({ userId, startDate, endDate, groupBy = 'platform' }) => {
    const earnings = Array.from(Models.gigEarnings.values())
      .filter(e => {
        if (e.userId !== userId) return false;
        const date = new Date(e.recordedAt);
        if (startDate && date < new Date(startDate)) return false;
        if (endDate && date > new Date(endDate)) return false;
        return true;
      });

    const totals = {};
    let grandTotal = 0;

    for (const earning of earnings) {
      const key = groupBy === 'platform' ? earning.platform : earning.recordedAt.split('T')[0];
      totals[key] = (totals[key] || 0) + earning.amount;
      grandTotal += earning.amount;
    }

    return {
      breakdown: totals,
      total: grandTotal,
      count: earnings.length,
      period: { startDate, endDate },
    };
  },

  // Record a shift
  recordShift: ({ userId, platform, startTime, endTime, earnings, mileage, expenses, metadata }) => {
    const shift = {
      id: uuid(),
      userId,
      platform,
      startTime,
      endTime,
      durationMinutes: endTime && startTime 
        ? Math.round((new Date(endTime) - new Date(startTime)) / 60000)
        : null,
      earnings: earnings || 0,
      mileage: mileage || 0,
      expenses: expenses || 0,
      netEarnings: (earnings || 0) - (expenses || 0),
      hourlyRate: null,
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
    };

    // Calculate hourly rate
    if (shift.durationMinutes && shift.durationMinutes > 0) {
      shift.hourlyRate = (shift.netEarnings / shift.durationMinutes) * 60;
    }

    Models.gigShifts.set(shift.id, shift);
    Models.metrics.increment('gig.shifts.recorded');
    return shift;
  },

  // Get shift analytics
  getShiftAnalytics: ({ userId, startDate, endDate }) => {
    const shifts = Array.from(Models.gigShifts.values())
      .filter(s => {
        if (s.userId !== userId) return false;
        const date = new Date(s.createdAt);
        if (startDate && date < new Date(startDate)) return false;
        if (endDate && date > new Date(endDate)) return false;
        return true;
      });

    const totalEarnings = shifts.reduce((sum, s) => sum + s.earnings, 0);
    const totalExpenses = shifts.reduce((sum, s) => sum + s.expenses, 0);
    const totalMileage = shifts.reduce((sum, s) => sum + s.mileage, 0);
    const totalMinutes = shifts.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const avgHourlyRate = totalMinutes > 0 ? ((totalEarnings - totalExpenses) / totalMinutes) * 60 : 0;

    // Platform breakdown
    const byPlatform = {};
    for (const shift of shifts) {
      if (!byPlatform[shift.platform]) {
        byPlatform[shift.platform] = { earnings: 0, shifts: 0, mileage: 0, minutes: 0 };
      }
      byPlatform[shift.platform].earnings += shift.earnings;
      byPlatform[shift.platform].shifts += 1;
      byPlatform[shift.platform].mileage += shift.mileage;
      byPlatform[shift.platform].minutes += shift.durationMinutes || 0;
    }

    return {
      totalShifts: shifts.length,
      totalEarnings,
      totalExpenses,
      netEarnings: totalEarnings - totalExpenses,
      totalMileage,
      totalHours: Math.round(totalMinutes / 60 * 100) / 100,
      avgHourlyRate: Math.round(avgHourlyRate * 100) / 100,
      byPlatform,
      period: { startDate, endDate },
    };
  },

  // Get supported platforms
  getSupportedPlatforms: () => ({
    localMissions: GigPlatforms.LOCAL_MISSIONS.map(p => ({
      id: p,
      name: p.charAt(0).toUpperCase() + p.slice(1).replace('_', ' '),
      category: 'local',
      features: ['geofenced_availability', 'instant_cashout', 'mileage_tracking'],
    })),
    digitalServices: GigPlatforms.DIGITAL_SERVICES.map(p => ({
      id: p,
      name: p.charAt(0).toUpperCase() + p.slice(1).replace('_', ' '),
      category: 'digital',
      features: ['portfolio_profiles', 'proposal_templates', 'rating_sync'],
    })),
    shiftBased: GigPlatforms.SHIFT_BASED.map(p => ({
      id: p,
      name: p.charAt(0).toUpperCase() + p.slice(1).replace('_', ' '),
      category: 'shift',
      features: ['shift_bidding', 'earnings_heatmap', 'route_optimization'],
    })),
  }),
};
