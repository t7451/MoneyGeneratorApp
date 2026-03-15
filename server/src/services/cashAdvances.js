import { v4 as uuid } from 'uuid';
import { Models } from '../models.js';

// Initialize storage
if (!Models.cashAdvances) Models.cashAdvances = new Map();
if (!Models.advanceEligibility) Models.advanceEligibility = new Map();

// Constants
const MAX_DAILY_ADVANCE = 150; // $150/day max
const MAX_PENDING_ADVANCES = 3;
const MIN_EARNINGS_REQUIRED = 500; // Minimum earnings in last 30 days
const ADVANCE_FEE_PERCENT = 0.05; // 5% fee
const INSTANT_DELIVERY_FEE = 2.99; // Additional fee for instant delivery

export const CashAdvanceService = {
  // Check eligibility for cash advance
  checkEligibility: ({ userId }) => {
    // Get user's earnings in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const recentEarnings = Array.from(Models.gigEarnings?.values() || [])
      .filter(e => e.userId === userId && new Date(e.recordedAt) >= thirtyDaysAgo)
      .reduce((sum, e) => sum + e.amount, 0);

    // Check pending advances
    const pendingAdvances = Array.from(Models.cashAdvances.values())
      .filter(a => a.userId === userId && a.status === 'pending');

    // Calculate available limit
    const _totalPending = pendingAdvances.reduce((sum, a) => sum + a.amount, 0);
    const dailyUsed = Array.from(Models.cashAdvances.values())
      .filter(a => {
        if (a.userId !== userId) return false;
        const today = new Date().toISOString().split('T')[0];
        return a.createdAt.startsWith(today);
      })
      .reduce((sum, a) => sum + a.amount, 0);

    const eligibilityScore = Math.min(100, Math.round((recentEarnings / MIN_EARNINGS_REQUIRED) * 100));
    const isEligible = recentEarnings >= MIN_EARNINGS_REQUIRED && pendingAdvances.length < MAX_PENDING_ADVANCES;
    const availableLimit = isEligible ? Math.max(0, MAX_DAILY_ADVANCE - dailyUsed) : 0;

    const eligibility = {
      userId,
      isEligible,
      eligibilityScore,
      availableLimit,
      maxDailyLimit: MAX_DAILY_ADVANCE,
      dailyUsed,
      pendingAdvances: pendingAdvances.length,
      recentEarnings,
      minimumRequired: MIN_EARNINGS_REQUIRED,
      reasons: [],
      calculatedAt: new Date().toISOString(),
    };

    if (recentEarnings < MIN_EARNINGS_REQUIRED) {
      eligibility.reasons.push(`Need $${MIN_EARNINGS_REQUIRED - recentEarnings} more in earnings to qualify`);
    }
    if (pendingAdvances.length >= MAX_PENDING_ADVANCES) {
      eligibility.reasons.push('Maximum pending advances reached');
    }
    if (dailyUsed >= MAX_DAILY_ADVANCE) {
      eligibility.reasons.push('Daily limit reached');
    }

    Models.advanceEligibility.set(userId, eligibility);
    return eligibility;
  },

  // Request a cash advance
  requestAdvance: ({ userId, amount, deliveryMethod = 'standard', destination }) => {
    const eligibility = CashAdvanceService.checkEligibility({ userId });
    
    if (!eligibility.isEligible) {
      throw new Error('not_eligible_for_advance');
    }
    if (amount > eligibility.availableLimit) {
      throw new Error('amount_exceeds_available_limit');
    }
    if (amount <= 0) {
      throw new Error('invalid_amount');
    }

    // Calculate fees
    const baseFee = Math.round(amount * ADVANCE_FEE_PERCENT * 100) / 100;
    const instantFee = deliveryMethod === 'instant' ? INSTANT_DELIVERY_FEE : 0;
    const totalFee = baseFee + instantFee;
    const netAmount = amount - totalFee;

    const advance = {
      id: uuid(),
      userId,
      amount,
      netAmount,
      fee: totalFee,
      feeBreakdown: {
        baseFee,
        instantFee,
      },
      deliveryMethod,
      destination: destination || 'primary_debit',
      status: 'pending',
      createdAt: new Date().toISOString(),
      estimatedDelivery: deliveryMethod === 'instant' 
        ? new Date(Date.now() + 60000).toISOString() // 1 minute
        : new Date(Date.now() + 86400000).toISOString(), // 1 day
      repaymentDueDate: new Date(Date.now() + 14 * 86400000).toISOString(), // 14 days
    };

    Models.cashAdvances.set(advance.id, advance);
    Models.auditLog.push({ type: 'cash_advance_requested', advance });
    Models.metrics.increment('cash_advance.requested');

    return advance;
  },

  // Process advance (simulates payout)
  processAdvance: ({ advanceId }) => {
    const advance = Models.cashAdvances.get(advanceId);
    if (!advance) {
      throw new Error('advance_not_found');
    }
    if (advance.status !== 'pending') {
      throw new Error('advance_already_processed');
    }

    advance.status = 'disbursed';
    advance.disbursedAt = new Date().toISOString();
    Models.auditLog.push({ type: 'cash_advance_disbursed', advanceId });
    Models.metrics.increment('cash_advance.disbursed');

    return advance;
  },

  // Repay advance
  repayAdvance: ({ advanceId, amount }) => {
    const advance = Models.cashAdvances.get(advanceId);
    if (!advance) {
      throw new Error('advance_not_found');
    }
    if (advance.status === 'repaid') {
      throw new Error('advance_already_repaid');
    }

    advance.repaidAmount = (advance.repaidAmount || 0) + amount;
    
    if (advance.repaidAmount >= advance.amount) {
      advance.status = 'repaid';
      advance.repaidAt = new Date().toISOString();
      Models.metrics.increment('cash_advance.repaid');
    }

    Models.auditLog.push({ type: 'cash_advance_payment', advanceId, amount });
    return advance;
  },

  // Get user's advance history
  getAdvanceHistory: ({ userId, status, limit = 20 }) => {
    let advances = Array.from(Models.cashAdvances.values())
      .filter(a => a.userId === userId);
    
    if (status) {
      advances = advances.filter(a => a.status === status);
    }

    advances.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return {
      advances: advances.slice(0, limit),
      total: advances.length,
      pendingTotal: advances.filter(a => a.status === 'pending').reduce((sum, a) => sum + a.amount, 0),
      outstandingTotal: advances.filter(a => a.status === 'disbursed').reduce((sum, a) => sum + a.amount - (a.repaidAmount || 0), 0),
    };
  },

  // Get advance terms
  getTerms: () => ({
    maxDailyAdvance: MAX_DAILY_ADVANCE,
    maxPendingAdvances: MAX_PENDING_ADVANCES,
    minEarningsRequired: MIN_EARNINGS_REQUIRED,
    feePercent: ADVANCE_FEE_PERCENT * 100,
    instantDeliveryFee: INSTANT_DELIVERY_FEE,
    repaymentPeriodDays: 14,
    deliveryMethods: [
      { id: 'standard', name: 'Standard (1-2 days)', fee: 0 },
      { id: 'instant', name: 'Instant (< 60 seconds)', fee: INSTANT_DELIVERY_FEE },
    ],
  }),
};
