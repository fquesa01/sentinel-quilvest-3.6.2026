import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, DollarSign, Percent, BarChart3, FileText, ExternalLink, PieChart, Users, Lightbulb } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface FinancialModelPanelProps {
  model: any;
  dealId?: string;
}

function formatNumber(val: number | null | undefined): string {
  if (val == null) return "—";
  const dollars = val * 1000;
  const abs = Math.abs(dollars);
  if (abs >= 1_000_000_000) return `$${(dollars / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(dollars / 1_000).toFixed(0)}K`;
  return `$${dollars.toFixed(0)}`;
}

function detectScale(projections: any[]): number {
  if (!projections || projections.length === 0) return 1;
  const revenues = projections.map((p: any) => Math.abs(p.revenue || 0)).filter((v: number) => v > 0);
  if (revenues.length === 0) return 1;
  const median = revenues.sort((a: number, b: number) => a - b)[Math.floor(revenues.length / 2)];

  for (const p of projections) {
    const rev = Math.abs(p.revenue || 0);
    const margin = p.ebitdaMargin ?? p.grossMargin;
    const ebitda = Math.abs(p.ebitda || 0);
    if (rev > 0 && margin != null && margin > 0 && margin < 100 && ebitda > 0) {
      const impliedEbitda = rev * (margin / 100);
      const ratio = ebitda / impliedEbitda;
      if (ratio > 500) return 1000;
    }
  }

  if (median > 5_000_000) return 1000;
  return 1;
}

function normalizeValue(val: number | null | undefined, scale: number): number | null | undefined {
  if (val == null) return val;
  return val / scale;
}

function formatPercent(val: number | null | undefined): string {
  if (val == null) return "—";
  return `${val.toFixed(1)}%`;
}

