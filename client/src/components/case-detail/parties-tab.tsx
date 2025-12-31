import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { 
  UserPlus, MoreVertical, Shield, Mail, User, Database, 
  ChevronDown, ChevronRight, Building2, Send, Inbox, Search,
  Users, Globe, Sparkles, FileText, Loader2, LayoutGrid, ExternalLink
} from "lucide-react";
import { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";

interface Party {
  id: string;
  name: string;
  roleType: string;
  caseRole: string;
  department?: string;
  company?: string;
  legalHoldStatus: string;
  dataSources: number;
  interviewStatus: string;
  riskLevel: string;
}

interface DiscoveredEntity {
  email: string;
  name: string | null;
  domain: string;
  sentCount: number;
  receivedCount: number;
  totalCount: number;
  firstSeen: string | null;
  lastSeen: string | null;
}

interface Organization {
  domain: string;
  personCount: number;
  messageCount: number;
}

interface MentionedEntity {
  name: string;
  email: string | null;
  domain: string | null;
  sent: number;
  received: number;
  totalMentions: number;
  documentCount: number;
  confidence: number;
  sourceType: "metadata" | "body";
  contexts: string[];
}

interface DiscoveredEntitiesData {
  entities: DiscoveredEntity[];
  organizations: Organization[];
  totalUniqueEntities: number;
  totalOrganizations: number;
  mentionedEntities?: MentionedEntity[];
  totalMentionedEntities?: number;
}

interface ExtractionProgress {
  caseId: string;
  totalDocuments: number;
  processedDocuments: number;
  entitiesFound: number;
  status: "pending" | "processing" | "completed" | "error" | "not_started";
  error?: string;
}

interface PartiesTabProps {
  caseId: string;
  parties?: Party[];
  isLoading?: boolean;
  discoveredEntities?: DiscoveredEntitiesData;
  isLoadingEntities?: boolean;
  isExtractingEntities?: boolean;
  extractionProgress?: ExtractionProgress;
  onAddParty?: () => void;
  onIssueLegalHold?: (partyId: string) => void;
  onSendInterview?: (partyId: string) => void;
  onViewProfile?: (partyId: string) => void;
  onPromoteToParty?: (entity: DiscoveredEntity) => void;
  onExtractEntities?: () => void;
  onPromoteMentionedToParty?: (entity: MentionedEntity) => void;
}

const getRoleColor = (role: string) => {
  const colors: Record<string, string> = {
    subject: "bg-red-500/10 text-red-700 dark:text-red-400",
    witness: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    reporter: "bg-green-500/10 text-green-700 dark:text-green-400",
    third_party: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  };
  return colors[role] || "bg-gray-500/10 text-gray-700 dark:text-gray-400";
};

const getLegalHoldColor = (status: string) => {
  const colors: Record<string, string> = {
    active: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
    none: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
    released: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  };
  return colors[status] || colors.none;
};

const getInterviewStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    completed: "bg-green-500/10 text-green-700 dark:text-green-400",
    scheduled: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    not_scheduled: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
    in_progress: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  };
  return colors[status] || colors.not_scheduled;
};

const getRiskColor = (level: string) => {
  const colors: Record<string, string> = {
    high: "bg-red-500/10 text-red-700 dark:text-red-400",
    medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    low: "bg-green-500/10 text-green-700 dark:text-green-400",
  };
  return colors[level] || colors.low;
};

