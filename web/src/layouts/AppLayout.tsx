import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Briefcase, 
  Users, 
  Settings,
  Bell,
  Activity,
  Sun,
  Moon,
  Share2,
  CreditCard,
  BarChart3,
  Map,
  Calculator,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { OfflineIndicator } from '../components/OfflineIndicator';
import { useAuth } from '../context/AuthContext';
import { apiFetchJson, getUserId } from '../lib/apiClient';
import './AppLayout.css';

interface AppLayoutProps {
  children?: React.ReactNode;
}

// All navigation items
const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/jobs', label: 'Jobs', icon: Briefcase },
  { path: '/products', label: 'Products', icon: ShoppingBag },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/mileage', label: 'Mileage', icon: Map },
  { path: '/taxes', label: 'Taxes', icon: Calculator },
  { path: '/referrals', label: 'Referrals', icon: Share2 },
  { path: '/pricing', label: 'Pricing', icon: CreditCard },
  { path: '/team', label: 'Team', icon: Users },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const AppLayout: React.FC<AppLayoutProps> = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [navNotifications, setNavNotifications] = useState<Array<{ id: string; title: string; body: string; read: boolean; createdAt: string }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const isOperator = ['admin', 'operator', 'support'].includes(user?.role || '');
  const navItems = isOperator
    ? [...NAV_ITEMS, { path: '/ops', label: 'Ops', icon: Activity }]
    : NAV_ITEMS;
  const primaryNavItems = navItems.slice(0, 4);
  const secondaryNavItems = navItems.slice(4);

  const fetchHeaderNotifications = useCallback(async () => {
    const userId = getUserId();
    if (!userId) {
      setNavNotifications([]);
      setUnreadCount(0);
      return;
    }

    setNotificationsLoading(true);
    try {
      const data = await apiFetchJson<{ notifications?: Array<{ id: string; title: string; body: string; read: boolean; createdAt: string }>; unreadCount?: number }>(
        `/api/v1/notifications?userId=${encodeURIComponent(userId)}&limit=5`
      );
      setNavNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setNotificationsError(null);
    } catch {
      setNavNotifications([]);
      setUnreadCount(0);
      setNotificationsError('Unable to load notifications.');
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close more menu on route change
  useEffect(() => {
    setMoreMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    fetchHeaderNotifications();
  }, [fetchHeaderNotifications]);

  useEffect(() => {
    if (notificationsOpen) {
      fetchHeaderNotifications();
    }
  }, [notificationsOpen, fetchHeaderNotifications]);

  // Check if current route is in secondary nav (More menu items)
  const isSecondaryRouteActive = secondaryNavItems.some(
    item => item.path === location.pathname
  );

  return (
    <div className="app-layout">
      <OfflineIndicator />

      {/* Mobile Top Header */}
      <header className="mobile-header layout-header">
        <div className="layout-brand">
          <h1>Money Generator</h1>
        </div>
        <div className="header-actions">
          <button 
            className="icon-btn" 
            onClick={toggleTheme} 
            aria-label="Toggle Theme"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className="notifications-wrapper" ref={notificationsRef}>
            <button 
              className={`icon-btn ${notificationsOpen ? 'active' : ''}`}
              aria-label="Notifications"
              title="View notifications"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              <Bell size={20} />
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>
            {notificationsOpen && (
              <div className="notifications-dropdown">
                <div className="notifications-header">
                  <h3>Notifications</h3>
                  <NavLink className="text-btn" to="/notifications" onClick={() => setNotificationsOpen(false)}>
                    View all
                  </NavLink>
                </div>
                <div className="notifications-list">
                  {notificationsLoading ? (
                    <div className="notification-item">
                      <div className="notification-content">
                        <strong>Loading notifications...</strong>
                      </div>
                    </div>
                  ) : notificationsError ? (
                    <div className="notification-item">
                      <div className="notification-content">
                        <strong>Notifications unavailable</strong>
                        <p>{notificationsError}</p>
                      </div>
                    </div>
                  ) : navNotifications.length === 0 ? (
                    <div className="notification-item">
                      <div className="notification-content">
                        <strong>No notifications</strong>
                        <p>You're all caught up.</p>
                      </div>
                    </div>
                  ) : (
                    navNotifications.map((notification) => (
                      <div key={notification.id} className={`notification-item ${notification.read ? '' : 'unread'}`}>
                        {!notification.read && <div className="notification-dot" />}
                        <div className="notification-content">
                          <strong>{notification.title}</strong>
                          <p>{notification.body}</p>
                          <span className="notification-time">{new Date(notification.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="notifications-footer">
                  <NavLink to="/notifications" onClick={() => setNotificationsOpen(false)}>
                    View all notifications
                  </NavLink>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          {!sidebarCollapsed && <span>MoneyGen</span>}
          <div className="sidebar-brand-actions">
            <button 
              className="icon-btn theme-toggle" 
              onClick={toggleTheme} 
              aria-label="Toggle Theme"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="icon-btn collapse-toggle"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand' : 'Collapse'}
            >
              {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }: { isActive: boolean }) => `sidebar-item ${isActive ? 'active' : ''}`}
              title={item.label}
            >
              <item.icon size={20} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="layout-main">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation - Primary items only */}
      <nav className="bottom-nav">
        {primaryNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }: { isActive: boolean }) => `nav-item ${isActive ? 'active' : ''}`}
            title={item.label}
          >
            <item.icon className="nav-icon" size={22} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        
        {/* More Menu */}
        <div className="more-menu-wrapper" ref={moreMenuRef}>
          <button 
            className={`nav-item more-button ${moreMenuOpen || isSecondaryRouteActive ? 'active' : ''}`}
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            aria-label="More options"
          >
            {moreMenuOpen ? <X className="nav-icon" size={22} /> : <Menu className="nav-icon" size={22} />}
            <span>More</span>
          </button>
          
          {moreMenuOpen && (
            <div className="more-menu-dropdown">
              {secondaryNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }: { isActive: boolean }) => `more-menu-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMoreMenuOpen(false)}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>
    </div>
  );
};
