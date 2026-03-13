import React, { useState, useEffect } from 'react';
import { Route, Play, StopCircle, Navigation2, FileText, Settings, Download } from 'lucide-react';
import { useToast } from '../components/Toast';
import './MileagePage.css';

interface Trip {
  id: string;
  date: Date;
  distance: number;
  duration: string;
  startLocation: string;
  endLocation: string;
  type: 'business' | 'personal';
  deduction: number;
}

export const MileagePage: React.FC = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentDistance, setCurrentDistance] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [trips, setTrips] = useState<Trip[]>([]);
  const { showToast } = useToast();

  const IRS_RATE = 0.67; // 2024 IRS Rate

  // Mock tracking simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
        setCurrentDistance(prev => Number((prev + 0.01).toFixed(2))); // Simulate driving
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking]);

  const toggleTracking = () => {
    if (isTracking) {
      // Stop Tracking
      const newTrip: Trip = {
        id: Date.now().toString(),
        date: new Date(),
        distance: currentDistance,
        duration: formatTime(elapsedTime),
        startLocation: 'Current Location',
        endLocation: 'Destination',
        type: 'business',
        deduction: currentDistance * IRS_RATE
      };
      setTrips([newTrip, ...trips]);
      setIsTracking(false);
      setCurrentDistance(0);
      setElapsedTime(0);
      showToast('Trip saved! ' + newTrip.distance + ' miles logged.', 'success');
    } else {
      // Start Tracking
      setIsTracking(true);
      showToast('Tracking started. Drive safely!', 'info');
    }
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const toggleTripType = (id: string, type: 'business' | 'personal') => {
    setTrips(trips.map(t => 
      t.id === id ? { ...t, type, deduction: type === 'business' ? t.distance * IRS_RATE : 0 } : t
    ));
  };

  // Mock initial data
  useEffect(() => {
    setTrips([
      {
        id: '1',
        date: new Date(2024, 2, 10),
        distance: 12.4,
        duration: '24:00',
        startLocation: 'Home Office',
        endLocation: 'Downtown Client',
        type: 'business',
        deduction: 12.4 * IRS_RATE
      },
      {
        id: '2',
        date: new Date(2024, 2, 9),
        distance: 8.2,
        duration: '15:30',
        startLocation: 'Downtown',
        endLocation: 'Supply Store',
        type: 'business',
        deduction: 8.2 * IRS_RATE
      },
      {
        id: '3',
        date: new Date(2024, 2, 8),
        distance: 45.0,
        duration: '55:00',
        startLocation: 'Airport',
        endLocation: 'Home',
        type: 'personal',
        deduction: 0
      }
    ]);
  }, []);

  const totalDeduction = trips.reduce((sum, t) => sum + t.deduction, 0);
  const businessMiles = trips.filter(t => t.type === 'business').reduce((sum, t) => sum + t.distance, 0);

  return (
    <div className="mileage-page">
      <div className="mileage-header">
        <h2><Navigation2 className="text-emerald-600" /> Mileage Tracker</h2>
        <button className="button secondary">
          <Settings size={18} /> Settings
        </button>
      </div>

      <div className={`tracker-card ${isTracking ? 'tracking' : ''}`}>
        <div className="tracker-status">
          <span className={`status-indicator ${isTracking ? 'active' : 'inactive'}`}>
            <span className={`dot ${isTracking ? 'pulse' : ''}`}>●</span>
            {isTracking ? 'Tracking Active' : 'Ready to Track'}
          </span>
        </div>
        
        <div className="tracker-stats">
          <div className="stat-item">
            <span className="stat-value">{currentDistance.toFixed(2)}</span>
            <span className="stat-label">Miles</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{formatTime(elapsedTime)}</span>
            <span className="stat-label">Duration</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">${(currentDistance * IRS_RATE).toFixed(2)}</span>
            <span className="stat-label">Est. Deduction</span>
          </div>
        </div>

        <button 
          className={isTracking ? 'btn-stop' : 'btn-start'}
          onClick={toggleTracking}
        >
          {isTracking ? <StopCircle size={24} /> : <Play size={24} />}
          {isTracking ? 'End Trip' : 'Start Tracking'}
        </button>
      </div>

      <div className="summary-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h4>Potential Deduction</h4>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>
            ${totalDeduction.toFixed(2)}
          </div>
          <span className="text-sm text-secondary">Based on {IRS_RATE}/mile</span>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h4>Business Miles</h4>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            {businessMiles.toFixed(1)} mi
          </div>
          <span className="text-sm text-secondary">This year</span>
        </div>
      </div>

      <div className="trips-section">
        <div className="section-header">
          <h3>Recent Trips</h3>
          <button className="button ghost small">
            <Download size={16} /> Export Log
          </button>
        </div>
        <div className="trip-list">
          {trips.map(trip => (
            <div key={trip.id} className="trip-item">
              <div className="trip-info">
                <div className="trip-date">
                  <span className="month">{trip.date.toLocaleString('default', { month: 'short' })}</span>
                  <span className="day">{trip.date.getDate()}</span>
                </div>
                <div className="trip-details">
                  <h4>{trip.startLocation} → {trip.endLocation}</h4>
                  <div className="trip-route">
                    <Route size={14} /> {trip.distance} mi • <FileText size={14} /> {trip.type}
                  </div>
                </div>
              </div>
              
              <div className="trip-meta">
                <div className="trip-amount">
                  {trip.type === 'business' ? (
                    <span className="trip-deduction">+${trip.deduction.toFixed(2)}</span>
                  ) : (
                    <span className="text-secondary">$0.00</span>
                  )}
                </div>
                <div className="trip-actions">
                  <button 
                    className={`chip-btn ${trip.type === 'business' ? 'business active' : 'personal'}`}
                    onClick={() => toggleTripType(trip.id, 'business')}
                  >
                    Business
                  </button>
                  <button 
                    className={`chip-btn ${trip.type === 'personal' ? 'personal active' : 'personal'}`}
                    onClick={() => toggleTripType(trip.id, 'personal')}
                  >
                    Personal
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
