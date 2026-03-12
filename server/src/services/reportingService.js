/**
 * Reporting Service
 * Business logic layer for analytics and reporting
 */

import Reporting from '../models/Reporting.js';
import { logger } from '../logger.js';

const ReportingService = {
  /**
   * Track transaction for analytics
   */
  async recordTransaction(userId, transactionData) {
    try {
      const { category, amount, type, date } = transactionData;

      if (!category || !amount || !type) {
        throw new Error('Category, amount, and type are required');
      }

      const validTypes = ['income', 'expense'];
      if (!validTypes.includes(type)) {
        throw new Error(`Type must be one of: ${validTypes.join(', ')}`);
      }

      const record = await Reporting.recordTransaction(userId, {
        category,
        amount,
        type,
        date: date ? new Date(date) : new Date()
      });

      return {
        success: true,
        transaction: record
      };
    } catch (error) {
      logger.error('Error recording transaction:', error);
      throw error;
    }
  },

  /**
   * Get dashboard metrics snapshot
   */
  async getDashboardMetrics(userId) {
    try {
      const metrics = await Reporting.getDashboardMetrics(userId);

      return {
        success: true,
        metrics: {
          last30Days: {
            income: metrics.last30Days.income,
            expenses: metrics.last30Days.expenses,
            netIncome: metrics.last30Days.netIncome,
            savingsRate: `${metrics.last30Days.savingsRate}%`,
            transactions: metrics.last30Days.transactionCount
          },
          last90Days: {
            income: metrics.last90Days.income,
            expenses: metrics.last90Days.expenses,
            netIncome: metrics.last90Days.netIncome
          },
          trends: metrics.recentTrends,
          forecast: metrics.incomeForeccast,
          timestamp: metrics.timestamp
        }
      };
    } catch (error) {
      logger.error('Error fetching dashboard metrics:', error);
      throw error;
    }
  },

  /**
   * Get income/expense breakdown by category
   */
  async getCategoryBreakdown(userId, startDate, endDate, type = 'all') {
    try {
      const breakdown = await Reporting.getCategoryBreakdown(
        userId,
        new Date(startDate),
        new Date(endDate),
        type
      );

      return {
        success: true,
        data: breakdown,
        period: {
          startDate,
          endDate
        }
      };
    } catch (error) {
      logger.error('Error fetching category breakdown:', error);
      throw error;
    }
  },

  /**
   * Get trend data
   */
  async getTrends(userId, startDate, endDate, period = 'daily', type = 'income') {
    try {
      const validPeriods = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'];
      const validTypes = ['income', 'expense'];

      if (!validPeriods.includes(period)) {
        throw new Error(`Period must be one of: ${validPeriods.join(', ')}`);
      }

      if (!validTypes.includes(type)) {
        throw new Error(`Type must be one of: ${validTypes.join(', ')}`);
      }

      const trends = await Reporting.getTrendData(
        userId,
        new Date(startDate),
        new Date(endDate),
        period,
        type
      );

      return {
        success: true,
        data: trends,
        period: {
          startDate,
          endDate,
          granularity: period
        }
      };
    } catch (error) {
      logger.error('Error fetching trends:', error);
      throw error;
    }
  },

  /**
   * Get cash flow analysis
   */
  async getCashFlow(userId, startDate, endDate) {
    try {
      const cashFlow = await Reporting.getCashFlow(
        userId,
        new Date(startDate),
        new Date(endDate)
      );

      // Calculate summary
      const totalInflow = cashFlow.reduce((sum, d) => sum + d.inflow, 0);
      const totalOutflow = cashFlow.reduce((sum, d) => sum + d.outflow, 0);
      const netFlow = totalInflow - totalOutflow;

      return {
        success: true,
        data: cashFlow,
        summary: {
          totalInflow,
          totalOutflow,
          netFlow,
          avgDailyFlow: Math.round((netFlow / cashFlow.length) * 100) / 100
        },
        period: {
          startDate,
          endDate
        }
      };
    } catch (error) {
      logger.error('Error fetching cash flow:', error);
      throw error;
    }
  },

  /**
   * Get income forecast
   */
  async getForecast(userId, months = 3) {
    try {
      if (months < 1 || months > 12) {
        throw new Error('Forecast period must be between 1 and 12 months');
      }

      const forecast = await Reporting.forecastIncome(userId, months);

      return {
        success: true,
        data: forecast,
        generatedAt: new Date(),
        disclaimer: 'Forecasts are based on historical data and may not reflect future performance'
      };
    } catch (error) {
      logger.error('Error generating forecast:', error);
      throw error;
    }
  },

  /**
   * Get tax summary for a year
   */
  async getTaxSummary(userId, year) {
    try {
      if (!year || year < 2000 || year > new Date().getFullYear()) {
        throw new Error('Invalid year');
      }

      const taxSummary = await Reporting.getTaxSummary(userId, year);

      return {
        success: true,
        data: {
          year: taxSummary.year,
          totalIncome: `$${taxSummary.totalIncome.toFixed(2)}`,
          totalExpenses: `$${taxSummary.totalExpenses.toFixed(2)}`,
          netIncome: `$${taxSummary.netIncome.toFixed(2)}`,
          estimatedTaxLiability: `$${taxSummary.estimatedTaxLiability.toFixed(2)}`,
          incomeSources: taxSummary.incomeSources,
          deductibleExpenses: taxSummary.deductibleExpenses,
          generatedAt: taxSummary.generatedAt
        },
        disclaimer: 'This is an estimate. Consult a tax professional for accurate information.'
      };
    } catch (error) {
      logger.error('Error fetching tax summary:', error);
      throw error;
    }
  },

  /**
   * Generate comprehensive report
   */
  async generateReport(userId, reportType, startDate, endDate, format = 'json') {
    try {
      const validTypes = ['income', 'expense', 'cashflow', 'tax_summary', 'summary'];
      const validFormats = ['json', 'csv', 'pdf'];

      if (!validTypes.includes(reportType)) {
        throw new Error(`Report type must be one of: ${validTypes.join(', ')}`);
      }

      if (!validFormats.includes(format)) {
        throw new Error(`Format must be one of: ${validFormats.join(', ')}`);
      }

      const report = await Reporting.generateReport(
        userId,
        reportType,
        new Date(startDate),
        new Date(endDate),
        format
      );

      let responseData = report.data;

      // Format data based on requested format
      if (format === 'csv') {
        const csv = await Reporting.exportToCSV(userId, new Date(startDate), new Date(endDate));
        responseData = csv.csv;
      }

      return {
        success: true,
        report: {
          id: report._id,
          type: reportType,
          format,
          period: report.dateRange,
          data: responseData,
          generatedAt: report.createdAt
        }
      };
    } catch (error) {
      logger.error('Error generating report:', error);
      throw error;
    }
  },

  /**
   * Export data to CSV
   */
  async exportCSV(userId, startDate, endDate, type = 'all') {
    try {
      const csv = await Reporting.exportToCSV(
        userId,
        new Date(startDate),
        new Date(endDate),
        type
      );

      return {
        success: true,
        format: 'csv',
        headers: csv.headers,
        rows: csv.rows,
        content: csv.csv,
        filename: `financial_report_${new Date().toISOString().split('T')[0]}.csv`
      };
    } catch (error) {
      logger.error('Error exporting CSV:', error);
      throw error;
    }
  },

  /**
   * Get user's reports
   */
  async getReports(userId, limit = 10) {
    try {
      const reports = await Reporting.getReports(userId, limit);

      return {
        success: true,
        reports: reports.map(r => ({
          id: r._id,
          type: r.type,
          format: r.format,
          period: r.dateRange,
          generatedAt: r.createdAt
        }))
      };
    } catch (error) {
      logger.error('Error fetching reports:', error);
      throw error;
    }
  },

  /**
   * Get insights and recommendations
   */
  async getInsights(userId) {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const summary = await Reporting.getSummary(userId, thirtyDaysAgo, now);
      const categories = await Reporting.getCategoryBreakdown(userId, thirtyDaysAgo, now);

      const insights = [];

      // Income insight
      if (summary.income > 0) {
        const incomePerDay = summary.income / 30;
        insights.push({
          type: 'success',
          title: 'Strong Income',
          message: `You're earning an average of $${incomePerDay.toFixed(2)}/day`
        });
      }

      // Savings rate
      if (summary.savingsRate >= 50) {
        insights.push({
          type: 'success',
          title: 'Great Savings',
          message: `${summary.savingsRate}% savings rate - keep it up!`
        });
      } else if (summary.savingsRate > 0 && summary.savingsRate < 20) {
        insights.push({
          type: 'warning',
          title: 'Low Savings Rate',
          message: 'Consider reducing expenses to increase savings'
        });
      }

      // Highest expense category
      if (categories.length > 0) {
        const highest = categories.sort((a, b) => b.amount - a.amount)[0];
        insights.push({
          type: 'info',
          title: 'Top Expense',
          message: `Your highest expense category is ${highest.category} ($${highest.amount.toFixed(2)})`
        });
      }

      return {
        success: true,
        insights,
        period: '30_days'
      };
    } catch (error) {
      logger.error('Error fetching insights:', error);
      throw error;
    }
  }
};

export default ReportingService;
