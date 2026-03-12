import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Briefcase, Search, Bell, MapPin, Star, DollarSign, TrendingUp, Wallet, Check } from 'lucide-react';
import { JobCard } from '../components/JobCard';
import { JobMap } from '../components/JobMap';
import { MOCK_JOBS, Job } from '../data/mockJobs';
import { useToast } from '../components/Toast';
import { GuidedTour, useTourNavigation, useOnboarding } from '../utils/onboardingSystem';
import './JobsPage.css';

export const JobsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [minPay, setMinPay] = useState(20);
  const [maxDistance, setMaxDistance] = useState(15);
  const [minRating, setMinRating] = useState(4.5);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [jobStatus, setJobStatus] = useState<Record<string, 'saved' | 'applied'>>({});
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [showComparison, setShowComparison] = useState(false);
  const { showToast } = useToast();
  const { markTutorialWatched, user } = useOnboarding();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const jobBoardTourSteps = [
    {
      id: 'jobs-search',
      title: 'Find Opportunities',
      description: 'Search and filter jobs based on your skills and preferences.',
      highlightSelector: '[data-tour="search-bar"]',
      position: 'bottom' as const,
    },
    {
      id: 'jobs-filters',
      title: 'Smart Filters',
      description: 'Filter by pay rate, distance, ratings, and job type.',
      highlightSelector: '[data-tour="filter-panel"]',
      position: 'bottom' as const,
    },
    {
      id: 'jobs-cards',
      title: 'Job Listings',
      description: 'View opportunities with detailed information about each job.',
      highlightSelector: '[data-tour="job-cards"]',
      position: 'top' as const,
    },
    {
      id: 'jobs-alerts',
      title: 'Job Alerts',
      description: 'Enable alerts to get notified when new matching jobs appear.',
      highlightSelector: '[data-tour="alerts-toggle"]',
      position: 'top' as const,
    },
  ];

  const tour = useTourNavigation(jobBoardTourSteps, () => {
    markTutorialWatched('jobboard-tour');
    showToast('Job board tour complete! 🎉', 'success');
  });

  const shouldShowTour = user.role && !user.tutorialsWatched.includes('jobboard-tour');

  // Load persisted preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/v1/profile/settings?userId=demo-user`);
        const payload = await res.json();
        const prefs = payload.settings?.jobPreferences || {};
        if (prefs.status) setJobStatus(prefs.status);
        if (typeof prefs.alertsEnabled === 'boolean') setAlertsEnabled(prefs.alertsEnabled);
      } catch {
        const saved = localStorage.getItem('jobs_status');
        const alerts = localStorage.getItem('jobs_alerts_enabled');
        if (saved) {
          try {
            setJobStatus(JSON.parse(saved));
          } catch {
            // ignore parse errors
          }
        }
        if (alerts) setAlertsEnabled(alerts === 'true');
      }

      try {
        const res = await fetch(`${apiUrl}/api/v1/notifications/preferences?userId=demo-user`);
        if (res.ok) {
          const data = await res.json();
          const jobPref = data.preferences?.new_job_match;
          if (jobPref && typeof jobPref.push === 'boolean') {
            setAlertsEnabled(jobPref.push);
          }
        }
      } catch {
        // best-effort load
      }
    };

    loadPreferences();
  }, [apiUrl]);

  // Persist preferences
  useEffect(() => {
    localStorage.setItem('jobs_status', JSON.stringify(jobStatus));
  }, [jobStatus]);

  useEffect(() => {
    localStorage.setItem('jobs_alerts_enabled', alertsEnabled ? 'true' : 'false');
  }, [alertsEnabled]);

  const persistJobPreferences = useCallback(async (nextStatus: Record<string, 'saved' | 'applied'>, nextAlerts: boolean) => {
    try {
      await fetch(`${apiUrl}/api/v1/profile/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo-user',
          settings: {
            jobPreferences: {
              status: nextStatus,
              alertsEnabled: nextAlerts,
            },
          },
        }),
      });
    } catch {
      // best-effort persistence
    }
  }, [apiUrl]);

  const syncNotificationPreference = useCallback(async (nextAlerts: boolean) => {
    try {
      await fetch(`${apiUrl}/api/v1/notifications/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo-user',
          preferences: {
            new_job_match: { push: nextAlerts, email: false, sms: false },
          },
        }),
      });
    } catch {
      // ignore network errors
    }
  }, [apiUrl]);

  const handleApply = (job: Job) => {
    setJobStatus((prev) => {
      const next = { ...prev, [job.id]: 'applied' } as Record<string, 'saved' | 'applied'>;
      persistJobPreferences(next, alertsEnabled);
      return next;
    });
    showToast(`Applied to ${job.title} at ${job.company}!`, 'success');
  };

  const handleSave = (job: Job) => {
    const wasSaved = jobStatus[job.id] === 'saved';
    setJobStatus((prev) => {
      const next = { ...prev } as Record<string, 'saved' | 'applied'>;
      if (next[job.id] === 'saved') {
        delete next[job.id];
      } else {
        next[job.id] = 'saved';
      }
      persistJobPreferences(next, alertsEnabled);
      return next;
    });
    showToast(`${job.title} ${wasSaved ? 'removed from saved' : 'saved for later'}`, 'info');
  };

  const toggleAlerts = () => {
    setAlertsEnabled((prev) => {
      const next = !prev;
      persistJobPreferences(jobStatus, next);
      syncNotificationPreference(next);
      showToast(next ? 'Job alerts enabled' : 'Job alerts paused', 'info');
      return next;
    });
  };

  const filteredJobs = useMemo(() => MOCK_JOBS.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          job.company.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = false;
    if (filterType === 'all') matchesFilter = true;
    else if (filterType === 'delivery') matchesFilter = job.tags.includes('Delivery');
    else if (filterType === 'survey') matchesFilter = job.tags.includes('Survey') || job.tags.includes('Testing');
    else if (filterType === 'ai') matchesFilter = job.tags.includes('AI') || job.tags.includes('Tech');
    else if (filterType === 'content') matchesFilter = job.tags.includes('Content') || job.tags.includes('Game');
    else matchesFilter = job.urgency === filterType;

    const matchesPay = job.pay.amount >= minPay;
    const matchesDistance = job.distanceMiles ? job.distanceMiles <= maxDistance : true;
    const matchesRating = job.rating ? job.rating >= minRating : true;
    return matchesSearch && matchesFilter && matchesPay && matchesDistance && matchesRating;
  }), [filterType, maxDistance, minPay, minRating, searchTerm]);


  // Derive map center from the first filtered job or default to SF
  const mapCenter: [number, number] = useMemo(() => {
    if (filteredJobs.length > 0 && filteredJobs[0].longitude && filteredJobs[0].latitude) {
      return [filteredJobs[0].longitude, filteredJobs[0].latitude];
    }
    return [-122.4194, 37.7749];
  }, [filteredJobs]);

  return (
    <>
      {tour.isActive && (
        <GuidedTour
          steps={jobBoardTourSteps}
          isActive={tour.isActive}
          currentStepIndex={tour.currentStepIndex}
          onStepChange={tour.goToStep}
          onComplete={tour.skipTour}
          onSkip={tour.skipTour}
          showSkip
        />
      )}
      <div className="jobs-page">
        <header className="page-header">
          <h2>Find Jobs</h2>
          {shouldShowTour && (
            <button
              onClick={tour.startTour}
              style={{
                marginLeft: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              🎯 Start Tour
            </button>
          )}
          <div className="actions" style={{ display: 'flex', gap: '0.5rem' }}>
            <div className="search-box" data-tour="search-bar">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search jobs or companies"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="view-toggle">
            <button className={`toggle-chip ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
              List
            </button>
            <button className={`toggle-chip ${viewMode === 'map' ? 'active' : ''}`} onClick={() => setViewMode('map')}>
              <MapPin size={14} /> Map
            </button>
          </div>
        </div>
      </header>

      <div className="job-filters" data-tour="filter-panel" style={{ padding: '0 var(--space-4) var(--space-4)', display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
          <button className={`badge ${filterType === 'all' ? 'bg-emerald-600 text-white' : 'bg-gray-100'}`} onClick={() => setFilterType('all')}>All</button>
          <button className={`badge ${filterType === 'high' ? 'bg-red-100 text-red-700' : 'bg-gray-100'}`} onClick={() => setFilterType('high')}>Urgent</button>
          <button className={`badge ${filterType === 'delivery' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`} onClick={() => setFilterType('delivery')}>Delivery</button>
          <button className={`badge ${filterType === 'survey' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'}`} onClick={() => setFilterType('survey')}>Surveys & Tasks</button>
          <button className={`badge ${filterType === 'ai' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100'}`} onClick={() => setFilterType('ai')}>AI & Tech</button>
          <button className={`badge ${filterType === 'content' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100'}`} onClick={() => setFilterType('content')}>Content & Games</button>
          <button className={`badge ${filterType === 'medium' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`} onClick={() => setFilterType('medium')}>Good fit</button>
          <button className={`badge ${filterType === 'low' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100'}`} onClick={() => setFilterType('low')}>Flexible</button>
      </div>

      <div className="advanced-filters">
        <div className="filter-row">
          <label>
            <span><DollarSign size={14} /> Min pay (${minPay}/hr)</span>
            <input type="range" min={0} max={80} step={5} value={minPay} onChange={(e) => setMinPay(Number(e.target.value))} />
          </label>
          <label>
            <span><MapPin size={14} /> Max distance ({maxDistance} mi)</span>
            <input type="range" min={1} max={50} step={1} value={maxDistance} onChange={(e) => setMaxDistance(Number(e.target.value))} />
          </label>
          <label>
            <span><Star size={14} /> Min rating ({minRating}+)</span>
            <input type="range" min={3} max={5} step={0.1} value={minRating} onChange={(e) => setMinRating(Number(e.target.value))} />
          </label>
        </div>
        <div className="alerts-card">
          <div>
            <p className="alert-title"><Bell size={16} /> Smart alerts</p>
            <p className="alert-body">Get notified for high-paying gigs near you and roles matching your tags.</p>
          </div>
          <button className="btn-secondary" data-tour="alerts-toggle" onClick={toggleAlerts}>{alertsEnabled ? 'Pause alerts' : 'Enable alerts'}</button>
        </div>

        <button 
          className="btn-secondary"
          onClick={() => setShowComparison(!showComparison)}
          style={{ height: 'fit-content', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <TrendingUp size={16} /> Maximize Earnings
        </button>
      </div>

      {showComparison && (
        <div className="comparison-tool">
          <h4 className="comparison-header">
            <Wallet size={16} /> Platform Comparison (Scrimpr Data)
          </h4>
          <div className="comparison-grid">
            <div className="compare-card">
              <div className="compare-platform">Survey Junkie</div>
              <div className="compare-rate">$12/hr avg</div>
              <div className="compare-meta">Low threshold: $5.00</div>
            </div>
            <div className="compare-card">
              <div className="compare-platform">UserTesting</div>
              <div className="compare-rate">$60/hr avg</div>
              <div className="compare-meta">Best for: Tech Tests</div>
            </div>
            <div className="compare-card">
              <div className="compare-platform">Swagbucks</div>
              <div className="compare-rate">$8/hr avg</div>
              <div className="compare-meta">Best for: Games</div>
            </div>
          </div>
          <p className="comparison-disclaimer">
            * Rates based on user reports. Use Scrimpr to compare current offers.
          </p>
        </div>
      )}
      
      {viewMode === 'map' ? (
        <div className="map-view">
          <JobMap jobs={filteredJobs} center={mapCenter} />
        </div>
      ) : filteredJobs.length > 0 ? (
        <div className="job-list" data-tour="job-cards">
          {filteredJobs.map(job => (
             <JobCard
               key={job.id}
               job={job}
               status={jobStatus[job.id] || null}
               onApply={handleApply}
               onSave={handleSave}
             />
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
    </div>
  );
};
            cursor: pointer;
            color: #475569;
        }
        .toggle-chip.active {
            background: #eef2ff;
            color: #4338ca;
        }
        .advanced-filters {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 1rem;
            margin: 0 1rem 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
        .filter-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 0.75rem;
        }
        .filter-row label {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
            font-size: 0.9rem;
            color: #1f2937;
        }
        .alerts-card {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            background: #f8fafc;
            border: 1px dashed #e2e8f0;
            border-radius: 10px;
            padding: 0.75rem 1rem;
        }
        .alert-title {
            display: flex;
            gap: 0.35rem;
            align-items: center;
            font-weight: 700;
            margin: 0;
            color: #1f2937;
        }
        .alert-body {
            margin: 0.15rem 0 0;
            color: #475569;
            font-size: 0.9rem;
        }
      </div>
    </>
  );
};
