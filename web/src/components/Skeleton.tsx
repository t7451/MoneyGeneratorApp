import React from 'react';
import './Skeleton.css';

interface SkeletonProps {
  /** Width of the skeleton (e.g., '100%', '200px', 'auto') */
  width?: string | number;
  /** Height of the skeleton (e.g., '20px', '2rem') */
  height?: string | number;
  /** Border radius (e.g., '4px', '50%' for circle) */
  borderRadius?: string | number;
  /** Additional CSS class */
  className?: string;
  /** Disable animation */
  noAnimate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  borderRadius = '4px',
  className = '',
  noAnimate = false,
}) => {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
  };

  return (
    <div
      className={`skeleton ${noAnimate ? '' : 'skeleton--animated'} ${className}`}
      style={style}
    />
  );
};

interface SkeletonTextProps {
  /** Number of text lines */
  lines?: number;
  /** Width of the last line (e.g., '60%') */
  lastLineWidth?: string;
  /** Gap between lines */
  gap?: string;
  /** Additional CSS class */
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  lastLineWidth = '60%',
  gap = '0.5rem',
  className = '',
}) => {
  return (
    <div className={`skeleton-text ${className}`} style={{ gap }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? lastLineWidth : '100%'}
          height="1rem"
        />
      ))}
    </div>
  );
};

interface SkeletonCardProps {
  /** Show avatar skeleton */
  showAvatar?: boolean;
  /** Show title skeleton */
  showTitle?: boolean;
  /** Show description lines */
  descriptionLines?: number;
  /** Show action button skeleton */
  showAction?: boolean;
  /** Additional CSS class */
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  showAvatar = true,
  showTitle = true,
  descriptionLines = 2,
  showAction = false,
  className = '',
}) => {
  return (
    <div className={`skeleton-card ${className}`}>
      {showAvatar && (
        <Skeleton width={48} height={48} borderRadius="50%" className="skeleton-card__avatar" />
      )}
      <div className="skeleton-card__content">
        {showTitle && <Skeleton width="60%" height="1.25rem" className="skeleton-card__title" />}
        {descriptionLines > 0 && (
          <SkeletonText lines={descriptionLines} lastLineWidth="80%" />
        )}
      </div>
      {showAction && (
        <Skeleton width={80} height={36} borderRadius="6px" className="skeleton-card__action" />
      )}
    </div>
  );
};

interface SkeletonChartProps {
  /** Height of the chart area */
  height?: string | number;
  /** Show legend */
  showLegend?: boolean;
  /** Additional CSS class */
  className?: string;
}

export const SkeletonChart: React.FC<SkeletonChartProps> = ({
  height = 300,
  showLegend = true,
  className = '',
}) => {
  return (
    <div className={`skeleton-chart ${className}`}>
      <div className="skeleton-chart__header">
        <Skeleton width="40%" height="1.5rem" />
        {showLegend && (
          <div className="skeleton-chart__legend">
            <Skeleton width={60} height="1rem" />
            <Skeleton width={60} height="1rem" />
            <Skeleton width={60} height="1rem" />
          </div>
        )}
      </div>
      <Skeleton 
        width="100%" 
        height={typeof height === 'number' ? height : height} 
        borderRadius="8px" 
        className="skeleton-chart__area" 
      />
    </div>
  );
};

interface SkeletonMetricCardProps {
  /** Additional CSS class */
  className?: string;
}

export const SkeletonMetricCard: React.FC<SkeletonMetricCardProps> = ({ className = '' }) => {
  return (
    <div className={`skeleton-metric ${className}`}>
      <Skeleton width={40} height={40} borderRadius="8px" className="skeleton-metric__icon" />
      <div className="skeleton-metric__content">
        <Skeleton width="50%" height="0.875rem" />
        <Skeleton width="70%" height="1.5rem" />
        <Skeleton width="40%" height="0.75rem" />
      </div>
    </div>
  );
};

interface SkeletonTableProps {
  /** Number of rows */
  rows?: number;
  /** Number of columns */
  columns?: number;
  /** Show table header */
  showHeader?: boolean;
  /** Additional CSS class */
  className?: string;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
  showHeader = true,
  className = '',
}) => {
  return (
    <div className={`skeleton-table ${className}`}>
      {showHeader && (
        <div className="skeleton-table__header">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} width={`${100 / columns - 2}%`} height="1rem" />
          ))}
        </div>
      )}
      <div className="skeleton-table__body">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="skeleton-table__row">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton 
                key={colIndex} 
                width={colIndex === 0 ? '80%' : '60%'} 
                height="1rem" 
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Skeleton;
