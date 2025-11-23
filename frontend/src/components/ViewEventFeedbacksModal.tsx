import React, { useState, useEffect } from 'react';
import { X, Star, MessageSquare, ArrowUpDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

interface EventFeedback {
  id: string;
  event_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  rating?: number;
  feedback: string;
  comment?: string;
  timestamp: string;
}

interface ViewEventFeedbacksModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string | null;
}

export function ViewEventFeedbacksModal({ isOpen, onClose, eventId }: ViewEventFeedbacksModalProps) {
  const [feedbacks, setFeedbacks] = useState<EventFeedback[]>([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState<EventFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState<'recent' | 'old'>('recent');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && eventId) {
      fetchFeedbacks();
    }
  }, [isOpen, eventId]);

  // Filter and sort feedbacks when feedbacks, sortOrder, or ratingFilter changes
  useEffect(() => {
    let filtered = [...feedbacks];

    // Apply rating filter
    if (ratingFilter !== null) {
      filtered = filtered.filter(feedback => feedback.rating === ratingFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
    });

    setFilteredFeedbacks(filtered);
  }, [feedbacks, sortOrder, ratingFilter]);

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

  const fetchFeedbacks = async () => {
    if (!eventId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/event/${eventId}/event-feedbacks`, {
        headers: {
          'Authorization': `Bearer mock-token`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched feedbacks:', data.feedbacks);
        setFeedbacks(data.feedbacks || []);
      } else {
        console.log('Failed to fetch feedbacks, status:', response.status);
        setFeedbacks([]);
      }
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load feedbacks',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const calculateAverage = () => {
    if (filteredFeedbacks.length === 0) return 0;
    const feedbacksWithRating = filteredFeedbacks.filter(fb => fb.rating);
    if (feedbacksWithRating.length === 0) return 0;
    const sum = feedbacksWithRating.reduce((acc, fb) => acc + (fb.rating || 0), 0);
    return (sum / feedbacksWithRating.length).toFixed(1);
  };

  const renderStars = (rating: number, filled: boolean = true) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= rating
                ? filled 
                  ? 'fill-black stroke-black' 
                  : 'fill-white stroke-black'
                : 'fill-none stroke-black'
            }`}
          />
        ))}
      </div>
    );
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'bg-green-500';
    if (rating >= 3) return 'bg-yellow-500';
    if (rating >= 2) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 animate-in fade-in duration-300" onClick={onClose}>
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 fade-in duration-300" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 border-b">
          <div className="flex items-center justify-between p-6">
            <h2 className="text-2xl font-bold text-gray-900">After-Event Feedbacks</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Controls */}
          {!isLoading && feedbacks.length > 0 && (
            <div className="px-6 pb-4 flex flex-wrap gap-3 items-center">
              {/* Sort Button */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-gray-500" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'recent' ? 'old' : 'recent')}
                  className="text-sm"
                >
                  {sortOrder === 'recent' ? 'Recent First' : 'Old First'}
                </Button>
              </div>

              {/* Rating Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <div className="flex flex-wrap gap-1">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <Button
                      key={rating}
                      variant={ratingFilter === rating ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRatingFilter(ratingFilter === rating ? null : rating)}
                      className="text-xs px-2 py-1 h-auto"
                    >
                      {rating} <Star className="h-3 w-3 ml-1 fill-current" />
                    </Button>
                  ))}
                  {ratingFilter !== null && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRatingFilter(null)}
                      className="text-xs px-2 py-1 h-auto text-gray-500"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          {!isLoading && feedbacks.length > 0 && (
            <div className="px-6 pb-4 flex gap-4">
              <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
                <MessageSquare className="h-5 w-5" />
                <div>
                  <div className="text-2xl font-bold">{filteredFeedbacks.length}</div>
                  <div className="text-xs text-gray-600">
                    {ratingFilter ? `${ratingFilter} star` : 'Total'} feedbacks
                  </div>
                </div>
              </div>
              {feedbacks.some(fb => fb.rating) && (
                <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
                  <Star className="h-5 w-5 fill-black" />
                  <div>
                    <div className="text-2xl font-bold">{calculateAverage()}</div>
                    <div className="text-xs text-gray-600">Average</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {feedbacks.length === 0 ? 'No feedback received yet' : 'No feedback matches the selected filters'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFeedbacks
                .map((feedback) => (
                <div
                  key={feedback.id}
                  className="bg-gray-100 rounded-lg p-4 space-y-3"
                >
                  {/* Header with rating */}
                  <div className="flex items-start justify-between">
                    <div className="text-sm font-semibold text-gray-900">Feedback:-</div>
                    {feedback.rating && (
                      <div className={`${getRatingColor(feedback.rating)} text-white px-3 py-1 rounded-md flex items-center gap-1 text-sm font-semibold`}>
                        {feedback.rating}
                        <Star className="h-4 w-4 fill-white" />
                      </div>
                    )}
                  </div>

                  {/* Comment */}
                  <p className="text-sm text-gray-700 leading-relaxed min-h-[60px]">
                    {feedback.feedback || feedback.comment || 'No comment provided'}
                  </p>

                  {/* Footer with user info and timestamp */}
                  <div className="pt-2 border-t border-gray-300">
                    <div className="text-xs text-blue-600 underline">
                      {feedback.user_email}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(feedback.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
