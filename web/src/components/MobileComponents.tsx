import React, { useState, ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import './MobileComponents.css';

/**
 * Floating Action Button (FAB) - Mobile-optimized
 * Common action accessed from anywhere in the app
 */
interface FABProps {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  items?: Array<{ label: string; icon: React.ReactNode; onClick: () => void }>;
  ariaLabel?: string;
}

export const FloatingActionButton: React.FC<FABProps> = ({
  icon = <Plus size={24} />,
  label,
  onClick,
  variant = 'primary',
  items,
  ariaLabel,
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleClick = () => {
    if (items && items.length > 0) {
      setExpanded(!expanded);
    } else {
      onClick();
    }
  };

  return (
    <div className={`fab-container ${variant} ${expanded ? 'expanded' : ''}`}>
      <button
        className="fab-button"
        onClick={handleClick}
        aria-label={ariaLabel || label}
        title={label}
      >
        {icon}
      </button>

      {items && items.length > 0 && expanded && (
        <div className="fab-menu">
          {items.map((item, index) => (
            <button
              key={index}
              className="fab-menu-item"
              onClick={() => {
                item.onClick();
                setExpanded(false);
              }}
              title={item.label}
            >
              {item.icon}
              <span className="fab-menu-label">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Bottom Sheet - Mobile-optimized modal
 * Slides up from bottom, takes less space than full modals
 */
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  height?: 'auto' | 'half' | 'full';
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  height = 'half',
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="bottom-sheet-backdrop" onClick={onClose} />

      {/* Sheet */}
      <div className={`bottom-sheet bottom-sheet-${height}`}>
        {/* Handle */}
        <div className="bottom-sheet-handle">
          <div className="handle-bar" />
        </div>

        {/* Header */}
        {title && (
          <div className="bottom-sheet-header">
            <h2 className="bottom-sheet-title">{title}</h2>
            <button className="bottom-sheet-close" onClick={onClose} aria-label="Close">
              <X size={24} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="bottom-sheet-content">{children}</div>
      </div>
    </>
  );
};

/**
 * Mobile Loading Indicator
 * Optimized for small screens with clear visual feedback
 */
interface MobileLoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export const MobileLoading: React.FC<MobileLoadingProps> = ({
  message = 'Loading...',
  fullScreen = false,
}) => {
  return (
    <div className={`mobile-loading ${fullScreen ? 'fullscreen' : ''}`}>
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
};

/**
 * Offline Indicator
 * Shows when device is offline
 */
export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = React.useState(true);

  React.useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="offline-indicator">
      <span>📡 You're offline - Changes will sync when online</span>
    </div>
  );
};

/**
 * Pull-to-Refresh Container
 * Detects pull-to-refresh gesture and triggers callback
 */
interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [pullDistance, setPullDistance] = React.useState(0);
  const startY = React.useRef(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.transform = `translateY(${pullDistance}px)`;
    }
  }, [pullDistance]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const element = e.currentTarget as HTMLElement;
    if (element.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const element = e.currentTarget as HTMLElement;
    if (element.scrollTop > 0) return;

    const distance = e.touches[0].clientY - startY.current;
    if (distance > 0) {
      setPullDistance(Math.min(distance, 120));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 80 && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh().finally(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      });
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div
      className="pull-to-refresh"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      ref={containerRef}
    >
      {pullDistance > 60 && (
        <div className="pull-indicator">
          <div className={`pull-spinner ${isRefreshing ? 'active' : ''}`} />
        </div>
      )}
      {children}
    </div>
  );
};

/**
 * Mobile-optimized Swipe Card
 * Handles swipe-to-dismiss and swipe-to-action
 */
interface SwipeCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onDismiss?: () => void;
}

export const SwipeCard: React.FC<SwipeCardProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onDismiss,
}) => {
  const [offset, setOffset] = React.useState(0);
  const startX = React.useRef(0);
  const cardRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(${offset}px)`;
    }
  }, [offset]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const distance = e.touches[0].clientX - startX.current;
    setOffset(distance);
  };

  const handleTouchEnd = () => {
    if (Math.abs(offset) > 80) {
      if (offset > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (offset < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
      if (Math.abs(offset) > 120 && onDismiss) {
        onDismiss();
      }
    }
    setOffset(0);
  };

  return (
    <div
      className="swipe-card"
      ref={cardRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
};

/**
 * Mobile-optimized Tab Navigation
 * Sticky tabs with horizontal scroll on mobile
 */
interface TabsProps {
  tabs: Array<{ id: string; label: string; content: ReactNode }>;
  activeTabId: string;
  onTabChange: (tabId: string) => void;
}

export const MobileTabs: React.FC<TabsProps> = ({ tabs, activeTabId, onTabChange }) => {
  const tabsRef = React.useRef<HTMLDivElement>(null);
  const activeTabRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    // Scroll active tab into view on mobile
    if (activeTabRef.current && tabsRef.current) {
      activeTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeTabId]);

  return (
    <div className="mobile-tabs-container">
      <div className="mobile-tabs-header" ref={tabsRef}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={tab.id === activeTabId ? activeTabRef : null}
            className={`mobile-tab ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mobile-tabs-content">
        {tabs.find((t) => t.id === activeTabId)?.content}
      </div>
    </div>
  );
};
