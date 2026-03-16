/**
 * Onboarding & Tutorial System
 * Provides guided tours, tooltips, and progressive feature disclosure
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { X, HelpCircle, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import '../components/OnboardingEducation.css';
import { useOnboarding } from './onboardingContext';

export { DEFAULT_CHECKPOINTS, OnboardingProvider, useOnboarding } from './onboardingContext';

// Guided Tour Component
export interface TourStep {
  id: string;
  title: string;
  description: string;
  highlightSelector?: string; // CSS selector to highlight
  actions?: Array<{
    label: string;
    onClick: () => void;
  }>;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface GuidedTourProps {
  steps: TourStep[];
  isActive: boolean;
  currentStepIndex: number;
  onStepChange?: (index: number) => void;
  onComplete?: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({
  steps,
  isActive,
  currentStepIndex,
  onStepChange,
  onComplete,
  onSkip,
  showSkip = true,
}) => {
  const [highlightElement, setHighlightElement] = useState<HTMLElement | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const progressFillRef = useRef<HTMLDivElement | null>(null);
  const step = steps[currentStepIndex];

  useEffect(() => {
    if (isActive && step?.highlightSelector) {
      const element = document.querySelector(step.highlightSelector) as HTMLElement;
      setHighlightElement(element);

      // Scroll element into view
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setHighlightElement(null);
    }
  }, [isActive, currentStepIndex, step?.highlightSelector]);

  useEffect(() => {
    if (!highlightElement || !highlightRef.current) return;
    const top = highlightElement.offsetTop - 8;
    const left = highlightElement.offsetLeft - 8;
    const width = highlightElement.offsetWidth + 16;
    const height = highlightElement.offsetHeight + 16;

    highlightRef.current.style.top = `${top}px`;
    highlightRef.current.style.left = `${left}px`;
    highlightRef.current.style.width = `${width}px`;
    highlightRef.current.style.height = `${height}px`;
  }, [highlightElement]);

  useEffect(() => {
    if (!progressFillRef.current) return;
    const percent = ((currentStepIndex + 1) / steps.length) * 100;
    progressFillRef.current.style.width = `${percent}%`;
  }, [currentStepIndex, steps.length]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      onStepChange?.(currentStepIndex + 1);
    } else {
      onSkip?.();
      onComplete?.();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      onStepChange?.(currentStepIndex - 1);
    }
  };

  const handleSkip = () => {
    onSkip?.();
    onComplete?.();
  };

  if (!isActive || currentStepIndex >= steps.length) {
    return null;
  }

  return (
    <>
      {/* Highlight overlay */}
      {highlightElement && (
        <div
          className="tour-highlight"
          ref={highlightRef}
        />
      )}

      {/* Tour tooltip */}
      <div className="tour-tooltip" role="tooltip">
        <button
          className="tour-close"
          onClick={handleSkip}
          aria-label="Close tour"
        >
          <X size={20} />
        </button>

        <div className="tour-content">
          <h3 className="tour-title">{step.title}</h3>
          <p className="tour-description">{step.description}</p>

          {step.actions && (
            <div className="tour-actions">
              {step.actions.map((action) => (
                <button
                  key={action.label}
                  className="tour-action-btn"
                  onClick={action.onClick}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          <div className="tour-progress">
            <span>
              {currentStepIndex + 1} of {steps.length}
            </span>
            <div className="tour-progress-bar">
              <div className="tour-progress-fill" ref={progressFillRef} />
            </div>
          </div>

          <div className="tour-buttons">
            {currentStepIndex > 0 && (
              <button
                className="tour-btn tour-btn-secondary"
                onClick={handlePrev}
              >
                Back
              </button>
            )}
            {showSkip && (
              <button
                className="tour-btn tour-btn-ghost"
                onClick={handleSkip}
              >
                Skip Tour
              </button>
            )}
            <button className="tour-btn tour-btn-primary" onClick={handleNext}>
              {currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'}
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      <div className="tour-backdrop" onClick={handleSkip} />
    </>
  );
};

// Tooltip Component
interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click';
  maxWidth?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  trigger = 'hover',
  maxWidth = 250,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!tooltipRef.current) return;
    tooltipRef.current.style.maxWidth = `${maxWidth}px`;
  }, [maxWidth, isVisible]);

  const handleMouseEnter = () => trigger === 'hover' && setIsVisible(true);
  const handleMouseLeave = () => trigger === 'hover' && setIsVisible(false);
  const handleClick = () => {
    if (trigger === 'click') {
      setIsVisible(!isVisible);
    }
  };

  return (
    <div
      className="tooltip-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}
      {isVisible && (
        <div
          className={`tooltip tooltip-${position}`}
          ref={tooltipRef}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
};

// Onboarding Checklist Component
export const OnboardingChecklist: React.FC = () => {
  const {
    getCompletionPercentage,
    getAllCheckpoints,
    updateCheckpoint,
  } = useOnboarding();

  const checkpoints = getAllCheckpoints();
  const completionPercent = getCompletionPercentage();
  const progressFillRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!progressFillRef.current) return;
    progressFillRef.current.style.width = `${completionPercent}%`;
  }, [completionPercent]);

  return (
    <div className="onboarding-checklist">
      <div className="checklist-header">
        <h3 className="checklist-title">Setup Progress</h3>
        <div className="checklist-progress">
          <div className="progress-value">{completionPercent}%</div>
          <div className="progress-bar-full">
            <div className="progress-bar-fill" ref={progressFillRef} />
          </div>
        </div>
      </div>

      <ul className="checklist-items">
        {checkpoints.map((checkpoint) => (
          <li key={checkpoint.id} className="checklist-item">
            <input
              type="checkbox"
              id={checkpoint.id}
              checked={checkpoint.completed}
              onChange={(e) =>
                updateCheckpoint(checkpoint.id, e.currentTarget.checked)
              }
              className="checklist-checkbox"
            />
            <label htmlFor={checkpoint.id} className="checklist-label">
              <span className="checklist-text">{checkpoint.label}</span>
              {checkpoint.completed && (
                <CheckCircle2 size={16} className="checklist-check" />
              )}
              {checkpoint.importance === 'critical' && !checkpoint.completed && (
                <AlertCircle size={16} className="checklist-critical" />
              )}
            </label>
          </li>
        ))}
      </ul>

      {completionPercent === 100 && (
        <div className="checklist-complete">
          <CheckCircle2 size={20} />
          <span>Setup complete! Welcome to Money Generator 🎉</span>
        </div>
      )}
    </div>
  );
};

