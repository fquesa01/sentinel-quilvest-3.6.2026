import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  GripVertical,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Settings,
  ArrowUp,
  ArrowDown,
  RotateCcw,
} from "lucide-react";
import type { PipelineStage } from "@shared/schema";
import { DEFAULT_PIPELINE_STAGES } from "@shared/schema";

const STAGE_COLOR_OPTIONS = [
  { label: "Slate", value: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300" },
  { label: "Blue", value: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  { label: "Violet", value: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300" },
  { label: "Pink", value: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300" },
  { label: "Purple", value: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  { label: "Orange", value: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
  { label: "Amber", value: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300" },
  { label: "Rose", value: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300" },
  { label: "Green", value: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  { label: "Zinc", value: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300" },
  { label: "Gray", value: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300" },
  { label: "Red", value: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  { label: "Teal", value: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300" },
  { label: "Cyan", value: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300" },
  { label: "Emerald", value: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300" },
  { label: "Indigo", value: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300" },
];

function getColorLabel(color: string): string {
  return STAGE_COLOR_OPTIONS.find(c => c.value === color)?.label || "Custom";
}

interface PipelineStageSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PipelineStageSettings({ open, onOpenChange }: PipelineStageSettingsProps) {
  const { toast } = useToast();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [stageToRemove, setStageToRemove] = useState<{ stage: PipelineStage; index: number; dealCount: number } | null>(null);
  const [reassignTarget, setReassignTarget] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingReassignments, setPendingReassignments] = useState<Array<{ fromStage: string; toStage: string }>>([]);

  const { data: fetchedStages, isLoading } = useQuery<PipelineStage[]>({
    queryKey: ["/api/pe/pipeline-stages"],
    enabled: open,
  });

  useEffect(() => {
    if (fetchedStages) {
      setStages([...fetchedStages]);
      setHasChanges(false);
      setPendingReassignments([]);
    }
  }, [fetchedStages]);

  const saveMutation = useMutation({
    mutationFn: async (updatedStages: PipelineStage[]) => {
      const res = await apiRequest("PUT", "/api/pe/pipeline-stages", { stages: updatedStages });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save stages");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pe/pipeline-stages"] });
      toast({ title: "Pipeline stages updated" });
      setHasChanges(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to save stages", description: error.message, variant: "destructive" });
    },
  });

  const reassignMutation = useMutation({
    mutationFn: async ({ fromStage, toStage }: { fromStage: string; toStage: string }) => {
      const res = await apiRequest("POST", "/api/pe/pipeline-stages/reassign-deals", { fromStage, toStage });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pe/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pe/deals/pipeline-progress"] });
    },
  });

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditLabel(stages[index].label);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null || !editLabel.trim()) return;
    const updated = [...stages];
    updated[editingIndex] = { ...updated[editingIndex], label: editLabel.trim() };
    setStages(updated);
    setEditingIndex(null);
    setHasChanges(true);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditLabel("");
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...stages];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    updated.forEach((s, i) => s.sortOrder = i);
    setStages(updated);
    setHasChanges(true);
  };

  const handleMoveDown = (index: number) => {
    if (index === stages.length - 1) return;
    const updated = [...stages];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    updated.forEach((s, i) => s.sortOrder = i);
    setStages(updated);
    setHasChanges(true);
  };

  const handleColorChange = (index: number, color: string) => {
    const updated = [...stages];
    updated[index] = { ...updated[index], color };
    setStages(updated);
    setHasChanges(true);
  };

  const handleAddStage = (insertAfterIndex?: number) => {
    const key = `custom_${Date.now()}`;
    const newStage: PipelineStage = {
      key,
      label: "New Stage",
      color: STAGE_COLOR_OPTIONS[Math.floor(Math.random() * STAGE_COLOR_OPTIONS.length)].value,
      sortOrder: 0,
    };
    const updated = [...stages];
    const insertAt = insertAfterIndex !== undefined ? insertAfterIndex + 1 : updated.length;
    updated.splice(insertAt, 0, newStage);
    updated.forEach((s, i) => s.sortOrder = i);
    setStages(updated);
    setHasChanges(true);
    setEditingIndex(insertAt);
    setEditLabel("New Stage");
  };

  const handleRemoveStage = async (index: number) => {
    const stage = stages[index];
    try {
      const res = await fetch(`/api/pe/pipeline-stages/${stage.key}/deal-count`, { credentials: "include" });
      const data = await res.json();
      const dealCount = data.count || 0;

      if (dealCount > 0) {
        setStageToRemove({ stage, index, dealCount });
        const otherStages = stages.filter((_, i) => i !== index);
        if (otherStages.length > 0) {
          setReassignTarget(otherStages[0].key);
        }
      } else {
        const updated = stages.filter((_, i) => i !== index);
        updated.forEach((s, i) => s.sortOrder = i);
        setStages(updated);
        setHasChanges(true);
      }
    } catch {
      toast({ title: "Could not verify deal count", description: "Please try again.", variant: "destructive" });
    }
  };

  const handleConfirmRemove = () => {
    if (!stageToRemove) return;
    if (stageToRemove.dealCount > 0 && reassignTarget) {
      setPendingReassignments(prev => [
        ...prev,
        { fromStage: stageToRemove.stage.key, toStage: reassignTarget },
      ]);
    }
    const updated = stages.filter((_, i) => i !== stageToRemove.index);
    updated.forEach((s, i) => s.sortOrder = i);
    setStages(updated);
    setHasChanges(true);
    setStageToRemove(null);
    setReassignTarget("");
  };

  const handleResetDefaults = () => {
    setStages([...DEFAULT_PIPELINE_STAGES]);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      for (const reassignment of pendingReassignments) {
        await reassignMutation.mutateAsync(reassignment);
      }
      saveMutation.mutate(stages, {
        onSuccess: () => {
          setPendingReassignments([]);
        },
      });
    } catch (error: any) {
      toast({ title: "Failed to reassign deals", description: error.message, variant: "destructive" });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => {
        if (!v && hasChanges) {
          if (confirm("You have unsaved changes. Discard them?")) {
            setHasChanges(false);
            onOpenChange(false);
          }
          return;
        }
        onOpenChange(v);
      }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Pipeline Stage Settings
            </DialogTitle>
            <DialogDescription>
              Rename, reorder, add, or remove pipeline stages. Changes apply firm-wide.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-1 py-2">
            {isLoading ? (
              <div className="text-sm text-muted-foreground p-4 text-center">Loading stages...</div>
            ) : (
              stages.map((stage, index) => (
                <div
                  key={stage.key}
                  className="flex items-center gap-2 p-2 rounded-md border bg-card"
                  data-testid={`stage-row-${stage.key}`}
                >
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      data-testid={`button-move-up-${stage.key}`}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === stages.length - 1}
                      data-testid={`button-move-down-${stage.key}`}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>

                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />

                  <div className="flex-1 min-w-0">
                    {editingIndex === index ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit();
                            if (e.key === "Escape") handleCancelEdit();
                          }}
                          className="h-7 text-sm"
                          autoFocus
                          data-testid={`input-stage-label-${stage.key}`}
                        />
                        <Button size="icon" variant="ghost" onClick={handleSaveEdit} data-testid={`button-confirm-edit-${stage.key}`}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={handleCancelEdit} data-testid={`button-cancel-edit-${stage.key}`}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`${stage.color} no-default-hover-elevate no-default-active-elevate`}>
                          {stage.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate">{stage.key}</span>
                      </div>
                    )}
                  </div>

                  <Select
                    value={stage.color}
                    onValueChange={(v) => handleColorChange(index, v)}
                  >
                    <SelectTrigger className="w-[90px] h-7 text-xs" data-testid={`select-color-${stage.key}`}>
                      <SelectValue placeholder="Color" />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_COLOR_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-1.5">
                            <span className={`inline-block w-3 h-3 rounded-sm ${opt.value.split(" ")[0]}`} />
                            {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {editingIndex !== index && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleStartEdit(index)}
                      data-testid={`button-edit-${stage.key}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleAddStage(index)}
                    data-testid={`button-add-below-${stage.key}`}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveStage(index)}
                    disabled={stages.length <= 1}
                    data-testid={`button-remove-${stage.key}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleAddStage} data-testid="button-add-stage">
                <Plus className="h-4 w-4 mr-1" />
                Add Stage
              </Button>
              <Button variant="outline" size="sm" onClick={handleResetDefaults} data-testid="button-reset-defaults">
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset Defaults
              </Button>
            </div>
            <div className="flex gap-2 ml-auto flex-wrap">
              <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-settings">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saveMutation.isPending}
                data-testid="button-save-stages"
              >
                {saveMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!stageToRemove} onOpenChange={(v) => !v && setStageToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Stage</AlertDialogTitle>
            <AlertDialogDescription>
              {stageToRemove && stageToRemove.dealCount > 0 ? (
                <>
                  There {stageToRemove.dealCount === 1 ? "is" : "are"}{" "}
                  <strong>{stageToRemove.dealCount}</strong>{" "}
                  deal{stageToRemove.dealCount !== 1 ? "s" : ""} currently in the{" "}
                  <strong>{stageToRemove.stage.label}</strong> stage. Please select a stage to
                  reassign them to before removing.
                </>
              ) : (
                <>Are you sure you want to remove the <strong>{stageToRemove?.stage.label}</strong> stage?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {stageToRemove && stageToRemove.dealCount > 0 && (
            <div className="py-2">
              <Select value={reassignTarget} onValueChange={setReassignTarget}>
                <SelectTrigger data-testid="select-reassign-target">
                  <SelectValue placeholder="Select target stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages
                    .filter((_, i) => i !== stageToRemove.index)
                    .map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        {s.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-remove">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              disabled={stageToRemove?.dealCount ? !reassignTarget : false}
              data-testid="button-confirm-remove"
            >
              {stageToRemove?.dealCount ? "Reassign & Remove" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
