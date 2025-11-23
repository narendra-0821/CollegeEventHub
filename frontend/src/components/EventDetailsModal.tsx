import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users,
  MessageSquare, 
  Send,
  XCircle,
  X
} from 'lucide-react';

interface Slot {
  id: string;
  start: Date;
  end: Date;
  seats?: number | null;
}

interface Event {
  id: string;
  event_id: string;
  title: string;
  description?: string;
  category: string;
  location: string;
  start_date: string;
  end_date: string;
  college_id: string;
  registrations_open: boolean;
  total_seats?: number | null;
  registrations_count?: number; // approved count
  slots?: Slot[];
}

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string | null;
  userRegistrations?: Set<string>;
  onRegister?: (eventId: string) => Promise<void>;
  registering?: string | null;
}

export function EventDetailsModal({ isOpen, onClose, eventId, userRegistrations, onRegister, registering }: EventDetailsModalProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const { user } = useUser();
  const { toast } = useToast();

  // Helper function to get event status
  const getEventStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end < now) {
      return 'completed';
    } else if (start <= now && end >= now) {
      return 'ongoing';
    } else {
      return 'upcoming';
    }
  };
  
  useEffect(() => {
    if (isOpen && eventId) {
      fetchEventDetails();
    }
  }, [isOpen, eventId]);

  const fetchEventDetails = async () => {
    if (!eventId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/event/${eventId}`, {
        headers: {
          'Authorization': `Bearer mock-token`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch event details');
      }

      const eventData = await response.json();

      // Fetch registrations to compute approved count if total_seats exists
      let approvedCount: number | undefined = undefined;
      let totalSeats: number | null | undefined = undefined;
      try {
        const regsResp = await fetch(`/api/event/${eventId}/registrations`, {
          headers: {
            'Authorization': `Bearer mock-token`,
          },
        });
        if (regsResp.ok) {
          const regsData = await regsResp.json();
          approvedCount = Array.isArray(regsData.registrations)
            ? regsData.registrations.filter((r: any) => r.status === 'approved').length
            : undefined;
          totalSeats = typeof regsData.total_seats === 'number' ? regsData.total_seats : null;
        }
      } catch {}

      const raw = eventData.event || eventData;
      const normalizedId = raw?.id || raw?._id || raw?.event_id;
      setEvent({
        ...raw,
        id: normalizedId,
        registrations_count: approvedCount ?? (raw?.registrations_count ?? eventData.registrations_count),
        total_seats: totalSeats ?? (raw?.total_seats ?? eventData.total_seats),
      });
    } catch (error) {
      console.error('Error fetching event details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load event details',
        variant: 'destructive',
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const submitFeedback = async () => {
    if (!eventId || !feedbackText.trim()) return;
    
    setIsSubmittingFeedback(true);
    try {
      const response = await fetch(`/api/event/${eventId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token`,
        },
        body: JSON.stringify({
          comment: feedbackText.trim(),
          user_id: user?.id,
          // No rating - this will be stored as a help query
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      toast({
        title: 'Help request submitted',
        description: 'Your request has been sent. We\'ll get back to you soon!',
      });

      setFeedbackText('');
      setShowFeedbackForm(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit help request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCategoryColor = (category: string) => {
    return 'bg-purple-100 text-purple-800';
  };

  const isEventPast = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  const isStudent = user?.role === 'student';

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 animate-in fade-in duration-300" onClick={onClose}>
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 fade-in duration-300" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Event Details</h2>
          <Button variant="ghost" size="sm" onClick={onClose} style={{ borderColor: '#bebebe' }}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : event ? (
            <div className="space-y-6">
              {/* Event Header */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={getCategoryColor(event.category)}>
                    {event.category}
                  </Badge>
                  {(() => {
                    const now = new Date();
                    const startDate = new Date(event.start_date);
                    const endDate = new Date(event.end_date);
                    
                    if (endDate < now) {
                      return <Badge className="bg-gray-100 text-gray-800">Completed</Badge>;
                    } else if (startDate <= now && endDate >= now) {
                      return <Badge className="bg-green-100 text-green-800">Ongoing</Badge>;
                    } else {
                      return <Badge className="bg-blue-100 text-blue-800">Upcoming</Badge>;
                    }
                  })()}
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">{event.title}</h3>
                  {isStudent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFeedbackForm(true)}
                      className="text-gray-600 hover:text-blue-600"
                      style={{ borderColor: '#adadad' }}
                      disabled={getEventStatus(event.start_date, event.end_date) === 'completed'}
                    >
                      Help
                    </Button>
                  )}
                </div>
                {event.description && (
                  <p className="text-gray-600">{event.description}</p>
                )}
              </div>

              {/* Event Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <div>
                      <div className="font-medium">Start</div>
                      <div className="text-sm">{formatDate(event.start_date)} at {formatTime(event.start_date)}</div>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    <div>
                      <div className="font-medium">End</div>
                      <div className="text-sm">{formatDate(event.end_date)} at {formatTime(event.end_date)}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    <div>
                      <div className="font-medium">Location</div>
                      <div className="text-sm">{event.location}</div>
                    </div>
                  </div>

                  {/* Seats (Approved/Total) */}
                  {typeof event.total_seats === 'number' && (
                    <div className="flex items-center text-gray-600">
                      <Users className="h-4 w-4 mr-2" />
                      <div>
                        <div className="font-medium">Seats</div>
                        <div className="text-sm">
                          {Math.max(0, event.registrations_count ?? 0)} / {event.total_seats}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Help/Feedback Form */}
              {showFeedbackForm && isStudent && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-semibold mb-3">Need Help?</h4>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Describe your issue or question about this event..."
                    className="w-full p-3 border rounded-lg resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ borderColor: '#bebebe' }}
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowFeedbackForm(false);
                        setFeedbackText('');
                      }}
                      style={{ borderColor: '#bebebe' }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={submitFeedback}
                      disabled={isSubmittingFeedback || !feedbackText.trim()}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      {isSubmittingFeedback ? 'Sending...' : 'Send Help Request'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Registration Button - Only for Students */}
              {isStudent && !isEventPast(event.end_date) && (
                <div className="flex justify-end space-x-3">
                  <Button variant="outline" onClick={onClose} style={{ borderColor: '#bebebe' }}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => onRegister && onRegister(event.id)}
                    disabled={!event.registrations_open || userRegistrations?.has(event.id) || registering === event.id}
                    className="px-6"
                  >
                    {registering === event.id ? 'Registering...' : 
                     userRegistrations?.has(event.id) ? 'Registration Done' : 'Register'}
                  </Button>
                </div>
              )}

              {/* Registration Status Message */}
              {isStudent && !isEventPast(event.end_date) && !event.registrations_open && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <XCircle className="h-4 w-4 inline mr-2" />
                  Registrations are currently closed for this event.
                </div>
              )}

              {/* Close Button for Admin or Past Events */}
              {(!isStudent || isEventPast(event.end_date)) && (
                <div className="flex justify-end">
                  <Button variant="outline" onClick={onClose} style={{ borderColor: '#bebebe' }}>
                    Close
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Event not found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
