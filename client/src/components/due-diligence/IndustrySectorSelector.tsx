import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Search, Building2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface IndustrySector {
  id: string;
  name: string;
  description: string;
  parentSectorId: string | null;
  displayOrder: number;
  children?: IndustrySector[];
}

interface IndustrySectorSelectorProps {
  selectedSectorId: string | null;
  onSelect: (sector: IndustrySector) => void;
}

export function IndustrySectorSelector({ selectedSectorId, onSelect }: IndustrySectorSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSectors, setExpandedSectors] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery<{ sectors: IndustrySector[] }>({
    queryKey: ["/api/due-diligence/industry-sectors"]
  });

  const filteredSectors = useMemo(() => {
    if (!data?.sectors) return [];
    if (!searchQuery.trim()) return data.sectors;

    const query = searchQuery.toLowerCase();
    return data.sectors.map(parent => {
      const matchingChildren = parent.children?.filter(
        child => child.name.toLowerCase().includes(query) || child.description?.toLowerCase().includes(query)
      ) || [];
      
      const parentMatches = parent.name.toLowerCase().includes(query) || parent.description?.toLowerCase().includes(query);
      
      if (parentMatches || matchingChildren.length > 0) {
        return {
          ...parent,
          children: parentMatches ? parent.children : matchingChildren
        };
      }
      return null;
    }).filter(Boolean) as IndustrySector[];
  }, [data?.sectors, searchQuery]);

  const toggleSector = (sectorId: string) => {
    setExpandedSectors(prev => ({
      ...prev,
      [sectorId]: !prev[sectorId]
    }));
  };

  const isChildSelected = (parent: IndustrySector) => {
    return parent.children?.some(c => c.id === selectedSectorId) || parent.id === selectedSectorId;
  };

  if (isLoading) {
    return (
      <Card data-testid="card-industry-sectors-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Industry Sector
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-industry-sectors">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Industry Sector
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search industries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-industry-search"
          />
        </div>

        <RadioGroup value={selectedSectorId || ""} className="space-y-2">
          {filteredSectors.map(parent => {
            const isExpanded = expandedSectors[parent.id] || searchQuery.trim().length > 0;
            const hasChildren = parent.children && parent.children.length > 0;
            const isSelected = isChildSelected(parent);

            return (
              <Collapsible key={parent.id} open={isExpanded}>
                <div className="flex items-center gap-2">
                  {hasChildren ? (
                    <CollapsibleTrigger 
                      onClick={() => toggleSector(parent.id)}
                      className="p-1 hover-elevate rounded"
                      data-testid={`button-expand-${parent.id}`}
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </CollapsibleTrigger>
                  ) : (
                    <div className="w-6" />
                  )}
                  <div
                    className={cn(
                      "flex-1 flex items-center gap-3 p-3 rounded-md cursor-pointer hover-elevate transition-colors",
                      selectedSectorId === parent.id && "bg-primary/10 ring-1 ring-primary/20"
                    )}
                    onClick={() => onSelect(parent)}
                    data-testid={`option-sector-${parent.id}`}
                  >
                    <RadioGroupItem value={parent.id} id={parent.id} />
                    <div className="flex-1">
                      <Label htmlFor={parent.id} className="font-medium cursor-pointer">
                        {parent.name}
                      </Label>
                      {parent.description && (
                        <p className="text-sm text-muted-foreground">{parent.description}</p>
                      )}
                    </div>
                    {hasChildren && <Badge variant="secondary">{parent.children?.length}</Badge>}
                    {isSelected && !hasChildren && <Check className="h-4 w-4 text-primary" />}
                  </div>
                </div>

                {hasChildren && (
                  <CollapsibleContent className="pl-10 space-y-1 mt-1">
                    {parent.children?.map(child => (
                      <div
                        key={child.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-md cursor-pointer hover-elevate transition-colors",
                          selectedSectorId === child.id && "bg-primary/10 ring-1 ring-primary/20"
                        )}
                        onClick={() => onSelect(child)}
                        data-testid={`option-sector-${child.id}`}
                      >
                        <RadioGroupItem value={child.id} id={child.id} />
                        <div className="flex-1">
                          <Label htmlFor={child.id} className="cursor-pointer">
                            {child.name}
                          </Label>
                          {child.description && (
                            <p className="text-sm text-muted-foreground">{child.description}</p>
                          )}
                        </div>
                        {selectedSectorId === child.id && <Check className="h-4 w-4 text-primary" />}
                      </div>
                    ))}
                  </CollapsibleContent>
                )}
              </Collapsible>
            );
          })}

          {filteredSectors.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No industries found matching "{searchQuery}"
            </div>
          )}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
