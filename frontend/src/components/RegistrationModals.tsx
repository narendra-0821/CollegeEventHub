import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, X } from "lucide-react";

// Types aligned with useRegistration.ts
interface Slot {
  id: string;
  start: string | Date;
  end: string | Date;
  seats?: number | null;
  capacity?: number | null; // optional for display
}

interface Event {
  id: string;
  event_id: string;
  title: string;
  slots?: Slot[];
  total_seats?: number | null;
}

// Shared utils
const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const formatTime = (d: string | Date) =>
  new Date(d).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

function getStatusText(approved: number, capacity: number | null | undefined) {
  if (typeof capacity !== "number") return "";
  if (approved >= capacity) return "closed";
  if (capacity - approved <= Math.max(1, Math.ceil(capacity * 0.2))) return "few left";
  return "available";
}

function slotIndexLabel(slots: Slot[], id: string | null) {
  if (!id) return "no slot";
  const idx = slots.findIndex((s) => s.id === id);
  return idx >= 0 ? `slot-${idx + 1}` : id;
}

// 1) Slot Selection Modal
export function SlotSelectionModal({
  isOpen,
  onClose,
  onRegister,
  event,
  slotRegistrations,
}: {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (slotId: string) => void;
  event: Event;
  // map slotId -> approved_count
  slotRegistrations: Record<string, number>;
}) {
  const slots = event?.slots || [];
  const [selected, setSelected] = useState<string | null>(null);

  const cards = useMemo(
    () =>
      slots.map((s, i) => {
        const approved = slotRegistrations[s.id] ?? 0;
        const capacity: number | null | undefined = (s as any).capacity ?? (s as any).seats ?? null;
        const full = typeof capacity === "number" && approved >= capacity;
        const status = getStatusText(approved, capacity);
        return { s, i, approved, capacity, full, status };
      }),
    [slots, slotRegistrations]
  );

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Select Slot time for <span className="text-blue-600 font-mono">{event.event_id || event.id}</span>
          </h3>
          <button className="text-xl leading-none px-2" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map(({ s, i, approved, capacity, full, status }) => (
              <button
                key={s.id}
                disabled={full}
                onClick={() => !full && setSelected(s.id)}
                className={`text-left p-4 rounded-lg border hover:shadow transition ${
                  full ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                } ${selected === s.id ? "ring-2 ring-blue-500" : ""}`}
                style={{ borderColor: "#bebebe" }}
              >
                <div className="font-medium">Slot-{i + 1}</div>
                <div className="mt-1 text-sm flex items-center gap-2 text-gray-700">
                  <Clock className="h-4 w-4" /> {formatTime(s.start)} - {formatTime(s.end)}
                </div>
                <div className="mt-1 text-sm flex items-center gap-2 text-gray-700">
                  <Calendar className="h-4 w-4" /> {formatDate(s.start)}
                </div>
                {typeof capacity === "number" && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    <span>
                      {Math.min(approved, capacity)} / {capacity}
                    </span>
                    <span className={`ml-2 ${full ? "text-red-700" : status === "few left" ? "text-amber-700" : "text-green-700"}`}>
                      {status}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="mt-6 flex justify-between items-center">
            <Button variant="outline" onClick={onClose} style={{ borderColor: "#bebebe" }}>
              Cancel
            </Button>
            <Button onClick={() => selected && onRegister(selected)} disabled={!selected}>
              Register
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2) Confirmation Modal
export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  eventId,
  slotId,
  slots = [],
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  eventId: string;
  slotId: string | null;
  slots?: Slot[];
  isLoading?: boolean;
}) {
  if (!isOpen) return null;

  const slotLabel = slotIndexLabel(slots, slotId);

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg p-5 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 text-base">Are you sure... Do you want to register for</div>
        <div className="mb-5 text-sm">
          Event ID: <span className="text-blue-600 font-mono">{eventId}</span>
          <br />
          Slot: {slotId ? (
            <span className="text-blue-600">{slotLabel}</span>
          ) : (
            <span className="text-gray-500">no slot</span>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} style={{ borderColor: "#bebebe" }}>
            No
          </Button>
          <Button onClick={onConfirm} disabled={!!isLoading}>
            {isLoading ? "Please wait..." : "Yes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// 3) Success Modal
export function SuccessModal({
  isOpen,
  onClose,
  eventId,
  slotId,
  slots = [],
  onGoToDashboard,
}: {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  slotId: string | null;
  slots?: Slot[];
  onGoToDashboard: () => void;
}) {
  if (!isOpen) return null;
  const slotLabel = slotIndexLabel(slots, slotId);

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <h3 className="text-xl font-semibold mb-2">Registration Successful..!</h3>
        <div className="mb-4 text-sm">
          Event ID: <span className="text-blue-600 font-mono">{eventId}</span>
          <br />
          Slot: {slotId ? (
            <span className="text-blue-600">{slotLabel}</span>
          ) : (
            <span className="text-gray-500">no slot</span>
          )}
        </div>
        <p className="text-gray-600 mb-6">Check event registration status in "Registered Event" page</p>
        <div className="flex justify-center">
          <Button onClick={onGoToDashboard}>Go to Dashboard</Button>
        </div>
      </div>
    </div>
  );
}
