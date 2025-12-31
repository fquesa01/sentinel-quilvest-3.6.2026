import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
  Sparkles,
  CheckCircle,
  XCircle,
  Clock,
  ListChecks,
  Target,
  MessageSquare,
  Users,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';

interface TranscriptionSegment {
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
  confidence?: number;
}

interface MeetingTranscription {
  id: string;
  meetingId: string;
  recordingId?: string;
  transcriptionText?: string;
  segments?: TranscriptionSegment[];
  language?: string;
  confidence?: number;
  wordCount?: number;
  duration?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  source: string;
  createdAt: string;
}

interface ActionItem {
  description: string;
  assignee?: string;
  dueDate?: string;
  priority?: string;
}

interface MeetingSummary {
  id: string;
  meetingId: string;
  transcriptionId?: string;
  summaryType: string;
  summaryText?: string;
  keyPoints?: string[];
  actionItems?: ActionItem[];
  decisions?: string[];
  topics?: string[];
  sentiment?: string;
  participants?: Array<{ name: string; role?: string; speakingTime?: number }>;
  aiModel?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: string;
}

interface Recording {
  id: string;
  meetingId: string;
  videoUrl?: string;
  audioUrl?: string;
  duration?: number;
  status: string;
  createdAt: string;
}

interface MeetingTranscriptionSummaryProps {
  meetingId: string;
  recordings?: Recording[];
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatTimestamp = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export function MeetingTranscriptionSummary({ meetingId, recordings = [] }: MeetingTranscriptionSummaryProps) {
  const { toast } = useToast();
  const [selectedRecordingId, setSelectedRecordingId] = useState<string>('');
  const [selectedTranscriptionId, setSelectedTranscriptionId] = useState<string>('');
  const [summaryType, setSummaryType] = useState<'brief' | 'comprehensive' | 'action_items' | 'key_decisions'>('comprehensive');

  const { data: transcriptions = [], isLoading: loadingTranscriptions, refetch: refetchTranscriptions } = useQuery<MeetingTranscription[]>({
    queryKey: ['/api/video-meetings', meetingId, 'transcriptions'],
    enabled: !!meetingId,
  });

  const { data: summaries = [], isLoading: loadingSummaries, refetch: refetchSummaries } = useQuery<MeetingSummary[]>({
    queryKey: ['/api/video-meetings', meetingId, 'summaries'],
    enabled: !!meetingId,
  });

  const generateTranscription = useMutation({
    mutationFn: async (recordingId: string) => {
      return apiRequest('POST', `/api/video-meetings/${meetingId}/transcriptions`, { recordingId });
    },
    onSuccess: () => {
      toast({ title: 'Transcription Started', description: 'Processing your recording...' });
      refetchTranscriptions();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const regenerateTranscription = useMutation({
    mutationFn: async (transcriptionId: string) => {
      return apiRequest('POST', `/api/transcriptions/${transcriptionId}/regenerate`);
    },
    onSuccess: () => {
      toast({ title: 'Regenerating', description: 'Reprocessing transcription...' });
      refetchTranscriptions();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteTranscription = useMutation({
    mutationFn: async (transcriptionId: string) => {
      return apiRequest('DELETE', `/api/transcriptions/${transcriptionId}`);
    },
    onSuccess: () => {
      toast({ title: 'Deleted', description: 'Transcription removed.' });
      refetchTranscriptions();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const generateSummary = useMutation({
    mutationFn: async ({ transcriptionId, type }: { transcriptionId: string; type: string }) => {
      return apiRequest('POST', `/api/video-meetings/${meetingId}/summaries`, { transcriptionId, summaryType: type });
    },
    onSuccess: () => {
      toast({ title: 'Summary Started', description: 'Generating AI summary...' });
      refetchSummaries();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const regenerateSummary = useMutation({
    mutationFn: async (summaryId: string) => {
      return apiRequest('POST', `/api/summaries/${summaryId}/regenerate`);
    },
    onSuccess: () => {
      toast({ title: 'Regenerating', description: 'Reprocessing summary...' });
      refetchSummaries();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteSummary = useMutation({
    mutationFn: async (summaryId: string) => {
      return apiRequest('DELETE', `/api/summaries/${summaryId}`);
    },
    onSuccess: () => {
      toast({ title: 'Deleted', description: 'Summary removed.' });
      refetchSummaries();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  const getSentimentBadge = (sentiment?: string) => {
    if (!sentiment) return null;
    const colors = {
      positive: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      negative: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      mixed: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    };
    return (
      <Badge variant="secondary" className={colors[sentiment as keyof typeof colors] || colors.neutral}>
        <TrendingUp className="w-3 h-3 mr-1" />
        {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
      </Badge>
    );
  };

  const completedTranscriptions = transcriptions.filter(t => t.status === 'completed');

  return (
    <Card data-testid="card-meeting-transcription-summary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Meeting Analysis
        </CardTitle>
        <CardDescription>Generate transcriptions and AI-powered summaries from your meeting recordings</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="transcriptions">
          <TabsList className="grid w-full grid-cols-2" data-testid="tabs-ai-analysis">
            <TabsTrigger value="transcriptions" data-testid="tab-transcriptions">
              <FileText className="w-4 h-4 mr-2" />
              Transcriptions
            </TabsTrigger>
            <TabsTrigger value="summaries" data-testid="tab-summaries">
              <Sparkles className="w-4 h-4 mr-2" />
              Summaries
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transcriptions" className="space-y-4">
            {recordings.length > 0 && (
              <div className="flex items-end gap-2 p-4 rounded-lg border bg-muted/30">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Generate from Recording</label>
                  <Select value={selectedRecordingId} onValueChange={setSelectedRecordingId}>
                    <SelectTrigger data-testid="select-recording">
                      <SelectValue placeholder="Select a recording..." />
                    </SelectTrigger>
                    <SelectContent>
                      {recordings.map((rec) => (
                        <SelectItem key={rec.id} value={rec.id}>
                          Recording from {format(new Date(rec.createdAt), 'MMM d, h:mm a')}
                          {rec.duration && ` (${formatDuration(rec.duration)})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => selectedRecordingId && generateTranscription.mutate(selectedRecordingId)}
                  disabled={!selectedRecordingId || generateTranscription.isPending}
                  data-testid="button-generate-transcription"
                >
                  {generateTranscription.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 mr-2" />
                  )}
                  Generate Transcription
                </Button>
              </div>
            )}

            {loadingTranscriptions ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : transcriptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No transcriptions yet</p>
                <p className="text-sm">Select a recording above to generate a transcription</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transcriptions.map((transcription) => (
                  <Card key={transcription.id} className="border" data-testid={`card-transcription-${transcription.id}`}>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(transcription.status)}
                          {transcription.wordCount && (
                            <Badge variant="outline">{transcription.wordCount} words</Badge>
                          )}
                          {transcription.duration && (
                            <Badge variant="outline">{formatDuration(transcription.duration)}</Badge>
                          )}
                          {transcription.language && (
                            <Badge variant="outline">{transcription.language.toUpperCase()}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {transcription.status === 'failed' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => regenerateTranscription.mutate(transcription.id)}
                              disabled={regenerateTranscription.isPending}
                              data-testid={`button-regenerate-transcription-${transcription.id}`}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" data-testid={`button-delete-transcription-${transcription.id}`}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Transcription</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this transcription? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteTranscription.mutate(transcription.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created {format(new Date(transcription.createdAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    </CardHeader>
                    {transcription.status === 'completed' && transcription.transcriptionText && (
                      <CardContent>
                        {transcription.segments && transcription.segments.length > 0 ? (
                          <ScrollArea className="h-48 rounded-md border p-4">
                            <div className="space-y-3">
                              {transcription.segments.map((segment, idx) => (
                                <div key={idx} className="flex gap-3">
                                  <span className="text-xs text-muted-foreground w-12 flex-shrink-0 font-mono">
                                    {formatTimestamp(segment.startTime)}
                                  </span>
                                  {segment.speaker && (
                                    <span className="text-xs font-medium text-primary w-20 flex-shrink-0">
                                      {segment.speaker}:
                                    </span>
                                  )}
                                  <p className="text-sm flex-1">{segment.text}</p>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        ) : (
                          <ScrollArea className="h-48 rounded-md border p-4">
                            <p className="text-sm whitespace-pre-wrap">{transcription.transcriptionText}</p>
                          </ScrollArea>
                        )}
                      </CardContent>
                    )}
                    {transcription.status === 'failed' && transcription.errorMessage && (
                      <CardContent>
                        <div className="text-sm text-destructive">{transcription.errorMessage}</div>
                      </CardContent>
                    )}
                    {transcription.status === 'processing' && (
                      <CardContent>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing audio and generating transcription...
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="summaries" className="space-y-4">
            {completedTranscriptions.length > 0 && (
              <div className="flex items-end gap-2 p-4 rounded-lg border bg-muted/30">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Generate from Transcription</label>
                  <Select value={selectedTranscriptionId} onValueChange={setSelectedTranscriptionId}>
                    <SelectTrigger data-testid="select-transcription">
                      <SelectValue placeholder="Select a transcription..." />
                    </SelectTrigger>
                    <SelectContent>
                      {completedTranscriptions.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          Transcription from {format(new Date(t.createdAt), 'MMM d, h:mm a')}
                          {t.wordCount && ` (${t.wordCount} words)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Summary Type</label>
                  <Select value={summaryType} onValueChange={(v) => setSummaryType(v as any)}>
                    <SelectTrigger className="w-40" data-testid="select-summary-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comprehensive">Comprehensive</SelectItem>
                      <SelectItem value="brief">Brief</SelectItem>
                      <SelectItem value="action_items">Action Items</SelectItem>
                      <SelectItem value="key_decisions">Key Decisions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => selectedTranscriptionId && generateSummary.mutate({ transcriptionId: selectedTranscriptionId, type: summaryType })}
                  disabled={!selectedTranscriptionId || generateSummary.isPending}
                  data-testid="button-generate-summary"
                >
                  {generateSummary.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Generate Summary
                </Button>
              </div>
            )}

            {completedTranscriptions.length === 0 && (
              <div className="p-4 rounded-lg border bg-muted/30 text-center">
                <p className="text-sm text-muted-foreground">
                  Generate a transcription first to create AI summaries
                </p>
              </div>
            )}

            {loadingSummaries ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : summaries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No summaries yet</p>
                <p className="text-sm">Generate a transcription first, then create an AI summary</p>
              </div>
            ) : (
              <div className="space-y-4">
                {summaries.map((summary) => (
                  <Card key={summary.id} className="border" data-testid={`card-summary-${summary.id}`}>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(summary.status)}
                          <Badge variant="outline" className="capitalize">{summary.summaryType.replace('_', ' ')}</Badge>
                          {getSentimentBadge(summary.sentiment)}
                          {summary.aiModel && (
                            <Badge variant="outline">{summary.aiModel}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {summary.status === 'failed' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => regenerateSummary.mutate(summary.id)}
                              disabled={regenerateSummary.isPending}
                              data-testid={`button-regenerate-summary-${summary.id}`}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" data-testid={`button-delete-summary-${summary.id}`}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Summary</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this summary? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteSummary.mutate(summary.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created {format(new Date(summary.createdAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    </CardHeader>
                    {summary.status === 'completed' && (
                      <CardContent className="space-y-4">
                        {summary.summaryText && (
                          <div>
                            <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                              <MessageSquare className="w-4 h-4" />
                              Overview
                            </h4>
                            <p className="text-sm text-muted-foreground">{summary.summaryText}</p>
                          </div>
                        )}

                        {summary.keyPoints && summary.keyPoints.length > 0 && (
                          <>
                            <Separator />
                            <div>
                              <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                                <Target className="w-4 h-4" />
                                Key Points
                              </h4>
                              <ul className="list-disc list-inside space-y-1">
                                {summary.keyPoints.map((point, idx) => (
                                  <li key={idx} className="text-sm text-muted-foreground">{point}</li>
                                ))}
                              </ul>
                            </div>
                          </>
                        )}

                        {summary.actionItems && summary.actionItems.length > 0 && (
                          <>
                            <Separator />
                            <div>
                              <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                                <ListChecks className="w-4 h-4" />
                                Action Items
                              </h4>
                              <div className="space-y-2">
                                {summary.actionItems.map((item, idx) => (
                                  <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                                    <div className="w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5">
                                      {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm">{item.description}</p>
                                      <div className="flex gap-2 mt-1 flex-wrap">
                                        {item.assignee && (
                                          <Badge variant="outline" className="text-xs">
                                            <Users className="w-3 h-3 mr-1" />
                                            {item.assignee}
                                          </Badge>
                                        )}
                                        {item.dueDate && (
                                          <Badge variant="outline" className="text-xs">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {item.dueDate}
                                          </Badge>
                                        )}
                                        {item.priority && (
                                          <Badge
                                            variant="outline"
                                            className={`text-xs ${
                                              item.priority === 'high' ? 'border-red-500 text-red-500' :
                                              item.priority === 'medium' ? 'border-yellow-500 text-yellow-500' :
                                              'border-green-500 text-green-500'
                                            }`}
                                          >
                                            {item.priority}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        {summary.decisions && summary.decisions.length > 0 && (
                          <>
                            <Separator />
                            <div>
                              <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                                <CheckCircle className="w-4 h-4" />
                                Decisions Made
                              </h4>
                              <ul className="list-disc list-inside space-y-1">
                                {summary.decisions.map((decision, idx) => (
                                  <li key={idx} className="text-sm text-muted-foreground">{decision}</li>
                                ))}
                              </ul>
                            </div>
                          </>
                        )}

                        {summary.topics && summary.topics.length > 0 && (
                          <>
                            <Separator />
                            <div>
                              <h4 className="text-sm font-medium mb-2">Topics Discussed</h4>
                              <div className="flex flex-wrap gap-2">
                                {summary.topics.map((topic, idx) => (
                                  <Badge key={idx} variant="secondary">{topic}</Badge>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    )}
                    {summary.status === 'failed' && summary.errorMessage && (
                      <CardContent>
                        <div className="text-sm text-destructive">{summary.errorMessage}</div>
                      </CardContent>
                    )}
                    {summary.status === 'processing' && (
                      <CardContent>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          AI is analyzing the transcription and generating summary...
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
