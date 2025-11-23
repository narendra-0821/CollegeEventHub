import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { Layout } from "@/components/Layout";
import { EventDetailsModal } from "@/components/EventDetailsModal";
import { EventCard } from "@/components/EventCard";
import { ConfirmationModal, SuccessModal, SlotSelectionModal } from "@/components/RegistrationModals";
import { useRegistration } from "@/hooks/useRegistration";
import { RegisteredEventCard } from "@/components/RegisteredEventCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Calendar, Users, Clock, MapPin, Plus } from "lucide-react";

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
}

interface DashboardStats {
  totalEvents: number;
  todaysEvents: number;
  myRegistrations: number;
}

interface UserRegistration {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  timestamp: string;
  event_title: string;
  event_location: string;
  event_start_date: string;
  event_end_date: string;
}

interface RegisteredEvent extends Event {
  registration_status: string;
  registration_id: string;
  slot_id?: string | null;
}

export function DashboardPage() {
  const { user } = useUser();
  const token = "mock-token";
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [registeredEvents, setRegisteredEvents] = useState<RegisteredEvent[]>(
    []
  );
  const [activeTab, setActiveTab] = useState<"recent" | "registered">("recent");
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    todaysEvents: 0,
    myRegistrations: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  // Registration flow state from shared hook
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
  const [userRegistrations, setUserRegistrations] = useState<Set<string>>(
    new Set()
  );
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      if (user.role !== "college_admin" && user.role !== "super_admin") {
        fetchUserRegistrations();
        fetchRegisteredEvents();
      }
    }
  }, [user]);

  const isTodayWithinRange = (startISO: string, endISO: string) => {
    const now = new Date();
    const start = new Date(startISO);
    const end = new Date(endISO);
    // Consider events that are ongoing today as "today's"
    const sameDay = (d: Date) => d.toISOString().split("T")[0];
    const today = sameDay(now);
    return (
      sameDay(start) === today ||
      sameDay(end) === today ||
      (now >= start && now <= end)
    );
  };

  const fetchDashboardData = async () => {
    try {
      const eventsPromise = fetch("/api/event?limit=20", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const regsPromise = user
        ? fetch(`/api/registrations/user/${user.id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
        : null;

      const [eventsResp, regsResp] = await Promise.all([
        eventsPromise,
        regsPromise ?? Promise.resolve(null),
      ]);

      if (!eventsResp.ok) {
        throw new Error("Failed to fetch events");
      }

      const data = await eventsResp.json();

      // Filter out completed events and get 6 latest created events
      const now = new Date();
      const upcomingEvents = data.events.filter(
        (event: Event) => new Date(event.end_date) > now
      );

      // Sort by creation date (newest first) and take first 6
      const sortedEvents = upcomingEvents.sort(
        (a: Event, b: Event) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const recentEvents = sortedEvents.slice(0, 6);
      setRecentEvents(recentEvents);

      let myRegsCount = 0;
      if (regsResp) {
        if (!regsResp.ok) {
          throw new Error("Failed to fetch registrations");
        }
        const regsData: { registrations: UserRegistration[] } =
          await regsResp.json();
        myRegsCount = regsData.registrations.filter(
          (r) => r.status === "approved"
        ).length;
      }

      const todays = data.events.filter((event: Event) =>
        isTodayWithinRange(event.start_date, event.end_date)
      ).length;

      setStats({
        totalEvents: data.total,
        todaysEvents: todays,
        myRegistrations: myRegsCount,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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

  const fetchRegisteredEvents = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/registrations/user/${user.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const registrations: UserRegistration[] = data.registrations;

        // Fetch event details for each registration
        const eventsPromise = registrations.map(async (reg) => {
          try {
            const eventResponse = await fetch(`/api/event/${reg.event_id}`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (eventResponse.ok) {
              const eventData = await eventResponse.json();
              const raw = eventData.event || eventData;
              const normalizedId = raw?.id || raw?._id || raw?.event_id;
              return {
                ...raw,
                id: normalizedId,
                registration_status: reg.status,
                registration_id: reg.id,
                slot_id: (reg as any).slot_id ?? null,
              } as RegisteredEvent;
            }
          } catch (error) {
            console.error("Error fetching event details:", error);
          }
          return null;
        });

        const events = await Promise.all(eventsPromise);
        const validEvents = events.filter(
          (event): event is RegisteredEvent => event !== null
        );

        // Sort by most recent registration time first
        const sortedEvents = validEvents.sort((a, b) => {
          const aReg = registrations.find((r) => r.id === a.registration_id);
          const bReg = registrations.find((r) => r.id === b.registration_id);
          const aTime = aReg ? new Date(aReg.timestamp).getTime() : 0;
          const bTime = bReg ? new Date(bReg.timestamp).getTime() : 0;
          return bTime - aTime;
        });

        setRegisteredEvents(sortedEvents);
      }
    } catch (error) {
      console.error("Error fetching registered events:", error);
    }
  };

  const handleRegister = async (eventId: string) => {
    let event = [...recentEvents, ...registeredEvents].find((e) => e.id === eventId) as any;
    if (!event) {
      try {
        const resp = await fetch(`/api/event/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          const data = await resp.json();
          const raw = data.event || data;
          const normalizedId = raw?.id || raw?._id || raw?.event_id || eventId;
          event = { ...raw, id: normalizedId };
        }
      } catch {}
    }
    if (!event) return;
    await startRegistration(event);
  };

  const handleConfirmRegistration = async () => {
    const success = await confirmRegistration();
    if (success && currentEvent) {
      setUserRegistrations((prev) => new Set([...prev, currentEvent.id]));
      // Refresh dashboard to reflect updated counts and lists
      fetchDashboardData();
      fetchRegisteredEvents();
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
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-blue-100 mb-4">
            Discover amazing events happening across colleges and join the ones
            that interest you!
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/events">
              <Button
                variant="secondary"
                className="bg-white text-blue-600 hover:bg-gray-100"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Browse All Events
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Events
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEvents}</div>
              <p className="text-xs text-muted-foreground">
                Available across all colleges
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Events
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todaysEvents}</div>
              <p className="text-xs text-muted-foreground">Happening today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                My Registrations
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.myRegistrations}</div>
              <p className="text-xs text-muted-foreground">
                Events you've registered for
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Events Section with Tabs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              {/* Tab Buttons on the left */}
              <div
                className="flex border rounded-lg p-1"
                style={{ borderColor: "#bebebe" }}
              >
                <button
                  onClick={() => setActiveTab("recent")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "recent"
                      ? "bg-[#e8e8e8] text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  style={
                    activeTab === "recent"
                      ? {
                          boxShadow:
                            "0 2px 4px rgba(0, 0, 0, 0.2), 2px 0 4px rgba(0,0,0,0.2), -2px 0 4px rgba(0,0,0,0.2)",
                        }
                      : undefined
                  }
                >
                  Recent Events
                </button>
                <button
                  onClick={() => setActiveTab("registered")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "registered"
                      ? "bg-[#e8e8e8] text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  style={
                    activeTab === "registered"
                      ? {
                          boxShadow:
                            "0 2px 4px rgba(0,0,0,0.2), 2px 0 4px rgba(0,0,0,0.2), -2px 0 4px rgba(0,0,0,0.2)",
                        }
                      : undefined
                  }
                >
                  Registered Events
                </button>
              </div>

              {/* Title and Description in the middle */}
              <div className="mr-32">
                <CardTitle>
                  {activeTab === "recent"
                    ? "Latest events from all colleges"
                    : "Events you have registered for"}
                </CardTitle>
              </div>

              {/* View All button on the right */}
              <Link to="/events">
                <Button
                  variant="outline"
                  size="sm"
                  style={{ borderColor: "#bebebe" }}
                >
                  View All
                </Button>
              </Link>
            </div>

            {/* Divider */}
            <div
              className="border-t mt-4"
              style={{ borderColor: "#bebebe" }}
            ></div>
          </CardHeader>
          <CardContent>
            {activeTab === "recent" ? (
              recentEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    No events available at the moment
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    Check back later for new events!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      isAdmin={isAdmin}
                      userRegistrations={userRegistrations}
                      registering={registering}
                      onViewDetails={(eventId) => {
                        setSelectedEventId(eventId);
                        setModalOpen(true);
                      }}
                      onRegister={handleRegister}
                    />
                  ))}
                </div>
              )
            ) : registeredEvents.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No registered events yet</p>
                <p className="text-gray-400 text-sm mt-2">
                  Register for events to see them here!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {registeredEvents.map((event) => (
                  <RegisteredEventCard
                    key={event.id}
                    event={event}
                    onViewDetails={(eventId) => {
                      setSelectedEventId(eventId);
                      setModalOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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
          event={(currentEvent as any)!}
          slotRegistrations={slotRegistrations}
        />

        <ConfirmationModal
          isOpen={showConfirmation}
          onClose={closeAllModals}
          onConfirm={handleConfirmRegistration}
          eventId={currentEvent?.event_id || ""}
          slotId={selectedSlot?.id || null}
          slots={(currentEvent as any)?.slots || []}
          isLoading={!!registering}
        />

        <SuccessModal
          isOpen={showSuccess}
          onClose={closeAllModals}
          eventId={currentEvent?.event_id || ""}
          slotId={selectedSlot?.id || null}
          slots={(currentEvent as any)?.slots || []}
          onGoToDashboard={goToDashboard}
        />
      </div>
    </Layout>
  );
}
