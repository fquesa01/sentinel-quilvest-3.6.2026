import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import { financialModels } from "@shared/schema";
import type { ExtractionResult, FiscalYearData } from "./financial-extraction-service";
import type { IndustryResearch } from "./industry-research-service";
import type { TechAssessment } from "./tech-innovation-assessment-service";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

export interface ProjectionYear {
  year: string;
  revenue: number;
  revenueGrowth: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: number;
  ebitda: number;
  ebitdaMargin: number;
  depreciation: number;
  ebit: number;
  taxes: number;
  nopat: number;
  capex: number;
  changeInWC: number;
  freeCashFlow: number;
}

export interface ValuationOutput {
  dcf: {
    wacc: number;
    terminalGrowth: number;
    terminalValue: number;
    enterpriseValue: number;
    equityValue: number;
    impliedEvRevenue: number;
    impliedEvEbitda: number;
  } | null;
  comparableTransactions: {
    medianEvRevenue: number | null;
    medianEvEbitda: number | null;
    impliedValuationRange: { low: number; mid: number; high: number };
  } | null;
  lbo: {
    entryMultiple: number;
    exitMultiple: number;
    holdPeriod: number;
    irr: number;
    moic: number;
    equityCheck: number;
    debtPaydown: number;
  } | null;
}

export interface SensitivityCell {
  rowLabel: string;
  colLabel: string;
  value: number;
}

export interface FinancialModelOutput {
  assumptions: Record<string, any>;
  scenarios: {
    base: { projections: ProjectionYear[]; valuation: ValuationOutput };
    upside: { projections: ProjectionYear[]; valuation: ValuationOutput };
    downside: { projections: ProjectionYear[]; valuation: ValuationOutput };
  };
  sensitivityTable: SensitivityCell[];
  techValueCreation: {
    year1: number;
    year2: number;
    year3: number;
    synergies: Array<{ name: string; value: number; timeline: string }>;
  };
}

