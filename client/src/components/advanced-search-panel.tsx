import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const STORAGE_KEY_EXPANDED = 'sentinel_advanced_search_expanded';

interface AdvancedSearchPanelProps {
  activeFilterCount?: number;
  onClearAll?: () => void;
  children?: React.ReactNode;
}

export function AdvancedSearchPanel({
  activeFilterCount = 0,
  onClearAll,
  children,
}: AdvancedSearchPanelProps) {
  // Safely initialize from localStorage (client-side only)
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_EXPANDED);
      return stored === 'true';
    }
    return false;
  });

  // Persist expanded state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_EXPANDED, String(isOpen));
    }
  }, [isOpen]);

  // Global keyboard shortcut handler (Shift + A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-full border-b bg-card"
      data-testid="advanced-search-panel"
    >
      <div className="flex items-center justify-between px-4 py-2 hover-elevate">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            data-testid="button-toggle-advanced-search"
          >
            <Search className="h-4 w-4" />
            <span className="font-medium">Advanced Search</span>
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <>
              <Badge variant="secondary" data-testid="badge-active-filter-count">
                {activeFilterCount} active filter{activeFilterCount !== 1 ? 's' : ''}
              </Badge>
              {onClearAll && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  className="gap-1"
                  data-testid="button-clear-all-advanced-filters"
                >
                  <X className="h-3 w-3" />
                  Clear All
                </Button>
              )}
            </>
          )}
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⇧</span>A
          </kbd>
        </div>
      </div>

      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="border-t p-4" data-testid="advanced-search-content">
          {children || (
            <div className="text-sm text-muted-foreground text-center py-4">
              Advanced filters will appear here
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
