/**
 * Referral Model
 * Tracks user referrals, codes, and redemptions
 */

const referralSchema = {
  // Core identifiers
  referrerId: String,           // User who created the referral code
  referralCode: String,         // Unique code (e.g., "REF_A1B2C3D4")
  referredUserId: String,       // User who signed up, null if not redeemed yet

  // Status and dates
  status: {
    type: String,
    enum: ['active', 'redeemed', 'expired', 'cancelled'],
    default: 'active'
  },
  createdAt: { type: Date, default: () => new Date() },
  redeemedAt: Date,
  expiresAt: { type: Date, default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }, // 1 year

  // Rewards
  creditsAwardedToReferrer: { type: Number, default: 500 },    // Credits to referrer ($5 = 500 cents)
  creditsAwardedToReferred: { type: Number, default: 500 },    // Credits to referred user
  creditsAwarded: Boolean,  // Whether credits have been distributed

  // Share tracking
  shareCount: {
    whatsapp: { type: Number, default: 0 },
    twitter: { type: Number, default: 0 },
    email: { type: Number, default: 0 },
    sms: { type: Number, default: 0 },
    direct_link: { type: Number, default: 0 }
  },
  lastSharedAt: Date,

  // Meta
  notes: String,
  metadata: Schema.Types.Mixed
};

// In-memory storage (replace with MongoDB for production)
let referrals = [];
let referralCounter = 1000;

const Referral = {
  // Create a new referral code
  async create(referrerId, creditAmount = 500) {
    const code = `REF_${generateRandomCode()}`;
    
    const referral = {
      _id: `referral_${referralCounter++}`,
      referrerId,
      referralCode: code,
      status: 'active',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      creditsAwardedToReferrer: creditAmount,
      creditsAwardedToReferred: creditAmount,
      creditsAwarded: false,
      shareCount: {
        whatsapp: 0,
        twitter: 0,
        email: 0,
        sms: 0,
        direct_link: 0
      },
      metadata: {}
    };

    referrals.push(referral);
    return referral;
  },

  // Find by code
  async findByCode(code) {
    return referrals.find(r => r.referralCode === code);
  },

  // Find by referrer ID
  async findByReferrerId(referrerId) {
    return referrals.filter(r => r.referrerId === referrerId);
  },

  // Get referrer's stats
  async getStats(referrerId) {
    const userReferrals = await this.findByReferrerId(referrerId);
    const redeemed = userReferrals.filter(r => r.status === 'redeemed');

    return {
      totalInvites: userReferrals.length,
      totalSignups: redeemed.length,
      conversionRate: userReferrals.length > 0 
        ? ((redeemed.length / userReferrals.length) * 100).toFixed(1)
        : 0,
      creditsEarned: redeemed.reduce((sum, r) => sum + (r.creditsAwardedToReferrer || 500), 0),
      shareStats: aggregateShareStats(userReferrals)
    };
  },

  // Redeem a code
  async redeem(code, referredUserId) {
    const referral = await this.findByCode(code);
    
    if (!referral) {
      throw new Error('Invalid referral code');
    }
    if (referral.status === 'redeemed') {
      throw new Error('Referral code already used');
    }
    if (referral.status === 'expired' || new Date() > referral.expiresAt) {
      throw new Error('Referral code expired');
    }

    referral.referredUserId = referredUserId;
    referral.status = 'redeemed';
    referral.redeemedAt = new Date();

    return referral;
  },

  // Award credits for redemption
  async markCreditsAwarded(referralCode) {
    const referral = await this.findByCode(referralCode);
    if (referral) {
      referral.creditsAwarded = true;
    }
    return referral;
  },

  // Track share event
  async trackShare(code, channel) {
    const referral = await this.findByCode(code);
    if (referral && referral.shareCount[channel] !== undefined) {
      referral.shareCount[channel]++;
      referral.lastSharedAt = new Date();
    }
    return referral;
  },

  // Get leaderboard (top referrers this month)
  async getLeaderboard(limit = 10) {
    const now = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const referrerStats = {};

    referrals
      .filter(r => r.status === 'redeemed' && r.redeemedAt >= monthAgo)
      .forEach(r => {
        if (!referrerStats[r.referrerId]) {
          referrerStats[r.referrerId] = {
            referrerId: r.referrerId,
            signups: 0,
            creditsEarned: 0,
            rank: 0
          };
        }
        referrerStats[r.referrerId].signups++;
        referrerStats[r.referrerId].creditsEarned += r.creditsAwardedToReferrer || 500;
      });

    return Object.values(referrerStats)
      .sort((a, b) => b.creditsEarned - a.creditsEarned)
      .slice(0, limit)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
  },

  // Cleanup expired codes
  async cleanupExpired() {
    const now = new Date();
    referrals = referrals.filter(r => r.expiresAt > now || r.status === 'redeemed');
  }
};

function generateRandomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function aggregateShareStats(referrals) {
  return referrals.reduce((acc, r) => {
    acc.whatsapp += r.shareCount?.whatsapp || 0;
    acc.twitter += r.shareCount?.twitter || 0;
    acc.email += r.shareCount?.email || 0;
    acc.sms += r.shareCount?.sms || 0;
    acc.direct_link += r.shareCount?.direct_link || 0;
    return acc;
  }, { whatsapp: 0, twitter: 0, email: 0, sms: 0, direct_link: 0 });
}

export default Referral;
