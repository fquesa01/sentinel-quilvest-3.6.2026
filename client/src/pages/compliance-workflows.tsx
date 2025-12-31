import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  PlayCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Users,
  Shield,
  Building2,
  Pill,
  Plane,
  Code2,
  DollarSign,
  Landmark,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const sectorIcons: Record<string, any> = {
  broker_dealer: Landmark,
  investment_advisor: DollarSign,
  pharmaceutical: Pill,
  defense_contractor: Shield,
  technology: Code2,
  financial_services: Building2,
  general: Shield,
};

type WorkflowStep = {
  stepNumber: number;
  stepName: string;
  assignedRole: string;
  estimatedDuration: number;
  requiredActions: string[];
};

type ComplianceWorkflow = {
  industrySector: string;
  workflowName: string;
  description: string;
  violationType: string;
  steps: WorkflowStep[];
  estimatedTotalDuration: number;
  regulatoryDeadlines: Array<{
    regulation: string;
    description: string;
    daysAllowed: number;
  }>;
};

type PlaybookSection = {
  title: string;
  items: string[];
};

type InvestigationPlaybook = {
  title: string;
  description: string;
  sections?: PlaybookSection[];
};

type PlaybooksResponse = Record<string, InvestigationPlaybook>;

export default function ComplianceWorkflows() {
  const [selectedWorkflowIdx, setSelectedWorkflowIdx] = useState<number | null>(null);
  const [selectedPlaybook, setSelectedPlaybook] = useState<string | null>(null);

  const { data: workflows, isLoading: workflowsLoading } = useQuery<ComplianceWorkflow[]>({
    queryKey: ["/api/compliance-workflows"],
  });

  const { data: playbooksData, isLoading: playbooksLoading } = useQuery<PlaybooksResponse>({
    queryKey: ["/api/investigation-playbooks"],
  });

  const selectedWorkflow = selectedWorkflowIdx !== null && workflows ? workflows[selectedWorkflowIdx] : null;
  const playbooks = playbooksData ? Object.entries(playbooksData) : [];
  const selectedPlaybookData = selectedPlaybook && playbooksData ? playbooksData[selectedPlaybook] : null;

  if (workflowsLoading || playbooksLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">
            Compliance Workflows & Playbooks
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Sector-specific investigation workflows and best practices
          </p>
        </div>
      </div>

      <Tabs defaultValue="workflows" className="flex-1 flex flex-col">
        <div className="border-b px-6">
          <TabsList>
            <TabsTrigger value="workflows" data-testid="tab-workflows">
              Investigation Workflows
            </TabsTrigger>
            <TabsTrigger value="playbooks" data-testid="tab-playbooks">
              Investigation Playbooks
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="workflows" className="flex-1 p-6 m-0 space-y-4">
          {!workflows || workflows.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Workflows Available</h3>
                  <p className="text-muted-foreground">
                    Compliance workflow templates will appear here.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {workflows.map((workflow, idx) => {
                  const Icon = sectorIcons[workflow.industrySector] || Shield;
                  return (
                    <Card
                      key={idx}
                      className={`cursor-pointer transition-all hover-elevate ${
                        selectedWorkflowIdx === idx ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedWorkflowIdx(idx)}
                      data-testid={`card-workflow-${idx}`}
                    >
                      <CardHeader>
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-md bg-primary/10">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base mb-1">{workflow.workflowName}</CardTitle>
                            <CardDescription className="text-sm">{workflow.description}</CardDescription>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {workflow.violationType}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {workflow.estimatedTotalDuration} min
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {workflow.steps.length} steps
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>

              {selectedWorkflow && (
                <Card className="mt-6">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{selectedWorkflow.workflowName}</CardTitle>
                        <CardDescription className="mt-1">{selectedWorkflow.description}</CardDescription>
                      </div>
                      <Button data-testid="button-start-workflow">
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Start Workflow
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {selectedWorkflow.regulatoryDeadlines && selectedWorkflow.regulatoryDeadlines.length > 0 && (
                      <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-medium text-sm mb-2">Regulatory Deadlines</h4>
                            <div className="space-y-1">
                              {selectedWorkflow.regulatoryDeadlines.map((deadline, idx) => (
                                <div key={idx} className="text-sm">
                                  <span className="font-medium">{deadline.regulation}:</span>{" "}
                                  {deadline.description} ({deadline.daysAllowed} days)
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="font-semibold mb-4">Workflow Steps</h4>
                      <div className="space-y-4">
                        {selectedWorkflow.steps.map((step, idx) => (
                          <div key={idx}>
                            <div className="flex items-start gap-4">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                                {step.stepNumber}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-medium">{step.stepName}</h5>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Users className="h-3 w-3" />
                                    {step.assignedRole}
                                    <Clock className="h-3 w-3 ml-2" />
                                    {step.estimatedDuration} min
                                  </div>
                                </div>
                                <ul className="space-y-1 text-sm text-muted-foreground">
                                  {step.requiredActions.map((action, actionIdx) => (
                                    <li key={actionIdx} className="flex items-start gap-2">
                                      <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                      <span>{action}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                            {idx < selectedWorkflow.steps.length - 1 && (
                              <div className="ml-4 mt-2 mb-2 border-l-2 border-dashed border-border h-4" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="playbooks" className="flex-1 p-6 m-0">
          {playbooks.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Playbooks Available</h3>
                  <p className="text-muted-foreground">
                    Investigation playbooks will appear here.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {playbooks.map(([key, playbook]) => (
                  <Card
                    key={key}
                    className={`cursor-pointer transition-all hover-elevate ${
                      selectedPlaybook === key ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedPlaybook(key)}
                    data-testid={`card-playbook-${key}`}
                  >
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle className="text-base">{playbook.title}</CardTitle>
                          <CardDescription className="text-sm mt-1">{playbook.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>

              {selectedPlaybookData && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>{selectedPlaybookData.title}</CardTitle>
                    <CardDescription>{selectedPlaybookData.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {selectedPlaybookData.sections && selectedPlaybookData.sections.map((section, idx) => (
                      <div key={idx}>
                        {idx > 0 && <Separator className="mb-6" />}
                        <h4 className="font-semibold mb-3">{section.title}</h4>
                        <ul className="space-y-2">
                          {section.items.map((item, itemIdx) => (
                            <li key={itemIdx} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
