import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInterviewInviteSchema, type InsertInterviewInvite, type InterviewInvite, type InterviewTemplate, type Case } from "@shared/schema";
import { Plus, Copy, Mail, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Send, Rocket } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface InterviewInvitesPanelProps {
  cases?: Case[];
  templates?: InterviewTemplate[];
}

const statusIcons: Record<string, any> = {
  draft: AlertCircle,
  sent: Mail,
  opened: Clock,
  in_progress: Clock,
  completed: CheckCircle2,
  expired: XCircle,
  cancelled: XCircle,
};

const statusVariants: Record<string, any> = {
  draft: "secondary",
  sent: "default",
  opened: "default",
  in_progress: "default",
  completed: "default",
  expired: "destructive",
  cancelled: "destructive",
};

export default function InterviewInvitesPanel({ cases: propCases, templates: propTemplates }: InterviewInvitesPanelProps) {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sendInstantly, setSendInstantly] = useState(true);

  const { data: invites = [], isLoading } = useQuery<InterviewInvite[]>({
    queryKey: ["/api/interview-invites"],
  });

  const { data: queriedTemplates = [] } = useQuery<InterviewTemplate[]>({
    queryKey: ["/api/interview-templates"],
    enabled: !propTemplates,
  });

  const { data: queriedCases = [] } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
    enabled: !propCases,
  });

  const templates = propTemplates || queriedTemplates;
  const cases = propCases || queriedCases;

  // Client-side schema omits createdBy since it's set by the server
  const clientFormSchema = insertInterviewInviteSchema.omit({
    createdBy: true,
  });

  const form = useForm<InsertInterviewInvite>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      caseId: "",
      interviewTemplateId: "",
      intervieweeEmail: "",
      intervieweeName: "",
      deliveryChannel: "email",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "draft",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertInterviewInvite & { sendInstantly?: boolean }) => {
      return await apiRequest("POST", "/api/interview-invites", data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/interview-invites"] });
      setIsCreateOpen(false);
      form.reset();
      if (variables.sendInstantly) {
        toast({ 
          title: "Interview link sent!", 
          description: "The witness will receive the interview link via email immediately."
        });
      } else {
        toast({ title: "Interview invite created as draft" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error creating invite", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: InsertInterviewInvite) => {
    createMutation.mutate({
      ...data,
      status: sendInstantly ? "sent" : "draft",
      sendInstantly,
    });
  };

  const sendNowMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      return await apiRequest("POST", `/api/interview-invites/${inviteId}/send`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interview-invites"] });
      toast({ 
        title: "Interview link sent!", 
        description: "The witness will receive the interview link via email."
      });
    },
    onError: (error: any) => {
      toast({ title: "Error sending invite", description: error.message, variant: "destructive" });
    },
  });

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/interview/${token}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copied to clipboard", description: "Witness can use this link to start their video interview." });
  };

  const handleSendNow = (inviteId: string) => {
    sendNowMutation.mutate(inviteId);
  };

  return (
    <Accordion type="single" collapsible defaultValue="invites">
      <AccordionItem value="invites" className="border-0">
        <Card>
          <div className="flex items-center justify-between px-6 py-4">
            <AccordionTrigger className="hover:no-underline flex-1 p-0" data-testid="accordion-trigger-invites">
              <div className="flex flex-col items-start text-left">
                <CardTitle>Interview Invites</CardTitle>
                <CardDescription>Send secure AI interview links to interviewees</CardDescription>
              </div>
            </AccordionTrigger>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button 
                  data-testid="button-create-invite"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Invite
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Interview Invite</DialogTitle>
                  <DialogDescription>
                    Generate a secure link for an AI-powered interview session
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="caseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Case</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-case">
                              <SelectValue placeholder="Select case" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cases.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.caseNumber} - {c.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="interviewTemplateId"
                    render={({ field }) => {
                      const activeTemplates = templates.filter(t => t.isActive === "true");
                      return (
                        <FormItem>
                          <FormLabel>Interview Template</FormLabel>
                          {activeTemplates.length === 0 ? (
                            <div className="text-sm text-amber-500 p-3 border border-amber-500/30 rounded-md bg-amber-500/10">
                              No interview templates available. Please create a template first in the Templates tab.
                            </div>
                          ) : (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-template">
                                  <SelectValue placeholder="Select template" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {activeTemplates.map((t) => (
                                  <SelectItem key={t.id} value={t.id}>
                                    {t.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="intervieweeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interviewee Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="John Doe" data-testid="input-interviewee-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="intervieweeEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interviewee Email</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} type="email" placeholder="john.doe@example.com" data-testid="input-interviewee-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expiresAt"
                    render={({ field }) => {
                      const formatDateForInput = (dateValue: Date | string | null | undefined): string => {
                        if (!dateValue) return "";
                        try {
                          const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
                          if (isNaN(date.getTime())) return "";
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          const hours = String(date.getHours()).padStart(2, '0');
                          const minutes = String(date.getMinutes()).padStart(2, '0');
                          return `${year}-${month}-${day}T${hours}:${minutes}`;
                        } catch {
                          return "";
                        }
                      };
                      return (
                        <FormItem>
                          <FormLabel>Expiration Date</FormLabel>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              value={formatDateForInput(field.value)}
                              onChange={(e) => {
                                if (e.target.value) {
                                  field.onChange(new Date(e.target.value));
                                } else {
                                  field.onChange(undefined);
                                }
                              }}
                              data-testid="input-expires-at"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <div className="flex items-center justify-between border-t pt-4 mt-4">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="send-instantly"
                        checked={sendInstantly}
                        onCheckedChange={setSendInstantly}
                        data-testid="switch-send-instantly"
                      />
                      <label 
                        htmlFor="send-instantly" 
                        className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                      >
                        <Rocket className="w-4 h-4 text-primary" />
                        Send link instantly
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel">
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createMutation.isPending || templates.filter(t => t.isActive === "true").length === 0} 
                        data-testid="button-submit-invite"
                      >
                        {createMutation.isPending ? (sendInstantly ? "Sending..." : "Creating...") : (sendInstantly ? "Create & Send Now" : "Save as Draft")}
                      </Button>
                    </div>
                  </div>
                  {Object.keys(form.formState.errors).length > 0 && (
                    <div className="text-sm text-destructive">
                      Please fill in all required fields correctly.
                    </div>
                  )}
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          <AccordionContent>
          <CardContent className="pt-0">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading invites...</div>
        ) : invites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Send className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No interview invites yet. Create your first invite to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invites.map((invite) => {
              const StatusIcon = statusIcons[invite.status] || AlertCircle;
              const caseData = cases.find(c => c.id === invite.caseId);
              const template = templates.find(t => t.id === invite.interviewTemplateId);

              return (
                <Card key={invite.id} data-testid={`card-invite-${invite.id}`} className="hover-elevate">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <StatusIcon className="w-5 h-5" />
                          {invite.intervieweeName}
                        </CardTitle>
                        <CardDescription>{invite.intervieweeEmail}</CardDescription>
                      </div>
                      <Badge variant={statusVariants[invite.status]}>
                        {invite.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Case</p>
                        <p className="font-medium">{caseData?.caseNumber}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Template</p>
                        <p className="font-medium">{template?.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p className="font-medium">{format(new Date(invite.createdAt), "MMM d, yyyy")}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Expires</p>
                        <p className="font-medium">{format(new Date(invite.expiresAt), "MMM d, yyyy")}</p>
                      </div>
                      {invite.sentAt && (
                        <div>
                          <p className="text-muted-foreground">Sent</p>
                          <p className="font-medium">{format(new Date(invite.sentAt), "MMM d, yyyy HH:mm")}</p>
                        </div>
                      )}
                      {invite.openedAt && (
                        <div>
                          <p className="text-muted-foreground">Opened</p>
                          <p className="font-medium">{format(new Date(invite.openedAt), "MMM d, yyyy HH:mm")}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyInviteLink(invite.uniqueToken)}
                        data-testid={`button-copy-link-${invite.id}`}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Link
                      </Button>
                      {invite.status === "draft" && (
                        <Button 
                          size="sm" 
                          onClick={() => handleSendNow(invite.id)}
                          disabled={sendNowMutation.isPending}
                          data-testid={`button-send-${invite.id}`}
                        >
                          <Rocket className="w-4 h-4 mr-2" />
                          {sendNowMutation.isPending ? "Sending..." : "Send Now"}
                        </Button>
                      )}
                      {invite.status === "sent" && !invite.openedAt && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleSendNow(invite.id)}
                          disabled={sendNowMutation.isPending}
                          data-testid={`button-resend-${invite.id}`}
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Resend
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
          </CardContent>
        </AccordionContent>
      </Card>
      </AccordionItem>
    </Accordion>
  );
}
