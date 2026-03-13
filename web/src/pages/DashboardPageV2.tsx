import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardBody, CardFooter } from '../components/Card';
import { Button } from '../components/Button';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { useNavigate } from 'react-router-dom';
import { apiFetchJson, getUserId } from '../lib/apiClient';
import './DashboardPageV2.css';

interface StatItem {
  label: string;
  value: string | number;
  trend?: {
    direction: 'up' | 'down';
    percent: number;
  };
  icon?: React.ReactNode;
}

interface InsightItem {
  type: 'positive' | 'neutral' | 'warning';
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export const DashboardPageV2: React.FC = () => {
  const { userProfile, connectBank, openCheckout } = useAppContext();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatItem[]>([]);
  const [insights, setInsights] = useState<InsightItem[]>([]);

  useEffect(() => {
    // Load dashboard data
    setStats([
      {
        label: 'Total Earnings',
        value: `$${userProfile.earnings.toLocaleString()}`,
        trend: { direction: 'up', percent: userProfile.weeklyChange },
        icon: <TrendingUp size={20} />,
      },
      {
        label: 'This Week',
        value: `$${(userProfile.earnings / 4).toLocaleString()}`,
        trend: { direction: 'up', percent: 8 },
      },
      {
        label: 'Hourly Rate',
        value: '$17.50',
        trend: { direction: 'up', percent: 5 },
      },
      {
        label: 'Hours Worked',
        value: '142.5',
        trend: { direction: 'down', percent: -2 },
      },
    ]);

    setInsights([
      {
        type: userProfile.bankConnected ? 'positive' : 'warning',
        title: userProfile.bankConnected ? 'Bank Connected' : 'Connect Your Bank',
        description: userProfile.bankConnected
          ? 'Your bank account is linked for instant payouts.'
          : 'Link your bank account to enable instant cash advances and automated payouts.',
        action: !userProfile.bankConnected ? { label: 'Connect Bank', onClick: connectBank } : undefined,
      },
      {
        type: userProfile.subscription ? 'positive' : 'neutral',
        title: userProfile.subscription ? `${userProfile.subscription} Active` : 'Upgrade Your Plan',
        description: userProfile.subscription
          ? `You're on the ${userProfile.subscription} plan with advanced features.`
          : 'Upgrade to unlock advanced analytics, AI recommendations, and priority support.',
        action: !userProfile.subscription ? { label: 'View Plans', onClick: openCheckout } : undefined,
      },
      {
        type: 'neutral',
        title: 'Tax Reserve Check',
        description: 'You are pacing $38 under your weekly tax reserve target. Adjust if needed.',
        action: {
          label: 'View Reserves',
          onClick: async () => {
            try {
              const year = new Date().getFullYear();
              await apiFetchJson(`/api/v2/reporting/tax-summary?year=${encodeURIComponent(String(year))}`);
            } catch {
              // ignore
            }
            navigate('/taxes');
          },
        },
      },
    ]);
  }, [userProfile, connectBank, openCheckout, showToast]);

  const handleExportData = async () => {
    try {
      const userId = getUserId();
      const data = await apiFetchJson<any>(`/api/v2/export/summary?userId=${encodeURIComponent(userId)}`);
      const count = Array.isArray(data?.availableExports) ? data.availableExports.length : 0;
      showToast(`Export options loaded (${count}).`, 'success');
      navigate('/settings');
    } catch {
      showToast('Export unavailable. Please retry.', 'error');
    }
  };

  const handleBilling = async () => {
    try {
      const data = await apiFetchJson<any>('/api/v2/subscriptions/billing-portal');
      const url = data?.portalUrl;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        showToast('No billing portal available.', 'info');
      }
    } catch {
      showToast('Billing portal unavailable. Please retry.', 'error');
    }
  };

  const handleLoadActivity = async () => {
    try {
      const data = await apiFetchJson<any>('/api/v2/activity/recent?limit=50');
      const count = Array.isArray(data?.items) ? data.items.length : 0;
      showToast(`Loaded ${count} activity items.`, 'success');
    } catch {
      showToast('Unable to load activity. Please retry.', 'error');
    }
  };

