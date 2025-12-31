import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, FileText, Check, X, Clock, Send, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDisclosurePlaybookSchema, type DisclosurePlaybook } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function DisclosurePlaybooks() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: playbooks, isLoading } = useQuery<DisclosurePlaybook[]>({
    queryKey: ["/api/disclosure-playbooks"],
  });

  const { data: cases } = useQuery<any[]>({
    queryKey: ["/api/cases"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/disclosure-playbooks", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/disclosure-playbooks"] });
      setIsCreateOpen(false);
      toast({ title: "Success", description: "Disclosure playbook created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/disclosure-playbooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/disclosure-playbooks"] });
      toast({ title: "Success", description: "Disclosure playbook deleted" });
    },
  });

  const form = useForm({
    resolver: zodResolver(insertDisclosurePlaybookSchema),
    defaultValues: {
      caseId: "",
      playbookType: "fcpa_self_disclosure",
      violationType: "fcpa_violation",
      checklistItems: [],
      disclosureLetter: "",
      submissionStatus: "draft",
      acknowledgmentReceived: "false",
    },
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "submitted":
        return "default";
      case "ready":
        return "secondary";
      case "acknowledged":
        return "default";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading disclosure playbooks...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="border-b p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6" />
            <div>
              <h1 className="text-2xl font-semibold">Disclosure Playbooks</h1>
              <p className="text-sm text-muted-foreground">
                Workflows for voluntary self-disclosure to regulators
              </p>
            </div>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-playbook">
                <Plus className="h-4 w-4 mr-2" />
                Create Playbook
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Disclosure Playbook</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
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
                            {cases?.map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.title}
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
                    name="playbookType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Playbook Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-playbook-type">
                              <SelectValue placeholder="Select playbook type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="fcpa_self_disclosure">FCPA Self-Disclosure</SelectItem>
                            <SelectItem value="off_channel_cleanup">Off-Channel Cleanup</SelectItem>
                            <SelectItem value="antitrust_leniency">Antitrust Leniency</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="violationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Violation Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-violation-type">
                              <SelectValue placeholder="Select violation type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="fcpa_violation">FCPA Violation</SelectItem>
                            <SelectItem value="antitrust">Antitrust</SelectItem>
                            <SelectItem value="off_channel_communication">Off-Channel Communication</SelectItem>
                            <SelectItem value="insider_trading">Insider Trading</SelectItem>
                            <SelectItem value="aml_banking">AML/Banking</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="disclosureLetter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Disclosure Letter (Draft)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Draft the voluntary disclosure letter content..."
                            rows={6}
                            data-testid="textarea-disclosure-letter"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 mt-6">
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-playbook">
                      {createMutation.isPending ? "Creating..." : "Create Playbook"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {playbooks && playbooks.length > 0 ? (
          <div className="grid gap-4">
            {playbooks.map((playbook) => (
              <Card key={playbook.id} className="hover-elevate" data-testid={`card-playbook-${playbook.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {playbook.playbookType.replace(/_/g, " ").toUpperCase()}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {playbook.violationType.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getStatusBadgeVariant(playbook.submissionStatus)}>
                        {playbook.submissionStatus.replace(/_/g, " ")}
                      </Badge>
                      {playbook.acknowledgmentReceived === "true" && (
                        <Badge variant="default">
                          <Check className="h-3 w-3 mr-1" />
                          Acknowledged
                        </Badge>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(playbook.id)}
                        data-testid={`button-delete-${playbook.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {playbook.disclosureLetter && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Disclosure Letter</h4>
                      <div className="bg-muted p-3 rounded text-sm whitespace-pre-wrap">
                        {playbook.disclosureLetter}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm">
                        <div className="text-muted-foreground">Checklist Items</div>
                        <div className="font-medium">
                          {Array.isArray(playbook.checklistItems) ? playbook.checklistItems.length : 0}
                        </div>
                      </div>
                    </div>
                    {playbook.submittedAt && (
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm">
                          <div className="text-muted-foreground">Submitted</div>
                          <div className="font-medium">
                            {format(new Date(playbook.submittedAt), "MMM d, yyyy")}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm">
                        <div className="text-muted-foreground">Created</div>
                        <div className="font-medium">
                          {format(new Date(playbook.createdAt), "MMM d, yyyy")}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Disclosure Playbooks</h3>
              <p className="text-muted-foreground mb-4">
                Create a playbook to manage voluntary disclosure processes with regulators.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Playbook
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
