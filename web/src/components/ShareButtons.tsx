import React from 'react';
import { MessageCircle, Twitter, Mail, MessageSquare, Link } from 'lucide-react';
import { useToast } from './Toast';
import './ShareButtons.css';

interface ShareButtonsProps {
  code: string;
  onShare: (channel: string) => void;
}

const ShareButtons: React.FC<ShareButtonsProps> = ({ code, onShare }) => {
  const { showToast } = useToast();
  const shareUrl = `https://moneygenerator.app?ref=${code}`;
  const shareTitle = 'Test this awesome money making app!';
  const shareText = `Join me on Money Generator App! Use code ${code} to get a $2.50 bonus.`;

  const shareButtons = [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageCircle,
      color: 'whatsapp',
      action: () => {
        onShare('whatsapp');
        const text = encodeURIComponent(
          `${shareText} ${shareUrl}`
        );
        const whatsappUrl = `https://wa.me/?text=${text}`;
        window.open(whatsappUrl, '_blank');
      },
    },
    {
      id: 'twitter',
      label: 'Twitter',
      icon: Twitter,
      color: 'twitter',
      action: () => {
        onShare('twitter');
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(tweetUrl, '_blank');
      },
    },
    {
      id: 'email',
      label: 'Email',
      icon: Mail,
      color: 'email',
      action: () => {
        onShare('email');
        const mailtoUrl = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
        window.location.href = mailtoUrl;
      },
    },
    {
      id: 'sms',
      label: 'SMS',
      icon: MessageSquare,
      color: 'sms',
      action: () => {
        onShare('sms');
        const smsUrl = `sms:?body=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
        window.location.href = smsUrl;
      },
    },
    {
      id: 'direct',
      label: 'Copy Link',
      icon: Link,
      color: 'direct',
      action: () => {
        onShare('direct_link');
        navigator.clipboard.writeText(shareUrl);
        showToast('Link copied to clipboard!', 'success');
      },
    },
  ];

  return (
    <div className="share-buttons">
      <div className="share-grid">
        {shareButtons.map((btn) => {
          const Icon = btn.icon;
          return (
            <button
              key={btn.id}
              onClick={btn.action}
              className={`share-btn share-${btn.color}`}
              title={`Share via ${btn.label}`}
            >
              <Icon size={20} />
              <span>{btn.label}</span>
            </button>
          );
        })}
      </div>

      <div className="share-section">
        <h4 className="share-section-title">Share Tips</h4>
        <ul className="share-tips">
          <li>💬 WhatsApp works great for direct messages</li>
          <li>🐦 Twitter reaches a wide audience</li>
          <li>📧 Email to personal contacts is personal</li>
          <li>📱 SMS for quick mobile shares</li>
          <li>🔗 Copy link for forums & communities</li>
        </ul>
      </div>
    </div>
  );
};

export default ShareButtons;
