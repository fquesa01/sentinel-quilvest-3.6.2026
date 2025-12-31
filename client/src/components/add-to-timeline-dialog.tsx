import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { CalendarPlus, Clock, FileText, Shield, MessageSquare, Mail, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface AddToTimelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  documentId: string;
  documentSubject: string;
  documentType: string;
  documentTimestamp?: string;
  sender?: string;
}

const EVENT_TYPES = [
  { value: "email_thread", label: "Email", icon: Mail },
  { value: "chat_thread", label: "Chat/Message", icon: MessageSquare },
  { value: "manual", label: "Manual Entry", icon: FileText },
  { value: "correspondence_received", label: "Correspondence Received", icon: Mail },
  { value: "correspondence_sent", label: "Correspondence Sent", icon: Send },
];

const PRIVILEGE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "attorney_client", label: "Attorney-Client Privilege" },
  { value: "work_product", label: "Work Product" },
  { value: "confidential", label: "Confidential" },
];

const IMPORTANCE_OPTIONS = [
  { value: 20, label: "Low" },
  { value: 50, label: "Normal" },
  { value: 80, label: "High" },
  { value: 100, label: "Critical" },
];

export function AddToTimelineDialog({
  open,
  onOpenChange,
  caseId,
  documentId,
  documentSubject,
  documentType,
  documentTimestamp,
  sender,
}: AddToTimelineDialogProps) {
  const { toast } = useToast();
  
  const getDefaultEventType = (docType: string) => 
    docType === "email" ? "email_thread" : 
    docType === "chat" ? "chat_thread" : "manual";

  const getFormattedDate = (timestamp?: string) =>
    timestamp 
      ? format(new Date(timestamp), "yyyy-MM-dd'T'HH:mm")
      : format(new Date(), "yyyy-MM-dd'T'HH:mm");
  
  const [eventType, setEventType] = useState(getDefaultEventType(documentType));
  const [title, setTitle] = useState(documentSubject);
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [privilegeStatus, setPrivilegeStatus] = useState("none");
  const [importanceScore, setImportanceScore] = useState(50);
  const [eventDate, setEventDate] = useState(getFormattedDate(documentTimestamp));

  // Sync form state when document changes or dialog opens
  useEffect(() => {
    if (open) {
      setEventType(getDefaultEventType(documentType));
      setTitle(documentSubject);
      setSummary("");
      setNotes("");
      setPrivilegeStatus("none");
      setImportanceScore(50);
      setEventDate(getFormattedDate(documentTimestamp));
    }
  }, [open, documentId, documentSubject, documentType, documentTimestamp]);

  const addToTimelineMutation = useMutation({
    mutationFn: async (data: {
      caseId: string;
      eventType: string;
      title: string;
      summary?: string;
      notes?: string;
      eventDate: Date;
      privilegeStatus?: string;
      importanceScore: number;
      sourceDocumentIds: string[];
      participants?: string[];
    }) => {
      const response = await apiRequest("POST", `/api/cases/${caseId}/timeline`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Added to Timeline",
        description: "The document has been added to the case timeline.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "timeline"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add to timeline",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setEventType(getDefaultEventType(documentType));
    setTitle(documentSubject);
    setSummary("");
    setNotes("");
    setPrivilegeStatus("none");
    setImportanceScore(50);
    setEventDate(getFormattedDate(documentTimestamp));
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    addToTimelineMutation.mutate({
      caseId,
      eventType,
      title: title.trim(),
      summary: summary.trim() || undefined,
      notes: notes.trim() || undefined,
      eventDate: new Date(eventDate),
      privilegeStatus: privilegeStatus !== "none" ? privilegeStatus : undefined,
      importanceScore,
      sourceDocumentIds: [documentId],
      participants: sender ? [sender] : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            Add to Case Timeline
          </DialogTitle>
          <DialogDescription>
            Create a timeline entry for this document/communication.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="event-type">Event Type</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger id="event-type" data-testid="select-timeline-event-type">
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              data-testid="input-timeline-title"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="event-date">Event Date</Label>
            <Input
              id="event-date"
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              data-testid="input-timeline-date"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="summary">Summary (optional)</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief summary of this event..."
              rows={2}
              data-testid="textarea-timeline-summary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="privilege">Privilege Status</Label>
              <Select value={privilegeStatus} onValueChange={setPrivilegeStatus}>
                <SelectTrigger id="privilege" data-testid="select-timeline-privilege">
                  <SelectValue placeholder="Select privilege" />
                </SelectTrigger>
                <SelectContent>
                  {PRIVILEGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="importance">Importance</Label>
              <Select 
                value={importanceScore.toString()} 
                onValueChange={(v) => setImportanceScore(parseInt(v))}
              >
                <SelectTrigger id="importance" data-testid="select-timeline-importance">
                  <SelectValue placeholder="Select importance" />
                </SelectTrigger>
                <SelectContent>
                  {IMPORTANCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes about this timeline entry..."
              rows={2}
              data-testid="textarea-timeline-notes"
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-timeline"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={addToTimelineMutation.isPending}
            data-testid="button-submit-timeline"
          >
            {addToTimelineMutation.isPending ? "Adding..." : "Add to Timeline"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
