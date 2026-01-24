import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfDay, endOfDay, isToday, parseISO, setHours, setMinutes } from "date-fns";
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
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, Gavel, Users, FileText, AlertCircle, DollarSign, MapPin, Trash2, Edit2, X, Video, MonitorPlay, Brain, Upload, Camera, Image as ImageIcon, Loader2, Sparkles } from "lucide-react";
import { SiGooglemeet, SiZoom } from "react-icons/si";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { CalendarEvent, Case, Client, UserCalendar, ConnectedCalendarAccount } from "@shared/schema";
import { SiGoogle } from "react-icons/si";
import { Link2, Unlink, RefreshCw, Settings2, Mail, Phone, UserPlus, Send, ExternalLink } from "lucide-react";

type ViewType = "day" | "week" | "month" | "list";

interface CalendarWithEvents extends UserCalendar {
  eventCount?: number;
}

const eventTypeColors: Record<string, string> = {
  hearing: "bg-blue-500",
  deposition: "bg-purple-500",
  deadline: "bg-red-500",
  trial: "bg-orange-500",
  meeting: "bg-green-500",
  filing: "bg-yellow-500",
  mediation: "bg-teal-500",
  conference: "bg-indigo-500",
  other: "bg-gray-500",
};

const eventTypeIcons: Record<string, any> = {
  hearing: Gavel,
  deposition: Users,
  deadline: AlertCircle,
  trial: Gavel,
  meeting: Users,
  filing: FileText,
  mediation: Users,
  conference: Users,
  other: CalendarIcon,
};

