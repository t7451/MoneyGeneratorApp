import { useState, useEffect, useCallback } from 'react';
import './CreditsHub.css';
import { apiFetchJson, getUserId } from '../lib/apiClient';

interface CreditBalance {
  available: number;
  pending: number;
  lifetime: number;
  redeemed: number;
  availableUsd: string;
  pendingUsd: string;
  lifetimeUsd: string;
  redeemedUsd: string;
  canRedeem: boolean;
  minRedemptionUsd: string;
}

interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  canCheckin: boolean;
  nextMilestone?: number;
}

interface Survey {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedMinutes: number;
  credits: number;
  creditsUsd: string;
}

interface Game {
  id: string;
  name: string;
  description: string;
  icon: string;
  rewardType: string;
  rewardCredits?: number;
  rewardCreditsMin?: number;
  rewardCreditsMax?: number;
  dailyLimit: number;
}

interface Offer {
  id: string;
  title: string;
  description: string;
  category: string;
  credits: number;
  creditsUsd: string;
  requirements: string[];
  estimatedMinutes: number;
  icon: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  credits: number;
  creditsUsd: string;
  estimatedMinutes: number;
  icon: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  credits: number;
  earnedAt?: string;
}

interface RedemptionOption {
  type: string;
  name: string;
  minCredits: number;
  minUsd: string;
  processingDays: number;
  icon: string;
  denominations?: number[];
}

interface Retailer {
  id: string;
  name: string;
  cashbackPercent: number;
  icon: string;
  category: string;
}

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  createdAt: string;
  status: string;
}

interface DashboardStats {
  todayEarnings: number;
  todayEarningsUsd: string;
  weekEarnings: number;
  weekEarningsUsd: string;
  activityCounts: Record<string, number>;
  pendingTransactions: number;
}

interface CreditsHubProps {
  userId?: string;
  onBalanceChange?: (balance: CreditBalance) => void;
}

type TabType = 'earn' | 'redeem' | 'history' | 'achievements';
type EarnSection = 'all' | 'surveys' | 'games' | 'offers' | 'tasks' | 'videos' | 'social' | 'cashback';

