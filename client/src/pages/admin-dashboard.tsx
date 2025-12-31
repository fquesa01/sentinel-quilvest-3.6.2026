import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Users, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  PlayCircle,
  Sparkles,
  Clock,
  ArrowRight,
  FolderOpen
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";

interface Communication {
  id: string;
  subject: string | null;
  body: string;
  sender: string;
  recipients: string[] | null;
  communicationType: string;
  timestamp: string;
  sourceType: string;
  hasAlert: string | null;
  alertSeverity: string | null;
  alertViolationType: string | null;
}

interface Case {
  id: string;
  caseNumber: string;
  title: string;
  description: string | null;
  status: string;
  violationType: string;
  priority: string;
  assignedTo: string | null;
  createdAt: string;
  employeeName: string | null;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AIRecommendations {
  immediateSteps?: string[];
  investigationStrategy?: string;
  riskAssessment?: string;
  documentationNeeds?: string[];
  timeline?: string;
  regulatoryConsiderations?: string;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [selectedComm, setSelectedComm] = useState<Communication | null>(null);
  const [newCaseDialogOpen, setNewCaseDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [aiRecsDialogOpen, setAiRecsDialogOpen] = useState(false);
  const [selectedInvestigator, setSelectedInvestigator] = useState<string>("");
  const [assignmentNotes, setAssignmentNotes] = useState("");
  
  // New case form state
  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [newCaseDesc, setNewCaseDesc] = useState("");
  const [newCaseViolationType, setNewCaseViolationType] = useState("");
  const [newCasePriority, setNewCasePriority] = useState("medium");
  const [newCaseEmployeeName, setNewCaseEmployeeName] = useState("");

  const { data: reviewQueue, isLoading: queueLoading } = useQuery<Communication[]>({
    queryKey: ["/api/admin/review-queue"],
  });

  const { data: cases, isLoading: casesLoading } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: aiRecs, isLoading: aiRecsLoading } = useQuery<{ recommendations: AIRecommendations }>({
    queryKey: ["/api/admin/ai-recommendations", selectedCase?.id],
    queryFn: async () => {
      if (!selectedCase) throw new Error("No case selected");
      const response = await apiRequest("POST", `/api/admin/ai-recommendations/${selectedCase.id}`, {});
      return await response.json();
    },
    enabled: !!selectedCase && aiRecsDialogOpen,
  });

  const createCaseMutation = useMutation({
    mutationFn: async (caseData: any) => {
      const response = await apiRequest("POST", "/api/cases", caseData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/review-queue"] });
      toast({
        title: "Investigation Started",
        description: "New investigation has been created successfully.",
      });
      setNewCaseDialogOpen(false);
      resetNewCaseForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create investigation",
        variant: "destructive",
      });
    },
  });

