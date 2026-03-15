import { useState } from 'react';
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
  Legend,
} from 'recharts';
import { Check, Save, Trash2 } from 'lucide-react';

interface ReportsChartEarningsPoint {
  date: string;
  earnings: number;
  expenses: number;
  net: number;
}

interface SavedChartConfig {
  id: string;
  name: string;
  chartType: string;
  metrics: { field: string; color: string; label: string }[];
  stacked: boolean;
  createdAt: string;
}

interface ReportsChartBuilderProps {
  earningsData: ReportsChartEarningsPoint[];
}

const colorClassNames: Record<string, string> = {
  '#3b82f6': 'color-swatch-blue',
  '#ef4444': 'color-swatch-red',
  '#10b981': 'color-swatch-emerald',
  '#f59e0b': 'color-swatch-amber',
  '#8b5cf6': 'color-swatch-violet',
  '#06b6d4': 'color-swatch-cyan',
  '#ec4899': 'color-swatch-pink',
  '#84cc16': 'color-swatch-lime',
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const chartTypes = [
  { label: 'Line', value: 'line' },
  { label: 'Bar', value: 'bar' },
  { label: 'Area', value: 'area' },
  { label: 'Pie', value: 'pie' },
];

const chartFields = [
  { label: 'Earnings', value: 'earnings', color: '#3b82f6' },
  { label: 'Expenses', value: 'expenses', color: '#ef4444' },
  { label: 'Net Profit', value: 'net', color: '#10b981' },
];

const colorOptions = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export default function ReportsChartBuilder({ earningsData }: ReportsChartBuilderProps) {
  const [customChartType, setCustomChartType] = useState('line');
  const [selectedMetrics, setSelectedMetrics] = useState<{ field: string; color: string; label: string }[]>([
    { field: 'earnings', color: '#3b82f6', label: 'Earnings' },
  ]);
  const [isStacked, setIsStacked] = useState(false);
  const [savedCharts, setSavedCharts] = useState<SavedChartConfig[]>(() => {
    try {
      const saved = localStorage.getItem('savedChartConfigs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [chartName, setChartName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

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

  const toggleMetric = (field: string) => {
    const existing = selectedMetrics.find((metric) => metric.field === field);
    if (existing) {
      if (selectedMetrics.length > 1) {
        setSelectedMetrics(selectedMetrics.filter((metric) => metric.field !== field));
      }
      return;
    }

    const fieldDef = chartFields.find((metric) => metric.value === field);
    if (fieldDef) {
      setSelectedMetrics([...selectedMetrics, { field, color: fieldDef.color, label: fieldDef.label }]);
    }
  };

  const updateMetricColor = (field: string, color: string) => {
    setSelectedMetrics(selectedMetrics.map((metric) => (
      metric.field === field ? { ...metric, color } : metric
    )));
  };

  const saveChartConfig = () => {
    if (!chartName.trim()) return;
    const config: SavedChartConfig = {
      id: `chart_${Date.now()}`,
      name: chartName.trim(),
      chartType: customChartType,
      metrics: selectedMetrics,
      stacked: isStacked,
      createdAt: new Date().toISOString(),
    };
    const updated = [...savedCharts, config];
    setSavedCharts(updated);
    localStorage.setItem('savedChartConfigs', JSON.stringify(updated));
    setChartName('');
    setShowSaveForm(false);
  };

  const loadChartConfig = (config: SavedChartConfig) => {
    setCustomChartType(config.chartType);
    setSelectedMetrics(config.metrics);
    setIsStacked(config.stacked);
  };

  const deleteChartConfig = (id: string) => {
    const updated = savedCharts.filter((config) => config.id !== id);
    setSavedCharts(updated);
    localStorage.setItem('savedChartConfigs', JSON.stringify(updated));
  };

  return (
    <div className="custom-chart-section">
      <div className="custom-chart-header">
        <h3>Custom Chart Builder</h3>
        <div className="chart-header-actions">
          {savedCharts.length > 0 && (
            <div className="saved-charts-dropdown">
              <button className="action-btn" aria-label="Load saved chart" type="button">
                Load Saved
              </button>
              <div className="dropdown-menu">
                {savedCharts.map((config) => (
                  <div key={config.id} className="saved-chart-item">
                    <button onClick={() => loadChartConfig(config)} aria-label={`Load ${config.name}`} type="button">
                      {config.name}
                    </button>
                    <button
                      className="delete-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteChartConfig(config.id);
                      }}
                      aria-label={`Delete ${config.name}`}
                      title="Delete chart"
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {showSaveForm ? (
            <div className="save-chart-form">
              <input
                type="text"
                placeholder="Chart name..."
                value={chartName}
                onChange={(event) => setChartName(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && saveChartConfig()}
              />
              <button className="action-btn primary" onClick={saveChartConfig} type="button">
                <Check size={14} />
                Save
              </button>
              <button className="action-btn" onClick={() => setShowSaveForm(false)} type="button">
                Cancel
              </button>
            </div>
          ) : (
            <button className="action-btn" onClick={() => setShowSaveForm(true)} type="button">
              <Save size={14} />
              Save Chart
            </button>
          )}
        </div>
      </div>

      <div className="custom-chart-controls">
        <div className="control-group">
          <label htmlFor="chart-type-select">Chart Type:</label>
          <select id="chart-type-select" value={customChartType} onChange={(event) => setCustomChartType(event.target.value)} aria-label="Select chart type">
            {chartTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <div className="control-group">
          <label>Metrics:</label>
          <div className="metric-toggles" role="group" aria-label="Select metrics to display">
            {chartFields.map((field) => {
              const isSelected = selectedMetrics.some((metric) => metric.field === field.value);
              const metric = selectedMetrics.find((candidate) => candidate.field === field.value);
              return (
                <div key={field.value} className={`metric-toggle ${isSelected ? 'active' : ''}`}>
                  <button onClick={() => toggleMetric(field.value)} aria-label={`Toggle ${field.label} metric`} type="button">
                    <span className={`color-dot ${colorClassNames[metric?.color || field.color] || 'color-swatch-blue'}`} />
                    {field.label}
                  </button>
                  {isSelected && (
                    <div className="color-picker-mini" role="group" aria-label={`Color options for ${field.label}`}>
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          className={`color-option ${colorClassNames[color] || 'color-swatch-blue'} ${metric?.color === color ? 'selected' : ''}`}
                          onClick={() => updateMetricColor(field.value, color)}
                          aria-label={`Set ${field.label} color to ${color}`}
                          title={color}
                          type="button"
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {(customChartType === 'bar' || customChartType === 'area') && selectedMetrics.length > 1 && (
          <div className="control-group">
            <label className="checkbox-label">
              <input type="checkbox" checked={isStacked} onChange={(event) => setIsStacked(event.target.checked)} />
              Stacked
            </label>
          </div>
        )}
      </div>

      <div className="custom-chart-preview">
        {customChartType === 'line' && (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={earningsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value) => `$${value}`} />
              <Tooltip content={renderCustomTooltip} />
              <Legend />
              {selectedMetrics.map((metric) => (
                <Line key={metric.field} type="monotone" dataKey={metric.field} name={metric.label} stroke={metric.color} strokeWidth={2} dot={{ fill: metric.color, strokeWidth: 2 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
        {customChartType === 'bar' && (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={earningsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value) => `$${value}`} />
              <Tooltip content={renderCustomTooltip} />
              <Legend />
              {selectedMetrics.map((metric) => (
                <Bar key={metric.field} dataKey={metric.field} name={metric.label} fill={metric.color} radius={isStacked ? undefined : [4, 4, 0, 0]} stackId={isStacked ? 'stack' : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
        {customChartType === 'area' && (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={earningsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value) => `$${value}`} />
              <Tooltip content={renderCustomTooltip} />
              <Legend />
              {selectedMetrics.map((metric) => (
                <Area key={metric.field} type="monotone" dataKey={metric.field} name={metric.label} stroke={metric.color} fillOpacity={0.3} fill={metric.color} strokeWidth={2} stackId={isStacked ? 'stack' : undefined} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
        {customChartType === 'pie' && (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={selectedMetrics.length === 1
                  ? earningsData.map((point) => ({ name: point.date, value: point[selectedMetrics[0].field as keyof typeof point] }))
                  : selectedMetrics.map((metric) => ({
                      name: metric.label,
                      value: earningsData.reduce((sum, point) => sum + (Number(point[metric.field as keyof typeof point]) || 0), 0),
                      color: metric.color,
                    }))}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {selectedMetrics.length === 1
                  ? earningsData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))
                  : selectedMetrics.map((metric, index) => (
                      <Cell key={index} fill={metric.color} />
                    ))}
              </Pie>
              <Tooltip />
              <Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}