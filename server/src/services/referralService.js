/**
 * Referral Service
 * Business logic layer for referral operations
 */

import Referral from '../models/Referral.js';
import { logger } from '../logger.js';

const ReferralService = {
  /**
   * Generate a new referral code for a user
   */
  async generateReferralCode(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const referral = await Referral.create(userId, 500); // $5 credit = 500 cents

      logger.info(`Generated referral code for user ${userId}: ${referral.referralCode}`);

      return {
        success: true,
        code: referral.referralCode,
        expiresAt: referral.expiresAt,
        creditAmount: referral.creditAmount
      };
    } catch (error) {
      logger.error('Error generating referral code:', error);
      throw error;
    }
  },

  /**
   * Get user's referral code and stats
   */
  async getUserReferralInfo(userId) {
    try {
      const referral = await Referral.findByReferrerId(userId);

      if (!referral) {
        // Create new referral code if none exists
        return this.generateReferralCode(userId);
      }

      const stats = await Referral.getStats(referral.referralCode);
      const shareStats = referral.shareStats || {};

      return {
        success: true,
        referralCode: referral.referralCode,
        status: referral.status,
        createdAt: referral.createdAt,
        expiresAt: referral.expiresAt,
        stats: {
          totalInvitesCreated: referral.inviteCount || 0,
          totalSignups: referral.redeemedCount || 0,
          conversionRate: referral.redeemedCount && referral.inviteCount
            ? Math.round((referral.redeemedCount / referral.inviteCount) * 100)
            : 0,
          creditsEarned: (referral.redeemedCount || 0) * 5, // $5 per signup
          shareStats: {
            whatsapp: shareStats.whatsapp || 0,
            twitter: shareStats.twitter || 0,
            email: shareStats.email || 0,
            sms: shareStats.sms || 0,
            directLink: shareStats.direct_link || 0
          }
        }
      };
    } catch (error) {
      logger.error('Error fetching user referral info:', error);
      throw error;
    }
  },

  /**
   * Track share event
   */
  async trackShare(referralCode, channel = 'direct_link') {
    try {
      if (!referralCode || !channel) {
        throw new Error('Referral code and channel are required');
      }

      const validChannels = ['whatsapp', 'twitter', 'email', 'sms', 'direct_link'];
      if (!validChannels.includes(channel)) {
        throw new Error(`Invalid channel: ${channel}`);
      }

      const referral = await Referral.trackShare(referralCode, channel);

      logger.info(`Tracked share for code ${referralCode} via ${channel}`);

      return {
        success: true,
        shareCount: referral.shareStats[channel] || 0
      };
    } catch (error) {
      logger.error('Error tracking share:', error);
      throw error;
    }
  },

  /**
   * Redeem referral code on signup
   * Awards credits to both referrer and new user
   */
  async redeemReferralCode(referralCode, newUserId) {
    try {
      if (!referralCode || !newUserId) {
        throw new Error('Referral code and user ID are required');
      }

      const referral = await Referral.findByCode(referralCode);

      if (!referral) {
        return {
          success: false,
          error: 'Invalid or expired referral code'
        };
      }

      if (referral.status !== 'active') {
        return {
          success: false,
          error: 'This referral code is no longer active'
        };
      }

      if (referral.expiresAt && new Date() > referral.expiresAt) {
        return {
          success: false,
          error: 'This referral code has expired'
        };
      }

      // Check if already redeemed by this user
      if (referral.redeemedUsers && referral.redeemedUsers.includes(newUserId)) {
        return {
          success: false,
          error: 'You have already used this referral code'
        };
      }

      // Redeem the referral
      const redeemed = await Referral.redeem(referralCode, newUserId);

      // Award credits (in production, would update user wallet/credits)
      const referrerCredit = 500;  // $5
      const newUserCredit = 250;   // $2.50 welcome bonus

      logger.info(`Redeemed referral code ${referralCode} for user ${newUserId}`);
      logger.info(`Credited referrer ${referral.referrerId} with $5`);
      logger.info(`Credited new user ${newUserId} with $2.50`);

      // TODO: Call user service to award credits
      // await UserService.awardCredits(referral.referrerId, referrerCredit);
      // await UserService.awardCredits(newUserId, newUserCredit);

      return {
        success: true,
        message: 'Referral code redeemed successfully!',
        referrerCredit: referrerCredit / 100, // Convert to dollars
        newUserCredit: newUserCredit / 100,
        referrerId: referral.referrerId
      };
    } catch (error) {
      logger.error('Error redeeming referral code:', error);
      throw error;
    }
  },

  /**
   * Get monthly leaderboard
   */
  async getLeaderboard(limit = 10) {
    try {
      const leaderboard = await Referral.getLeaderboard(limit);

      if (!leaderboard || leaderboard.length === 0) {
        return {
          success: true,
          data: [],
          period: 'this_month',
          timestamp: new Date()
        };
      }

      return {
        success: true,
        data: leaderboard.map((item, index) => ({
          rank: index + 1,
          userId: item.referrerId,
          totalSignups: item.redeemedCount || 0,
          creditsEarned: ((item.redeemedCount || 0) * 5),
          signupsThisMonth: item.signupsThisMonth || 0,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.referrerId}`
        })),
        period: 'this_month',
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error fetching leaderboard:', error);
      throw error;
    }
  },

  /**
   * Get referral analytics for dashboard
   */
  async getReferralAnalytics(userId) {
    try {
      const info = await this.getUserReferralInfo(userId);
      const leaderboard = await this.getLeaderboard(3);

      return {
        success: true,
        userReferral: info,
        topReferrers: leaderboard.data,
        referralProgram: {
          creditPerReferral: 5,
          newUserBonus: 2.50,
          minWithdrawal: 50,
          description: 'Earn $5 for every friend you refer who completes their first job or purchase'
        }
      };
    } catch (error) {
      logger.error('Error fetching referral analytics:', error);
      throw error;
    }
  },

  /**
   * Validate referral code format
   */
  isValidCodeFormat(code) {
    // REF_ followed by 8 alphanumeric characters
    const pattern = /^REF_[A-Z0-9]{8}$/;
    return pattern.test(code);
  },

  /**
   * Generate share message for social media
   */
  generateShareMessage(referralCode, channel = 'whatsapp') {
    const baseUrl = process.env.APP_URL || 'https://moneygeneratorapp.com';
    const referralLink = `${baseUrl}?ref=${referralCode}`;

    const messages = {
      whatsapp: `🎉 Join me on Money Generator App and earn money! Use my code ${referralCode} for an instant $2.50 bonus. ${referralLink}`,
      twitter: `🚀 Just joined @MoneyGeneratorAp and earned money! You can too! 💰 Use code ${referralCode} ${referralLink}`,
      email: `Check out Money Generator App - Earn Money Online!\n\nI've been earning with Money Generator App and I think you'd love it too!\n\nUse my referral code: ${referralCode}\nGet a $2.50 bonus: ${referralLink}\n\nThanks!`,
      sms: `Earn money with Money Generator App! 💵 Use code ${referralCode} for a $2.50 bonus ${referralLink}`,
      direct_link: `Join me on Money Generator App! ${referralLink}`
    };

    return messages[channel] || messages.direct_link;
  }
};

export default ReferralService;
