import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  FileCheck, 
  PieChart 
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../components/Toast';
import './TaxPage.css';

export const TaxPage: React.FC = () => {
  const { userProfile } = useAppContext();
  const { showToast } = useToast();
  const [taxYear] = useState(new Date().getFullYear());
  const [estimatedTax, setEstimatedTax] = useState(0);
  
  // Tax constants based on typical self-employment 
  const SE_TAX_RATE = 0.153; // ~15.3% for FICA
  const INCOME_TAX_RATE = 0.12; // Simplified bracket for demo

  // Simulated deductions from other modules
  const DEDUCTIONS = [
    { id: 'mileage', title: 'Start/Stop Mileage', amount: 1245.50, icon: '🚗', desc: '1,860 miles @ $0.67/mi' },
    { id: 'supplies', title: 'Business Supplies', amount: 450.00, icon: '📦', desc: 'Phone, Data plan portion' },
    { id: 'fees', title: 'Platform Fees', amount: 320.00, icon: '💸', desc: 'Service fees & commissions' },
    { id: 'home', title: 'Home Office', amount: 1500.00, icon: '🏠', desc: 'Simplified method' },
  ];

  const totalDeductions = DEDUCTIONS.reduce((sum, item) => sum + item.amount, 0);
  const taxableIncome = Math.max(0, userProfile.earnings - totalDeductions);
  
  useEffect(() => {
    // Basic calculation
    const seTax = taxableIncome * SE_TAX_RATE;
    const incomeTax = taxableIncome * INCOME_TAX_RATE;
    setEstimatedTax(seTax + incomeTax);
  }, [userProfile.earnings, totalDeductions]);

  // Quarterly Payments Schedule
  const QUARTERS = [
    { q: 'Q1', due: 'Apr 15', paid: true, status: 'Paid' },
    { q: 'Q2', due: 'Jun 15', paid: false, status: 'Upcoming' },
    { q: 'Q3', due: 'Sep 15', paid: false, status: 'Future' },
    { q: 'Q4', due: 'Jan 15', paid: false, status: 'Future' },
  ];

  const handleManualPayment = (q: string) => {
    showToast(`Marked ${q} as paid!`, 'success');
  };

  return (
    <div className="tax-page">
      <div className="tax-header">
        <h2>
          <Calculator className="text-emerald-600" size={28} /> 
          Tax Estimator {taxYear}
        </h2>
        <button className="button secondary">
          <FileCheck size={18} /> Export 1099 Report
        </button>
      </div>

      <div className="tax-summary-grid">
        <div className="tax-card">
          <div className="card-label"><TrendingUp size={16} /> Gross Income</div>
          <div className="card-amount">${userProfile.earnings.toLocaleString()}</div>
          <div className="card-subtext">YTD Earnings</div>
        </div>

        <div className="tax-card">
          <div className="card-label"><TrendingDown size={16} /> Total Deductions</div>
          <div className="card-amount text-emerald-600">-${totalDeductions.toLocaleString()}</div>
          <div className="card-subtext">{DEDUCTIONS.length} categories tracked</div>
        </div>

        <div className="tax-card highlight">
          <div className="card-label"><PieChart size={16} /> Est. Tax Owed</div>
          <div className="card-amount text-amber-600">${estimatedTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div className="card-subtext">~{(estimatedTax / userProfile.earnings * 100).toFixed(1)}% effective rate</div>
        </div>
      </div>

      <div className="tax-progress-section">
        <div className="progress-header">
          <h3>Quarterly Estimated Payments</h3>
          <span className="text-secondary">Next Due: {QUARTERS.find(q => !q.paid)?.due}</span>
        </div>
        
        <div className="dates-grid">
          {QUARTERS.map((q, idx) => (
            <div 
              key={idx} 
              className={`date-card ${q.status === 'Upcoming' ? 'active' : ''} ${q.paid ? 'paid' : ''}`}
              onClick={() => !q.paid && handleManualPayment(q.q)}
              style={{ cursor: !q.paid ? 'pointer' : 'default' }}
            >
              <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{q.q}</div>
              <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>{q.due}</div>
              <div className={`badge ${q.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100'}`}>
                {q.paid ? 'PAID' : q.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="deductions-container">
        <h3 style={{ marginBottom: '1rem', fontWeight: 700, fontSize: '1.25rem' }}>Tracked Deductions</h3>
        <div className="deductions-list">
          {DEDUCTIONS.map((item) => (
            <div key={item.id} className="deduction-item">
              <div className="deduction-icon">{item.icon}</div>
              <div className="deduction-info">
                <div className="deduction-title">{item.title}</div>
                <div className="deduction-desc">{item.desc}</div>
              </div>
              <div className="deduction-value">
                ${item.amount.toLocaleString()}
              </div>
            </div>
          ))}
          <div className="deduction-item" style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
            <div style={{ paddingLeft: '3.5rem' }}>Total Potential Savings</div>
            <div className="text-emerald-600">
              ~${(totalDeductions * (SE_TAX_RATE + INCOME_TAX_RATE)).toLocaleString(undefined, { maximumFractionDigits: 0 })} in tax
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
