import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Briefcase, 
  Users, 
  Settings,
  Bell,
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
import { OfflineIndicator } from '../components/MobileComponents';
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

// Primary nav items for mobile bottom bar (limited to 4 + More)
const PRIMARY_NAV_ITEMS = NAV_ITEMS.slice(0, 4);
const SECONDARY_NAV_ITEMS = NAV_ITEMS.slice(4);

export const AppLayout: React.FC<AppLayoutProps> = () => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

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

  // Check if current route is in secondary nav (More menu items)
  const isSecondaryRouteActive = SECONDARY_NAV_ITEMS.some(
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
              <span className="notification-badge">3</span>
            </button>
            {notificationsOpen && (
              <div className="notifications-dropdown">
                <div className="notifications-header">
                  <h3>Notifications</h3>
                  <button className="text-btn">Mark all read</button>
                </div>
                <div className="notifications-list">
                  <div className="notification-item unread">
                    <div className="notification-dot" />
                    <div className="notification-content">
                      <strong>New job opportunity</strong>
                      <p>DoorDash is offering premium hours tonight</p>
                      <span className="notification-time">5 min ago</span>
                    </div>
                  </div>
                  <div className="notification-item unread">
                    <div className="notification-dot" />
                    <div className="notification-content">
                      <strong>Payment received</strong>
                      <p>$127.50 deposited to your account</p>
                      <span className="notification-time">1 hour ago</span>
                    </div>
                  </div>
                  <div className="notification-item">
                    <div className="notification-content">
                      <strong>Tax reminder</strong>
                      <p>Q1 estimated taxes due in 7 days</p>
                      <span className="notification-time">Yesterday</span>
                    </div>
                  </div>
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
          {NAV_ITEMS.map((item) => (
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
        {PRIMARY_NAV_ITEMS.map((item) => (
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
            aria-expanded={moreMenuOpen ? 'true' : 'false'}
          >
            {moreMenuOpen ? <X className="nav-icon" size={22} /> : <Menu className="nav-icon" size={22} />}
            <span>More</span>
          </button>
          
          {moreMenuOpen && (
            <div className="more-menu-dropdown">
              {SECONDARY_NAV_ITEMS.map((item) => (
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
