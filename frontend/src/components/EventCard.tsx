import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Calendar } from 'lucide-react';

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
  created_at: string;
  image_url?: string | null;
  total_seats?: number | null;
  registrations_count?: number;
  slots?: Slot[];
}

interface EventCardProps {
  event: Event;
  isAdmin?: boolean;
  userRegistrations?: Set<string>;
  registering?: string | null;
  onViewDetails: (eventId: string) => void;
  onRegister?: (eventId: string) => void;
  showParticipantCount?: boolean;
}

export function EventCard({ 
  event, 
  isAdmin = false, 
  userRegistrations = new Set(), 
  registering, 
  onViewDetails, 
  onRegister,
  showParticipantCount = false
}: EventCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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

  const getEventStatus = (startDate: string, endDate: string): 'upcoming' | 'ongoing' | 'completed' => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) {
      return 'upcoming';
    } else if (now >= start && now <= end) {
      return 'ongoing';
    } else {
      return 'completed';
    }
  };

  const getStatusColor = (status: 'upcoming' | 'ongoing' | 'completed') => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'ongoing':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const eventStatus = getEventStatus(event.start_date, event.end_date);

  // Truncate description to 116 characters with ellipsis for 2-line clamp
  const desc = (event.description || '').trim();
  const truncatedDesc = desc.length > 116 ? `${desc.slice(0, 116)}...` : desc;

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 overflow-hidden p-0 gap-2">
      {event.image_url ? (
        <img src={event.image_url} alt={event.title} className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-40 flex items-center justify-center bg-[#636363]">
          <span className="text-sm text-[#ffffff]">No image</span>
        </div>
      )}
      <CardHeader className="px-6 pt-1 pb-1">
        <div className="flex items-start justify-between mb-2">
          <div className="flex flex-wrap gap-2">
            <Badge className={getCategoryColor(event.category)}>
              {event.category}
            </Badge>
            <Badge className={getStatusColor(eventStatus)}>
              {eventStatus.charAt(0).toUpperCase() + eventStatus.slice(1)}
            </Badge>
          </div>
          <div className="text-right">
            {event.event_id && (
              <div className="text-xs text-black font-mono font-bold">
                {event.event_id}
              </div>
            )}
            <div className={`text-xs font-semibold ${
              event.registrations_open ? 'text-green-600' : 'text-red-600'
            }`}>
              {event.registrations_open ? 'OPEN' : 'CLOSED'}
            </div>
          </div>
        </div>
        <CardTitle className="text-base truncate">{event.title}</CardTitle>
        <CardDescription className="line-clamp-2 text-sm text-gray-600 break-words min-h-[2.5rem]">
          {truncatedDesc || '\u00A0'}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pt-1 pb-4">
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>
              {formatDate(event.start_date)} at {formatTime(event.start_date)}
            </span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>
              Ends {formatDate(event.end_date)} at {formatTime(event.end_date)}
            </span>
          </div>
        </div>

        {(typeof event.total_seats === 'number') && (
          <div className="mt-3 flex justify-end">
            <span className="text-xs text-gray-700 font-medium">
              {Math.max(0, event.registrations_count ?? 0)} / {event.total_seats}
            </span>
          </div>
        )}

        {!isAdmin ? (
          <div className="flex gap-2 mt-2">
            <Button 
              variant="outline"
              className="flex-1"
              onClick={() => onViewDetails(event.id)}
              style={{ borderColor: '#bebebe' }}
            >
              View Details
            </Button>
            <Button 
              className="flex-1"
              onClick={() => onRegister?.(event.id)}
              disabled={registering === event.id || eventStatus === 'completed' || userRegistrations.has(event.id) || !event.registrations_open}
            >
              {eventStatus === 'completed'
                ? 'Event completed'
                : registering === event.id
                ? 'Registering...'
                : userRegistrations.has(event.id)
                ? 'Registration Done'
                : 'Register'}
            </Button>
          </div>
        ) : (
          <Button 
            className="w-full mt-2"
            onClick={() => onViewDetails(event.id)}
          >
            View Details
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
