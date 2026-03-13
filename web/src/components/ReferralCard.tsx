import React from 'react';
import { Copy, Check } from 'lucide-react';
import { useToast } from './Toast';
import './ReferralCard.css';

interface ReferralCardProps {
  code: string;
  onCopy: () => void;
  copied: boolean;
}

const ReferralCard: React.FC<ReferralCardProps> = ({ code, onCopy, copied }) => {
  const { showToast } = useToast();

  return (
    <div className="referral-card code-card">
      <div className="code-header">
        <h3 className="card-title">Your Referral Code</h3>
        <span className="code-badge">Shareable</span>
      </div>

      <div className="code-display">
        <div className="code-value">{code}</div>
        <button
          onClick={onCopy}
          className={`copy-button ${copied ? 'copied' : ''}`}
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check size={18} />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={18} />
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>

      <div className="referral-link">
        <label>Referral Link</label>
        <div className="link-display">
          <code className="link-text">
            https://moneygenerator.app?ref={code}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `https://moneygenerator.app?ref=${code}`
              );
              showToast('Link copied!', 'success');
            }}
            className="link-copy-btn"
            aria-label="Copy referral link"
            title="Copy referral link"
          >
            <Copy size={16} />
          </button>
        </div>
      </div>

      <div className="code-tip">
        <p>
          💡 Share this code or link with friends. They earn $2.50 when they
          sign up, and you earn $5!
        </p>
      </div>
    </div>
  );
};

export default ReferralCard;
