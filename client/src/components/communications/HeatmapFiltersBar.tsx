import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Filter, RotateCcw, User, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type HeatmapView = "time" | "people" | "orgs" | "topics" | "anomalies";

export interface PersonOption {
  email: string;
  name?: string;
  totalMessages: number;
}

export interface HeatmapFilters {
  view: HeatmapView;
  dateFrom?: Date;
  dateTo?: Date;
  topN?: number;
  selectedPerson?: string;
}

interface HeatmapFiltersBarProps {
  filters: HeatmapFilters;
  onFiltersChange: (filters: HeatmapFilters) => void;
  onRefresh?: () => void;
  loading?: boolean;
  personOptions?: PersonOption[];
}

export function HeatmapFiltersBar({
  filters,
  onFiltersChange,
  onRefresh,
  loading = false,
  personOptions = [],
}: HeatmapFiltersBarProps) {
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);

  const handleViewChange = (view: string) => {
    onFiltersChange({ ...filters, view: view as HeatmapView, selectedPerson: undefined });
  };

  const handleDateFromChange = (date: Date | undefined) => {
    onFiltersChange({ ...filters, dateFrom: date });
    setDateFromOpen(false);
  };

  const handleDateToChange = (date: Date | undefined) => {
    onFiltersChange({ ...filters, dateTo: date });
    setDateToOpen(false);
  };

  const handleTopNChange = (value: string) => {
    onFiltersChange({ ...filters, topN: parseInt(value, 10) });
  };

  const handlePersonChange = (value: string) => {
    onFiltersChange({ ...filters, selectedPerson: value === "all" ? undefined : value.toLowerCase() });
  };

  const handleClearPerson = () => {
    onFiltersChange({ ...filters, selectedPerson: undefined });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      view: filters.view,
      dateFrom: undefined,
      dateTo: undefined,
      topN: undefined,
      selectedPerson: undefined,
    });
  };

  const getPersonName = (email: string): string => {
    const atIndex = email.indexOf("@");
    if (atIndex > 0) {
      return email.slice(0, atIndex)
        .replace(/[._-]/g, " ")
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
    return email;
  };

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-card rounded-lg border">
      <div className="flex items-center gap-2">
        <Label htmlFor="view-select" className="text-sm font-medium">
          View:
        </Label>
        <Select value={filters.view} onValueChange={handleViewChange}>
          <SelectTrigger id="view-select" className="w-40" data-testid="select-heatmap-view">
            <SelectValue placeholder="Select view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="time">Time Patterns</SelectItem>
            <SelectItem value="people">People Matrix</SelectItem>
            <SelectItem value="orgs">Organizations</SelectItem>
            <SelectItem value="topics">Topics</SelectItem>
            <SelectItem value="anomalies">Anomalies</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">From:</Label>
        <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-32 justify-start text-left font-normal",
                !filters.dateFrom && "text-muted-foreground"
              )}
              data-testid="button-date-from"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateFrom ? format(filters.dateFrom, "MMM d, yy") : "Start"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.dateFrom}
              onSelect={handleDateFromChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">To:</Label>
        <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-32 justify-start text-left font-normal",
                !filters.dateTo && "text-muted-foreground"
              )}
              data-testid="button-date-to"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateTo ? format(filters.dateTo, "MMM d, yy") : "End"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.dateTo}
              onSelect={handleDateToChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {filters.view === "time" && personOptions.length > 0 && (
        <div className="flex items-center gap-2">
          <Label htmlFor="person-select" className="text-sm font-medium">
            <User className="h-4 w-4 inline mr-1" />
            Person:
          </Label>
          <Select 
            value={filters.selectedPerson || "all"} 
            onValueChange={handlePersonChange}
          >
            <SelectTrigger id="person-select" className="w-48" data-testid="select-person-filter">
              <SelectValue placeholder="All People" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All People</SelectItem>
              {personOptions.map((person) => (
                <SelectItem key={person.email} value={person.email}>
                  <span className="truncate">{getPersonName(person.email)}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({person.totalMessages})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filters.selectedPerson && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleClearPerson}
              data-testid="button-clear-person"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {(filters.view === "people" || filters.view === "orgs" || filters.view === "topics") && (
        <div className="flex items-center gap-2">
          <Label htmlFor="topn-select" className="text-sm font-medium">
            Top:
          </Label>
          <Select 
            value={filters.topN?.toString() || "20"} 
            onValueChange={handleTopNChange}
          >
            <SelectTrigger id="topn-select" className="w-20" data-testid="select-top-n">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="15">15</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center gap-2 ml-auto">
        {(filters.dateFrom || filters.dateTo || filters.selectedPerson) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            data-testid="button-clear-filters"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            data-testid="button-refresh-heatmap"
          >
            <Filter className="h-4 w-4 mr-1" />
            {loading ? "Loading..." : "Refresh"}
          </Button>
        )}
      </div>
    </div>
  );
}