export function CreditsHub({ userId = 'demo-user', onBalanceChange }: CreditsHubProps) {
  const effectiveUserId = userId || getUserId();
  const [activeTab, setActiveTab] = useState<TabType>('earn');
  const [earnSection, setEarnSection] = useState<EarnSection>('all');
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [achievements, setAchievements] = useState<{ earned: Achievement[]; available: Achievement[] }>({ earned: [], available: [] });
  const [redemptionOptions, setRedemptionOptions] = useState<RedemptionOption[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [videoAds, setVideoAds] = useState<{ available: boolean; remaining: number; creditsPerAd: number }>({ available: false, remaining: 0, creditsPerAd: 0 });
  const [referralCode, setReferralCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // API helper
  const api = useCallback(async (path: string, options?: RequestInit) => {
    return await apiFetchJson<any>(`/api/v1${path}`, {
      ...options,
      body: (options as any)?.body,
    } as any);
  }, []);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load dashboard data
  const loadDashboard = useCallback(async () => {
    try {
      const [dashboard, surveysData, gamesData, offersData, tasksData, redemptions, achievementsData, retailersData, videoData, referralData] = await Promise.all([
        api(`/credits/dashboard?userId=${effectiveUserId}`),
        api(`/credits/surveys?userId=${effectiveUserId}`),
        api(`/credits/games`),
        api(`/credits/offers?userId=${effectiveUserId}`),
        api(`/credits/tasks?userId=${effectiveUserId}`),
        api(`/credits/redemptions/options`),
        api(`/credits/achievements?userId=${effectiveUserId}`),
        api(`/credits/cashback/retailers`),
        api(`/credits/ads/video?userId=${effectiveUserId}`),
        api(`/credits/referral?userId=${effectiveUserId}`),
      ]);

      setBalance(dashboard.balance);
      setStreak(dashboard.streak);
      setStats(dashboard.stats);
      setSurveys(surveysData.surveys || []);
      setGames(gamesData.games || []);
      setOffers(offersData.offers || []);
      setTasks(tasksData.tasks || []);
      setRedemptionOptions(redemptions.options || []);
      setAchievements(achievementsData);
      setRetailers(retailersData.retailers || []);
      setVideoAds(videoData);
      setReferralCode(referralData.code || '');
      onBalanceChange?.(dashboard.balance);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [api, effectiveUserId, onBalanceChange]);

  // Load transactions
  const loadTransactions = useCallback(async () => {
    try {
      const data = await api(`/credits/transactions?userId=${effectiveUserId}&limit=50`);
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  }, [api, effectiveUserId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadTransactions();
    }
  }, [activeTab, loadTransactions]);

  // Daily check-in
  const handleCheckin = async () => {
    if (!streak?.canCheckin) return;
    setActionLoading('checkin');
    try {
      const result = await api('/credits/checkin', {
        method: 'POST',
        body: JSON.stringify({ userId: effectiveUserId }),
      });
      setStreak({ ...streak, canCheckin: false, currentStreak: result.currentStreak });
      setBalance(result.balance);
      showToast(`Day ${result.currentStreak} check-in! +${result.credits} credits`);
      onBalanceChange?.(result.balance);
    } catch (error) {
      showToast('Check-in failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Watch video ad
  const handleWatchAd = async () => {
    if (!videoAds.available) return;
    setActionLoading('video');
    try {
      const result = await api('/credits/ads/video/watch', {
        method: 'POST',
        body: JSON.stringify({ userId: effectiveUserId }),
      });
      if (result.credits > 0) {
        setBalance(result.balance);
        setVideoAds({ ...videoAds, remaining: videoAds.remaining - 1, available: videoAds.remaining > 1 });
        showToast(`+${result.credits} credits for watching ad`);
        onBalanceChange?.(result.balance);
      } else {
        showToast(result.message || 'No more ads available', 'error');
      }
    } catch (error) {
      showToast('Failed to record ad watch', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Complete survey (demo)
  const handleCompleteSurvey = async (surveyId: string) => {
    setActionLoading(`survey-${surveyId}`);
    try {
      const result = await api(`/credits/surveys/${surveyId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ userId: effectiveUserId, answers: { demo: true } }),
      });
      setSurveys(surveys.filter(s => s.id !== surveyId));
      setBalance(result.balance);
      showToast(`Survey completed! +${result.response.credits} credits`);
      onBalanceChange?.(result.balance);
    } catch (error) {
      showToast('Survey completion failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Play game
  const handlePlayGame = async (gameId: string) => {
    setActionLoading(`game-${gameId}`);
    try {
      const result = await api(`/credits/games/${gameId}/play`, {
        method: 'POST',
        body: JSON.stringify({ userId: effectiveUserId, result: 'win', score: Math.floor(Math.random() * 1000) }),
      });
      if (result.credits > 0) {
        setBalance(result.balance);
        showToast(`Game played! +${result.credits} credits`);
        onBalanceChange?.(result.balance);
      } else {
        showToast(result.message || 'No credits earned', 'error');
      }
    } catch (error) {
      showToast('Game play failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Complete task
  const handleCompleteTask = async (taskId: string) => {
    setActionLoading(`task-${taskId}`);
    try {
      const result = await api(`/credits/tasks/${taskId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ userId: effectiveUserId, result: { completed: true } }),
      });
      setTasks(tasks.filter(t => t.id !== taskId));
      setBalance(result.balance);
      showToast(`Task completed! +${result.activity.credits} credits`);
      onBalanceChange?.(result.balance);
    } catch (error) {
      showToast('Task completion failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Complete offer
  const handleCompleteOffer = async (offerId: string) => {
    setActionLoading(`offer-${offerId}`);
    try {
      const result = await api(`/credits/offers/${offerId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ userId: effectiveUserId }),
      });
      setOffers(offers.filter(o => o.id !== offerId));
      setBalance(result.balance);
      showToast(`Offer completed! Credits pending verification`);
      onBalanceChange?.(result.balance);
    } catch (error) {
      showToast('Offer completion failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Social share
  const handleSocialShare = async (platform: string) => {
    setActionLoading(`social-${platform}`);
    try {
      const result = await api('/credits/social/share', {
        method: 'POST',
        body: JSON.stringify({ userId: effectiveUserId, platform, contentType: 'app' }),
      });
      setBalance(result.balance);
      showToast(`Shared on ${platform}! +${result.activity.credits} credits`);
      onBalanceChange?.(result.balance);
    } catch (error) {
      showToast('Share failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Request redemption
  const handleRedemption = async (type: string, credits: number) => {
    if (!balance || balance.available < credits) {
      showToast('Insufficient credits', 'error');
      return;
    }
    setActionLoading(`redeem-${type}`);
    try {
      const result = await api('/credits/redemptions', {
        method: 'POST',
        body: JSON.stringify({ userId: effectiveUserId, type, credits }),
      });
      setBalance(result.balance);
      showToast(`Redemption requested! $${result.redemption.usdValue} on the way`);
      onBalanceChange?.(result.balance);
    } catch (error) {
      showToast('Redemption failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Copy referral code
  const handleCopyReferral = () => {
    navigator.clipboard.writeText(`https://app.moneygenerator.com/join?ref=${referralCode}`);
    showToast('Referral link copied!');
  };

  if (loading) {
    return (
      <div className="credits-hub">
        <div className="credits-loading">
          <div className="loading-spinner" />
          <span>Loading credits...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="credits-hub">
      {/* Toast Notification */}
      {toast && (
        <div className={`credits-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Balance Header */}
      <div className="credits-header">
        <div className="balance-card">
          <div className="balance-main">
            <span className="balance-label">Available Credits</span>
            <span className="balance-value">{balance?.available.toLocaleString() || 0}</span>
            <span className="balance-usd">${balance?.availableUsd || '0.00'}</span>
          </div>
          <div className="balance-stats">
            <div className="balance-stat">
              <span className="stat-value">{balance?.pending.toLocaleString() || 0}</span>
              <span className="stat-label">Pending</span>
            </div>
            <div className="balance-stat">
              <span className="stat-value">${stats?.todayEarningsUsd || '0.00'}</span>
              <span className="stat-label">Today</span>
            </div>
            <div className="balance-stat">
              <span className="stat-value">${stats?.weekEarningsUsd || '0.00'}</span>
              <span className="stat-label">This Week</span>
            </div>
          </div>
        </div>

        {/* Streak & Check-in */}
        <div className="streak-card">
          <div className="streak-info">
            <span className="streak-icon">🔥</span>
            <span className="streak-count">{streak?.currentStreak || 0}</span>
            <span className="streak-label">Day Streak</span>
          </div>
          <button
            className={`checkin-btn ${!streak?.canCheckin ? 'disabled' : ''}`}
            onClick={handleCheckin}
            disabled={!streak?.canCheckin || actionLoading === 'checkin'}
          >
            {actionLoading === 'checkin' ? '...' : streak?.canCheckin ? 'Check In' : 'Checked ✓'}
          </button>
          {streak?.nextMilestone && (
            <span className="next-milestone">Next bonus at Day {streak.nextMilestone}</span>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="credits-tabs">
        <button
          className={`tab-btn ${activeTab === 'earn' ? 'active' : ''}`}
          onClick={() => setActiveTab('earn')}
        >
          💰 Earn
        </button>
        <button
          className={`tab-btn ${activeTab === 'redeem' ? 'active' : ''}`}
          onClick={() => setActiveTab('redeem')}
        >
          🎁 Redeem
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 History
        </button>
        <button
          className={`tab-btn ${activeTab === 'achievements' ? 'active' : ''}`}
          onClick={() => setActiveTab('achievements')}
        >
          🏆 Achievements
        </button>
      </div>

      {/* Tab Content */}
      <div className="credits-content">
        {/* EARN TAB */}
        {activeTab === 'earn' && (
          <div className="earn-content">
            {/* Earn Category Filter */}
            <div className="earn-categories">
              {(['all', 'surveys', 'games', 'offers', 'tasks', 'videos', 'social', 'cashback'] as EarnSection[]).map(section => (
                <button
                  key={section}
                  className={`category-btn ${earnSection === section ? 'active' : ''}`}
                  onClick={() => setEarnSection(section)}
                >
                  {section === 'all' && '🌟'}
                  {section === 'surveys' && '📋'}
                  {section === 'games' && '🎮'}
                  {section === 'offers' && '🎯'}
                  {section === 'tasks' && '✅'}
                  {section === 'videos' && '📺'}
                  {section === 'social' && '📱'}
                  {section === 'cashback' && '💸'}
                  <span>{section.charAt(0).toUpperCase() + section.slice(1)}</span>
                </button>
              ))}
            </div>

            {/* Surveys Section */}
            {(earnSection === 'all' || earnSection === 'surveys') && surveys.length > 0 && (
              <div className="earn-section">
                <h3 className="section-title">📋 Surveys</h3>
                <div className="activity-grid">
                  {surveys.slice(0, earnSection === 'all' ? 3 : 10).map(survey => (
                    <div key={survey.id} className="activity-card">
                      <div className="activity-header">
                        <span className="activity-category">{survey.category}</span>
                        <span className="activity-time">{survey.estimatedMinutes} min</span>
                      </div>
                      <h4 className="activity-title">{survey.title}</h4>
                      <p className="activity-desc">{survey.description}</p>
                      <div className="activity-footer">
                        <span className="activity-reward">+{survey.credits} credits</span>
                        <button
                          className="activity-btn"
                          onClick={() => handleCompleteSurvey(survey.id)}
                          disabled={actionLoading === `survey-${survey.id}`}
                        >
                          {actionLoading === `survey-${survey.id}` ? '...' : 'Start'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Games Section */}
            {(earnSection === 'all' || earnSection === 'games') && games.length > 0 && (
              <div className="earn-section">
                <h3 className="section-title">🎮 Games</h3>
                <div className="activity-grid games-grid">
                  {games.slice(0, earnSection === 'all' ? 4 : 10).map(game => (
                    <div key={game.id} className="game-card">
                      <span className="game-icon">{game.icon}</span>
                      <h4 className="game-name">{game.name}</h4>
                      <p className="game-desc">{game.description}</p>
                      <div className="game-reward">
                        {game.rewardType === 'random' 
                          ? `${game.rewardCreditsMin}-${game.rewardCreditsMax} credits`
                          : `+${game.rewardCredits} credits`
                        }
                      </div>
                      <button
                        className="game-btn"
                        onClick={() => handlePlayGame(game.id)}
                        disabled={actionLoading === `game-${game.id}`}
                      >
                        {actionLoading === `game-${game.id}` ? '...' : 'Play'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Offers Section */}
            {(earnSection === 'all' || earnSection === 'offers') && offers.length > 0 && (
              <div className="earn-section">
                <h3 className="section-title">🎯 Offers & App Installs</h3>
                <div className="offers-list">
                  {offers.slice(0, earnSection === 'all' ? 3 : 10).map(offer => (
                    <div key={offer.id} className="offer-card">
                      <span className="offer-icon">{offer.icon}</span>
                      <div className="offer-content">
                        <h4 className="offer-title">{offer.title}</h4>
                        <p className="offer-desc">{offer.description}</p>
                        <div className="offer-requirements">
                          {offer.requirements.map((req, i) => (
                            <span key={i} className="requirement">• {req}</span>
                          ))}
                        </div>
                      </div>
                      <div className="offer-action">
                        <span className="offer-reward">+{offer.credits}</span>
                        <span className="offer-usd">${offer.creditsUsd}</span>
                        <button
                          className="offer-btn"
                          onClick={() => handleCompleteOffer(offer.id)}
                          disabled={actionLoading === `offer-${offer.id}`}
                        >
                          {actionLoading === `offer-${offer.id}` ? '...' : 'Start'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks Section */}
            {(earnSection === 'all' || earnSection === 'tasks') && tasks.length > 0 && (
              <div className="earn-section">
                <h3 className="section-title">✅ Micro Tasks</h3>
                <div className="tasks-list">
                  {tasks.slice(0, earnSection === 'all' ? 3 : 10).map(task => (
                    <div key={task.id} className="task-card">
                      <span className="task-icon">{task.icon}</span>
                      <div className="task-content">
                        <h4 className="task-title">{task.title}</h4>
                        <p className="task-desc">{task.description}</p>
                        <span className="task-time">~{task.estimatedMinutes} min</span>
                      </div>
                      <div className="task-action">
                        <span className="task-reward">+{task.credits}</span>
                        <button
                          className="task-btn"
                          onClick={() => handleCompleteTask(task.id)}
                          disabled={actionLoading === `task-${task.id}`}
                        >
                          {actionLoading === `task-${task.id}` ? '...' : 'Start'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Video Ads Section */}
            {(earnSection === 'all' || earnSection === 'videos') && (
              <div className="earn-section">
                <h3 className="section-title">📺 Watch & Earn</h3>
                <div className="video-section">
                  <div className="video-card">
                    <span className="video-icon">🎬</span>
                    <div className="video-info">
                      <h4>Watch Video Ads</h4>
                      <p>Earn {videoAds.creditsPerAd} credits per video</p>
                      <span className="video-remaining">{videoAds.remaining} videos remaining today</span>
                    </div>
                    <button
                      className="video-btn"
                      onClick={handleWatchAd}
                      disabled={!videoAds.available || actionLoading === 'video'}
                    >
                      {actionLoading === 'video' ? '...' : videoAds.available ? 'Watch Ad' : 'Limit Reached'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Social Section */}
            {(earnSection === 'all' || earnSection === 'social') && (
              <div className="earn-section">
                <h3 className="section-title">📱 Social Sharing</h3>
                <div className="social-grid">
                  {[
                    { id: 'twitter', name: 'Twitter/X', icon: '🐦' },
                    { id: 'facebook', name: 'Facebook', icon: '👤' },
                    { id: 'instagram', name: 'Instagram', icon: '📷' },
                    { id: 'tiktok', name: 'TikTok', icon: '🎵' },
                  ].map(platform => (
                    <button
                      key={platform.id}
                      className="social-btn"
                      onClick={() => handleSocialShare(platform.id)}
                      disabled={actionLoading === `social-${platform.id}`}
                    >
                      <span className="social-icon">{platform.icon}</span>
                      <span className="social-name">{platform.name}</span>
                      <span className="social-reward">+10 credits</span>
                    </button>
                  ))}
                </div>

                {/* Referral Section */}
                <div className="referral-card">
                  <h4>🎁 Refer Friends</h4>
                  <p>Earn 500 credits ($5) for each friend who signs up!</p>
                  <div className="referral-code-box">
                    <input
                      type="text"
                      value={`moneygenerator.com/join?ref=${referralCode}`}
                      readOnly
                      aria-label="Referral link"
                      title="Referral link"
                    />
                    <button onClick={handleCopyReferral}>Copy</button>
                  </div>
                </div>
              </div>
            )}

            {/* Cashback Section */}
            {(earnSection === 'all' || earnSection === 'cashback') && retailers.length > 0 && (
              <div className="earn-section">
                <h3 className="section-title">💸 Cashback Shopping</h3>
                <div className="retailer-grid">
                  {retailers.slice(0, earnSection === 'all' ? 6 : 20).map(retailer => (
                    <div key={retailer.id} className="retailer-card">
                      <span className="retailer-icon">{retailer.icon}</span>
                      <span className="retailer-name">{retailer.name}</span>
                      <span className="retailer-cashback">{retailer.cashbackPercent}% back</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* REDEEM TAB */}
        {activeTab === 'redeem' && (
          <div className="redeem-content">
            <div className="redeem-balance">
              <span>Available to redeem:</span>
              <strong>{balance?.available.toLocaleString()} credits (${balance?.availableUsd})</strong>
            </div>
            
            {!balance?.canRedeem && (
              <div className="redeem-notice">
                Minimum ${balance?.minRedemptionUsd} required for redemption. Keep earning!
              </div>
            )}

            <div className="redemption-grid">
              {redemptionOptions.map(option => (
                <div key={option.type} className="redemption-card">
                  <span className="redemption-icon">{option.icon}</span>
                  <h4 className="redemption-name">{option.name}</h4>
                  <span className="redemption-min">Min: ${option.minUsd}</span>
                  <span className="redemption-time">{option.processingDays === 0 ? 'Instant' : `${option.processingDays} days`}</span>
                  
                  {option.denominations ? (
                    <div className="redemption-denominations">
                      {option.denominations.filter(d => d <= (balance?.available || 0)).slice(0, 3).map(credits => (
                        <button
                          key={credits}
                          className="denom-btn"
                          onClick={() => handleRedemption(option.type, credits)}
                          disabled={!balance?.canRedeem || actionLoading === `redeem-${option.type}`}
                        >
                          ${(credits / 100).toFixed(0)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button
                      className="redeem-btn"
                      onClick={() => handleRedemption(option.type, option.minCredits)}
                      disabled={!balance?.canRedeem || (balance?.available || 0) < option.minCredits || actionLoading === `redeem-${option.type}`}
                    >
                      {actionLoading === `redeem-${option.type}` ? '...' : 'Redeem'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="history-content">
            <div className="history-stats">
              <div className="history-stat">
                <span className="stat-label">Lifetime Earned</span>
                <span className="stat-value">${balance?.lifetimeUsd}</span>
              </div>
              <div className="history-stat">
                <span className="stat-label">Total Redeemed</span>
                <span className="stat-value">${balance?.redeemedUsd}</span>
              </div>
            </div>

            <div className="transactions-list">
              {transactions.length === 0 ? (
                <div className="empty-state">
                  <span>📭</span>
                  <p>No transactions yet. Start earning credits!</p>
                </div>
              ) : (
                transactions.map(tx => (
                  <div key={tx.id} className={`transaction-item ${tx.type}`}>
                    <div className="tx-info">
                      <span className="tx-desc">{tx.description}</span>
                      <span className="tx-date">{new Date(tx.createdAt).toLocaleDateString()}</span>
                    </div>
                    <span className={`tx-amount ${tx.type}`}>
                      {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                    </span>
                    {tx.status === 'pending' && <span className="tx-status">Pending</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ACHIEVEMENTS TAB */}
        {activeTab === 'achievements' && (
          <div className="achievements-content">
            <div className="achievements-progress">
              <span>🏆 {achievements.earned.length} / {achievements.earned.length + achievements.available.length} Achievements Unlocked</span>
            </div>

            <h3>Unlocked</h3>
            <div className="achievements-grid">
              {achievements.earned.length === 0 ? (
                <p className="empty-text">Complete activities to unlock achievements!</p>
              ) : (
                achievements.earned.map(ach => (
                  <div key={ach.id} className="achievement-card unlocked">
                    <span className="achievement-icon">🏅</span>
                    <h4>{ach.name}</h4>
                    <p>{ach.description}</p>
                    <span className="achievement-reward">+{ach.credits} credits</span>
                  </div>
                ))
              )}
            </div>

            <h3>Available</h3>
            <div className="achievements-grid">
              {achievements.available.map(ach => (
                <div key={ach.id} className="achievement-card locked">
                  <span className="achievement-icon">🔒</span>
                  <h4>{ach.name}</h4>
                  <p>{ach.description}</p>
                  <span className="achievement-reward">+{ach.credits} credits</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CreditsHub;
