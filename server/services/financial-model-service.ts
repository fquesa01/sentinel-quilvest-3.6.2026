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

CRITICAL UNIT INSTRUCTIONS — READ CAREFULLY:
- All monetary values (revenue, EBITDA, capex, FCF, enterprise value, etc.) MUST be in THOUSANDS of US dollars.
- This means: if actual revenue is $50 million, output the number 50000 (fifty thousand).
- If actual revenue is $200 million, output 200000.
- If actual revenue is $1.5 billion, output 1500000.
- Do NOT output raw dollar amounts. A revenue value of 66000000 is WRONG for a $66M company — the correct value is 66000.
- Growth rates and margins should be percentages (e.g., 15.0 for 15%).
- Use calendar years (e.g., "2026", "2027") for projection year labels, not "Year 1", "Year 2".

Market growth rate: ${marketGrowth ? `${marketGrowth}%` : "Use sector benchmarks"}
Deal type: ${dealContext.dealType}`,
    messages: [
      {
        role: "user",
        content: `Build the financial model. REMINDER: All monetary output values MUST be in THOUSANDS ($000s). If revenue is $66 million, output 66000 not 66000000.

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
        description: "Output the complete financial model. ALL monetary values must be in THOUSANDS of dollars ($000s). Example: $50M revenue = 50000, $1.2B = 1200000.",
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
              description: "5-year projections for base case. All monetary fields in $000s.",
              items: {
                type: "object" as const,
                properties: {
                  year: { type: "string" as const, description: "Calendar year e.g. '2026'" },
                  revenue: { type: "number" as const, description: "Revenue in $000s. $50M = 50000" },
                  revenueGrowth: { type: "number" as const, description: "Revenue growth rate as percentage e.g. 15.0" },
                  cogs: { type: "number" as const, description: "Cost of goods sold in $000s" },
                  grossProfit: { type: "number" as const, description: "Gross profit in $000s" },
                  grossMargin: { type: "number" as const, description: "Gross margin as percentage" },
                  operatingExpenses: { type: "number" as const, description: "Operating expenses in $000s" },
                  ebitda: { type: "number" as const, description: "EBITDA in $000s" },
                  ebitdaMargin: { type: "number" as const, description: "EBITDA margin as percentage" },
                  depreciation: { type: "number" as const, description: "Depreciation in $000s" },
                  ebit: { type: "number" as const, description: "EBIT in $000s" },
                  taxes: { type: "number" as const, description: "Taxes in $000s" },
                  nopat: { type: "number" as const, description: "NOPAT in $000s" },
                  capex: { type: "number" as const, description: "Capital expenditures in $000s" },
                  changeInWC: { type: "number" as const, description: "Change in working capital in $000s" },
                  freeCashFlow: { type: "number" as const, description: "Free cash flow in $000s" },
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

  const monetaryFields = ["revenue", "cogs", "grossProfit", "operatingExpenses", "ebitda", "depreciation", "ebit", "taxes", "nopat", "capex", "changeInWC", "freeCashFlow"];

  function detectRawDollars(projections: any[]): boolean {
    if (!projections || projections.length === 0) return false;
    const revenues = projections.map((p: any) => Math.abs(p.revenue || 0)).filter((r: number) => r > 0);
    if (revenues.length === 0) return false;
    const medianRev = revenues.sort((a: number, b: number) => a - b)[Math.floor(revenues.length / 2)];

    for (const p of projections) {
      const rev = Math.abs(p.revenue || 0);
      const margin = p.ebitdaMargin ?? p.grossMargin;
      const ebitda = Math.abs(p.ebitda || 0);
      if (rev > 0 && margin != null && margin > 0 && margin < 100 && ebitda > 0) {
        const impliedEbitda = rev * (margin / 100);
        const ratio = ebitda / impliedEbitda;
        if (ratio > 500) {
          console.log(`[FinModel] Unit mismatch detected via margin cross-check: revenue=${rev}, ebitdaMargin=${margin}%, ebitda=${ebitda}, ratio=${ratio.toFixed(0)}`);
          return true;
        }
      }
    }

    if (medianRev > 5_000_000) {
      console.log(`[FinModel] Likely raw dollars detected: median revenue=${medianRev} (too large for $000s unless >$5B company)`);
      return true;
    }

    return false;
  }

  function scaleDown(projections: any[]): ProjectionYear[] {
    console.log(`[FinModel] Normalizing projections from raw dollars to $000s (dividing by 1000)`);
    return projections.map((p: any) => {
      const normalized = { ...p };
      for (const field of monetaryFields) {
        if (typeof normalized[field] === "number") {
          normalized[field] = Math.round(normalized[field] / 1000);
        }
      }
      return normalized;
    });
  }

  function normalizeProjections(projections: any[]): ProjectionYear[] {
    if (!projections || projections.length === 0) return projections;
    if (detectRawDollars(projections)) {
      return scaleDown(projections);
    }
    return projections;
  }

  function normalizeValuation(val: any, projScaleApplied: boolean): ValuationOutput {
    if (!val) return val;
    const normalized = JSON.parse(JSON.stringify(val));
    const shouldScale = projScaleApplied;

    if (normalized.dcf && shouldScale) {
      console.log(`[FinModel] Normalizing DCF valuation to $000s (EV: ${normalized.dcf.enterpriseValue})`);
      for (const field of ["terminalValue", "enterpriseValue", "equityValue"]) {
        if (typeof normalized.dcf[field] === "number") {
          normalized.dcf[field] = Math.round(normalized.dcf[field] / 1000);
        }
      }
    }
    if (normalized.comparableTransactions?.impliedValuationRange && shouldScale) {
      for (const field of ["low", "mid", "high"]) {
        if (typeof normalized.comparableTransactions.impliedValuationRange[field] === "number") {
          normalized.comparableTransactions.impliedValuationRange[field] = Math.round(normalized.comparableTransactions.impliedValuationRange[field] / 1000);
        }
      }
    }
    if (normalized.lbo && shouldScale) {
      if (typeof normalized.lbo.equityCheck === "number") {
        normalized.lbo.equityCheck = Math.round(normalized.lbo.equityCheck / 1000);
      }
      if (typeof normalized.lbo.debtPaydown === "number") {
        normalized.lbo.debtPaydown = Math.round(normalized.lbo.debtPaydown / 1000);
      }
    }
    return normalized;
  }

  const baseRawDollars = detectRawDollars(raw.baseProjections);
  const baseProj = baseRawDollars ? scaleDown(raw.baseProjections) : raw.baseProjections;

  const upsideRaw = raw.upsideProjections || raw.baseProjections;
  const upsideRawDollars = detectRawDollars(upsideRaw);
  const upsideProj = upsideRawDollars ? scaleDown(upsideRaw) : upsideRaw;

  const downsideRaw = raw.downsideProjections || raw.baseProjections;
  const downsideRawDollars = detectRawDollars(downsideRaw);
  const downsideProj = downsideRawDollars ? scaleDown(downsideRaw) : downsideRaw;

  const result: FinancialModelOutput = {
    assumptions: raw.assumptions,
    scenarios: {
      base: { projections: baseProj, valuation: normalizeValuation(raw.baseValuation, baseRawDollars) },
      upside: { projections: upsideProj, valuation: normalizeValuation(raw.upsideValuation || raw.baseValuation, upsideRawDollars) },
      downside: { projections: downsideProj, valuation: normalizeValuation(raw.downsideValuation || raw.baseValuation, downsideRawDollars) },
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
