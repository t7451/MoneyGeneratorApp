import React from 'react';
import { Job } from '../data/mockJobs';
import { MapPin, DollarSign, Clock, Building } from 'lucide-react';
import './JobCard.css';

interface JobCardProps {
  job: Job;
  onClick: (job: Job) => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onClick }) => {
  return (
    <div className="job-card" onClick={() => onClick(job)}>
      <div className="job-header">
        <div>
          <h3 className="job-title">{job.title}
          {job.urgency === 'high' && <span className="urgency-badge urgency-high">URGENT</span>}
          </h3>
          <p className="job-company"> <Building size={14} className="inline-block" /> {job.company}</p>
        </div>
        <div className="job-pay">
          <DollarSign size={16} className="inline-block" />
          {job.pay.amount}/{job.pay.unit}
        </div>
      </div>
      
      <div className="job-details">
        {job.location.distance && (
          <div className="detail-item">
            <MapPin size={16} />
            <span>{job.location.distance} ({job.location.city})</span>
          </div>
        )}
        <div className="detail-item">
          <Clock size={16} />
          <span>Posted {new Date(job.postedAt).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="job-tags">
        {job.tags.map(tag => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>
    </div>
  );
};
