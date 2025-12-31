import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  FileText,
  Shield,
  Users,
  Clock,
  Scale,
  FileCheck,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

type InvestigationDetails = {
  matterName: string;
  clientName: string;
  investigationType: string;
  regulatorBody: string;
  receivedDate: string;
  responseDeadline: string;
  description: string;
};

type Custodian = {
  name: string;
  email: string;
  department: string;
  role: string;
};

type Expert = {
  type: string;
  firmName: string;
  contactName: string;
  scopeOfWork: string;
};

const STEP_TITLES = [
  "Investigation Details",
  "Conflict Check",
  "Custodians & Legal Hold",
  "Expert Retention",
  "Initial Assessment"
];

export default function CrisisIntake() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1: Investigation Details
  const [investigationDetails, setInvestigationDetails] = useState<InvestigationDetails>({
    matterName: "",
    clientName: "",
    investigationType: "",
    regulatorBody: "",
    receivedDate: "",
    responseDeadline: "",
    description: "",
  });

  // Step 2: Conflict Check
  const [conflictCheck, setConflictCheck] = useState({
    conflictCheckComplete: false,
    conflictsIdentified: false,
    conflictNotes: "",
  });

  // Step 3: Custodians
  const [custodians, setCustodians] = useState<Custodian[]>([
    { name: "", email: "", department: "", role: "" }
  ]);
  const [legalHoldReady, setLegalHoldReady] = useState(false);

  // Step 4: Experts
  const [experts, setExperts] = useState<Expert[]>([
    { type: "", firmName: "", contactName: "", scopeOfWork: "" }
  ]);

  // Step 5: Assessment
  const [initialAssessment, setInitialAssessment] = useState({
    riskLevel: "",
    exposureEstimate: "",
    cooperationStrategy: "",
    nextSteps: "",
  });

  const createIntakeMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/crisis-intake", data);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      toast({
        title: "Crisis Intake Complete",
        description: "Investigation case created successfully. Redirecting...",
      });
      setTimeout(() => {
        setLocation(`/cases/${data.caseId}`);
      }, 1500);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (currentStep < STEP_TITLES.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    const intakeData = {
      investigationDetails,
      conflictCheck,
      custodians: custodians.filter(c => c.name && c.email),
      experts: experts.filter(e => e.type && e.firmName),
      initialAssessment,
    };
    createIntakeMutation.mutate(intakeData);
  };

  const addCustodian = () => {
    setCustodians([...custodians, { name: "", email: "", department: "", role: "" }]);
  };

  const removeCustodian = (index: number) => {
    setCustodians(custodians.filter((_, i) => i !== index));
  };

  const updateCustodian = (index: number, field: keyof Custodian, value: string) => {
    const updated = [...custodians];
    updated[index][field] = value;
    setCustodians(updated);
  };

  const addExpert = () => {
    setExperts([...experts, { type: "", firmName: "", contactName: "", scopeOfWork: "" }]);
  };

  const removeExpert = (index: number) => {
    setExperts(experts.filter((_, i) => i !== index));
  };

  const updateExpert = (index: number, field: keyof Expert, value: string) => {
    const updated = [...experts];
    updated[index][field] = value;
    setExperts(updated);
  };

  const progress = ((currentStep + 1) / STEP_TITLES.length) * 100;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3" data-testid="heading-crisis-intake">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            Crisis Response Intake
          </h1>
          <p className="text-muted-foreground mt-2">
            Guided workflow for immediate response to subpoenas, CIDs, and government investigations
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Step {currentStep + 1} of {STEP_TITLES.length}</span>
            <span className="text-muted-foreground">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between gap-2">
            {STEP_TITLES.map((title, index) => (
              <div
                key={index}
                className={`flex-1 text-center text-xs py-2 px-1 rounded ${
                  index === currentStep
                    ? "bg-primary text-primary-foreground font-medium"
                    : index < currentStep
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {title}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentStep === 0 && <FileText className="h-5 w-5" />}
              {currentStep === 1 && <Scale className="h-5 w-5" />}
              {currentStep === 2 && <Users className="h-5 w-5" />}
              {currentStep === 3 && <Shield className="h-5 w-5" />}
              {currentStep === 4 && <FileCheck className="h-5 w-5" />}
              {STEP_TITLES[currentStep]}
            </CardTitle>
            <CardDescription>
              {currentStep === 0 && "Capture key information about the government investigation"}
              {currentStep === 1 && "Conduct conflict screening before engagement"}
              {currentStep === 2 && "Identify key custodians and initiate legal hold"}
              {currentStep === 3 && "Retain forensic and subject-matter experts under privilege"}
              {currentStep === 4 && "Initial risk assessment and response strategy"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1: Investigation Details */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="matterName">Matter Name *</Label>
                    <Input
                      id="matterName"
                      data-testid="input-matter-name"
                      value={investigationDetails.matterName}
                      onChange={(e) => setInvestigationDetails({...investigationDetails, matterName: e.target.value})}
                      placeholder="DOJ Investigation - Acme Corp"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Client Name *</Label>
                    <Input
                      id="clientName"
                      data-testid="input-client-name"
                      value={investigationDetails.clientName}
                      onChange={(e) => setInvestigationDetails({...investigationDetails, clientName: e.target.value})}
                      placeholder="Acme Corporation"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="investigationType">Investigation Type *</Label>
                    <Select
                      value={investigationDetails.investigationType}
                      onValueChange={(value) => setInvestigationDetails({...investigationDetails, investigationType: value})}
                    >
                      <SelectTrigger id="investigationType" data-testid="select-investigation-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="subpoena">Subpoena</SelectItem>
                        <SelectItem value="cid">Civil Investigative Demand (CID)</SelectItem>
                        <SelectItem value="search_warrant">Search Warrant</SelectItem>
                        <SelectItem value="informal_inquiry">Informal Inquiry</SelectItem>
                        <SelectItem value="sec_wells">SEC Wells Notice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regulatorBody">Regulatory Body *</Label>
                    <Select
                      value={investigationDetails.regulatorBody}
                      onValueChange={(value) => setInvestigationDetails({...investigationDetails, regulatorBody: value})}
                    >
                      <SelectTrigger id="regulatorBody" data-testid="select-regulator-body">
                        <SelectValue placeholder="Select regulator" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="doj">Department of Justice (DOJ)</SelectItem>
                        <SelectItem value="sec">Securities and Exchange Commission (SEC)</SelectItem>
                        <SelectItem value="ftc">Federal Trade Commission (FTC)</SelectItem>
                        <SelectItem value="cftc">Commodity Futures Trading Commission (CFTC)</SelectItem>
                        <SelectItem value="finra">FINRA</SelectItem>
                        <SelectItem value="fda">FDA</SelectItem>
                        <SelectItem value="state_ag">State Attorney General</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="receivedDate">Date Received *</Label>
                    <Input
                      id="receivedDate"
                      data-testid="input-received-date"
                      type="date"
                      value={investigationDetails.receivedDate}
                      onChange={(e) => setInvestigationDetails({...investigationDetails, receivedDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="responseDeadline" className="flex items-center gap-2">
                      Response Deadline *
                      <Clock className="h-4 w-4 text-destructive" />
                    </Label>
                    <Input
                      id="responseDeadline"
                      data-testid="input-response-deadline"
                      type="date"
                      value={investigationDetails.responseDeadline}
                      onChange={(e) => setInvestigationDetails({...investigationDetails, responseDeadline: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    data-testid="textarea-description"
                    value={investigationDetails.description}
                    onChange={(e) => setInvestigationDetails({...investigationDetails, description: e.target.value})}
                    placeholder="Brief description of the investigation scope, allegations, and key issues..."
                    rows={4}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Conflict Check */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <Scale className="h-5 w-5" />
                    Conflict Screening Required
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Before accepting this engagement, verify no conflicts exist with:
                  </p>
                  <ul className="text-sm space-y-1 text-muted-foreground ml-6 list-disc">
                    <li>Government agency or regulatory body</li>
                    <li>Investigation targets or subjects</li>
                    <li>Adverse parties</li>
                    <li>Current or former clients</li>
                  </ul>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="conflictCheckComplete"
                    data-testid="checkbox-conflict-check"
                    checked={conflictCheck.conflictCheckComplete}
                    onCheckedChange={(checked) => 
                      setConflictCheck({...conflictCheck, conflictCheckComplete: checked as boolean})
                    }
                  />
                  <Label htmlFor="conflictCheckComplete" className="font-medium">
                    Conflict check completed
                  </Label>
                </div>

                {conflictCheck.conflictCheckComplete && (
                  <>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="conflictsIdentified"
                        data-testid="checkbox-conflicts-identified"
                        checked={conflictCheck.conflictsIdentified}
                        onCheckedChange={(checked) => 
                          setConflictCheck({...conflictCheck, conflictsIdentified: checked as boolean})
                        }
                      />
                      <Label htmlFor="conflictsIdentified" className="font-medium">
                        Conflicts identified (requires waiver)
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="conflictNotes">Conflict Check Notes</Label>
                      <Textarea
                        id="conflictNotes"
                        data-testid="textarea-conflict-notes"
                        value={conflictCheck.conflictNotes}
                        onChange={(e) => setConflictCheck({...conflictCheck, conflictNotes: e.target.value})}
                        placeholder="Document conflict screening results, any identified conflicts, and waiver status..."
                        rows={4}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 3: Custodians & Legal Hold */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
                  <h3 className="font-medium mb-2 flex items-center gap-2 text-primary">
                    <AlertTriangle className="h-5 w-5" />
                    Critical: Immediate Preservation Required
                  </h3>
                  <p className="text-sm">
                    Identify key custodians and prepare legal hold notices to preserve relevant evidence.
                    Legal hold should be issued within 24 hours.
                  </p>
                </div>

                {custodians.map((custodian, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">Custodian {index + 1}</h4>
                      {custodians.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCustodian(index)}
                          data-testid={`button-remove-custodian-${index}`}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`custodian-name-${index}`}>Full Name *</Label>
                        <Input
                          id={`custodian-name-${index}`}
                          data-testid={`input-custodian-name-${index}`}
                          value={custodian.name}
                          onChange={(e) => updateCustodian(index, "name", e.target.value)}
                          placeholder="John Smith"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`custodian-email-${index}`}>Email *</Label>
                        <Input
                          id={`custodian-email-${index}`}
                          data-testid={`input-custodian-email-${index}`}
                          type="email"
                          value={custodian.email}
                          onChange={(e) => updateCustodian(index, "email", e.target.value)}
                          placeholder="john.smith@company.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`custodian-department-${index}`}>Department</Label>
                        <Input
                          id={`custodian-department-${index}`}
                          data-testid={`input-custodian-department-${index}`}
                          value={custodian.department}
                          onChange={(e) => updateCustodian(index, "department", e.target.value)}
                          placeholder="Finance"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`custodian-role-${index}`}>Role/Title</Label>
                        <Input
                          id={`custodian-role-${index}`}
                          data-testid={`input-custodian-role-${index}`}
                          value={custodian.role}
                          onChange={(e) => updateCustodian(index, "role", e.target.value)}
                          placeholder="CFO"
                        />
                      </div>
                    </div>
                  </Card>
                ))}

                <Button
                  onClick={addCustodian}
                  variant="outline"
                  className="w-full"
                  data-testid="button-add-custodian"
                >
                  Add Custodian
                </Button>

                <Separator />

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="legalHoldReady"
                    data-testid="checkbox-legal-hold-ready"
                    checked={legalHoldReady}
                    onCheckedChange={(checked) => setLegalHoldReady(checked as boolean)}
                  />
                  <Label htmlFor="legalHoldReady" className="font-medium">
                    Legal hold notices prepared and ready to send
                  </Label>
                </div>
              </div>
            )}

            {/* Step 4: Expert Retention */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Retain Experts Under Privilege (Kovel Doctrine)
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Forensic, accounting, and subject-matter experts should be retained by counsel
                    to preserve attorney-client privilege and work product protection.
                  </p>
                </div>

                {experts.map((expert, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">Expert {index + 1}</h4>
                      {experts.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExpert(index)}
                          data-testid={`button-remove-expert-${index}`}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`expert-type-${index}`}>Expert Type *</Label>
                        <Select
                          value={expert.type}
                          onValueChange={(value) => updateExpert(index, "type", value)}
                        >
                          <SelectTrigger id={`expert-type-${index}`} data-testid={`select-expert-type-${index}`}>
                            <SelectValue placeholder="Select expert type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="forensic_consultant">Forensic Consultant</SelectItem>
                            <SelectItem value="accounting_expert">Accounting Expert</SelectItem>
                            <SelectItem value="industry_specialist">Industry Specialist</SelectItem>
                            <SelectItem value="technical_consultant">Technical Consultant</SelectItem>
                            <SelectItem value="valuation_expert">Valuation Expert</SelectItem>
                            <SelectItem value="economic_expert">Economic Expert</SelectItem>
                            <SelectItem value="scientific_expert">Scientific Expert</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`expert-firm-${index}`}>Firm/Company Name *</Label>
                          <Input
                            id={`expert-firm-${index}`}
                            data-testid={`input-expert-firm-${index}`}
                            value={expert.firmName}
                            onChange={(e) => updateExpert(index, "firmName", e.target.value)}
                            placeholder="Forensics Inc."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`expert-contact-${index}`}>Contact Name</Label>
                          <Input
                            id={`expert-contact-${index}`}
                            data-testid={`input-expert-contact-${index}`}
                            value={expert.contactName}
                            onChange={(e) => updateExpert(index, "contactName", e.target.value)}
                            placeholder="Jane Doe"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`expert-scope-${index}`}>Scope of Work</Label>
                        <Textarea
                          id={`expert-scope-${index}`}
                          data-testid={`textarea-expert-scope-${index}`}
                          value={expert.scopeOfWork}
                          onChange={(e) => updateExpert(index, "scopeOfWork", e.target.value)}
                          placeholder="Digital forensics investigation of employee devices and email systems..."
                          rows={2}
                        />
                      </div>
                    </div>
                  </Card>
                ))}

                <Button
                  onClick={addExpert}
                  variant="outline"
                  className="w-full"
                  data-testid="button-add-expert"
                >
                  Add Expert
                </Button>
              </div>
            )}

            {/* Step 5: Initial Assessment */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="riskLevel">Initial Risk Level</Label>
                    <Select
                      value={initialAssessment.riskLevel}
                      onValueChange={(value) => setInitialAssessment({...initialAssessment, riskLevel: value})}
                    >
                      <SelectTrigger id="riskLevel" data-testid="select-risk-level">
                        <SelectValue placeholder="Select risk level" />
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
                    <Label htmlFor="exposureEstimate">Estimated Exposure</Label>
                    <Input
                      id="exposureEstimate"
                      data-testid="input-exposure-estimate"
                      value={initialAssessment.exposureEstimate}
                      onChange={(e) => setInitialAssessment({...initialAssessment, exposureEstimate: e.target.value})}
                      placeholder="e.g., $5M - $10M, Criminal liability"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cooperationStrategy">Cooperation Strategy</Label>
                  <Select
                    value={initialAssessment.cooperationStrategy}
                    onValueChange={(value) => setInitialAssessment({...initialAssessment, cooperationStrategy: value})}
                  >
                    <SelectTrigger id="cooperationStrategy" data-testid="select-cooperation-strategy">
                      <SelectValue placeholder="Select cooperation approach" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_cooperation">Full Cooperation</SelectItem>
                      <SelectItem value="limited_cooperation">Limited Cooperation</SelectItem>
                      <SelectItem value="document_only">Document Production Only</SelectItem>
                      <SelectItem value="aggressive_defense">Aggressive Defense</SelectItem>
                      <SelectItem value="settlement_focused">Settlement Focused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nextSteps">Next Steps (48-72 Hours)</Label>
                  <Textarea
                    id="nextSteps"
                    data-testid="textarea-next-steps"
                    value={initialAssessment.nextSteps}
                    onChange={(e) => setInitialAssessment({...initialAssessment, nextSteps: e.target.value})}
                    placeholder="1. Issue legal hold notices\n2. Begin document collection\n3. Schedule custodian interviews\n4. Engage forensic expert..."
                    rows={6}
                  />
                </div>

                {/* Summary */}
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Intake Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Matter:</span>
                      <p className="font-medium">{investigationDetails.matterName || "Not specified"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Client:</span>
                      <p className="font-medium">{investigationDetails.clientName || "Not specified"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Regulator:</span>
                      <p className="font-medium">{investigationDetails.regulatorBody || "Not specified"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Response Deadline:</span>
                      <p className="font-medium">{investigationDetails.responseDeadline || "Not specified"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Custodians:</span>
                      <p className="font-medium">
                        {custodians.filter(c => c.name && c.email).length} identified
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Experts:</span>
                      <p className="font-medium">
                        {experts.filter(e => e.type && e.firmName).length} retained
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              data-testid="button-previous"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentStep < STEP_TITLES.length - 1 ? (
              <Button onClick={handleNext} data-testid="button-next">
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={createIntakeMutation.isPending}
                data-testid="button-submit"
              >
                {createIntakeMutation.isPending ? (
                  "Creating Case..."
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Complete Intake & Create Case
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Help Text */}
        <Card className="bg-muted">
          <CardContent className="py-4">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Critical First 72 Hours
            </h3>
            <ul className="text-sm space-y-1 text-muted-foreground ml-6 list-disc">
              <li><strong>Immediate (0-24 hours):</strong> Conflict check, legal hold issuance, IT preservation</li>
              <li><strong>Day 2-3:</strong> Expert retention, custodian interviews, document collection begins</li>
              <li><strong>Day 3-7:</strong> Initial document review, privilege review, regulatory response strategy</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
