import React, { useState } from 'react';
import { Briefcase, Search, Filter } from 'lucide-react';
import { JobCard } from '../components/JobCard';
import { MOCK_JOBS, Job } from '../data/mockJobs';
import { useToast } from '../components/Toast';

export const JobsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const { showToast } = useToast();

  const handleApply = (job: Job) => {
      showToast(`Applied to ${job.title} at ${job.company}!`, 'success');
  };

  const filteredJobs = MOCK_JOBS.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          job.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || job.urgency === filterType || (filterType === 'delivery' && job.tags.includes('Delivery'));
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="jobs-page">
      <header className="page-header">
        <h2>Find Jobs</h2>
        <div className="actions">
          <button className="btn-icon"><Search size={20} /></button>
          <button className="btn-icon"><Filter size={20} /></button>
        </div>
      </header>

      <div className="job-filters" style={{ padding: '0 1rem 1rem', display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
          <button className={`filter-chip ${filterType === 'all' ? 'active' : ''}`} onClick={() => setFilterType('all')}>All</button>
          <button className={`filter-chip ${filterType === 'high' ? 'active' : ''}`} onClick={() => setFilterType('high')}>Urgent</button>
          <button className={`filter-chip ${filterType === 'delivery' ? 'active' : ''}`} onClick={() => setFilterType('delivery')}>Delivery</button>
      </div>
      
      {filteredJobs.length > 0 ? (
        <div className="job-list" style={{ padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredJobs.map(job => (
             <JobCard key={job.id} job={job} onClick={handleApply} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
            <Briefcase size={48} className="text-gray-400" />
            <h3>No jobs found nearby</h3>
            <p>Try expanding your search radius or update your filters.</p>
            <button className="btn-primary mt-4" onClick={() => setFilterType('all')}>Update Preferences</button>
        </div>
      )}
      
      <style>{`
        .filter-chip {
            padding: 0.5rem 1rem;
            border-radius: 9999px;
            border: 1px solid #e2e8f0;
            background: white;
            font-size: 0.85rem;
            cursor: pointer;
            white-space: nowrap;
        }
        .filter-chip.active {
            background-color: #2563eb;
            color: white;
            border-color: #2563eb;
        }
      `}</style>
    </div>
  );
};
