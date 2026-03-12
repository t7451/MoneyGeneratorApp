import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import {
  Line,
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

const ReportsPage: React.FC = () => {
  const [selectedRange, setSelectedRange] = useState<DateRange>(DATE_RANGES[1]);
  const [loading, setLoading] = useState(true);
  const [earningsData, setEarningsData] = useState<EarningsData[]>([]);
  const [platformData, setPlatformData] = useState<PlatformData[]>([]);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);

  useEffect(() => {
    fetchReportData();
  }, [selectedRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Simulated data - replace with actual API calls
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generate mock earnings data
      const days = Math.ceil((selectedRange.end.getTime() - selectedRange.start.getTime()) / (24 * 60 * 60 * 1000));
      const mockEarnings: EarningsData[] = [];
      
      for (let i = 0; i < Math.min(days, 30); i++) {
        const date = new Date(selectedRange.end.getTime() - i * 24 * 60 * 60 * 1000);
        mockEarnings.unshift({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          earnings: Math.floor(Math.random() * 200 + 100),
          expenses: Math.floor(Math.random() * 50 + 20),
          net: 0,
        });
      }
      mockEarnings.forEach(d => d.net = d.earnings - d.expenses);
      setEarningsData(mockEarnings);

      // Platform breakdown
      setPlatformData([
        { name: 'Uber', value: 45, color: COLORS[0] },
        { name: 'DoorDash', value: 30, color: COLORS[1] },
        { name: 'Instacart', value: 15, color: COLORS[2] },
        { name: 'Other', value: 10, color: COLORS[3] },
      ]);

      // Metrics
      const totalEarnings = mockEarnings.reduce((sum, d) => sum + d.earnings, 0);
      const totalExpenses = mockEarnings.reduce((sum, d) => sum + d.expenses, 0);
      const avgDaily = totalEarnings / mockEarnings.length;
      const hoursWorked = mockEarnings.length * 6.5;

      setMetrics([
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
      ]);

    } catch (error) {
      console.error('Failed to fetch report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    // TODO: Implement export functionality
    console.log(`Exporting as ${format}...`);
  };

  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: ${entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="reports-page">
      {/* Header */}
      <div className="reports-header">
        <div className="header-title">
          <BarChart3 size={28} />
          <h1>Reports & Analytics</h1>
        </div>
        
        <div className="header-actions">
          <div className="date-selector">
            <Calendar size={16} />
            <select
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
          
          <button className="action-btn" onClick={() => fetchReportData()}>
            <RefreshCw size={16} />
            Refresh
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

      {/* Loading State */}
      {loading ? (
        <div className="loading-state">
          <RefreshCw className="spin" size={32} />
          <p>Loading report data...</p>
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
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${v}`} />
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
                      <span className="dot" style={{ background: platform.color }}></span>
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
        </>
      )}
    </div>
  );
};

export default ReportsPage;
