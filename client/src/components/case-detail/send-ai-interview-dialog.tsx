import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface SendAIInterviewDialogProps {
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

export function SendAIInterviewDialog({
  open,
  onOpenChange,
  caseId,
  parties = [],
}: SendAIInterviewDialogProps) {
  const { toast } = useToast();
  const [selectedPartyId, setSelectedPartyId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [deliveryEmail, setDeliveryEmail] = useState(true);
  const [deliverySms, setDeliverySms] = useState(false);
  const [intervieweeName, setIntervieweeName] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [customPhone, setCustomPhone] = useState("");

  // Fetch interview templates
  const { data: templates = [] } = useQuery<Array<{
    id: string;
    name: string;
    description: string | null;
  }>>({
    queryKey: ["/api/interview-templates"],
    enabled: open,
  });

  const selectedParty = parties.find((p) => p.id === selectedPartyId);

  const sendInterviewMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplateId) {
        throw new Error("Please select an interview template");
      }

      const name = selectedParty?.name || intervieweeName;
      if (!name || name.trim() === "") {
        throw new Error("Please enter the interviewee name or select a party");
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

      return await apiRequest("POST", "/api/interview-invites", {
        caseId,
        interviewTemplateId: selectedTemplateId,
        intervieweeName: name,
        intervieweeEmail: email,
        intervieweePhone: phone,
        deliveryChannel: deliveryEmail && deliverySms ? "both" : deliveryEmail ? "email" : "sms",
        status: "draft",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interview-invites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      toast({
        title: "Interview Invitation Sent",
        description: "The AI interview invitation has been sent successfully.",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send Interview",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedPartyId("");
    setSelectedTemplateId("");
    setDeliveryEmail(true);
    setDeliverySms(false);
    setIntervieweeName("");
    setCustomEmail("");
    setCustomPhone("");
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-send-ai-interview">
        <DialogHeader>
          <DialogTitle>Send AI Interview Invitation</DialogTitle>
          <DialogDescription>
            Send an AI-powered interview invitation to a party or custodian in this case
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

          {/* Select Template */}
          <div className="space-y-2">
            <Label htmlFor="template-select">Interview Template *</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger id="template-select" data-testid="select-template">
                <SelectValue placeholder="Choose an interview template" />
              </SelectTrigger>
              <SelectContent>
                {templates.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    No templates available
                  </div>
                ) : (
                  templates.map((template) => (
                    <SelectItem key={template.id} value={template.id} data-testid={`option-template-${template.id}`}>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-xs text-muted-foreground">{template.description}</div>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
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
            <Label>Delivery Method *</Label>
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
            disabled={sendInterviewMutation.isPending}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={() => sendInterviewMutation.mutate()}
            disabled={sendInterviewMutation.isPending || !selectedTemplateId}
            data-testid="button-send-interview"
          >
            {sendInterviewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Interview Invitation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
