import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  Building2, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  TrendingDown,
  UserPlus,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonStats {
  email: string;
  name?: string;
  totalMessages: number;
  sentCount: number;
  receivedCount: number;
  uniqueContacts: number;
  externalRatio: number;
  engagementScore: number;
  crossDomainRiskScore: number;
  afterHoursRatio: number;
}

interface DomainStats {
  domain: string;
  messageCount: number;
  uniquePeople: number;
}

interface AnomalyRecord {
  entity: string;
  entityType: "person" | "domain";
  month: string;
  volume: number;
  previousVolume: number;
  percentChange: number;
  isAnomaly: boolean;
}

interface InsightsSummary {
  topCommunicators: PersonStats[];
  topExternalDomains: DomainStats[];
  topAnomalies: AnomalyRecord[];
  afterHoursPercentage: number;
  totalMessages: number;
  uniqueParticipants: number;
  dateRange: { from: string | null; to: string | null };
}

interface InsightsPanelProps {
  insights: InsightsSummary | null;
  loading?: boolean;
  onPersonClick?: (email: string) => void;
  onDomainClick?: (domain: string) => void;
  onAddAsParty?: (email: string, name?: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function InsightsPanel({
  insights,
  loading = false,
  onPersonClick,
  onDomainClick,
  onAddAsParty,
  collapsed = false,
  onToggleCollapse,
}: InsightsPanelProps) {
  if (collapsed) {
    return (
      <Card className="h-full flex flex-col items-center py-3 px-1 min-w-[3rem]">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="mb-3 h-8 w-8"
          data-testid="button-expand-insights"
          title="Show Insights"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground rotate-180 [writing-mode:vertical-lr]">
              Insights
            </span>
          </div>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-lg">Insights</CardTitle>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onToggleCollapse}
              data-testid="button-collapse-insights"
              title="Hide Insights"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground">Loading insights...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-lg">Insights</CardTitle>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onToggleCollapse}
              data-testid="button-collapse-insights"
              title="Hide Insights"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No insights available
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  
  const getEmailName = (email: string): string => {
    const atIndex = email.indexOf("@");
    if (atIndex > 0) {
      return email.slice(0, atIndex)
        .replace(/[._-]/g, " ")
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
    return email;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Insights
          </CardTitle>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onToggleCollapse}
              data-testid="button-collapse-insights"
              title="Hide Insights"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {insights.totalMessages.toLocaleString()} messages from {insights.uniqueParticipants.toLocaleString()} participants
        </div>
      </CardHeader>
      
      <ScrollArea className="flex-1">
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Clock className="h-4 w-4 text-orange-500" />
            <span className="text-sm">After-hours activity:</span>
            <Badge 
              variant={insights.afterHoursPercentage > 20 ? "destructive" : "secondary"}
              className="ml-auto"
            >
              {formatPercentage(insights.afterHoursPercentage)}
            </Badge>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-blue-500" />
              Top Communicators
            </h4>
            <div className="space-y-2">
              {insights.topCommunicators.slice(0, 5).map((person, idx) => (
                <div
                  key={person.email}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => onPersonClick?.(person.email)}
                      className="text-sm font-medium truncate block text-left hover:text-primary transition-colors"
                      data-testid={`insight-person-${idx}`}
                    >
                      {getEmailName(person.email)}
                    </button>
                    <div className="text-xs text-muted-foreground">
                      {person.totalMessages.toLocaleString()} msgs • {person.uniqueContacts} contacts
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {person.crossDomainRiskScore > 50 && (
                      <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/30">
                        Risk
                      </Badge>
                    )}
                    {onAddAsParty && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onAddAsParty(person.email, getEmailName(person.email))}
                        title="Add as Party"
                      >
                        <UserPlus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4 text-purple-500" />
              Top External Domains
            </h4>
            <div className="space-y-2">
              {insights.topExternalDomains.slice(0, 5).map((domain, idx) => (
                <div
                  key={domain.domain}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => onDomainClick?.(domain.domain)}
                      className="text-sm font-medium truncate block text-left hover:text-primary transition-colors"
                      data-testid={`insight-domain-${idx}`}
                    >
                      {domain.domain}
                    </button>
                    <div className="text-xs text-muted-foreground">
                      {domain.messageCount.toLocaleString()} msgs • {domain.uniquePeople} people
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onDomainClick?.(domain.domain)}
                    title="View domain communications"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {insights.topAnomalies.length > 0 && (
            <>
              <Separator />

              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Notable Changes
                </h4>
                <div className="space-y-2">
                  {insights.topAnomalies.slice(0, 5).map((anomaly, idx) => {
                    const isIncrease = anomaly.percentChange > 0;
                    return (
                      <div
                        key={`${anomaly.entity}-${anomaly.month}`}
                        className="flex items-center gap-2 p-2 rounded-md bg-red-500/5 border border-red-500/20"
                      >
                        {isIncrease ? (
                          <TrendingUp className="h-4 w-4 text-red-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-blue-500" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {getEmailName(anomaly.entity)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {anomaly.month}: {anomaly.previousVolume} → {anomaly.volume}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            isIncrease ? "text-red-600 border-red-500/30" : "text-blue-600 border-blue-500/30"
                          )}
                        >
                          {isIncrease ? "+" : ""}{anomaly.percentChange.toFixed(0)}%
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
