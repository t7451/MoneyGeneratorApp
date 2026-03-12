import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
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
  BarChart3
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { OfflineIndicator } from '../components/MobileComponents';
import './AppLayout.css';

interface AppLayoutProps {
  children?: React.ReactNode;
}

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/jobs', label: 'Jobs', icon: Briefcase },
  { path: '/products', label: 'Products', icon: ShoppingBag },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/referrals', label: 'Referrals', icon: Share2 },
  { path: '/pricing', label: 'Pricing', icon: CreditCard },
  { path: '/team', label: 'Team', icon: Users },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const AppLayout: React.FC<AppLayoutProps> = () => {
  const { theme, toggleTheme } = useTheme();

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
          <button 
            className="icon-btn"
            aria-label="Notifications"
            title="View notifications"
          >
            <Bell size={20} />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          MoneyGen
          <button 
            className="icon-btn theme-toggle" 
            onClick={toggleTheme} 
            aria-label="Toggle Theme"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              title={item.label}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="layout-main">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={item.label}
          >
            <item.icon className="nav-icon" size={24} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
