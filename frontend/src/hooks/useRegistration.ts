import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useUser } from '@/contexts/UserContext';

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
  slots?: Slot[];
  total_seats?: number | null;
}

export function useRegistration() {
  const { user } = useUser();
  const { toast } = useToast();
  const [registering, setRegistering] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSlotSelection, setShowSlotSelection] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [slotRegistrations, setSlotRegistrations] = useState<Record<string, number>>({});

  const startRegistration = async (event: Event) => {
    if (!user) return;

    setCurrentEvent(event);
    
    // Fetch per-slot approved counts using existing backend endpoint
    if (event.slots && event.slots.length > 0) {
      try {
        const response = await fetch(`/api/event/${event.id}/slots`, {
          headers: {
            'Authorization': 'Bearer mock-token',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const slotsFromServer = Array.isArray(data.slots) ? data.slots : [];
          const map: Record<string, number> = {};
          for (const s of slotsFromServer) {
            if (s && typeof s.id === 'string') {
              const approvedCount = typeof s.approved_count === 'number' ? s.approved_count : 0;
              map[s.id] = approvedCount;
            }
          }
          setSlotRegistrations(map);
        }
      } catch (error) {
        console.error('Error fetching slot registrations:', error);
      }
      
      // Show slot selection if multiple slots, otherwise show confirmation
      if (event.slots.length > 1) {
        setShowSlotSelection(true);
      } else {
        setSelectedSlot(event.slots[0]);
        setShowConfirmation(true);
      }
    } else {
      // No slots - show confirmation for single slot event
      setSelectedSlot(null);
      setShowConfirmation(true);
    }
  };

  const handleSlotSelection = (slotId: string) => {
    if (!currentEvent?.slots) return;
    
    const slot = currentEvent.slots.find(s => s.id === slotId);
    if (slot) {
      setSelectedSlot(slot);
      setShowSlotSelection(false);
      setShowConfirmation(true);
    }
  };

  const confirmRegistration = async () => {
    if (!currentEvent || !user) return;

    setRegistering(currentEvent.id);
    
    try {
      const response = await fetch('/api/registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token',
        },
        body: JSON.stringify({
          event_id: currentEvent.id,
          user_id: user.id,
          slot_id: selectedSlot?.id || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to register for event');
      }

      setShowConfirmation(false);
      setShowSuccess(true);
      
      return true;
    } catch (error) {
      console.error('Error registering for event:', error);
      toast({
        title: 'Registration failed',
        description: error instanceof Error ? error.message : 'Failed to register for the event. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setRegistering(null);
    }
  };

  const closeAllModals = () => {
    setShowConfirmation(false);
    setShowSlotSelection(false);
    setShowSuccess(false);
    setCurrentEvent(null);
    setSelectedSlot(null);
    setSlotRegistrations({});
  };

  const goToDashboard = () => {
    closeAllModals();
    window.location.href = '/dashboard';
  };

  return {
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
  };
}