export function PartiesTab({
  caseId,
  parties = [],
  isLoading,
  discoveredEntities,
  isLoadingEntities,
  isExtractingEntities,
  extractionProgress,
  onAddParty,
  onIssueLegalHold,
  onSendInterview,
  onViewProfile,
  onPromoteToParty,
  onExtractEntities,
  onPromoteMentionedToParty,
}: PartiesTabProps) {
  const [, setLocation] = useLocation();
  const [entitiesOpen, setEntitiesOpen] = useState(true);
  const [orgsOpen, setOrgsOpen] = useState(false);
  const [mentionedOpen, setMentionedOpen] = useState(true);
  const [entitySearch, setEntitySearch] = useState("");
  const [mentionedSearch, setMentionedSearch] = useState("");
  const [showAllEntities, setShowAllEntities] = useState(false);
  const [showAllMentioned, setShowAllMentioned] = useState(false);
  
  // Navigation handlers for clicking on entities to view their documents
  const handleViewPersonDocuments = useCallback((email: string) => {
    const params = new URLSearchParams();
    params.set("participants", email);
    setLocation(`/cases/${caseId}/document-review?${params.toString()}`);
  }, [caseId, setLocation]);
  
  const handleViewOrgDocuments = useCallback((domain: string) => {
    const params = new URLSearchParams();
    params.set("domain", domain);
    setLocation(`/cases/${caseId}/document-review?${params.toString()}`);
  }, [caseId, setLocation]);
  
  const handleViewMentionedDocuments = useCallback((name: string) => {
    const params = new URLSearchParams();
    params.set("query", name);
    params.set("queryMode", "natural");
    setLocation(`/cases/${caseId}/document-review?${params.toString()}`);
  }, [caseId, setLocation]);

  const filteredEntities = discoveredEntities?.entities.filter(entity => 
    entity.email.toLowerCase().includes(entitySearch.toLowerCase()) ||
    entity.name?.toLowerCase().includes(entitySearch.toLowerCase()) ||
    entity.domain.toLowerCase().includes(entitySearch.toLowerCase())
  ) || [];

  const filteredMentioned = discoveredEntities?.mentionedEntities?.filter(entity =>
    entity.name.toLowerCase().includes(mentionedSearch.toLowerCase()) ||
    entity.contexts?.some(c => c.toLowerCase().includes(mentionedSearch.toLowerCase()))
  ) || [];

  const displayedEntities = showAllEntities ? filteredEntities : filteredEntities.slice(0, 25);
  const displayedMentioned = showAllMentioned ? filteredMentioned : filteredMentioned.slice(0, 25);

  return (
    <div className="space-y-6">
      {/* Formal Parties Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle>Parties & Custodians</CardTitle>
            <div className="flex items-center gap-2">
              <Link href={`/cases/${caseId}/communications-heatmap`}>
                <Button 
                  variant="outline" 
                  className="gap-2"
                  data-testid="button-open-heatmap"
                >
                  <LayoutGrid className="h-4 w-4" />
                  Communications Heatmap
                </Button>
              </Link>
              <Button onClick={onAddParty} data-testid="button-add-party-tab">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Party
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : parties.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role Type</TableHead>
                  <TableHead>Case Role</TableHead>
                  <TableHead>Department/Company</TableHead>
                  <TableHead>Legal Hold</TableHead>
                  <TableHead>Data Sources</TableHead>
                  <TableHead>Interview</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parties.map((party) => (
                  <TableRow key={party.id} className="hover-elevate" data-testid={`party-row-${party.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{party.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize text-sm">{party.roleType.replace(/_/g, " ")}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getRoleColor(party.caseRole)}>
                        {party.caseRole.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{party.department || party.company || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getLegalHoldColor(party.legalHoldStatus)}>
                        {party.legalHoldStatus.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{party.dataSources}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getInterviewStatusColor(party.interviewStatus)}>
                        {party.interviewStatus.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getRiskColor(party.riskLevel)}>
                        {party.riskLevel.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" data-testid={`button-actions-${party.id}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => onViewProfile?.(party.id)}
                            data-testid={`action-view-profile-${party.id}`}
                          >
                            <User className="h-4 w-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onIssueLegalHold?.(party.id)}
                            data-testid={`action-legal-hold-${party.id}`}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Issue Legal Hold
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onSendInterview?.(party.id)}
                            data-testid={`action-send-interview-${party.id}`}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Send Interview Invite
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">No parties or custodians added yet</p>
              <Button variant="default" onClick={onAddParty} data-testid="button-add-party-empty">
                <UserPlus className="h-4 w-4 mr-2" />
                Add First Party
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discovered from Evidence Section */}
      <Card>
        <Collapsible open={entitiesOpen} onOpenChange={setEntitiesOpen}>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {entitiesOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Discovered from Evidence
                  </CardTitle>
                  {discoveredEntities && (
                    <Badge variant="secondary" className="ml-2">
                      {discoveredEntities.totalUniqueEntities.toLocaleString()} people
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  People and organizations automatically extracted from case documents
                </p>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {isLoadingEntities ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : discoveredEntities && discoveredEntities.entities.length > 0 ? (
                <div className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or organization..."
                      value={entitySearch}
                      onChange={(e) => setEntitySearch(e.target.value)}
                      className="pl-10"
                      data-testid="input-entity-search"
                    />
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold">{discoveredEntities.totalUniqueEntities.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Unique People</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold">{discoveredEntities.totalOrganizations.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Organizations</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold">
                        {discoveredEntities.entities.reduce((sum, e) => sum + e.sentCount, 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Emails Sent</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold">
                        {discoveredEntities.entities.reduce((sum, e) => sum + e.receivedCount, 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Emails Received</div>
                    </div>
                  </div>

                  {/* Entities Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name / Email</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead className="text-center">Sent</TableHead>
                        <TableHead className="text-center">Received</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedEntities.map((entity, idx) => (
                        <TableRow key={entity.email} className="hover-elevate" data-testid={`entity-row-${idx}`}>
                          <TableCell>
                            <button 
                              onClick={() => handleViewPersonDocuments(entity.email)}
                              className="flex flex-col text-left hover:bg-muted/50 rounded p-1 -m-1 transition-colors cursor-pointer group w-full"
                              data-testid={`link-person-${idx}`}
                            >
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium group-hover:text-primary group-hover:underline">
                                  {entity.name || entity.email.split('@')[0]}
                                </span>
                                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <span className="text-xs text-muted-foreground ml-6">{entity.email}</span>
                            </button>
                          </TableCell>
                          <TableCell>
                            <button 
                              onClick={() => entity.domain && handleViewOrgDocuments(entity.domain)}
                              className="flex items-center gap-2 hover:bg-muted/50 rounded p-1 -m-1 transition-colors cursor-pointer group"
                              disabled={!entity.domain}
                              data-testid={`link-org-${idx}`}
                            >
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm group-hover:text-primary group-hover:underline">{entity.domain || "—"}</span>
                            </button>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Send className="h-3 w-3 text-blue-500" />
                              <span className="text-sm">{entity.sentCount.toLocaleString()}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Inbox className="h-3 w-3 text-green-500" />
                              <span className="text-sm">{entity.receivedCount.toLocaleString()}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{entity.totalCount.toLocaleString()}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => onPromoteToParty?.(entity)}
                              data-testid={`button-promote-${idx}`}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Add as Party
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Show More Button */}
                  {filteredEntities.length > 25 && (
                    <div className="text-center pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowAllEntities(!showAllEntities)}
                        data-testid="button-show-more-entities"
                      >
                        {showAllEntities 
                          ? "Show Less" 
                          : `Show All ${filteredEntities.length.toLocaleString()} People`
                        }
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No entities discovered yet. Upload documents to automatically extract participants.
                  </p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Organizations Summary */}
      {discoveredEntities && discoveredEntities.organizations.length > 0 && (
        <Card>
          <Collapsible open={orgsOpen} onOpenChange={setOrgsOpen}>
            <CardHeader className="pb-3">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {orgsOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" />
                      Organizations
                    </CardTitle>
                    <Badge variant="secondary" className="ml-2">
                      {discoveredEntities.totalOrganizations.toLocaleString()} domains
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Companies and domains identified from email addresses
                  </p>
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain</TableHead>
                      <TableHead className="text-center">People</TableHead>
                      <TableHead className="text-center">Messages</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discoveredEntities.organizations.slice(0, 20).map((org, idx) => (
                      <TableRow key={org.domain} className="hover-elevate" data-testid={`org-row-${idx}`}>
                        <TableCell>
                          <button 
                            onClick={() => handleViewOrgDocuments(org.domain)}
                            className="flex items-center gap-2 hover:bg-muted/50 rounded p-1 -m-1 transition-colors cursor-pointer group"
                            data-testid={`link-org-domain-${idx}`}
                          >
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium group-hover:text-primary group-hover:underline">{org.domain}</span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{org.personCount.toLocaleString()}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{org.messageCount.toLocaleString()}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Mentioned in Documents Section - AI Extracted Names */}
      <Card>
        <Collapsible open={mentionedOpen} onOpenChange={setMentionedOpen}>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {mentionedOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Mentioned in Documents
                  </CardTitle>
                  {discoveredEntities?.totalMentionedEntities !== undefined && (
                    <Badge variant="secondary" className="ml-2">
                      {discoveredEntities.totalMentionedEntities.toLocaleString()} names
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    Person names extracted from document content using AI
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExtractEntities?.();
                    }}
                    disabled={isExtractingEntities}
                    data-testid="button-extract-entities"
                  >
                    {isExtractingEntities ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Extract Names
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {isExtractingEntities ? (
                <div className="py-8 space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-muted-foreground">
                          {extractionProgress?.status === "pending" && "Preparing to analyze documents..."}
                          {extractionProgress?.status === "processing" && "Analyzing document content..."}
                          {!extractionProgress && "Starting extraction..."}
                        </span>
                      </div>
                      {extractionProgress && extractionProgress.totalDocuments > 0 && (
                        <span className="text-muted-foreground font-medium">
                          {extractionProgress.processedDocuments.toLocaleString()} / {extractionProgress.totalDocuments.toLocaleString()} documents
                        </span>
                      )}
                    </div>
                    
                    <Progress 
                      value={extractionProgress && extractionProgress.totalDocuments > 0 
                        ? (extractionProgress.processedDocuments / extractionProgress.totalDocuments) * 100 
                        : 0
                      } 
                      className="h-3"
                      data-testid="progress-extraction"
                    />
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {extractionProgress?.entitiesFound 
                          ? `${extractionProgress.entitiesFound.toLocaleString()} names found so far`
                          : "Scanning for person names..."
                        }
                      </span>
                      {extractionProgress && extractionProgress.totalDocuments > 0 && (
                        <span className="text-muted-foreground">
                          {Math.round((extractionProgress.processedDocuments / extractionProgress.totalDocuments) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground text-center">
                    This may take several minutes for large cases with many documents.
                  </p>
                </div>
              ) : discoveredEntities?.mentionedEntities && discoveredEntities.mentionedEntities.length > 0 ? (
                <div className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search extracted names..."
                      value={mentionedSearch}
                      onChange={(e) => setMentionedSearch(e.target.value)}
                      className="pl-10"
                      data-testid="input-mentioned-search"
                    />
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold">{discoveredEntities.totalMentionedEntities?.toLocaleString() || 0}</div>
                      <div className="text-sm text-muted-foreground">Unique Names</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold">
                        {discoveredEntities.mentionedEntities.reduce((sum, e) => sum + e.totalMentions, 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Mentions</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold">
                        {discoveredEntities.mentionedEntities.reduce((sum, e) => sum + e.documentCount, 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Documents</div>
                    </div>
                  </div>

                  {/* Mentioned Entities Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-center">Mentions</TableHead>
                        <TableHead className="text-center">Documents</TableHead>
                        <TableHead>Context</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedMentioned.map((entity, idx) => (
                        <TableRow key={entity.name + idx} className="hover-elevate" data-testid={`mentioned-row-${idx}`}>
                          <TableCell>
                            <button 
                              onClick={() => handleViewMentionedDocuments(entity.name)}
                              className="flex items-center gap-2 hover:bg-muted/50 rounded p-1 -m-1 transition-colors cursor-pointer group"
                              data-testid={`link-mentioned-${idx}`}
                            >
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium group-hover:text-primary group-hover:underline">{entity.name}</span>
                              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-400">
                                AI Extracted
                              </Badge>
                              <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{entity.totalMentions.toLocaleString()}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{entity.documentCount.toLocaleString()}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground line-clamp-1">
                              {entity.contexts?.[0] || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => onPromoteMentionedToParty?.(entity)}
                              data-testid={`button-promote-mentioned-${idx}`}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Add as Party
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Show More Button */}
                  {filteredMentioned.length > 25 && (
                    <div className="text-center pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowAllMentioned(!showAllMentioned)}
                        data-testid="button-show-more-mentioned"
                      >
                        {showAllMentioned 
                          ? "Show Less" 
                          : `Show All ${filteredMentioned.length.toLocaleString()} Names`
                        }
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    No names extracted yet. Click "Extract Names" to analyze document content and find mentioned persons.
                  </p>
                  <Button
                    variant="default"
                    onClick={onExtractEntities}
                    disabled={isExtractingEntities}
                    data-testid="button-extract-entities-empty"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Extract Names from Documents
                  </Button>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
