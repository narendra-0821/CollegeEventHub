import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  MapPin,
  Clock,
  FileText,
  Tag,
  ArrowLeft,
  CheckCircle,
  Upload,
  Image,
  Plus,
  Trash2,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface SlotItem {
  id: string;
  start_datetime: string;
  end_datetime: string;
  seats: number;
}

interface EventFormData {
  title: string;
  description: string;
  category: string;
  location: string;
  start_datetime: string;
  end_datetime: string;
  image_url?: string;
  total_seats?: number;
  num_slots?: number;
}

export function CreateEventPage() {
  const { user } = useUser();
  const token = "mock-token";
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<"basic" | "slots">("basic");
  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    description: "",
    category: "",
    location: "",
    start_datetime: "",
    end_datetime: "",
    image_url: undefined,
    total_seats: undefined,
    num_slots: undefined,
  });
  const [slots, setSlots] = useState<SlotItem[]>([]);

  const categories = [
    "sports",
    "hackathon",
    "cultural",
    "workshop",
    "seminar",
    "conference",
    "competition",
    "social",
  ];

  // Initialize slots when num_slots changes
  React.useEffect(() => {
    if (formData.num_slots && formData.num_slots > 1) {
      setSlots(prevSlots => {
        const newSlots: SlotItem[] = [];
        
        for (let i = 0; i < formData.num_slots!; i++) {
          const existingSlot = prevSlots[i];
          const isFirstSlot = i === 0;
          const isLastSlot = i === formData.num_slots! - 1;
          
          if (existingSlot) {
            // Keep existing slot data, but always update first slot start time and last slot end time from event times
            newSlots.push({
              ...existingSlot,
              start_datetime: isFirstSlot ? formData.start_datetime : existingSlot.start_datetime,
              end_datetime: isLastSlot ? formData.end_datetime : existingSlot.end_datetime,
            });
          } else {
            // Create new slot
            newSlots.push({
              id: uuidv4(),
              start_datetime: isFirstSlot ? formData.start_datetime : "",
              end_datetime: isLastSlot ? formData.end_datetime : "",
              seats: 0,
            });
          }
        }
        
        return newSlots;
      });
    } else {
      setSlots([]);
    }
  }, [formData.num_slots, formData.start_datetime, formData.end_datetime]);

  // Timeline calculation
  const timelineData = useMemo(() => {
    const validSlots = slots.filter(
      (slot) =>
        slot.start_datetime &&
        slot.end_datetime &&
        slot.seats > 0
    );

    if (validSlots.length === 0) return { slots: [], totalDuration: 0 };

    const slotTimes = validSlots.map((slot) => {
      const start = new Date(slot.start_datetime);
      const end = new Date(slot.end_datetime);
      return { ...slot, startTime: start, endTime: end };
    });

    // Find overall timeline bounds
    const allTimes = slotTimes.flatMap((s) => [s.startTime, s.endTime]);
    const minTime = new Date(Math.min(...allTimes.map((t) => t.getTime())));
    const maxTime = new Date(Math.max(...allTimes.map((t) => t.getTime())));
    const totalDuration = maxTime.getTime() - minTime.getTime();

    // Calculate positions for timeline bars
    const timelineSlots = slotTimes.map((slot, index) => {
      const startOffset = slot.startTime.getTime() - minTime.getTime();
      const duration = slot.endTime.getTime() - slot.startTime.getTime();
      const leftPercent = (startOffset / totalDuration) * 100;
      const widthPercent = (duration / totalDuration) * 100;

      return {
        ...slot,
        leftPercent,
        widthPercent,
        index,
      };
    });

    return { slots: timelineSlots, totalDuration };
  }, [slots]);

  const validateSlotDateTime = (slotId: string, field: keyof SlotItem, value: string) => {
    if (!formData.start_datetime || !formData.end_datetime) {
      return true; // Skip validation if event dates not set
    }

    const eventStart = new Date(formData.start_datetime);
    const eventEnd = new Date(formData.end_datetime);
    const slotDateTime = new Date(value);

    if (field === 'start_datetime') {
      if (slotDateTime < eventStart) {
        toast({
          title: "Invalid Start Time",
          description: "Slot start time cannot be before event start time",
          variant: "destructive",
        });
        return false;
      }
      if (slotDateTime > eventEnd) {
        toast({
          title: "Invalid Start Time", 
          description: "Slot start time cannot be after event end time",
          variant: "destructive",
        });
        return false;
      }
    }

    if (field === 'end_datetime') {
      if (slotDateTime < eventStart) {
        toast({
          title: "Invalid End Time",
          description: "Slot end time cannot be before event start time",
          variant: "destructive",
        });
        return false;
      }
      if (slotDateTime > eventEnd) {
        toast({
          title: "Invalid End Time",
          description: "Slot end time cannot be after event end time", 
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleSlotChange = (
    slotId: string,
    field: keyof SlotItem,
    value: string | number
  ) => {
    // Validate datetime fields
    if ((field === 'start_datetime' || field === 'end_datetime') && typeof value === 'string') {
      if (!validateSlotDateTime(slotId, field, value)) {
        return; // Don't update if validation fails
      }
    }

    setSlots((prev) =>
      prev.map((slot) =>
        slot.id === slotId ? { ...slot, [field]: value } : slot
      )
    );
  };

  const addSlot = () => {
    const newSlot: SlotItem = {
      id: uuidv4(),
      start_datetime: "",
      end_datetime: "",
      seats: 0,
    };
    setSlots((prev) => [...prev, newSlot]);
    setFormData((prev) => ({ ...prev, num_slots: (prev.num_slots || 0) + 1 }));
  };

  const removeSlot = (slotId: string) => {
    setSlots((prev) => prev.filter((slot) => slot.id !== slotId));
    setFormData((prev) => ({ 
      ...prev, 
      num_slots: (prev.num_slots || 1) > 1 ? (prev.num_slots || 1) - 1 : 1 
    }));
  };

  const handleInputChange = (field: keyof EventFormData, value: string | number) => {
    // Apply character limits
    if (field === "title" && typeof value === "string" && value.length > 40) {
      return; // Don't update if exceeds limit
    }
    if (field === "description" && typeof value === "string" && value.length > 100) {
      return; // Don't update if exceeds limit
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // If we're on basic step and have multiple slots, validate before going to slots step
      if (currentStep === "basic" && formData.num_slots && formData.num_slots > 1) {
        // Validate that total_seats is provided and sufficient for slots
        if (!formData.total_seats) {
          throw new Error("Total seats is required when creating multiple slots");
        }
        
        // Check if total seats can accommodate the number of slots (minimum 1 seat per slot)
        if (formData.total_seats < formData.num_slots) {
          throw new Error(`Total seats (${formData.total_seats}) must be at least equal to number of slots (${formData.num_slots})`);
        }
        
        setCurrentStep("slots");
        setIsLoading(false);
        return;
      }

      // Validate slots if we're on slots step
      if (currentStep === "slots") {
        const validSlots = slots.filter(
          (slot) =>
            slot.start_datetime &&
            slot.end_datetime &&
            slot.seats > 0
        );

        if (validSlots.length === 0) {
          throw new Error("Please configure at least one slot");
        }

        // Validate each slot's time
        for (const slot of validSlots) {
          const startDateTime = new Date(slot.start_datetime);
          const endDateTime = new Date(slot.end_datetime);
          
          if (startDateTime >= endDateTime) {
            throw new Error("Each slot's end time must be after its start time");
          }
        }

        // Validate total seats vs slot seats - must be exactly equal
        if (!formData.total_seats) {
          throw new Error("Total seats is required when creating slots");
        }
        
        const totalSlotSeats = validSlots.reduce((sum, slot) => sum + slot.seats, 0);
        if (totalSlotSeats !== formData.total_seats) {
          throw new Error(`Sum of slot seats (${totalSlotSeats}) must equal total event seats (${formData.total_seats})`);
        }

        // Check for slot time clashes
        for (let i = 0; i < validSlots.length; i++) {
          for (let j = i + 1; j < validSlots.length; j++) {
            const slot1 = validSlots[i];
            const slot2 = validSlots[j];
            const start1 = new Date(slot1.start_datetime);
            const end1 = new Date(slot1.end_datetime);
            const start2 = new Date(slot2.start_datetime);
            const end2 = new Date(slot2.end_datetime);
            
            // Check if slots overlap
            if ((start1 < end2 && end1 > start2)) {
              throw new Error(`Slot ${i + 1} and Slot ${j + 1} have overlapping times. Please adjust the timings.`);
            }
          }
        }
      }

      // Validate main event datetime
      const startDateTime = new Date(formData.start_datetime);
      const endDateTime = new Date(formData.end_datetime);

      if (startDateTime >= endDateTime) {
        throw new Error("End date and time must be after start date and time");
      }

      const eventData = {
        college_id: user?.id || "",
        title: formData.title,
        description: formData.description || undefined,
        category: formData.category,
        location: formData.location,
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        image_url: formData.image_url,
        total_seats:
          typeof formData.total_seats === "number"
            ? formData.total_seats
            : undefined,
        // Add slots data if we have multiple slots
        ...(currentStep === "slots" && {
          slots: slots
            .filter(
              (slot) =>
                slot.start_datetime &&
                slot.end_datetime &&
                slot.seats > 0
            )
            .map((slot) => ({
              id: slot.id,
              start: new Date(slot.start_datetime).toISOString(),
              end: new Date(slot.end_datetime).toISOString(),
              seats: slot.seats,
            })),
        }),
      };

      const response = await fetch("/api/event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create event");
      }

      const createdEvent = await response.json();

      setCreatedEventId(createdEvent.event_id || createdEvent.id);
      setIsSuccess(true);

      toast({
        title: "Event created!",
        description: `Event ${createdEvent.event_id} has been successfully created.`,
      });

      // User can manually navigate using buttons
    } catch (error) {
      console.error("Error creating event:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create event",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get current datetime for min datetime validation
  const now = new Date().toISOString().slice(0, 16);

  const handleGoBack = () => {
    if (currentStep === "slots") {
      setCurrentStep("basic");
    } else {
      navigate(-1); // Go back to previous page
    }
  };

  if (isSuccess) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-6 min-h-[calc(100vh-8rem)] flex items-center justify-center">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <CheckCircle className="h-24 w-24 text-green-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Event Created Successfully!
              </h1>
              <p className="text-gray-600 mt-2">
                Event ID:{" "}
                <span className="font-semibold text-blue-600">
                  {createdEventId}
                </span>
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => navigate("/admin")}>
                Go to Dashboard
              </Button>
              <Button
                onClick={() => {
                  setIsSuccess(false);
                  setCurrentStep("basic");
                  setSlots([]);
                  setFormData({
                    title: "",
                    description: "",
                    category: "",
                    location: "",
                    start_datetime: "",
                    end_datetime: "",
                    image_url: undefined,
                    total_seats: undefined,
                    num_slots: 1,
                  });
                }}
              >
                Create Another Event
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader className="border-b">
            <div className="relative">
              <div className="absolute left-0 top-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGoBack}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </div>
              <div className="text-center">
                <CardTitle className="text-3xl font-bold text-gray-900">
                  {currentStep === "basic" ? "Create New Event" : "Configure Event Slots"}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {currentStep === "basic" && (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Form Fields */}
                    <div className="lg:col-span-2 space-y-4">
                      {/* Event Title */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <Label
                            htmlFor="title"
                            className="text-sm font-medium text-gray-700"
                          >
                            Event Title *
                          </Label>
                          <span className="text-xs text-gray-500">
                            {formData.title.length}/40
                          </span>
                        </div>
                        <Input
                          id="title"
                          placeholder="Enter event title"
                          value={formData.title}
                          onChange={(e) =>
                            handleInputChange("title", e.target.value)
                          }
                          className="w-full"
                          required
                        />
                      </div>

                      {/* Description */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <Label
                            htmlFor="description"
                            className="text-sm font-medium text-gray-700"
                          >
                            Description *
                          </Label>
                          <span className="text-xs text-gray-500">
                            {formData.description.length}/100
                          </span>
                        </div>
                        <Textarea
                          id="description"
                          placeholder="Describe your event..."
                          value={formData.description}
                          onChange={(e) =>
                            handleInputChange("description", e.target.value)
                          }
                          rows={3}
                          className="w-full resize-none"
                          required
                        />
                      </div>
                    </div>

                    {/* Right Column - Image Upload */}
                    <div className="space-y-1">
                      <Label
                        htmlFor="image"
                        className="text-sm font-medium text-gray-700"
                      >
                        Event Image *
                      </Label>
                      <div className="relative">
                        {formData.image_url ? (
                          <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-3 h-32 bg-gray-50">
                            <img
                              src={formData.image_url}
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
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 h-32 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                            <input
                              id="image"
                              type="file"
                              accept="image/png, image/jpeg, image/jpg"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  handleInputChange(
                                    "image_url",
                                    reader.result as string
                                  );
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                            <Image className="h-8 w-8 text-gray-400 mb-1" />
                            <p className="text-gray-600 text-center text-sm">
                              <span className="font-medium">
                                Drop or Click here
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Category, Location, Total Seats, Slots Row - Full Width */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Category */}
                    <div className="space-y-1">
                      <Label
                        htmlFor="category"
                        className="text-sm font-medium text-gray-700"
                      >
                        Category *
                      </Label>
                      <div className="relative">
                        <Select
                          value={formData.category}
                          onValueChange={(value) =>
                            handleInputChange("category", value)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select event category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category.charAt(0).toUpperCase() +
                                  category.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {/* Invisible overlay input to trigger native required validation near the field */}
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
                    </div>

                    {/* Location */}
                    <div className="space-y-1">
                      <Label
                        htmlFor="location"
                        className="text-sm font-medium text-gray-700"
                      >
                        Location *
                      </Label>
                      <Input
                        id="location"
                        placeholder="Enter event location"
                        value={formData.location}
                        onChange={(e) =>
                          handleInputChange("location", e.target.value)
                        }
                        className="w-full"
                        required
                      />
                    </div>

                    {/* Total Seats */}
                    <div className="space-y-1">
                      <Label
                        htmlFor="total_seats"
                        className="text-sm font-medium text-gray-700"
                      >
                        Total Seats *
                      </Label>
                      <Input
                        id="total_seats"
                        type="number"
                        min={1}
                        placeholder="e.g., 800"
                        value={formData.total_seats ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          const numValue = value ? Number(value) : undefined;
                          // Ensure minimum value of 1
                          if (numValue && numValue < 1) return;
                          handleInputChange("total_seats", numValue || 0);
                        }}
                        className="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        required
                      />
                    </div>
                    {/* Number of Slots */}
                    <div className="space-y-1">
                      <Label
                        htmlFor="num_slots"
                        className="text-sm font-medium text-gray-700"
                      >
                        No. of slots *
                      </Label>
                      <Input
                        id="num_slots"
                        type="number"
                        min={1}
                        placeholder="e.g., 1, 2, 3..."
                        value={formData.num_slots ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          const numValue = value ? Number(value) : undefined;
                          // Ensure minimum value of 1
                          if (numValue && numValue < 1) return;
                          handleInputChange("num_slots", numValue || 1);
                        }}
                        className="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Date and Time Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Start Date and Time */}
                    <div className="space-y-1">
                      <Label
                        htmlFor="start_datetime"
                        className="text-sm font-medium text-gray-700"
                      >
                        Start Date & Time *
                      </Label>
                      <Input
                        id="start_datetime"
                        type="datetime-local"
                        value={formData.start_datetime}
                        onChange={(e) =>
                          handleInputChange("start_datetime", e.target.value)
                        }
                        className="w-full cursor-pointer"
                        min={now}
                        required
                      />
                    </div>

                    {/* End Date and Time */}
                    <div className="space-y-1">
                      <Label
                        htmlFor="end_datetime"
                        className="text-sm font-medium text-gray-700"
                      >
                        End Date & Time *
                      </Label>
                      <Input
                        id="end_datetime"
                        type="datetime-local"
                        value={formData.end_datetime}
                        onChange={(e) =>
                          handleInputChange("end_datetime", e.target.value)
                        }
                        className="w-full cursor-pointer"
                        min={formData.start_datetime || now}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {currentStep === "slots" && (
                <>
                  {/* Timeline Visualization */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Event Slots Timeline
                      </h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addSlot}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add slot
                      </Button>
                    </div>

                    {/* Timeline Container */}
                    <div className="bg-gray-50 rounded-lg p-4 min-h-[100px] border">
                      {timelineData.slots.length > 0 ? (
                        <div className="space-y-2">
                          {/* Timeline Labels - Show only time */}
                          <div className="flex justify-between text-xs text-gray-600 mb-2">
                            <span>
                              Start: {new Date(Math.min(...timelineData.slots.map(s => s.startTime.getTime()))).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span>
                              End: {new Date(Math.max(...timelineData.slots.map(s => s.endTime.getTime()))).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          
                          {/* Timeline Bar */}
                          <div className="relative h-8 bg-gray-200 rounded-md">
                            {timelineData.slots.map((slot, index) => (
                              <div
                                key={slot.id}
                                className="absolute h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-md flex items-center justify-center text-white text-xs font-medium shadow-sm border border-purple-700"
                                style={{
                                  left: `${slot.leftPercent}%`,
                                  width: `${slot.widthPercent}%`,
                                }}
                                title={`Slot ${index + 1}: ${slot.seats} seats\nStart: ${new Date(slot.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\nEnd: ${new Date(slot.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                              >
                                {slot.seats}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-12 text-gray-500">
                          Configure slots below to see timeline visualization
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Slots Configuration */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Configure Slots
                    </h3>
                    
                    {slots.map((slot, index) => (
                      <Card key={slot.id} className="p-4">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-medium text-gray-900">
                            Slot {index + 1}
                          </h4>
                          {slots.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSlot(slot.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Start Date and Time */}
                          <div className="space-y-1">
                            <Label className="text-sm font-medium text-gray-700">
                              Start Date & Time *
                            </Label>
                            <Input
                              type="datetime-local"
                              value={slot.start_datetime}
                              onChange={(e) =>
                                handleSlotChange(slot.id, "start_datetime", e.target.value)
                              }
                              className={`w-full ${index === 0 ? 'bg-blue-50 cursor-not-allowed' : ''}`}
                              min={formData.start_datetime || now}
                              max={formData.end_datetime || undefined}
                              readOnly={index === 0}
                              required
                            />
                          </div>

                          {/* End Date and Time */}
                          <div className="space-y-1">
                            <Label className="text-sm font-medium text-gray-700">
                              End Date & Time *
                            </Label>
                            <Input
                              type="datetime-local"
                              value={slot.end_datetime}
                              onChange={(e) =>
                                handleSlotChange(slot.id, "end_datetime", e.target.value)
                              }
                              className={`w-full ${index === slots.length - 1 ? 'bg-blue-50 cursor-not-allowed' : ''}`}
                              min={slot.start_datetime || formData.start_datetime || now}
                              max={formData.end_datetime || undefined}
                              readOnly={index === slots.length - 1}
                              required
                            />
                          </div>

                          {/* Seats */}
                          <div className="space-y-1">
                            <Label className="text-sm font-medium text-gray-700">
                              Seats *
                            </Label>
                            <Input
                              type="number"
                              min={1}
                              value={slot.seats || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                const numValue = value ? Number(value) : 0;
                                // Ensure minimum value of 1
                                if (numValue && numValue < 1) return;
                                handleSlotChange(slot.id, "seats", numValue);
                              }}
                              className="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              placeholder="0"
                              required
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}

              {/* Submit Buttons */}
              <div className="flex justify-end gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoBack}
                  className="px-6"
                >
                  {currentStep === "slots" ? "Back" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 bg-black text-white hover:bg-gray-800"
                >
                  {isLoading
                    ? "Processing..."
                    : currentStep === "basic" && formData.num_slots && formData.num_slots > 1
                    ? "Next"
                    : "Create Event"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
