import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { BookOpen, MessageSquare, User, Calendar } from 'lucide-react';

interface HelpQuery {
  id: string;
  event_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  query: string;
  timestamp: string;
  is_read: boolean;
}

interface Event {
  id: string;
  event_id: string;
  title: string;
  category: string;
  start_date: string;
  end_date: string;
}

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string | null;
  onFeedbacksRead?: () => void;
}

export function FeedbackModal({ isOpen, onClose, eventId, onFeedbacksRead }: FeedbackModalProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [feedbacks, setFeedbacks] = useState<HelpQuery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && eventId) {
      fetchEventAndFeedbacks();
    }
  }, [isOpen, eventId]);

  const fetchEventAndFeedbacks = async () => {
    if (!eventId) return;
    
    setIsLoading(true);
    try {
      // Fetch event details
      const eventResponse = await fetch(`/api/event/${eventId}`, {
        headers: {
          'Authorization': `Bearer mock-token`,
        },
      });

      if (!eventResponse.ok) {
        throw new Error('Failed to fetch event details');
      }

      const eventData = await eventResponse.json();
      setEvent(eventData.event);

      // Fetch feedbacks
      const feedbacksResponse = await fetch(`/api/event/${eventId}/feedbacks`, {
        headers: {
          'Authorization': `Bearer mock-token`,
        },
      });

      if (feedbacksResponse.ok) {
        const feedbacksData = await feedbacksResponse.json();
        setFeedbacks(feedbacksData.feedbacks || []);
        
        // Mark feedbacks as read
        if (feedbacksData.feedbacks && feedbacksData.feedbacks.length > 0) {
          await markFeedbacksAsRead(eventId);
          // Notify parent component to update unread count
          onFeedbacksRead?.();
        }
      } else {
        setFeedbacks([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load feedback data',
        variant: 'destructive',
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const markFeedbacksAsRead = async (eventId: string) => {
    try {
      await fetch(`/api/event/${eventId}/feedbacks/mark-read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer mock-token`,
        },
      });
    } catch (error) {
      console.error('Error marking feedbacks as read:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Prevent background scrolling without layout shift
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] duration-300"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Help & Queries
          </DialogTitle>
          <DialogDescription>
            View participant help requests and queries for {event?.event_id || eventId}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Feedbacks List */}
            {feedbacks.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No help requests or queries yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {feedbacks
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((feedback) => (
                  <div
                    key={feedback.id}
                    className="p-4 border rounded-lg bg-white"
                    style={{ borderColor: '#adadad' }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <div>
                          <div className={`font-medium text-sm ${feedback.is_read ? 'text-gray-400' : 'text-black'}`}>
                            {feedback.user_name}
                          </div>
                          <div className={`text-xs ${feedback.is_read ? 'text-gray-300' : 'text-gray-500'}`}>
                            {feedback.user_email}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {formatDate(feedback.timestamp)}
                      </div>
                    </div>
                    <p className={`text-sm leading-relaxed ${feedback.is_read ? 'text-gray-400' : 'text-black'}`}>
                      {feedback.query}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
