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
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, Gavel, Users, FileText, AlertCircle, DollarSign, MapPin, Trash2, Edit2, X } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { CalendarEvent, Case, Client, UserCalendar } from "@shared/schema";

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
    eventType: "meeting" as string,
    startTime: "",
    endTime: "",
    description: "",
    location: "",
    courtName: "",
    judgeName: "",
    caseId: "none",
    clientId: "none",
    calendarId: "none",
    isBillable: false,
    estimatedHours: 0,
    isAllDay: false,
    reminderMinutes: 30,
  });

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
      return await apiRequest("POST", "/api/user-calendars", data);
    },
    onSuccess: (newCal) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-calendars"] });
      toast({ title: "Calendar created" });
      setIsCreateCalendarOpen(false);
      setNewCalendarName("");
      setNewCalendarColor("#3b82f6");
      // Add new calendar to visible set
      setVisibleCalendarIds(prev => new Set([...prev, newCal.id]));
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

  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const response = await apiRequest("POST", "/api/calendar/events", eventData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({ title: "Event created successfully" });
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
      eventType: "meeting",
      startTime: "",
      endTime: "",
      description: "",
      location: "",
      courtName: "",
      judgeName: "",
      caseId: "none",
      clientId: "none",
      calendarId: userCalendars.find(c => c.isDefault)?.id || "none",
      isBillable: false,
      estimatedHours: 0,
      isAllDay: false,
      reminderMinutes: 30,
    });
  };

  const handleCreateEvent = () => {
    if (!newEvent.title || !newEvent.startTime || !newEvent.endTime) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }
    createEventMutation.mutate({
      ...newEvent,
      startTime: new Date(newEvent.startTime).toISOString(),
      endTime: new Date(newEvent.endTime).toISOString(),
      caseId: newEvent.caseId && newEvent.caseId !== "none" ? newEvent.caseId : null,
      clientId: newEvent.clientId && newEvent.clientId !== "none" ? newEvent.clientId : null,
      calendarId: newEvent.calendarId && newEvent.calendarId !== "none" ? newEvent.calendarId : null,
    });
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dateStr = format(date, "yyyy-MM-dd");
    setNewEvent(prev => ({
      ...prev,
      startTime: `${dateStr}T09:00`,
      endTime: `${dateStr}T10:00`,
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
          <h1 className="text-2xl font-bold">Legal Calendar</h1>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <Label htmlFor="eventType">Event Type *</Label>
                <Select value={newEvent.eventType} onValueChange={(v) => setNewEvent(prev => ({ ...prev, eventType: v as any }))}>
                  <SelectTrigger data-testid="select-event-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={newEvent.endTime}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, endTime: e.target.value }))}
                  data-testid="input-end-time"
                />
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
    </div>
  );
}
