import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { Layout } from "@/components/Layout";
import { EventDetailsModal } from "../components/EventDetailsModal";
import { EditEventModal } from "../components/EditEventModal";
import { ManageRegistrationsModal } from "../components/ManageRegistrationsModal";
import { FeedbackModal } from "../components/FeedbackModal";
import { ViewEventFeedbacksModal } from "../components/ViewEventFeedbacksModal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Calendar,
  Users,
  Plus,
  Eye,
  Edit3,
  BookOpen,
  MapPin,
  Search,
  Filter,
  Clock,
  Settings,
  MessageSquare,
} from "lucide-react";

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
  total_seats?: number | null;
}

interface Registration {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  timestamp: string;
  user_name: string;
  user_email: string;
  user_college: string;
}

interface EventWithRegistrations extends Event {
  registrations: Registration[];
}

export function AdminDashboardPage() {
  const { user } = useUser();
  const token = "mock-token";
  const { toast } = useToast();
  const [events, setEvents] = useState<EventWithRegistrations[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<
    EventWithRegistrations[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [manageRegistrationsEventId, setManageRegistrationsEventId] = useState<
    string | null
  >(null);
  const [feedbackEventId, setFeedbackEventId] = useState<string | null>(null);
  const [viewEventFeedbackId, setViewEventFeedbackId] = useState<string | null>(null);
  const [unreadFeedbacks, setUnreadFeedbacks] = useState<{
    [key: string]: number;
  }>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  const fetchAdminData = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Fetch only events created by this admin (filter by college_id)
      const eventsResponse = await fetch(
        `/api/event?limit=50&college_id=${user?.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!eventsResponse.ok) {
        throw new Error("Failed to fetch events");
      }

      const eventsData = await eventsResponse.json();

      // Fetch registrations for each event
      const eventsWithRegistrations = await Promise.all(
        eventsData.events.map(async (event: Event) => {
          try {
            const registrationsResponse = await fetch(
              `/api/event/${event.id}/registrations`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (registrationsResponse.ok) {
              const registrationsData = await registrationsResponse.json();
              return {
                ...event,
                registrations: registrationsData.registrations || [],
              };
            } else {
              return { ...event, registrations: [] };
            }
          } catch (error) {
            console.error(
              `Error fetching registrations for event ${event.id}:`,
              error
            );
            return { ...event, registrations: [] };
          }
        })
      );

      setEvents(eventsWithRegistrations);
      setFilteredEvents(eventsWithRegistrations);

      // Fetch unread feedback counts
      await fetchUnreadFeedbackCounts(eventsWithRegistrations);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const fetchUnreadFeedbackCounts = async (
    events: EventWithRegistrations[]
  ) => {
    try {
      const counts: { [key: string]: number } = {};

      for (const event of events) {
        const response = await fetch(
          `/api/event/${event.id}/feedbacks/unread-count`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          counts[event.id] = data.count || 0;
        }
      }

      setUnreadFeedbacks(counts);
    } catch (error) {
      console.error("Error fetching unread feedback counts:", error);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  useEffect(() => {
    let filtered = events;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((event) => event.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter((event) => {
        const startDate = new Date(event.start_date);
        const endDate = new Date(event.end_date);

        switch (statusFilter) {
          case "upcoming":
            return now < startDate;
          case "ongoing":
            return now >= startDate && now <= endDate;
          case "completed":
            return now > endDate;
          default:
            return true;
        }
      });
    }

    // Date filter (selected date falls within event range)
    if (dateFilter) {
      filtered = filtered.filter((event) => {
        const eventStartDate = new Date(event.start_date)
          .toISOString()
          .split("T")[0];
        const eventEndDate = new Date(event.end_date)
          .toISOString()
          .split("T")[0];
        return dateFilter >= eventStartDate && dateFilter <= eventEndDate;
      });
    }

    setFilteredEvents(filtered);
  }, [events, searchTerm, categoryFilter, statusFilter, dateFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getCategoryColor = (category: string) => {
    return "bg-purple-100 text-purple-800";
  };

  // Calculate stats (independent of filters)
  const totalEvents = events.length;
  const totalRegistrations = events.reduce(
    (sum, event) => sum + event.registrations.length,
    0
  );
  const pendingRegistrations = events.reduce(
    (sum, event) =>
      sum + event.registrations.filter((r) => r.status === "pending").length,
    0
  );

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <p className="text-gray-600">
              Manage your events and registrations
            </p>
          </div>
          <Link to="/events/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Events
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {events.filter((e) => new Date(e.end_date) > new Date()).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Upcoming & ongoing events
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Events
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEvents}</div>
              <p className="text-xs text-muted-foreground">
                All events created
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Registrations
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {events
                  .filter((e) => new Date(e.end_date) > new Date())
                  .reduce((sum, event) => sum + event.registrations.length, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                For active events only
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Approvals
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRegistrations}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting your review
              </p>
            </CardContent>
          </Card>
        </div>

        {/* My Events */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div>
                <CardTitle>My Events</CardTitle>
                <CardDescription>
                  Events you have created and are managing
                </CardDescription>
              </div>

              {/* Filters */}
              <div className="space-y-4">
                {/* Main filter row with exact percentage widths */}
                <div className="flex gap-3">
                  {/* Search - 40% */}
                  <div className="w-[40%]">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by event name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full"
                        style={{ borderColor: "#bebebe" }}
                      />
                    </div>
                  </div>

                  {/* Date - 20% */}
                  <div className="w-[20%]">
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type="date"
                        placeholder="Event Date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="pl-10 w-full"
                        style={{ borderColor: "#bebebe" }}
                      />
                    </div>
                  </div>

                  {/* Status - 20% */}
                  <div className="w-[20%]">
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger
                        className="w-full"
                        style={{ borderColor: "#bebebe" }}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="ongoing">Ongoing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Types - 20% */}
                  <div className="w-[20%]">
                    <Select
                      value={categoryFilter}
                      onValueChange={setCategoryFilter}
                    >
                      <SelectTrigger
                        className="w-full"
                        style={{ borderColor: "#bebebe" }}
                      >
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="sports">Sports</SelectItem>
                        <SelectItem value="hackathon">Hackathon</SelectItem>
                        <SelectItem value="cultural">Cultural</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="seminar">Seminar</SelectItem>
                        <SelectItem value="conference">Conference</SelectItem>
                        <SelectItem value="competition">Competition</SelectItem>
                        <SelectItem value="social">Social</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Clear Filters button row - positioned below the Types filter */}
                <div className="flex">
                  <div className="w-[80%]"></div>{" "}
                  {/* Empty space to align with Types column */}
                  <div className="w-[20%] flex justify-end">
                    {" "}
                    {/* Align with Types filter above */}
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setCategoryFilter("all");
                        setStatusFilter("all");
                        setDateFilter("");
                      }}
                      className="w-1/2"
                      style={{ borderColor: "#bebebe" }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredEvents.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No events created yet</p>
                <Link to="/events/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Event
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEvents.map((event) => {
                  const now = new Date();
                  const startDate = new Date(event.start_date);
                  const endDate = new Date(event.end_date);
                  const isUpcoming = now < startDate;
                  const isCompleted = now > endDate;
                  const isOngoing = now >= startDate && now <= endDate;

                  return (
                    <div key={event.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                              {event.event_id && (
                                <div className="text-sm text-gray-600 font-mono font-bold">
                                  #{event.event_id}
                                </div>
                              )}
                              <div className="text-xs">
                                <span
                                  className={
                                    event.registrations_open
                                      ? "text-green-600 text-xs font-medium"
                                      : "text-red-600 text-xs font-medium"
                                  }
                                >
                                  {event.registrations_open ? "Open" : "Closed"}
                                </span>
                              </div>
                            </div>
                            <h3 className="text-lg font-semibold">
                              {event.title}
                            </h3>
                            <Badge className={getCategoryColor(event.category)}>
                              {event.category}
                            </Badge>
                            {isCompleted && (
                              <Badge className="bg-gray-100 text-gray-800">
                                Completed
                              </Badge>
                            )}
                            {isOngoing && (
                              <Badge className="bg-green-100 text-green-800">
                                Ongoing
                              </Badge>
                            )}
                            {isUpcoming && (
                              <Badge className="bg-blue-100 text-blue-800">
                                Upcoming
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <MapPin className="h-4 w-4" />
                            <span>{event.location}</span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {formatDate(event.start_date)} -{" "}
                            {formatDate(event.end_date)}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>
                                {event.total_seats
                                  ? `${
                                      event.registrations.filter(
                                        (r) => r.status === "approved"
                                      ).length
                                    }/${event.total_seats}`
                                  : `${
                                      event.registrations.filter(
                                        (r) => r.status === "approved"
                                      ).length
                                    }`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>
                                {
                                  event.registrations.filter(
                                    (r) => r.status === "pending"
                                  ).length
                                }{" "}
                                applications
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            {/* Show buttons for all events */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setManageRegistrationsEventId(event.id)
                              }
                              style={{ borderColor: "#bebebe" }}
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              Manage Registrations
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingEventId(event.id)}
                              style={{ borderColor: "#bebebe" }}
                            >
                              <Edit3 className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            {/* Help/Query button - visible for all events */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setFeedbackEventId(event.id)}
                              className="relative"
                              style={{ borderColor: "#bebebe" }}
                            >
                              <BookOpen className="h-4 w-4" />
                              {unreadFeedbacks[event.id] &&
                                unreadFeedbacks[event.id] > 0 && (
                                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-black rounded-full"></div>
                                )}
                            </Button>
                          </div>
                          {/* After-Event Feedback button - only for completed events */}
                          {isCompleted && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewEventFeedbackId(event.id)}
                              style={{ borderColor: "#bebebe" }}
                              className="w-fit"
                            >
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Feedback
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help/Feedback Modal */}
        {feedbackEventId && (
          <FeedbackModal
            isOpen={!!feedbackEventId}
            onClose={() => setFeedbackEventId(null)}
            eventId={feedbackEventId}
            onFeedbacksRead={() => fetchUnreadFeedbackCounts(events)}
          />
        )}

        {/* View Event Feedbacks Modal */}
        {viewEventFeedbackId && (
          <ViewEventFeedbacksModal
            isOpen={!!viewEventFeedbackId}
            onClose={() => setViewEventFeedbackId(null)}
            eventId={viewEventFeedbackId}
          />
        )}

        {editingEventId && (
          <EditEventModal
            isOpen={!!editingEventId}
            onClose={() => setEditingEventId(null)}
            eventId={editingEventId}
            onEventUpdated={fetchAdminData}
            onEventDeleted={fetchAdminData}
          />
        )}
        {/* Manage Registrations Modal */}
        <ManageRegistrationsModal
          isOpen={manageRegistrationsEventId !== null}
          onClose={() => setManageRegistrationsEventId(null)}
          eventId={manageRegistrationsEventId}
          onRegistrationsUpdated={fetchAdminData}
        />
      </div>
    </Layout>
  );
}
