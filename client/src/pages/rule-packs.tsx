import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Shield, 
  Building2, 
  Pill, 
  Plane, 
  Landmark, 
  Code2, 
  DollarSign, 
  CheckCircle2,
  XCircle,
  Download,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Plus
} from "lucide-react";
import { Link } from "wouter";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type SectorRulePack = {
  id: string;
  packName: string;
  industrySector: string;
  description: string;
  regulatoryBodies: Array<{
    name: string;
    acronym: string;
    jurisdiction: string;
  }>;
  ruleCategories: string[];
  isActive: string;
  version: number;
  effectiveDate: string | null;
  createdAt: string;
};

type DetectionRule = {
  id: string;
  ruleName: string;
  ruleDescription: string;
  detectionType: string;
  violationType: string;
  severity: string;
  riskScore: number;
  isActive: string;
};

const sectorIcons: Record<string, any> = {
  broker_dealer: Landmark,
  investment_advisor: DollarSign,
  life_sciences: Pill,
  pharmaceutical: Pill,
  medical_device: Shield,
  defense_contractor: Shield,
  aerospace: Plane,
  technology: Code2,
  financial_services: Building2,
  general: Shield,
};

const sectorLabels: Record<string, string> = {
  broker_dealer: "Broker-Dealer",
  investment_advisor: "Investment Advisor",
  life_sciences: "Life Sciences",
  pharmaceutical: "Pharmaceutical",
  medical_device: "Medical Device",
  defense_contractor: "Defense Contractor",
  aerospace: "Aerospace",
  technology: "Technology",
  financial_services: "Financial Services",
  general: "General",
};

const severityColors: Record<string, string> = {
  critical: "destructive",
  high: "default",
  medium: "secondary",
  low: "outline",
};

