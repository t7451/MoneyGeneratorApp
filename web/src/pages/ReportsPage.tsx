import React, { Suspense, lazy, useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Trash2,
  Plus,
} from 'lucide-react';
import './ReportsPage.css';
import { apiFetchBlob, apiFetchJson, apiFetchText, getUserId } from '../lib/apiClient';
import { ErrorState, SkeletonMetricCard, SkeletonChart } from '../components';

const ReportsCharts = lazy(() => import('../components/ReportsCharts'));

// Scheduled report interface
interface ScheduledReport {
  id: string;
  name: string;
  reportType: string;
  frequency: string;
  format: string;
  recipients: string[];
  isActive: boolean;
  lastRun: string | null;
  nextRun: string;
  createdAt: string;
}

interface ReportTypeOption {
  id: string;
  name: string;
  description: string;
}

interface FrequencyOption {
  id: string;
  name: string;
  description: string;
}

interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

interface ReportsChartEarningsPoint {
  date: string;
  earnings: number;
  expenses: number;
  net: number;
}

interface ReportsChartPlatformPoint {
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
  const [earningsData, setEarningsData] = useState<ReportsChartEarningsPoint[]>([]);
  const [platformData, setPlatformData] = useState<ReportsChartPlatformPoint[]>([]);
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

      const [, incomeTrends, expenseTrends, incomeBreakdown] = await Promise.all([
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

  // ==================== SCHEDULED REPORTS ====================
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [reportTypes, setReportTypes] = useState<ReportTypeOption[]>([]);
  const [frequencies, setFrequencies] = useState<FrequencyOption[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [newScheduledReport, setNewScheduledReport] = useState({
    name: '',
    reportType: '',
    frequency: 'weekly',
    format: 'pdf',
    recipients: '',
  });

  // Fetch scheduled reports
  useEffect(() => {
    const fetchScheduledReports = async () => {
      try {
        const [reportsRes, typesRes, freqRes] = await Promise.all([
          apiFetchJson<{ reports: ScheduledReport[] }>('/api/v2/reporting/scheduled'),
          apiFetchJson<{ types: ReportTypeOption[] }>('/api/v2/reporting/scheduled/types'),
          apiFetchJson<{ frequencies: FrequencyOption[] }>('/api/v2/reporting/scheduled/frequencies'),
        ]);
        setScheduledReports(reportsRes?.reports || []);
        setReportTypes(typesRes?.types || []);
        setFrequencies(freqRes?.frequencies || []);
      } catch (err) {
        console.error('Failed to fetch scheduled reports:', err);
      }
    };
    fetchScheduledReports();
  }, []);

  const createScheduledReport = async () => {
    if (!newScheduledReport.name || !newScheduledReport.reportType) return;
    try {
      const res = await apiFetchJson<{ report: ScheduledReport }>('/api/v2/reporting/scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newScheduledReport,
          recipients: newScheduledReport.recipients.split(',').map(e => e.trim()).filter(Boolean),
        }),
      });
      if (res?.report) {
        setScheduledReports([res.report, ...scheduledReports]);
        setShowScheduleForm(false);
        setNewScheduledReport({ name: '', reportType: '', frequency: 'weekly', format: 'pdf', recipients: '' });
      }
    } catch (err) {
      console.error('Failed to create scheduled report:', err);
    }
  };

  const toggleScheduledReport = async (reportId: string) => {
    try {
      const res = await apiFetchJson<{ report: ScheduledReport }>(`/api/v2/reporting/scheduled/${reportId}/toggle`, {
        method: 'POST',
      });
      if (res?.report) {
        setScheduledReports(scheduledReports.map(r => r.id === reportId ? res.report : r));
      }
    } catch (err) {
      console.error('Failed to toggle scheduled report:', err);
    }
  };

  const runScheduledReport = async (reportId: string) => {
    try {
      await apiFetchJson(`/api/v2/reporting/scheduled/${reportId}/run`, {
        method: 'POST',
      });
      // Refresh the list to get updated lastRun/nextRun
      const res = await apiFetchJson<{ reports: ScheduledReport[] }>('/api/v2/reporting/scheduled');
      setScheduledReports(res?.reports || []);
    } catch (err) {
      console.error('Failed to run scheduled report:', err);
    }
  };

