import React from 'react';
import { AlertCircle, RefreshCw, WifiOff, ServerCrash, FileX } from 'lucide-react';
import './ErrorState.css';

export type ErrorType = 'network' | 'server' | 'notfound' | 'generic';

interface ErrorStateProps {
  /** Error type determines icon and default message */
  type?: ErrorType;
  /** Custom title to display */
  title?: string;
  /** Custom message/description */
  message?: string;
  /** Retry callback - if provided, shows a retry button */
  onRetry?: () => void;
  /** Whether retry is in progress */
  isRetrying?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Make it inline (no padding/centering) */
  inline?: boolean;
}

const ERROR_CONFIGS: Record<ErrorType, { icon: React.ReactNode; defaultTitle: string; defaultMessage: string }> = {
  network: {
    icon: <WifiOff />,
    defaultTitle: 'Connection Error',
    defaultMessage: 'Unable to connect. Please check your internet connection and try again.',
  },
  server: {
    icon: <ServerCrash />,
    defaultTitle: 'Server Error',
    defaultMessage: 'Something went wrong on our end. Please try again later.',
  },
  notfound: {
    icon: <FileX />,
    defaultTitle: 'Not Found',
    defaultMessage: 'The requested resource could not be found.',
  },
  generic: {
    icon: <AlertCircle />,
    defaultTitle: 'Error',
    defaultMessage: 'Something went wrong. Please try again.',
  },
};

export const ErrorState: React.FC<ErrorStateProps> = ({
  type = 'generic',
  title,
  message,
  onRetry,
  isRetrying = false,
  className = '',
  size = 'md',
  inline = false,
}) => {
  const config = ERROR_CONFIGS[type];

  return (
    <div className={`error-state error-state--${size} ${inline ? 'error-state--inline' : ''} ${className}`}>
      <div className="error-state__icon">
        {config.icon}
      </div>
      <h3 className="error-state__title">{title || config.defaultTitle}</h3>
      <p className="error-state__message">{message || config.defaultMessage}</p>
      {onRetry && (
        <button
          className="error-state__retry-btn"
          onClick={onRetry}
          disabled={isRetrying}
        >
          <RefreshCw className={isRetrying ? 'spin' : ''} size={16} />
          {isRetrying ? 'Retrying...' : 'Try Again'}
        </button>
      )}
    </div>
  );
};

export default ErrorState;
