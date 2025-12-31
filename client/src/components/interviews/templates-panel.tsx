import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useReducer, useCallback, useMemo, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertInterviewTemplateSchema, type InsertInterviewTemplate, type InterviewTemplate, type DocumentSet, type Tag } from "@shared/schema";
import { Plus, Edit, Trash2, FileText, Sparkles, X, Check, ChevronUp, ChevronDown, Folder, Tags } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { nanoid } from "nanoid";

interface GeneratedQuestion {
  id: string;
  question: string;
  rationale?: string;
  source: "ai" | "manual";
  selected: boolean;
}

interface QuestionState {
  questions: GeneratedQuestion[];
  isGenerating: boolean;
}

// Sanitize draft questions to ensure only JSON-safe data is persisted
function sanitizeDraftQuestions(questions: GeneratedQuestion[]): GeneratedQuestion[] {
  return questions.map(q => {
    // Coerce all fields to JSON-safe primitives
    const sanitized: GeneratedQuestion = {
      id: String(q.id || nanoid()),
      question: String(q.question || "").trim(), // Trim question text to prevent whitespace-only inputs
      source: (q.source === "ai" || q.source === "manual") ? q.source : "manual",
      selected: Boolean(q.selected),
    };
    // Only include rationale if it exists and is a non-empty string
    if (q.rationale && typeof q.rationale === "string" && q.rationale.trim()) {
      sanitized.rationale = String(q.rationale).trim();
    }
    return sanitized;
  });
}

type QuestionAction =
  | { type: "SET_GENERATED"; payload: GeneratedQuestion[] }
  | { type: "TOGGLE_SELECT"; id: string }
  | { type: "UPDATE_TEXT"; id: string; text: string }
  | { type: "ADD_CUSTOM" }
  | { type: "DELETE"; id: string }
  | { type: "MOVE_UP"; id: string }
  | { type: "MOVE_DOWN"; id: string }
  | { type: "SELECT_ALL" }
  | { type: "DESELECT_ALL" }
  | { type: "RESET" }
  | { type: "INITIALIZE"; narrative: string; baseQuestions: any; draftQuestions: any };