  const deleteScheduledReport = async (reportId: string) => {
    try {
      await apiFetchJson(`/api/v2/reporting/scheduled/${reportId}`, {
        method: 'DELETE',
      });
      setScheduledReports(scheduledReports.filter(r => r.id !== reportId));
    } catch (err) {
      console.error('Failed to delete scheduled report:', err);
    }
  };

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
          <Suspense fallback={
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
          }>
            <ReportsCharts earningsData={earningsData} platformData={platformData} />
          </Suspense>
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
          {/* Scheduled Reports Section */}
          <div className="scheduled-reports-section">
            <div className="scheduled-reports-header">
              <h3>Scheduled Reports</h3>
              <button 
                className="action-btn primary"
                onClick={() => setShowScheduleForm(!showScheduleForm)}
              >
                <Plus size={16} />
                {showScheduleForm ? 'Cancel' : 'New Schedule'}
              </button>
            </div>

            {showScheduleForm && (
              <div className="schedule-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="schedule-name">Report Name</label>
                    <input
                      id="schedule-name"
                      type="text"
                      placeholder="Weekly Earnings Summary"
                      value={newScheduledReport.name}
                      onChange={(e) => setNewScheduledReport({ ...newScheduledReport, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="schedule-type">Report Type</label>
                    <select
                      id="schedule-type"
                      value={newScheduledReport.reportType}
                      onChange={(e) => setNewScheduledReport({ ...newScheduledReport, reportType: e.target.value })}
                    >
                      <option value="">Select type...</option>
                      {reportTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="schedule-frequency">Frequency</label>
                    <select
                      id="schedule-frequency"
                      value={newScheduledReport.frequency}
                      onChange={(e) => setNewScheduledReport({ ...newScheduledReport, frequency: e.target.value })}
                    >
                      {frequencies.map(freq => (
                        <option key={freq.id} value={freq.id}>{freq.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="schedule-format">Format</label>
                    <select
                      id="schedule-format"
                      value={newScheduledReport.format}
                      onChange={(e) => setNewScheduledReport({ ...newScheduledReport, format: e.target.value })}
                    >
                      <option value="pdf">PDF</option>
                      <option value="csv">CSV</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group full-width">
                    <label htmlFor="schedule-recipients">Recipients (comma-separated emails)</label>
                    <input
                      id="schedule-recipients"
                      type="text"
                      placeholder="email@example.com, another@example.com"
                      value={newScheduledReport.recipients}
                      onChange={(e) => setNewScheduledReport({ ...newScheduledReport, recipients: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button 
                    className="action-btn primary"
                    onClick={createScheduledReport}
                    disabled={!newScheduledReport.name || !newScheduledReport.reportType}
                  >
                    Create Schedule
                  </button>
                </div>
              </div>
            )}

            <div className="scheduled-reports-list">
              {scheduledReports.length === 0 ? (
                <div className="empty-state">
                  <Calendar size={48} />
                  <p>No scheduled reports yet. Create one to get automated reports delivered to your inbox.</p>
                </div>
              ) : (
                scheduledReports.map(report => (
                  <div key={report.id} className={`scheduled-report-card ${report.isActive ? 'active' : 'inactive'}`}>
                    <div className="report-info">
                      <div className="report-header">
                        <h4>{report.name}</h4>
                        <span className={`status-badge ${report.isActive ? 'active' : 'paused'}`}>
                          {report.isActive ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <p className="report-type">
                        {reportTypes.find(t => t.id === report.reportType)?.name || report.reportType}
                      </p>
                      <div className="report-meta">
                        <span>
                          <Clock size={14} />
                          {frequencies.find(f => f.id === report.frequency)?.name || report.frequency}
                        </span>
                        <span>
                          <Download size={14} />
                          {report.format.toUpperCase()}
                        </span>
                        {report.lastRun && (
                          <span>
                            Last: {new Date(report.lastRun).toLocaleDateString()}
                          </span>
                        )}
                        {report.nextRun && report.isActive && (
                          <span>
                            Next: {new Date(report.nextRun).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="report-actions">
                      <button 
                        className="icon-btn"
                        onClick={() => runScheduledReport(report.id)}
                        title="Run now"
                        aria-label="Run report now"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button 
                        className="icon-btn"
                        onClick={() => toggleScheduledReport(report.id)}
                        title={report.isActive ? 'Pause' : 'Resume'}
                        aria-label={report.isActive ? 'Pause report' : 'Resume report'}
                      >
                        {report.isActive ? '⏸' : '▶'}
                      </button>
                      <button 
                        className="icon-btn danger"
                        onClick={() => deleteScheduledReport(report.id)}
                        title="Delete"
                        aria-label="Delete report"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
