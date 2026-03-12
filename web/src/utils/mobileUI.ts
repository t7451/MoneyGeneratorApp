/**
 * Mobile UI Utilities
 * Enhanced touch interactions and mobile-specific UX patterns
 */

export const TOUCH_TARGET_MIN = 44; // Minimum touch target size in pixels
export const MOBILE_BREAKPOINT = 768;
export const TABLET_BREAKPOINT = 1024;

/**
 * Detect if device supports touch
 */
export const isTouchDevice = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    (
      !!window.matchMedia('(pointer:coarse)').matches ||
      'ontouchstart' in window ||
      (navigator as any).maxTouchPoints > 0
    )
  );
};

/**
 * Detect if viewport is mobile
 */
export const isMobileViewport = (): boolean => {
  return typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT;
};

/**
 * Detect if viewport is tablet
 */
export const isTabletViewport = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    window.innerWidth >= MOBILE_BREAKPOINT &&
    window.innerWidth < TABLET_BREAKPOINT
  );
};

/**
 * Haptic feedback on mobile
 */
export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if (typeof window === 'undefined') return;
  
  if ('vibrate' in navigator) {
    const pattern = {
      light: 10,
      medium: 20,
      heavy: 40,
    };
    navigator.vibrate(pattern[type]);
  }
};

/**
 * Debounce function for mobile resize events
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void => {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Throttle function for scroll events
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Detect swipe gestures
 */
export interface SwipeEvent {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
}

export class SwipeDetector {
  private startX: number = 0;
  private startY: number = 0;
  private startTime: number = 0;
  private onSwipe: (event: SwipeEvent) => void;
  private minDistance: number = 50;
  
  constructor(element: HTMLElement, onSwipe: (event: SwipeEvent) => void) {
    this.onSwipe = onSwipe;
    
    element.addEventListener('touchstart', this.handleStart, false);
    element.addEventListener('touchend', this.handleEnd, false);
  }
  
  private handleStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.startTime = Date.now();
  };
  
  private handleEnd = (e: TouchEvent) => {
    const touch = e.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;
    const endTime = Date.now();
    
    const distanceX = Math.abs(endX - this.startX);
    const distanceY = Math.abs(endY - this.startY);
    const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);
    const duration = endTime - this.startTime;
    const velocity = distance / duration;
    
    if (distance < this.minDistance) return;
    
    let direction: SwipeEvent['direction'];
    
    if (distanceX > distanceY) {
      direction = endX < this.startX ? 'left' : 'right';
    } else {
      direction = endY < this.startY ? 'up' : 'down';
    }
    
    this.onSwipe({
      direction,
      distance,
      velocity,
    });
  };
}

/**
 * Detect long press
 */
export class LongPressDetector {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private onLongPress: () => void;
  private duration: number = 500;
  
  constructor(element: HTMLElement, onLongPress: () => void, duration: number = 500) {
    this.onLongPress = onLongPress;
    this.duration = duration;
    
    element.addEventListener('touchstart', this.handleStart, false);
    element.addEventListener('touchend', this.handleEnd, false);
    element.addEventListener('touchmove', this.handleEnd, false);
  }
  
  private handleStart = () => {
    this.timeoutId = setTimeout(() => {
      this.onLongPress();
      triggerHaptic('medium');
    }, this.duration);
  };
  
  private handleEnd = () => {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  };
}

/**
 * Detect pull-to-refresh
 */
export class PullToRefreshDetector {
  private startY: number = 0;
  private onRefresh: () => Promise<void>;
  private threshold: number = 80;
  private isRefreshing: boolean = false;
  
  constructor(element: HTMLElement, onRefresh: () => Promise<void>) {
    this.onRefresh = onRefresh;
    
    element.addEventListener('touchstart', this.handleStart, false);
    element.addEventListener('touchmove', this.handleMove, false);
    element.addEventListener('touchend', this.handleEnd, false);
  }
  
  private handleStart = (e: TouchEvent) => {
    const scrollTop = (e.target as any).scrollTop || 0;
    if (scrollTop === 0) {
      this.startY = e.touches[0].clientY;
    }
  };
  
  private handleMove = (e: TouchEvent) => {
    const scrollTop = (e.target as any).scrollTop || 0;
    if (scrollTop > 0) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - this.startY;
    
    if (distance > this.threshold && !this.isRefreshing) {
      this.triggerRefresh();
    }
  };
  
  private handleEnd = () => {
    this.startY = 0;
  };
  
  private triggerRefresh = async () => {
    this.isRefreshing = true;
    triggerHaptic('medium');
    
    try {
      await this.onRefresh();
    } finally {
      this.isRefreshing = false;
    }
  };
}

/**
 * Check if app is offline
 */
export const isOffline = (): boolean => {
  return typeof window !== 'undefined' && !navigator.onLine;
};

/**
 * Monitor online/offline status
 */
export const onOnlineStatusChange = (callback: (isOnline: boolean) => void) => {
  if (typeof window === 'undefined') return;
  
  window.addEventListener('online', () => callback(true));
  window.addEventListener('offline', () => callback(false));
};