export default function CalendarPage() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>("month");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [visibleCalendarIds, setVisibleCalendarIds] = useState<Set<string>>(new Set());
  const [isCreateCalendarOpen, setIsCreateCalendarOpen] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState("");
  const [newCalendarColor, setNewCalendarColor] = useState("#3b82f6");
  
  const [newEvent, setNewEvent] = useState({
    title: "",
    eventType: "none" as string,
    startTime: "",
    duration: "60" as string,
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
      return response as {
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
    if (view === "month") {
      const start = startOfWeek(startOfMonth(currentDate));
      const end = endOfWeek(endOfMonth(currentDate));
      return { startDate: start, endDate: end };
    } else if (view === "week") {
      return { startDate: startOfWeek(currentDate), endDate: endOfWeek(currentDate) };
    } else {
      return { startDate: startOfDay(currentDate), endDate: endOfDay(currentDate) };
    }
  }, [currentDate, view]);

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const response = await fetch(`/api/calendar/events?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
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
      return await apiRequest("POST", "/api/user-calendars", data) as unknown as UserCalendar;
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

  const sendInvitationsMutation = useMutation({
    mutationFn: async ({ eventId, invitees }: { eventId: string; invitees: typeof newEvent.invitees }) => {
      const response = await apiRequest("POST", `/api/calendar/events/${eventId}/send-invitations`, { invitees });
      return response;
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
      return response as CalendarEvent;
    },
    onSuccess: (createdEvent, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
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
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({ title: "Event deleted successfully" });
      setIsEventDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete event", description: error.message, variant: "destructive" });
    },
  });

  const resetNewEvent = () => {
    setNewEvent({
      title: "",
      eventType: "none",
      startTime: "",
      duration: "60",
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
      eventType: newEvent.eventType !== "none" ? newEvent.eventType : null,
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
    const dateStr = format(date, "yyyy-MM-dd");
    setNewEvent(prev => ({
      ...prev,
      startTime: `${dateStr}T09:00`,
      duration: "60",
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
                        const Icon = eventTypeIcons[event.eventType] || CalendarIcon;
                        return (
                          <div
                            key={event.id}
                            className={cn(
                              "text-xs p-1 rounded truncate text-white flex items-center gap-1 cursor-pointer",
                              eventTypeColors[event.eventType]
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventClick(event);
                            }}
                            data-testid={`event-${event.id}`}
                          >
                            <Icon className="w-3 h-3 flex-shrink-0" />
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
                          className={cn(
                            "absolute inset-x-0 mx-0.5 p-1 rounded text-xs text-white cursor-pointer",
                            eventTypeColors[event.eventType]
                          )}
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
                      const Icon = eventTypeIcons[event.eventType] || CalendarIcon;
                      return (
                        <div
                          key={event.id}
                          className={cn(
                            "p-2 rounded text-white cursor-pointer mb-1",
                            eventTypeColors[event.eventType]
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
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
                      const Icon = eventTypeIcons[event.eventType] || CalendarIcon;
                      return (
                        <div
                          key={event.id}
                          className="flex items-start gap-4 p-3 rounded-lg border hover-elevate cursor-pointer"
                          onClick={() => handleEventClick(event)}
                          data-testid={`list-event-${event.id}`}
                        >
                          <div className={cn("p-2 rounded text-white flex-shrink-0", eventTypeColors[event.eventType])}>
                            <Icon className="w-5 h-5" />
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
                          <div className="flex-shrink-0 flex flex-col items-end gap-1">
                            <Badge variant="outline" className="capitalize text-xs">{event.eventType}</Badge>
                            {event.isBillable && (
                              <Badge variant="secondary" className="text-xs">
                                <DollarSign className="w-3 h-3 mr-1" />
                                {event.estimatedHours || 0}h
                              </Badge>
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

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">Manage hearings, depositions, deadlines, and court dates</p>
        </div>
        <Button onClick={() => {
          const now = new Date();
          const dateStr = format(now, "yyyy-MM-dd");
          setNewEvent(prev => ({
            ...prev,
            startTime: `${dateStr}T09:00`,
            endTime: `${dateStr}T10:00`,
          }));
          setIsCreateDialogOpen(true);
        }} data-testid="button-create-event">
          <Plus className="w-4 h-4 mr-2" />
          New Event
        </Button>
      </div>
      <div className="flex-1 flex gap-4 min-h-0">
        <div className="w-64 flex-shrink-0 space-y-4">
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
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={() => setIsConnectAccountsOpen(true)}
                data-testid="button-connect-calendar"
              >
                <Link2 className="w-3 h-3" />
              </Button>
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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Event Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(eventTypeColors).map(([type, color]) => {
                const Icon = eventTypeIcons[type];
                return (
                  <div key={type} className="flex items-center gap-2 text-sm">
                    <div className={cn("w-3 h-3 rounded", color)} />
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="capitalize">{type}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

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
                <Label htmlFor="eventType">Event Type</Label>
                <Select value={newEvent.eventType} onValueChange={(v) => setNewEvent(prev => ({ ...prev, eventType: v as any }))}>
                  <SelectTrigger data-testid="select-event-type">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">No type</span>
                    </SelectItem>
                    <SelectItem value="hearing">Hearing</SelectItem>
                    <SelectItem value="deposition">Deposition</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="filing">Filing</SelectItem>
                    <SelectItem value="mediation">Mediation</SelectItem>
                    <SelectItem value="conference">Conference</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
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
                <Label htmlFor="duration">Duration *</Label>
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
                <Label htmlFor="calendarId">Calendar</Label>
                <Select value={newEvent.calendarId} onValueChange={(v) => setNewEvent(prev => ({ ...prev, calendarId: v }))}>
                  <SelectTrigger data-testid="select-calendar">
                    <SelectValue placeholder="Select a calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No calendar</SelectItem>
                    {userCalendars.map(cal => (
                      <SelectItem key={cal.id} value={cal.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cal.color }} />
                          {cal.name}
                        </div>
                      </SelectItem>
                    ))}
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

              {(newEvent.eventType === "hearing" || newEvent.eventType === "trial") && (
                <>
                  <div>
                    <Label htmlFor="courtName">Court Name</Label>
                    <Input
                      id="courtName"
                      value={newEvent.courtName}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, courtName: e.target.value }))}
                      placeholder="e.g., Superior Court of California"
                      data-testid="input-court-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="judgeName">Judge Name</Label>
                    <Input
                      id="judgeName"
                      value={newEvent.judgeName}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, judgeName: e.target.value }))}
                      placeholder="e.g., Hon. Jane Smith"
                      data-testid="input-judge-name"
                    />
                  </div>
                </>
              )}

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

              <div className="col-span-2 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isBillable"
                    checked={newEvent.isBillable}
                    onCheckedChange={(v) => setNewEvent(prev => ({ ...prev, isBillable: !!v }))}
                    data-testid="checkbox-billable"
                  />
                  <Label htmlFor="isBillable" className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    Billable Time
                  </Label>
                </div>
                
                {newEvent.isBillable && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="estimatedHours">Hours:</Label>
                    <Input
                      id="estimatedHours"
                      type="number"
                      step="0.1"
                      min="0"
                      className="w-20"
                      value={newEvent.estimatedHours}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, estimatedHours: parseFloat(e.target.value) || 0 }))}
                      data-testid="input-estimated-hours"
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="reminder">Reminder</Label>
                <Select value={String(newEvent.reminderMinutes)} onValueChange={(v) => setNewEvent(prev => ({ ...prev, reminderMinutes: parseInt(v) }))}>
                  <SelectTrigger data-testid="select-reminder">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No reminder</SelectItem>
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
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && eventTypeIcons[selectedEvent.eventType] && (
                <span className={cn("p-1.5 rounded text-white", eventTypeColors[selectedEvent.eventType])}>
                  {(() => { const Icon = eventTypeIcons[selectedEvent.eventType]; return <Icon className="w-4 h-4" />; })()}
                </span>
              )}
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  {format(new Date(selectedEvent.startTime), "EEEE, MMMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  {format(new Date(selectedEvent.startTime), "h:mm a")} - {format(new Date(selectedEvent.endTime), "h:mm a")}
                </span>
              </div>
              
              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
              
              {selectedEvent.courtName && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Gavel className="w-4 h-4" />
                  <span>{selectedEvent.courtName}</span>
                  {selectedEvent.judgeName && <span>({selectedEvent.judgeName})</span>}
                </div>
              )}
              
              {/* Video Meeting Quick Start */}
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
                        {selectedEvent.enableAmbientIntelligence && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Brain className="w-3 h-3" />
                            Ambient Intelligence enabled
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        // Use absolute URL with meetingRoomId for consistent meeting links
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
                  <p className="text-sm">{selectedEvent.description}</p>
                </div>
              )}
              
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="capitalize">{selectedEvent.eventType}</Badge>
                {selectedEvent.isBillable && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {selectedEvent.estimatedHours || 0}h
                  </Badge>
                )}
              </div>
              
              {/* Invitees Section */}
              {selectedEvent.externalAttendees && selectedEvent.externalAttendees.length > 0 && (
                <div className="pt-2 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Invitees ({selectedEvent.externalAttendees.length})
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        // Use stored inviteeNotifications to preserve preferences
                        const storedNotifications = (selectedEvent as any).inviteeNotifications || [];
                        const invitees = selectedEvent.externalAttendees?.map((a, idx) => {
                          const notification = storedNotifications[idx];
                          return {
                            name: a.name,
                            email: a.email || notification?.email || "",
                            phone: notification?.phone || "",
                            notifyVia: (notification?.method as "email" | "sms" | "both") || "email"
                          };
                        }) || [];
                        sendInvitationsMutation.mutate({ eventId: selectedEvent.id, invitees });
                      }}
                      disabled={sendInvitationsMutation.isPending}
                      data-testid="button-resend-invitations"
                    >
                      <Send className="w-4 h-4 mr-1" />
                      {sendInvitationsMutation.isPending ? "Sending..." : "Resend"}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.externalAttendees.map((attendee, idx) => (
                      <Badge key={idx} variant="secondary" className="flex items-center gap-1" data-testid={`badge-invitee-${idx}`}>
                        <Users className="w-3 h-3" />
                        {attendee.name || attendee.email}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="flex-row justify-between sm:justify-between">
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
            <Button variant="outline" onClick={() => setIsEventDialogOpen(false)} data-testid="button-close-event">
              Close
            </Button>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConnectAccountsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
