"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { v4 as uuidv4 } from "uuid"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Trash2, ImageIcon, ArrowLeft, Clock } from "lucide-react"

interface Event {
  id: string
  title: string
  description?: string
  category: string
  location: string
  start_date: string
  end_date: string
  image_url?: string | null
  total_seats?: number | null
}

interface EditEventModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string | null
  onEventUpdated?: () => void
  onEventDeleted?: () => void
}

export function EditEventModal({ isOpen, onClose, eventId, onEventUpdated, onEventDeleted }: EditEventModalProps) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [event, setEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    location: "",
    start_date: "",
    end_date: "",
    image_url: "" as string | undefined,
    total_seats: "" as string,
    num_slots: "1" as string,
  })
  const [baseline, setBaseline] = useState({
    total_seats: "",
    start_date: "",
    end_date: "",
    num_slots: "1",
  })
  const { toast } = useToast()
  const [step, setStep] = useState<"details" | "slots">("details")
  type SlotItem = { id: string; start_datetime: string; end_datetime: string; seats: number }
  const [slots, setSlots] = useState<SlotItem[]>([])

  const generateSlots = (count: number) => {
    const start = new Date(formData.start_date || new Date().toISOString())
    const end = new Date(formData.end_date || new Date().toISOString())
    const totalMs = Math.max(1, end.getTime() - start.getTime())
    const perMs = Math.floor(totalMs / Math.max(1, count))
    const totalSeats = Math.max(1, Number(formData.total_seats || 1))
    const seatsPer = Math.floor(totalSeats / Math.max(1, count))
    const remainder = totalSeats % Math.max(1, count)

    const next: SlotItem[] = []
    for (let i = 0; i < count; i++) {
      const s = new Date(start.getTime() + i * perMs)
      const e = new Date(i === count - 1 ? end.getTime() : s.getTime() + perMs)
      const seats = seatsPer + (i < remainder ? 1 : 0)
      next.push({
        id: uuidv4(),
        start_datetime: new Date(s.getTime() - s.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
        end_datetime: new Date(e.getTime() - e.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
        seats,
      })
    }
    setSlots(next)
  }

  const adjustSlotsForTarget = (targetCount: number) => {
    const target = Math.max(1, targetCount)
    const current = [...slots]

    const datesChanged = formData.start_date !== baseline.start_date || formData.end_date !== baseline.end_date

    // If no slots yet, create empties with only the final end bound to event end
    if (current.length === 0) {
      const created: SlotItem[] = []
      for (let i = 0; i < target; i++) {
        created.push({ id: uuidv4(), start_datetime: "", end_datetime: "", seats: 0 })
      }
      // Set the first slot's start time to event start and last slot's end time to event end
      if (target > 0) {
        created[0].start_datetime = formData.start_date || ""
        created[target - 1].end_datetime = formData.end_date || ""
      }
      setSlots(created)
      return
    }

    if (datesChanged) {
      const resetSlots: SlotItem[] = []
      for (let i = 0; i < target; i++) {
        resetSlots.push({
          id: current[i]?.id || uuidv4(),
          start_datetime: i === 0 ? formData.start_date || "" : "",
          end_datetime: i === target - 1 ? formData.end_date || "" : "",
          seats: 0,
        })
      }
      setSlots(resetSlots)
      return
    }

    if (target === current.length) return

    if (target > current.length) {
      const toAdd = target - current.length
      for (let i = 0; i < toAdd; i++) {
        current.push({ id: uuidv4(), start_datetime: "", end_datetime: "", seats: 0 })
      }

      current[target - 1].end_datetime = formData.end_date || ""

      setSlots(current)
      return
    }

    // target < current.length -> trim extras, preserve existing slot times
    const trimmed = current.slice(0, target)

    trimmed[target - 1].end_datetime = formData.end_date || ""

    setSlots(trimmed)
  }

  const validateSlots = () => {
    const totalSeats = Math.max(1, Number(formData.total_seats || 0))
    const valid = slots.filter((s) => s.start_datetime && s.end_datetime && Number(s.seats) > 0)
    if (valid.length === 0) {
      throw new Error("Please configure at least one slot")
    }
    for (const s of valid) {
      const start = new Date(s.start_datetime)
      const end = new Date(s.end_datetime)
      if (start >= end) {
        throw new Error("Each slot's end time must be after its start time")
      }
    }
    const seatsSum = valid.reduce((sum, s) => sum + Number(s.seats || 0), 0)
    if (seatsSum !== totalSeats) {
      throw new Error(`Sum of slot seats (${seatsSum}) must equal total event seats (${totalSeats})`)
    }
    for (let i = 0; i < valid.length; i++) {
      for (let j = i + 1; j < valid.length; j++) {
        const a1 = new Date(valid[i].start_datetime)
        const a2 = new Date(valid[i].end_datetime)
        const b1 = new Date(valid[j].start_datetime)
        const b2 = new Date(valid[j].end_datetime)
        if (a1 < b2 && a2 > b1) {
          throw new Error(`Slot ${i + 1} and Slot ${j + 1} have overlapping times. Please adjust the timings.`)
        }
      }
    }
    return valid
  }

  const categories = ["sports", "hackathon", "cultural", "workshop", "seminar", "conference", "competition", "social"]

  // Prevent background scrolling without layout shift
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = "hidden"
      document.body.style.paddingRight = `${scrollbarWidth}px`
    } else {
      document.body.style.overflow = "unset"
      document.body.style.paddingRight = "0px"
    }

    return () => {
      document.body.style.overflow = "unset"
      document.body.style.paddingRight = "0px"
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && eventId) {
      fetchEvent()
    }
  }, [isOpen, eventId])

  const fetchEvent = async () => {
    if (!eventId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/event/${eventId}`, {
        headers: {
          Authorization: `Bearer mock-token`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch event details")
      }

      const data = await response.json()
      setEvent(data.event)

      // Convert dates to datetime-local format (handle timezone properly)
      const startDate = new Date(data.event.start_date)
      const endDate = new Date(data.event.end_date)

      // Format to YYYY-MM-DDTHH:MM for datetime-local input
      const startDateTime = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
      const endDateTime = new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

      setFormData({
        title: data.event.title,
        description: data.event.description || "",
        category: data.event.category,
        location: data.event.location,
        start_date: startDateTime,
        end_date: endDateTime,
        image_url: data.event.image_url || undefined,
        total_seats: data.event.total_seats ? data.event.total_seats.toString() : "",
        num_slots: "1",
      })
      setBaseline({
        total_seats: data.event.total_seats ? data.event.total_seats.toString() : "",
        start_date: startDateTime,
        end_date: endDateTime,
        num_slots: "1",
      })
      const incomingSlots: any[] = Array.isArray((data.event as any).slots) ? (data.event as any).slots : []
      const mapped = incomingSlots.map((s: any) => ({
        id: s.id || uuidv4(),
        start_datetime: new Date(new Date(s.start).getTime() - new Date(s.start).getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16),
        end_datetime: new Date(new Date(s.end).getTime() - new Date(s.end).getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16),
        seats: typeof s.seats === "number" ? s.seats : 0,
      }))
      setSlots(mapped)
      if (mapped.length > 0) {
        setFormData((prev) => ({ ...prev, num_slots: String(mapped.length) }))
        setBaseline((prev) => ({ ...prev, num_slots: String(mapped.length) }))
      }
    } catch (error) {
      console.error("Error fetching event:", error)
      toast({
        title: "Error",
        description: "Failed to load event details",
        variant: "destructive",
      })
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (e?: React.FormEvent) => {
    // If called from form submit, respect native validation
    if (e) {
      e.preventDefault()
    }
    if (formRef.current && !formRef.current.reportValidity()) {
      return // Let the browser show native "Please fill out this field"
    }
    if (!eventId) return

    // Validation
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Event title is required",
        variant: "destructive",
      })
      return
    }

    if (!formData.category) {
      toast({
        title: "Validation Error",
        description: "Event category is required",
        variant: "destructive",
      })
      return
    }

    // Check if total seats is less than current approved registrations
    if (formData.total_seats) {
      try {
        const response = await fetch(`/api/event/${eventId}/registrations`, {
          headers: {
            Authorization: `Bearer mock-token`,
          },
        })
        if (response.ok) {
          const data = await response.json()
          const approvedCount = data.registrations.filter((r: any) => r.status === "approved").length
          if (Number.parseInt(formData.total_seats) < approvedCount) {
            toast({
              title: "Validation Error",
              description: `Total seats cannot be less than current approved registrations (${approvedCount})`,
              variant: "destructive",
            })
            return
          }
        }
      } catch (error) {
        console.error("Error checking registrations:", error)
      }
    }

    if (!formData.location.trim()) {
      toast({
        title: "Validation Error",
        description: "Event location is required",
        variant: "destructive",
      })
      return
    }

    if (!formData.start_date || !formData.end_date) {
      toast({
        title: "Validation Error",
        description: "Start and end dates are required",
        variant: "destructive",
      })
      return
    }

    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      toast({
        title: "Validation Error",
        description: "End date must be after start date",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      // Get current event data first
      const currentEventResponse = await fetch(`/api/event/${eventId}`, {
        headers: {
          Authorization: `Bearer mock-token`,
        },
      })

      const currentEventData = await currentEventResponse.json()
      const currentEvent = currentEventData.event
      const oldTotalSeats = currentEvent.total_seats
      const newTotalSeats = formData.total_seats ? Number.parseInt(formData.total_seats) : null

      // Update event (including slots when in slots step)
      const response = await fetch(`/api/event/${eventId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer mock-token`,
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          location: formData.location.trim(),
          start_date: new Date(formData.start_date).toISOString(),
          end_date: new Date(formData.end_date).toISOString(),
          image_url: formData.image_url,
          total_seats: newTotalSeats,
          slots: slots
            .filter((s) => s.start_datetime && s.end_datetime && s.seats > 0)
            .map((s) => ({
              id: s.id || uuidv4(),
              start: new Date(s.start_datetime).toISOString(),
              end: new Date(s.end_datetime).toISOString(),
              seats: s.seats,
            })),
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || err.message || "Failed to update event")
      }

      toast({
        title: "Event updated",
        description: "Event has been successfully updated",
      })

      // Handle registration status based on seat changes
      if (newTotalSeats) {
        try {
          const registrationsResponse = await fetch(`/api/event/${eventId}/registrations`, {
            headers: {
              Authorization: `Bearer mock-token`,
            },
          })

          if (registrationsResponse.ok) {
            const registrationsData = await registrationsResponse.json()
            const approvedCount = registrationsData.registrations.filter((r: any) => r.status === "approved").length

            // If total seats were decreased to match approved count, close registrations
            if (newTotalSeats <= approvedCount && currentEvent.registrations_open) {
              const closeResponse = await fetch(`/api/event/${eventId}/registration-status`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer mock-token`,
                },
                body: JSON.stringify({ registrations_open: false }),
              })

              if (closeResponse.ok) {
                toast({
                  title: "Registrations Closed",
                  description: `Event is now at full capacity (${newTotalSeats} seats)`,
                })
              }
            }
            // If total seats were increased and registrations are closed, try to reopen them
            else if (newTotalSeats > approvedCount && !currentEvent.registrations_open) {
              const reopenResponse = await fetch(`/api/event/${eventId}/registration-status`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer mock-token`,
                },
                body: JSON.stringify({ registrations_open: true }),
              })

              if (reopenResponse.ok) {
                toast({
                  title: "Registrations Reopened",
                  description: `${newTotalSeats - approvedCount} new seats are now available`,
                })
              }
            }
          }
        } catch (error) {
          console.error("Error handling registration status:", error)
        }
      }

      onEventUpdated?.()
      // Keep dialog open after successful save
    } catch (error) {
      console.error("Error updating event:", error)
      toast({
        title: "Update failed",
        description: "Failed to update the event. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    // Apply character limits
    if (field === "title" && value.length > 40) {
      return // Don't update if exceeds limit
    }
    if (field === "description" && value.length > 100) {
      return // Don't update if exceeds limit
    }
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleDelete = async () => {
    if (!eventId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/event/${eventId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer mock-token`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to delete event")
      }

      toast({
        title: "Event deleted",
        description: "Event has been permanently deleted",
      })

      onEventDeleted?.()
      onClose()
    } catch (error) {
      console.error("Error deleting event:", error)
      toast({
        title: "Delete failed",
        description: "Failed to delete the event. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] duration-300"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          {step === "slots" ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep("details")}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <DialogTitle>Edit Slots</DialogTitle>
            </div>
          ) : (
            <>
              <DialogTitle>Edit Event</DialogTitle>
              <DialogDescription>Fields marked with * are required</DialogDescription>
            </>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : step === "details" ? (
          <form ref={formRef} onSubmit={handleSave} className="space-y-6 py-4" noValidate={false}>
            {/* Top Row - Title and Description with Image Upload */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Form Fields */}
              <div className="lg:col-span-2 space-y-4">
                {/* Event Title */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                      Event Title *
                    </Label>
                    <span className="text-xs text-gray-500">{formData.title.length}/40</span>
                  </div>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="Enter event title"
                    className="w-full"
                    required
                  />
                </div>

                {/* Event Description */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                      Description
                    </Label>
                    <span className="text-xs text-gray-500">{formData.description.length}/100</span>
                  </div>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Describe your event..."
                    rows={3}
                    className="w-full resize-none"
                    required
                  />
                </div>
              </div>

              {/* Right Column - Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="image" className="text-sm font-medium text-gray-700">
                  Event Image *
                </Label>
                <div className="relative">
                  {formData.image_url ? (
                    <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-3 h-40 bg-gray-50">
                      <img
                        src={formData.image_url || "/placeholder.svg"}
                        alt="Event preview"
                        className="w-full h-full object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => handleInputChange("image_url", "")}
                        className="absolute -top-2 -right-2 bg-white border rounded-full w-6 h-6 flex items-center justify-center shadow hover:bg-gray-50 text-gray-500 hover:text-gray-700"
                        aria-label="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 h-40 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                      <input
                        id="image"
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            handleInputChange("image_url", reader.result as string)
                          }
                          reader.readAsDataURL(file)
                        }}
                      />
                      <ImageIcon className="h-8 w-8 text-gray-400 mb-1" />
                      <p className="text-gray-600 text-center text-sm">
                        <span className="font-medium">Drop or Click here</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Category, Location Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                  Category *
                </Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select event type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Invisible input to trigger native required UI near the field */}
                <input
                  name="category"
                  autoComplete="off"
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    opacity: 0,
                    pointerEvents: "none",
                  }}
                  value={formData.category}
                  onChange={() => {}}
                  required
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location" className="text-sm font-medium text-gray-700">
                  Location *
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  placeholder="Select event Location..."
                  className="w-full"
                  required
                />
              </div>
            </div>

            {/* Total Seats, Total Slots Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Total Seats */}
              <div className="space-y-2">
                <Label htmlFor="total_seats" className="text-sm font-medium text-gray-700">
                  Total Seats *
                </Label>
                <Input
                  id="total_seats"
                  type="number"
                  min={1}
                  value={formData.total_seats}
                  onChange={(e) => handleInputChange("total_seats", e.target.value)}
                  placeholder="e.g., 800"
                  className="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  required
                />
              </div>

              {/* Total Slots */}
              <div className="space-y-2">
                <Label htmlFor="num_slots" className="text-sm font-medium text-gray-700">
                  Total Slots *
                </Label>
                <Input
                  id="num_slots"
                  type="number"
                  min={1}
                  value={formData.num_slots}
                  onChange={(e) => handleInputChange("num_slots", e.target.value)}
                  placeholder="e.g., 1"
                  className="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  required
                />
              </div>
            </div>

            {/* Start date, End date Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date" className="text-sm font-medium text-gray-700">
                  Start date *
                </Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange("start_date", e.target.value)}
                  className="w-full cursor-pointer"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date" className="text-sm font-medium text-gray-700">
                  End date *
                </Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange("end_date", e.target.value)}
                  className="w-full cursor-pointer"
                  required
                />
              </div>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex justify-end items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSlots((prev) => [...prev, { id: uuidv4(), start_datetime: "", end_datetime: "", seats: 0 }])
                }
              >
                Add slot
              </Button>
            </div>
            {/* No inline slots count editor in slots step */}
            <div className="max-h-[420px] overflow-y-auto pr-2">
              {slots.map((slot, idx) => (
                <div key={slot.id} className="border rounded-lg p-4 mb-3 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-lg font-semibold">{`Slot-${idx + 1}`}</div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSlots((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-6 items-end">
                    <div className="space-y-1">
                      <Label className="text-sm">Start date/time *</Label>
                      <div className="relative">
                        <Clock className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                        <Input
                          type="datetime-local"
                          value={slot.start_datetime}
                          onChange={(e) =>
                            setSlots((prev) =>
                              prev.map((s, i) => (i === idx ? { ...s, start_datetime: e.target.value } : s)),
                            )
                          }
                          className="pl-9 w-full"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">End date/time *</Label>
                      <div className="relative">
                        <Clock className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                        <Input
                          type="datetime-local"
                          value={slot.end_datetime}
                          onChange={(e) =>
                            setSlots((prev) =>
                              prev.map((s, i) => (i === idx ? { ...s, end_datetime: e.target.value } : s)),
                            )
                          }
                          className="pl-9 w-full"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1 w-28">
                      <Label className="text-sm">Seats *</Label>
                      <Input
                        type="number"
                        min={1}
                        value={slot.seats || ""}
                        onChange={(e) =>
                          setSlots((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, seats: Math.max(1, Number(e.target.value || 0)) } : s,
                            ),
                          )
                        }
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="relative flex justify-end items-end">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isLoading || isSaving || isDeleting}
            className="absolute left-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (step === "details") {
                  const target = Math.max(1, Number(formData.num_slots || 1))
                  // Only move to slots if something changed; otherwise save
                  const needsSlots =
                    formData.total_seats !== baseline.total_seats ||
                    formData.start_date !== baseline.start_date ||
                    formData.end_date !== baseline.end_date ||
                    formData.num_slots !== baseline.num_slots
                  if (!needsSlots) {
                    if (formRef.current) formRef.current.requestSubmit()
                    return
                  }
                  // Resize without altering existing timings
                  adjustSlotsForTarget(target)
                  setStep("slots")
                  return
                }
                try {
                  validateSlots()
                } catch (e: any) {
                  toast({ title: "Validation Error", description: e?.message || String(e), variant: "destructive" })
                  return
                }
                // When on the slots step, the form is not rendered, so submitting won't work.
                // Call handleSave directly to persist the changes.
                handleSave()
              }}
              disabled={isLoading || isSaving || isDeleting}
            >
              {step === "details"
                ? formData.total_seats !== baseline.total_seats ||
                  formData.start_date !== baseline.start_date ||
                  formData.end_date !== baseline.end_date ||
                  formData.num_slots !== baseline.num_slots
                  ? "Next"
                  : isSaving
                    ? "Saving..."
                    : "Save"
                : isSaving
                  ? "Saving..."
                  : "Save changes"}
            </Button>
          </div>
        </DialogFooter>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-in fade-in duration-300"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <div
              className="bg-white rounded-lg p-6 max-w-md mx-4 animate-in zoom-in-95 fade-in duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">Delete Event</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this event? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
