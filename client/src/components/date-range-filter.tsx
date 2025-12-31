import { useState } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfDay, isBefore } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateRangeFilterProps {
  dateFrom?: Date;
  dateTo?: Date;
  onDateFromChange: (date: Date | undefined) => void;
  onDateToChange: (date: Date | undefined) => void;
  onClear: () => void;
  sortOrder?: 'asc' | 'desc';
  onSortOrderChange?: (order: 'asc' | 'desc') => void;
}

type PresetRange = {
  label: string;
  getValue: () => { from: Date; to: Date };
};

const presetRanges: PresetRange[] = [
  {
    label: 'Today',
    getValue: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { from: today, to: end };
    },
  },
  {
    label: 'Last 7 Days',
    getValue: () => ({
      from: subDays(new Date(), 6),
      to: new Date(),
    }),
  },
  {
    label: 'Last 30 Days',
    getValue: () => ({
      from: subDays(new Date(), 29),
      to: new Date(),
    }),
  },
  {
    label: 'This Month',
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: 'Last Month',
    getValue: () => {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      };
    },
  },
  {
    label: 'This Year',
    getValue: () => ({
      from: startOfYear(new Date()),
      to: endOfYear(new Date()),
    }),
  },
];

export function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onClear,
  sortOrder,
  onSortOrderChange,
}: DateRangeFilterProps) {
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const hasFilters = dateFrom || dateTo;

  const handlePresetClick = (preset: PresetRange) => {
    const { from, to } = preset.getValue();
    onDateFromChange(from);
    onDateToChange(to);
  };

  // Normalize "From" date to start of day (00:00:00.000)
  const handleFromDateSelect = (date: Date | undefined) => {
    if (date) {
      const normalized = new Date(date);
      normalized.setHours(0, 0, 0, 0);
      onDateFromChange(normalized);
    } else {
      onDateFromChange(undefined);
    }
    setFromOpen(false);
  };

  // Normalize "To" date to end of day (23:59:59.999)
  const handleToDateSelect = (date: Date | undefined) => {
    if (date) {
      const normalized = new Date(date);
      normalized.setHours(23, 59, 59, 999);
      onDateToChange(normalized);
    } else {
      onDateToChange(undefined);
    }
    setToOpen(false);
  };

  return (
    <div className="space-y-3" data-testid="date-range-filter">
      {/* Preset Buttons */}
      <div>
        <label className="text-sm font-medium mb-2 block">Quick Select</label>
        <div className="flex flex-wrap gap-2">
          {presetRanges.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              onClick={() => handlePresetClick(preset)}
              data-testid={`button-preset-${preset.label.toLowerCase().replace(/\s+/g, '-')}`}
              className="hover-elevate active-elevate-2"
            >
              {preset.label}
            </Button>
          ))}
          {onSortOrderChange && (
            <>
              <Button
                variant={sortOrder === 'asc' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSortOrderChange('asc')}
                data-testid="button-sort-oldest-first"
                className="hover-elevate active-elevate-2"
              >
                Oldest First
              </Button>
              <Button
                variant={sortOrder === 'desc' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSortOrderChange('desc')}
                data-testid="button-sort-newest-first"
                className="hover-elevate active-elevate-2"
              >
                Newest First
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Custom Date Pickers */}
      <div>
        <label className="text-sm font-medium mb-2 block">Custom Range</label>
        <div className="flex flex-col sm:flex-row gap-2">
          {/* From Date */}
          <Popover open={fromOpen} onOpenChange={setFromOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'justify-start text-left font-normal flex-1 hover-elevate active-elevate-2',
                  !dateFrom && 'text-muted-foreground'
                )}
                data-testid="button-date-from"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, 'PPP') : 'From date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={handleFromDateSelect}
                initialFocus
                data-testid="calendar-date-from"
              />
            </PopoverContent>
          </Popover>

          {/* To Date */}
          <Popover open={toOpen} onOpenChange={setToOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'justify-start text-left font-normal flex-1 hover-elevate active-elevate-2',
                  !dateTo && 'text-muted-foreground'
                )}
                data-testid="button-date-to"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, 'PPP') : 'To date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={handleToDateSelect}
                disabled={(date) => {
                  if (!dateFrom) return false;
                  // Compare calendar days, not exact timestamps
                  // This allows selecting the same day for From and To
                  return isBefore(startOfDay(date), startOfDay(dateFrom));
                }}
                initialFocus
                data-testid="calendar-date-to"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Clear Button */}
      {hasFilters && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="gap-1"
            data-testid="button-clear-date-range"
          >
            <X className="h-3 w-3" />
            Clear Date Range
          </Button>
        </div>
      )}
    </div>
  );
}
