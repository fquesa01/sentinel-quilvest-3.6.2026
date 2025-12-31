import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Helmet } from 'react-helmet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Video, Loader2 } from 'lucide-react';
import { Link } from 'wouter';
import type { Case } from '@shared/schema';

export default function CreateVideoMeetingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [meetingType, setMeetingType] = useState('deposition');
  const [caseId, setCaseId] = useState('');
  const [scheduledStartTime, setScheduledStartTime] = useState('');
  const [recordingEnabled, setRecordingEnabled] = useState(true);
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(true);

  const { data: cases } = useQuery<Case[]>({
    queryKey: ['/api/cases'],
  });

  const createMeetingMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      meetingType: string;
      caseId?: string;
      scheduledStartTime?: string;
      recordingEnabled: string;
      transcriptionEnabled: string;
    }) => {
      const response = await apiRequest('POST', '/api/video-meetings', data);
      return response.json();
    },
    onSuccess: (meeting) => {
      queryClient.invalidateQueries({ queryKey: ['/api/video-meetings'] });
      toast({
        title: 'Meeting Created',
        description: 'Your video meeting has been scheduled.',
      });
      setLocation(`/video-meeting/${meeting.roomId}`);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create meeting',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a meeting title',
        variant: 'destructive',
      });
      return;
    }

    createMeetingMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      meetingType,
      caseId: caseId || undefined,
      scheduledStartTime: scheduledStartTime || undefined,
      recordingEnabled: recordingEnabled ? 'true' : 'false',
      transcriptionEnabled: transcriptionEnabled ? 'true' : 'false',
    });
  };

  const meetingTypes = [
    { value: 'deposition', label: 'Deposition' },
    { value: 'recorded_statement', label: 'Recorded Statement' },
    { value: 'witness_interview', label: 'Witness Interview' },
    { value: 'expert_consultation', label: 'Expert Consultation' },
    { value: 'client_meeting', label: 'Client Meeting' },
    { value: 'team_meeting', label: 'Team Meeting' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <>
      <Helmet>
        <title>Create Video Meeting - Sentinel Counsel LLP</title>
      </Helmet>

      <div className="container max-w-2xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Link href="/interviews">
            <Button variant="ghost" size="sm" data-testid="button-back-to-interviews">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Interviews
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Video className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Create Video Meeting</CardTitle>
                <CardDescription>
                  Schedule a video conference for depositions, interviews, or team meetings
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Meeting Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Deposition of John Smith"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="input-meeting-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Optional meeting description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  data-testid="input-meeting-description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="meetingType">Meeting Type</Label>
                  <Select value={meetingType} onValueChange={setMeetingType}>
                    <SelectTrigger data-testid="select-meeting-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {meetingTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="caseId">Link to Case (Optional)</Label>
                  <Select value={caseId || "none"} onValueChange={(val) => setCaseId(val === "none" ? "" : val)}>
                    <SelectTrigger data-testid="select-case">
                      <SelectValue placeholder="Select a case" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No case</SelectItem>
                      {cases?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.caseNumber ? `${c.caseNumber} - ` : ''}{c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduledStartTime">Scheduled Start Time (Optional)</Label>
                <Input
                  id="scheduledStartTime"
                  type="datetime-local"
                  value={scheduledStartTime}
                  onChange={(e) => setScheduledStartTime(e.target.value)}
                  data-testid="input-scheduled-time"
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Meeting Settings</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="recording">Enable Recording</Label>
                    <p className="text-sm text-muted-foreground">
                      Record the video meeting for later review
                    </p>
                  </div>
                  <Switch
                    id="recording"
                    checked={recordingEnabled}
                    onCheckedChange={setRecordingEnabled}
                    data-testid="switch-recording"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="transcription">Enable Live Transcription</Label>
                    <p className="text-sm text-muted-foreground">
                      Real-time speech-to-text during the meeting
                    </p>
                  </div>
                  <Switch
                    id="transcription"
                    checked={transcriptionEnabled}
                    onCheckedChange={setTranscriptionEnabled}
                    data-testid="switch-transcription"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Link href="/interviews">
                  <Button type="button" variant="outline" data-testid="button-cancel">
                    Cancel
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  disabled={createMeetingMutation.isPending}
                  data-testid="button-create-meeting"
                >
                  {createMeetingMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Video className="h-4 w-4 mr-2" />
                      Create Meeting
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
