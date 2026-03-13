import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  FileCheck, 
  PieChart 
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { apiFetchBlob, apiFetchJson, getUserId } from '../lib/apiClient';
import './TaxPage.css';

export const TaxPage: React.FC = () => {
  const { userProfile } = useAppContext();
  const { showToast } = useToast();
  const [taxYear] = useState(new Date().getFullYear());
  const [estimatedTax, setEstimatedTax] = useState(0);
  const [taxSummary, setTaxSummary] = useState<any | null>(null);
  const [quarters, setQuarters] = useState<Array<{ q: string; due: string; paid: boolean; status: string }>>([
    { q: 'Q1', due: 'Apr 15', paid: false, status: 'Upcoming' },
    { q: 'Q2', due: 'Jun 15', paid: false, status: 'Future' },
    { q: 'Q3', due: 'Sep 15', paid: false, status: 'Future' },
    { q: 'Q4', due: 'Jan 15', paid: false, status: 'Future' },
  ]);
  
  const userId = getUserId();

  const parseCurrency = (value: unknown): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const s = String(value ?? '0');
    const cleaned = s.replace(/[^0-9.-]+/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  };

  useEffect(() => {
    (async () => {
      try {
        const [summaryRes, quartersRes] = await Promise.all([
          apiFetchJson<any>(`/api/v2/reporting/tax-summary?year=${encodeURIComponent(String(taxYear))}`),
          apiFetchJson<any>(`/api/v2/tax/quarters?year=${encodeURIComponent(String(taxYear))}&userId=${encodeURIComponent(userId)}`),
        ]);
        if (summaryRes?.success) {
          setTaxSummary(summaryRes.data);
          setEstimatedTax(parseCurrency(summaryRes.data?.estimatedTaxLiability));
        }
        if (quartersRes?.success && Array.isArray(quartersRes.quarters)) {
          setQuarters(quartersRes.quarters);
        }
      } catch {
        // fall back to existing demo values
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxYear]);

  const totalIncome = taxSummary ? parseCurrency(taxSummary.totalIncome) : userProfile.earnings;
  const totalDeductions = taxSummary && Array.isArray(taxSummary.deductibleExpenses)
    ? taxSummary.deductibleExpenses.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0)
    : 0;

  const handleManualPayment = async (q: string) => {
    try {
      const res = await apiFetchJson<any>('/api/v2/tax/quarters/mark-paid', {
        method: 'POST',
        body: { userId, year: taxYear, quarter: q },
      });
      if (res?.success && Array.isArray(res.quarters)) {
        setQuarters(res.quarters);
      }
      showToast(`Marked ${q} as paid!`, 'success');
    } catch {
      showToast('Unable to update payment status. Please retry.', 'error');
    }
  };

  const handleExport1099 = async () => {
    try {
      const startDate = `${taxYear}-01-01`;
      const endDate = `${taxYear}-12-31`;
      const pdf = await apiFetchBlob(
        `/api/v2/reporting/export-pdf?reportType=tax_summary&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&userId=${encodeURIComponent(userId)}`
      );
      const url = URL.createObjectURL(pdf);
      const a = document.createElement('a');
      a.href = url;
      a.download = `moneygen-1099-${taxYear}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('1099 report exported.', 'success');
    } catch {
      showToast('Export failed. Please retry.', 'error');
    }
  };

  return (
    <div className="tax-page">
      <div className="tax-header">
        <h2>
          <Calculator className="text-emerald-600" size={28} /> 
          Tax Estimator {taxYear}
        </h2>
        <button className="button secondary" onClick={handleExport1099}>
          <FileCheck size={18} /> Export 1099 Report
        </button>
      </div>

      <div className="tax-summary-grid">
        <div className="tax-card">
          <div className="card-label"><TrendingUp size={16} /> Gross Income</div>
          <div className="card-amount">${totalIncome.toLocaleString()}</div>
          <div className="card-subtext">YTD Earnings</div>
        </div>

        <div className="tax-card">
          <div className="card-label"><TrendingDown size={16} /> Total Deductions</div>
          <div className="card-amount text-emerald-600">-${totalDeductions.toLocaleString()}</div>
          <div className="card-subtext">{taxSummary?.deductibleExpenses?.length || 0} categories tracked</div>
        </div>

        <div className="tax-card highlight">
          <div className="card-label"><PieChart size={16} /> Est. Tax Owed</div>
          <div className="card-amount text-amber-600">${estimatedTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div className="card-subtext">~{totalIncome > 0 ? ((estimatedTax / totalIncome) * 100).toFixed(1) : '0.0'}% effective rate</div>
        </div>
      </div>

      <div className="tax-progress-section">
        <div className="progress-header">
          <h3>Quarterly Estimated Payments</h3>
          <span className="text-secondary">Next Due: {quarters.find(q => !q.paid)?.due}</span>
        </div>
        
        <div className="dates-grid">
          {quarters.map((q, idx) => (
            <div 
              key={idx} 
              className={`date-card ${q.status === 'Upcoming' ? 'active' : ''} ${q.paid ? 'paid' : ''} ${!q.paid ? 'clickable' : ''}`}
              onClick={() => !q.paid && handleManualPayment(q.q)}
            >
              <div className="quarter-label">{q.q}</div>
              <div className="quarter-due">{q.due}</div>
              <div className={`badge ${q.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100'}`}>
                {q.paid ? 'PAID' : q.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="deductions-container">
        <h3 className="deductions-title">Tracked Deductions</h3>
        <div className="deductions-list">
          {(taxSummary?.deductibleExpenses || []).map((item: any, idx: number) => (
            <div key={`${item.category || 'cat'}-${idx}`} className="deduction-item">
              <div className="deduction-icon">💸</div>
              <div className="deduction-info">
                <div className="deduction-title">{item.category || 'Expense'}</div>
                <div className="deduction-desc">{Number(item.count || 0)} transactions</div>
              </div>
              <div className="deduction-value">${Number(item.amount || 0).toLocaleString()}</div>
            </div>
          ))}
          <div className="deduction-item deduction-total-row">
            <div className="deduction-total-label">Total Potential Savings</div>
            <div className="text-emerald-600">
              ~${estimatedTax.toLocaleString(undefined, { maximumFractionDigits: 0 })} estimated liability
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
