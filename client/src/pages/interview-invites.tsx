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
import { Plus, Copy, Mail, Calendar, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function InterviewInvites() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: invites = [], isLoading } = useQuery<InterviewInvite[]>({
    queryKey: ["/api/interview-invites"],
  });

  const { data: templates = [] } = useQuery<InterviewTemplate[]>({
    queryKey: ["/api/interview-templates"],
  });

  const { data: cases = [] } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  const form = useForm<InsertInterviewInvite>({
    resolver: zodResolver(insertInterviewInviteSchema),
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
    mutationFn: async (data: InsertInterviewInvite) => {
      return await apiRequest("/api/interview-invites", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interview-invites"] });
      setIsCreateOpen(false);
      form.reset();
      toast({ title: "Interview invite created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error creating invite", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: InsertInterviewInvite) => {
    createMutation.mutate(data);
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/interview/${token}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copied to clipboard" });
  };

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

  if (isLoading) {
    return <div className="p-6">Loading invites...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Interview Invites</h1>
          <p className="text-muted-foreground">Send secure AI interview links to interviewees</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-invite">
              <Plus className="w-4 h-4" />
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
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interview Template</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-template">
                            <SelectValue placeholder="Select template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {templates.filter(t => t.isActive === "true").map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
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
                        <Input {...field} type="email" placeholder="john.doe@example.com" data-testid="input-interviewee-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration Date</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                          data-testid="input-expires-at"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-invite">
                    {createMutation.isPending ? "Creating..." : "Create Invite"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

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
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </Button>
                  {invite.status === "draft" && (
                    <Button variant="outline" size="sm" data-testid={`button-send-${invite.id}`}>
                      <Mail className="w-4 h-4" />
                      Send Email
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {invites.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No interview invites yet. Create your first invite to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
