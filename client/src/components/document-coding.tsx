import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { X, Tag as TagIcon, Plus, Settings, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ComplianceScoreCard } from "@/components/compliance-score-card";
import { TagManagementDialog } from "@/components/tag-management-dialog";
import { MentionTextarea } from "@/components/mention-textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Tag {
  id: string;
  name: string;
  category: string;
  color: string;
  description?: string;
  isPreset: boolean;
}

interface DocumentTag {
  id: string;
  tagId: string;
  entityType: string;
  entityId: string;
  taggedBy: string;
  taggedAt: string;
  tag: Tag;
}

interface DocumentCodingProps {
  entityType: "communication" | "case" | "alert" | "interview";
  entityId: string;
  initialNotes?: string;
  onNotesChange?: (notes: string) => void;
  currentIndex?: number;
  totalCount?: number;
  onNavigate?: (direction: 'prev' | 'next') => void;
  onNavigateToIndex?: (index: number) => void;
  onNextUnreviewed?: () => void;
}

export function DocumentCoding({ 
  entityType, 
  entityId, 
  initialNotes = "", 
  onNotesChange,
  currentIndex,
  totalCount,
  onNavigate,
  onNavigateToIndex,
  onNextUnreviewed
}: DocumentCodingProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState(initialNotes);
  const [isAddTagOpen, setIsAddTagOpen] = useState(false);
  const [isTagManagementOpen, setIsTagManagementOpen] = useState(false);
  const [isEditingDocNumber, setIsEditingDocNumber] = useState(false);
  const [jumpToValue, setJumpToValue] = useState('');
  const [jumpSubmitted, setJumpSubmitted] = useState(false);
  
  // Compliance analysis state
  const [complianceData, setComplianceData] = useState<{
    complianceScore: number | null;
    riskLevel: string | null;
    aiComplianceAnalysis: string | null;
    analyzedAt: string | null;
    violatedRegulations?: string[];
    policyViolations?: string[];
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch existing tags for this entity
  const { data: entityTags = [], isLoading: isLoadingEntityTags, refetch: refetchEntityTags } = useQuery<DocumentTag[]>({
    queryKey: ["/api/tags/entity", entityType, entityId],
    queryFn: async () => {
      const response = await fetch(`/api/tags/entity/${entityType}/${entityId}`);
      if (!response.ok) throw new Error("Failed to fetch entity tags");
      return response.json();
    },
  });

  // Fetch all available tags
  const { data: allTags = [], isLoading: isLoadingTags } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  // Fetch recently used tags for Quick Tags section
  const { data: recentTags = [] } = useQuery<Tag[]>({
    queryKey: ["/api/tags/recent"],
  });
  
  // Fetch related documents
  const { data: relatedDocuments = [] } = useQuery<Array<{
    id: string;
    subject: string;
    sender: string;
    timestamp: string;
    relationshipType: string;
    confidenceScore: number;
    explanation: string;
  }>>({
    queryKey: [`/api/communications/${entityId}/related`],
    enabled: entityType === "communication",
  });
  
  // Auto-trigger compliance analysis when component loads
  useEffect(() => {
    if (entityType === "communication" && entityId) {
      analyzeCompliance();
    }
  }, [entityType, entityId]);
  
  const analyzeCompliance = async () => {
    if (entityType !== "communication") return;
    
    setIsAnalyzing(true);
    try {
      const response = await fetch(`/api/communications/${entityId}/analyze-compliance`, {
        method: "POST",
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Failed to analyze compliance");
      
      const data = await response.json();
      setComplianceData({
        complianceScore: data.complianceScore,
        riskLevel: data.riskLevel,
        aiComplianceAnalysis: data.aiComplianceAnalysis,
        analyzedAt: data.analyzedAt,
        violatedRegulations: data.violatedRegulations,
        policyViolations: data.policyViolations,
      });
      
      // Invalidate related documents query to refetch new relationships
      queryClient.invalidateQueries({ queryKey: [`/api/communications/${entityId}/related`] });
    } catch (error) {
      console.error("Compliance analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      return await apiRequest("POST", "/api/tags/entity", {
        tagId,
        entityType,
        entityId,
      });
    },
    onSuccess: async () => {
      await refetchEntityTags().catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["/api/tags/entity", entityType, entityId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags/recent"] });
      toast({ title: "Success", description: "Tag added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add tag", variant: "destructive" });
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      return await apiRequest("DELETE", `/api/tags/entity/${entityType}/${entityId}/${tagId}`);
    },
    onSuccess: async () => {
      await refetchEntityTags().catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["/api/tags/entity", entityType, entityId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags/recent"] });
      toast({ title: "Success", description: "Tag removed successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove tag", variant: "destructive" });
    },
  });

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes);
    onNotesChange?.(newNotes);
  };

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      slate: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600",
      red: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-100 dark:border-red-600",
      orange: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-100 dark:border-orange-600",
      amber: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-100 dark:border-amber-600",
      yellow: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-100 dark:border-yellow-600",
      lime: "bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-900 dark:text-lime-100 dark:border-lime-600",
      green: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-100 dark:border-green-600",
      emerald: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-100 dark:border-emerald-600",
      teal: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900 dark:text-teal-100 dark:border-teal-600",
      cyan: "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900 dark:text-cyan-100 dark:border-cyan-600",
      sky: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900 dark:text-sky-100 dark:border-sky-600",
      blue: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-600",
      indigo: "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900 dark:text-indigo-100 dark:border-indigo-600",
      violet: "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900 dark:text-violet-100 dark:border-violet-600",
      purple: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-100 dark:border-purple-600",
      fuchsia: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 dark:bg-fuchsia-900 dark:text-fuchsia-100 dark:border-fuchsia-600",
      pink: "bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900 dark:text-pink-100 dark:border-pink-600",
      rose: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900 dark:text-rose-100 dark:border-rose-600",
    };
    return colorMap[color] || colorMap.blue;
  };

  const entityTagIds = new Set(entityTags.map(et => et.tagId));
  const availableTags = allTags.filter(tag => !entityTagIds.has(tag.id));

  if (isLoadingEntityTags || isLoadingTags) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Card data-testid="document-coding">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TagIcon className="w-5 h-5" />
            <CardTitle>Document Coding</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
        {/* Document Navigation */}
        {onNavigate && typeof currentIndex === 'number' && typeof totalCount === 'number' && (
          <div className="space-y-2 pb-4 border-b border-border">
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('prev')}
                disabled={currentIndex === 0}
                data-testid="button-prev-doc-coding"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {isEditingDocNumber && onNavigateToIndex ? (
                <Input
                  type="number"
                  min={1}
                  max={totalCount}
                  value={jumpToValue}
                  onChange={(e) => setJumpToValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const docNumber = parseInt(jumpToValue, 10);
                      if (!isNaN(docNumber) && docNumber >= 1 && docNumber <= totalCount) {
                        setJumpSubmitted(true);
                        onNavigateToIndex(docNumber - 1);
                      }
                      setIsEditingDocNumber(false);
                      setJumpToValue('');
                    } else if (e.key === 'Escape') {
                      setJumpSubmitted(true);
                      setIsEditingDocNumber(false);
                      setJumpToValue('');
                    }
                  }}
                  onBlur={() => {
                    if (jumpSubmitted) {
                      setJumpSubmitted(false);
                      return;
                    }
                    const docNumber = parseInt(jumpToValue, 10);
                    if (!isNaN(docNumber) && docNumber >= 1 && docNumber <= totalCount) {
                      onNavigateToIndex(docNumber - 1);
                    }
                    setIsEditingDocNumber(false);
                    setJumpToValue('');
                  }}
                  placeholder={String(currentIndex + 1)}
                  className="w-16 h-7 text-center text-sm"
                  autoFocus
                  data-testid="input-jump-to-doc-coding"
                />
              ) : (
                <span 
                  className={`text-sm font-medium min-w-[80px] text-center ${onNavigateToIndex ? 'cursor-pointer hover-elevate rounded px-2 py-1' : ''}`}
                  onClick={() => {
                    if (onNavigateToIndex) {
                      setJumpToValue(String(currentIndex + 1));
                      setIsEditingDocNumber(true);
                    }
                  }}
                  title={onNavigateToIndex ? "Click to jump to a specific document" : undefined}
                  data-testid="text-doc-position-coding"
                >
                  {currentIndex + 1} of {totalCount}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('next')}
                disabled={currentIndex === totalCount - 1}
                data-testid="button-next-doc-coding"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {onNextUnreviewed && (
              <div className="flex justify-center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onNextUnreviewed}
                  data-testid="button-next-unreviewed"
                  className="text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Next Unreviewed
                </Button>
              </div>
            )}
          </div>
        )}
        
        {/* Quick Tags - 5 most recently used tags */}
        {recentTags.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Quick Tags</Label>
            <div className="flex flex-wrap gap-2">
              {recentTags.map((tag) => {
                const isApplied = entityTagIds.has(tag.id);
                return (
                  <Button
                    key={tag.id}
                    size="sm"
                    variant={isApplied ? "default" : "outline"}
                    onClick={() => isApplied ? removeTagMutation.mutate(tag.id) : addTagMutation.mutate(tag.id)}
                    className={!isApplied ? getColorClass(tag.color) : ""}
                    data-testid={`quick-tag-${tag.name.replace(/\s+/g, "-").toLowerCase()}`}
                  >
                    {tag.name}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Applied Tags */}
        {entityTags.length > 0 && (
          <div className="space-y-3" data-testid="applied-tags">
            <Label className="text-sm font-semibold">Applied Tags</Label>
            <div className="flex flex-wrap gap-2">
              {entityTags.map((et) => (
                <div
                  key={et.id}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border ${getColorClass(et.tag.color)}`}
                  data-testid={`applied-tag-${et.tag.name.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  <TagIcon className="w-3 h-3" />
                  <span className="font-medium">{et.tag.name}</span>
                  <button
                    onClick={() => removeTagMutation.mutate(et.tagId)}
                    className="hover-elevate active-elevate-2 p-0.5 rounded"
                    data-testid={`remove-tag-${et.tag.name.replace(/\s+/g, "-").toLowerCase()}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add More Tags */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Add More Tags</Label>
          <div className="flex gap-2">
            <Popover open={isAddTagOpen} onOpenChange={setIsAddTagOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-add-more-tags">
                  <Plus className="w-4 h-4 mr-2" />
                  Quick Add
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search tags..." />
                  <CommandList className="max-h-[400px]">
                    <CommandEmpty>No tags found.</CommandEmpty>
                    <CommandGroup>
                      {availableTags.map((tag) => (
                        <CommandItem
                          key={tag.id}
                          onSelect={() => {
                            addTagMutation.mutate(tag.id);
                            setIsAddTagOpen(false);
                          }}
                          data-testid={`command-tag-${tag.name.replace(/\s+/g, "-").toLowerCase()}`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${getColorClass(tag.color)}`} />
                              <span>{tag.name}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {tag.category}
                            </Badge>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsTagManagementOpen(true)}
              data-testid="button-manage-tags"
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Tags
            </Button>
          </div>
        </div>

        {/* Annotations */}
        <div className="space-y-3">
          <Label htmlFor="annotations" className="text-sm font-semibold">
            Annotations
          </Label>
          <MentionTextarea
            id="annotations"
            placeholder="Add notes about this document... Type @ to mention a user"
            value={notes}
            onChange={handleNotesChange}
            rows={4}
            data-testid="textarea-annotations"
          />
        </div>
      </CardContent>
    </Card>
    
      {/* Compliance Score Card - Only for communications */}
      {entityType === "communication" && (
        <div className="mt-4">
          <ComplianceScoreCard
            complianceScore={complianceData?.complianceScore ?? null}
            riskLevel={complianceData?.riskLevel ?? null}
            aiComplianceAnalysis={complianceData?.aiComplianceAnalysis ?? null}
            analyzedAt={complianceData?.analyzedAt ?? null}
            violatedRegulations={complianceData?.violatedRegulations}
            policyViolations={complianceData?.policyViolations}
            relatedDocuments={relatedDocuments}
            isLoading={isAnalyzing}
          />
        </div>
      )}

      {/* Tag Management Dialog */}
      <TagManagementDialog 
        open={isTagManagementOpen} 
        onOpenChange={setIsTagManagementOpen}
      />
    </>
  );
}