export async function buildFinancialModel(
  extraction: ExtractionResult,
  industryResearch: IndustryResearch | null,
  techAssessment: TechAssessment | null,
  dealContext: { dealName: string; sector: string; dealType: string }
): Promise<FinancialModelOutput> {
  console.log(`[FinModel] Building model for ${dealContext.dealName}`);

  const historicals = extraction.incomeStatements;
  const balanceSheets = extraction.balanceSheets;
  const cashFlows = extraction.cashFlows;

  const marketGrowth = industryResearch?.marketOverview.growthRate;
  const compTransactions = industryResearch?.recentTransactions || [];

  const techValue = techAssessment?.valueCreationEstimate || { year1: 0, year2: 0, year3: 0, total3Year: 0 };
  const techSynergies = [
    ...(techAssessment?.sentinelSynergies || []),
    ...(techAssessment?.ticketToroSynergies || []),
  ].filter((s) => s.applicabilityScore >= 6);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 16000,
    system: `You are a senior PE financial modeler. Build a complete 5-year projection model with three scenarios, DCF valuation, and sensitivity analysis.

Use the following methodology:
1. Analyze historical financials to derive growth rates and margin trends
2. Build revenue projections using segment/cohort analysis where data allows, otherwise top-down
3. Model expenses as % of revenue with realistic operating leverage
4. Calculate FCF from NOPAT + D&A - CapEx - Change in WC
5. Perform DCF with appropriate WACC for the sector
6. If comparable transactions are available, calculate transaction comps valuation
7. For PE deals, build an LBO model with leverage assumptions
8. Include technology value creation from platform synergies in the upside case

All values in thousands ($000s).
Market growth rate: ${marketGrowth ? `${marketGrowth}%` : "Use sector benchmarks"}
Deal type: ${dealContext.dealType}`,
    messages: [
      {
        role: "user",
        content: `Build the financial model:

Historical P&L: ${JSON.stringify(historicals)}
Balance Sheets: ${JSON.stringify(balanceSheets)}
Cash Flows: ${JSON.stringify(cashFlows)}
KPIs: ${JSON.stringify(extraction.kpis)}
Deal Terms: ${JSON.stringify(extraction.dealTerms)}
Customer Concentration: ${JSON.stringify(extraction.customerConcentration)}

Comparable Transactions:
${compTransactions.map((t) => `${t.buyer} acquired ${t.target} for ${t.dealSize || "undisclosed"} (EV/Rev: ${t.evRevenue || "N/A"}, EV/EBITDA: ${t.evEbitda || "N/A"})`).join("\n")}

Tech synergy value creation: Year 1: $${techValue.year1}K, Year 2: $${techValue.year2}K, Year 3: $${techValue.year3}K
Key synergies: ${techSynergies.map((s) => `${s.capability}: ${s.estimatedRevenueImpact} revenue, ${s.estimatedCostSavings} savings`).join("; ")}`,
      },
    ],
    tools: [
      {
        name: "build_model",
        description: "Output the complete financial model",
        input_schema: {
          type: "object" as const,
          properties: {
            assumptions: {
              type: "object" as const,
              properties: {
                revenueGrowthRates: { type: "object" as const },
                marginAssumptions: { type: "object" as const },
                capexPercent: { type: "number" as const },
                wcPercent: { type: "number" as const },
                taxRate: { type: "number" as const },
                discountRate: { type: "number" as const },
                terminalGrowth: { type: "number" as const },
                entryMultiple: { type: "number" as const },
                exitMultiple: { type: "number" as const },
                debtToEquity: { type: "number" as const },
                interestRate: { type: "number" as const },
              },
              required: ["revenueGrowthRates", "marginAssumptions", "capexPercent", "wcPercent", "taxRate", "discountRate", "terminalGrowth"],
            },
            baseProjections: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  year: { type: "string" as const },
                  revenue: { type: "number" as const },
                  revenueGrowth: { type: "number" as const },
                  cogs: { type: "number" as const },
                  grossProfit: { type: "number" as const },
                  grossMargin: { type: "number" as const },
                  operatingExpenses: { type: "number" as const },
                  ebitda: { type: "number" as const },
                  ebitdaMargin: { type: "number" as const },
                  depreciation: { type: "number" as const },
                  ebit: { type: "number" as const },
                  taxes: { type: "number" as const },
                  nopat: { type: "number" as const },
                  capex: { type: "number" as const },
                  changeInWC: { type: "number" as const },
                  freeCashFlow: { type: "number" as const },
                },
                required: ["year", "revenue", "revenueGrowth", "ebitda", "ebitdaMargin", "freeCashFlow"],
              },
            },
            upsideProjections: { type: "array" as const, items: { type: "object" as const } },
            downsideProjections: { type: "array" as const, items: { type: "object" as const } },
            baseValuation: {
              type: "object" as const,
              properties: {
                dcf: { type: ["object", "null"] as any },
                comparableTransactions: { type: ["object", "null"] as any },
                lbo: { type: ["object", "null"] as any },
              },
            },
            upsideValuation: { type: "object" as const },
            downsideValuation: { type: "object" as const },
            sensitivityTable: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  rowLabel: { type: "string" as const },
                  colLabel: { type: "string" as const },
                  value: { type: "number" as const },
                },
                required: ["rowLabel", "colLabel", "value"],
              },
            },
          },
          required: ["assumptions", "baseProjections", "upsideProjections", "downsideProjections", "baseValuation", "sensitivityTable"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "build_model" },
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Financial model generation failed");
  }

  const raw = toolBlock.input as any;

  const result: FinancialModelOutput = {
    assumptions: raw.assumptions,
    scenarios: {
      base: { projections: raw.baseProjections, valuation: raw.baseValuation },
      upside: { projections: raw.upsideProjections || raw.baseProjections, valuation: raw.upsideValuation || raw.baseValuation },
      downside: { projections: raw.downsideProjections || raw.baseProjections, valuation: raw.downsideValuation || raw.baseValuation },
    },
    sensitivityTable: raw.sensitivityTable,
    techValueCreation: {
      year1: techValue.year1,
      year2: techValue.year2,
      year3: techValue.year3,
      synergies: techSynergies.map((s) => ({
        name: s.capability,
        value: s.applicabilityScore,
        timeline: `${s.timelineMonths} months`,
      })),
    },
  };

  console.log(`[FinModel] Model complete: ${result.scenarios.base.projections.length} projection years`);
  return result;
}

export async function persistFinancialModel(
  memoId: string,
  dealId: string,
  model: FinancialModelOutput
): Promise<string> {
  const [inserted] = await db.insert(financialModels).values({
    memoId,
    dealId,
    modelType: "integrated",
    assumptions: model.assumptions as any,
    scenarios: model.scenarios as any,
    output: {
      projections: model.scenarios.base.projections,
      valuation: model.scenarios.base.valuation as any,
      sensitivityTable: model.sensitivityTable.map((s) => [s.value]),
      irr: model.scenarios.base.valuation.lbo?.irr,
      moic: model.scenarios.base.valuation.lbo?.moic,
      impliedValue: {
        dcf: model.scenarios.base.valuation.dcf?.enterpriseValue || 0,
        comps: model.scenarios.base.valuation.comparableTransactions?.impliedValuationRange?.mid || 0,
      },
    },
    techValueCreation: model.techValueCreation as any,
  }).returning();

  return inserted.id;
}
