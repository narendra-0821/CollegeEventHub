import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from './ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Users, UserCheck, UserX, Clock, Settings, Edit3, Save } from 'lucide-react';

interface Registration {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  timestamp: string;
  user_name: string;
  user_email: string;
  user_college: string;
  slot_id?: string | null;
}

interface Slot {
  id: string;
  start?: string;
  end?: string;
  seats?: number | null;
}

interface Event {
  id: string;
  title: string;
  category: string;
  location: string;
  start_date: string;
  end_date: string;
  registrations_open: boolean;
  total_seats?: number | null;
  slots?: Slot[];
}

interface ManageRegistrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string | null;
  onRegistrationsUpdated?: () => void;
}

export function ManageRegistrationsModal({ isOpen, onClose, eventId, onRegistrationsUpdated }: ManageRegistrationsModalProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingRegistration, setUpdatingRegistration] = useState<string | null>(null);
  const [updatingRegistrationStatus, setUpdatingRegistrationStatus] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedRegistrations, setEditedRegistrations] = useState<{[key: string]: string}>({});
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && eventId) {
      fetchEventAndRegistrations();
    }
  }, [isOpen, eventId]);

  const fetchEventAndRegistrations = async () => {
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

      // Fetch registrations
      const registrationsResponse = await fetch(`/api/event/${eventId}/registrations`, {
        headers: {
          'Authorization': `Bearer mock-token`,
        },
      });

      if (registrationsResponse.ok) {
        const registrationsData = await registrationsResponse.json();
        setRegistrations(registrationsData.registrations || []);
      } else {
        setRegistrations([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load registration data',
        variant: 'destructive',
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  // Lightweight refresh for registrations only, without triggering full modal loading UI
  const refreshRegistrations = async () => {
    if (!eventId) return;
    try {
      const registrationsResponse = await fetch(`/api/event/${eventId}/registrations`, {
        headers: {
          'Authorization': `Bearer mock-token`,
        },
      });

      if (registrationsResponse.ok) {
        const registrationsData = await registrationsResponse.json();
        setRegistrations(registrationsData.registrations || []);
      }
    } catch (error) {
      // Keep silent to avoid UI flicker; toast not necessary for background refresh
    }
  };

  const checkAndCloseRegistrations = async (updatedRegistrations: Registration[]) => {
    if (!event || !event.total_seats || !eventId) return;

    const approvedCount = updatedRegistrations.filter(r => r.status === 'approved').length;
    
    if (approvedCount >= event.total_seats) {
      if (event.registrations_open) {
        try {
          const response = await fetch(`/api/event/${eventId}/registration-status`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer mock-token`,
            },
            body: JSON.stringify({ registrations_open: false }),
          });

          if (response.ok) {
            setEvent({ ...event, registrations_open: false });
            toast({
              title: 'Event Full!',
              description: `Registrations automatically closed. Event has reached capacity (${event.total_seats} seats).`,
            });
            onRegistrationsUpdated?.();
          }
        } catch (error) {
          console.error('Error auto-closing registrations:', error);
        }
      }
    } else if (!event.registrations_open && approvedCount < event.total_seats) {
      // Automatically open registrations if seats are available again
      try {
        const response = await fetch(`/api/event/${eventId}/registration-status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer mock-token`,
          },
          body: JSON.stringify({ registrations_open: true }),
        });

        if (response.ok) {
          setEvent({ ...event, registrations_open: true });
          toast({
            title: 'Registrations Reopened',
            description: `Seats are now available (${event.total_seats - approvedCount} remaining seats).`,
          });
          onRegistrationsUpdated?.();
        }
      } catch (error) {
        console.error('Error auto-opening registrations:', error);
      }
    }
  };

  const updateRegistrationStatus = async (registrationId: string, status: string) => {
    setUpdatingRegistration(registrationId);
    try {
      const response = await fetch(`/api/registration/${registrationId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update registration status');
      }

      // Refresh registrations without toggling the main loading state
      await refreshRegistrations();
      
      // Check if we need to auto-close registrations
      const updatedRegistrations = registrations.map(r => 
        r.id === registrationId ? { ...r, status } : r
      );
      await checkAndCloseRegistrations(updatedRegistrations);
      
      onRegistrationsUpdated?.();
    } catch (error) {
      console.error('Error updating registration status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update registration status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingRegistration(null);
    }
  };

  const toggleRegistrationStatus = async (registrationsOpen: boolean) => {
    if (!eventId) return;
    
    setUpdatingRegistrationStatus(true);
    try {
      const response = await fetch(`/api/event/${eventId}/registration-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token`,
        },
        body: JSON.stringify({ registrations_open: registrationsOpen }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast({
          title: 'Cannot update registration status',
          description: errorData.error || 'Failed to update registration status',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Registration status updated',
        description: `Registrations are now ${registrationsOpen ? 'open' : 'closed'}`,
        variant: registrationsOpen ? 'default' : 'destructive',
        className: registrationsOpen ? 'border-green-200 bg-green-50 text-green-900' : undefined,
      });

      // Update local event state
      if (event) {
        setEvent({ ...event, registrations_open: registrationsOpen });
      }
      
      onRegistrationsUpdated?.();
    } catch (error) {
      console.error('Error updating registration status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update registration status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingRegistrationStatus(false);
    }
  };

  const handleEditToggle = () => {
    if (isEditMode) {
      // Reset edited registrations when exiting edit mode
      setEditedRegistrations({});
    }
    setIsEditMode(!isEditMode);
  };

  const handleStatusChange = (registrationId: string, newStatus: string) => {
    setEditedRegistrations(prev => ({
      ...prev,
      [registrationId]: newStatus
    }));
  };

  const saveChanges = async () => {
    if (Object.keys(editedRegistrations).length === 0) {
      setIsEditMode(false);
      return;
    }

    setIsSaving(true);
    try {
      // Update all changed registrations
      const updatePromises = Object.entries(editedRegistrations).map(([registrationId, status]) =>
        fetch(`/api/registration/${registrationId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer mock-token`,
          },
          body: JSON.stringify({ status }),
        })
      );

      const results = await Promise.all(updatePromises);
      const failedUpdates = results.filter(result => !result.ok);

      if (failedUpdates.length > 0) {
        throw new Error(`Failed to update ${failedUpdates.length} registration(s)`);
      }

      toast({
        title: 'Changes saved',
        description: `Updated ${Object.keys(editedRegistrations).length} registration(s)`,
      });

      // Refresh registrations only and exit edit mode without flicker
      await refreshRegistrations();
      
      // Check if we need to auto-close registrations after bulk updates
      const updatedRegistrations = registrations.map(r => 
        editedRegistrations[r.id] ? { ...r, status: editedRegistrations[r.id] } : r
      );
      await checkAndCloseRegistrations(updatedRegistrations);
      
      setEditedRegistrations({});
      setIsEditMode(false);
      onRegistrationsUpdated?.();
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: 'Error',
        description: 'Failed to save some changes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Map slot_id to a human-friendly slot index label like "slot-2"
  const getSlotLabel = (slotId?: string | null) => {
    if (!slotId) return 'Not Assigned';
    const slots = (event as any)?.slots || [];
    const idx = slots.findIndex((s: any) => s.id === slotId);
    return idx >= 0 ? `slot-${idx + 1}` : `slot-${slotId}`;
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

  // Check if the event is at capacity
  const isEventFull = React.useMemo(() => {
    if (!event?.total_seats) return false;
    const approvedCount = registrations.filter(r => r.status === 'approved').length;
    return approvedCount >= event.total_seats;
  }, [event?.total_seats, registrations]);

  // Modify toggle behavior to prevent opening when full
  const handleToggleRegistrations = (newState: boolean) => {
    if (newState && isEventFull) {
      return; // Do nothing if trying to open when full
    }
    toggleRegistrationStatus(newState);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent 
        className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] duration-300"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Users className="h-5 w-5" />
            Manage Registrations
            <div className="flex items-center gap-2">
              {isEditMode && (
                <Button
                  onClick={saveChanges}
                  disabled={isSaving || Object.keys(editedRegistrations).length === 0}
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-1" />
                  {isSaving ? 'Saving...' : 'Done'}
                </Button>
              )}
              <Button
                onClick={handleEditToggle}
                variant={isEditMode ? "outline" : "ghost"}
                size="sm"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            {isEditMode && <span className="text-blue-600">• Edit Mode Active</span>}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Event Info */}
            {event && (
              <div className="rounded-lg p-4" style={{ backgroundColor: '#d1e2f7ff' }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{event.title}</h3>
                    <p className="text-sm text-gray-600">{event.location}</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(event.start_date)} - {formatDate(event.end_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label
                      htmlFor="registration-toggle"
                      className={`text-sm font-medium ${event.registrations_open ? 'text-green-600' : 'text-red-600'}`}
                    >
                      Registrations {event.registrations_open ? 'Open' : 'Closed'}
                    </Label>
                    <div className={`${!event.registrations_open && isEventFull ? 'cursor-not-allowed' : ''}`}>
                      <Switch
                        id="registration-toggle"
                        checked={event.registrations_open}
                        onCheckedChange={handleToggleRegistrations}
                        disabled={updatingRegistrationStatus}
                        className={`${!event.registrations_open && isEventFull ? 'cursor-not-allowed hover:cursor-not-allowed' : ''}`}
                      />
                    </div>
                  </div>
                </div>
                {!event.registrations_open && isEventFull && (
                  <div className="mt-1 text-xs text-red-600">
                    Increase total seats to enable registrations
                  </div>
                )}

              </div>
            )}

            {/* Registration Stats */}
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{registrations.length}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {registrations.filter(r => r.status === 'pending').length}
                </div>
                <div className="text-xs text-gray-500">Pending</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {registrations.filter(r => r.status === 'approved').length}
                </div>
                <div className="text-xs text-gray-500">Approved</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {registrations.filter(r => r.status === 'rejected').length}
                </div>
                <div className="text-xs text-gray-500">Rejected</div>
              </div>
            </div>
            <div className="h-px bg-gray-300 mx-auto" style={{ width: '80%' }}></div>

            {/* Registrations List */}
            {registrations.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No registrations for this event yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {registrations.map((registration) => (
                  <div
                    key={registration.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                    style={{ backgroundColor: '#c9c9c9' }}
                  >
                    <div className="space-y-1">
                      <div className="font-medium text-lg">{registration.user_name}</div>
                      <div className="text-sm text-gray-700">{registration.user_email}</div>
                      <div className="text-sm text-gray-900 font-medium">
                        Slot: {getSlotLabel(registration.slot_id)}
                      </div>
                      <div className="text-xs text-gray-700">
                        Registered on {formatDateTime(registration.timestamp)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {(() => {
                        // Determine effective status in edit mode (consider unsaved edits)
                        const effectiveStatus = isEditMode && editedRegistrations[registration.id]
                          ? editedRegistrations[registration.id]
                          : registration.status;

                        return (
                          <>
                            <Badge className={getStatusColor(effectiveStatus)}>
                              {effectiveStatus}
                            </Badge>
                            {isEditMode ? (
                              // In edit mode, show only the two buttons that are NOT the current effective status
                              <div className="flex gap-2">
                                {effectiveStatus !== 'approved' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className={editedRegistrations[registration.id] === 'approved' ? 'border-green-500 border-2' : ''}
                                    style={{ borderColor: '#22c55e', color: '#22c55e' }}
                                    onClick={() => handleStatusChange(registration.id, 'approved')}
                                  >
                                    <UserCheck className="h-4 w-4 mr-1" />
                                    Accept
                                  </Button>
                                )}
                                {effectiveStatus !== 'rejected' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className={editedRegistrations[registration.id] === 'rejected' ? 'border-red-500 border-2' : ''}
                                    style={{ borderColor: '#ef4444', color: '#ef4444' }}
                                    onClick={() => handleStatusChange(registration.id, 'rejected')}
                                  >
                                    <UserX className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                )}
                                {effectiveStatus !== 'pending' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className={editedRegistrations[registration.id] === 'pending' ? 'border-amber-500 border-2' : ''}
                                    style={{ borderColor: '#f59e0b', color: '#b45309' }}
                                    onClick={() => handleStatusChange(registration.id, 'pending')}
                                  >
                                    <Clock className="h-4 w-4 mr-1" />
                                    Pending
                                  </Button>
                                )}
                              </div>
                            ) : (
                              // In view mode, only show actions for pending
                              registration.status === 'pending' ? (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateRegistrationStatus(registration.id, 'approved')}
                                    disabled={updatingRegistration === registration.id}
                                    style={{ borderColor: '#22c55e', color: '#22c55e' }}
                                  >
                                    <UserCheck className="h-4 w-4 mr-1" />
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateRegistrationStatus(registration.id, 'rejected')}
                                    disabled={updatingRegistration === registration.id}
                                    style={{ borderColor: '#ef4444', color: '#ef4444' }}
                                  >
                                    <UserX className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              ) : null
                            )}
                          </>
                        );
                      })()}
                    </div>
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