// Contextual Help Component
interface HelpWidgetProps {
  questions: Array<{
    q: string;
    a: string;
  }>;
  title?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export const HelpWidget: React.FC<HelpWidgetProps> = ({
  questions,
  title = 'Help & FAQ',
  position = 'bottom-right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div className={`help-widget help-widget-${position}`}>
      <button
        className="help-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open help"
      >
        <HelpCircle size={24} />
      </button>

      {isOpen && (
        <div className="help-panel">
          <div className="help-header">
            <h3>{title}</h3>
            <button
              className="help-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close help"
            >
              <X size={20} />
            </button>
          </div>

          <div className="help-content">
            {questions.map((item, index) => (
              <div key={index} className="help-item">
                <button
                  className="help-question"
                  onClick={() =>
                    setExpandedIndex(expandedIndex === index ? null : index)
                  }
                >
                  {item.q}
                  <ChevronRight
                    size={16}
                    style={{
                      transform:
                        expandedIndex === index ? 'rotate(90deg)' : 'rotate(0deg)',
                    }}
                  />
                </button>
                {expandedIndex === index && (
                  <div className="help-answer">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Educational Hint Component
interface HintProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  onDismiss?: () => void;
  type?: 'info' | 'success' | 'warning' | 'tip';
}

export const EducationalHint: React.FC<HintProps> = ({
  title,
  description,
  icon,
  onDismiss,
  type = 'info',
}) => {
  return (
    <div className={`educational-hint hint-${type}`} role="status" aria-live="polite">
      {icon && <div className="hint-icon">{icon}</div>}
      <div className="hint-content">
        <h4 className="hint-title">{title}</h4>
        <p className="hint-description">{description}</p>
      </div>
      {onDismiss && (
        <button
          className="hint-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss hint"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
};

// ============= UTILITY HOOKS =============

/**
 * Hook for managing tour navigation state
 * Simplifies managing current step, navigation, and completion
 */
export const useTourNavigation = (steps: TourStep[], onComplete?: () => void) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < steps.length) {
      setCurrentStepIndex(index);
    }
  }, [steps.length]);

  const nextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      setIsActive(false);
      onComplete?.();
    }
  }, [currentStepIndex, steps.length, onComplete]);

  const previousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const skipTour = useCallback(() => {
    setIsActive(false);
  }, []);

  const startTour = useCallback(() => {
    setCurrentStepIndex(0);
    setIsActive(true);
  }, []);

  return {
    currentStep: steps[currentStepIndex],
    currentStepIndex,
    isActive,
    progress: ((currentStepIndex + 1) / steps.length) * 100,
    goToStep,
    nextStep,
    previousStep,
    skipTour,
    startTour,
    hasNextStep: currentStepIndex < steps.length - 1,
    hasPreviousStep: currentStepIndex > 0,
  };
};

/**
 * Hook for tracking checkpoint progress with callbacks
 */
export const useCheckpointProgress = () => {
  const { getCompletionPercentage, getAllCheckpoints, updateCheckpoint } = useOnboarding();
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const checkpoints = getAllCheckpoints();
    setTotalCount(checkpoints.length);
    setCompletedCount(checkpoints.filter(c => c.completed).length);
  }, [getAllCheckpoints]);

  return {
    percentComplete: getCompletionPercentage(),
    completedCount,
    totalCount,
    checkpoints: getAllCheckpoints(),
    completeCheckpoint: (id: string) => updateCheckpoint(id, true),
    isComplete: completedCount === totalCount && totalCount > 0,
  };
};

/**
 * Hook for managing help widget visibility
 */
export const useHelpWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleHelp = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const closeHelp = useCallback(() => {
    setIsOpen(false);
  }, []);

  const openHelp = useCallback(() => {
    setIsOpen(true);
  }, []);

  return { isOpen, toggleHelp, closeHelp, openHelp };
};

