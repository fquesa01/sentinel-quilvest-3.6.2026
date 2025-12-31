import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInterviewNoteSchema, type RecordedInterview, type InterviewNote, type Case } from "@shared/schema";
import { Video, FileText, MessageSquare, Play, RefreshCw, Clock, Edit, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { z } from "zod";

const interviewNoteFormSchema = insertInterviewNoteSchema.omit({ authorUserId: true });
type InterviewNoteForm = z.infer<typeof interviewNoteFormSchema>;

// Type definitions for ElevenLabs transcription data
interface TranscriptSegment {
  text: string;
  start?: number;
  end?: number;
  timestamp?: string;
}

interface TranscriptionMetadata {
  model?: string;
  language?: string;
  duration?: number;
}

// Type guards for jsonb-backed fields
const hasStringTags = (val: unknown): val is string[] => 
  Array.isArray(val) && val.length > 0 && val.every(v => typeof v === "string");

const isBehavioralSignals = (val: unknown): val is Record<string, unknown> => 
  val !== null && typeof val === "object";

interface RecordedInterviewDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interviewId: string | null;
}

export default function RecordedInterviewDetailDialog({
  open,
  onOpenChange,
  interviewId,
}: RecordedInterviewDetailDialogProps) {
  const { toast } = useToast();
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [editedSegments, setEditedSegments] = useState<TranscriptSegment[]>([]);

  const { data: interviews = [] } = useQuery<RecordedInterview[]>({
    queryKey: ["/api/recorded-interviews"],
    enabled: !!interviewId,
  });

  const { data: cases = [] } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
    enabled: !!interviewId,
  });

  const { data: notes = [] } = useQuery<InterviewNote[]>({
    queryKey: [`/api/interview-notes?recordedInterviewId=${interviewId || "_null_"}`],
    enabled: !!interviewId,
  });

  const selectedInterview = interviews.find(i => i.id === interviewId);

  const noteForm = useForm<InterviewNoteForm>({
    resolver: zodResolver(interviewNoteFormSchema),
    defaultValues: {
      noteText: "",
      tags: [],
      recordedInterviewId: interviewId || "",
    },
  });

  useEffect(() => {
    if (interviewId) {
      noteForm.setValue("recordedInterviewId", interviewId);
    }
  }, [interviewId, noteForm]);

  const addNoteMutation = useMutation({
    mutationFn: async (data: InterviewNoteForm) => {
      if (!interviewId) {
        throw new Error("No interview selected");
      }
      const payload = {
        ...data,
        recordedInterviewId: interviewId,
      };
      return await apiRequest("POST", "/api/interview-notes", payload);
    },
    onSuccess: () => {
      if (interviewId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/interview-notes?recordedInterviewId=${interviewId}`],
        });
        queryClient.invalidateQueries({ 
          queryKey: ["/api/interview-notes"],
        });
      }
      setIsAddNoteOpen(false);
      noteForm.reset({
        noteText: "",
        tags: [],
        recordedInterviewId: interviewId || "",
      });
      toast({ title: "Note added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error adding note", description: error.message, variant: "destructive" });
    },
  });

  const transcribeMutation = useMutation({
    mutationFn: async (interviewId: string) => {
      const response = await fetch(`/api/recorded-interviews/${interviewId}/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      
      if (!response.ok) {
        const text = (await response.text()) || response.statusText;
        throw new Error(`${response.status}: ${text}`);
      }
      
      return await response.json();
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ 
        queryKey: ["/api/recorded-interviews"],
        type: "active"
      });
      
      toast({ 
        title: "Transcription Completed", 
        description: "ElevenLabs has successfully transcribed the interview"
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Transcription Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const updateTranscriptMutation = useMutation({
    mutationFn: async ({ interviewId, segments }: { interviewId: string; segments: TranscriptSegment[] }) => {
      const response = await apiRequest("PATCH", `/api/recorded-interviews/${interviewId}`, {
        transcriptSegments: segments,
      });
      return await response.json() as RecordedInterview;
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ 
        queryKey: ["/api/recorded-interviews"],
        type: "active"
      });
      
      setIsEditingTranscript(false);
      toast({ 
        title: "Transcript Updated", 
        description: "Changes have been saved successfully"
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Update Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const startEditingTranscript = () => {
    if (selectedInterview) {
      if (Array.isArray(selectedInterview.transcriptSegments) && selectedInterview.transcriptSegments.length > 0) {
        const clonedSegments = (selectedInterview.transcriptSegments as TranscriptSegment[]).map(seg => ({ ...seg }));
        setEditedSegments(clonedSegments);
      } else {
        setEditedSegments([{ text: "", start: 0, end: 0 }]);
      }
      setIsEditingTranscript(true);
    }
  };

  const cancelEditingTranscript = () => {
    setIsEditingTranscript(false);
    setEditedSegments([]);
  };

  const saveTranscriptChanges = () => {
    if (selectedInterview) {
      const segmentsToSave = editedSegments.filter(seg => 
        seg.text.trim() !== "" || seg.timestamp
      );
      
      updateTranscriptMutation.mutate({
        interviewId: selectedInterview.id,
        segments: segmentsToSave,
      });
    }
  };

  const updateSegmentText = (index: number, newText: string) => {
    setEditedSegments(prev => 
      prev.map((seg, i) => i === index ? { ...seg, text: newText } : seg)
    );
  };

  const addNewSegment = () => {
    setEditedSegments(prev => [
      ...prev,
      { text: "", start: 0, end: 0 }
    ]);
  };

  const deleteSegment = (index: number) => {
    setEditedSegments(prev => {
      const newSegments = prev.filter((_, i) => i !== index);
      return newSegments.length === 0 ? [{ text: "", start: 0, end: 0 }] : newSegments;
    });
  };

  const onAddNote = (data: InterviewNoteForm) => {
    if (selectedInterview) {
      const payload = {
        ...data,
        recordedInterviewId: selectedInterview.id,
      };
      addNoteMutation.mutate(payload);
    }
  };

  useEffect(() => {
    if (!open) {
      setIsEditingTranscript(false);
      setEditedSegments([]);
      setIsAddNoteOpen(false);
    }
  }, [open]);

  if (!selectedInterview) {
    return null;
  }

  const caseData = cases.find(c => c.id === selectedInterview.caseId);
  const interviewNotes = notes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Interview Review
          </DialogTitle>
          <DialogDescription>
            Case: {caseData?.caseNumber} | Started: {selectedInterview.startedAt ? format(new Date(selectedInterview.startedAt), "MMM d, yyyy HH:mm") : "Not started"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="video" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="video">Video</TabsTrigger>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
            <TabsTrigger value="notes">Notes ({interviewNotes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="video" className="space-y-4">
            {selectedInterview.videoUrl ? (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  src={selectedInterview.videoUrl}
                  controls
                  className="w-full h-full"
                  data-testid="video-player"
                />
              </div>
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No video recording available</p>
                </div>
              </div>
            )}
            {selectedInterview.videoUrl && (
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => transcribeMutation.mutate(selectedInterview.id)}
                  disabled={transcribeMutation.isPending || !!selectedInterview.transcriptSegments}
                  data-testid="button-transcribe-video"
                >
                  {transcribeMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Transcribing with ElevenLabs...
                    </>
                  ) : selectedInterview.transcriptSegments ? (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Transcribed
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Transcribe Video
                    </>
                  )}
                </Button>
                {!!selectedInterview.transcriptionMetadata && (
                  <Badge variant="outline" className="ml-auto">
                    <Clock className="w-3 h-3 mr-1" />
                    Duration: {Math.round((selectedInterview.transcriptionMetadata as TranscriptionMetadata).duration || 0)}s
                  </Badge>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="transcript" className="space-y-4">
            {!!selectedInterview.transcriptionMetadata && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Transcription Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Model:</span>{" "}
                      <span className="font-medium">{(selectedInterview.transcriptionMetadata as TranscriptionMetadata).model || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Language:</span>{" "}
                      <span className="font-medium">{(selectedInterview.transcriptionMetadata as TranscriptionMetadata).language || "Auto-detected"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duration:</span>{" "}
                      <span className="font-medium">{Math.round((selectedInterview.transcriptionMetadata as TranscriptionMetadata).duration || 0)}s</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Segments:</span>{" "}
                      <span className="font-medium">{Array.isArray(selectedInterview.transcriptSegments) ? selectedInterview.transcriptSegments.length : 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {(Array.isArray(selectedInterview.transcriptSegments) || isEditingTranscript) && (
              <div className="flex justify-between items-center gap-2 mb-4">
                {isEditingTranscript && (
                  <Button
                    onClick={addNewSegment}
                    variant="outline"
                    size="sm"
                    data-testid="button-add-segment"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Segment
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  {!isEditingTranscript ? (
                    <Button
                      onClick={startEditingTranscript}
                      variant="outline"
                      data-testid="button-edit-transcript"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Transcript
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={cancelEditingTranscript}
                        variant="outline"
                        disabled={updateTranscriptMutation.isPending}
                        data-testid="button-cancel-edit"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={saveTranscriptChanges}
                        disabled={updateTranscriptMutation.isPending}
                        data-testid="button-save-transcript"
                      >
                        {updateTranscriptMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            <ScrollArea className="h-[600px] w-full rounded-md border p-4">
              {isEditingTranscript ? (
                <div className="space-y-3" data-testid="transcript-segments">
                  {editedSegments.map((segment, index: number) => (
                    <div
                      key={index}
                      className="p-3 bg-muted rounded-md"
                      data-testid={`segment-${index}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {segment.timestamp ? new Date(segment.timestamp).toLocaleTimeString() : `Segment ${index + 1}`}
                        </Badge>
                        <div className="flex items-center gap-2">
                          {segment.start !== undefined && segment.start !== 0 && (
                            <span className="text-xs text-muted-foreground">
                              {Math.round(segment.start)}s - {Math.round(segment.end || segment.start)}s
                            </span>
                          )}
                          <Button
                            onClick={() => deleteSegment(index)}
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            data-testid={`button-delete-segment-${index}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        value={segment.text}
                        onChange={(e) => updateSegmentText(index, e.target.value)}
                        rows={3}
                        className="text-sm"
                        data-testid={`textarea-segment-${index}`}
                        placeholder={editedSegments.length === 1 && !segment.text && !segment.timestamp ? "Start typing to add transcript content..." : ""}
                      />
                    </div>
                  ))}
                </div>
              ) : Array.isArray(selectedInterview.transcriptSegments) && selectedInterview.transcriptSegments.length > 0 ? (
                <div className="space-y-3" data-testid="transcript-segments">
                  {(selectedInterview.transcriptSegments as TranscriptSegment[]).map((segment, index: number) => (
                    <div
                      key={index}
                      className="p-3 bg-muted rounded-md"
                      data-testid={`segment-${index}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {segment.timestamp ? new Date(segment.timestamp).toLocaleTimeString() : `Segment ${index + 1}`}
                        </Badge>
                        {segment.start !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            {Math.round(segment.start)}s - {Math.round(segment.end || segment.start)}s
                          </span>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{segment.text}</p>
                    </div>
                  ))}
                </div>
              ) : selectedInterview.transcriptText ? (
                <div className="prose prose-sm max-w-none" data-testid="transcript-text">
                  <pre className="whitespace-pre-wrap font-sans">{selectedInterview.transcriptText}</pre>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">No transcript available</p>
                  {selectedInterview.videoUrl && (
                    <>
                      <p className="text-sm text-muted-foreground mb-4">
                        Transcribe this interview with ElevenLabs Speech-to-Text
                      </p>
                      <Button
                        onClick={() => transcribeMutation.mutate(selectedInterview.id)}
                        disabled={transcribeMutation.isPending}
                        data-testid="button-generate-transcript"
                      >
                        {transcribeMutation.isPending ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Transcribing...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Generate Transcript
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>AI Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedInterview.aiSummaryText ? (
                  <p data-testid="ai-summary">{selectedInterview.aiSummaryText}</p>
                ) : (
                  <p className="text-muted-foreground">No AI summary generated yet</p>
                )}
              </CardContent>
            </Card>
            {hasStringTags(selectedInterview.issuesTags) && (
              <Card>
                <CardHeader>
                  <CardTitle>Identified Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedInterview.issuesTags.map((tag, idx) => (
                      <Badge key={idx} variant="destructive">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {isBehavioralSignals(selectedInterview.behavioralSignals) && (
              <Card>
                <CardHeader>
                  <CardTitle>Behavioral Signals</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm">{JSON.stringify(selectedInterview.behavioralSignals, null, 2)}</pre>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Attorney Notes</h3>
              <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
                <Button size="sm" onClick={() => setIsAddNoteOpen(true)} data-testid="button-add-note">
                  <MessageSquare className="w-4 h-4" />
                  Add Note
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Interview Note</DialogTitle>
                    <DialogDescription>Add observations or legal analysis</DialogDescription>
                  </DialogHeader>
                  <Form {...noteForm}>
                    <form onSubmit={noteForm.handleSubmit(onAddNote)} className="space-y-4">
                      <FormField
                        control={noteForm.control}
                        name="recordedInterviewId"
                        render={({ field }) => (
                          <input type="hidden" {...field} />
                        )}
                      />
                      <FormField
                        control={noteForm.control}
                        name="noteText"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Note</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={6} placeholder="Enter your note..." data-testid="textarea-note" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsAddNoteOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={addNoteMutation.isPending} data-testid="button-submit-note">
                          {addNoteMutation.isPending ? "Adding..." : "Add Note"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            <ScrollArea className="h-[600px] w-full">
              <div className="space-y-4">
                {interviewNotes.map((note) => (
                  <Card key={note.id} data-testid={`note-${note.id}`}>
                    <CardHeader>
                      <CardDescription>{format(new Date(note.createdAt), "MMM d, yyyy HH:mm")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{note.noteText}</p>
                      {hasStringTags(note.tags) && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {note.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {interviewNotes.length === 0 && (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No notes yet. Add your first note.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
