import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useCaseTimelineColumns, type UiColumn } from "@/hooks/use-case-timeline-columns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2, Loader2 } from "lucide-react";

interface ManageColumnsDialogProps {
  caseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SortableColumnItem({ column, onToggle, onDelete }: {
  column: UiColumn;
  onToggle: (id: string, visible: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-card rounded border hover-elevate"
      data-testid={`sortable-column-${column.id}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing" data-testid={`grip-${column.id}`}>
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      
      <Checkbox
        checked={column.isVisible}
        onCheckedChange={(checked) => onToggle(column.id, checked as boolean)}
        disabled={column.isDefault}
        data-testid={`checkbox-${column.id}`}
      />
      
      <span className={`flex-1 ${column.isDefault ? 'text-muted-foreground' : ''}`}>
        {column.name}
        {column.isDefault && <span className="text-xs ml-1">(use Columns dropdown)</span>}
      </span>
      
      {!column.isDefault && !column.isMandatory && (
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onDelete(column.id)}
          data-testid={`delete-${column.id}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

export function ManageColumnsDialog({ caseId, open, onOpenChange }: ManageColumnsDialogProps) {
  const { toast } = useToast();
  const [columns, setColumns] = useState<UiColumn[]>([]);
  const [newColumnName, setNewColumnName] = useState("");
  const prevColumnsRef = useRef<UiColumn[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Fetch custom columns from backend using shared hook
  const { uiColumns, isLoading, isFetching } = useCaseTimelineColumns(caseId);

  // Create custom column mutation
  const createColumnMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest(`/api/cases/${caseId}/timeline/columns`, "POST", {
        columnLabel: name,
        columnKey: `custom_${Date.now()}`,
        columnType: "custom",
        isVisible: true,
        displayOrder: columns.length,
        selectOptions: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/timeline/columns`] });
      setNewColumnName("");
      toast({ title: "Column created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create column", description: error.message, variant: "destructive" });
    },
  });

  // Delete custom column mutation
  const deleteColumnMutation = useMutation({
    mutationFn: async (columnId: string) => {
      return await apiRequest(`/api/cases/${caseId}/timeline/columns/${columnId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/timeline/columns`] });
      toast({ title: "Column deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete column", description: error.message, variant: "destructive" });
    },
  });

  // Update column visibility mutation
  const updateVisibilityMutation = useMutation({
    mutationFn: async ({ columnId, isVisible }: { columnId: string; isVisible: boolean }) => {
      return await apiRequest(`/api/cases/${caseId}/timeline/columns/${columnId}`, "PATCH", {
        isVisible,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/timeline/columns`] });
    },
  });

  // Reorder columns mutation with rollback on error
  const reorderMutation = useMutation({
    mutationFn: async (orderedColumns: UiColumn[]) => {
      // Save absolute positions for ALL columns (backend now stores both default and custom)
      const allColumns = orderedColumns.map((c, idx) => ({
        id: c.id,
        displayOrder: idx,
      }));
      
      return await apiRequest(`/api/cases/${caseId}/timeline/columns/reorder`, "PATCH", {
        columns: allColumns,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/timeline/columns`] });
      toast({ title: "Column order updated" });
    },
    onError: (error: any) => {
      // Rollback to previous column order
      setColumns([...prevColumnsRef.current]);
      toast({ title: "Failed to update column order", description: error.message, variant: "destructive" });
    },
  });

  // Sync local state from backend when dialog opens or data changes
  // Use ref to avoid clobbering in-progress drags
  useEffect(() => {
    if (!open || isLoading || isFetching) return;
    
    // Check if data actually changed to avoid unnecessary state updates
    const serializedNew = JSON.stringify(uiColumns);
    const serializedPrev = JSON.stringify(prevColumnsRef.current);
    
    if (serializedNew !== serializedPrev) {
      const sorted = [...uiColumns].sort((a, b) => a.displayOrder - b.displayOrder);
      setColumns(sorted);
      prevColumnsRef.current = sorted;
    }
  }, [open, uiColumns, isLoading, isFetching]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = columns.findIndex(c => c.id === active.id);
    const newIndex = columns.findIndex(c => c.id === over.id);

    const reordered = arrayMove(columns, oldIndex, newIndex).map((c, idx) => ({
      ...c,
      displayOrder: idx,
    }));

    // Save current state for rollback before mutation
    prevColumnsRef.current = [...columns];
    setColumns(reordered);
    reorderMutation.mutate(reordered);
  };

  const handleToggleVisibility = (id: string, isVisible: boolean) => {
    setColumns(cols => cols.map(c => c.id === id ? { ...c, isVisible } : c));
    
    const column = columns.find(c => c.id === id);
    if (column && !column.isDefault) {
      updateVisibilityMutation.mutate({ columnId: id, isVisible });
    }
  };

  const handleDeleteColumn = (id: string) => {
    const column = columns.find(c => c.id === id);
    if (!column || column.isDefault) return;
    
    if (confirm(`Delete column "${column.name}"?`)) {
      deleteColumnMutation.mutate(id);
    }
  };

  const handleCreateColumn = () => {
    if (!newColumnName.trim()) {
      toast({ title: "Column name is required", variant: "destructive" });
      return;
    }
    createColumnMutation.mutate(newColumnName.trim());
  };

  const isAnyMutationPending = 
    createColumnMutation.isPending || 
    deleteColumnMutation.isPending || 
    updateVisibilityMutation.isPending || 
    reorderMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col" data-testid="manage-columns-dialog">
        <DialogHeader>
          <DialogTitle>Manage Timeline Columns</DialogTitle>
          <DialogDescription>
            Drag to reorder, toggle visibility, and add custom columns
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-auto space-y-4 py-4">
            <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter} 
              onDragEnd={handleDragEnd}
              autoScroll={!isAnyMutationPending}
            >
            <SortableContext items={columns.map(c => c.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2" data-testid="columns-list">
                {columns.map(column => (
                  <SortableColumnItem
                    key={column.id}
                    column={column}
                    onToggle={handleToggleVisibility}
                    onDelete={handleDeleteColumn}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="border-t pt-4">
            <Label htmlFor="new-column-name">Add Custom Column</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="new-column-name"
                placeholder="Column name"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateColumn()}
                data-testid="input-new-column-name"
              />
              <Button
                onClick={handleCreateColumn}
                disabled={createColumnMutation.isPending}
                data-testid="button-create-column"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>
        )}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
