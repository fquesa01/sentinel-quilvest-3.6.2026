import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin,
  Loader2,
  Sparkles,
  Building2,
  Home,
  Landmark,
  Ruler,
  ArrowUpRight,
  Layers,
  Scale,
  FileText,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  TreePine,
  Warehouse,
  CircleDot,
  Gavel,
} from "lucide-react";
import type { DealZoningAnalysis } from "@shared/schema";

interface ZoningAnalysisTabProps {
  dealId: string;
}

interface AnalysisContent {
  jurisdiction: {
    city: string;
    county: string;
    state: string;
    governingBody: string;
  };
  zoningClassification: {
    currentZoning: string;
    zoningDescription: string;
    propertyClassification: string;
  };
  futureLandUse: {
    designation: string;
    description: string;
    maxFAR: string;
    maxDensity: string;
  };
  permittedUses: {
    asOfRight: string[];
    conditionalUse: string[];
    prohibited: string[];
  };
  developmentStandards: {
    maxHeight: string;
    far: string;
    setbacks: {
      front: string;
      rear: string;
      side: string;
      sideStreet: string;
    };
    lotCoverage: string;
    openSpace: string;
    parking: string;
    density: string;
  };
  overlays: string[];
  developmentPotential: string;
  regulatoryNotes: string[];
  platInfo: string;
  impactFees: string;
}

interface DocumentSummary {
  documentId: string;
  fileName: string;
  summary: string;
}