  return (
    <div className="dashboard-v2">
      {/* Hero Section */}
      <section className="dashboard-hero">
        <div className="hero-content">
          <h1 className="hero-title">Welcome back! 👋</h1>
          <p className="hero-subtitle">Here's your financial snapshot for today</p>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="dashboard-stats">
        <div className="stats-grid">
          {stats.map((stat, idx) => (
            <Card key={idx} elevated>
              <div className="stat-card-content">
                <div className="stat-card-header">
                  <span className="stat-label">{stat.label}</span>
                  {stat.icon && <span className="stat-icon">{stat.icon}</span>}
                </div>
                <div className="stat-card-value">{stat.value}</div>
                {stat.trend && (
                  <div className={`stat-trend stat-trend-${stat.trend.direction}`}>
                    {stat.trend.direction === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {Math.abs(stat.trend.percent)}% from last week
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Insights & Alerts */}
      <section className="dashboard-insights">
        <h2 className="section-title">Quick Insights</h2>
        <div className="insights-grid">
          {insights.map((insight, idx) => (
            <Card key={idx} className={`insight-card insight-card-${insight.type}`}>
              <CardBody>
                <div className="insight-header">
                  <span className="insight-icon">
                    {insight.type === 'positive' ? (
                      <CheckCircle size={20} />
                    ) : (
                      <AlertCircle size={20} />
                    )}
                  </span>
                  <h3 className="insight-title">{insight.title}</h3>
                </div>
                <p className="insight-description">{insight.description}</p>
                {insight.action && (
                  <Button variant="ghost" size="sm" onClick={insight.action.onClick}>
                    {insight.action.label}
                  </Button>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="dashboard-actions">
        <h2 className="section-title">Quick Actions</h2>
        <div className="actions-grid">
          <Card interactive onClick={() => navigate('/jobs')}>
            <CardBody>
              <div className="action-icon-large">💼</div>
              <h3 className="action-title">Find Jobs</h3>
              <p className="action-description">Discover high-paying opportunities near you</p>
            </CardBody>
          </Card>
          <Card interactive onClick={() => navigate('/reports')}>
            <CardBody>
              <div className="action-icon-large">📊</div>
              <h3 className="action-title">View Analytics</h3>
              <p className="action-description">Deep dive into your earnings & expenses</p>
            </CardBody>
          </Card>
          <Card interactive onClick={handleExportData}>
            <CardBody>
              <div className="action-icon-large">📥</div>
              <h3 className="action-title">Export Data</h3>
              <p className="action-description">Download reports for tax prep or records</p>
            </CardBody>
          </Card>
          <Card interactive onClick={handleBilling}>
            <CardBody>
              <div className="action-icon-large">💳</div>
              <h3 className="action-title">Billing</h3>
              <p className="action-description">Manage subscriptions & payment methods</p>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="dashboard-activity">
        <h2 className="section-title">Recent Activity</h2>
        <Card>
          <CardBody>
            <div className="activity-list">
              <div className="activity-item">
                <div className="activity-icon">📦</div>
                <div className="activity-details">
                  <p className="activity-title">Package Delivery - Downtown</p>
                  <p className="activity-time">Today at 2:30 PM</p>
                </div>
                <div className="activity-amount">+$45.00</div>
              </div>
              <div className="activity-item">
                <div className="activity-icon">🚗</div>
                <div className="activity-details">
                  <p className="activity-title">Rideshare Earnings</p>
                  <p className="activity-time">Today at 12:15 PM</p>
                </div>
                <div className="activity-amount">+$32.50</div>
              </div>
              <div className="activity-item">
                <div className="activity-icon">⛽</div>
                <div className="activity-details">
                  <p className="activity-title">Gas Expense</p>
                  <p className="activity-time">Yesterday at 6:00 PM</p>
                </div>
                <div className="activity-amount">-$45.00</div>
              </div>
            </div>
          </CardBody>
          <CardFooter align="center">
            <Button variant="ghost" onClick={handleLoadActivity}>
              View All Activity
            </Button>
          </CardFooter>
        </Card>
      </section>
    </div>
  );
};
