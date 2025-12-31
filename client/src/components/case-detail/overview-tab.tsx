import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Users, 
  MessageSquare, 
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Calendar,
  Building,
  Scale,
  User,
  Edit2,
  Save,
  X,
  Mic,
  MicOff,
  Loader2,
  Trash2,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { useVoiceRecognition } from "@/hooks/use-voice-recognition";

interface DetectedLegalIssue {
  issue: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  sources: string[];
}

interface CaseAIAnalysis {
  aiSummaryText: string;
  keyFacts: string[];
  keyIndividuals: Array<{ name: string; role: string }>;
  keyEntities: string[];
  lawMatrix: Array<{ law: string; analysis: string }>;
  riskAssessmentText: string;
  suggestedNextSteps: string[];
  regulatorPerspective?: string;
  remediationThemes?: string[];
  lastGeneratedAt?: string;
  matterType?: string;
  matterTypeConfidence?: number;
  detectedLegalIssues?: DetectedLegalIssue[];
  documentsAnalyzedCount?: number;
  lastIncrementalUpdate?: string;
}

interface DocumentSet {
  id: string;
  name: string;
  documentType: string;
  documentCount: number;
  reviewStatus: string;
}

interface Party {
  id: string;
  name: string;
  roleType: string;
  caseRole: string;
  legalHoldStatus: string;
  interviewStatus: string;
}

interface Interview {
  id: string;
  intervieweeName: string;
  interviewType: string;
  scheduledFor: string | null;
  status: string;
}

interface Alert {
  id: string;
  severity: string;
  description: string;
  detectedAt: string;
}

interface OverviewTabProps {
  caseData: {
    id: string;
    description: string | null;
    violationType: string;
    origin?: string | null;
    regulatoryBody?: string | null;
    incidentPeriodStart?: string | null;
    incidentPeriodEnd?: string | null;
    investigationOpenedAt?: string | null;
    nextDeadlineAt?: string | null;
  };
  aiAnalysis?: CaseAIAnalysis;
  documentSets?: DocumentSet[];
  parties?: Party[];
  interviews?: Interview[];
  alerts?: Alert[];
  isLoadingAnalysis?: boolean;
  isLoadingDocSets?: boolean;
  isLoadingParties?: boolean;
  isLoadingInterviews?: boolean;
  isLoadingAlerts?: boolean;
  isSavingDescription?: boolean;
  isSavingAIAnalysis?: boolean;
  onRegenerateAnalysis?: () => void;
  onSaveDescription?: (description: string) => Promise<void>;
  onSaveAIAnalysis?: (updates: Partial<CaseAIAnalysis>) => Promise<void>;
  onViewAllDocSets?: () => void;
  onViewAllParties?: () => void;
  onViewAllInterviews?: () => void;
  onViewAllAlerts?: () => void;
}

function formatMatterType(matterType: string | null | undefined): string {
  if (!matterType) return "Investigation";
  
  const displayMap: Record<string, string> = {
    "litigation_fraud": "Litigation - Fraud",
    "hr_investigation": "HR Investigation",
    "fcpa_violation": "FCPA Violation",
    "sexual_harassment": "Sexual Harassment",
    "antitrust": "Antitrust",
    "securities_fraud": "Securities Fraud",
    "bsa_aml": "BSA/AML",
    "data_privacy": "Data Privacy",
    "environmental": "Environmental",
    "product_liability": "Product Liability",
    "contract_dispute": "Contract Dispute",
    "regulatory_compliance": "Regulatory Compliance",
    "internal_investigation": "Internal Investigation",
  };
  
  return displayMap[matterType] || matterType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "critical": return "bg-destructive text-destructive-foreground";
    case "high": return "bg-orange-500/20 text-orange-600 dark:text-orange-400";
    case "medium": return "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400";
    case "low": return "bg-green-500/20 text-green-600 dark:text-green-400";
    default: return "bg-muted text-muted-foreground";
  }
}