export default function RulePacks() {
  const { toast } = useToast();
  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(new Set());

  const { data: rulePacks, isLoading } = useQuery<SectorRulePack[]>({
    queryKey: ["/api/sector-rule-packs"],
  });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/sector-rule-packs/seed", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sector-rule-packs"] });
      toast({
        title: "Rule Packs Loaded",
        description: "Sector-specific rule packs have been successfully loaded.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const togglePackMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: string }) =>
      apiRequest("PATCH", `/api/sector-rule-packs/${id}`, {
        isActive: isActive === "true" ? "false" : "true",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sector-rule-packs"] });
      toast({
        title: "Status Updated",
        description: "Rule pack status has been updated.",
      });
    },
  });

  const toggleExpanded = (packId: string) => {
    setExpandedPacks((prev) => {
      const next = new Set(prev);
      if (next.has(packId)) {
        next.delete(packId);
      } else {
        next.add(packId);
      }
      return next;
    });
  };

  const activePacks = rulePacks?.filter((p) => p.isActive === "true") || [];
  const inactivePacks = rulePacks?.filter((p) => p.isActive === "false") || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading rule packs...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Sector Rule Packs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Industry-specific compliance monitoring configurations
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/rules/builder">
            <Button variant="default" data-testid="button-create-rule">
              <Plus className="h-4 w-4 mr-2" />
              Create Custom Rule
            </Button>
          </Link>
          {!rulePacks || rulePacks.length === 0 ? (
            <Button
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              variant="outline"
              data-testid="button-seed-packs"
            >
              <Download className="h-4 w-4 mr-2" />
              Load Rule Packs
            </Button>
          ) : null}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {!rulePacks || rulePacks.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Rule Packs Configured</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Load pre-configured industry-specific rule packs to start monitoring for
                    sector-specific compliance violations.
                  </p>
                  <Button
                    onClick={() => seedMutation.mutate()}
                    disabled={seedMutation.isPending}
                    data-testid="button-seed-packs-empty"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Load Rule Packs
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Rule Packs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold" data-testid="text-total-packs">
                      {rulePacks.length}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Active Packs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-green-600" data-testid="text-active-packs">
                      {activePacks.length}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Inactive Packs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-muted-foreground" data-testid="text-inactive-packs">
                      {inactivePacks.length}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Active Rule Packs */}
              {activePacks.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Active Rule Packs</h2>
                  <div className="space-y-4">
                    {activePacks.map((pack) => (
                      <RulePackCard
                        key={pack.id}
                        pack={pack}
                        isExpanded={expandedPacks.has(pack.id)}
                        onToggleExpanded={() => toggleExpanded(pack.id)}
                        onToggleActive={() =>
                          togglePackMutation.mutate({ id: pack.id, isActive: pack.isActive })
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Inactive Rule Packs */}
              {inactivePacks.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Inactive Rule Packs</h2>
                  <div className="space-y-4">
                    {inactivePacks.map((pack) => (
                      <RulePackCard
                        key={pack.id}
                        pack={pack}
                        isExpanded={expandedPacks.has(pack.id)}
                        onToggleExpanded={() => toggleExpanded(pack.id)}
                        onToggleActive={() =>
                          togglePackMutation.mutate({ id: pack.id, isActive: pack.isActive })
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function RulePackCard({
  pack,
  isExpanded,
  onToggleExpanded,
  onToggleActive,
}: {
  pack: SectorRulePack;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onToggleActive: () => void;
}) {
  const Icon = sectorIcons[pack.industrySector] || Shield;
  const isActive = pack.isActive === "true";

  const { data: rules } = useQuery<DetectionRule[]>({
    queryKey: [`/api/sector-rule-packs/${pack.id}/rules`],
    enabled: isExpanded,
  });

  return (
    <Card className={!isActive ? "opacity-60" : ""} data-testid={`card-rule-pack-${pack.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-md bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-lg" data-testid={`text-pack-name-${pack.id}`}>
                  {pack.packName}
                </CardTitle>
                {isActive ? (
                  <Badge variant="default" className="text-xs" data-testid={`badge-active-${pack.id}`}>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs" data-testid={`badge-inactive-${pack.id}`}>
                    <XCircle className="h-3 w-3 mr-1" />
                    Inactive
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  v{pack.version}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {sectorLabels[pack.industrySector] || pack.industrySector}
                </Badge>
              </div>
              <CardDescription className="text-sm">{pack.description}</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={isActive ? "destructive" : "default"}
              size="sm"
              onClick={onToggleActive}
              data-testid={`button-toggle-${pack.id}`}
            >
              {isActive ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between px-6 py-3 h-auto rounded-none border-t"
            data-testid={`button-expand-${pack.id}`}
          >
            <span className="text-sm font-medium">
              {isExpanded ? "Hide Details" : "Show Details"}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-6 space-y-4">
            {/* Regulatory Bodies */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Regulatory Bodies</h4>
              <div className="flex flex-wrap gap-2">
                {pack.regulatoryBodies.map((body, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {body.acronym}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Rule Categories */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Rule Categories</h4>
              <div className="flex flex-wrap gap-2">
                {pack.ruleCategories.map((category, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {category}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Detection Rules */}
            {rules && rules.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3">
                    Detection Rules ({rules.length})
                  </h4>
                  <div className="space-y-3">
                    {rules.map((rule) => (
                      <Card key={rule.id} className="border-l-4 border-l-primary/30">
                        <CardContent className="pt-4 pb-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-medium text-sm">{rule.ruleName}</h5>
                                <Badge
                                  variant={severityColors[rule.severity] as any}
                                  className="text-xs"
                                >
                                  {rule.severity}
                                </Badge>
                                {rule.isActive === "false" && (
                                  <Badge variant="outline" className="text-xs">
                                    Inactive
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">
                                {rule.ruleDescription}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Type: {rule.detectionType.replace(/_/g, " ")}</span>
                                <span>•</span>
                                <span>Violation: {rule.violationType.toUpperCase()}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Risk: {rule.riskScore}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
