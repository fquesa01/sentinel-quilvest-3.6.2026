import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, DollarSign, Percent, BarChart3 } from "lucide-react";
import { useState } from "react";

interface FinancialModelPanelProps {
  model: any;
}

function formatNumber(val: number | null | undefined): string {
  if (val == null) return "—";
  if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}B`;
  if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(1)}M`;
  return `$${val.toFixed(0)}K`;
}

function formatPercent(val: number | null | undefined): string {
  if (val == null) return "—";
  return `${val.toFixed(1)}%`;
}

export function FinancialModelPanel({ model }: FinancialModelPanelProps) {
  const [scenario, setScenario] = useState<"base" | "upside" | "downside">("base");

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
  const projections = currentScenario?.projections || [];
  const valuation = currentScenario?.valuation || {};
  const assumptions = model.assumptions || {};
  const techValue = model.techValueCreation || {};

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
              sublabel={`WACC: ${formatPercent(valuation.dcf.wacc)}`}
              icon={DollarSign}
            />
            <MetricCard
              label="EV / Revenue"
              value={`${valuation.dcf.impliedEvRevenue?.toFixed(1) || "—"}x`}
              icon={BarChart3}
            />
            <MetricCard
              label="EV / EBITDA"
              value={`${valuation.dcf.impliedEvEbitda?.toFixed(1) || "—"}x`}
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

      {/* Key Assumptions */}
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
