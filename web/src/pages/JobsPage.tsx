import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Briefcase, Search, Bell, MapPin, Star, DollarSign, TrendingUp, Wallet } from 'lucide-react';
import { JobCard } from '../components/JobCard';
import type { Job } from '../data/mockJobs';
import { useToast } from '../components/Toast';
import { ErrorState } from '../components/ErrorState';
import { GuidedTour, useTourNavigation, useOnboarding } from '../utils/onboardingSystem';
import { apiFetchJson, getUserId } from '../lib/apiClient';
import './JobsPage.css';

const JobMap = lazy(async () => ({
  default: (await import('../components/JobMap')).JobMap,
}));

type V2RecommendedJob = {
  id: string;
  title: string;
  platform: string;
  category?: string;
  pay?: { amount?: number | string };
  distance?: number;
  rating?: number;
  matches?: Array<{ type: string; label: string }>;
};

function toNumberPay(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.]+/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function mapV2JobToJob(rec: V2RecommendedJob): Job {
  const categoryTag =
    rec.category === 'delivery'
      ? 'Delivery'
      : rec.category === 'rideshare'
        ? 'Driving'
        : rec.category === 'tasks'
          ? 'Tasks'
          : rec.category === 'freelance'
            ? 'Tech'
            : rec.category === 'consulting'
              ? 'Tech'
              : 'Flexible';

  return {
    id: rec.id,
    title: rec.title,
    company: rec.platform,
    pay: {
      amount: toNumberPay(rec.pay?.amount),
      unit: 'job',
      currency: 'USD',
    },
    location: {
      city: 'Nearby',
      distance: typeof rec.distance === 'number' ? `${rec.distance.toFixed(1)} mi` : undefined,
    },
    tags: [categoryTag],
    postedAt: new Date().toISOString(),
    urgency: 'medium',
    distanceMiles: rec.distance,
    rating: rec.rating,
    verified: true,
    perks: (rec.matches || []).slice(0, 2).map((m) => m.label),
  };
}

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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { showToast } = useToast();
  const { markTutorialWatched, user } = useOnboarding();

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

  // Load jobs + saved state from backend
  useEffect(() => {
    const userId = getUserId();

    const load = async () => {
      try {
        if (!userId) {
          setJobs([]);
          setLoadError('Sign in to view job recommendations.');
          return;
        }

        const [recommended, saved, alerts] = await Promise.all([
          apiFetchJson<{ recommendations: V2RecommendedJob[] }>(`/api/v2/jobs/recommended?userId=${encodeURIComponent(userId)}`),
          apiFetchJson<{ savedJobs: Array<{ id: string }> }>(`/api/v2/jobs/saved?userId=${encodeURIComponent(userId)}`),
          apiFetchJson<{ alerts: Array<{ isActive: boolean }> }>(`/api/v2/jobs/alerts?userId=${encodeURIComponent(userId)}`),
        ]);

        const mapped = (recommended.recommendations || []).map(mapV2JobToJob);
  setJobs(mapped);
  setLoadError(null);

        const savedIds = new Set((saved.savedJobs || []).map((j) => j.id));
        setJobStatus((prev) => {
          const next: Record<string, 'saved' | 'applied'> = { ...prev };
          savedIds.forEach((id) => {
            if (next[id] !== 'applied') next[id] = 'saved';
          });
          return next;
        });

        setAlertsEnabled((alerts.alerts || []).some((a) => a.isActive));
      } catch (e) {
        setJobs([]);
        setLoadError('Live job data could not be loaded.');
      }
    };

    load();
  }, []);

  // Persist preferences
  useEffect(() => {
    localStorage.setItem('jobs_status', JSON.stringify(jobStatus));
  }, [jobStatus]);

  useEffect(() => {
    localStorage.setItem('jobs_alerts_enabled', alertsEnabled ? 'true' : 'false');
  }, [alertsEnabled]);

  const userId = getUserId();

  const handleApply = (job: Job) => {
    setJobStatus((prev) => {
      const next = { ...prev, [job.id]: 'applied' } as Record<string, 'saved' | 'applied'>;
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
      return next;
    });
    apiFetchJson(`/api/v2/jobs/${encodeURIComponent(job.id)}/save`, {
      method: 'POST',
      body: { userId, saved: wasSaved },
    }).catch(() => null);
    showToast(`${job.title} ${wasSaved ? 'removed from saved' : 'saved for later'}`, 'info');
  };

  const toggleAlerts = () => {
    setAlertsEnabled((prev) => {
      const next = !prev;
      if (next) {
        apiFetchJson('/api/v2/jobs/alerts', {
          method: 'POST',
          body: {
            userId,
            name: 'Smart Job Alerts',
            filters: {
              minPay,
              distance: maxDistance,
              rating: minRating,
              type: filterType,
            },
            channels: ['in-app'],
          },
        }).catch(() => null);
      }
      showToast(next ? 'Job alerts enabled' : 'Job alerts paused', 'info');
      return next;
    });
  };

  const filteredJobs = useMemo(() => jobs.filter(job => {
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
  }), [filterType, jobs, maxDistance, minPay, minRating, searchTerm]);


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
              className="tour-button"
            >
              🎯 Start Tour
            </button>
          )}
          <div className="actions">
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

      <div className="job-filters" data-tour="filter-panel">
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
          className="btn-secondary comparison-toggle-btn"
          onClick={() => setShowComparison(!showComparison)}
        >
          <TrendingUp size={16} /> Maximize Earnings
        </button>
      </div>

      {loadError && jobs.length === 0 && (
        <ErrorState
          type="server"
          title="Jobs unavailable"
          message={loadError}
          onRetry={() => window.location.reload()}
        />
      )}

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
          <Suspense
            fallback={
              <div className="map-loading-state" role="status" aria-live="polite">
                <div className="map-loading-spinner" aria-hidden="true" />
                <p>Loading map view...</p>
              </div>
            }
          >
            <JobMap jobs={filteredJobs} center={mapCenter} />
          </Suspense>
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
            <button className="button primary mt-4" onClick={() => setFilterType('all')}>Update Preferences</button>
        </div>
      )}
    </div>
    </>
  );
};