function questionReducer(state: QuestionState, action: QuestionAction): QuestionState {
  switch (action.type) {
    case "SET_GENERATED":
      // Sanitize AI-generated questions to ensure consistent JSON-safe state
      return { ...state, questions: sanitizeDraftQuestions(action.payload) };
    case "TOGGLE_SELECT":
      return {
        ...state,
        questions: state.questions.map(q =>
          q.id === action.id ? { ...q, selected: !q.selected } : q
        ),
      };
    case "UPDATE_TEXT":
      return {
        ...state,
        questions: state.questions.map(q =>
          q.id === action.id ? { ...q, question: action.text } : q
        ),
      };
    case "ADD_CUSTOM":
      return {
        ...state,
        questions: [
          ...state.questions,
          {
            id: nanoid(), // Use nanoid() for stable, unique IDs
            question: "",
            source: "manual",
            selected: true,
          },
        ],
      };
    case "DELETE":
      return {
        ...state,
        questions: state.questions.filter(q => q.id !== action.id),
      };
    case "MOVE_UP": {
      const index = state.questions.findIndex(q => q.id === action.id);
      if (index <= 0) return state;
      const newQuestions = [...state.questions];
      [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
      return { ...state, questions: newQuestions };
    }
    case "MOVE_DOWN": {
      const index = state.questions.findIndex(q => q.id === action.id);
      if (index < 0 || index >= state.questions.length - 1) return state;
      const newQuestions = [...state.questions];
      [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
      return { ...state, questions: newQuestions };
    }
    case "SELECT_ALL":
      return {
        ...state,
        questions: state.questions.map(q => ({ ...q, selected: true })),
      };
    case "DESELECT_ALL":
      return {
        ...state,
        questions: state.questions.map(q => ({ ...q, selected: false })),
      };
    case "RESET":
      return { questions: [], isGenerating: false };
    case "INITIALIZE":
      // Initialize from existing template data
      let initialQuestions: GeneratedQuestion[] = [];
      
      // Use draftQuestions if available (preserves AI metadata, rationales, selection state)
      if (Array.isArray(action.draftQuestions) && action.draftQuestions.length > 0) {
        // Sanitize rehydrated data to ensure JSON-safe primitives (handles legacy data)
        initialQuestions = sanitizeDraftQuestions(action.draftQuestions);
      } 
      // Fall back to baseQuestions only if draftQuestions not available
      else if (Array.isArray(action.baseQuestions)) {
        initialQuestions = action.baseQuestions.map((q: string, i: number) => ({
          id: `base-${i}`,
          question: String(q),
          source: "manual" as const,
          selected: true,
        }));
      }
      return { ...state, questions: initialQuestions };
    default:
      return state;
  }
}

interface QuestionCurationPanelProps {
  narrative: string;
  state: QuestionState;
  dispatch: React.Dispatch<QuestionAction>;
  onGenerate: () => void;
  isGenerating: boolean;
}

const QuestionCurationPanel = memo(function QuestionCurationPanel({ narrative, state, dispatch, onGenerate, isGenerating }: QuestionCurationPanelProps) {
  const selectedCount = useMemo(() => state.questions.filter(q => q.selected).length, [state.questions]);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating || !narrative.trim()}
          data-testid="button-generate-questions"
        >
          <Sparkles className="w-4 h-4" />
          {isGenerating ? "Generating..." : "Generate Questions with AI"}
        </Button>
        {state.questions.length > 0 && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => dispatch({ type: "SELECT_ALL" })}
              data-testid="button-select-all"
            >
              Select All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => dispatch({ type: "DESELECT_ALL" })}
              data-testid="button-deselect-all"
            >
              Clear All
            </Button>
          </div>
        )}
      </div>

      {state.questions.length > 0 && (
        <>
          <Alert>
            <AlertDescription>
              {selectedCount} of {state.questions.length} questions selected
            </AlertDescription>
          </Alert>

          <ScrollArea className="h-[400px] border rounded-md p-4">
            <div className="space-y-3">
              {state.questions.map((q, index) => (
                <div key={q.id} className="flex gap-2 p-3 border rounded-md hover-elevate" data-testid={`question-item-${q.id}`}>
                  <Checkbox
                    checked={q.selected}
                    onCheckedChange={() => dispatch({ type: "TOGGLE_SELECT", id: q.id })}
                    data-testid={`checkbox-question-${q.id}`}
                  />
                  <div className="flex-1 space-y-2">
                    <Textarea
                      value={q.question}
                      onChange={(e) => dispatch({ type: "UPDATE_TEXT", id: q.id, text: e.target.value })}
                      placeholder="Enter question..."
                      rows={2}
                      data-testid={`input-question-${q.id}`}
                    />
                    {q.rationale && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">AI rationale:</span> {q.rationale}
                      </p>
                    )}
                    {q.source === "ai" && (
                      <Badge variant="secondary" className="text-xs">AI Generated</Badge>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => dispatch({ type: "MOVE_UP", id: q.id })}
                      disabled={index === 0}
                      data-testid={`button-move-up-${q.id}`}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => dispatch({ type: "MOVE_DOWN", id: q.id })}
                      disabled={index === state.questions.length - 1}
                      data-testid={`button-move-down-${q.id}`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => dispatch({ type: "DELETE", id: q.id })}
                      data-testid={`button-delete-${q.id}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <Button
            type="button"
            variant="outline"
            onClick={() => dispatch({ type: "ADD_CUSTOM" })}
            data-testid="button-add-custom-question"
          >
            <Plus className="w-4 h-4" />
            Add Custom Question
          </Button>
        </>
      )}
    </div>
  );
});

function InterviewTemplatesPanel() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InterviewTemplate | null>(null);
  
  // Document Set and Tag selection state
  const [selectedDocumentSetIds, setSelectedDocumentSetIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  
  // Question state management with reducer
  const [createQuestionState, createQuestionDispatch] = useReducer(questionReducer, {
    questions: [],
    isGenerating: false,
  });
  
  const [editQuestionState, editQuestionDispatch] = useReducer(questionReducer, {
    questions: [],
    isGenerating: false,
  });

  const { data: templates = [], isLoading, dataUpdatedAt } = useQuery<InterviewTemplate[]>({
    queryKey: ["/api/interview-templates"],
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
  
  // Fetch Document Sets and Tags for context selection
  const { data: documentSets = [] } = useQuery<DocumentSet[]>({
    queryKey: ["/api/document-sets"],
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });
  
  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });

  // Log when data changes
  console.log("[DEBUG] useQuery - templates:", templates.length, "items, isLoading:", isLoading, "dataUpdatedAt:", dataUpdatedAt);

  // Client-side form schema that allows baseQuestions to be empty (populated in onSubmit)
  // Also omit createdBy since that's set by the server, not the client form
  const clientFormSchema = insertInterviewTemplateSchema.omit({
    createdBy: true,
  }).extend({
    baseQuestions: z.any().optional(), // Will be populated from question curator in onSubmit
    draftQuestions: z.any().optional(),
  });

  const createForm = useForm<InsertInterviewTemplate>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      category: "other",
      narrative: "",
      baseQuestions: [],
      metadata: {},
      isActive: "true",
    },
  });
  
  const generateQuestionsMutation = useMutation({
    mutationFn: async ({ narrative, category, documentSetIds, tagIds }: { narrative: string; category?: string; documentSetIds?: string[]; tagIds?: string[] }) => {
      const response = await apiRequest("POST", "/api/interview-templates/generate-questions", { narrative, category, documentSetIds, tagIds });
      return await response.json() as { questions: GeneratedQuestion[] };
    },
  });
  
  const handleGenerateQuestionsForCreate = useCallback(async () => {
    const narrative = createForm.getValues("narrative");
    const category = createForm.getValues("category");
    if (!narrative || narrative.trim().length === 0) {
      toast({ title: "Please provide a narrative first", variant: "destructive" });
      return;
    }
    
    try {
      const data = await generateQuestionsMutation.mutateAsync({ 
        narrative, 
        category,
        documentSetIds: selectedDocumentSetIds.length > 0 ? selectedDocumentSetIds : undefined,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined
      });
      const questionsWithSelection = data.questions.map(q => ({ ...q, selected: true }));
      createQuestionDispatch({ type: "SET_GENERATED", payload: questionsWithSelection });
      toast({ title: `Generated ${data.questions.length} questions successfully` });
    } catch (error: any) {
      toast({ title: "Error generating questions", description: error.message, variant: "destructive" });
    }
  }, [createForm, generateQuestionsMutation, selectedDocumentSetIds, selectedTagIds, toast]);
  
  const editForm = useForm<InsertInterviewTemplate>({
    resolver: zodResolver(insertInterviewTemplateSchema),
  });
  
  const handleGenerateQuestionsForEdit = useCallback(async () => {
    const narrative = editForm.getValues("narrative");
    const category = editForm.getValues("category");
    if (!narrative || narrative.trim().length === 0) {
      toast({ title: "Please provide a narrative first", variant: "destructive" });
      return;
    }
    
    try {
      const data = await generateQuestionsMutation.mutateAsync({ narrative, category });
      const questionsWithSelection = data.questions.map(q => ({ ...q, selected: true }));
      editQuestionDispatch({ type: "SET_GENERATED", payload: questionsWithSelection });
      toast({ title: `Generated ${data.questions.length} questions successfully` });
    } catch (error: any) {
      toast({ title: "Error generating questions", description: error.message, variant: "destructive" });
    }
  }, [editForm, generateQuestionsMutation, toast]);
  
  const getFinalQuestions = (state: QuestionState) => {
    return state.questions
      .filter(q => q.selected && q.question.trim().length > 0)
      .map(q => q.question);
  };

  const createMutation = useMutation({
    mutationFn: async (data: InsertInterviewTemplate) => {
      console.log("[DEBUG] createMutation - Sending data:", data);
      const result = await apiRequest("POST", "/api/interview-templates", data);
      console.log("[DEBUG] createMutation - Received result:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("[DEBUG] createMutation - onSuccess called with:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/interview-templates"] });
      console.log("[DEBUG] createMutation - Cache invalidated");
      resetCreateDialog();
      toast({ title: "Template created successfully" });
    },
    onError: (error: any) => {
      console.error("[DEBUG] createMutation - onError called:", error);
      toast({ title: "Error creating template", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InterviewTemplate> }) => {
      return await apiRequest("PATCH", `/api/interview-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interview-templates"] });
      resetEditDialog();
      toast({ title: "Template updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating template", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/interview-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interview-templates"] });
      toast({ title: "Template deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting template", description: error.message, variant: "destructive" });
    },
  });

  const onCreateSubmit = (data: InsertInterviewTemplate) => {
    console.log("[DEBUG] onCreateSubmit - CALLED with data:", data);
    console.log("[DEBUG] onCreateSubmit - Form errors:", createForm.formState.errors);
    console.log("[DEBUG] onCreateSubmit - Form values:", createForm.getValues());
    const finalQuestions = getFinalQuestions(createQuestionState);
    console.log("[DEBUG] onCreateSubmit - Final questions:", finalQuestions);
    if (finalQuestions.length === 0) {
      toast({ title: "Please add at least one question", variant: "destructive" });
      return;
    }
    // Save both baseQuestions (final strings) and draftQuestions (sanitized metadata for editing)
    const payload = { 
      ...data, 
      baseQuestions: finalQuestions,
      draftQuestions: sanitizeDraftQuestions(createQuestionState.questions)
    };
    console.log("[DEBUG] onCreateSubmit - Full payload:", payload);
    createMutation.mutate(payload);
  };
  
  const resetCreateDialog = () => {
    createForm.reset();
    createQuestionDispatch({ type: "RESET" });
    setSelectedDocumentSetIds([]);
    setSelectedTagIds([]);
    setIsCreateOpen(false);
  };

  const onEditSubmit = (data: InsertInterviewTemplate) => {
    if (!editingTemplate) return;
    
    const finalQuestions = getFinalQuestions(editQuestionState);
    if (finalQuestions.length === 0) {
      toast({ title: "Please add at least one question", variant: "destructive" });
      return;
    }
    
    // Save both baseQuestions (final strings) and draftQuestions (sanitized metadata for editing)
    updateMutation.mutate({ 
      id: editingTemplate.id, 
      data: { 
        ...data, 
        baseQuestions: finalQuestions,
        draftQuestions: sanitizeDraftQuestions(editQuestionState.questions)
      } 
    });
  };
  
  const resetEditDialog = () => {
    editForm.reset();
    editQuestionDispatch({ type: "RESET" });
    setEditingTemplate(null);
  };

  const categoryLabels: Record<string, string> = {
    fcpa: "FCPA",
    banking: "Banking",
    antitrust: "Antitrust",
    sec: "SEC",
    sox: "SOX",
    harassment: "Harassment",
    discrimination: "Discrimination",
    retaliation: "Retaliation",
    whistleblower: "Whistleblower",
    theft_fraud: "Theft/Fraud",
    policy_violation: "Policy Violation",
    other: "Other",
  };

  if (isLoading) {
    return <div className="p-6">Loading templates...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pre-Interview Templates</h1>
          <p className="text-muted-foreground">Manage AI pre-interview question templates</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-template">
              <Plus className="w-4 h-4" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Pre-Interview Template</DialogTitle>
              <DialogDescription>
                Define a new template with base questions for AI pre-interviews
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Workplace Misconduct Template" data-testid="input-template-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(categoryLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Document Set Selection */}
                <div className="space-y-2">
                  <FormLabel className="flex items-center gap-2">
                    <Folder className="w-4 h-4" />
                    Reference Document Sets (Optional)
                  </FormLabel>
                  <FormDescription>
                    Select Document Sets to analyze when generating questions
                  </FormDescription>
                  {documentSets.length > 0 ? (
                    <ScrollArea className="h-32 border rounded-md p-3">
                      <div className="space-y-2">
                        {documentSets.map((set) => (
                          <div key={set.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`docset-${set.id}`}
                              checked={selectedDocumentSetIds.includes(set.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedDocumentSetIds([...selectedDocumentSetIds, set.id]);
                                } else {
                                  setSelectedDocumentSetIds(selectedDocumentSetIds.filter(id => id !== set.id));
                                }
                              }}
                              data-testid={`checkbox-docset-${set.id}`}
                            />
                            <label htmlFor={`docset-${set.id}`} className="text-sm cursor-pointer">
                              {set.name} ({set.documentCount || 0} docs)
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground">No document sets available</p>
                  )}
                  {selectedDocumentSetIds.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedDocumentSetIds.length} set(s) selected
                    </p>
                  )}
                </div>
                
                {/* Tag Selection */}
                <div className="space-y-2">
                  <FormLabel className="flex items-center gap-2">
                    <Tags className="w-4 h-4" />
                    Reference Tagged Documents (Optional)
                  </FormLabel>
                  <FormDescription>
                    Select tags to include documents/communications with those tags
                  </FormDescription>
                  {tags.length > 0 ? (
                    <ScrollArea className="h-32 border rounded-md p-3">
                      <div className="space-y-2">
                        {tags.map((tag) => (
                          <div key={tag.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`tag-${tag.id}`}
                              checked={selectedTagIds.includes(tag.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedTagIds([...selectedTagIds, tag.id]);
                                } else {
                                  setSelectedTagIds(selectedTagIds.filter(id => id !== tag.id));
                                }
                              }}
                              data-testid={`checkbox-tag-${tag.id}`}
                            />
                            <label htmlFor={`tag-${tag.id}`} className="text-sm cursor-pointer">
                              <Badge variant="outline" className="text-xs">{tag.name}</Badge>
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground">No tags available</p>
                  )}
                  {selectedTagIds.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedTagIds.length} tag(s) selected
                    </p>
                  )}
                </div>
                
                <FormField
                  control={createForm.control}
                  name="narrative"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Areas of Inquiry</FormLabel>
                      <FormDescription>
                        Describe the topics and areas you want to explore in this interview. AI will generate specific questions based on your description and any selected documents/tags.
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Example: I need to understand the witness's knowledge of the alleged bribery scheme, their involvement with foreign officials, the timeline of events from 2020-2023, and any documentary evidence they may possess."
                          rows={4}
                          data-testid="textarea-narrative"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <QuestionCurationPanel
                  narrative={createForm.watch("narrative") || ""}
                  state={createQuestionState}
                  dispatch={createQuestionDispatch}
                  onGenerate={handleGenerateQuestionsForCreate}
                  isGenerating={generateQuestionsMutation.isPending}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-template">
                    {createMutation.isPending ? "Creating..." : "Create Template"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} data-testid={`card-template-${template.id}`} className="hover-elevate">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {template.name}
                  </CardTitle>
                  <CardDescription>{categoryLabels[template.category]}</CardDescription>
                </div>
                <Badge variant={template.isActive === "true" ? "default" : "secondary"}>
                  {template.isActive === "true" ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {Array.isArray(template.baseQuestions) ? template.baseQuestions.length : 0} base questions
                </p>
              </div>
              <div className="flex gap-2">
                <Dialog
                  open={editingTemplate?.id === template.id}
                  onOpenChange={(open) => {
                    if (open) {
                      setEditingTemplate(template);
                      editForm.reset({
                        name: template.name,
                        category: template.category,
                        narrative: template.narrative || "",
                        baseQuestions: template.baseQuestions as any,
                        metadata: template.metadata as any,
                        isActive: template.isActive,
                      });
                      // Initialize question state from existing template
                      editQuestionDispatch({
                        type: "INITIALIZE",
                        narrative: template.narrative || "",
                        baseQuestions: template.baseQuestions as any,
                        draftQuestions: template.draftQuestions as any,
                      });
                    } else {
                      resetEditDialog();
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" data-testid={`button-edit-${template.id}`}>
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Template</DialogTitle>
                      <DialogDescription>Update template details and questions</DialogDescription>
                    </DialogHeader>
                    <Form {...editForm}>
                      <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                        <FormField
                          control={editForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Template Name</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-edit-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-edit-category">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.entries(categoryLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                      {label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
                          name="narrative"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Areas of Inquiry</FormLabel>
                              <FormDescription>
                                Describe the topics and areas you want to explore in this interview. AI will generate specific questions based on your description.
                              </FormDescription>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder="Example: I need to understand the witness's knowledge of the alleged bribery scheme..."
                                  rows={4}
                                  data-testid="textarea-edit-narrative"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <QuestionCurationPanel
                          narrative={editForm.watch("narrative") || ""}
                          state={editQuestionState}
                          dispatch={editQuestionDispatch}
                          onGenerate={handleGenerateQuestionsForEdit}
                          isGenerating={generateQuestionsMutation.isPending}
                        />
                        <FormField
                          control={editForm.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-edit-status">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="true">Active</SelectItem>
                                  <SelectItem value="false">Inactive</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setEditingTemplate(null)}
                            data-testid="button-cancel-edit"
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit">
                            {updateMutation.isPending ? "Updating..." : "Update Template"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this template?")) {
                      deleteMutation.mutate(template.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-${template.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No templates yet. Create your first template to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default memo(InterviewTemplatesPanel);
