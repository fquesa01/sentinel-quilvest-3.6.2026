import { useState, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfDay, endOfDay, isToday, parseISO, setHours, setMinutes, differenceInMinutes } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, Gavel, Users, FileText, AlertCircle, DollarSign, MapPin, Trash2, Edit2, X, Video, MonitorPlay, Brain, Upload, Camera, Image as ImageIcon, Loader2, Sparkles, Shield, Briefcase, MessageSquare, AlertTriangle, Building2, History } from "lucide-react";
import { SiGooglemeet, SiZoom } from "react-icons/si";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CalendarEvent, Case, Client, UserCalendar, ConnectedCalendarAccount } from "@shared/schema";
import { SiGoogle } from "react-icons/si";
import { Link2, Unlink, RefreshCw, Settings2, Mail, Phone, UserPlus, Send, ExternalLink } from "lucide-react";

type ViewType = "day" | "week" | "month" | "list";

interface CalendarWithEvents extends UserCalendar {
  eventCount?: number;
}


type MobileViewType = "month" | "day";

export default function CalendarPage() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>("month");
  const [mobileView, setMobileView] = useState<MobileViewType>("month");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    startTime: "",
    endTime: "",
    location: "",
    description: "",
    videoConferenceType: "none" as string,
    invitees: [] as { name: string; email: string; phone: string; notifyVia: "email" | "sms" | "both" }[],
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [visibleCalendarIds, setVisibleCalendarIds] = useState<Set<string>>(new Set());
  const [isCreateCalendarOpen, setIsCreateCalendarOpen] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState("");
  const [newCalendarColor, setNewCalendarColor] = useState("#3b82f6");
  const mobileTouchStart = useRef<{ x: number; y: number } | null>(null);
  const mobileDayScrollRef = useRef<HTMLDivElement>(null);
  const [intelTab, setIntelTab] = useState<"people" | "past" | "news" | "docs">("people");
  
  const [newEvent, setNewEvent] = useState({
    title: "",
    eventType: "none" as string,
    startTime: "",
    duration: "30" as string,
    description: "",
    location: "",
    courtName: "",
    judgeName: "",
    caseId: "none",
    clientId: "none",
    calendarId: "none",
    videoConferenceType: "none",
    enableAmbientIntelligence: false,
    isBillable: false,
    estimatedHours: 0,
    isAllDay: false,
    reminderMinutes: 30,
    invitees: [] as { name: string; email: string; phone: string; notifyVia: "email" | "sms" | "both" }[],
  });

  // Image-based event creation
  const [eventImage, setEventImage] = useState<string | null>(null);
  const [isExtractingFromImage, setIsExtractingFromImage] = useState(false);

  const extractEventFromImageMutation = useMutation({
    mutationFn: async (imageData: string) => {
      const response = await apiRequest("POST", "/api/calendar/extract-from-image", { image: imageData });
      return await response.json() as {
        title?: string;
        eventType?: string;
        startTime?: string;
        duration?: string;
        description?: string;
        location?: string;
        courtName?: string;
        judgeName?: string;
      };
    },
    onSuccess: (data) => {
      // Auto-populate form fields with extracted data
      setNewEvent(prev => ({
        ...prev,
        title: data.title || prev.title,
        eventType: data.eventType || prev.eventType,
        startTime: data.startTime || prev.startTime,
        duration: data.duration || prev.duration,
        description: data.description || prev.description,
        location: data.location || prev.location,
        courtName: data.courtName || prev.courtName,
        judgeName: data.judgeName || prev.judgeName,
      }));
      toast({ title: "Event details extracted", description: "Review and adjust the extracted information as needed" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to extract event details", description: error.message, variant: "destructive" });
    },
  });

  const handleImageUpload = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file type", description: "Please upload an image file", variant: "destructive" });
      return;
    }
    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast({ title: "File too large", description: "Please upload an image smaller than 10MB", variant: "destructive" });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setEventImage(base64);
      setIsExtractingFromImage(true);
      try {
        await extractEventFromImageMutation.mutateAsync(base64);
      } finally {
        setIsExtractingFromImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await handleImageUpload(file);
        }
        break;
      }
    }
  };

  const handleCameraCapture = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await handleImageUpload(file);
      }
    };
    input.click();
  };

  const handleFileSelect = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await handleImageUpload(file);
      }
    };
    input.click();
  };

  const clearEventImage = () => {
    setEventImage(null);
  };

  const { startDate, endDate } = useMemo(() => {
    if (isMobile) {
      const start = startOfWeek(startOfMonth(currentDate));
      const end = endOfWeek(endOfMonth(currentDate));
      return { startDate: start, endDate: end };
    }
    if (view === "month") {
      const start = startOfWeek(startOfMonth(currentDate));
      const end = endOfWeek(endOfMonth(currentDate));
      return { startDate: start, endDate: end };
    } else if (view === "week") {
      return { startDate: startOfWeek(currentDate), endDate: endOfWeek(currentDate) };
    } else {
      return { startDate: startOfDay(currentDate), endDate: endOfDay(currentDate) };
    }
  }, [currentDate, view, isMobile]);

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const response = await fetch(`/api/calendar/events?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
    staleTime: 0,
  });

  const { data: cases = [] } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: userCalendars = [] } = useQuery<UserCalendar[]>({
    queryKey: ["/api/user-calendars"],
  });

  const { data: connectedAccounts = [] } = useQuery<ConnectedCalendarAccount[]>({
    queryKey: ["/api/calendar/connected-accounts"],
  });

  const { data: attendeeComms, isLoading: isLoadingComms } = useQuery<Record<string, { emails: any[]; totalCount: number }>>({
    queryKey: ["/api/calendar/events", selectedEvent?.id, "attendee-communications"],
    queryFn: async () => {
      if (!selectedEvent?.id) return {};
      const response = await fetch(`/api/calendar/events/${selectedEvent.id}/attendee-communications`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch communications");
      return response.json();
    },
    enabled: !!selectedEvent?.id && intelTab === "docs" && !!(selectedEvent?.externalAttendees?.length),
    staleTime: 60000,
  });

  const { data: integrationStatus } = useQuery<{
    google: { configured: boolean };
    microsoft: { configured: boolean };
  }>({
    queryKey: ["/api/calendar/integration-status"],
  });

  const [isConnectAccountsOpen, setIsConnectAccountsOpen] = useState(false);

  // Initialize visible calendars when userCalendars load
  useMemo(() => {
    if (userCalendars.length > 0 && visibleCalendarIds.size === 0) {
      const visibleIds = userCalendars.filter(c => c.isVisible).map(c => c.id);
      setVisibleCalendarIds(new Set(visibleIds));
    }
  }, [userCalendars]);

  // Filter events by visible calendars
  const filteredEvents = useMemo(() => {
    if (visibleCalendarIds.size === 0 && userCalendars.length === 0) return events;
    if (visibleCalendarIds.size === 0) return [];
    return events.filter(event => {
      if (!event.calendarId) return true; // Show events without calendar assignment
      return visibleCalendarIds.has(event.calendarId);
    });
  }, [events, visibleCalendarIds, userCalendars]);

  const createCalendarMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      const response = await apiRequest("POST", "/api/user-calendars", data);
      return await response.json() as UserCalendar;
    },
    onSuccess: (newCal) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-calendars"] });
      toast({ title: "Calendar created" });
      setIsCreateCalendarOpen(false);
      setNewCalendarName("");
      setNewCalendarColor("#3b82f6");
      // Add new calendar to visible set
      setVisibleCalendarIds(prev => new Set([...Array.from(prev), newCal.id]));
    },
    onError: (error: any) => {
      toast({ title: "Failed to create calendar", description: error.message, variant: "destructive" });
    },
  });

  const toggleCalendarVisibility = (calendarId: string) => {
    setVisibleCalendarIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(calendarId)) {
        newSet.delete(calendarId);
      } else {
        newSet.add(calendarId);
      }
      return newSet;
    });
  };

  const connectGoogleMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/calendar/oauth/google/connect");
      if (!response.ok) throw new Error("Failed to get auth URL");
      const data = await response.json();
      return data.authUrl;
    },
    onSuccess: (authUrl: string) => {
      window.location.href = authUrl;
    },
    onError: (error: any) => {
      toast({ title: "Failed to connect Google Calendar", description: error.message, variant: "destructive" });
    },
  });

  const connectMicrosoftMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/calendar/oauth/microsoft/connect");
      if (!response.ok) throw new Error("Failed to get auth URL");
      const data = await response.json();
      return data.authUrl;
    },
    onSuccess: (authUrl: string) => {
      window.location.href = authUrl;
    },
    onError: (error: any) => {
      toast({ title: "Failed to connect Outlook Calendar", description: error.message, variant: "destructive" });
    },
  });

  const disconnectAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      return await apiRequest("DELETE", `/api/calendar/connected-accounts/${accountId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/connected-accounts"] });
      toast({ title: "Calendar disconnected" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to disconnect calendar", description: error.message, variant: "destructive" });
    },
  });

  const syncCalendarMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/calendar/sync");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/connected-accounts"] });
      toast({ title: "Calendar synced successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to sync calendar", description: error.message, variant: "destructive" });
    },
  });

  const seedDemoMeetingsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/seed-demo-meetings");
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"], refetchType: "all" });
      toast({ title: "Demo meetings created", description: data.message });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create demo meetings", description: error.message, variant: "destructive" });
    },
  });

  const sendInvitationsMutation = useMutation({
    mutationFn: async ({ eventId, invitees }: { eventId: string; invitees: typeof newEvent.invitees }) => {
      const response = await apiRequest("POST", `/api/calendar/events/${eventId}/send-invitations`, { invitees });
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "Invitations sent", 
        description: data.note || `${data.results?.length || 0} invitations queued`
      });
    },
    onError: (error: any) => {
      toast({ title: "Failed to send invitations", description: error.message, variant: "destructive" });
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const response = await apiRequest("POST", "/api/calendar/events", eventData);
      return await response.json() as CalendarEvent;
    },
    onSuccess: (createdEvent, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"], refetchType: "all" });
      toast({ title: "Event created successfully" });
      
      // Send invitations if there are invitees with valid contact info (use variables to avoid race condition)
      const submittedInvitees = variables.invitees || [];
      const validInvitees = submittedInvitees.filter((i: any) => i.email || i.phone);
      if (validInvitees.length > 0) {
        sendInvitationsMutation.mutate({ eventId: createdEvent.id, invitees: validInvitees });
      }
      
      setIsCreateDialogOpen(false);
      resetNewEvent();
    },
    onError: (error: any) => {
      toast({ title: "Failed to create event", description: error.message, variant: "destructive" });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/calendar/events/${id}`, updates);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"], refetchType: "all" });
      toast({ title: "Event updated successfully" });
      setIsEventDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to update event", description: error.message, variant: "destructive" });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/calendar/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"], refetchType: "all" });
      toast({ title: "Event deleted successfully" });
      setIsEventDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete event", description: error.message, variant: "destructive" });
    },
  });

  const enterEditMode = (event: CalendarEvent) => {
    setEditForm({
      title: event.title,
      startTime: format(new Date(event.startTime), "yyyy-MM-dd'T'HH:mm"),
      endTime: format(new Date(event.endTime), "yyyy-MM-dd'T'HH:mm"),
      location: event.location || "",
      description: event.description || "",
      videoConferenceType: event.videoConferenceType || "none",
      invitees: (event.externalAttendees || []).map((a: any, idx: number) => {
        const notifications = (event as any).inviteeNotifications || [];
        const n = notifications[idx];
        return {
          name: a.name || "",
          email: a.email || n?.email || "",
          phone: n?.phone || "",
          notifyVia: (n?.method as "email" | "sms" | "both") || "email",
        };
      }),
    });
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!selectedEvent) return;
    if (!editForm.title || !editForm.startTime || !editForm.endTime) {
      toast({ title: "Title, start time, and end time are required", variant: "destructive" });
      return;
    }
    const validInvitees = editForm.invitees.filter(i => i.email || i.name);
    const updates: any = {
      title: editForm.title,
      startTime: new Date(editForm.startTime).toISOString(),
      endTime: new Date(editForm.endTime).toISOString(),
      location: editForm.location || null,
      description: editForm.description || null,
      videoConferenceType: editForm.videoConferenceType === "none" ? null : editForm.videoConferenceType,
      externalAttendees: validInvitees.map(i => ({ name: i.name, email: i.email })),
      inviteeNotifications: validInvitees.map(i => ({ email: i.email, phone: i.phone, method: i.notifyVia })),
    };
    updateEventMutation.mutate({ id: selectedEvent.id, updates }, {
      onSuccess: () => {
        setIsEditing(false);
      },
    });
  };

  const handleEmailAllParticipants = () => {
    if (!selectedEvent) return;
    const attendees = selectedEvent.externalAttendees || [];
    const emails = attendees.map((a: any) => a.email).filter(Boolean);
    if (emails.length === 0) {
      toast({ title: "No participant emails available", variant: "destructive" });
      return;
    }
    const subject = encodeURIComponent(selectedEvent.title || "Meeting");
    const body = encodeURIComponent(
      `Regarding: ${selectedEvent.title}\nDate: ${format(new Date(selectedEvent.startTime), "EEEE, MMMM d, yyyy")}\nTime: ${format(new Date(selectedEvent.startTime), "h:mm a")} - ${format(new Date(selectedEvent.endTime), "h:mm a")}${selectedEvent.location ? `\nLocation: ${selectedEvent.location}` : ""}`
    );
    window.open(`mailto:${emails.join(",")}?subject=${subject}&body=${body}`, "_self");
  };

  const addEditInvitee = () => {
    setEditForm(prev => ({
      ...prev,
      invitees: [...prev.invitees, { name: "", email: "", phone: "", notifyVia: "email" }],
    }));
  };

  const removeEditInvitee = (idx: number) => {
    setEditForm(prev => ({
      ...prev,
      invitees: prev.invitees.filter((_, i) => i !== idx),
    }));
  };

  const updateEditInvitee = (idx: number, field: string, value: string) => {
    setEditForm(prev => ({
      ...prev,
      invitees: prev.invitees.map((inv, i) => i === idx ? { ...inv, [field]: value } : inv),
    }));
  };

  const resetNewEvent = () => {
    setNewEvent({
      title: "",
      eventType: "none",
      startTime: "",
      duration: "30",
      description: "",
      location: "",
      courtName: "",
      judgeName: "",
      caseId: "none",
      clientId: "none",
      calendarId: userCalendars.find(c => c.isDefault)?.id || "none",
      videoConferenceType: "none",
      enableAmbientIntelligence: false,
      isBillable: false,
      estimatedHours: 0,
      isAllDay: false,
      reminderMinutes: 30,
      invitees: [],
    });
  };

  const handleCreateEvent = () => {
    if (!newEvent.title || !newEvent.startTime) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }
    const startDate = new Date(newEvent.startTime);
    let endDate: Date;
    
    if (newEvent.duration === "all_day") {
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59);
    } else if (newEvent.duration === "half_day") {
      endDate = new Date(startDate.getTime() + 4 * 60 * 60 * 1000);
    } else {
      const durationMinutes = parseInt(newEvent.duration, 10);
      endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
    }
    
    createEventMutation.mutate({
      ...newEvent,
      eventType: newEvent.eventType !== "none" ? newEvent.eventType : "meeting",
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      isAllDay: newEvent.duration === "all_day",
      caseId: newEvent.caseId && newEvent.caseId !== "none" ? newEvent.caseId : null,
      clientId: newEvent.clientId && newEvent.clientId !== "none" ? newEvent.clientId : null,
      calendarId: newEvent.calendarId && newEvent.calendarId !== "none" ? newEvent.calendarId : null,
      videoConferenceType: newEvent.videoConferenceType !== "none" ? newEvent.videoConferenceType : null,
      enableAmbientIntelligence: newEvent.enableAmbientIntelligence,
      externalAttendees: newEvent.invitees.map(i => ({ name: i.name, email: i.email || "" })),
      invitees: newEvent.invitees,
    });
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setNewEvent(prev => ({
      ...prev,
      startTime: getNextHourDefault(date),
      duration: "30",
    }));
    setIsCreateDialogOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventDialogOpen(true);
  };

  const navigate = (direction: "prev" | "next") => {
    if (view === "month") {
      setCurrentDate(direction === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else if (view === "week") {
      setCurrentDate(direction === "prev" ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === "prev" ? subDays(currentDate, 1) : addDays(currentDate, 1));
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  const getEventsForDay = (date: Date) => {
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.startTime);
      return isSameDay(eventDate, date);
    });
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getNextHourDefault = (baseDate?: Date) => {
    const now = new Date();
    const base = baseDate || now;
    const result = new Date(base);
    if (isSameDay(base, now) || base.getTime() <= now.getTime()) {
      result.setTime(now.getTime());
      result.setMinutes(0, 0, 0);
      result.setHours(result.getHours() + 1);
    } else {
      result.setHours(9, 0, 0, 0);
    }
    return format(result, "yyyy-MM-dd'T'HH:mm");
  };

  const renderMonthView = () => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <div className="flex-1 flex flex-col">
        <div className="grid grid-cols-7 border-b">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        <div className="flex-1 grid grid-rows-5">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 border-b last:border-b-0">
              {week.map((day, dayIdx) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                return (
                  <div
                    key={dayIdx}
                    className={cn(
                      "min-h-[100px] p-1 border-r last:border-r-0 cursor-pointer hover-elevate",
                      !isCurrentMonth && "bg-muted/30",
                      isToday(day) && "bg-primary/5"
                    )}
                    onClick={() => handleDateClick(day)}
                    data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                  >
                    <div className={cn(
                      "text-sm mb-1 font-medium",
                      isToday(day) && "text-primary font-bold",
                      !isCurrentMonth && "text-muted-foreground"
                    )}>
                      {format(day, "d")}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map(event => {
                        return (
                          <div
                            key={event.id}
                            className="text-xs p-1 rounded truncate text-white flex items-center gap-1 cursor-pointer bg-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventClick(event);
                            }}
                            data-testid={`event-${event.id}`}
                          >
                            <CalendarIcon className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{event.title}</span>
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground pl-1">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="grid grid-cols-8 border-b">
          <div className="p-2 w-16 border-r"></div>
          {days.map((day, idx) => (
            <div key={idx} className={cn("p-2 text-center border-r last:border-r-0", isToday(day) && "bg-primary/5")}>
              <div className="text-sm text-muted-foreground">{format(day, "EEE")}</div>
              <div className={cn("text-lg font-medium", isToday(day) && "text-primary")}>{format(day, "d")}</div>
            </div>
          ))}
        </div>
        <ScrollArea className="flex-1">
          <div className="relative">
            {hours.map(hour => (
              <div key={hour} className="grid grid-cols-8 border-b h-16">
                <div className="p-1 text-xs text-muted-foreground w-16 border-r text-right pr-2">
                  {format(setHours(new Date(), hour), "h a")}
                </div>
                {days.map((day, dayIdx) => {
                  const hourEvents = events.filter(event => {
                    const eventDate = new Date(event.startTime);
                    return isSameDay(eventDate, day) && eventDate.getHours() === hour;
                  });
                  return (
                    <div 
                      key={dayIdx} 
                      className="border-r last:border-r-0 relative hover:bg-muted/30 cursor-pointer"
                      onClick={() => {
                        const date = setMinutes(setHours(day, hour), 0);
                        handleDateClick(date);
                      }}
                    >
                      {hourEvents.map(event => (
                        <div
                          key={event.id}
                          className="absolute inset-x-0 mx-0.5 p-1 rounded text-xs text-white cursor-pointer bg-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                        >
                          <div className="font-medium truncate">{event.title}</div>
                          <div className="truncate opacity-80">{format(new Date(event.startTime), "h:mm a")}</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDay(currentDate);

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b text-center">
          <div className="text-lg font-medium">{format(currentDate, "EEEE, MMMM d, yyyy")}</div>
        </div>
        <ScrollArea className="flex-1">
          <div className="relative">
            {hours.map(hour => {
              const hourEvents = dayEvents.filter(event => {
                const eventDate = new Date(event.startTime);
                return eventDate.getHours() === hour;
              });
              return (
                <div key={hour} className="flex border-b h-20">
                  <div className="w-20 p-2 text-sm text-muted-foreground border-r text-right">
                    {format(setHours(new Date(), hour), "h:mm a")}
                  </div>
                  <div 
                    className="flex-1 relative hover:bg-muted/30 cursor-pointer p-1"
                    onClick={() => {
                      const date = setMinutes(setHours(currentDate, hour), 0);
                      handleDateClick(date);
                    }}
                  >
                    {hourEvents.map(event => {
                      return (
                        <div
                          key={event.id}
                          className="p-2 rounded text-white cursor-pointer mb-1 bg-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            <span className="font-medium">{event.title}</span>
                          </div>
                          <div className="text-sm opacity-80 mt-1">
                            {format(new Date(event.startTime), "h:mm a")} - {format(new Date(event.endTime), "h:mm a")}
                          </div>
                          {event.location && (
                            <div className="text-sm opacity-80 flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    );
  };

  const renderListView = () => {
    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const groupedEvents: Record<string, CalendarEvent[]> = {};
    sortedEvents.forEach(event => {
      const dateKey = format(new Date(event.startTime), "yyyy-MM-dd");
      if (!groupedEvents[dateKey]) {
        groupedEvents[dateKey] = [];
      }
      groupedEvents[dateKey].push(event);
    });

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b">
          <div className="text-lg font-medium">
            Events for {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
          </div>
          <div className="text-sm text-muted-foreground">
            {events.length} event{events.length !== 1 ? 's' : ''} found
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {Object.keys(groupedEvents).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No events scheduled</p>
                <p className="text-sm">Click "New Event" to add your first event</p>
              </div>
            ) : (
              Object.entries(groupedEvents).map(([dateKey, dayEvents]) => (
                <div key={dateKey} className="space-y-2">
                  <div className="sticky top-0 bg-background py-2 border-b">
                    <h3 className="font-semibold text-sm text-muted-foreground">
                      {format(new Date(dateKey), "EEEE, MMMM d, yyyy")}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {dayEvents.map(event => {
                      return (
                        <div
                          key={event.id}
                          className="flex items-start gap-4 p-3 rounded-lg border hover-elevate cursor-pointer"
                          onClick={() => handleEventClick(event)}
                          data-testid={`list-event-${event.id}`}
                        >
                          <div className="p-2 rounded text-white flex-shrink-0 bg-primary">
                            <CalendarIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{event.title}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(event.startTime), "h:mm a")} - {format(new Date(event.endTime), "h:mm a")}
                            </div>
                            {event.location && (
                              <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                <MapPin className="w-3 h-3" />
                                {event.location}
                              </div>
                            )}
                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{event.description}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    );
  };

  const scrollDayViewToCurrentHour = useCallback(() => {
    setTimeout(() => {
      if (mobileDayScrollRef.current) {
        const scrollEl = mobileDayScrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
        if (scrollEl) {
          const currentHour = new Date().getHours();
          const targetScroll = Math.max(0, (currentHour - 1) * 60);
          scrollEl.scrollTop = targetScroll;
        }
      }
    }, 100);
  }, []);

  const handleMobileDayTap = useCallback((day: Date) => {
    setCurrentDate(day);
    setMobileView("day");
    scrollDayViewToCurrentHour();
  }, [scrollDayViewToCurrentHour]);

  const handleMobileSwipe = useCallback((direction: "left" | "right") => {
    if (mobileView === "month") {
      setCurrentDate(prev => direction === "left" ? addMonths(prev, 1) : subMonths(prev, 1));
    } else {
      setCurrentDate(prev => direction === "left" ? addDays(prev, 1) : subDays(prev, 1));
    }
  }, [mobileView]);

  const renderMobileMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <div
        className="flex-1 flex flex-col"
        onTouchStart={(e) => { mobileTouchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        onTouchEnd={(e) => {
          if (mobileTouchStart.current !== null) {
            const dx = e.changedTouches[0].clientX - mobileTouchStart.current.x;
            const dy = e.changedTouches[0].clientY - mobileTouchStart.current.y;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
              handleMobileSwipe(dx < 0 ? "left" : "right");
            }
            mobileTouchStart.current = null;
          }
        }}
      >
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-3 mb-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              data-testid="button-mobile-prev-month"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold" data-testid="text-mobile-month-year">
              {format(currentDate, "yyyy")}
            </h2>
          </div>
          <h1 className="text-3xl font-bold mb-3" data-testid="text-mobile-month-name">
            {format(currentDate, "MMMM")}
          </h1>
        </div>

        <div className="grid grid-cols-7 px-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="text-center text-xs font-semibold text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="flex-1 px-2 pb-2">
          {weeks.map((week, weekIdx) => (
            <div
              key={weekIdx}
              className="grid grid-cols-7 border-b border-border/30 last:border-b-0"
            >
              {week.map((day, dayIdx) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isTodayDate = isToday(day);
                return (
                  <div
                    key={dayIdx}
                    className={cn(
                      "py-1.5 px-0.5 min-h-[72px] cursor-pointer",
                      !isCurrentMonth && "opacity-30"
                    )}
                    onClick={() => handleMobileDayTap(day)}
                    data-testid={`mobile-day-${format(day, "yyyy-MM-dd")}`}
                  >
                    <div className="flex justify-center mb-1">
                      <span
                        className={cn(
                          "w-7 h-7 flex items-center justify-center text-sm font-semibold rounded-full",
                          isTodayDate && "bg-primary text-primary-foreground",
                          !isTodayDate && isSameDay(day, currentDate) && "bg-accent"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      {dayEvents.slice(0, 2).map(event => (
                        <div
                          key={event.id}
                          className={cn(
                            "text-[9px] leading-tight px-1 py-0.5 rounded truncate text-white font-medium",
                            "bg-primary"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                          data-testid={`mobile-event-pill-${event.id}`}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[9px] text-muted-foreground text-center font-medium">
                          +{dayEvents.length - 2}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 flex items-center justify-between px-4 py-3 border-t bg-background z-50">
          <Button
            variant="outline"
            onClick={() => {
              setCurrentDate(new Date());
              setMobileView("day");
              scrollDayViewToCurrentHour();
            }}
            className="font-semibold"
            data-testid="button-mobile-today"
          >
            Today
          </Button>
          <Button
            size="icon"
            onClick={() => {
              resetNewEvent();
              setNewEvent(prev => ({
                ...prev,
                startTime: getNextHourDefault(),
                duration: "30",
              }));
              setIsCreateDialogOpen(true);
            }}
            data-testid="button-mobile-create-event"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  };

  const renderMobileDayView = () => {
    const dayEvents = getEventsForDay(currentDate);
    const weekStart = startOfWeek(currentDate);
    const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart) });

    return (
      <div
        className="flex-1 flex flex-col"
        onTouchStart={(e) => { mobileTouchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        onTouchEnd={(e) => {
          if (mobileTouchStart.current !== null) {
            const dx = e.changedTouches[0].clientX - mobileTouchStart.current.x;
            const dy = e.changedTouches[0].clientY - mobileTouchStart.current.y;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
              handleMobileSwipe(dx < 0 ? "left" : "right");
            }
            mobileTouchStart.current = null;
          }
        }}
      >
        <div className="px-4 pt-3 pb-2">
          <Button
            variant="ghost"
            className="gap-1 px-2 -ml-2 text-primary font-semibold"
            onClick={() => setMobileView("month")}
            data-testid="button-mobile-back-month"
          >
            <ChevronLeft className="w-4 h-4" />
            {format(currentDate, "MMMM")}
          </Button>
        </div>

        <div className="grid grid-cols-7 px-2 gap-1 pb-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="text-center text-xs font-semibold text-muted-foreground">
              {d}
            </div>
          ))}
          {weekDays.map((day, idx) => {
            const hasEvents = getEventsForDay(day).length > 0;
            const isTodayDate = isToday(day);
            const isSelected = isSameDay(day, currentDate);
            return (
              <button
                key={idx}
                className={cn(
                  "flex flex-col items-center py-1 rounded-lg min-h-[44px] justify-center",
                  isSelected && isTodayDate && "bg-primary text-primary-foreground",
                  isSelected && !isTodayDate && "bg-accent",
                  !isSelected && "hover-elevate"
                )}
                onClick={() => setCurrentDate(day)}
                data-testid={`mobile-week-day-${format(day, "yyyy-MM-dd")}`}
              >
                <span className={cn(
                  "text-base font-semibold",
                  isSelected && isTodayDate && "text-primary-foreground",
                  isTodayDate && !isSelected && "text-primary"
                )}>
                  {format(day, "d")}
                </span>
                {hasEvents && !isSelected && (
                  <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        <div className="px-4 py-2 border-t">
          <h2 className="text-base font-semibold text-center" data-testid="text-mobile-day-header">
            {format(currentDate, "EEEE")} &ndash; {format(currentDate, "MMM d, yyyy")}
          </h2>
        </div>

        <div ref={mobileDayScrollRef} className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="relative">
            {hours.map(hour => {
              const hourEvents = dayEvents.filter(event => {
                const eventDate = new Date(event.startTime);
                return eventDate.getHours() === hour;
              });
              return (
                <div key={hour} className="flex border-b border-border/30 min-h-[60px]">
                  <div className="w-16 py-2 pr-2 text-xs text-muted-foreground text-right flex-shrink-0">
                    {format(setHours(new Date(), hour), "h a")}
                  </div>
                  <div
                    className="flex-1 relative border-l border-border/30 px-1 py-0.5"
                    onClick={() => {
                      const date = setMinutes(setHours(currentDate, hour), 0);
                      const dateStr = format(date, "yyyy-MM-dd");
                      const timeStr = format(date, "HH:mm");
                      setNewEvent(prev => ({
                        ...prev,
                        startTime: `${dateStr}T${timeStr}`,
                        duration: "30",
                      }));
                      setIsCreateDialogOpen(true);
                    }}
                  >
                    {hourEvents.map(event => {
                      const eventStart = new Date(event.startTime);
                      const eventEnd = new Date(event.endTime);
                      const durationMins = Math.max(differenceInMinutes(eventEnd, eventStart), 30);
                      const heightPx = Math.min(durationMins, 120);
                      return (
                        <div
                          key={event.id}
                          className="rounded p-2 text-white cursor-pointer mb-0.5 bg-primary"
                          style={{ minHeight: `${heightPx}px` }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                          data-testid={`mobile-day-event-${event.id}`}
                        >
                          <div className="flex items-center gap-1.5">
                            <CalendarIcon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="font-semibold text-sm truncate">{event.title}</span>
                          </div>
                          <div className="text-xs opacity-90 mt-0.5">
                            {format(eventStart, "h:mm a")} - {format(eventEnd, "h:mm a")}
                          </div>
                          {event.location && (
                            <div className="text-xs opacity-80 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between px-4 py-3 border-t bg-background z-50">
          <Button
            variant="outline"
            onClick={() => {
              setCurrentDate(new Date());
              scrollDayViewToCurrentHour();
            }}
            className="font-semibold"
            data-testid="button-mobile-day-today"
          >
            Today
          </Button>
          <Button
            size="icon"
            onClick={() => {
              resetNewEvent();
              setNewEvent(prev => ({
                ...prev,
                startTime: getNextHourDefault(currentDate),
                duration: "30",
              }));
              setIsCreateDialogOpen(true);
            }}
            data-testid="button-mobile-day-create"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  };

  const renderMobileLayout = () => {
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }
    return mobileView === "month" ? renderMobileMonthView() : renderMobileDayView();
  };

  const renderMiniCalendar = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))} data-testid="button-mini-prev-month">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium">{format(currentDate, "MMMM yyyy")}</span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))} data-testid="button-mini-next-month">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="text-xs text-muted-foreground p-1">{d}</div>
          ))}
          {days.map((day, idx) => (
            <button
              key={idx}
              className={cn(
                "text-xs p-1 rounded hover-elevate",
                !isSameMonth(day, currentDate) && "text-muted-foreground",
                isToday(day) && "bg-primary text-primary-foreground",
                isSameDay(day, currentDate) && !isToday(day) && "bg-accent"
              )}
              onClick={() => setCurrentDate(day)}
              data-testid={`mini-calendar-day-${format(day, "yyyy-MM-dd")}`}
            >
              {format(day, "d")}
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (isMobile) {
    return (
      <div className="h-full flex flex-col">
        {renderMobileLayout()}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent
            className="max-w-[95vw] max-h-[90vh] overflow-y-auto rounded-lg"
            onPaste={(e) => {
              if (!eventImage && !isExtractingFromImage) {
                handlePaste(e as unknown as ClipboardEvent);
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
              <DialogDescription>Add a new event to your calendar</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="mobile-title">Event Title *</Label>
                <Input
                  id="mobile-title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Motion Hearing - Smith v. Jones"
                  data-testid="input-mobile-event-title"
                />
              </div>
              <div>
                <Label htmlFor="mobile-startTime">Start Time *</Label>
                <Input
                  id="mobile-startTime"
                  type="datetime-local"
                  value={newEvent.startTime}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, startTime: e.target.value }))}
                  data-testid="input-mobile-start-time"
                />
              </div>
              <div>
                <Label htmlFor="mobile-duration">Duration</Label>
                <Select value={newEvent.duration} onValueChange={(v) => setNewEvent(prev => ({ ...prev, duration: v }))}>
                  <SelectTrigger data-testid="select-mobile-duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                    <SelectItem value="half_day">Half Day</SelectItem>
                    <SelectItem value="all_day">All Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="mobile-location">Location</Label>
                <Input
                  id="mobile-location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Courtroom, office, etc."
                  data-testid="input-mobile-location"
                />
              </div>
              <div>
                <Label htmlFor="mobile-description">Description</Label>
                <Textarea
                  id="mobile-description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Additional details..."
                  rows={3}
                  data-testid="input-mobile-description"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetNewEvent(); }} data-testid="button-mobile-cancel-event">
                Cancel
              </Button>
              <Button onClick={handleCreateEvent} disabled={createEventMutation.isPending} data-testid="button-mobile-save-event">
                {createEventMutation.isPending ? "Creating..." : "Create Event"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {selectedEvent && (
          <Dialog open={isEventDialogOpen} onOpenChange={(open) => { setIsEventDialogOpen(open); if (!open) setIsEditing(false); }}>
            <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto rounded-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  {isEditing ? "Edit Event" : selectedEvent.title}
                </DialogTitle>
                <DialogDescription>{isEditing ? "Update event details" : "Event details"}</DialogDescription>
              </DialogHeader>

              {!isEditing && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{format(new Date(selectedEvent.startTime), "EEEE, MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{format(new Date(selectedEvent.startTime), "h:mm a")} - {format(new Date(selectedEvent.endTime), "h:mm a")}</span>
                  </div>
                  {selectedEvent.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedEvent.location}</span>
                    </div>
                  )}
                  {selectedEvent.videoConferenceType && selectedEvent.videoConferenceType !== "none" && (
                    <div className="p-3 rounded-md bg-primary/10 border border-primary/20">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">
                            {selectedEvent.videoConferenceType === "sentinel" && "Sentinel Video"}
                            {selectedEvent.videoConferenceType === "google_meet" && "Google Meet"}
                            {selectedEvent.videoConferenceType === "zoom" && "Zoom"}
                            {selectedEvent.videoConferenceType === "teams" && "Teams"}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            const baseUrl = window.location.origin;
                            const roomId = (selectedEvent as any).meetingRoomId || selectedEvent.id;
                            const meetingUrl = selectedEvent.videoConferenceUrl || 
                              `${baseUrl}/video-meeting/${roomId}?eventId=${selectedEvent.id}&type=${selectedEvent.videoConferenceType}`;
                            window.open(meetingUrl, "_blank");
                          }}
                          data-testid="button-mobile-start-meeting"
                        >
                          <Video className="w-4 h-4 mr-1" />
                          Join
                        </Button>
                      </div>
                    </div>
                  )}
                  {selectedEvent.description && (
                    <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                  )}
                  {selectedEvent.externalAttendees && selectedEvent.externalAttendees.length > 0 && (
                    <div className="pt-2 border-t space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Participants ({selectedEvent.externalAttendees.length})
                        </span>
                        <Button size="sm" variant="ghost" onClick={handleEmailAllParticipants} data-testid="button-mobile-email-participants">
                          <Mail className="w-4 h-4 mr-1" />
                          Email All
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedEvent.externalAttendees.map((attendee, idx) => (
                          <Badge key={idx} variant="secondary" className="flex items-center gap-1" data-testid={`badge-mobile-invitee-${idx}`}>
                            <Users className="w-3 h-3" />
                            {attendee.name || attendee.email}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {(selectedEvent as any).meetingIntelligence?.peopleBrief && (
                    <div className="pt-2 border-t space-y-2" data-testid="section-mobile-meeting-intelligence">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Intelligence Brief</span>
                        <Badge variant="secondary" className="text-[10px]">Private</Badge>
                      </div>

                      <div className="flex gap-1 border-b">
                        {(["people", "past", "news", "docs"] as const).map((tab) => (
                          <button
                            key={tab}
                            className={cn(
                              "px-2 py-1.5 text-xs font-medium border-b-2 transition-colors",
                              intelTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                            )}
                            onClick={() => setIntelTab(tab)}
                            data-testid={`tab-mobile-${tab}`}
                          >
                            {tab === "people" ? "People" : tab === "past" ? "History" : tab === "news" ? "News" : "Emails"}
                          </button>
                        ))}
                      </div>

                      {intelTab === "people" && (selectedEvent as any).meetingIntelligence.peopleBrief.map((person: any, idx: number) => (
                        <div key={idx} className="space-y-2 pb-2">
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                              {person.initials}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-sm font-semibold">{person.name}</span>
                                <Badge
                                  variant={person.badge.includes("Active") ? "default" : person.badge.includes("Opposing") ? "destructive" : "outline"}
                                  className="text-[9px]"
                                >{person.badge}</Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">{person.title}, {person.company}</div>
                            </div>
                          </div>
                          <p className="text-xs">{person.bio}</p>
                          {person.keyIntel?.length > 0 && (
                            <div className="rounded-md bg-amber-500/10 p-2 space-y-0.5">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Key Intel</span>
                              {person.keyIntel.map((intel: string, i: number) => (
                                <div key={i} className="text-xs flex items-start gap-1"><span className="text-muted-foreground">·</span>{intel}</div>
                              ))}
                            </div>
                          )}
                          {person.riskFlags?.length > 0 && (
                            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2 space-y-0.5">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-destructive flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Risk Flags
                              </span>
                              {person.riskFlags.map((flag: string, i: number) => (
                                <div key={i} className="text-xs flex items-start gap-1"><span className="text-destructive">·</span>{flag}</div>
                              ))}
                            </div>
                          )}
                          {idx < (selectedEvent as any).meetingIntelligence.peopleBrief.length - 1 && <div className="border-b" />}
                        </div>
                      ))}

                      {intelTab === "past" && (
                        <div className="space-y-2">
                          {(selectedEvent as any).meetingIntelligence.pastMeetings?.map((m: any, idx: number) => (
                            <div key={idx} className="p-2 rounded-md bg-muted/50 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium">{m.title}</span>
                                <span className="text-[10px] text-muted-foreground">{new Date(m.date).toLocaleDateString()}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{m.outcome}</p>
                            </div>
                          )) || <p className="text-xs text-muted-foreground">No past meetings.</p>}
                        </div>
                      )}

                      {intelTab === "news" && (
                        <div className="space-y-2">
                          {(selectedEvent as any).meetingIntelligence.newsInsights?.map((insight: any, idx: number) => (
                            insight.articles?.length > 0 && (
                              <div key={idx} className="space-y-1">
                                <span className="text-xs font-medium">{insight.name}</span>
                                {insight.articles.map((a: any, aIdx: number) => (
                                  <a key={aIdx} href={a.url} target="_blank" rel="noopener noreferrer" className="block p-2 rounded-md bg-muted/50 text-xs">
                                    <div className="font-medium">{a.title}</div>
                                    <div className="text-muted-foreground mt-0.5">{a.summary}</div>
                                    <div className="text-[10px] text-muted-foreground mt-1">{a.source}{a.publishedAt ? ` · ${new Date(a.publishedAt).toLocaleDateString()}` : ""}</div>
                                  </a>
                                ))}
                              </div>
                            )
                          ))}
                        </div>
                      )}

                      {intelTab === "docs" && (
                        <div className="space-y-3">
                          {isLoadingComms ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Searching emails...</span>
                            </div>
                          ) : attendeeComms && Object.keys(attendeeComms).length > 0 ? (
                            Object.entries(attendeeComms).map(([name, data]) => (
                              <div key={name} className="space-y-1.5">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-medium">{name}</span>
                                  <Badge variant="outline" className="text-[9px]">{data.totalCount}</Badge>
                                </div>
                                {data.emails.length > 0 ? data.emails.map((email: any) => (
                                  <div key={email.id} className="p-2 rounded-md bg-muted/50 space-y-0.5">
                                    <div className="text-xs font-medium truncate">{email.subject}</div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {typeof email.sender === "string" ? email.sender.replace(/<[^>]+>/g, "").replace(/"/g, "").trim() : ""} · {email.timestamp ? new Date(email.timestamp).toLocaleDateString() : ""}
                                    </div>
                                    {email.bodySnippet && <p className="text-[10px] text-muted-foreground line-clamp-2">{email.bodySnippet}</p>}
                                  </div>
                                )) : (
                                  <p className="text-[10px] text-muted-foreground">No communications found.</p>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground text-center py-3">No ingested communications found.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {(selectedEvent as any).meetingIntelligence && !(selectedEvent as any).meetingIntelligence.peopleBrief && (
                    <div className="pt-2 border-t space-y-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Intelligence</span>
                        <Badge variant="secondary" className="text-[10px]">Private</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{(selectedEvent as any).meetingIntelligence.attendeeSummary}</p>
                    </div>
                  )}

                  {selectedEvent.externalAttendees && selectedEvent.externalAttendees.length > 0 && !(selectedEvent as any).meetingIntelligence && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Generating intelligence...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isEditing && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="mobile-edit-title">Title</Label>
                    <Input id="mobile-edit-title" value={editForm.title} onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))} data-testid="input-mobile-edit-title" />
                  </div>
                  <div>
                    <Label htmlFor="mobile-edit-start">Start Time</Label>
                    <Input id="mobile-edit-start" type="datetime-local" value={editForm.startTime} onChange={(e) => setEditForm(prev => ({ ...prev, startTime: e.target.value }))} data-testid="input-mobile-edit-start" />
                  </div>
                  <div>
                    <Label htmlFor="mobile-edit-end">End Time</Label>
                    <Input id="mobile-edit-end" type="datetime-local" value={editForm.endTime} onChange={(e) => setEditForm(prev => ({ ...prev, endTime: e.target.value }))} data-testid="input-mobile-edit-end" />
                  </div>
                  <div>
                    <Label htmlFor="mobile-edit-location">Location</Label>
                    <Input id="mobile-edit-location" value={editForm.location} onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))} placeholder="Add a location" data-testid="input-mobile-edit-location" />
                  </div>
                  <div>
                    <Label htmlFor="mobile-edit-desc">Description</Label>
                    <Textarea id="mobile-edit-desc" value={editForm.description} onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Add a description" rows={2} data-testid="input-mobile-edit-description" />
                  </div>
                  <div>
                    <Label>Video Meeting</Label>
                    <Select value={editForm.videoConferenceType} onValueChange={(val) => setEditForm(prev => ({ ...prev, videoConferenceType: val }))}>
                      <SelectTrigger data-testid="select-mobile-edit-video">
                        <SelectValue placeholder="No video meeting" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Video Meeting</SelectItem>
                        <SelectItem value="sentinel">Sentinel Video Meeting</SelectItem>
                        <SelectItem value="zoom">Zoom</SelectItem>
                        <SelectItem value="teams">Microsoft Teams</SelectItem>
                        <SelectItem value="google_meet">Google Meet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Label className="flex items-center gap-2"><Users className="w-4 h-4" /> Participants</Label>
                      <Button size="sm" variant="ghost" onClick={addEditInvitee} data-testid="button-mobile-add-invitee">
                        <UserPlus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    {editForm.invitees.length === 0 && <p className="text-sm text-muted-foreground">No participants added yet.</p>}
                    <div className="space-y-3">
                      {editForm.invitees.map((inv, idx) => (
                        <div key={idx} className="space-y-2 p-2 rounded-md border">
                          <div className="flex items-center gap-2">
                            <Input value={inv.name} onChange={(e) => updateEditInvitee(idx, "name", e.target.value)} placeholder="Name" className="flex-1" data-testid={`input-mobile-invitee-name-${idx}`} />
                            <Button size="icon" variant="ghost" onClick={() => removeEditInvitee(idx)} data-testid={`button-mobile-remove-invitee-${idx}`}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <Input value={inv.email} onChange={(e) => updateEditInvitee(idx, "email", e.target.value)} placeholder="Email" data-testid={`input-mobile-invitee-email-${idx}`} />
                          <Input value={inv.phone} onChange={(e) => updateEditInvitee(idx, "phone", e.target.value)} placeholder="Phone" data-testid={`input-mobile-invitee-phone-${idx}`} />
                          <Select value={inv.notifyVia} onValueChange={(val) => updateEditInvitee(idx, "notifyVia", val)}>
                            <SelectTrigger data-testid={`select-mobile-invitee-notify-${idx}`}>
                              <SelectValue placeholder="Notify via" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="email">Notify via Email</SelectItem>
                              <SelectItem value="sms">Notify via SMS</SelectItem>
                              <SelectItem value="both">Notify via Both</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2">
                {!isEditing ? (
                  <>
                    <Button variant="destructive" onClick={() => { deleteEventMutation.mutate(selectedEvent.id); setIsEventDialogOpen(false); }} data-testid="button-mobile-delete-event">
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                    <Button variant="outline" onClick={() => enterEditMode(selectedEvent)} data-testid="button-mobile-edit-event">
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setIsEditing(false)} data-testid="button-mobile-cancel-edit">Cancel</Button>
                    <Button onClick={handleSaveEdit} disabled={updateEventMutation.isPending} data-testid="button-mobile-save-edit">
                      {updateEventMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">Manage hearings, depositions, deadlines, and court dates</p>
        </div>
        <Button onClick={() => {
          resetNewEvent();
          setNewEvent(prev => ({
            ...prev,
            startTime: getNextHourDefault(),
            duration: "30",
          }));
          setIsCreateDialogOpen(true);
        }} data-testid="button-create-event">
          <Plus className="w-4 h-4 mr-2" />
          New Event
        </Button>
      </div>
      <div className="flex-1 flex gap-4 min-h-0">
        <Card className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigate("prev")} data-testid="button-prev">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigate("next")} data-testid="button-next">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={goToToday} data-testid="button-today">
                Today
              </Button>
              <h2 className="text-lg font-semibold ml-2">
                {view === "month" && format(currentDate, "MMMM yyyy")}
                {view === "week" && `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`}
                {view === "day" && format(currentDate, "MMMM d, yyyy")}
                {view === "list" && `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant={view === "day" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("day")}
                data-testid="button-view-day"
              >
                Day
              </Button>
              <Button
                variant={view === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("week")}
                data-testid="button-view-week"
              >
                Week
              </Button>
              <Button
                variant={view === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("month")}
                data-testid="button-view-month"
              >
                Month
              </Button>
              <Button
                variant={view === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("list")}
                data-testid="button-view-list"
              >
                List
              </Button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {view === "month" && renderMonthView()}
              {view === "week" && renderWeekView()}
              {view === "day" && renderDayView()}
              {view === "list" && renderListView()}
            </>
          )}
        </Card>

        <div className="w-64 flex-shrink-0 space-y-4 overflow-y-auto">
          <Card>
            {renderMiniCalendar()}
          </Card>
          
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm">My Calendars</CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={() => setIsCreateCalendarOpen(true)}
                data-testid="button-add-calendar"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {userCalendars.length === 0 ? (
                <p className="text-sm text-muted-foreground">No calendars yet</p>
              ) : (
                userCalendars.map(calendar => (
                  <div 
                    key={calendar.id} 
                    className="flex items-center gap-2 text-sm cursor-pointer hover-elevate p-1 rounded"
                    data-testid={`calendar-toggle-${calendar.id}`}
                  >
                    <Checkbox
                      checked={visibleCalendarIds.has(calendar.id)}
                      onCheckedChange={() => toggleCalendarVisibility(calendar.id)}
                      data-testid={`checkbox-calendar-${calendar.id}`}
                    />
                    <div 
                      className="w-3 h-3 rounded-sm flex-shrink-0" 
                      style={{ backgroundColor: calendar.color }}
                    />
                    <span className="truncate flex-1">{calendar.name}</span>
                    {calendar.isDefault && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">Default</Badge>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm">Connected Calendars</CardTitle>
              <div className="flex items-center gap-1">
                {connectedAccounts.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => syncCalendarMutation.mutate()}
                    disabled={syncCalendarMutation.isPending}
                    data-testid="button-sync-calendars"
                  >
                    <RefreshCw className={cn("w-3 h-3", syncCalendarMutation.isPending && "animate-spin")} />
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => setIsConnectAccountsOpen(true)}
                  data-testid="button-connect-calendar"
                >
                  <Link2 className="w-3 h-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {connectedAccounts.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Connect Google or Outlook to sync events
                </p>
              ) : (
                connectedAccounts.map(account => (
                  <div 
                    key={account.id} 
                    className="flex items-center gap-2 text-sm p-1.5 rounded bg-muted/50"
                    data-testid={`connected-account-${account.id}`}
                  >
                    {account.provider === "google" ? (
                      <SiGoogle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    ) : (
                      <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-xs truncate block">{account.providerEmail}</span>
                      {account.syncStatus === "error" && (
                        <span className="text-[10px] text-destructive">Sync error</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 flex-shrink-0"
                      onClick={() => disconnectAccountMutation.mutate(account.id)}
                      data-testid={`disconnect-${account.id}`}
                    >
                      <Unlink className="w-3 h-3" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => seedDemoMeetingsMutation.mutate()}
            disabled={seedDemoMeetingsMutation.isPending}
            data-testid="button-seed-demo-meetings"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            {seedDemoMeetingsMutation.isPending ? "Creating..." : "Load Demo Meetings"}
          </Button>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Upcoming Deadlines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {events
                  .filter(e => e.eventType === "deadline" && new Date(e.startTime) >= new Date())
                  .slice(0, 5)
                  .map(event => (
                    <div
                      key={event.id}
                      className="p-2 rounded bg-muted/50 hover-elevate cursor-pointer"
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="text-sm font-medium truncate">{event.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(event.startTime), "MMM d, h:mm a")}
                      </div>
                    </div>
                  ))}
                {events.filter(e => e.eventType === "deadline").length === 0 && (
                  <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent 
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          onPaste={(e) => {
            if (!eventImage && !isExtractingFromImage) {
              handlePaste(e as unknown as ClipboardEvent);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>Add a new event to your legal calendar</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Motion Hearing - Smith v. Jones"
                  data-testid="input-event-title"
                />
              </div>
              
              <div>
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={newEvent.startTime}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, startTime: e.target.value }))}
                  data-testid="input-start-time"
                />
              </div>
              
              <div>
                <Label htmlFor="duration">Duration</Label>
                <Select value={newEvent.duration} onValueChange={(v) => setNewEvent(prev => ({ ...prev, duration: v }))}>
                  <SelectTrigger data-testid="select-duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                    <SelectItem value="300">5 hours</SelectItem>
                    <SelectItem value="360">6 hours</SelectItem>
                    <SelectItem value="420">7 hours</SelectItem>
                    <SelectItem value="480">8 hours</SelectItem>
                    <SelectItem value="half_day">Half day</SelectItem>
                    <SelectItem value="all_day">All day</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="caseId">Link to Case</Label>
                <Select value={newEvent.caseId} onValueChange={(v) => setNewEvent(prev => ({ ...prev, caseId: v }))}>
                  <SelectTrigger data-testid="select-case">
                    <SelectValue placeholder="Select a case" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No case</SelectItem>
                    {cases.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="clientId">Link to Client</Label>
                <Select value={newEvent.clientId} onValueChange={(v) => setNewEvent(prev => ({ ...prev, clientId: v }))}>
                  <SelectTrigger data-testid="select-client">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No client</SelectItem>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Courtroom 5B, 100 Center Street"
                  data-testid="input-location"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="videoConferenceType">Video Meeting</Label>
                <Select value={newEvent.videoConferenceType} onValueChange={(v) => setNewEvent(prev => ({ ...prev, videoConferenceType: v }))}>
                  <SelectTrigger data-testid="select-video-conference">
                    <SelectValue placeholder="Select video meeting type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">No video meeting</span>
                    </SelectItem>
                    <SelectItem value="sentinel">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-primary" />
                        <span>Sentinel Video Meeting</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="google_meet">
                      <div className="flex items-center gap-2">
                        <SiGooglemeet className="w-4 h-4 text-green-600" />
                        <span>Google Meet</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="zoom">
                      <div className="flex items-center gap-2">
                        <SiZoom className="w-4 h-4 text-blue-500" />
                        <span>Zoom</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="teams">
                      <div className="flex items-center gap-2">
                        <MonitorPlay className="w-4 h-4 text-purple-600" />
                        <span>Microsoft Teams</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newEvent.videoConferenceType !== "none" && (
                <div className="col-span-2 flex items-center gap-3 p-3 rounded-md bg-muted/50 border">
                  <Checkbox
                    id="enableAmbientIntelligence"
                    checked={newEvent.enableAmbientIntelligence}
                    onCheckedChange={(v) => setNewEvent(prev => ({ ...prev, enableAmbientIntelligence: !!v }))}
                    data-testid="checkbox-ambient-intelligence"
                  />
                  <div className="flex-1">
                    <Label htmlFor="enableAmbientIntelligence" className="flex items-center gap-2 cursor-pointer">
                      <Brain className="w-4 h-4 text-primary" />
                      Enable Ambient Intelligence
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      AI-powered transcription, document discovery, and real-time insights
                      {(newEvent.caseId !== "none" || newEvent.clientId !== "none") && (
                        <span className="text-primary"> — linked to selected {newEvent.caseId !== "none" ? "case" : "client"}</span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Invitees Section */}
              <div className="col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Invitees
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewEvent(prev => ({
                      ...prev,
                      invitees: [...prev.invitees, { name: "", email: "", phone: "", notifyVia: "email" }]
                    }))}
                    data-testid="button-add-invitee"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Add Invitee
                  </Button>
                </div>
                {newEvent.invitees.length === 0 && (
                  <p className="text-sm text-muted-foreground" data-testid="text-no-invitees">
                    No invitees added. Click "Add Invitee" to invite participants.
                  </p>
                )}
                {newEvent.invitees.map((invitee, index) => (
                  <div key={index} className="p-3 border rounded-md space-y-2 bg-muted/30" data-testid={`invitee-row-${index}`}>
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        placeholder="Name"
                        value={invitee.name}
                        onChange={(e) => {
                          const updated = [...newEvent.invitees];
                          updated[index].name = e.target.value;
                          setNewEvent(prev => ({ ...prev, invitees: updated }));
                        }}
                        className="flex-1"
                        data-testid={`input-invitee-name-${index}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const updated = newEvent.invitees.filter((_, i) => i !== index);
                          setNewEvent(prev => ({ ...prev, invitees: updated }));
                        }}
                        data-testid={`button-remove-invitee-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Email address"
                          type="email"
                          value={invitee.email}
                          onChange={(e) => {
                            const updated = [...newEvent.invitees];
                            updated[index].email = e.target.value;
                            setNewEvent(prev => ({ ...prev, invitees: updated }));
                          }}
                          className="pl-9"
                          data-testid={`input-invitee-email-${index}`}
                        />
                      </div>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Phone (optional)"
                          type="tel"
                          value={invitee.phone}
                          onChange={(e) => {
                            const updated = [...newEvent.invitees];
                            updated[index].phone = e.target.value;
                            setNewEvent(prev => ({ ...prev, invitees: updated }));
                          }}
                          className="pl-9"
                          data-testid={`input-invitee-phone-${index}`}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">Notify via:</span>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`notify-${index}`}
                            checked={invitee.notifyVia === "email"}
                            onChange={() => {
                              const updated = [...newEvent.invitees];
                              updated[index].notifyVia = "email";
                              setNewEvent(prev => ({ ...prev, invitees: updated }));
                            }}
                            className="w-4 h-4"
                            data-testid={`radio-notify-email-${index}`}
                          />
                          <Mail className="w-3.5 h-3.5" />
                          <span className="text-sm">Email</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`notify-${index}`}
                            checked={invitee.notifyVia === "sms"}
                            onChange={() => {
                              const updated = [...newEvent.invitees];
                              updated[index].notifyVia = "sms";
                              setNewEvent(prev => ({ ...prev, invitees: updated }));
                            }}
                            className="w-4 h-4"
                            data-testid={`radio-notify-sms-${index}`}
                          />
                          <Phone className="w-3.5 h-3.5" />
                          <span className="text-sm">SMS</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`notify-${index}`}
                            checked={invitee.notifyVia === "both"}
                            onChange={() => {
                              const updated = [...newEvent.invitees];
                              updated[index].notifyVia = "both";
                              setNewEvent(prev => ({ ...prev, invitees: updated }));
                            }}
                            className="w-4 h-4"
                            data-testid={`radio-notify-both-${index}`}
                          />
                          <span className="text-sm">Both</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>


              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Additional details about this event..."
                  rows={3}
                  data-testid="input-description"
                />
              </div>

              <div>
                <Label htmlFor="reminder">Reminder</Label>
                <Select value={String(newEvent.reminderMinutes)} onValueChange={(v) => setNewEvent(prev => ({ ...prev, reminderMinutes: parseInt(v) }))}>
                  <SelectTrigger data-testid="select-reminder">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes before</SelectItem>
                    <SelectItem value="15">15 minutes before</SelectItem>
                    <SelectItem value="30">30 minutes before</SelectItem>
                    <SelectItem value="60">1 hour before</SelectItem>
                    <SelectItem value="1440">1 day before</SelectItem>
                    <SelectItem value="10080">1 week before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* AI-powered image extraction section */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Create from Document</span>
            </div>
            
            {eventImage ? (
              <div className="relative" data-testid="image-preview-container">
                <img 
                  src={eventImage} 
                  alt="Uploaded document" 
                  className="w-full max-h-32 object-contain rounded border bg-background"
                  data-testid="image-preview"
                />
                {isExtractingFromImage ? (
                  <div 
                    className="absolute inset-0 flex items-center justify-center bg-background/80 rounded"
                    data-testid="status-extracting"
                  >
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span data-testid="text-extracting-status">Extracting event details...</span>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1"
                    onClick={clearEventImage}
                    data-testid="button-clear-image"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ) : (
              <div 
                className="border-2 border-dashed rounded-lg p-4 text-center hover-elevate cursor-pointer transition-colors"
                onPaste={(e) => handlePaste(e as unknown as ClipboardEvent)}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file && file.type.startsWith("image/")) {
                    handleImageUpload(file);
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                tabIndex={0}
                data-testid="dropzone-image"
              >
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground" data-testid="text-dropzone-instructions">
                    Upload a photo, paste a screenshot, or take a picture of a document
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleFileSelect}
                      data-testid="button-upload-image"
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Upload
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCameraCapture}
                      data-testid="button-camera-capture"
                    >
                      <Camera className="w-3 h-3 mr-1" />
                      Camera
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Or press Ctrl+V to paste an image
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} data-testid="button-cancel-create">
              Cancel
            </Button>
            <Button onClick={handleCreateEvent} disabled={createEventMutation.isPending} data-testid="button-save-event">
              {createEventMutation.isPending ? "Creating..." : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isEventDialogOpen} onOpenChange={(open) => { setIsEventDialogOpen(open); if (!open) { setIsEditing(false); setIntelTab("people"); } }}>
        <DialogContent className={cn(
          "transition-all",
          (selectedEvent as any)?.meetingIntelligence?.peopleBrief && !isEditing ? "max-w-5xl" : "max-w-lg"
        )}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              {isEditing ? "Edit Event" : selectedEvent?.title}
            </DialogTitle>
            <DialogDescription>{isEditing ? "Update event details" : "Event details"}</DialogDescription>
          </DialogHeader>
          
          {selectedEvent && !isEditing && (
            <div className={cn(
              (selectedEvent as any).meetingIntelligence?.peopleBrief ? "flex gap-6" : ""
            )}>
              <div className={cn(
                "space-y-4",
                (selectedEvent as any).meetingIntelligence?.peopleBrief ? "w-[320px] flex-shrink-0" : ""
              )}>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarIcon className="w-4 h-4 flex-shrink-0 text-primary" />
                  <span className="text-sm">{format(new Date(selectedEvent.startTime), "EEEE, MMMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4 flex-shrink-0 text-primary" />
                  <span className="text-sm">
                    {format(new Date(selectedEvent.startTime), "h:mm a")} · {(() => {
                      const mins = differenceInMinutes(new Date(selectedEvent.endTime), new Date(selectedEvent.startTime));
                      const hrs = Math.floor(mins / 60);
                      const rem = mins % 60;
                      return hrs > 0 ? `${hrs}${rem > 0 ? `.${rem}` : ""} hours` : `${mins} min`;
                    })()}
                  </span>
                </div>
              
                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 flex-shrink-0 text-red-500" />
                    <span className="text-sm">{selectedEvent.location}</span>
                  </div>
                )}

                {selectedEvent.caseId && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Sparkles className="w-4 h-4 flex-shrink-0 text-primary" />
                    <span className="text-sm font-medium">{selectedEvent.title.split("—")[0]?.trim()}</span>
                  </div>
                )}

                {selectedEvent.videoConferenceType && selectedEvent.videoConferenceType !== "none" && (
                  <div className="p-3 rounded-md bg-primary/10 border border-primary/20">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Video className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium text-sm">
                            {selectedEvent.videoConferenceType === "sentinel" && "Sentinel Video Meeting"}
                            {selectedEvent.videoConferenceType === "google_meet" && "Google Meet"}
                            {selectedEvent.videoConferenceType === "zoom" && "Zoom Meeting"}
                            {selectedEvent.videoConferenceType === "teams" && "Microsoft Teams"}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          const baseUrl = window.location.origin;
                          const roomId = (selectedEvent as any).meetingRoomId || selectedEvent.id;
                          const meetingUrl = selectedEvent.videoConferenceUrl || 
                            `${baseUrl}/video-meeting/${roomId}?eventId=${selectedEvent.id}&type=${selectedEvent.videoConferenceType}`;
                          window.open(meetingUrl, "_blank");
                        }}
                        data-testid="button-start-meeting"
                      >
                        <Video className="w-4 h-4 mr-1" />
                        Start Meeting
                      </Button>
                    </div>
                  </div>
                )}
              
                {selectedEvent.description && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                  </div>
                )}
              
                {selectedEvent.externalAttendees && selectedEvent.externalAttendees.length > 0 && (
                  <div className="pt-2 border-t space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Invitees ({selectedEvent.externalAttendees.length})
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleEmailAllParticipants}
                          data-testid="button-email-all-participants"
                        >
                          <Mail className="w-4 h-4 mr-1" />
                          Email All
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {selectedEvent.externalAttendees.map((attendee, idx) => {
                        const personBrief = (selectedEvent as any).meetingIntelligence?.peopleBrief?.find((p: any) => p.name === attendee.name);
                        return (
                          <div key={idx} className="flex items-center gap-3" data-testid={`invitee-row-${idx}`}>
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                              {personBrief?.initials || (attendee.name || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium">{attendee.name || attendee.email}</div>
                              {personBrief && (
                                <div className="text-xs text-muted-foreground">{personBrief.title}, {personBrief.company}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedEvent.externalAttendees && selectedEvent.externalAttendees.length > 0 && !(selectedEvent as any).meetingIntelligence && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Generating meeting intelligence...</span>
                    </div>
                  </div>
                )}
              </div>

              {(selectedEvent as any).meetingIntelligence?.peopleBrief && (
                <div className="flex-1 min-w-0 border-l pl-6" data-testid="section-meeting-intelligence">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-5 h-5 text-primary" />
                    <div>
                      <h3 className="font-semibold text-sm">Meeting Intelligence Brief</h3>
                      <p className="text-xs text-muted-foreground">Auto-generated · Visible only to you</p>
                    </div>
                  </div>

                  <div className="flex gap-1 border-b mb-4">
                    <button
                      className={cn(
                        "px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5",
                        intelTab === "people" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                      )}
                      onClick={() => setIntelTab("people")}
                      data-testid="tab-people-brief"
                    >
                      <Users className="w-3.5 h-3.5" />
                      People Brief
                    </button>
                    <button
                      className={cn(
                        "px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5",
                        intelTab === "past" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                      )}
                      onClick={() => setIntelTab("past")}
                      data-testid="tab-past-meetings"
                    >
                      <History className="w-3.5 h-3.5" />
                      Past Meetings
                    </button>
                    <button
                      className={cn(
                        "px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5",
                        intelTab === "news" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                      )}
                      onClick={() => setIntelTab("news")}
                      data-testid="tab-news-intel"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      News Intel
                    </button>
                    <button
                      className={cn(
                        "px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5",
                        intelTab === "docs" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                      )}
                      onClick={() => setIntelTab("docs")}
                      data-testid="tab-docs-emails"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Docs & Emails
                    </button>
                  </div>

                  <ScrollArea className="h-[420px]">
                    {intelTab === "people" && (
                      <div className="space-y-6 pr-4">
                        {(selectedEvent as any).meetingIntelligence.peopleBrief.map((person: any, idx: number) => (
                          <div key={idx} className="space-y-3" data-testid={`person-brief-${idx}`}>
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                                {person.initials}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold">{person.name}</span>
                                  <Badge
                                    variant={person.badge.includes("Active") ? "default" : person.badge.includes("Prospective") ? "secondary" : person.badge.includes("Opposing") ? "destructive" : "outline"}
                                    className="text-[10px]"
                                    data-testid={`badge-person-type-${idx}`}
                                  >
                                    {person.badge}
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">{person.title}, {person.company}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap mt-0.5">
                                  <span>{person.email}</span>
                                  {person.phone && <span>· {person.phone}</span>}
                                </div>
                              </div>
                            </div>

                            <p className="text-sm">{person.bio}</p>

                            {person.keyIntel && person.keyIntel.length > 0 && (
                              <div className="rounded-md bg-amber-500/10 p-3 space-y-1">
                                <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Key Intel</span>
                                <ul className="space-y-0.5">
                                  {person.keyIntel.map((intel: string, iIdx: number) => (
                                    <li key={iIdx} className="text-sm flex items-start gap-2">
                                      <span className="text-muted-foreground mt-1.5">·</span>
                                      <span>{intel}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {person.sentinelRelationship && (
                              <div className="rounded-md bg-primary/5 border border-primary/10 p-3 space-y-1">
                                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Sentinel Relationship</span>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Since: </span>
                                    <span className="font-medium">{person.sentinelRelationship.since}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Billings: </span>
                                    <span className="font-medium">{person.sentinelRelationship.billings}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Lead Partner: </span>
                                    <span className="font-medium">{person.sentinelRelationship.leadPartner}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Matters: </span>
                                    <span className="font-medium">{person.sentinelRelationship.matters}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {person.communicationStyle && (
                              <div className="rounded-md bg-green-500/10 p-3 space-y-1">
                                <span className="text-xs font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">Communication Style</span>
                                <p className="text-sm">{person.communicationStyle}</p>
                              </div>
                            )}

                            {person.riskFlags && person.riskFlags.length > 0 && (
                              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 space-y-1">
                                <span className="text-xs font-semibold uppercase tracking-wider text-destructive flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Risk Flags
                                </span>
                                <ul className="space-y-0.5">
                                  {person.riskFlags.map((flag: string, fIdx: number) => (
                                    <li key={fIdx} className="text-sm flex items-start gap-2">
                                      <span className="text-destructive mt-1.5">·</span>
                                      <span>{flag}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {idx < (selectedEvent as any).meetingIntelligence.peopleBrief.length - 1 && (
                              <div className="border-b" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {intelTab === "past" && (
                      <div className="space-y-3 pr-4">
                        {(selectedEvent as any).meetingIntelligence.pastMeetings && (selectedEvent as any).meetingIntelligence.pastMeetings.length > 0 ? (
                          (selectedEvent as any).meetingIntelligence.pastMeetings.map((meeting: any, idx: number) => (
                            <div key={idx} className="p-3 rounded-md bg-muted/50 space-y-1" data-testid={`past-meeting-${idx}`}>
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-sm font-medium">{meeting.title}</span>
                                <span className="text-xs text-muted-foreground">{new Date(meeting.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {meeting.attendees.map((a: string, aIdx: number) => (
                                  <Badge key={aIdx} variant="outline" className="text-[10px]">{a}</Badge>
                                ))}
                              </div>
                              <p className="text-sm text-muted-foreground">{meeting.outcome}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No past meeting history available.</p>
                        )}
                      </div>
                    )}

                    {intelTab === "news" && (
                      <div className="space-y-4 pr-4">
                        {(selectedEvent as any).meetingIntelligence.newsInsights?.map((insight: any, idx: number) => (
                          insight.articles?.length > 0 && (
                            <div key={idx} className="space-y-2" data-testid={`news-section-${idx}`}>
                              <span className="text-sm font-medium flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5" />
                                {insight.name}
                              </span>
                              {insight.articles.map((article: any, aIdx: number) => (
                                <a
                                  key={aIdx}
                                  href={article.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block p-3 rounded-md bg-muted/50 hover-elevate"
                                  data-testid={`link-news-article-${idx}-${aIdx}`}
                                >
                                  <div className="flex items-start gap-2">
                                    <ExternalLink className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
                                    <div className="min-w-0">
                                      <div className="font-medium text-sm">{article.title}</div>
                                      <div className="text-sm text-muted-foreground mt-1">{article.summary}</div>
                                      <div className="text-xs text-muted-foreground mt-1.5">
                                        {article.source}{article.publishedAt ? ` · ${new Date(article.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}
                                      </div>
                                    </div>
                                  </div>
                                </a>
                              ))}
                            </div>
                          )
                        ))}
                        {(!((selectedEvent as any).meetingIntelligence.newsInsights?.some((i: any) => i.articles?.length > 0))) && (
                          <p className="text-sm text-muted-foreground">No recent news articles found for meeting participants.</p>
                        )}
                      </div>
                    )}

                    {intelTab === "docs" && (
                      <div className="space-y-4 pr-4" data-testid="section-docs-emails">
                        {isLoadingComms ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Searching ingested communications...</span>
                          </div>
                        ) : attendeeComms && Object.keys(attendeeComms).length > 0 ? (
                          Object.entries(attendeeComms).map(([name, data]) => {
                            const personBrief = (selectedEvent as any).meetingIntelligence?.peopleBrief?.find((p: any) => p.name === name);
                            return (
                              <div key={name} className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                                    {personBrief?.initials || name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                                  </div>
                                  <div>
                                    <span className="text-sm font-medium">{name}</span>
                                    {personBrief && <span className="text-xs text-muted-foreground ml-1">· {personBrief.company}</span>}
                                  </div>
                                  <Badge variant="outline" className="text-[10px] ml-auto">{data.totalCount} found</Badge>
                                </div>
                                {data.emails.length > 0 ? (
                                  <div className="space-y-1.5 pl-9">
                                    {data.emails.map((email: any) => (
                                      <div key={email.id} className="p-2.5 rounded-md bg-muted/50 space-y-1" data-testid={`doc-email-${email.id}`}>
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium truncate">{email.subject}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                                              <span>From: {typeof email.sender === "string" ? email.sender.replace(/<[^>]+>/g, "").replace(/"/g, "").trim() : "Unknown"}</span>
                                              <span>·</span>
                                              <span>{email.timestamp ? new Date(email.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}</span>
                                            </div>
                                          </div>
                                          <Badge variant="outline" className="text-[9px] flex-shrink-0">{email.communicationType}</Badge>
                                        </div>
                                        {email.bodySnippet && (
                                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{email.bodySnippet}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground pl-9">No ingested communications found.</p>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-6">
                            <Mail className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No ingested communications found for meeting participants.</p>
                            <p className="text-xs text-muted-foreground mt-1">Communications will appear here once emails are ingested into the system.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}

              {(selectedEvent as any).meetingIntelligence && !(selectedEvent as any).meetingIntelligence.peopleBrief && (
                <div className="pt-3 border-t space-y-3" data-testid="section-meeting-intelligence-simple">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Meeting Intelligence</span>
                    <Badge variant="secondary" className="text-[10px]">Private</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{(selectedEvent as any).meetingIntelligence.attendeeSummary}</p>
                  {(selectedEvent as any).meetingIntelligence.newsInsights?.map((insight: any, idx: number) => (
                    insight.articles?.length > 0 && (
                      <div key={idx} className="space-y-1">
                        <span className="text-xs font-medium">{insight.name}</span>
                        {insight.articles.map((article: any, aIdx: number) => (
                          <a key={aIdx} href={article.url} target="_blank" rel="noopener noreferrer" className="block p-2 rounded-md bg-muted/50 hover-elevate text-sm" data-testid={`link-news-article-simple-${idx}-${aIdx}`}>
                            <div className="flex items-start gap-2">
                              <ExternalLink className="w-3 h-3 mt-0.5 flex-shrink-0 text-primary" />
                              <div className="min-w-0">
                                <div className="font-medium text-xs truncate">{article.title}</div>
                                <div className="text-xs text-muted-foreground">{article.summary}</div>
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedEvent && isEditing && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div>
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    data-testid="input-edit-title"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="edit-start">Start Time</Label>
                    <Input
                      id="edit-start"
                      type="datetime-local"
                      value={editForm.startTime}
                      onChange={(e) => setEditForm(prev => ({ ...prev, startTime: e.target.value }))}
                      data-testid="input-edit-start-time"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-end">End Time</Label>
                    <Input
                      id="edit-end"
                      type="datetime-local"
                      value={editForm.endTime}
                      onChange={(e) => setEditForm(prev => ({ ...prev, endTime: e.target.value }))}
                      data-testid="input-edit-end-time"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-location">Location</Label>
                  <Input
                    id="edit-location"
                    value={editForm.location}
                    onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Add a location"
                    data-testid="input-edit-location"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Add a description"
                    rows={3}
                    data-testid="input-edit-description"
                  />
                </div>

                <div>
                  <Label>Video Meeting</Label>
                  <Select
                    value={editForm.videoConferenceType}
                    onValueChange={(val) => setEditForm(prev => ({ ...prev, videoConferenceType: val }))}
                  >
                    <SelectTrigger data-testid="select-edit-video-type">
                      <SelectValue placeholder="No video meeting" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Video Meeting</SelectItem>
                      <SelectItem value="sentinel">Sentinel Video Meeting</SelectItem>
                      <SelectItem value="zoom">Zoom</SelectItem>
                      <SelectItem value="teams">Microsoft Teams</SelectItem>
                      <SelectItem value="google_meet">Google Meet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Label className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Participants
                    </Label>
                    <Button size="sm" variant="ghost" onClick={addEditInvitee} data-testid="button-add-edit-invitee">
                      <UserPlus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  {editForm.invitees.length === 0 && (
                    <p className="text-sm text-muted-foreground">No participants added yet.</p>
                  )}
                  <div className="space-y-3">
                    {editForm.invitees.map((inv, idx) => (
                      <div key={idx} className="space-y-2 p-2 rounded-md border">
                        <div className="flex items-center gap-2">
                          <Input
                            value={inv.name}
                            onChange={(e) => updateEditInvitee(idx, "name", e.target.value)}
                            placeholder="Name"
                            className="flex-1"
                            data-testid={`input-edit-invitee-name-${idx}`}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeEditInvitee(idx)}
                            data-testid={`button-remove-edit-invitee-${idx}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            value={inv.email}
                            onChange={(e) => updateEditInvitee(idx, "email", e.target.value)}
                            placeholder="Email"
                            className="flex-1"
                            data-testid={`input-edit-invitee-email-${idx}`}
                          />
                          <Input
                            value={inv.phone}
                            onChange={(e) => updateEditInvitee(idx, "phone", e.target.value)}
                            placeholder="Phone"
                            className="flex-1"
                            data-testid={`input-edit-invitee-phone-${idx}`}
                          />
                        </div>
                        <Select value={inv.notifyVia} onValueChange={(val) => updateEditInvitee(idx, "notifyVia", val)}>
                          <SelectTrigger className="w-full" data-testid={`select-edit-invitee-notify-${idx}`}>
                            <SelectValue placeholder="Notify via" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Notify via Email</SelectItem>
                            <SelectItem value="sms">Notify via SMS</SelectItem>
                            <SelectItem value="both">Notify via Both</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
          
          <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
            {!isEditing ? (
              <>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => selectedEvent && deleteEventMutation.mutate(selectedEvent.id)}
                  disabled={deleteEventMutation.isPending}
                  data-testid="button-delete-event"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => selectedEvent && enterEditMode(selectedEvent)} data-testid="button-edit-event">
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" onClick={() => setIsEventDialogOpen(false)} data-testid="button-close-event">
                    Close
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)} data-testid="button-cancel-edit">
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={updateEventMutation.isPending} data-testid="button-save-edit">
                  {updateEventMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isCreateCalendarOpen} onOpenChange={setIsCreateCalendarOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create New Calendar</DialogTitle>
            <DialogDescription>Add a new calendar to organize your events</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="calendarName">Calendar Name</Label>
              <Input
                id="calendarName"
                value={newCalendarName}
                onChange={(e) => setNewCalendarName(e.target.value)}
                placeholder="e.g., Personal, Work Cases"
                data-testid="input-calendar-name"
              />
            </div>
            <div>
              <Label htmlFor="calendarColor">Color</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  id="calendarColor"
                  value={newCalendarColor}
                  onChange={(e) => setNewCalendarColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                  data-testid="input-calendar-color"
                />
                <span className="text-sm text-muted-foreground">{newCalendarColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateCalendarOpen(false)} data-testid="button-cancel-calendar">
              Cancel
            </Button>
            <Button 
              onClick={() => createCalendarMutation.mutate({ name: newCalendarName, color: newCalendarColor })}
              disabled={!newCalendarName.trim() || createCalendarMutation.isPending}
              data-testid="button-save-calendar"
            >
              {createCalendarMutation.isPending ? "Creating..." : "Create Calendar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isConnectAccountsOpen} onOpenChange={setIsConnectAccountsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect External Calendar</DialogTitle>
            <DialogDescription>
              Sync your Google Calendar or Microsoft Outlook events with Sentinel Counsel
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-14"
                onClick={() => connectGoogleMutation.mutate()}
                disabled={!integrationStatus?.google.configured || connectGoogleMutation.isPending}
                data-testid="button-connect-google"
              >
                <SiGoogle className="w-5 h-5 text-red-500" />
                <div className="text-left">
                  <div className="font-medium">Google Calendar</div>
                  <div className="text-xs text-muted-foreground">
                    {integrationStatus?.google.configured 
                      ? "Connect your Google account" 
                      : "API not configured"}
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-14"
                onClick={() => connectMicrosoftMutation.mutate()}
                disabled={!integrationStatus?.microsoft.configured || connectMicrosoftMutation.isPending}
                data-testid="button-connect-microsoft"
              >
                <Mail className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <div className="font-medium">Microsoft Outlook</div>
                  <div className="text-xs text-muted-foreground">
                    {integrationStatus?.microsoft.configured 
                      ? "Connect your Microsoft account" 
                      : "API not configured"}
                  </div>
                </div>
              </Button>
            </div>

            {(!integrationStatus?.google.configured && !integrationStatus?.microsoft.configured) && (
              <div className="p-3 rounded-md bg-muted/50 text-sm">
                <p className="font-medium mb-1">Setup Required</p>
                <p className="text-muted-foreground text-xs">
                  To enable calendar sync, add your Google Calendar or Microsoft API credentials 
                  to your environment variables.
                </p>
              </div>
            )}

            {connectedAccounts.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Connected Accounts</h4>
                <div className="space-y-2">
                  {connectedAccounts.map(account => (
                    <div 
                      key={account.id}
                      className="flex items-center justify-between p-2 rounded bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        {account.provider === "google" ? (
                          <SiGoogle className="w-4 h-4 text-red-500" />
                        ) : (
                          <Mail className="w-4 h-4 text-blue-500" />
                        )}
                        <span className="text-sm">{account.providerEmail}</span>
                        <Badge 
                          variant={account.syncStatus === "active" ? "default" : "destructive"}
                          className="text-[10px]"
                        >
                          {account.syncStatus}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => disconnectAccountMutation.mutate(account.id)}
                        data-testid={`dialog-disconnect-${account.id}`}
                      >
                        <Unlink className="w-3 h-3 mr-1" />
                        Disconnect
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
            {connectedAccounts.length > 0 && (
              <Button
                variant="outline"
                onClick={() => syncCalendarMutation.mutate()}
                disabled={syncCalendarMutation.isPending}
                data-testid="button-dialog-sync"
              >
                <RefreshCw className={cn("w-4 h-4 mr-1", syncCalendarMutation.isPending && "animate-spin")} />
                {syncCalendarMutation.isPending ? "Syncing..." : "Sync Now"}
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsConnectAccountsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
