import { useState } from 'react';
import { X, Star } from 'lucide-react';
import { trackEvent } from '../lib/analytics';
import { useToast } from './Toast';
import './FeedbackPrompt.css';

interface FeedbackPromptProps {
  question: string;
  context: string;
  onDismiss: () => void;
  onSubmit: () => void;
}

export function FeedbackPrompt({ question, context, onDismiss, onSubmit }: FeedbackPromptProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = () => {
    trackEvent('feedback_submitted', {
      context,
      rating,
      comment: comment.slice(0, 500),
    });
    setSubmitted(true);
    showToast('Thanks for your feedback!', 'success');
    setTimeout(() => {
      onSubmit();
    }, 1500);
  };

  if (submitted) {
    return (
      <div className="feedback-prompt feedback-prompt-thanks">
        <p>Thank you for your feedback!</p>
      </div>
    );
  }

  return (
    <div className="feedback-prompt">
      <button className="feedback-close" onClick={onDismiss} aria-label="Close">
        <X size={16} />
      </button>
      <p className="feedback-question">{question}</p>
      <div className="feedback-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            className={`feedback-star ${star <= (hoveredRating || rating) ? 'active' : ''}`}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            aria-label={`Rate ${star} stars`}
          >
            <Star size={20} fill={star <= (hoveredRating || rating) ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <div className="feedback-comment-section">
          <textarea
            className="feedback-textarea"
            placeholder="Any additional thoughts? (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            maxLength={500}
          />
          <button className="btn-primary feedback-submit" onClick={handleSubmit}>
            Submit Feedback
          </button>
        </div>
      )}
    </div>
  );
}
