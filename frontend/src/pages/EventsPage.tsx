import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { Layout } from "@/components/Layout";
import { EventDetailsModal } from "@/components/EventDetailsModal";
import { ConfirmationModal, SuccessModal, SlotSelectionModal } from "@/components/RegistrationModals";
import { useRegistration } from "@/hooks/useRegistration";
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
import { Calendar, MapPin, Clock, Search, Filter, Plus } from "lucide-react";

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

type EventStatus = "all" | "upcoming" | "ongoing" | "completed";

export function EventsPage() {
  const { user } = useUser();
  const token = "mock-token";
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<EventStatus>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [userRegistrations, setUserRegistrations] = useState<Set<string>>(
    new Set()
  );
  const { toast } = useToast();
  
  // Registration hooks
  const {
    registering,
    showConfirmation,
    showSlotSelection,
    showSuccess,
    currentEvent,
    selectedSlot,
    slotRegistrations,
    startRegistration,
    handleSlotSelection,
    confirmRegistration,
    closeAllModals,
    goToDashboard,
  } = useRegistration();

  const categories = [
    "all",
    "sports",
    "hackathon",
    "cultural",
    "workshop",
    "seminar",
    "conference",
    "competition",
    "social",
  ];

  useEffect(() => {
    fetchEvents();
    if (user && user.role !== "college_admin" && user.role !== "super_admin") {
      fetchUserRegistrations();
    }
  }, [user]);

  // Live update registration counts via socket
  // useEffect(() => {
  //   const socket = socketService.getSocket();
  //   if (!socket) return;
  //   const handler = ({ event_id, count }: { event_id: string; count: number }) => {
  //     setLiveCounts((prev) => ({ ...prev, [event_id]: count }));
  //   };
  //   socketService.onRegistrationCountUpdated(handler);
  //   return () => socketService.offRegistrationCountUpdated();
  // }, []);

  useEffect(() => {
    filterEvents();
  }, [events, searchTerm, selectedCategory, selectedStatus, selectedDate]);

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/event?limit=50", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }

      const data = await response.json();
      setEvents(data.events);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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

  const filterEvents = () => {
    let filtered = events;

    // Filter by search term (event name)
    if (searchTerm) {
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category (event type)
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (event) =>
          event.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Filter by status
    if (selectedStatus !== "all") {
      filtered = filtered.filter((event) => {
        const status = getEventStatus(event.start_date, event.end_date);
        return status === selectedStatus;
      });
    }

    // Filter by date
    if (selectedDate) {
      filtered = filtered.filter((event) => {
        const eventStartDate = new Date(event.start_date)
          .toISOString()
          .split("T")[0];
        const eventEndDate = new Date(event.end_date)
          .toISOString()
          .split("T")[0];
        return selectedDate >= eventStartDate && selectedDate <= eventEndDate;
      });
    }

    setFilteredEvents(filtered);
  };

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

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedStatus("all");
    setSelectedDate("");
  };

  const isAdmin =
    user?.role === "college_admin" || user?.role === "super_admin";

  const fetchUserRegistrations = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/registrations/user/${user.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const registeredEventIds = new Set<string>(
          data.registrations.map((reg: any) => reg.event_id)
        );
        setUserRegistrations(registeredEventIds);
      }
    } catch (error) {
      console.error("Error fetching user registrations:", error);
    }
  };

  const handleRegister = async (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    // Launch the registration flow; confirmation will update the set upon success
    await startRegistration(event);
  };

  const handleConfirmRegistration = async () => {
    const success = await confirmRegistration();
    if (success && currentEvent) {
      setUserRegistrations((prev) => new Set([...prev, currentEvent.id]));
    }
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isAdmin ? "All Events" : "Browse Events"}
            </h1>
            <p className="text-gray-600">
              {isAdmin
                ? "View all events and manage your created events"
                : "Discover and join exciting events across colleges"}
            </p>
          </div>
          {isAdmin && (
            <Link to="/events/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create New Event
              </Button>
            </Link>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
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
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="pl-10 w-full"
                      style={{ borderColor: "#bebebe" }}
                    />
                  </div>
                </div>

                {/* Status - 20% */}
                <div className="w-[20%]">
                  <Select
                    value={selectedStatus}
                    onValueChange={(value: EventStatus) =>
                      setSelectedStatus(value)
                    }
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
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger
                      className="w-full"
                      style={{ borderColor: "#bebebe" }}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category === "all"
                            ? "All Types"
                            : category.charAt(0).toUpperCase() +
                              category.slice(1)}
                        </SelectItem>
                      ))}
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
                    size="sm"
                    onClick={clearFilters}
                    className="w-1/2"
                    style={{ borderColor: "#bebebe" }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        {(searchTerm ||
          selectedCategory !== "all" ||
          selectedStatus !== "all" ||
          selectedDate) && (
          <div className="text-sm text-gray-600">
            Showing {filteredEvents.length} of {events.length} events
          </div>
        )}

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No events found
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ||
                selectedCategory !== "all" ||
                selectedStatus !== "all" ||
                selectedDate
                  ? "Try adjusting your search or filters"
                  : isAdmin
                  ? "No events created yet. Create your first event to get started!"
                  : "No events are currently available. Check back later!"}
              </p>
              {isAdmin && (
                <Link to="/events/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Event
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => {
              const eventStatus = getEventStatus(
                event.start_date,
                event.end_date
              );
              return (
                <Card
                  key={event.id}
                  className="hover:shadow-lg transition-shadow duration-200 overflow-hidden p-0 gap-2"
                >
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
                  <CardHeader className="px-6 pt-2 pb-1">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex flex-wrap gap-2">
                        <Badge className={getCategoryColor(event.category)}>
                          {event.category}
                        </Badge>
                        <Badge className={getStatusColor(eventStatus)}>
                          {eventStatus.charAt(0).toUpperCase() +
                            eventStatus.slice(1)}
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
                            event.registrations_open
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {event.registrations_open ? "OPEN" : "CLOSED"}
                        </div>
                      </div>
                    </div>
                    <CardTitle className="text-base truncate">
                      {event.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-sm text-gray-600 break-words min-h-[2.5rem]">
                      {(event.description || "").trim().slice(0, 116) +
                        ((event.description || "").trim().length > 116
                          ? "..."
                          : "") || "\u00A0"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 pt-1 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>
                          {formatDate(event.start_date)} at{" "}
                          {formatTime(event.start_date)}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>
                          Ends {formatDate(event.end_date)} at{" "}
                          {formatTime(event.end_date)}
                        </span>
                      </div>
                    </div>

                    {typeof event.total_seats === "number" && (
                      <div className="mt-3 flex justify-end">
                        <span className="text-xs text-gray-700 font-medium">
                          {Math.max(
                            0,
                            liveCounts[event.id] ??
                              event.registrations_count ??
                              0
                          )}{" "}
                          / {event.total_seats}
                        </span>
                      </div>
                    )}

                    {!isAdmin ? (
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setSelectedEventId(event.id);
                            setModalOpen(true);
                          }}
                          style={{ borderColor: "#bebebe" }}
                        >
                          View Details
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={() => handleRegister(event.id)}
                          disabled={
                            registering === event.id ||
                            eventStatus === "completed" ||
                            userRegistrations.has(event.id) ||
                            !event.registrations_open
                          }
                        >
                          {eventStatus === "completed"
                            ? "Event completed"
                            : registering === event.id
                            ? "Registering..."
                            : userRegistrations.has(event.id)
                            ? "Registration Done"
                            : "Register"}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        className="w-full mt-2"
                        onClick={() => {
                          setSelectedEventId(event.id);
                          setModalOpen(true);
                        }}
                      >
                        View Details
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Event Details Modal */}
        {modalOpen && (
          <EventDetailsModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            eventId={selectedEventId}
            userRegistrations={userRegistrations}
            onRegister={handleRegister}
            registering={registering}
          />
        )}

        {/* Registration Modals */}
        <SlotSelectionModal
          isOpen={showSlotSelection}
          onClose={closeAllModals}
          onRegister={handleSlotSelection}
          event={currentEvent!}
          slotRegistrations={slotRegistrations}
        />

        <ConfirmationModal
          isOpen={showConfirmation}
          onClose={closeAllModals}
          onConfirm={handleConfirmRegistration}
          eventId={currentEvent?.event_id || ''}
          slotId={selectedSlot?.id || null}
          slots={currentEvent?.slots || []}
          isLoading={!!registering}
        />

        <SuccessModal
          isOpen={showSuccess}
          onClose={closeAllModals}
          eventId={currentEvent?.event_id || ''}
          slotId={selectedSlot?.id || null}
          slots={currentEvent?.slots || []}
          onGoToDashboard={goToDashboard}
        />
      </div>
    </Layout>
  );
}
