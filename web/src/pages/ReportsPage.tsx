import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  Activity,
  Clock,
  Target,
  Loader2,
} from 'lucide-react';
import {
  Line,
  LineChart,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import './ReportsPage.css';
import { apiFetchBlob, apiFetchJson, apiFetchText, getUserId } from '../lib/apiClient';
import { ErrorState, SkeletonMetricCard, SkeletonChart } from '../components';

interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

interface EarningsData {
  date: string;
  earnings: number;
  expenses: number;
  net: number;
}

interface PlatformData {
  name: string;
  value: number;
  color: string;
}

interface MetricCard {
  label: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'neutral';
}

const DATE_RANGES: DateRange[] = [
  { label: 'Last 7 Days', start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() },
  { label: 'Last 30 Days', start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
  { label: 'Last 90 Days', start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), end: new Date() },
  { label: 'Year to Date', start: new Date(new Date().getFullYear(), 0, 1), end: new Date() },
  { label: 'All Time', start: new Date(2020, 0, 1), end: new Date() },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

const ReportsPage: React.FC = () => {
  const [selectedRange, setSelectedRange] = useState<DateRange>(DATE_RANGES[1]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [earningsData, setEarningsData] = useState<EarningsData[]>([]);
  const [platformData, setPlatformData] = useState<PlatformData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const userId = getUserId();

  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce fetchReportData to avoid rapid re-renders
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      fetchReportData();
    }, 200);
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRange]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshIntervalRef.current = setInterval(() => {
        handleRefresh();
      }, AUTO_REFRESH_INTERVAL);
    }
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    };
  }, [autoRefresh]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const startDate = selectedRange.start.toISOString().slice(0, 10);
      const endDate = selectedRange.end.toISOString().slice(0, 10);

      const [dashboard, incomeTrends, expenseTrends, incomeBreakdown] = await Promise.all([
        apiFetchJson<any>('/api/v2/reporting/dashboard'),
        apiFetchJson<any>(
          `/api/v2/reporting/trends?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&period=daily&type=income`
        ),
        apiFetchJson<any>(
          `/api/v2/reporting/trends?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&period=daily&type=expense`
        ),
        apiFetchJson<any>(
          `/api/v2/reporting/breakdown?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&type=income`
        ),
      ]);

      const incomeByDate = new Map<string, number>();
      (incomeTrends?.data || []).forEach((d: any) => {
        const key = String(d.date || '').slice(0, 10);
        if (key) incomeByDate.set(key, Number(d.amount) || 0);
      });
      const expenseByDate = new Map<string, number>();
      (expenseTrends?.data || []).forEach((d: any) => {
        const key = String(d.date || '').slice(0, 10);
        if (key) expenseByDate.set(key, Number(d.amount) || 0);
      });

      const allDates = new Set<string>([...incomeByDate.keys(), ...expenseByDate.keys()]);
      const mergedSeries = [...allDates]
        .sort((a, b) => a.localeCompare(b))
        .map((date) => {
          const earnings = incomeByDate.get(date) || 0;
          const expenses = expenseByDate.get(date) || 0;
          return { date, earnings, expenses, net: earnings - expenses };
        });
      setEarningsData(mergedSeries);

      const breakdown = (incomeBreakdown?.data || []) as Array<any>;
      const platforms = breakdown.map((row: any, i: number) => ({
        name: row.category || `Category ${i + 1}`,
        value: Number(row.percentage) || 0,
        color: COLORS[i % COLORS.length],
      }));
      setPlatformData(platforms);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to refresh analytics');
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedRange]);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const startDate = selectedRange.start.toISOString().slice(0, 10);
      const endDate = selectedRange.end.toISOString().slice(0, 10);

      const [dashboard, incomeTrends, expenseTrends, incomeBreakdown] = await Promise.all([
        apiFetchJson<any>('/api/v2/reporting/dashboard'),
        apiFetchJson<any>(
          `/api/v2/reporting/trends?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&period=daily&type=income`
        ),
        apiFetchJson<any>(
          `/api/v2/reporting/trends?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&period=daily&type=expense`
        ),
        apiFetchJson<any>(
          `/api/v2/reporting/breakdown?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&type=income`
        ),
      ]);

      const incomeByDate = new Map<string, number>();
      (incomeTrends?.data || []).forEach((d: any) => {
        const key = String(d.date || '').slice(0, 10);
        if (key) incomeByDate.set(key, Number(d.amount) || 0);
      });
      const expenseByDate = new Map<string, number>();
      (expenseTrends?.data || []).forEach((d: any) => {
        const key = String(d.date || '').slice(0, 10);
        if (key) expenseByDate.set(key, Number(d.amount) || 0);
      });

      const allDates = new Set<string>([...incomeByDate.keys(), ...expenseByDate.keys()]);
      const mergedSeries = [...allDates]
        .sort((a, b) => a.localeCompare(b))
        .map((date) => {
          const earnings = incomeByDate.get(date) || 0;
          const expenses = expenseByDate.get(date) || 0;
          return { date, earnings, expenses, net: earnings - expenses };
        });
      setEarningsData(mergedSeries);

      const breakdown = (incomeBreakdown?.data || []) as Array<any>;
      const platforms = breakdown.map((row: any, i: number) => ({
        name: row.category || `Category ${i + 1}`,
        value: Number(row.percentage) || 0,
        color: COLORS[i % COLORS.length],
      }));
      setPlatformData(platforms);
      setLastUpdated(new Date());

      // Use dashboard metrics as a sanity check; if it returns no success, keep going with chart data
      if (dashboard?.success === false) {
        throw new Error(dashboard?.error || 'Failed to load reporting dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [selectedRange, userId]);

  const handleExport = async (format: 'csv' | 'pdf') => {
    const startDate = selectedRange.start.toISOString().slice(0, 10);
    const endDate = selectedRange.end.toISOString().slice(0, 10);

    try {
      if (format === 'csv') {
        const csv = await apiFetchText(
          `/api/v2/reporting/export-csv?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&type=all`
        );
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `moneygen-report-${startDate}-to-${endDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const pdf = await apiFetchBlob(
          `/api/v2/reporting/export-pdf?reportType=summary&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
        );
        const url = URL.createObjectURL(pdf);
        const a = document.createElement('a');
        a.href = url;
        a.download = `moneygen-report-${startDate}-to-${endDate}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      setError(err?.message || 'Export failed');
    }
  };

  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className={`tooltip-entry tooltip-entry-${entry.name?.toLowerCase()}`}>
              {entry.name}: ${entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Memoize metrics for performance
  const metrics = useMemo<MetricCard[]>(() => {
    if (!earningsData.length) return [];
    const totalEarnings = earningsData.reduce((sum, d) => sum + d.earnings, 0);
    const totalExpenses = earningsData.reduce((sum, d) => sum + d.expenses, 0);
    const avgDaily = totalEarnings / earningsData.length;
    const hoursWorked = earningsData.length * 6.5;
    return [
      {
        label: 'Total Earnings',
        value: `$${totalEarnings.toLocaleString()}`,
        change: 12.5,
        icon: <DollarSign size={20} />,
        trend: 'up',
      },
      {
        label: 'Net Profit',
        value: `$${(totalEarnings - totalExpenses).toLocaleString()}`,
        change: 8.3,
        icon: <TrendingUp size={20} />,
        trend: 'up',
      },
      {
        label: 'Avg Daily',
        value: `$${avgDaily.toFixed(0)}`,
        change: -2.1,
        icon: <Activity size={20} />,
        trend: 'down',
      },
      {
        label: 'Hours Worked',
        value: `${hoursWorked.toFixed(0)}h`,
        change: 5.0,
        icon: <Clock size={20} />,
        trend: 'up',
      },
    ];
  }, [earningsData]);

  // --- Custom Chart Builder UI ---
  const chartTypes = [
    { label: 'Line', value: 'line' },
    { label: 'Bar', value: 'bar' },
    { label: 'Area', value: 'area' },
    { label: 'Pie', value: 'pie' },
  ];
  const chartFields = [
    { label: 'Earnings', value: 'earnings' },
    { label: 'Expenses', value: 'expenses' },
    { label: 'Net Profit', value: 'net' },
  ];

  const [customChartType, setCustomChartType] = useState('line');
  const [customChartField, setCustomChartField] = useState('earnings');

  return (
    <div className="reports-page">
      {/* Header */}
      <div className="reports-header">
        <div className="header-title">
          <BarChart3 size={28} />
          <h1>Reports & Analytics</h1>
          {lastUpdated && (
            <span className="last-updated">
              <Clock size={12} />
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="header-actions">
          <div className="date-selector">
            <Calendar size={16} />
            <label htmlFor="date-range-select" className="visually-hidden">Date Range</label>
            <select
              id="date-range-select"
              value={DATE_RANGES.findIndex(r => r.label === selectedRange.label)}
              onChange={(e) => setSelectedRange(DATE_RANGES[parseInt(e.target.value)])}
            >
              {DATE_RANGES.map((range, index) => (
                <option key={range.label} value={index}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span>Auto-refresh</span>
          </label>
          <button 
            className={`action-btn ${isRefreshing ? 'refreshing' : ''}`} 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <div className="export-dropdown">
            <button className="action-btn primary">
              <Download size={16} />
              Export
            </button>
            <div className="dropdown-menu">
              <button onClick={() => handleExport('csv')}>Export as CSV</button>
              <button onClick={() => handleExport('pdf')}>Export as PDF</button>
            </div>
          </div>
        </div>
      </div>
      {/* Error State */}
      {error && (
        <ErrorState
          type={error.includes('connect') || error.includes('network') ? 'network' : 'server'}
          message={error}
          onRetry={handleRefresh}
          isRetrying={isRefreshing}
          size="sm"
        />
      )}
      {/* Loading State with Skeletons */}
      {loading ? (
        <div className="reports-skeleton">
          {/* Metrics skeleton */}
          <div className="metrics-grid">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonMetricCard key={i} />
            ))}
          </div>
          {/* Charts skeleton */}
          <div className="charts-grid">
            <div className="chart-card full-width">
              <SkeletonChart height={300} />
            </div>
            <div className="chart-card">
              <SkeletonChart height={250} showLegend={false} />
            </div>
            <div className="chart-card">
              <SkeletonChart height={250} showLegend={false} />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="metrics-grid">
            {metrics.map((metric, index) => (
              <div key={index} className="metric-card">
                <div className="metric-icon">{metric.icon}</div>
                <div className="metric-content">
                  <span className="metric-label">{metric.label}</span>
                  <span className="metric-value">{metric.value}</span>
                  <span className={`metric-change ${metric.trend}`}>
                    {metric.trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {Math.abs(metric.change)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          {/* Charts Section */}
          <div className="charts-grid">
            {/* Earnings Over Time */}
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
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={earningsData}>
                    <defs>
                      <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v: number) => `$${v}`} />
                    <Tooltip content={renderCustomTooltip} />
                    <Area
                      type="monotone"
                      dataKey="earnings"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorEarnings)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="net"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#colorNet)"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Platform Breakdown */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>Platform Breakdown</h3>
              </div>
              <div className="chart-body pie-chart">
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={platformData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {platformData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="pie-legend">
                  {platformData.map((platform, index) => (
                    <div key={index} className="pie-legend-item">
                      <span className={`dot dot-${platform.name.toLowerCase()}`}></span>
                      <span className="name">{platform.name}</span>
                      <span className="value">{platform.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Weekly Comparison */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>Weekly Comparison</h3>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={earningsData.slice(-7)}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `$${v}`} />
                    <Tooltip content={renderCustomTooltip} />
                    <Bar dataKey="earnings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          {/* Insights Section */}
          <div className="insights-section">
            <h3>
              <Target size={20} />
              Key Insights
            </h3>
            <div className="insights-grid">
              <div className="insight-card positive">
                <div className="insight-icon">📈</div>
                <div className="insight-content">
                  <h4>Best Performing Day</h4>
                  <p>Saturday consistently generates 25% more earnings than weekdays.</p>
                </div>
              </div>
              <div className="insight-card warning">
                <div className="insight-icon">⛽</div>
                <div className="insight-content">
                  <h4>Fuel Costs Rising</h4>
                  <p>Your fuel expenses increased 12% this month. Consider optimizing routes.</p>
                </div>
              </div>
              <div className="insight-card positive">
                <div className="insight-icon">🎯</div>
                <div className="insight-content">
                  <h4>Goal Progress</h4>
                  <p>You're 85% towards your monthly earnings goal of $4,000.</p>
                </div>
              </div>
              <div className="insight-card neutral">
                <div className="insight-icon">💡</div>
                <div className="insight-content">
                  <h4>Pro Tip</h4>
                  <p>Lunch hours (11am-1pm) show highest demand. Consider scheduling accordingly.</p>
                </div>
              </div>
            </div>
          </div>
          {/* Custom Chart Builder Section */}
          <div className="custom-chart-section">
            <h3>Custom Chart Builder</h3>
            <div className="custom-chart-controls">
              <label>
                Chart Type:
                <select value={customChartType} onChange={e => setCustomChartType(e.target.value)}>
                  {chartTypes.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </label>
              <label>
                Data Field:
                <select value={customChartField} onChange={e => setCustomChartField(e.target.value)}>
                  {chartFields.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </label>
            </div>
            <div className="custom-chart-preview">
              {customChartType === 'line' && (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={earningsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={v => `$${v}`} />
                    <Tooltip content={renderCustomTooltip} />
                    <Line type="monotone" dataKey={customChartField} stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {customChartType === 'bar' && (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={earningsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={v => `$${v}`} />
                    <Tooltip content={renderCustomTooltip} />
                    <Bar dataKey={customChartField} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {customChartType === 'area' && (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={earningsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={v => `$${v}`} />
                    <Tooltip content={renderCustomTooltip} />
                    <Area type="monotone" dataKey={customChartField} stroke="#3b82f6" fillOpacity={0.3} fill="#3b82f6" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              {customChartType === 'pie' && (
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={earningsData}
                      dataKey={customChartField}
                      nameKey="date"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      fill="#3b82f6"
                      label
                    />
                    <Tooltip content={renderCustomTooltip} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