  const closeCaseMutation = useMutation({
    mutationFn: async (caseId: string) => {
      const response = await apiRequest("PATCH", `/api/cases/${caseId}`, {
        status: "closed",
        closedAt: new Date().toISOString(),
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      toast({
        title: "Investigation Closed",
        description: "Investigation has been closed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to close investigation",
        variant: "destructive",
      });
    },
  });

  const assignInvestigatorMutation = useMutation({
    mutationFn: async ({ caseId, userId, notes }: { caseId: string; userId: string; notes: string }) => {
      const response = await apiRequest("POST", "/api/case-assignments", {
        caseId,
        userId,
        assignmentRole: "investigator",
        accessLevel: "full",
        notes,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/case-assignments"] });
      toast({
        title: "Investigator Assigned",
        description: "Investigator has been assigned to the case successfully.",
      });
      setAssignDialogOpen(false);
      setSelectedInvestigator("");
      setAssignmentNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign investigator",
        variant: "destructive",
      });
    },
  });

  const resetNewCaseForm = () => {
    setNewCaseTitle("");
    setNewCaseDesc("");
    setNewCaseViolationType("");
    setNewCasePriority("medium");
    setNewCaseEmployeeName("");
  };

  const handleStartInvestigation = () => {
    if (!newCaseTitle || !newCaseViolationType) {
      toast({
        title: "Validation Error",
        description: "Please provide case title and violation type",
        variant: "destructive",
      });
      return;
    }

    createCaseMutation.mutate({
      title: newCaseTitle,
      description: newCaseDesc,
      violationType: newCaseViolationType,
      priority: newCasePriority,
      employeeName: newCaseEmployeeName,
      status: "alert",
    });
  };

  const handleAssignInvestigator = () => {
    if (!selectedCase || !selectedInvestigator) {
      toast({
        title: "Validation Error",
        description: "Please select an investigator",
        variant: "destructive",
      });
      return;
    }

    assignInvestigatorMutation.mutate({
      caseId: selectedCase.id,
      userId: selectedInvestigator,
      notes: assignmentNotes,
    });
  };

  const investigators = users?.filter(u => 
    u.role === "compliance_officer" || u.role === "attorney" || u.role === "external_counsel"
  ) || [];

  const activeCases = cases?.filter(c => c.status !== "closed") || [];
  const closedCases = cases?.filter(c => c.status === "closed") || [];

  if (queueLoading || casesLoading || usersLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-admin-dashboard">
            Administrator Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage investigations, assign documents, and review cases
          </p>
        </div>
        <Dialog open={newCaseDialogOpen} onOpenChange={setNewCaseDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-start-investigation">
              <PlayCircle className="mr-2 h-4 w-4" />
              Start Investigation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Start New Investigation</DialogTitle>
              <DialogDescription>
                Create a new compliance investigation case
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="case-title">Case Title *</Label>
                <Input
                  id="case-title"
                  placeholder="e.g., FCPA Violation - Supplier Payment"
                  value={newCaseTitle}
                  onChange={(e) => setNewCaseTitle(e.target.value)}
                  data-testid="input-case-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="violation-type">Violation Type *</Label>
                <Select value={newCaseViolationType} onValueChange={setNewCaseViolationType}>
                  <SelectTrigger data-testid="select-violation-type">
                    <SelectValue placeholder="Select violation type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fcpa">FCPA</SelectItem>
                    <SelectItem value="antitrust">Antitrust</SelectItem>
                    <SelectItem value="sox">SOX</SelectItem>
                    <SelectItem value="cta">CTA</SelectItem>
                    <SelectItem value="ear_itar">EAR/ITAR</SelectItem>
                    <SelectItem value="far_dfars">FAR/DFARS</SelectItem>
                    <SelectItem value="dodd_frank">Dodd-Frank</SelectItem>
                    <SelectItem value="glba">GLBA</SelectItem>
                    <SelectItem value="ofac">OFAC</SelectItem>
                    <SelectItem value="usa_patriot_act">USA PATRIOT Act</SelectItem>
                    <SelectItem value="bsa_aml">BSA/AML</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={newCasePriority} onValueChange={setNewCasePriority}>
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee-name">Employee Name</Label>
                <Input
                  id="employee-name"
                  placeholder="Optional"
                  value={newCaseEmployeeName}
                  onChange={(e) => setNewCaseEmployeeName(e.target.value)}
                  data-testid="input-employee-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Provide case details..."
                  value={newCaseDesc}
                  onChange={(e) => setNewCaseDesc(e.target.value)}
                  rows={4}
                  data-testid="textarea-case-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewCaseDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleStartInvestigation}
                disabled={createCaseMutation.isPending}
                data-testid="button-confirm-start-investigation"
              >
                {createCaseMutation.isPending ? "Creating..." : "Start Investigation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cases</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCases.length}</div>
            <p className="text-xs text-muted-foreground">Under investigation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed Cases</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{closedCases.length}</div>
            <p className="text-xs text-muted-foreground">Resolved investigations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Review Queue</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewQueue?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Pending review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investigators</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{investigators.length}</div>
            <p className="text-xs text-muted-foreground">Available investigators</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Review Queue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Communication Review Queue
            </CardTitle>
            <CardDescription>
              Recent communications requiring review and assignment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {reviewQueue && reviewQueue.length > 0 ? (
                  reviewQueue.map((comm) => (
                    <Card key={comm.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedComm(comm)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {comm.communicationType}
                              </Badge>
                              {comm.hasAlert && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  {comm.alertSeverity}
                                </Badge>
                              )}
                            </div>
                            <p className="font-medium text-sm truncate">{comm.subject || "No Subject"}</p>
                            <p className="text-xs text-muted-foreground truncate">From: {comm.sender}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(comm.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <Button size="sm" variant="ghost" data-testid={`button-view-comm-${comm.id}`}>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No communications in review queue</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Active Investigations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Active Investigations
            </CardTitle>
            <CardDescription>
              Ongoing cases and investigation management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {activeCases.length > 0 ? (
                  activeCases.map((caseItem) => (
                    <Card key={caseItem.id} className="hover-elevate">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">{caseItem.caseNumber}</Badge>
                              <Badge className="text-xs capitalize">{caseItem.priority}</Badge>
                            </div>
                            <p className="font-medium text-sm">{caseItem.title}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {caseItem.violationType} • {caseItem.status}
                            </p>
                            {caseItem.employeeName && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Subject: {caseItem.employeeName}
                              </p>
                            )}
                          </div>
                          <Link href={`/cases/${caseItem.id}`}>
                            <Button size="sm" variant="ghost" data-testid={`button-view-case-${caseItem.id}`}>
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                        <Separator className="mb-3" />
                        <div className="flex gap-2">
                          <Dialog open={assignDialogOpen && selectedCase?.id === caseItem.id} onOpenChange={(open) => {
                            setAssignDialogOpen(open);
                            if (open) setSelectedCase(caseItem);
                          }}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="flex-1" data-testid={`button-assign-${caseItem.id}`}>
                                <Users className="h-4 w-4 mr-1" />
                                Assign
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Assign Investigator</DialogTitle>
                                <DialogDescription>
                                  Assign an investigator to {caseItem.caseNumber}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Select Investigator</Label>
                                  <Select value={selectedInvestigator} onValueChange={setSelectedInvestigator}>
                                    <SelectTrigger data-testid="select-investigator">
                                      <SelectValue placeholder="Choose investigator" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {investigators.map((inv) => (
                                        <SelectItem key={inv.id} value={inv.id}>
                                          {inv.firstName} {inv.lastName} ({inv.role})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Assignment Notes</Label>
                                  <Textarea
                                    placeholder="Add any special instructions..."
                                    value={assignmentNotes}
                                    onChange={(e) => setAssignmentNotes(e.target.value)}
                                    rows={3}
                                    data-testid="textarea-assignment-notes"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleAssignInvestigator} disabled={assignInvestigatorMutation.isPending} data-testid="button-confirm-assign">
                                  {assignInvestigatorMutation.isPending ? "Assigning..." : "Assign"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          
                          <Dialog open={aiRecsDialogOpen && selectedCase?.id === caseItem.id} onOpenChange={(open) => {
                            setAiRecsDialogOpen(open);
                            if (open) setSelectedCase(caseItem);
                          }}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="flex-1" data-testid={`button-ai-recs-${caseItem.id}`}>
                                <Sparkles className="h-4 w-4 mr-1" />
                                AI Recs
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <Sparkles className="h-5 w-5 text-primary" />
                                  AI Recommendations
                                </DialogTitle>
                                <DialogDescription>
                                  Next steps for {caseItem.caseNumber} - {caseItem.title}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                {aiRecsLoading ? (
                                  <div className="space-y-3">
                                    <Skeleton className="h-20" />
                                    <Skeleton className="h-20" />
                                    <Skeleton className="h-20" />
                                  </div>
                                ) : aiRecs?.recommendations ? (
                                  <>
                                    {aiRecs.recommendations.immediateSteps && (
                                      <div>
                                        <h3 className="font-semibold mb-2">Immediate Next Steps</h3>
                                        <ul className="list-disc pl-5 space-y-1 text-sm">
                                          {aiRecs.recommendations.immediateSteps.map((step, i) => (
                                            <li key={i}>{step}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {aiRecs.recommendations.investigationStrategy && (
                                      <div>
                                        <h3 className="font-semibold mb-2">Investigation Strategy</h3>
                                        <p className="text-sm text-muted-foreground">{aiRecs.recommendations.investigationStrategy}</p>
                                      </div>
                                    )}
                                    {aiRecs.recommendations.riskAssessment && (
                                      <div>
                                        <h3 className="font-semibold mb-2">Risk Assessment</h3>
                                        <p className="text-sm text-muted-foreground">{aiRecs.recommendations.riskAssessment}</p>
                                      </div>
                                    )}
                                    {aiRecs.recommendations.documentationNeeds && (
                                      <div>
                                        <h3 className="font-semibold mb-2">Documentation Needs</h3>
                                        <ul className="list-disc pl-5 space-y-1 text-sm">
                                          {aiRecs.recommendations.documentationNeeds.map((doc, i) => (
                                            <li key={i}>{doc}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {aiRecs.recommendations.timeline && (
                                      <div>
                                        <h3 className="font-semibold mb-2">Timeline Recommendations</h3>
                                        <p className="text-sm text-muted-foreground">{aiRecs.recommendations.timeline}</p>
                                      </div>
                                    )}
                                    {aiRecs.recommendations.regulatoryConsiderations && (
                                      <div>
                                        <h3 className="font-semibold mb-2">Regulatory Compliance Considerations</h3>
                                        <p className="text-sm text-muted-foreground">{aiRecs.recommendations.regulatoryConsiderations}</p>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-sm text-muted-foreground text-center py-8">
                                    No recommendations available
                                  </p>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => closeCaseMutation.mutate(caseItem.id)}
                            disabled={closeCaseMutation.isPending}
                            data-testid={`button-close-${caseItem.id}`}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Close
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No active investigations</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
