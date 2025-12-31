import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface ScheduleLiveInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  parties?: Array<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
  }>;
}

export function ScheduleLiveInterviewDialog({
  open,
  onOpenChange,
  caseId,
  parties = [],
}: ScheduleLiveInterviewDialogProps) {
  const { toast } = useToast();
  const [selectedPartyId, setSelectedPartyId] = useState<string>("");
  const [intervieweeName, setIntervieweeName] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [customPhone, setCustomPhone] = useState("");
  const [interviewType, setInterviewType] = useState<string>("virtual");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [purpose, setPurpose] = useState("");
  const [deliveryEmail, setDeliveryEmail] = useState(true);
  const [deliverySms, setDeliverySms] = useState(false);

  const selectedParty = parties.find((p) => p.id === selectedPartyId);

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      // Validation
      const name = selectedParty?.name || intervieweeName;
      if (!name || name.trim() === "") {
        throw new Error("Please enter the interviewee name or select a party");
      }

      if (!interviewType) {
        throw new Error("Please select an interview type");
      }

      if (!scheduledDate || !scheduledTime) {
        throw new Error("Please provide date and time for the interview");
      }

      if (!deliveryEmail && !deliverySms) {
        throw new Error("Please select at least one delivery method");
      }

      const email = customEmail || selectedParty?.email;
      const phone = customPhone || selectedParty?.phone;

      if (deliveryEmail && !email) {
        throw new Error("Email is required for email delivery");
      }

      if (deliverySms && !phone) {
        throw new Error("Phone number is required for SMS delivery");
      }

      if (interviewType === "in_person" && !location) {
        throw new Error("Location is required for in-person interviews");
      }

      if (interviewType === "virtual" && !meetingLink) {
        throw new Error("Meeting link is required for virtual interviews");
      }

      // Combine date and time into a proper ISO string
      // Input format: scheduledDate = "YYYY-MM-DD", scheduledTime = "HH:MM"
      const dateTimeString = `${scheduledDate}T${scheduledTime}:00`;
      const scheduledFor = new Date(dateTimeString).toISOString();

      return await apiRequest("POST", "/api/interviews/schedule-live", {
        caseId,
        intervieweeName: name,
        intervieweeEmail: email,
        intervieweePhone: phone,
        interviewType,
        scheduledFor,
        location: interviewType === "in_person" ? location : undefined,
        meetingLink: interviewType === "virtual" ? meetingLink : undefined,
        purpose,
        deliveryChannel: deliveryEmail && deliverySms ? "both" : deliveryEmail ? "email" : "sms",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "stats"] });
      toast({
        title: "Interview Scheduled",
        description: "The live interview has been scheduled and invitation sent successfully.",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Schedule Interview",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedPartyId("");
    setIntervieweeName("");
    setCustomEmail("");
    setCustomPhone("");
    setInterviewType("virtual");
    setScheduledDate("");
    setScheduledTime("");
    setLocation("");
    setMeetingLink("");
    setPurpose("");
    setDeliveryEmail(true);
    setDeliverySms(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-schedule-live-interview">
        <DialogHeader>
          <DialogTitle>Schedule Live Interview</DialogTitle>
          <DialogDescription>
            Schedule an in-person or virtual interview and send invitation via email/SMS
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Select Party (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="party-select">Select Existing Party / Custodian (Optional)</Label>
            <Select value={selectedPartyId} onValueChange={setSelectedPartyId}>
              <SelectTrigger id="party-select" data-testid="select-party">
                <SelectValue placeholder="Choose a party or leave blank to enter manually" />
              </SelectTrigger>
              <SelectContent>
                {parties.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    No parties available. You can enter contact information manually below.
                  </div>
                ) : (
                  parties.map((party) => (
                    <SelectItem key={party.id} value={party.id} data-testid={`option-party-${party.id}`}>
                      {party.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Manual Entry: Name (shown when no party selected) */}
          {!selectedPartyId && (
            <div className="space-y-2">
              <Label htmlFor="interviewee-name">Interviewee Name *</Label>
              <Input
                id="interviewee-name"
                type="text"
                placeholder="Enter name"
                value={intervieweeName}
                onChange={(e) => setIntervieweeName(e.target.value)}
                data-testid="input-interviewee-name"
              />
            </div>
          )}

          {/* Interview Type */}
          <div className="space-y-2">
            <Label htmlFor="interview-type">Interview Type *</Label>
            <Select value={interviewType} onValueChange={setInterviewType}>
              <SelectTrigger id="interview-type" data-testid="select-interview-type">
                <SelectValue placeholder="Select interview type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="virtual" data-testid="option-type-virtual">
                  Virtual (Zoom, Teams, etc.)
                </SelectItem>
                <SelectItem value="in_person" data-testid="option-type-in-person">
                  In-Person
                </SelectItem>
                <SelectItem value="phone" data-testid="option-type-phone">
                  Phone Call
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled-date">Date *</Label>
              <Input
                id="scheduled-date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                data-testid="input-scheduled-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduled-time">Time *</Label>
              <Input
                id="scheduled-time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                data-testid="input-scheduled-time"
              />
            </div>
          </div>

          {/* Location (for in-person) */}
          {interviewType === "in_person" && (
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                type="text"
                placeholder="Enter location address"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                data-testid="input-location"
              />
            </div>
          )}

          {/* Meeting Link (for virtual) */}
          {interviewType === "virtual" && (
            <div className="space-y-2">
              <Label htmlFor="meeting-link">Meeting Link *</Label>
              <Input
                id="meeting-link"
                type="url"
                placeholder="https://zoom.us/j/..."
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                data-testid="input-meeting-link"
              />
            </div>
          )}

          {/* Purpose/Notes */}
          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose / Notes</Label>
            <Textarea
              id="purpose"
              placeholder="Brief description of the interview purpose..."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={3}
              data-testid="textarea-purpose"
            />
          </div>

          {/* Contact Information */}
          <div className="space-y-4 rounded-md border p-4 bg-muted/50">
            <h4 className="font-medium text-sm">Contact Information</h4>
            
            <div className="space-y-2">
              <Label htmlFor="email-input">Email Address {deliveryEmail && "*"}</Label>
              <Input
                id="email-input"
                type="email"
                placeholder={selectedParty?.email || "Enter email address"}
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone-input">Phone Number {deliverySms && "*"}</Label>
              <Input
                id="phone-input"
                type="tel"
                placeholder={selectedParty?.phone || "Enter phone number"}
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                data-testid="input-phone"
              />
            </div>
          </div>

          {/* Delivery Method */}
          <div className="space-y-3">
            <Label>Send Invitation Via *</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="delivery-email"
                  checked={deliveryEmail}
                  onCheckedChange={(checked) => setDeliveryEmail(checked as boolean)}
                  data-testid="checkbox-delivery-email"
                />
                <Label htmlFor="delivery-email" className="font-normal cursor-pointer">
                  Email
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="delivery-sms"
                  checked={deliverySms}
                  onCheckedChange={(checked) => setDeliverySms(checked as boolean)}
                  data-testid="checkbox-delivery-sms"
                />
                <Label htmlFor="delivery-sms" className="font-normal cursor-pointer">
                  SMS
                </Label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={scheduleMutation.isPending}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={() => scheduleMutation.mutate()}
            disabled={scheduleMutation.isPending}
            data-testid="button-schedule-interview"
          >
            {scheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Schedule & Send Invitation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