export function OverviewTab({
  caseData,
  aiAnalysis,
  documentSets = [],
  parties = [],
  interviews = [],
  alerts = [],
  isLoadingAnalysis,
  isLoadingDocSets,
  isLoadingParties,
  isLoadingInterviews,
  isLoadingAlerts,
  isSavingDescription,
  isSavingAIAnalysis,
  onRegenerateAnalysis,
  onSaveDescription,
  onSaveAIAnalysis,
  onViewAllDocSets,
  onViewAllParties,
  onViewAllInterviews,
  onViewAllAlerts,
}: OverviewTabProps) {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(caseData.description || "");
  
  const [isEditingAISummary, setIsEditingAISummary] = useState(false);
  const [editedAISummary, setEditedAISummary] = useState(aiAnalysis?.aiSummaryText || "");
  const [isEditingLaws, setIsEditingLaws] = useState(false);
  const [editedLawMatrix, setEditedLawMatrix] = useState<Array<{ law: string; analysis: string }>>(
    aiAnalysis?.lawMatrix || []
  );

  useEffect(() => {
    setEditedDescription(caseData.description || "");
  }, [caseData.description]);

  useEffect(() => {
    if (aiAnalysis) {
      setEditedAISummary(aiAnalysis.aiSummaryText || "");
      setEditedLawMatrix(aiAnalysis.lawMatrix || []);
    }
  }, [aiAnalysis]);

  const handleVoiceTranscript = useCallback((transcript: string, isFinal: boolean) => {
    if (isFinal && isEditingDescription) {
      setEditedDescription(prev => prev ? `${prev} ${transcript}` : transcript);
    }
  }, [isEditingDescription]);

  const {
    isSupported: isVoiceSupported,
    isListening,
    startListening,
    stopListening,
    error: voiceError
  } = useVoiceRecognition({
    onTranscript: handleVoiceTranscript,
    continuous: true
  });

  const handleSaveDescription = async () => {
    if (onSaveDescription) {
      await onSaveDescription(editedDescription);
      setIsEditingDescription(false);
      if (isListening) {
        stopListening();
      }
    }
  };

  const handleCancelEdit = () => {
    setEditedDescription(caseData.description || "");
    setIsEditingDescription(false);
    if (isListening) {
      stopListening();
    }
  };

  const handleStartEdit = () => {
    setIsEditingDescription(true);
  };

  const toggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSaveAISummary = async () => {
    if (onSaveAIAnalysis) {
      await onSaveAIAnalysis({ aiSummaryText: editedAISummary });
      setIsEditingAISummary(false);
    }
  };

  const handleCancelAISummaryEdit = () => {
    setEditedAISummary(aiAnalysis?.aiSummaryText || "");
    setIsEditingAISummary(false);
  };

  const handleSaveLaws = async () => {
    if (onSaveAIAnalysis) {
      await onSaveAIAnalysis({ lawMatrix: editedLawMatrix });
      setIsEditingLaws(false);
    }
  };

  const handleCancelLawsEdit = () => {
    setEditedLawMatrix(aiAnalysis?.lawMatrix || []);
    setIsEditingLaws(false);
  };

  const handleUpdateLaw = (idx: number, field: 'law' | 'analysis', value: string) => {
    setEditedLawMatrix(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const handleAddLaw = () => {
    setEditedLawMatrix(prev => [...prev, { law: "", analysis: "" }]);
  };

  const handleRemoveLaw = (idx: number) => {
    setEditedLawMatrix(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Case Snapshot & AI Summary */}
      <div className="lg:col-span-2 space-y-6">
        {/* Case Snapshot */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Case Snapshot
                </CardTitle>
                {aiAnalysis?.matterType && (
                  <Badge 
                    variant="secondary" 
                    className="bg-primary/10 text-primary font-medium"
                    data-testid="badge-matter-type"
                  >
                    {formatMatterType(aiAnalysis.matterType)}
                  </Badge>
                )}
              </div>
              {!isEditingDescription && onSaveDescription && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleStartEdit}
                  data-testid="button-edit-description"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
            {aiAnalysis?.documentsAnalyzedCount && aiAnalysis.documentsAnalyzedCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Based on {aiAnalysis.documentsAnalyzedCount} analyzed documents
                {aiAnalysis.lastIncrementalUpdate && ` • Updated ${format(new Date(aiAnalysis.lastIncrementalUpdate), "MMM d, h:mm a")}`}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Allegations / Issue Summary</p>
              {isEditingDescription ? (
                <div className="space-y-3">
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    placeholder="Describe the case allegations, issues, or key facts for AI analysis..."
                    className="min-h-[120px] text-sm"
                    data-testid="textarea-case-description"
                  />
                  {voiceError && (
                    <p className="text-sm text-destructive">{voiceError}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {isVoiceSupported && (
                      <Button
                        variant={isListening ? "destructive" : "outline"}
                        size="sm"
                        onClick={toggleVoice}
                        data-testid="button-voice-dictation"
                      >
                        {isListening ? (
                          <>
                            <MicOff className="h-4 w-4 mr-2" />
                            Stop Dictation
                          </>
                        ) : (
                          <>
                            <Mic className="h-4 w-4 mr-2" />
                            Voice Dictation
                          </>
                        )}
                      </Button>
                    )}
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={isSavingDescription}
                      data-testid="button-cancel-description"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveDescription}
                      disabled={isSavingDescription}
                      data-testid="button-save-description"
                    >
                      {isSavingDescription ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save & Analyze
                        </>
                      )}
                    </Button>
                  </div>
                  {isListening && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                      Listening... Speak now
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm" data-testid="text-case-allegations">
                  {caseData.description || "No description provided. Click Edit to add case details for AI analysis."}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {caseData.origin && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Origin</p>
                  <p className="text-sm capitalize" data-testid="text-case-origin">
                    {caseData.origin.replace(/_/g, " ")}
                  </p>
                </div>
              )}

              {caseData.regulatoryBody && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Regulatory Body</p>
                  <Badge variant="outline" data-testid="badge-regulatory-body">
                    {caseData.regulatoryBody.toUpperCase()}
                  </Badge>
                </div>
              )}

              {caseData.incidentPeriodStart && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Incident Period</p>
                  <p className="text-sm" data-testid="text-incident-period">
                    {format(new Date(caseData.incidentPeriodStart), "MMM d, yyyy")}
                    {caseData.incidentPeriodEnd && ` - ${format(new Date(caseData.incidentPeriodEnd), "MMM d, yyyy")}`}
                  </p>
                </div>
              )}

              {caseData.investigationOpenedAt && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Investigation Opened</p>
                  <p className="text-sm" data-testid="text-investigation-opened">
                    {format(new Date(caseData.investigationOpenedAt), "MMM d, yyyy")}
                  </p>
                </div>
              )}

              {caseData.nextDeadlineAt && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Next Regulatory Deadline</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium" data-testid="text-next-deadline">
                      {format(new Date(caseData.nextDeadlineAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Case Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                AI Case Summary & Laws
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onRegenerateAnalysis}
                disabled={isLoadingAnalysis}
                data-testid="button-regenerate-analysis"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingAnalysis ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingAnalysis ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : aiAnalysis ? (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Narrative Summary</p>
                    {!isEditingAISummary && onSaveAIAnalysis && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingAISummary(true)}
                        data-testid="button-edit-ai-summary"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                  {isEditingAISummary ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editedAISummary}
                        onChange={(e) => setEditedAISummary(e.target.value)}
                        className="min-h-[150px] text-sm"
                        data-testid="textarea-ai-summary"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelAISummaryEdit}
                          disabled={isSavingAIAnalysis}
                          data-testid="button-cancel-ai-summary"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveAISummary}
                          disabled={isSavingAIAnalysis}
                          data-testid="button-save-ai-summary"
                        >
                          {isSavingAIAnalysis ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-1" />
                          )}
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed" data-testid="text-ai-narrative">
                      {aiAnalysis.aiSummaryText}
                    </p>
                  )}
                </div>

                {aiAnalysis.keyFacts && aiAnalysis.keyFacts.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Key Facts</p>
                    <ul className="list-disc list-inside space-y-1" data-testid="list-key-facts">
                      {aiAnalysis.keyFacts.map((fact, idx) => (
                        <li key={idx} className="text-sm">{fact}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiAnalysis.keyIndividuals && aiAnalysis.keyIndividuals.length > 0 && (
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Key Individuals</p>
                    <div className="space-y-2" data-testid="list-key-individuals">
                      {aiAnalysis.keyIndividuals.map((person, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="font-medium">{person.name}</span>
                            {person.role && (
                              <span className="text-muted-foreground"> — {person.role}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(aiAnalysis.lawMatrix && aiAnalysis.lawMatrix.length > 0) || isEditingLaws ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted-foreground">Applicable Laws & Regulations</p>
                      {!isEditingLaws && onSaveAIAnalysis && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingLaws(true)}
                          data-testid="button-edit-laws"
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                    {isEditingLaws ? (
                      <div className="space-y-3">
                        {editedLawMatrix.map((item, idx) => (
                          <div key={idx} className="p-3 rounded-md border bg-muted/20 space-y-2">
                            <div className="flex items-center gap-2">
                              <Input
                                value={item.law}
                                onChange={(e) => handleUpdateLaw(idx, 'law', e.target.value)}
                                placeholder="Law or regulation name..."
                                className="text-sm font-medium"
                                data-testid={`input-law-name-${idx}`}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveLaw(idx)}
                                data-testid={`button-remove-law-${idx}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                            <Textarea
                              value={item.analysis}
                              onChange={(e) => handleUpdateLaw(idx, 'analysis', e.target.value)}
                              placeholder="Analysis of how this law applies..."
                              className="text-sm min-h-[80px]"
                              data-testid={`textarea-law-analysis-${idx}`}
                            />
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAddLaw}
                          data-testid="button-add-law"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Law
                        </Button>
                        <div className="flex items-center justify-end gap-2 pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelLawsEdit}
                            disabled={isSavingAIAnalysis}
                            data-testid="button-cancel-laws"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveLaws}
                            disabled={isSavingAIAnalysis}
                            data-testid="button-save-laws"
                          >
                            {isSavingAIAnalysis ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 mr-1" />
                            )}
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3" data-testid="list-applicable-laws">
                        {aiAnalysis.lawMatrix.map((item, idx) => (
                          <div key={idx} className="p-3 rounded-md border bg-muted/20">
                            <p className="font-medium text-sm mb-1">{item.law}</p>
                            <p className="text-sm text-muted-foreground">{item.analysis}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                {aiAnalysis.detectedLegalIssues && aiAnalysis.detectedLegalIssues.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Detected Legal Issues</p>
                    <div className="space-y-2" data-testid="list-detected-issues">
                      {aiAnalysis.detectedLegalIssues.map((issue, idx) => (
                        <div key={idx} className="p-3 rounded-md border bg-muted/20">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="font-medium text-sm">{issue.issue}</p>
                            <Badge className={`${getSeverityColor(issue.severity)} text-xs`}>
                              {issue.severity.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{issue.description}</p>
                          {issue.sources && issue.sources.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Sources: {issue.sources.join(", ")}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiAnalysis.riskAssessmentText && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Risk Assessment</p>
                    <p className="text-sm" data-testid="text-risk-assessment">
                      {aiAnalysis.riskAssessmentText}
                    </p>
                  </div>
                )}

                {aiAnalysis.suggestedNextSteps && aiAnalysis.suggestedNextSteps.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Suggested Next Steps</p>
                    <ul className="space-y-2" data-testid="list-next-steps">
                      {aiAnalysis.suggestedNextSteps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                          <span className="text-sm">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiAnalysis.lastGeneratedAt && (
                  <p className="text-xs text-muted-foreground" data-testid="text-analysis-timestamp">
                    Last generated {format(new Date(aiAnalysis.lastGeneratedAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">No AI analysis generated yet</p>
                <Button variant="default" onClick={onRegenerateAnalysis} data-testid="button-generate-initial-analysis">
                  Generate AI Analysis
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Operational Snapshots */}
      <div className="space-y-6">
        {/* Document Sets Snapshot */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Document Sets
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onViewAllDocSets}
                data-testid="button-view-all-docsets"
              >
                View all
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingDocSets ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : documentSets.length > 0 ? (
              <div className="space-y-3">
                {documentSets.slice(0, 3).map((set) => (
                  <div key={set.id} className="p-3 rounded-md border hover-elevate" data-testid={`docset-${set.id}`}>
                    <p className="font-medium text-sm mb-1">{set.name}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{set.documentCount} docs</span>
                      <Badge variant="outline" className="text-xs">{set.reviewStatus}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No document sets yet</p>
            )}
          </CardContent>
        </Card>

        {/* Parties Snapshot */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Parties & Custodians
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onViewAllParties}
                data-testid="button-view-all-parties"
              >
                View all
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingParties ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : parties.length > 0 ? (
              <div className="space-y-3">
                {parties.slice(0, 3).map((party) => (
                  <div key={party.id} className="p-3 rounded-md border hover-elevate" data-testid={`party-${party.id}`}>
                    <p className="font-medium text-sm mb-1">{party.name}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{party.roleType}</Badge>
                      <Badge variant="outline" className="text-xs">{party.caseRole}</Badge>
                      <Badge variant="outline" className="text-xs">{party.legalHoldStatus}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No parties added yet</p>
            )}
          </CardContent>
        </Card>

        {/* Interviews Snapshot */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4" />
                Interviews
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onViewAllInterviews}
                data-testid="button-view-all-interviews"
              >
                View all
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingInterviews ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : interviews.length > 0 ? (
              <div className="space-y-3">
                {interviews.slice(0, 3).map((interview) => (
                  <div key={interview.id} className="p-3 rounded-md border hover-elevate" data-testid={`interview-${interview.id}`}>
                    <p className="font-medium text-sm mb-1">{interview.intervieweeName}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{interview.interviewType}</span>
                      <Badge variant="outline" className="text-xs">{interview.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No interviews yet</p>
            )}
          </CardContent>
        </Card>

        {/* Alerts Snapshot */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4" />
                Alerts
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onViewAllAlerts}
                data-testid="button-view-all-alerts"
              >
                View all
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingAlerts ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="p-3 rounded-md border hover-elevate" data-testid={`alert-${alert.id}`}>
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="destructive" className="text-xs">{alert.severity}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {alert.detectedAt ? format(new Date(alert.detectedAt), "MMM d") : "Unknown date"}
                      </span>
                    </div>
                    <p className="text-sm line-clamp-2">{alert.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No alerts</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
