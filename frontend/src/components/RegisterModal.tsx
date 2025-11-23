import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface RegisterModalProps {
  eventId: string | null;
  eventCode?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (eventIdWithSlot: string) => Promise<void> | void;
}

export default function RegisterModal({ eventId, eventCode, isOpen, onClose, onConfirm }: RegisterModalProps) {
  const [slots, setSlots] = useState<{ id: string; start: string; end: string; seats?: number | null; approved_count?: number; capacity?: number | null; available?: boolean }[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen || !eventId) return;
    setLoading(true);
    setConfirm(false);
    setSelectedSlotId(null);
    fetch(`/api/event/${eventId}/slots`, { headers: { Authorization: `Bearer mock-token` } })
      .then((r) => r.json())
      .then((d) => {
        const s = Array.isArray(d.slots) ? d.slots : [];
        setSlots(s);
        if (s.length === 1) setSelectedSlotId(s[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, eventId]);

  if (!isOpen || !eventId) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Select Slot time for <span className="text-blue-600 font-mono">{eventCode ?? eventId}</span></h3>
          <button className="text-xl leading-none px-2" onClick={onClose}>×</button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <div className="flex gap-2 flex-wrap">
                  {slots.map((s, idx) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSlotId(s.id)}
                      className={`px-3 py-2 rounded-md border text-sm ${selectedSlotId === s.id ? 'bg-blue-600 text-white' : 'bg-white'} ${s.available === false ? 'opacity-60 cursor-not-allowed' : ''}`}
                      style={{ borderColor: '#bebebe' }}
                      disabled={s.available === false}
                    >
                      <div className="font-medium">S-{idx + 1}</div>
                      <div className="text-[11px] opacity-80">
                        {new Date(s.start).toLocaleDateString()} · {new Date(s.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {typeof s.capacity === 'number' && (
                        <div className={`mt-1 text-[11px] ${s.available ? 'text-green-700' : 'text-red-700'}`}>
                          {Math.min(s.approved_count ?? 0, s.capacity)} / {s.capacity} {s.available ? 'available' : 'full'}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={onClose} style={{ borderColor: '#bebebe' }}>Cancel</Button>
                <Button
                  onClick={() => setConfirm(true)}
                  disabled={slots.length > 0 && !selectedSlotId}
                >
                  Register
                </Button>
              </div>
            </>
          )}
        </div>

        {confirm && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40" onClick={() => setConfirm(false)}>
            <div className="bg-white rounded-lg p-5 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 text-sm">Are you sure... Do you want to register for</div>
              <div className="mb-4 text-sm">
                Event ID: <span className="text-blue-600 font-mono">{eventCode ?? eventId}</span><br />
                {selectedSlotId && (
                  <>
                    Slot: <span className="text-blue-600">{(() => { const i = slots.findIndex((s) => s.id === selectedSlotId); return i >= 0 ? `slot-${i + 1}` : selectedSlotId; })()}</span>
                  </>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirm(false)} style={{ borderColor: '#bebebe' }}>No</Button>
                <Button onClick={async () => {
                  setConfirm(false);
                  const payloadId = eventId + (selectedSlotId ? `|slot:${selectedSlotId}` : '');
                  await onConfirm(payloadId);
                  onClose();
                }}>Yes</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