const classificationConfig: Record<string, { label: string; icon: typeof Building2; color: string }> = {
  commercial: { label: "Commercial", icon: Building2, color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  residential: { label: "Residential", icon: Home, color: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30" },
  mixed_use: { label: "Mixed Use", icon: Layers, color: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30" },
  industrial: { label: "Industrial", icon: Warehouse, color: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30" },
  agricultural: { label: "Agricultural", icon: TreePine, color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  institutional: { label: "Institutional", icon: Landmark, color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
};

const subSections = [
  { id: "overview", label: "Overview", icon: MapPin },
  { id: "classification", label: "Zoning & Land Use", icon: Landmark },
  { id: "uses", label: "Permitted Uses", icon: Scale },
  { id: "standards", label: "Development Standards", icon: Ruler },
  { id: "potential", label: "Development Potential", icon: ArrowUpRight },
  { id: "documents", label: "Documents on File", icon: FileText },
] as const;

export function ZoningAnalysisTab({ dealId }: ZoningAnalysisTabProps) {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<string>("overview");

  const { data: analysis, isLoading } = useQuery<DealZoningAnalysis | null>({
    queryKey: ["/api/deals", dealId, "zoning"],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${dealId}/zoning`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/deals/${dealId}/zoning/analyze`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "zoning"] });
      toast({ title: "Zoning Analysis Complete", description: "The zoning analysis has been generated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Analysis Failed", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const content = analysis?.analysisContent as AnalysisContent | null;
  const docSummaries = (analysis?.documentSummaries || []) as DocumentSummary[];

  if (!analysis || !content) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="rounded-full bg-muted p-4">
            <Landmark className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold" data-testid="text-zoning-empty-title">No Zoning Analysis</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Generate a comprehensive zoning and land use analysis based on the property address and any zoning documents in the deal file.
            </p>
          </div>
          <Button
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
            data-testid="button-generate-zoning"
          >
            {analyzeMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {analyzeMutation.isPending ? "Analyzing..." : "Generate Zoning Analysis"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const classInfo = classificationConfig[content.zoningClassification?.propertyClassification] || classificationConfig.commercial;
  const ClassIcon = classInfo.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Badge className={classInfo.color} data-testid="badge-property-classification">
            <ClassIcon className="h-3 w-3 mr-1" />
            {classInfo.label}
          </Badge>
          <Badge variant="outline" data-testid="badge-zoning-district">
            {content.zoningClassification?.currentZoning || "—"}
          </Badge>
          {content.overlays?.length > 0 && content.overlays.map((overlay, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {overlay}
            </Badge>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => analyzeMutation.mutate()}
          disabled={analyzeMutation.isPending}
          data-testid="button-regenerate-zoning"
        >
          {analyzeMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {analyzeMutation.isPending ? "Analyzing..." : "Re-analyze"}
        </Button>
      </div>

      <div className="flex gap-1 flex-wrap">
        {subSections.map(section => {
          const SIcon = section.icon;
          const isActive = activeSection === section.id;
          if (section.id === "documents" && docSummaries.length === 0) return null;
          return (
            <Button
              key={section.id}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveSection(section.id)}
              data-testid={`button-zoning-section-${section.id}`}
            >
              <SIcon className="h-4 w-4 mr-1" />
              {section.label}
            </Button>
          );
        })}
      </div>

      {activeSection === "overview" && (
        <OverviewSection content={content} analysis={analysis} docCount={docSummaries.length} />
      )}
      {activeSection === "classification" && (
        <ClassificationSection content={content} />
      )}
      {activeSection === "uses" && (
        <PermittedUsesSection content={content} />
      )}
      {activeSection === "standards" && (
        <DevelopmentStandardsSection content={content} />
      )}
      {activeSection === "potential" && (
        <DevelopmentPotentialSection content={content} />
      )}
      {activeSection === "documents" && docSummaries.length > 0 && (
        <DocumentSummariesSection summaries={docSummaries} />
      )}
    </div>
  );
}

function OverviewSection({ content, analysis, docCount }: { content: AnalysisContent; analysis: DealZoningAnalysis; docCount: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Property Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="Address" value={analysis.propertyAddress || "—"} testId="text-zoning-address" />
          <InfoRow label="City" value={content.jurisdiction?.city || "—"} testId="text-zoning-city" />
          <InfoRow label="County" value={content.jurisdiction?.county || "—"} testId="text-zoning-county" />
          <InfoRow label="State" value={content.jurisdiction?.state || "—"} testId="text-zoning-state" />
          <InfoRow label="Governing Body" value={content.jurisdiction?.governingBody || "—"} testId="text-zoning-gov" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Landmark className="h-4 w-4" />
            Zoning Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="Zoning District" value={content.zoningClassification?.currentZoning || "—"} testId="text-zoning-district" />
          <InfoRow label="Classification" value={content.zoningClassification?.propertyClassification?.replace("_", " ") || "—"} testId="text-zoning-class" />
          <InfoRow label="Future Land Use" value={content.futureLandUse?.designation || "—"} testId="text-zoning-flu" />
          <InfoRow label="Max FAR" value={content.futureLandUse?.maxFAR || "—"} testId="text-zoning-far-overview" />
          <InfoRow label="Max Height" value={content.developmentStandards?.maxHeight || "—"} testId="text-zoning-height-overview" />
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CircleDot className="h-4 w-4" />
            Zoning Description
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-zoning-description">
            {content.zoningClassification?.zoningDescription || "No description available."}
          </p>
        </CardContent>
      </Card>

      {docCount > 0 && (
        <Card className="md:col-span-2">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground" data-testid="text-zoning-doc-count">
                {docCount} zoning/land use document{docCount !== 1 ? "s" : ""} found in the deal file. See the Documents on File tab below for summaries.
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ClassificationSection({ content }: { content: AnalysisContent }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Landmark className="h-4 w-4" />
            Zoning Classification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="Current Zoning" value={content.zoningClassification?.currentZoning || "—"} testId="text-zoning-current" />
          <div>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Description</span>
            <p className="text-sm mt-1 leading-relaxed" data-testid="text-zoning-class-desc">{content.zoningClassification?.zoningDescription || "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Future Land Use Designation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="Designation" value={content.futureLandUse?.designation || "—"} testId="text-flu-designation" />
          <InfoRow label="Max FAR" value={content.futureLandUse?.maxFAR || "—"} testId="text-flu-far" />
          <InfoRow label="Max Density" value={content.futureLandUse?.maxDensity || "—"} testId="text-flu-density" />
          <div>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Description</span>
            <p className="text-sm mt-1 leading-relaxed" data-testid="text-flu-desc">{content.futureLandUse?.description || "—"}</p>
          </div>
        </CardContent>
      </Card>

      {content.overlays?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Overlay Districts & Special Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {content.overlays.map((overlay, i) => (
                <Badge key={i} variant="secondary" data-testid={`badge-overlay-${i}`}>
                  {overlay}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PermittedUsesSection({ content }: { content: AnalysisContent }) {
  const uses = content.permittedUses;
  if (!uses) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4 text-green-500" />
            Permitted As-of-Right
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UsesList items={uses.asOfRight} color="green" testPrefix="use-right" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gavel className="h-4 w-4 text-amber-500" />
            Conditional Use
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UsesList items={uses.conditionalUse} color="amber" testPrefix="use-conditional" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4 text-red-500" />
            Prohibited
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UsesList items={uses.prohibited} color="red" testPrefix="use-prohibited" />
        </CardContent>
      </Card>
    </div>
  );
}

function UsesList({ items, color, testPrefix }: { items: string[]; color: string; testPrefix: string }) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-muted-foreground">None specified</p>;
  }
  const colorMap: Record<string, string> = {
    green: "bg-green-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm" data-testid={`${testPrefix}-${i}`}>
          <span className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${colorMap[color]}`} />
          {item}
        </li>
      ))}
    </ul>
  );
}

function DevelopmentStandardsSection({ content }: { content: AnalysisContent }) {
  const standards = content.developmentStandards;
  if (!standards) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Building Envelope
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Maximum Height" value={standards.maxHeight || "—"} testId="text-std-height" />
            <InfoRow label="Floor Area Ratio (FAR)" value={standards.far || "—"} testId="text-std-far" />
            <InfoRow label="Lot Coverage" value={standards.lotCoverage || "—"} testId="text-std-coverage" />
            <InfoRow label="Open Space" value={standards.openSpace || "—"} testId="text-std-openspace" />
            <InfoRow label="Density" value={standards.density || "—"} testId="text-std-density" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              Setbacks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Front" value={standards.setbacks?.front || "—"} testId="text-setback-front" />
            <InfoRow label="Rear" value={standards.setbacks?.rear || "—"} testId="text-setback-rear" />
            <InfoRow label="Side" value={standards.setbacks?.side || "—"} testId="text-setback-side" />
            <InfoRow label="Side Street" value={standards.setbacks?.sideStreet || "—"} testId="text-setback-sidestreet" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Warehouse className="h-4 w-4" />
            Parking Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed" data-testid="text-std-parking">{standards.parking || "Not specified"}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function DevelopmentPotentialSection({ content }: { content: AnalysisContent }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Development Potential
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed" data-testid="text-dev-potential">{content.developmentPotential || "No analysis available."}</p>
        </CardContent>
      </Card>

      {content.platInfo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Plat Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed" data-testid="text-plat-info">{content.platInfo}</p>
          </CardContent>
        </Card>
      )}

      {content.impactFees && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Impact Fees & Concurrency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed" data-testid="text-impact-fees">{content.impactFees}</p>
          </CardContent>
        </Card>
      )}

      {content.regulatoryNotes?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Gavel className="h-4 w-4" />
              Regulatory Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {content.regulatoryNotes.map((note, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" data-testid={`text-reg-note-${i}`}>
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 bg-amber-500" />
                  {note}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DocumentSummariesSection({ summaries }: { summaries: DocumentSummary[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        The following zoning and land use documents were found in the deal file and have been summarized.
      </p>
      {summaries.map((doc) => {
        const isExpanded = expanded[doc.documentId] ?? true;
        return (
          <Card key={doc.documentId}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {doc.fileName || "Untitled Document"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setExpanded(prev => ({ ...prev, [doc.documentId]: !isExpanded }))}
                  data-testid={`button-toggle-doc-${doc.documentId}`}
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent>
                <ScrollArea className="max-h-96">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid={`text-doc-summary-${doc.documentId}`}>
                    {doc.summary}
                  </p>
                </ScrollArea>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function InfoRow({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex-shrink-0">{label}</span>
      <span className="text-sm text-right" data-testid={testId}>{value}</span>
    </div>
  );
}
