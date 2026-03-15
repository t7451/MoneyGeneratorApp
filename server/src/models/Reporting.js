/**
 * Reporting Model
 * Handles analytics data, trends, forecasts, and report generation
 */

const reportingSchema = {
  userId: String,
  type: {
    type: String,
    enum: ['income', 'expense', 'cashflow', 'tax_summary', 'custom'],
    default: 'custom'
  },
  dateRange: {
    startDate: Date,
    endDate: Date
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual'],
    default: 'monthly'
  },
  createdAt: Date,
  format: {
    type: String,
    enum: ['json', 'csv', 'pdf'],
    default: 'json'
  },
  metrics: {}
};

const analyticsSchema = {
  userId: String,
  date: Date,
  category: String,
  amount: Number,
  type: String,          // income, expense
  metadata: {}
};

// In-memory storage
let reports = [];
let analyticsData = [];
let reportCounter = 1000;

const Reporting = {
  // Record transaction for analytics
  async recordTransaction(userId, { category, amount, type, date = new Date(), metadata = {} }) {
    const record = {
      userId,
      date,
      category,
      amount,
      type,
      metadata,
      _createdAt: new Date()
    };
    analyticsData.push(record);
    return record;
  },

  // Get income/expense breakdown by category
  async getCategoryBreakdown(userId, startDate, endDate, type = 'all') {
    const filtered = analyticsData.filter(d =>
      d.userId === userId &&
      d.date >= startDate &&
      d.date <= endDate &&
      (type === 'all' || d.type === type)
    );

    const breakdown = {};
    filtered.forEach(d => {
      if (!breakdown[d.category]) {
        breakdown[d.category] = { amount: 0, count: 0 };
      }
      breakdown[d.category].amount += d.amount;
      breakdown[d.category].count += 1;
    });

    return Object.entries(breakdown).map(([category, data]) => ({
      category,
      ...data,
      percentage: ((data.amount / filtered.reduce((s, d) => s + d.amount, 1)) * 100).toFixed(2)
    }));
  },

  // Get trend data (daily/weekly/monthly aggregation)
  async getTrendData(userId, startDate, endDate, period = 'daily', type = 'income') {
    const filtered = analyticsData.filter(d =>
      d.userId === userId &&
      d.date >= startDate &&
      d.date <= endDate &&
      d.type === type
    );

    const grouped = {};

    filtered.forEach(d => {
      const key = getPeriodKey(d.date, period);
      if (!grouped[key]) {
        grouped[key] = { amount: 0, count: 0, date: getDateForPeriod(d.date, period) };
      }
      grouped[key].amount += d.amount;
      grouped[key].count += 1;
    });

    return Object.entries(grouped)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([, data]) => data);
  },

  // Get summary statistics
  async getSummary(userId, startDate, endDate) {
    const filtered = analyticsData.filter(d =>
      d.userId === userId &&
      d.date >= startDate &&
      d.date <= endDate
    );

    const income = filtered
      .filter(d => d.type === 'income')
      .reduce((sum, d) => sum + d.amount, 0);

    const expenses = filtered
      .filter(d => d.type === 'expense')
      .reduce((sum, d) => sum + d.amount, 0);

    const netIncome = income - expenses;
    const avgTransaction = filtered.length ? (income + expenses) / filtered.length : 0;

    return {
      period: {
        startDate,
        endDate
      },
      income: Math.round(income * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
      netIncome: Math.round(netIncome * 100) / 100,
      transactionCount: filtered.length,
      avgTransaction: Math.round(avgTransaction * 100) / 100,
      savingsRate: income > 0 ? Math.round((netIncome / income) * 100) : 0
    };
  },

  // Get cash flow analysis
  async getCashFlow(userId, startDate, endDate) {
    const trends = await this.getTrendData(userId, startDate, endDate, 'daily', 'income');
    const expenseTrends = await this.getTrendData(userId, startDate, endDate, 'daily', 'expense');

    const combined = {};
    
    trends.forEach(t => {
      const key = t.date.toISOString().split('T')[0];
      if (!combined[key]) combined[key] = { date: t.date, inflow: 0, outflow: 0 };
      combined[key].inflow += t.amount;
    });

    expenseTrends.forEach(t => {
      const key = t.date.toISOString().split('T')[0];
      if (!combined[key]) combined[key] = { date: t.date, inflow: 0, outflow: 0 };
      combined[key].outflow += t.amount;
    });

    return Object.values(combined)
      .sort((a, b) => a.date - b.date)
      .map(item => ({
        ...item,
        netFlow: Math.round((item.inflow - item.outflow) * 100) / 100
      }));
  },

  // Predictive: Forecast income for next N months
  async forecastIncome(userId, months = 3) {
    const now = new Date();
    const pastDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());

    const historicalData = analyticsData.filter(d =>
      d.userId === userId &&
      d.type === 'income' &&
      d.date >= pastDate &&
      d.date <= now
    );

    // Simple average-based forecast
    const monthlyAverages = {};
    historicalData.forEach(d => {
      const month = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyAverages[month]) monthlyAverages[month] = 0;
      monthlyAverages[month] += d.amount;
    });

    const avgMonthly = Object.values(monthlyAverages).length
      ? Object.values(monthlyAverages).reduce((a, b) => a + b) / Object.values(monthlyAverages).length
      : 0;

    const forecast = [];
    for (let i = 1; i <= months; i++) {
      const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      forecast.push({
        month: forecastDate.toISOString().split('T')[0].substring(0, 7),
        forecastedIncome: Math.round(avgMonthly * 100) / 100,
        confidence: calculateConfidence(historicalData.length)
      });
    }

    return forecast;
  },

  // Tax summary report
  async getTaxSummary(userId, year) {
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31`);

    const summary = await this.getSummary(userId, startDate, endDate);
    const _categories = await this.getCategoryBreakdown(userId, startDate, endDate);
    const incomeCats = await this.getCategoryBreakdown(userId, startDate, endDate, 'income');
    const expenseCats = await this.getCategoryBreakdown(userId, startDate, endDate, 'expense');

    return {
      year,
      totalIncome: summary.income,
      totalExpenses: summary.expenses,
      netIncome: summary.netIncome,
      incomeSources: incomeCats,
      deductibleExpenses: expenseCats.filter(c => isDeductible(c.category)),
      estimatedTaxLiability: Math.round(summary.netIncome * 0.25 * 100) / 100, // 25% estimate
      generatedAt: new Date()
    };
  },

  // Generate comprehensive report
  async generateReport(userId, reportType, startDate, endDate, format = 'json') {
    let reportData = {};

    switch (reportType) {
      case 'income':
        reportData = await this.getTrendData(userId, startDate, endDate, 'monthly', 'income');
        break;
      case 'expense':
        reportData = await this.getTrendData(userId, startDate, endDate, 'monthly', 'expense');
        break;
      case 'cashflow':
        reportData = await this.getCashFlow(userId, startDate, endDate);
        break;
      case 'tax_summary':
        reportData = await this.getTaxSummary(userId, startDate.getFullYear());
        break;
      default:
        reportData = await this.getSummary(userId, startDate, endDate);
    }

    const report = {
      _id: `report_${reportCounter++}`,
      userId,
      type: reportType,
      dateRange: { startDate, endDate },
      format,
      data: reportData,
      createdAt: new Date(),
      metadata: {
        dataPoints: analyticsData.filter(d =>
          d.userId === userId && d.date >= startDate && d.date <= endDate
        ).length
      }
    };

    reports.push(report);
    return report;
  },

  // Get user's recent reports
  async getReports(userId, limit = 10) {
    return reports
      .filter(r => r.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },

  // Export data to CSV format
  async exportToCSV(userId, startDate, endDate, type = 'all') {
    const filtered = analyticsData.filter(d =>
      d.userId === userId &&
      d.date >= startDate &&
      d.date <= endDate &&
      (type === 'all' || d.type === type)
    );

    const headers = ['Date', 'Category', 'Type', 'Amount'];
    const rows = filtered.map(d => [
      d.date.toISOString().split('T')[0],
      d.category,
      d.type,
      d.amount
    ]);

    return {
      headers,
      rows,
      csv: [headers, ...rows].map(r => r.join(',')).join('\n')
    };
  },

  // Get analytics dashboard snapshot
  async getDashboardMetrics(userId) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [summary30d, summary90d, trends, forecast] = await Promise.all([
      this.getSummary(userId, thirtyDaysAgo, now),
      this.getSummary(userId, ninetyDaysAgo, now),
      this.getTrendData(userId, thirtyDaysAgo, now, 'daily', 'income'),
      this.forecastIncome(userId, 3)
    ]);

    return {
      last30Days: summary30d,
      last90Days: summary90d,
      recentTrends: trends.slice(-7), // Last 7 days
      incomeForeccast: forecast,
      timestamp: now
    };
  }
};

function getPeriodKey(date, period) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const week = getWeekNumber(date);

  switch (period) {
    case 'daily':
      return `${year}-${month}-${day}`;
    case 'weekly':
      return `${year}-W${week}`;
    case 'monthly':
      return `${year}-${month}`;
    case 'quarterly':
      const quarter = Math.ceil((date.getMonth() + 1) / 3);
      return `${year}-Q${quarter}`;
    case 'annual':
      return `${year}`;
    default:
      return `${year}-${month}`;
  }
}

function getDateForPeriod(date, period) {
  const newDate = new Date(date);
  
  switch (period) {
    case 'daily':
      return newDate;
    case 'weekly':
      newDate.setDate(newDate.getDate() - newDate.getDay() + 1);
      return newDate;
    case 'monthly':
      newDate.setDate(1);
      return newDate;
    case 'quarterly':
      newDate.setMonth(Math.floor(newDate.getMonth() / 3) * 3);
      newDate.setDate(1);
      return newDate;
    case 'annual':
      newDate.setMonth(0);
      newDate.setDate(1);
      return newDate;
    default:
      return newDate;
  }
}

function getWeekNumber(date) {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDay) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDay.getDay() + 1) / 7);
}

function calculateConfidence(dataPoints) {
  // Higher confidence with more historical data
  if (dataPoints >= 12) return 0.95;
  if (dataPoints >= 6) return 0.85;
  if (dataPoints >= 3) return 0.70;
  return 0.50;
}

function isDeductible(category) {
  const deductibleCategories = [
    'office_supplies',
    'equipment',
    'software',
    'utilities',
    'professional_services',
    'travel',
    'meals',
    'insurance',
    'vehicle_maintenance'
  ];
  return deductibleCategories.includes(category.toLowerCase());
}

export default Reporting;
