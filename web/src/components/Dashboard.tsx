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
  const progress = (completedCount / steps.length) * 100;

  return (
    <div className="progress-tracker">
      <div className="progress-header">
        <span className="progress-title">Complete your profile</span>
        <span className="progress-count">
          {completedCount}/{steps.length} steps
        </span>
      </div>
      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
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
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}

export function StatCard({ icon, label, value, trend }: StatCardProps) {
  return (
    <div className="stat-card">
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

  const aiInsights = [
    {
      title: 'Best time to work',
      detail: 'Monday 5-9pm shows +24% surge near Downtown.',
      cta: 'View surge map',
    },
    {
      title: 'Expense to trim',
      detail: 'Subscription “Fuel Saver Plus” unused 21 days. Save $12/mo.',
      cta: 'Review and cancel',
    },
    {
      title: 'Tax reserve check',
      detail: 'You are pacing $38 under weekly tax target. Move $38 today.',
      cta: 'Adjust reserve',
    },
  ];

  const healthScore = 82;
  const healthSignals = [
    { label: 'Cash flow', value: '+$420 this week', status: 'positive' },
    { label: 'Savings runway', value: '6.2 months', status: 'neutral' },
    { label: 'Goal progress', value: '68% to weekly target', status: 'positive' },
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
          trend={{ value: weeklyChange, direction: weeklyChange >= 0 ? 'up' : 'down' }}
        />
        <StatCard icon="📊" label="Active Gigs" value="3" />
        <StatCard icon="🎯" label="Goal Progress" value="68%" />
      </div>

      <div className="health-grid">
        <div className="health-card">
          <div className="health-score">
            <span className="score-label">Financial Health</span>
            <span className="score-value">{healthScore}</span>
          </div>
          <div className="score-meter">
            <div className="score-fill" style={{ width: `${healthScore}%` }} />
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

        <div className="insights-card">
          <div className="insights-header">
            <div>
              <h4>AI Insights</h4>
              <p>Personalized tips based on your shifts, spend, and goals.</p>
            </div>
            <button className="btn-secondary" onClick={onViewAnalytics}>View report</button>
          </div>
          <div className="insights-grid">
            {aiInsights.map((insight) => (
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
            description="See your earning trends"
            onClick={onViewAnalytics}
          />
        </div>
      </div>
    </div>
  );
}
