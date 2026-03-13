import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield, CheckCircle2, XCircle, AlertTriangle, Clock, Search,
  Activity, Filter
} from "lucide-react";

type ComplianceCheck = {
  check: {
    id: string;
    transactionId: string;
    signerId: string | null;
    checkType: string;
    result: string;
    score: number | null;
    provider: string | null;
    performedAt: string;
    details: Record<string, unknown>;
  };
  transactionTitle: string;
  signerName: string | null;
};

type DashboardData = {
  checks: ComplianceCheck[];
  summary: {
    total: number;
    pass: number;
    fail: number;
    pending: number;
    reviewRequired: number;
    byType: Record<string, number>;
  };
};

const checkTypeLabels: Record<string, string> = {
  ofac: "OFAC Screening",
  aml: "Anti-Money Laundering",
  pep: "PEP Check",
  kba: "Knowledge-Based Auth",
  credential_analysis: "Credential Analysis",
  liveness: "Liveness Check",
  biometric_match: "Biometric Match",
  geolocation: "Geolocation",
  device_check: "Device Check",
  corporate_authority: "Corporate Authority",
};

const resultColors: Record<string, string> = {
  pass: "bg-green-500/20 text-green-500",
  fail: "bg-red-500/20 text-red-500",
  pending: "bg-yellow-500/20 text-yellow-500",
  review_required: "bg-orange-500/20 text-orange-500",
  error: "bg-red-500/20 text-red-500",
  not_applicable: "bg-gray-500/20 text-gray-400",
};

const resultIcons: Record<string, typeof CheckCircle2> = {
  pass: CheckCircle2,
  fail: XCircle,
  pending: Clock,
  review_required: AlertTriangle,
  error: XCircle,
  not_applicable: Activity,
};

export default function RonComplianceDashboard() {
  const [checkTypeFilter, setCheckTypeFilter] = useState<string>("all");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const queryParams = new URLSearchParams();
  if (checkTypeFilter !== "all") queryParams.set("checkType", checkTypeFilter);
  if (resultFilter !== "all") queryParams.set("result", resultFilter);
  const queryString = queryParams.toString();

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/ron/compliance/dashboard", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/ron/compliance/dashboard${queryString ? `?${queryString}` : ""}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const summary = data?.summary;
  const checks = (data?.checks || []).filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.transactionTitle.toLowerCase().includes(q) ||
      (c.signerName && c.signerName.toLowerCase().includes(q)) ||
      c.check.checkType.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-compliance-title">Compliance Dashboard</h1>
        <p className="text-sm text-muted-foreground">Monitor identity verification and compliance checks across all RON transactions</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-checks">{summary.total}</p>
                  <p className="text-xs text-muted-foreground">Total Checks</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-green-500" data-testid="text-passed-checks">{summary.pass}</p>
                  <p className="text-xs text-muted-foreground">Passed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold text-red-500" data-testid="text-failed-checks">{summary.fail}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold text-yellow-500" data-testid="text-pending-checks">{summary.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold text-orange-500" data-testid="text-review-checks">{summary.reviewRequired}</p>
                  <p className="text-xs text-muted-foreground">Review Required</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {summary && Object.keys(summary.byType).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Checks by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(summary.byType).map(([type, count]) => (
                <div key={type} className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary">{checkTypeLabels[type] || type}</Badge>
                  <span className="font-mono">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by transaction, signer, or check type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-compliance-search"
          />
        </div>
        <Select value={checkTypeFilter} onValueChange={setCheckTypeFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-check-type-filter">
            <Filter className="h-4 w-4 mr-1" />
            <SelectValue placeholder="Check Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="ofac">OFAC</SelectItem>
            <SelectItem value="aml">AML</SelectItem>
            <SelectItem value="kba">KBA</SelectItem>
            <SelectItem value="credential_analysis">Credential</SelectItem>
            <SelectItem value="liveness">Liveness</SelectItem>
            <SelectItem value="biometric_match">Biometric</SelectItem>
            <SelectItem value="geolocation">Geolocation</SelectItem>
            <SelectItem value="device_check">Device</SelectItem>
          </SelectContent>
        </Select>
        <Select value={resultFilter} onValueChange={setResultFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-result-filter">
            <SelectValue placeholder="Result" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Results</SelectItem>
            <SelectItem value="pass">Pass</SelectItem>
            <SelectItem value="fail">Fail</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="review_required">Review Required</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <ScrollArea className="max-h-[600px]">
          <div className="divide-y">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4"><Skeleton className="h-12" /></div>
              ))
            ) : checks.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Shield className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No compliance checks found</p>
              </div>
            ) : (
              checks.map((item) => {
                const ResultIcon = resultIcons[item.check.result] || Activity;
                return (
                  <div key={item.check.id} className="p-4 flex items-center gap-4 flex-wrap" data-testid={`compliance-check-${item.check.id}`}>
                    <Badge className={`${resultColors[item.check.result] || ""} min-w-[80px] justify-center`}>
                      <ResultIcon className="h-3 w-3 mr-1" />
                      {item.check.result.replace(/_/g, " ")}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{checkTypeLabels[item.check.checkType] || item.check.checkType}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.transactionTitle}
                        {item.signerName && ` — ${item.signerName}`}
                      </p>
                    </div>
                    {item.check.score !== null && (
                      <span className="text-sm font-mono" data-testid={`text-score-${item.check.id}`}>
                        Score: {item.check.score}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(item.check.performedAt).toLocaleString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
