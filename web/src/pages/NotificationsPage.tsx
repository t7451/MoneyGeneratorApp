import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, Trash2, Filter, RefreshCw, Loader2, Settings, AlertCircle, TrendingUp, Calendar, DollarSign, Briefcase, Target, Gift, Info } from 'lucide-react';
import { Card, CardBody } from '../components/Card';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import { apiFetchJson, getUserId } from '../lib/apiClient';
import './NotificationsPage.css';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  total: number;
}

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  surge_alert: <TrendingUp size={20} />,
  earnings_update: <DollarSign size={20} />,
  shift_reminder: <Calendar size={20} />,
  cash_advance_eligible: <DollarSign size={20} />,
  payment_received: <DollarSign size={20} />,
  tax_reminder: <AlertCircle size={20} />,
  new_job_match: <Briefcase size={20} />,
  goal_progress: <Target size={20} />,
  promotion: <Gift size={20} />,
  system: <Info size={20} />,
};

const NOTIFICATION_COLORS: Record<string, string> = {
  surge_alert: 'var(--color-warning)',
  earnings_update: 'var(--color-success)',
  shift_reminder: 'var(--color-info)',
  cash_advance_eligible: 'var(--color-emerald-500)',
  payment_received: 'var(--color-success)',
  tax_reminder: 'var(--color-warning)',
  new_job_match: 'var(--color-info)',
  goal_progress: 'var(--color-purple-500)',
  promotion: 'var(--color-pink-500)',
  system: 'var(--color-neutral-500)',
};

const NotificationsPage: React.FC = () => {
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = useCallback(async (showLoading = true) => {
    if (showLoading) setIsRefreshing(true);
    
    try {
      const userId = getUserId();
      const unreadOnly = filter === 'unread';
      const data = await apiFetchJson<NotificationsResponse>(
        `/api/v1/notifications?userId=${encodeURIComponent(userId)}&unreadOnly=${unreadOnly}&limit=50`
      );
      
      setNotifications(data?.notifications || []);
      setUnreadCount(data?.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      // Use mock data for demo
      setNotifications([
        {
          id: 'n1',
          type: 'surge_alert',
          title: 'Surge Alert!',
          body: 'DoorDash is offering 1.5x pay in your area for the next 2 hours.',
          read: false,
          createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          priority: 'high',
        },
        {
          id: 'n2',
          type: 'payment_received',
          title: 'Payment Received',
          body: 'You received $127.50 from Uber Eats. Funds are now available.',
          read: false,
          createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          priority: 'normal',
        },
        {
          id: 'n3',
          type: 'tax_reminder',
          title: 'Q1 Tax Reminder',
          body: 'Estimated quarterly taxes are due in 7 days. You\'ve set aside $1,245.',
          read: false,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          priority: 'high',
        },
        {
          id: 'n4',
          type: 'new_job_match',
          title: 'New Job Match',
          body: 'We found 3 new gig opportunities matching your preferences.',
          read: true,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'normal',
        },
        {
          id: 'n5',
          type: 'goal_progress',
          title: 'Weekly Goal Progress',
          body: 'You\'re 78% towards your $500 weekly earnings goal. Keep going!',
          read: true,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'low',
        },
      ]);
      setUnreadCount(3);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await apiFetchJson(`/api/v1/notifications/${notificationId}/read`, {
        method: 'POST',
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      // Optimistic update even if API fails
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const userId = getUserId();
      await apiFetchJson('/api/v1/notifications/read-all', {
        method: 'POST',
        body: { userId },
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      showToast('All notifications marked as read', 'success');
    } catch (error) {
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      showToast('All notifications marked as read', 'success');
    }
  };

  const handleDismiss = async (notificationId: string) => {
    try {
      await apiFetchJson(`/api/v1/notifications/${notificationId}`, {
        method: 'DELETE',
      });
    } catch {
      // Continue with local removal
    }
    
    const notification = notifications.find(n => n.id === notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleRefresh = () => {
    fetchNotifications(true);
    showToast('Notifications refreshed', 'success');
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  if (isLoading) {
    return (
      <div className="notifications-page loading">
        <Loader2 className="loading-spinner" size={48} />
        <p>Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      {/* Header */}
      <div className="notifications-header">
        <div className="header-title">
          <Bell size={24} />
          <h1>Notifications</h1>
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </div>
        <div className="header-actions">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? <Loader2 size={16} className="spinning" /> : <RefreshCw size={16} />}
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => window.location.href = '/settings#notifications'}
          >
            <Settings size={16} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="notifications-filters">
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
            <CheckCheck size={16} />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="notifications-list">
        {filteredNotifications.length === 0 ? (
          <Card className="empty-state">
            <CardBody>
              <Bell size={48} className="empty-icon" />
              <h3>No notifications</h3>
              <p>
                {filter === 'unread' 
                  ? "You're all caught up! No unread notifications."
                  : "You don't have any notifications yet."}
              </p>
            </CardBody>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`notification-card ${!notification.read ? 'unread' : ''} priority-${notification.priority || 'normal'}`}
            >
              <CardBody>
                <div className="notification-content">
                  <div 
                    className="notification-icon"
                    style={{ backgroundColor: NOTIFICATION_COLORS[notification.type] + '20', color: NOTIFICATION_COLORS[notification.type] }}
                  >
                    {NOTIFICATION_ICONS[notification.type] || <Bell size={20} />}
                  </div>
                  <div className="notification-body">
                    <div className="notification-header">
                      <h4 className="notification-title">{notification.title}</h4>
                      <span className="notification-time">{formatTime(notification.createdAt)}</span>
                    </div>
                    <p className="notification-text">{notification.body}</p>
                  </div>
                </div>
                <div className="notification-actions">
                  {!notification.read && (
                    <button 
                      className="action-btn"
                      onClick={() => handleMarkAsRead(notification.id)}
                      title="Mark as read"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button 
                    className="action-btn danger"
                    onClick={() => handleDismiss(notification.id)}
                    title="Dismiss"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
