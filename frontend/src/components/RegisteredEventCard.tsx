import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Calendar, MessageCircle } from "lucide-react";
import { StudentFeedbackModal } from "@/components/StudentFeedbackModal";
import { FeedbackSuccessModal } from "@/components/FeedbackSuccessModal";

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
  slots?: { id: string; start?: string; end?: string; seats?: number | null }[];
}

interface RegisteredEvent extends Event {
  registration_status: string;
  registration_id: string;
  slot_id?: string | null;
}

interface RegisteredEventCardProps {
  event: RegisteredEvent;
  onViewDetails: (eventId: string) => void;
}

export function RegisteredEventCard({
  event,
  onViewDetails,
}: RegisteredEventCardProps) {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCategoryColor = (category: string) => {
    return "bg-purple-100 text-purple-800";
  };

  const getEventStatus = (
    startDate: string,
    endDate: string
  ): "upcoming" | "ongoing" | "completed" => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) {
      return "upcoming";
    } else if (now >= start && now <= end) {
      return "ongoing";
    } else {
      return "completed";
    }
  };

  const getStatusColor = (status: "upcoming" | "ongoing" | "completed") => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800";
      case "ongoing":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRegistrationStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
      case "accepted":
        return {
          text: "ACCEPTED",
          className: "border-green-500 text-green-700 bg-green-50",
        };
      case "rejected":
        return {
          text: "REJECTED",
          className: "border-red-500 text-red-700 bg-red-50",
        };
      case "pending":
      default:
        return {
          text: "PENDING",
          className: "border-yellow-500 text-yellow-700 bg-yellow-50",
        };
    }
  };

  const eventStatus = getEventStatus(event.start_date, event.end_date);
  const registrationStatus = getRegistrationStatusStyle(
    event.registration_status
  );

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 overflow-hidden p-0 gap-2">
      {event.image_url ? (
        <img
          src={event.image_url}
          alt={event.title}
          className="w-full h-40 object-cover"
        />
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
            <div
              className={`text-xs font-semibold ${
                event.registrations_open ? "text-green-600" : "text-red-600"
              }`}
            >
              {event.registrations_open ? "OPEN" : "CLOSED"}
            </div>
          </div>
        </div>
        <CardTitle className="text-base truncate">{event.title}</CardTitle>
        <CardDescription className="line-clamp-2 text-sm text-gray-600 break-words min-h-[2.5rem]">
          {(event.description || "").trim().slice(0, 116) +
            ((event.description || "").trim().length > 116 ? "..." : "") ||
            "\u00A0"}
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

        {/* Event ID and Slot number (if available) */}
        <div className="flex justify-end items-center mt-2 text-xs text-gray-700">
          Slot- {(() => {
            if (!event.slot_id) return <span className="text-gray-500">no slot</span>;
            const slots = (event as any).slots || [];
            const idx = slots.findIndex((s: any) => s.id === event.slot_id);
            if (idx >= 0) return <span className="font-medium">{idx + 1}</span>;
            return <span className="font-medium">{String(event.slot_id)}</span>;
          })()}
        </div>

        <div className="flex gap-2 mt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onViewDetails(event.id)}
            style={{ borderColor: "#bebebe" }}
          >
            View Details
          </Button>
          {eventStatus === "completed" && registrationStatus.text === "ACCEPTED" ? (
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setShowFeedbackModal(true)}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Feedback
            </Button>
          ) : (
            <Button
              className={`flex-1 border-2 ${registrationStatus.className}`}
              variant="outline"
              disabled
              style={{
                borderColor:
                  registrationStatus.text === "ACCEPTED"
                    ? "#10b981"
                    : registrationStatus.text === "REJECTED"
                    ? "#ef4444"
                    : "#f59e0b",
              }}
            >
              {registrationStatus.text}
            </Button>
          )}
        </div>

        {/* Feedback Modals */}
        <StudentFeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          eventId={event.id}
          onSuccess={() => {
            setShowFeedbackModal(false);
            setShowSuccessModal(true);
          }}
        />

        <FeedbackSuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          onSubmitAgain={() => {
            setShowSuccessModal(false);
            setShowFeedbackModal(true);
          }}
        />
      </CardContent>
    </Card>
  );
}
