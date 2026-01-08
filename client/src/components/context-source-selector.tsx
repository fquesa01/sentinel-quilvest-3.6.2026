import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Briefcase, 
  Building2, 
  FileText, 
  FolderOpen,
  Search,
  Scale
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Case } from "@shared/schema";

export type ContextType = "case" | "transaction" | "pe_deal" | "data_room";

export interface ContextSource {
  type: ContextType;
  id: string;
  name: string;
  subtitle?: string;
}

interface ContextSourceSelectorProps {
  value?: ContextSource | null;
  onChange: (source: ContextSource | null) => void;
  placeholder?: string;
  showSearch?: boolean;
  allowedTypes?: ContextType[];
  className?: string;
}

type Deal = {
  id: string;
  dealNumber: string;
  title: string;
  dealType: string;
  status: string;
};

type PEDeal = {
  id: string;
  name: string;
  codeName?: string;
  status: string;
  sector: string;
};

type DataRoom = {
  id: string;
  name: string;
  dealId?: string;
  description?: string;
  isActive: boolean;
};

const typeIcons: Record<ContextType, typeof Briefcase> = {
  case: Scale,
  transaction: Briefcase,
  pe_deal: Building2,
  data_room: FolderOpen,
};

const typeLabels: Record<ContextType, string> = {
  case: "Investigations",
  transaction: "Business Transactions",
  pe_deal: "PE Deals",
  data_room: "Data Rooms",
};

const typeColors: Record<ContextType, string> = {
  case: "bg-blue-500/10 text-blue-500",
  transaction: "bg-green-500/10 text-green-500",
  pe_deal: "bg-purple-500/10 text-purple-500",
  data_room: "bg-orange-500/10 text-orange-500",
};

export function ContextSourceSelector({
  value,
  onChange,
  placeholder = "Select context source...",
  showSearch = true,
  allowedTypes = ["case", "transaction", "pe_deal", "data_room"],
  className,
}: ContextSourceSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: cases = [] } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
    enabled: allowedTypes.includes("case"),
  });

  const { data: transactions = [] } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
    enabled: allowedTypes.includes("transaction"),
  });

  const { data: peDeals = [] } = useQuery<PEDeal[]>({
    queryKey: ["/api/pe/deals"],
    enabled: allowedTypes.includes("pe_deal"),
  });

  const { data: dataRooms = [] } = useQuery<DataRoom[]>({
    queryKey: ["/api/data-rooms"],
    enabled: allowedTypes.includes("data_room"),
  });

  const allSources = useMemo(() => {
    const sources: ContextSource[] = [];

    if (allowedTypes.includes("case")) {
      cases.forEach((c) => {
        sources.push({
          type: "case",
          id: c.id,
          name: c.title || `CASE-${c.caseNumber}`,
          subtitle: c.caseNumber,
        });
      });
    }

    if (allowedTypes.includes("transaction")) {
      transactions.forEach((d) => {
        sources.push({
          type: "transaction",
          id: d.id,
          name: d.title,
          subtitle: d.dealNumber,
        });
      });
    }

    if (allowedTypes.includes("pe_deal")) {
      peDeals.forEach((d) => {
        sources.push({
          type: "pe_deal",
          id: d.id,
          name: d.name,
          subtitle: d.codeName || d.sector,
        });
      });
    }

    if (allowedTypes.includes("data_room")) {
      dataRooms.filter(dr => dr.isActive).forEach((dr) => {
        sources.push({
          type: "data_room",
          id: dr.id,
          name: dr.name,
          subtitle: dr.description || "Virtual Data Room",
        });
      });
    }

    return sources;
  }, [cases, transactions, peDeals, dataRooms, allowedTypes]);

  const filteredSources = useMemo(() => {
    if (!searchQuery.trim()) return allSources;
    const query = searchQuery.toLowerCase();
    return allSources.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        (s.subtitle?.toLowerCase().includes(query) ?? false)
    );
  }, [allSources, searchQuery]);

  const groupedSources = useMemo(() => {
    const groups: Record<ContextType, ContextSource[]> = {
      case: [],
      transaction: [],
      pe_deal: [],
      data_room: [],
    };

    filteredSources.forEach((source) => {
      if (groups[source.type]) {
        groups[source.type].push(source);
      }
    });

    return groups;
  }, [filteredSources]);

  const handleSelect = (compositeValue: string) => {
    if (compositeValue === "none") {
      onChange(null);
      return;
    }
    const [type, id] = compositeValue.split("::") as [ContextType, string];
    const source = allSources.find((s) => s.type === type && s.id === id);
    if (source) {
      onChange(source);
    }
  };

  const currentValue = value ? `${value.type}::${value.id}` : "none";

  const getDisplayValue = () => {
    if (!value) return placeholder;
    const Icon = typeIcons[value.type];
    return (
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{value.name}</span>
        <Badge variant="outline" className={`shrink-0 text-xs ${typeColors[value.type]}`}>
          {typeLabels[value.type].split(" ")[0]}
        </Badge>
      </div>
    );
  };

  return (
    <Select value={currentValue} onValueChange={handleSelect}>
      <SelectTrigger className={className} data-testid="select-context-source">
        <SelectValue placeholder={placeholder}>
          {getDisplayValue()}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[400px]">
        {showSearch && (
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
                data-testid="input-context-search"
              />
            </div>
          </div>
        )}
        <ScrollArea className="max-h-[300px]">
          <SelectItem value="none" data-testid="option-no-context">
            <span className="text-muted-foreground">No context linked</span>
          </SelectItem>

          {allowedTypes.map((type) => {
            const sources = groupedSources[type];
            if (sources.length === 0) return null;

            const Icon = typeIcons[type];
            return (
              <SelectGroup key={type}>
                <SelectLabel className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <Icon className="h-3 w-3" />
                  {typeLabels[type]}
                </SelectLabel>
                {sources.map((source) => (
                  <SelectItem
                    key={`${source.type}::${source.id}`}
                    value={`${source.type}::${source.id}`}
                    data-testid={`option-${source.type}-${source.id}`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium truncate max-w-[280px]">{source.name}</span>
                      {source.subtitle && (
                        <span className="text-xs text-muted-foreground truncate max-w-[280px]">
                          {source.subtitle}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            );
          })}

          {filteredSources.length === 0 && searchQuery && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No results found for "{searchQuery}"
            </div>
          )}
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}

export function getContextTypeLabel(type: ContextType): string {
  return typeLabels[type];
}

export function getContextTypeIcon(type: ContextType) {
  return typeIcons[type];
}
