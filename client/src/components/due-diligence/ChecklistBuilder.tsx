import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2, Search, CheckSquare, Sparkles, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { nanoid } from "nanoid";

interface ChecklistItem {
  id: string;
  itemText: string;
  itemDescription?: string;
  isRequired: boolean;
  isIndustrySpecific?: boolean;
  source?: string;
}

interface ChecklistSection {
  id: string;
  name: string;
  description?: string;
  isLiveSearch: boolean;
  items: ChecklistItem[];
  isExpanded: boolean;
}

interface ChecklistBuilderProps {
  transactionTypeId: string | null;
  industrySectorId: string | null;
  onChecklistChange: (sections: ChecklistSection[]) => void;
}

function SortableItem({ item, sectionId, onToggleRequired, onRemove }: { 
  item: ChecklistItem; 
  sectionId: string;
  onToggleRequired: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: `${sectionId}-${item.id}` 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 rounded-md bg-background border group",
        item.isRequired && "border-primary/30 bg-primary/5"
      )}
      data-testid={`item-${item.id}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover-elevate rounded">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("text-sm", item.isRequired && "font-medium")}>{item.itemText}</span>
          {item.isIndustrySpecific && (
            <Badge variant="outline" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Industry
            </Badge>
          )}
          {item.isRequired && (
            <Badge variant="default" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Critical
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant={item.isRequired ? "default" : "ghost"}
          onClick={onToggleRequired}
          title={item.isRequired ? "Unmark as critical" : "Mark as critical"}
          data-testid={`button-toggle-required-${item.id}`}
        >
          <AlertTriangle className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onRemove}
          className="text-destructive hover:text-destructive"
          data-testid={`button-remove-${item.id}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function ChecklistBuilder({ transactionTypeId, industrySectorId, onChecklistChange }: ChecklistBuilderProps) {
  const [sections, setSections] = useState<ChecklistSection[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newItemText, setNewItemText] = useState<Record<string, string>>({});

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const buildMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/due-diligence/build-checklist", {
        transactionTypeId,
        industrySectorId,
        includeLiveSearch: true
      });
      return response.json();
    },
    onSuccess: (data: { sections: any[] }) => {
      const sectionsWithData = (data.sections || []).map((s: any) => ({
        ...s,
        isExpanded: s.items?.length > 0
      }));
      setSections(sectionsWithData);
      onChecklistChange(sectionsWithData);
    }
  });

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const query = searchQuery.toLowerCase();
    return sections.map(section => ({
      ...section,
      items: section.items.filter(item => 
        item.itemText.toLowerCase().includes(query) ||
        item.itemDescription?.toLowerCase().includes(query)
      ),
      isExpanded: true
    })).filter(s => s.items.length > 0 || s.name.toLowerCase().includes(query));
  }, [sections, searchQuery]);

  const toggleSection = (sectionId: string) => {
    setSections(prev => prev.map(s => 
      s.id === sectionId ? { ...s, isExpanded: !s.isExpanded } : s
    ));
  };

  const toggleItemRequired = (sectionId: string, itemId: string) => {
    const updated = sections.map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        items: s.items.map(item => 
          item.id === itemId ? { ...item, isRequired: !item.isRequired } : item
        )
      };
    });
    setSections(updated);
    onChecklistChange(updated);
  };

  const removeItem = (sectionId: string, itemId: string) => {
    const updated = sections.map(s => {
      if (s.id !== sectionId) return s;
      return { ...s, items: s.items.filter(item => item.id !== itemId) };
    });
    setSections(updated);
    onChecklistChange(updated);
  };

  const addCustomItem = (sectionId: string) => {
    const text = newItemText[sectionId]?.trim();
    if (!text) return;

    const updated = sections.map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        items: [...s.items, {
          id: `custom-${nanoid(8)}`,
          itemText: text,
          isRequired: false,
          source: "custom"
        }]
      };
    });
    setSections(updated);
    onChecklistChange(updated);
    setNewItemText(prev => ({ ...prev, [sectionId]: "" }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    
    const [activeSectionId, activeItemId] = activeId.split("-").slice(0, 2);
    const [overSectionId] = overId.split("-").slice(0, 2);
    
    if (activeSectionId !== overSectionId) return;

    setSections(prev => {
      const sectionIndex = prev.findIndex(s => s.id === activeSectionId);
      if (sectionIndex === -1) return prev;

      const section = prev[sectionIndex];
      const activeIndex = section.items.findIndex(i => `${activeSectionId}-${i.id}` === activeId);
      const overIndex = section.items.findIndex(i => `${overSectionId}-${i.id}` === overId);

      if (activeIndex === -1 || overIndex === -1) return prev;

      const newItems = arrayMove(section.items, activeIndex, overIndex);
      const updated = [...prev];
      updated[sectionIndex] = { ...section, items: newItems };
      onChecklistChange(updated);
      return updated;
    });
  };

  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
  const criticalItems = sections.reduce((acc, s) => acc + s.items.filter(i => i.isRequired).length, 0);

  return (
    <Card data-testid="card-checklist-builder">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Customize Checklist
          </div>
          <div className="flex items-center gap-4 text-sm font-normal">
            <span>{totalItems} items</span>
            <span className="text-primary">{criticalItems} critical</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sections.length === 0 ? (
          <div className="text-center py-8">
            <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Select a transaction type and industry to build your checklist
            </p>
            <Button 
              onClick={() => buildMutation.mutate()}
              disabled={buildMutation.isPending || !transactionTypeId}
              data-testid="button-build-checklist"
            >
              {buildMutation.isPending ? "Building..." : "Build Checklist"}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search checklist items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-checklist-search"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => buildMutation.mutate()}
                disabled={buildMutation.isPending}
                data-testid="button-refresh-checklist"
              >
                Refresh
              </Button>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <div className="space-y-3">
                {filteredSections.map(section => (
                  <Collapsible key={section.id} open={section.isExpanded}>
                    <div className={cn(
                      "border rounded-lg overflow-hidden",
                      section.isLiveSearch && "border-blue-500/30 bg-blue-500/5"
                    )}>
                      <CollapsibleTrigger 
                        className="flex items-center justify-between w-full p-3 hover-elevate"
                        onClick={() => toggleSection(section.id)}
                        data-testid={`button-section-${section.id}`}
                      >
                        <div className="flex items-center gap-2">
                          {section.isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium">{section.name}</span>
                          {section.isLiveSearch && (
                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Live Search
                            </Badge>
                          )}
                        </div>
                        <Badge variant="secondary">{section.items.length}</Badge>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="p-3 pt-0 space-y-2">
                          <SortableContext 
                            items={section.items.map(i => `${section.id}-${i.id}`)} 
                            strategy={verticalListSortingStrategy}
                          >
                            {section.items.map(item => (
                              <SortableItem
                                key={item.id}
                                item={item}
                                sectionId={section.id}
                                onToggleRequired={() => toggleItemRequired(section.id, item.id)}
                                onRemove={() => removeItem(section.id, item.id)}
                              />
                            ))}
                          </SortableContext>

                          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                            <Input
                              placeholder="Add custom item..."
                              value={newItemText[section.id] || ""}
                              onChange={(e) => setNewItemText(prev => ({ ...prev, [section.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === "Enter" && addCustomItem(section.id)}
                              className="flex-1"
                              data-testid={`input-add-item-${section.id}`}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => addCustomItem(section.id)}
                              disabled={!newItemText[section.id]?.trim()}
                              data-testid={`button-add-item-${section.id}`}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </DndContext>
          </>
        )}
      </CardContent>
    </Card>
  );
}
