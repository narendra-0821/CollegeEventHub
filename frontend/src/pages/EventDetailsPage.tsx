import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { Layout } from "@/components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Star,
  MessageSquare,
  ArrowLeft,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface Event {
  id: string;
  title: string;
  description?: string;
  category: string;
  location: string;
  start_date: string;
  end_date: string;
  college_id: string;
}

interface Feedback {
  id: string;
  rating: number;
  comments?: string;
  timestamp: string;
  user_name: string;
  user_college: string;
}

interface FeedbackData {
  feedback: Feedback[];
  average_rating: number;
  total_feedback: number;
}

export function EventDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUser();
  const token = "mock-token";

  const [event, setEvent] = useState<Event | null>(null);
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Feedback form state
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState("");
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEventDetails();
      fetchFeedback();
    }
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      const response = await fetch(`/api/event/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch event details");
      }

      const eventData = await response.json();
      setEvent(eventData);
    } catch (error) {
      console.error("Error fetching event details:", error);
      toast({
        title: "Error",
        description: "Failed to load event details",
        variant: "destructive",
      });
      navigate("/events");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFeedback = async () => {
    try {
      const response = await fetch(`/api/event/${id}/feedback`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFeedbackData(data);
      }
    } catch (error) {
      console.error("Error fetching feedback:", error);
    }
  };

  const handleRegister = async () => {
    if (!user) return;

    setIsRegistering(true);
    try {
      const response = await fetch(`/api/event/${id}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to register");
      }

      setIsRegistered(true);
      toast({
        title: "Registration successful!",
        description: "You have been registered for this event.",
      });
    } catch (error) {
      console.error("Error registering for event:", error);
      toast({
        title: "Registration failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!user || rating === 0) return;

    setIsSubmittingFeedback(true);
    try {
      const response = await fetch(`/api/event/${id}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          rating,
          comment: comments || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit feedback");
      }

      toast({
        title: "Feedback submitted!",
        description: "Thank you for your feedback.",
      });

      setShowFeedbackForm(false);
      setRating(0);
      setComments("");
      fetchFeedback();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Failed to submit feedback",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
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

  const isEventPast = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  const renderStars = (
    rating: number,
    interactive = false,
    onStarClick?: (star: number) => void
  ) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"
            } ${interactive ? "cursor-pointer hover:text-yellow-400" : ""}`}
            onClick={() => interactive && onStarClick?.(star)}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Event not found
          </h2>
          <Button onClick={() => navigate("/events")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </div>
      </Layout>
    );
  }

  const eventPast = isEventPast(event.end_date);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/events")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>

        {/* Event Header */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={getCategoryColor(event.category)}>
                    {event.category}
                  </Badge>
                  {eventPast ? (
                    <Badge variant="secondary">Past Event</Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-green-600 border-green-600"
                    >
                      Upcoming
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-3xl">{event.title}</CardTitle>
                {event.description && (
                  <CardDescription className="text-base">
                    {event.description}
                  </CardDescription>
                )}
              </div>
              {!eventPast && !isRegistered && (
                <Button
                  onClick={handleRegister}
                  disabled={isRegistering}
                  size="lg"
                >
                  {isRegistering ? "Registering..." : "Register Now"}
                </Button>
              )}
              {isRegistered && (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Registered
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center text-gray-600">
                  <Calendar className="h-5 w-5 mr-3" />
                  <div>
                    <div className="font-medium">Start</div>
                    <div>
                      {formatDate(event.start_date)} at{" "}
                      {formatTime(event.start_date)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center text-gray-600">
                  <Clock className="h-5 w-5 mr-3" />
                  <div>
                    <div className="font-medium">End</div>
                    <div>
                      {formatDate(event.end_date)} at{" "}
                      {formatTime(event.end_date)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-5 w-5 mr-3" />
                  <div>
                    <div className="font-medium">Location</div>
                    <div>{event.location}</div>
                  </div>
                </div>
                {feedbackData && feedbackData.total_feedback > 0 && (
                  <div className="flex items-center text-gray-600">
                    <Star className="h-5 w-5 mr-3" />
                    <div>
                      <div className="font-medium">Rating</div>
                      <div className="flex items-center gap-2">
                        {renderStars(Math.round(feedbackData.average_rating))}
                        <span>({feedbackData.total_feedback} reviews)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feedback Section */}
        {eventPast && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Event Feedback
              </CardTitle>
              <CardDescription>
                Share your experience and read what others thought about this
                event
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Submit Feedback */}
              {!showFeedbackForm ? (
                <Button onClick={() => setShowFeedbackForm(true)}>
                  Leave Feedback
                </Button>
              ) : (
                <div className="space-y-4 p-4 border rounded-lg">
                  <div>
                    <Label>Rating *</Label>
                    <div className="mt-2">
                      {renderStars(rating, true, setRating)}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="comments">Comments (optional)</Label>
                    <Textarea
                      id="comments"
                      placeholder="Share your thoughts about the event..."
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSubmitFeedback}
                      disabled={rating === 0 || isSubmittingFeedback}
                    >
                      {isSubmittingFeedback
                        ? "Submitting..."
                        : "Submit Feedback"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowFeedbackForm(false);
                        setRating(0);
                        setComments("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Existing Feedback */}
              {feedbackData && feedbackData.feedback.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Reviews ({feedbackData.total_feedback})
                  </h3>
                  <div className="space-y-4">
                    {feedbackData.feedback.map((feedback) => (
                      <div key={feedback.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-medium">
                              {feedback.user_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {feedback.user_college}
                            </div>
                          </div>
                          <div className="text-right">
                            {renderStars(feedback.rating)}
                            <div className="text-sm text-gray-500 mt-1">
                              {new Date(
                                feedback.timestamp
                              ).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        {feedback.comments && (
                          <p className="text-gray-700">{feedback.comments}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
