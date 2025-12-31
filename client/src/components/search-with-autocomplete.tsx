import { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';

interface SearchSuggestion {
  type: 'person' | 'tag' | 'custodian' | 'domain' | 'query';
  value: string;
  label: string;
  count?: number;
}

interface SearchWithAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  placeholder?: string;
  caseId?: number;
}

export function SearchWithAutocomplete({
  value,
  onChange,
  onSearch,
  placeholder = "Search documents...",
  caseId,
}: SearchWithAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedValue, setDebouncedValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search input for autocomplete
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
      // Close popover if query is too short
      if (value.length < 2) {
        setIsOpen(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  // Fetch autocomplete suggestions
  const { data: suggestions, isLoading } = useQuery<SearchSuggestion[]>({
    queryKey: ['/api/search/autocomplete', caseId, debouncedValue],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('query', debouncedValue);
      if (caseId) params.set('caseId', caseId.toString());
      
      const response = await fetch(`/api/search/autocomplete?${params.toString()}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }
      
      return response.json();
    },
    enabled: debouncedValue.length >= 2 && isOpen,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Global keyboard shortcut handler (/)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = (suggestion: SearchSuggestion) => {
    // Build query based on suggestion type
    let query = '';
    switch (suggestion.type) {
      case 'person':
        query = `from:"${suggestion.value}" OR to:"${suggestion.value}"`;
        break;
      case 'tag':
        query = `tag:"${suggestion.value}"`;
        break;
      case 'custodian':
        query = `custodian:"${suggestion.value}"`;
        break;
      case 'domain':
        query = `domain:${suggestion.value}`;
        break;
      default:
        query = suggestion.value;
    }
    onChange(query);
    setIsOpen(false);
    onSearch?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isOpen) {
      e.preventDefault();
      onSearch?.();
    }
  };

  return (
    <div className="relative flex-1">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                if (e.target.value.length >= 2) {
                  setIsOpen(true);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="pl-9 pr-16"
              data-testid="input-search-autocomplete"
            />
            <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              /
            </kbd>
          </div>
        </PopoverTrigger>

        <PopoverContent
          className="p-0 w-[400px]"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : suggestions && suggestions.length > 0 ? (
                <>
                  {suggestions.filter(s => s.type === 'person').length > 0 && (
                    <CommandGroup heading="People">
                      {suggestions
                        .filter(s => s.type === 'person')
                        .map((suggestion, idx) => (
                          <CommandItem
                            key={`person-${idx}`}
                            onSelect={() => handleSelect(suggestion)}
                            data-testid={`autocomplete-person-${idx}`}
                          >
                            <span className="flex-1">{suggestion.label}</span>
                            {suggestion.count && (
                              <Badge variant="secondary" className="text-xs">
                                {suggestion.count}
                              </Badge>
                            )}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  )}

                  {suggestions.filter(s => s.type === 'tag').length > 0 && (
                    <CommandGroup heading="Tags">
                      {suggestions
                        .filter(s => s.type === 'tag')
                        .map((suggestion, idx) => (
                          <CommandItem
                            key={`tag-${idx}`}
                            onSelect={() => handleSelect(suggestion)}
                            data-testid={`autocomplete-tag-${idx}`}
                          >
                            <span className="flex-1">{suggestion.label}</span>
                            {suggestion.count && (
                              <Badge variant="secondary" className="text-xs">
                                {suggestion.count}
                              </Badge>
                            )}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  )}

                  {suggestions.filter(s => s.type === 'custodian').length > 0 && (
                    <CommandGroup heading="Custodians">
                      {suggestions
                        .filter(s => s.type === 'custodian')
                        .map((suggestion, idx) => (
                          <CommandItem
                            key={`custodian-${idx}`}
                            onSelect={() => handleSelect(suggestion)}
                            data-testid={`autocomplete-custodian-${idx}`}
                          >
                            <span className="flex-1">{suggestion.label}</span>
                            {suggestion.count && (
                              <Badge variant="secondary" className="text-xs">
                                {suggestion.count}
                              </Badge>
                            )}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  )}

                  {suggestions.filter(s => s.type === 'domain').length > 0 && (
                    <CommandGroup heading="Domains">
                      {suggestions
                        .filter(s => s.type === 'domain')
                        .map((suggestion, idx) => (
                          <CommandItem
                            key={`domain-${idx}`}
                            onSelect={() => handleSelect(suggestion)}
                            data-testid={`autocomplete-domain-${idx}`}
                          >
                            <span className="flex-1">{suggestion.label}</span>
                            {suggestion.count && (
                              <Badge variant="secondary" className="text-xs">
                                {suggestion.count}
                              </Badge>
                            )}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  )}
                </>
              ) : (
                <CommandEmpty>
                  {debouncedValue.length < 2 
                    ? "Type to search..." 
                    : "No suggestions found"}
                </CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
