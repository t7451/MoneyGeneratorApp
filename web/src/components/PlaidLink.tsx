import { useCallback, useState, useEffect } from 'react';
import { usePlaidLink, PlaidLinkOptions, PlaidLinkOnSuccess } from 'react-plaid-link';
import { Check, RefreshCw, Shield } from 'lucide-react';
import { getUserId } from '../lib/apiClient';
import { trackEvent, FunnelEvents } from '../lib/analytics';
import './PlaidLink.css';

interface PlaidLinkButtonProps {
  apiUrl: string;
  userId?: string;
  onSuccess: (publicToken: string, metadata: unknown) => void;
  onError?: (error: string) => void;
}

export function PlaidLinkButton({ apiUrl, userId, onSuccess, onError }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const effectiveUserId = userId?.trim() || getUserId() || '';

  const fetchLinkToken = useCallback(async () => {
    if (!effectiveUserId) {
      const message = 'Sign in to connect a bank account.';
      setError(message);
      onError?.(message);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/api/plaid/link-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: effectiveUserId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create link token');
      }

      const data = await response.json();
      setLinkToken(data.link_token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection error';
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, effectiveUserId, onError]);

  useEffect(() => {
    fetchLinkToken();
  }, [fetchLinkToken]);

  const handleSuccess: PlaidLinkOnSuccess = useCallback(
    (publicToken, metadata) => {
      trackEvent(FunnelEvents.PLAID_LINK_SUCCESS, { accounts: Array.isArray(metadata) ? metadata.length : 1 });
      setConnected(true);
      onSuccess(publicToken, metadata);
    },
    [onSuccess]
  );

  const config: PlaidLinkOptions = {
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: (err) => {
      if (err) {
        console.error('Plaid Link exit error:', err);
        trackEvent(FunnelEvents.BANK_CONNECT_FAILED, { error: String(err) });
      }
    },
  };

  const { open, ready } = usePlaidLink(config);

  const handleOpen = () => {
    trackEvent(FunnelEvents.PLAID_LINK_OPENED);
    open();
  };

  if (connected) {
    return (
      <div className="plaid-success">
        <div className="plaid-success-icon">
          <Check size={24} />
        </div>
        <div>
          <p className="plaid-success-title">Bank connected successfully!</p>
          <p className="plaid-success-hint">Your transactions will sync within a few minutes.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="plaid-error">
        <p>Unable to connect to bank services</p>
        <button className="btn-retry" onClick={fetchLinkToken}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="plaid-connect-wrapper">
      <button
        className="btn-plaid"
        onClick={handleOpen}
        disabled={!ready || loading}
      >
        {loading ? (
          <span className="plaid-loading">
            <span className="spinner" />
            Connecting...
          </span>
        ) : (
          <>
            <span className="plaid-icon">{'\u{1F3E6}'}</span>
            Connect Bank Account
          </>
        )}
      </button>
      <div className="plaid-trust-row">
        <span className="plaid-trust-badge"><Shield size={12} /> 256-bit encryption</span>
        <span className="plaid-trust-badge"><Shield size={12} /> Read-only access</span>
      </div>
    </div>
  );
}

interface SyncStatusProps {
  lastSynced?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function SyncStatus({ lastSynced, onRefresh, isRefreshing }: SyncStatusProps) {
  const formatSyncTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="sync-status">
      <span className="sync-indicator" />
      <span className="sync-text">
        {lastSynced ? `Last synced: ${formatSyncTime(lastSynced)}` : 'Not synced yet'}
      </span>
      {onRefresh && (
        <button
          className="sync-refresh"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh"
        >
          <RefreshCw size={14} className={isRefreshing ? 'sync-spinning' : ''} />
        </button>
      )}
    </div>
  );
}

interface BankAccountCardProps {
  account: {
    id: string;
    name: string;
    mask: string;
    type: string;
    subtype: string;
    balance?: number;
  };
  lastSynced?: string;
  onRefresh?: () => void;
  onDisconnect?: () => void;
}

export function BankAccountCard({
  account,
  lastSynced,
  onRefresh,
  onDisconnect,
}: BankAccountCardProps) {
  const getAccountIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'checking':
        return '\u{1F4B3}';
      case 'savings':
        return '\u{1F3E6}';
      case 'credit':
        return '\u{1F4B0}';
      default:
        return '\u{1F4CA}';
    }
  };

  return (
    <div className="bank-account-card">
      <div className="account-icon">{getAccountIcon(account.subtype)}</div>
      <div className="account-info">
        <h4 className="account-name">{account.name}</h4>
        <p className="account-details">
          {account.subtype} &bull;&bull;&bull;&bull; {account.mask}
        </p>
        {account.balance !== undefined && (
          <p className="account-balance">
            ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        )}
        {lastSynced && (
          <SyncStatus lastSynced={lastSynced} onRefresh={onRefresh} />
        )}
      </div>
      <div className="account-actions">
        {onRefresh && !lastSynced && (
          <button className="btn-icon" onClick={onRefresh} title="Refresh">
            {'\u{1F504}'}
          </button>
        )}
        {onDisconnect && (
          <button
            className="btn-icon btn-danger"
            onClick={onDisconnect}
            title="Disconnect"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}

interface ConnectedAccountsProps {
  accounts: Array<{
    id: string;
    name: string;
    mask: string;
    type: string;
    subtype: string;
    balance?: number;
  }>;
  onAddAccount: () => void;
}

export function ConnectedAccounts({ accounts, onAddAccount }: ConnectedAccountsProps) {
  if (accounts.length === 0) {
    return (
      <div className="no-accounts">
        <div className="no-accounts-icon">{'\u{1F3E6}'}</div>
        <h3>No Accounts Connected</h3>
        <p>Connect your bank account to start tracking your finances automatically.</p>
        <button className="btn-primary" onClick={onAddAccount}>
          Connect Your First Account
        </button>
      </div>
    );
  }

  return (
    <div className="connected-accounts">
      <div className="accounts-header">
        <h3>Connected Accounts</h3>
        <button className="btn-secondary btn-small" onClick={onAddAccount}>
          + Add Account
        </button>
      </div>
      <div className="accounts-list">
        {accounts.map((account) => (
          <BankAccountCard
            key={account.id}
            account={account}
            lastSynced="2 min ago"
          />
        ))}
      </div>
    </div>
  );
}