export function FinancialModelPanel({ model, dealId }: FinancialModelPanelProps) {
  const [scenario, setScenario] = useState<"base" | "upside" | "downside">("base");

  const { data: sourceDocuments = [] } = useQuery<any[]>({
    queryKey: ["/api/deals", dealId, "source-documents"],
    enabled: !!dealId,
  });

  if (!model) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No financial model available. Generate a memo first.
        </CardContent>
      </Card>
    );
  }

  const scenarios = model.scenarios || {};
  const currentScenario = scenarios[scenario] || scenarios.base;
  const rawProjections = currentScenario?.projections || [];
  const rawValuation = currentScenario?.valuation || {};
  const assumptions = model.assumptions || {};
  const rawTechValue = model.techValueCreation || {};

  const scale = detectScale(rawProjections);
  const monetaryKeys = ["revenue", "cogs", "grossProfit", "operatingExpenses", "ebitda", "depreciation", "ebit", "taxes", "nopat", "capex", "changeInWC", "freeCashFlow"];
  const projections = rawProjections.map((p: any) => {
    const norm = { ...p };
    for (const k of monetaryKeys) {
      if (typeof norm[k] === "number") norm[k] = norm[k] / scale;
    }
    return norm;
  });

  const valuation = JSON.parse(JSON.stringify(rawValuation));
  if (scale > 1) {
    if (valuation.dcf) {
      for (const f of ["terminalValue", "enterpriseValue", "equityValue", "npvProjections", "npvTerminalValue"]) {
        if (typeof valuation.dcf[f] === "number") valuation.dcf[f] = valuation.dcf[f] / scale;
      }
    }
    if (valuation.lbo) {
      for (const f of ["entryDebt", "exitEbitda", "totalSources", "exitEquityValue", "entryEquityValue", "exitEnterpriseValue", "equityCheck", "debtPaydown"]) {
        if (typeof valuation.lbo[f] === "number") valuation.lbo[f] = valuation.lbo[f] / scale;
      }
    }
    if (valuation.comparableTransactions?.impliedValuationRange) {
      for (const f of ["low", "mid", "high"]) {
        if (typeof valuation.comparableTransactions.impliedValuationRange[f] === "number")
          valuation.comparableTransactions.impliedValuationRange[f] = valuation.comparableTransactions.impliedValuationRange[f] / scale;
      }
    }
  }

  const techValue = { ...rawTechValue };
  if (scale > 1) {
    for (const f of ["year1", "year2", "year3"]) {
      if (typeof techValue[f] === "number") techValue[f] = techValue[f] / scale;
    }
  }

  const output = model.output || {};
  const revenueBreakdown = output.revenueBreakdown || [];
  const expenseDetail = output.expenseDetail || [];
  const staffingSummary = output.staffingSummary || null;
  const detailedAssumptions = output.detailedAssumptions || [];

  return (
    <div className="space-y-6">
      {/* Scenario Toggle */}
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">Financial Model</h2>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(["base", "upside", "downside"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                scenario === s ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Valuation Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {valuation.dcf && (
          <>
            <MetricCard
              label="Enterprise Value (DCF)"
              value={formatNumber(valuation.dcf.enterpriseValue)}
              sublabel={`WACC: ${formatPercent(valuation.dcf.discountRate || valuation.dcf.wacc)}`}
              icon={DollarSign}
            />
            <MetricCard
              label="EV / Revenue"
              value={`${valuation.dcf.impliedEvRevenue?.toFixed(1) ?? valuation.dcf.impliedEvRevenue2026?.toFixed(1) ?? "—"}x`}
              icon={BarChart3}
            />
            <MetricCard
              label="EV / EBITDA"
              value={`${valuation.dcf.impliedEvEbitda?.toFixed(1) ?? valuation.dcf.impliedEvEbitda2026?.toFixed(1) ?? "—"}x`}
              icon={BarChart3}
            />
          </>
        )}
        {valuation.lbo && (
          <>
            <MetricCard
              label="IRR"
              value={formatPercent(valuation.lbo.irr)}
              sublabel={`MOIC: ${valuation.lbo.moic?.toFixed(1) || "—"}x`}
              icon={TrendingUp}
              highlight={valuation.lbo.irr > 20}
            />
          </>
        )}
        {valuation.comparableTransactions && (
          <MetricCard
            label="Comps Implied Value"
            value={formatNumber(valuation.comparableTransactions.impliedValuationRange?.mid)}
            sublabel={`Range: ${formatNumber(valuation.comparableTransactions.impliedValuationRange?.low)} - ${formatNumber(valuation.comparableTransactions.impliedValuationRange?.high)}`}
            icon={BarChart3}
          />
        )}
      </div>

      {/* Projections Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {scenario.charAt(0).toUpperCase() + scenario.slice(1)} Case Projections ($000s)
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background">Metric</TableHead>
                {projections.map((p: any) => (
                  <TableHead key={p.year} className="text-right">{p.year}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <ProjectionRow label="Revenue" projections={projections} field="revenue" format="number" />
              <ProjectionRow label="Revenue Growth" projections={projections} field="revenueGrowth" format="percent" />
              <ProjectionRow label="Gross Profit" projections={projections} field="grossProfit" format="number" />
              <ProjectionRow label="Gross Margin" projections={projections} field="grossMargin" format="percent" />
              <ProjectionRow label="EBITDA" projections={projections} field="ebitda" format="number" highlight />
              <ProjectionRow label="EBITDA Margin" projections={projections} field="ebitdaMargin" format="percent" highlight />
              <ProjectionRow label="EBIT" projections={projections} field="ebit" format="number" />
              <ProjectionRow label="CapEx" projections={projections} field="capex" format="number" />
              <ProjectionRow label="Free Cash Flow" projections={projections} field="freeCashFlow" format="number" highlight />
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Revenue Breakdown by Segment */}
      {revenueBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Revenue Breakdown by Segment ($000s)
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background">Segment</TableHead>
                  {revenueBreakdown[0]?.values?.map((v: any) => (
                    <TableHead key={v.year} className="text-right">{v.year}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueBreakdown.map((seg: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="sticky left-0 bg-background font-medium">{seg.segment}</TableCell>
                    {seg.values?.map((v: any, j: number) => (
                      <TableCell key={j} className="text-right tabular-nums">
                        <div>{formatNumber(v.revenue)}</div>
                        {v.growthRate != null && (
                          <div className="text-xs text-muted-foreground">{formatPercent(v.growthRate)}</div>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Expense Breakdown by Category */}
      {expenseDetail.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Expense Breakdown by Category ($000s)
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background">Category</TableHead>
                  <TableHead>Type</TableHead>
                  {expenseDetail[0]?.values?.map((v: any) => (
                    <TableHead key={v.year} className="text-right">{v.year}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseDetail.map((exp: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="sticky left-0 bg-background font-medium">{exp.category}</TableCell>
                    <TableCell>
                      <Badge variant={exp.type === "cogs" ? "secondary" : "outline"} data-testid={`badge-expense-type-${i}`}>
                        {exp.type === "cogs" ? "COGS" : "OpEx"}
                      </Badge>
                    </TableCell>
                    {exp.values?.map((v: any, j: number) => (
                      <TableCell key={j} className="text-right tabular-nums">
                        {formatNumber(v.amount)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Staffing Summary */}
      {staffingSummary?.departments?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Staffing Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background">Department</TableHead>
                  <TableHead>Type</TableHead>
                  {staffingSummary.departments[0]?.values?.map((v: any) => (
                    <TableHead key={v.year} className="text-right" colSpan={2}>{v.year}</TableHead>
                  ))}
                </TableRow>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background"></TableHead>
                  <TableHead></TableHead>
                  {staffingSummary.departments[0]?.values?.flatMap((_: any, j: number) => [
                    <TableHead key={`hc-${j}`} className="text-right text-xs">HC</TableHead>,
                    <TableHead key={`cost-${j}`} className="text-right text-xs">Cost ($K)</TableHead>,
                  ])}
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffingSummary.departments.map((dept: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="sticky left-0 bg-background font-medium">{dept.name}</TableCell>
                    <TableCell>
                      <Badge variant={dept.type === "cogs" ? "secondary" : "outline"} data-testid={`badge-staff-type-${i}`}>
                        {dept.type === "cogs" ? "COGS" : "Expense"}
                      </Badge>
                    </TableCell>
                    {dept.values?.flatMap((v: any, j: number) => [
                      <TableCell key={`hc-${j}`} className="text-right tabular-nums">{v.headcount}</TableCell>,
                      <TableCell key={`cost-${j}`} className="text-right tabular-nums">{formatNumber(v.totalCost)}</TableCell>,
                    ])}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Detailed Assumptions */}
      {detailedAssumptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Detailed Model Assumptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {detailedAssumptions.map((group: any, i: number) => (
                <div key={i}>
                  <h4 className="text-sm font-semibold mb-2">{group.category}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                    {group.items?.map((item: any, j: number) => (
                      <div key={j} className="flex items-baseline justify-between gap-2 py-1 border-b border-border/50">
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium tabular-nums">{item.value}</span>
                          {item.source && (
                            <Badge variant="outline" className="text-[10px] px-1.5" data-testid={`badge-assumption-source-${i}-${j}`}>
                              {item.source}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tech Value Creation */}
      {techValue.year1 > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Platform Synergy Value Creation ($000s)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{formatNumber(techValue.year1)}</p>
                <p className="text-sm text-muted-foreground">Year 1</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{formatNumber(techValue.year2)}</p>
                <p className="text-sm text-muted-foreground">Year 2</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{formatNumber(techValue.year3)}</p>
                <p className="text-sm text-muted-foreground">Year 3</p>
              </div>
            </div>
            {techValue.synergies?.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Synergy</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-right">Timeline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {techValue.synergies.map((s: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell>{s.name}</TableCell>
                      <TableCell className="text-right">{s.value}/10</TableCell>
                      <TableCell className="text-right">{s.timeline}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Key Assumptions (basic view when no detailed assumptions available) */}
      {detailedAssumptions.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key Assumptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {assumptions.taxRate != null && (
                <div><span className="text-muted-foreground">Tax Rate:</span> {formatPercent(assumptions.taxRate)}</div>
              )}
              {assumptions.discountRate != null && (
                <div><span className="text-muted-foreground">Discount Rate (WACC):</span> {formatPercent(assumptions.discountRate)}</div>
              )}
              {assumptions.terminalGrowth != null && (
                <div><span className="text-muted-foreground">Terminal Growth:</span> {formatPercent(assumptions.terminalGrowth)}</div>
              )}
              {assumptions.capexPercent != null && (
                <div><span className="text-muted-foreground">CapEx % Revenue:</span> {formatPercent(assumptions.capexPercent)}</div>
              )}
              {assumptions.wcPercent != null && (
                <div><span className="text-muted-foreground">WC % Revenue:</span> {formatPercent(assumptions.wcPercent)}</div>
              )}
              {assumptions.entryMultiple != null && (
                <div><span className="text-muted-foreground">Entry Multiple:</span> {assumptions.entryMultiple}x</div>
              )}
              {assumptions.exitMultiple != null && (
                <div><span className="text-muted-foreground">Exit Multiple:</span> {assumptions.exitMultiple}x</div>
              )}
              {assumptions.debtToEquity != null && (
                <div><span className="text-muted-foreground">D/E Ratio:</span> {assumptions.debtToEquity}x</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {sourceDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Source Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              The following data room documents were used to generate this financial model.
            </p>
            <div className="space-y-2">
              {sourceDocuments.map((doc: any) => (
                <a
                  key={doc.id}
                  href={`/api/data-room-documents/${doc.id}/preview`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2 rounded-md hover-elevate group"
                  data-testid={`link-source-doc-${doc.id}`}
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">{doc.fileName}</span>
                    {doc.documentCategory && (
                      <span className="text-xs text-muted-foreground">{doc.documentCategory}</span>
                    )}
                  </div>
                  <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 invisible group-hover:visible" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({
  label, value, sublabel, icon: Icon, highlight,
}: {
  label: string; value: string; sublabel?: string; icon: any; highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/50" : ""}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className={`text-xl font-bold ${highlight ? "text-primary" : ""}`}>{value}</p>
        {sublabel && <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}

function ProjectionRow({
  label, projections, field, format: fmt, highlight,
}: {
  label: string; projections: any[]; field: string; format: "number" | "percent"; highlight?: boolean;
}) {
  return (
    <TableRow className={highlight ? "font-medium bg-muted/30" : ""}>
      <TableCell className="sticky left-0 bg-background">{label}</TableCell>
      {projections.map((p: any, i: number) => (
        <TableCell key={i} className="text-right tabular-nums">
          {fmt === "percent" ? formatPercent(p[field]) : formatNumber(p[field])}
        </TableCell>
      ))}
    </TableRow>
  );
}
