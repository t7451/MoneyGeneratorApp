import './Dashboard.css';

interface ProgressStep {
  id: string;
  label: string;
  completed: boolean;
}

interface ProgressTrackerProps {
  steps: ProgressStep[];
  onStepClick?: (stepId: string) => void;
}

export function ProgressTracker({ steps, onStepClick }: ProgressTrackerProps) {
  const completedCount = steps.filter((s) => s.completed).length;

  return (
    <div className="progress-tracker">
      <div className="progress-header">
        <span className="progress-title">Complete your profile</span>
        <span className="progress-count">
          {completedCount}/{steps.length} steps
        </span>
      </div>
      <div className="progress-bar-container">
        <progress className="progress-bar" value={completedCount} max={steps.length} />
      </div>
      <div className="progress-steps">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`progress-step ${step.completed ? 'completed' : ''}`}
            onClick={() => !step.completed && onStepClick?.(step.id)}
          >
            <span className="step-indicator">
              {step.completed ? '✓' : '○'}
            </span>
            <span className="step-label">{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  className?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}

export function StatCard({ icon, label, value, className, trend }: StatCardProps) {
  return (
    <div className={`stat-card ${className || ''}`.trim()}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
        {trend && (
          <span className={`stat-trend ${trend.direction}`}>
            {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
    </div>
  );
}

interface QuickActionProps {
  icon: string;
  label: string;
  description: string;
  onClick: () => void;
}

export function QuickAction({ icon, label, description, onClick }: QuickActionProps) {
  return (
    <button className="quick-action" onClick={onClick}>
      <span className="action-icon">{icon}</span>
      <div className="action-content">
        <span className="action-label">{label}</span>
        <span className="action-description">{description}</span>
      </div>
      <span className="action-arrow">→</span>
    </button>
  );
}

interface DashboardProps {
  earnings: number;
  weeklyChange: number;
  bankConnected: boolean;
  hasSubscription: boolean;
  onConnectBank: () => void;
  onUpgrade: () => void;
  onViewAnalytics: () => void;
  onInsightAction: (action: string) => void;
}

export function Dashboard({
  earnings,
  weeklyChange,
  bankConnected,
  hasSubscription,
  onConnectBank,
  onUpgrade,
  onViewAnalytics,
  onInsightAction,
}: DashboardProps) {
  const progressSteps = [
    { id: 'profile', label: 'Complete profile', completed: true },
    { id: 'bank', label: 'Connect bank', completed: bankConnected },
    { id: 'plan', label: 'Choose a plan', completed: hasSubscription },
  ];

  const allComplete = progressSteps.every((s) => s.completed);

  const completedCount = progressSteps.filter((step) => step.completed).length;
  const readinessScore = Math.round((completedCount / progressSteps.length) * 100);

  const nextSteps = [
    !bankConnected
      ? {
          title: 'Connect your bank',
          detail: 'Link an account to bring transactions and cash-flow reporting into the dashboard.',
          cta: 'Connect bank',
        }
      : {
          title: 'Bank connection active',
          detail: 'Your linked account is ready for transaction sync and reporting updates.',
          cta: 'View analytics',
        },
    !hasSubscription
      ? {
          title: 'Unlock advanced reporting',
          detail: 'Upgrade to enable more detailed reporting, forecasting, and automation tools.',
          cta: 'Upgrade plan',
        }
      : {
          title: 'Subscription is active',
          detail: 'Your plan is ready for premium analytics and operator-assisted workflows.',
          cta: 'View analytics',
        },
    {
      title: 'Weekly momentum',
      detail:
        weeklyChange >= 0
          ? `Earnings are up ${Math.abs(weeklyChange)}% versus last week.`
          : `Earnings are down ${Math.abs(weeklyChange)}% versus last week. Review trends and recent activity.` ,
      cta: 'View analytics',
    },
  ];

  const healthSignals = [
    { label: 'Profile', value: 'Complete', status: 'positive' },
    { label: 'Bank data', value: bankConnected ? 'Connected' : 'Needs setup', status: bankConnected ? 'positive' : 'warning' },
    { label: 'Plan access', value: hasSubscription ? 'Premium active' : 'Basic access', status: hasSubscription ? 'positive' : 'neutral' },
  ];

  return (
    <div className="dashboard">
      {!allComplete && (
        <ProgressTracker
          steps={progressSteps}
          onStepClick={(stepId) => {
            if (stepId === 'bank') onConnectBank();
            if (stepId === 'plan') onUpgrade();
          }}
        />
      )}

      <div className="stats-grid">
        <StatCard
          icon="💰"
          label="This Month"
          value={`$${earnings.toLocaleString()}`}
          className="earnings-card"
          trend={{ value: weeklyChange, direction: weeklyChange >= 0 ? 'up' : 'down' }}
        />
        <StatCard
          icon="🏦"
          label="Bank Status"
          value={bankConnected ? 'Connected' : 'Needs setup'}
          className="bank-section"
        />
        <StatCard
          icon="⚡"
          label="Plan"
          value={hasSubscription ? 'Premium' : 'Basic'}
        />
      </div>

      <div className="health-grid">
        <div className="health-card">
          <div className="health-score">
            <span className="score-label">Account Readiness</span>
            <span className="score-value">{readinessScore}</span>
          </div>
          <div className="score-meter">
            <progress className="score-meter" value={readinessScore} max={100} />
          </div>
          <div className="signal-list">
            {healthSignals.map((signal) => (
              <div key={signal.label} className={`signal-row ${signal.status}`}>
                <span>{signal.label}</span>
                <strong>{signal.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="insights-card insights-section">
          <div className="insights-header">
            <div>
              <h4>Recommended Next Steps</h4>
              <p>Actions based on your current setup and recent earnings trend.</p>
            </div>
            <button className="btn-secondary" onClick={onViewAnalytics}>View report</button>
          </div>
          <div className="insights-grid">
            {nextSteps.map((insight) => (
              <div key={insight.title} className="insight-card">
                <h5>{insight.title}</h5>
                <p>{insight.detail}</p>
                <button 
                  className="btn-link"
                  onClick={() => onInsightAction(insight.cta)}
                >
                  {insight.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          {!bankConnected && (
            <QuickAction
              icon="🏦"
              label="Connect Bank"
              description="Track transactions automatically"
              onClick={onConnectBank}
            />
          )}
          {!hasSubscription && (
            <QuickAction
              icon="⚡"
              label="Upgrade to Pro"
              description="Unlock advanced analytics"
              onClick={onUpgrade}
            />
          )}
          <QuickAction
            icon="📈"
            label="View Analytics"
            description="Review live earnings and activity trends"
            onClick={onViewAnalytics}
          />
        </div>
      </div>
    </div>
  );
}
