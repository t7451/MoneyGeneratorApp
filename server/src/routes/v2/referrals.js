/**
 * Referral API Routes
 * v2 API endpoints for referral program
 */

import express from 'express';
import ReferralService from '../../services/referralService.js';
import { logger } from '../../logger.js';

const router = express.Router();

/**
 * POST /api/v2/referrals/generate
 * Generate a new referral code for the current user
 */
router.post('/generate', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const result = await ReferralService.generateReferralCode(userId);
    res.json(result);
  } catch (error) {
    logger.error('Error in POST /generate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate referral code'
    });
  }
});

/**
 * GET /api/v2/referrals/me
 * Get current user's referral info and stats
 */
router.get('/me', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const info = await ReferralService.getUserReferralInfo(userId);
    res.json(info);
  } catch (error) {
    logger.error('Error in GET /me:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch referral info'
    });
  }
});

/**
 * POST /api/v2/referrals/redeem
 * Redeem referral code on user signup
 * Body: { code: "REF_XXXXXXXX" }
 */
router.post('/redeem', async (req, res) => {
  try {
    const { code } = req.body;
    const newUserId = req.user?.id || req.headers['x-user-id'];

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Referral code is required'
      });
    }

    if (!newUserId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    // Validate code format
    if (!ReferralService.isValidCodeFormat(code)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid referral code format'
      });
    }

    const result = await ReferralService.redeemReferralCode(code, newUserId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error in POST /redeem:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to redeem referral code'
    });
  }
});

/**
 * GET /api/v2/referrals/leaderboard
 * Get monthly leaderboard of top referrers
 * Query: ?limit=10
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '10'), 100); // Max 100

    const result = await ReferralService.getLeaderboard(limit);
    res.json(result);
  } catch (error) {
    logger.error('Error in GET /leaderboard:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch leaderboard'
    });
  }
});

/**
 * POST /api/v2/referrals/track-share
 * Track share event for analytics
 * Body: { code: "REF_XXXXXXXX", channel: "whatsapp|twitter|email|sms|direct_link" }
 */
router.post('/track-share', async (req, res) => {
  try {
    const { code, channel = 'direct_link' } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Referral code is required'
      });
    }

    const validChannels = ['whatsapp', 'twitter', 'email', 'sms', 'direct_link'];
    if (!validChannels.includes(channel)) {
      return res.status(400).json({
        success: false,
        error: `Invalid channel. Must be one of: ${validChannels.join(', ')}`
      });
    }

    const result = await ReferralService.trackShare(code, channel);
    res.json(result);
  } catch (error) {
    logger.error('Error in POST /track-share:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to track share'
    });
  }
});

/**
 * GET /api/v2/referrals/analytics
 * Get comprehensive referral analytics for dashboard
 */
router.get('/analytics', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const result = await ReferralService.getReferralAnalytics(userId);
    res.json(result);
  } catch (error) {
    logger.error('Error in GET /analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch analytics'
    });
  }
});

/**
 * GET /api/v2/referrals/share-message
 * Generate pre-formatted share message for social media
 * Query: ?code=REF_XXXXXXXX&channel=whatsapp
 */
router.get('/share-message', (req, res) => {
  try {
    const { code, channel = 'whatsapp' } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Referral code is required'
      });
    }

    const message = ReferralService.generateShareMessage(code, channel);

    res.json({
      success: true,
      code,
      channel,
      message,
      url: `${process.env.APP_URL || 'https://moneygeneratorapp.com'}?ref=${code}`
    });
  } catch (error) {
    logger.error('Error in GET /share-message:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate share message'
    });
  }
});

export default router;
