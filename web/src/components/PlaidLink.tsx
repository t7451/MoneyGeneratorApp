import { useCallback, useState, useEffect } from 'react';
import { usePlaidLink, PlaidLinkOptions, PlaidLinkOnSuccess } from 'react-plaid-link';
import { getUserId } from '../lib/apiClient';
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
      }
    },
  };

  const { open, ready } = usePlaidLink(config);

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
    <button
      className="btn-plaid"
      onClick={() => open()}
      disabled={!ready || loading}
    >
      {loading ? (
        <span className="plaid-loading">
          <span className="spinner" />
          Connecting...
        </span>
      ) : (
        <>
          <span className="plaid-icon">🏦</span>
          Connect Bank Account
        </>
      )}
    </button>
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
        return '💳';
      case 'savings':
        return '🏦';
      case 'credit':
        return '💰';
      default:
        return '📊';
    }
  };

  return (
    <div className="bank-account-card">
      <div className="account-icon">{getAccountIcon(account.subtype)}</div>
      <div className="account-info">
        <h4 className="account-name">{account.name}</h4>
        <p className="account-details">
          {account.subtype} •••• {account.mask}
        </p>
        {account.balance !== undefined && (
          <p className="account-balance">
            ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        )}
        {lastSynced && (
          <p className="account-synced">Last synced: {lastSynced}</p>
        )}
      </div>
      <div className="account-actions">
        {onRefresh && (
          <button className="btn-icon" onClick={onRefresh} title="Refresh">
            🔄
          </button>
        )}
        {onDisconnect && (
          <button
            className="btn-icon btn-danger"
            onClick={onDisconnect}
            title="Disconnect"
          >
            ✕
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
        <div className="no-accounts-icon">🏦</div>
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
