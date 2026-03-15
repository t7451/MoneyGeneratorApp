import { Suspense, lazy, useMemo, useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';

export interface ReportsChartEarningsPoint {
  date: string;
  earnings: number;
  expenses: number;
  net: number;
}

export interface ReportsChartPlatformPoint {
  name: string;
  value: number;
  color: string;
}

interface ReportsChartsProps {
  earningsData: ReportsChartEarningsPoint[];
  platformData: ReportsChartPlatformPoint[];
}

const ReportsChartBuilder = lazy(() => import('./ReportsChartBuilder'));

const platformColorClasses: Record<string, string> = {
  '#3b82f6': 'platform-breakdown-fill-blue',
  '#10b981': 'platform-breakdown-fill-emerald',
  '#f59e0b': 'platform-breakdown-fill-amber',
  '#ef4444': 'platform-breakdown-fill-red',
  '#8b5cf6': 'platform-breakdown-fill-violet',
  '#06b6d4': 'platform-breakdown-fill-cyan',
};

const formatCurrency = (value: number) => `$${Math.round(value).toLocaleString()}`;

const formatShortDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

function createLinePath(values: number[], width: number, height: number, padding: number) {
  if (values.length === 0) {
    return '';
  }

  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = Math.max(maxValue - minValue, 1);

  return values
    .map((value, index) => {
      const x = padding + (usableWidth * index) / Math.max(values.length - 1, 1);
      const y = height - padding - ((value - minValue) / range) * usableHeight;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

function createAreaPath(values: number[], width: number, height: number, padding: number) {
  if (values.length === 0) {
    return '';
  }

  const linePath = createLinePath(values, width, height, padding);
  const usableWidth = width - padding * 2;
  const firstX = padding;
  const lastX = padding + usableWidth;
  const baseline = height - padding;

  return `${linePath} L ${lastX} ${baseline} L ${firstX} ${baseline} Z`;
}

export default function ReportsCharts({ earningsData, platformData }: ReportsChartsProps) {
  const [showAdvancedBuilder, setShowAdvancedBuilder] = useState(false);

  const overviewData = useMemo(() => earningsData.slice(-14), [earningsData]);
  const weeklyComparison = useMemo(() => earningsData.slice(-7), [earningsData]);

  const chartGeometry = useMemo(() => {
    if (overviewData.length === 0) {
      return null;
    }

    const width = 720;
    const height = 260;
    const padding = 24;

    return {
      width,
      height,
      padding,
      earningsArea: createAreaPath(overviewData.map((point) => point.earnings), width, height, padding),
      earningsLine: createLinePath(overviewData.map((point) => point.earnings), width, height, padding),
      expensesLine: createLinePath(overviewData.map((point) => point.expenses), width, height, padding),
      netLine: createLinePath(overviewData.map((point) => point.net), width, height, padding),
    };
  }, [overviewData]);

  const overviewMetrics = useMemo(() => {
    const totalEarnings = overviewData.reduce((sum, point) => sum + point.earnings, 0);
    const totalExpenses = overviewData.reduce((sum, point) => sum + point.expenses, 0);
    const totalNet = overviewData.reduce((sum, point) => sum + point.net, 0);

    return [
      { label: 'Earnings', value: totalEarnings, tone: 'earnings' },
      { label: 'Expenses', value: totalExpenses, tone: 'expenses' },
      { label: 'Net', value: totalNet, tone: 'net' },
    ];
  }, [overviewData]);

  const weeklyMax = useMemo(() => {
    const values = weeklyComparison.flatMap((point) => [point.earnings, point.expenses]);
    return Math.max(...values, 1);
  }, [weeklyComparison]);

  return (
    <>
      <div className="charts-grid">
        <div className="chart-card full-width">
          <div className="chart-header">
            <h3>Earnings Over Time</h3>
            <div className="chart-legend">
              <span className="legend-item earnings">
                <span className="dot"></span> Earnings
              </span>
              <span className="legend-item expenses">
                <span className="dot"></span> Expenses
              </span>
              <span className="legend-item net">
                <span className="dot"></span> Net Profit
              </span>
            </div>
          </div>
          <div className="chart-body chart-body-overview">
            {chartGeometry ? (
              <>
                <div className="mini-chart-surface">
                  <svg className="mini-chart-svg" viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`} role="img" aria-label="Earnings, expenses, and net trend over time">
                    <defs>
                      <linearGradient id="overview-earnings-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    {[0.25, 0.5, 0.75].map((ratio) => (
                      <line
                        key={ratio}
                        className="mini-chart-grid-line"
                        x1={chartGeometry.padding}
                        x2={chartGeometry.width - chartGeometry.padding}
                        y1={chartGeometry.padding + (chartGeometry.height - chartGeometry.padding * 2) * ratio}
                        y2={chartGeometry.padding + (chartGeometry.height - chartGeometry.padding * 2) * ratio}
                      />
                    ))}
                    <path className="mini-chart-area" d={chartGeometry.earningsArea} />
                    <path className="mini-chart-line mini-chart-line-earnings" d={chartGeometry.earningsLine} />
                    <path className="mini-chart-line mini-chart-line-expenses" d={chartGeometry.expensesLine} />
                    <path className="mini-chart-line mini-chart-line-net" d={chartGeometry.netLine} />
                  </svg>
                  <div className="mini-chart-labels">
                    <span>{formatShortDate(overviewData[0].date)}</span>
                    <span>{formatShortDate(overviewData[Math.floor(overviewData.length / 2)].date)}</span>
                    <span>{formatShortDate(overviewData[overviewData.length - 1].date)}</span>
                  </div>
                </div>
                <div className="mini-chart-metrics" aria-label="Trend summary">
                  {overviewMetrics.map((metric) => (
                    <div key={metric.label} className={`mini-chart-metric mini-chart-metric-${metric.tone}`}>
                      <span className="mini-chart-metric-label">{metric.label}</span>
                      <strong>{formatCurrency(metric.value)}</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="chart-empty-state">No trend data is available for this date range.</div>
            )}
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-header">
            <h3>Platform Breakdown</h3>
          </div>
          <div className="chart-body pie-chart">
            {platformData.length > 0 ? (
              <div className="platform-breakdown-list" aria-label="Platform share breakdown">
                {platformData.map((platform, index) => (
                  <div key={`${platform.name}-${index}`} className="platform-breakdown-row">
                    <div className="platform-breakdown-meta">
                      <span className="platform-breakdown-name">
                        <span className={`platform-breakdown-dot ${platformColorClasses[platform.color] || 'platform-breakdown-fill-blue'}`} />
                        {platform.name}
                      </span>
                      <strong>{platform.value}%</strong>
                    </div>
                    <svg className="platform-breakdown-track" viewBox="0 0 100 10" preserveAspectRatio="none" role="presentation" aria-hidden="true">
                      <rect className="platform-breakdown-track-bg" x="0" y="0" width="100" height="10" rx="5" ry="5" />
                      <rect
                        className={`platform-breakdown-fill ${platformColorClasses[platform.color] || 'platform-breakdown-fill-blue'}`}
                        x="0"
                        y="0"
                        width={Math.max(6, Math.min(platform.value, 100))}
                        height="10"
                        rx="5"
                        ry="5"
                      />
                    </svg>
                  </div>
                ))}
              </div>
            ) : (
              <div className="chart-empty-state">No platform breakdown is available yet.</div>
            )}
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-header">
            <h3>Weekly Comparison</h3>
          </div>
          <div className="chart-body">
            {weeklyComparison.length > 0 ? (
              <div className="weekly-bars" aria-label="Daily earnings and expenses comparison">
                {weeklyComparison.map((point) => (
                  <div key={point.date} className="weekly-bar-row">
                    <div className="weekly-bar-header">
                      <span>{formatShortDate(point.date)}</span>
                      <strong>{formatCurrency(point.net)}</strong>
                    </div>
                    <div className="weekly-bar-track-group">
                      <svg className="weekly-bar-track" viewBox="0 0 100 10" preserveAspectRatio="none" role="presentation" aria-hidden="true">
                        <rect className="weekly-bar-track-bg" x="0" y="0" width="100" height="10" rx="5" ry="5" />
                        <rect className="weekly-bar-fill weekly-bar-fill-earnings" x="0" y="0" width={(point.earnings / weeklyMax) * 100} height="10" rx="5" ry="5" />
                      </svg>
                      <svg className="weekly-bar-track" viewBox="0 0 100 10" preserveAspectRatio="none" role="presentation" aria-hidden="true">
                        <rect className="weekly-bar-track-bg" x="0" y="0" width="100" height="10" rx="5" ry="5" />
                        <rect className="weekly-bar-fill weekly-bar-fill-expenses" x="0" y="0" width={(point.expenses / weeklyMax) * 100} height="10" rx="5" ry="5" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="chart-empty-state">No weekly comparison is available for this range.</div>
            )}
          </div>
        </div>
      </div>

      <div className="advanced-charts-shell chart-card full-width">
        <div className="advanced-charts-header">
          <div>
            <h3>Advanced Custom Charts</h3>
            <p>Load the interactive builder only when you need saved presets, multi-series customization, or export-focused chart layouts.</p>
          </div>
          <button className="action-btn primary" onClick={() => setShowAdvancedBuilder((current) => !current)} type="button">
            <BarChart3 size={16} />
            {showAdvancedBuilder ? 'Hide Builder' : 'Open Builder'}
            {showAdvancedBuilder ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {showAdvancedBuilder ? (
          <Suspense
            fallback={
              <div className="reports-builder-skeleton">
                <div className="reports-builder-skeleton__header" />
                <div className="reports-builder-skeleton__controls" />
                <div className="reports-builder-skeleton__surface" />
              </div>
            }
          >
            <ReportsChartBuilder earningsData={earningsData} />
          </Suspense>
        ) : (
          <div className="advanced-charts-placeholder">
            <p>The default analytics above stay lightweight. The Recharts-powered builder loads only after you explicitly open it.</p>
          </div>
        )}
      </div>
    </>
  );
}