import React, { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useUser } from '@/contexts/UserContext';

interface StudentFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string | null;
  onSuccess: () => void;
}

export function StudentFeedbackModal({ isOpen, onClose, eventId, onSuccess }: StudentFeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const { user } = useUser();
  const { toast } = useToast();
  
  const MAX_CHARS = 80;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setRating(0);
      setHoveredRating(0);
      setComment('');
      setCharCount(0);
    }
  }, [isOpen]);

  // Handle comment change with character limit
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    
    if (text.length <= MAX_CHARS) {
      setComment(text);
      setCharCount(text.length);
    }
  };

  // Prevent background scrolling
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '0px';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '0px';
    };
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!eventId || !rating) {
      toast({
        title: 'Validation Error',
        description: 'Please select a rating',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/event/${eventId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token`,
        },
        body: JSON.stringify({
          rating,
          comment: comment.trim(),
          user_id: user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 animate-in fade-in duration-300" onClick={onClose}>
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 animate-in zoom-in-95 fade-in duration-300" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Share your Feedback</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Star Rating */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= (hoveredRating || rating)
                      ? 'fill-yellow-400 stroke-blue-500'
                      : 'fill-none stroke-black'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Textarea */}
          <div>
            <div className="flex justify-end mb-2">
              <span className="text-sm text-gray-500">
                {charCount}/{MAX_CHARS}
              </span>
            </div>
            <textarea
              value={comment}
              onChange={handleCommentChange}
              placeholder="Type here..."
              className="w-full p-3 border rounded-lg resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              style={{ borderColor: '#0066ffff' }}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !rating}
              className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}