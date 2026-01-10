import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Check, Settings, ListChecks, FileText, Sparkles, Building, Building2, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { TransactionTypeSelector } from "./TransactionTypeSelector";
import { IndustrySectorSelector } from "./IndustrySectorSelector";
import { ChecklistBuilder } from "./ChecklistBuilder";

interface TransactionType {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface IndustrySector {
  id: string;
  name: string;
  description: string;
  parentSectorId: string | null;
}

interface ChecklistSection {
  id: string;
  name: string;
  items: any[];
  isExpanded: boolean;
}

interface DueDiligenceWizardProps {
  dealId: string;
  dealName: string;
  sourceType: "pe_deal" | "transaction" | "data_room";
  onGenerateReport: (config: {
    transactionTypeId: string | null;
    industrySectorId: string | null;
    checklistSections: ChecklistSection[];
    enableLiveSearch: boolean;
  }) => void;
  isGenerating: boolean;
}

const steps = [
  { id: "configure", label: "Configure", icon: Settings, description: "Select transaction type and industry" },
  { id: "customize", label: "Customize", icon: ListChecks, description: "Build your due diligence checklist" },
  { id: "generate", label: "Generate", icon: FileText, description: "Review and generate report" }
];

export function DueDiligenceWizard({ 
  dealId, 
  dealName, 
  sourceType, 
  onGenerateReport, 
  isGenerating 
}: DueDiligenceWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTransactionType, setSelectedTransactionType] = useState<TransactionType | null>(null);
  const [selectedIndustrySector, setSelectedIndustrySector] = useState<IndustrySector | null>(null);
  const [checklistSections, setChecklistSections] = useState<ChecklistSection[]>([]);
  const [enableLiveSearch, setEnableLiveSearch] = useState(true);

  const progress = ((currentStep + 1) / steps.length) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return selectedTransactionType !== null;
      case 1:
        return checklistSections.length > 0 && checklistSections.some(s => s.items.length > 0);
      case 2:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerate = () => {
    onGenerateReport({
      transactionTypeId: selectedTransactionType?.id || null,
      industrySectorId: selectedIndustrySector?.id || null,
      checklistSections,
      enableLiveSearch
    });
  };

  const totalItems = checklistSections.reduce((acc, s) => acc + s.items.length, 0);
  const criticalItems = checklistSections.reduce((acc, s) => acc + s.items.filter((i: any) => i.isRequired).length, 0);

  return (
    <Card data-testid="card-due-diligence-wizard">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Due Diligence Checklist Builder
            </CardTitle>
            <CardDescription>
              Customize your due diligence checklist for: <span className="font-medium">{dealName}</span>
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-sm">
            Step {currentStep + 1} of {steps.length}
          </Badge>
        </div>
        <Progress value={progress} className="h-2 mt-4" />
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-center gap-4 mb-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <button
                key={step.id}
                onClick={() => index < currentStep && setCurrentStep(index)}
                disabled={index > currentStep}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                  isActive && "bg-primary/10 text-primary",
                  isCompleted && "text-primary cursor-pointer hover-elevate",
                  !isActive && !isCompleted && "text-muted-foreground"
                )}
                data-testid={`button-step-${step.id}`}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  isActive && "bg-primary text-primary-foreground",
                  isCompleted && "bg-primary/20 text-primary",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground"
                )}>
                  {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="hidden md:block text-left">
                  <div className="font-medium text-sm">{step.label}</div>
                  <div className="text-xs text-muted-foreground">{step.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        {currentStep === 0 && (
          <div className="grid md:grid-cols-2 gap-6" data-testid="step-configure">
            <TransactionTypeSelector
              selectedTypeId={selectedTransactionType?.id || null}
              onSelect={setSelectedTransactionType}
            />
            <IndustrySectorSelector
              selectedSectorId={selectedIndustrySector?.id || null}
              onSelect={setSelectedIndustrySector}
            />
          </div>
        )}

        {currentStep === 1 && (
          <div data-testid="step-customize">
            <ChecklistBuilder
              transactionTypeId={selectedTransactionType?.id || null}
              industrySectorId={selectedIndustrySector?.id || null}
              onChecklistChange={setChecklistSections}
            />
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6" data-testid="step-generate">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Report Configuration Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    <Building className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <div className="font-medium">Transaction Type</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedTransactionType?.name || "Not selected"}
                      </div>
                      {selectedTransactionType?.category && (
                        <Badge variant="secondary" className="mt-1 text-xs capitalize">
                          {selectedTransactionType.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    <Building2 className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <div className="font-medium">Industry Sector</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedIndustrySector?.name || "General / Not specified"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                  <CheckSquare className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium">Checklist Summary</div>
                    <div className="text-sm text-muted-foreground">
                      {checklistSections.length} sections, {totalItems} items total
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant="default">{criticalItems} Critical Items</Badge>
                      <Badge variant="secondary">{totalItems - criticalItems} Standard Items</Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <div className="font-medium">Live Web Search</div>
                    <div className="text-sm text-muted-foreground">
                      Include media coverage, litigation, and regulatory research
                    </div>
                  </div>
                  <Button
                    variant={enableLiveSearch ? "default" : "outline"}
                    onClick={() => setEnableLiveSearch(!enableLiveSearch)}
                    data-testid="button-toggle-live-search"
                  >
                    {enableLiveSearch ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Ready to generate your customized due diligence report based on the configuration above.
              </p>
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="min-w-[200px]"
                data-testid="button-generate-report"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Due Diligence Report
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between border-t pt-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0 || isGenerating}
          data-testid="button-wizard-back"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        {currentStep < steps.length - 1 ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            data-testid="button-wizard-next"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
