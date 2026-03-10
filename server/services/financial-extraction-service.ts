import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import { extractedFinancials, investorMemos } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { ClassifiedDocument } from "./document-classification-service";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

export interface FiscalYearData {
  year: string;
  revenue: number | null;
  cogs: number | null;
  grossProfit: number | null;
  grossMargin: number | null;
  operatingExpenses: number | null;
  ebitda: number | null;
  ebitdaMargin: number | null;
  depreciation: number | null;
  amortization: number | null;
  ebit: number | null;
  interestExpense: number | null;
  netIncome: number | null;
  netMargin: number | null;
}

export interface BalanceSheetData {
  year: string;
  totalAssets: number | null;
  currentAssets: number | null;
  cash: number | null;
  accountsReceivable: number | null;
  inventory: number | null;
  totalLiabilities: number | null;
  currentLiabilities: number | null;
  longTermDebt: number | null;
  totalEquity: number | null;
}

export interface CashFlowData {
  year: string;
  operatingCashFlow: number | null;
  capitalExpenditures: number | null;
  freeCashFlow: number | null;
  investingCashFlow: number | null;
  financingCashFlow: number | null;
}

export interface KPIData {
  name: string;
  value: string | number;
  unit: string;
  period: string;
  trend: "increasing" | "decreasing" | "stable" | "unknown";
}

export interface DealTermsData {
  purchasePrice: number | null;
  enterpriseValue: number | null;
  equityValue: number | null;
  debtAssumption: number | null;
  earnout: string | null;
  structure: string | null;
  financingDetails: string | null;
}

export interface CustomerData {
  name: string;
  revenueContribution: number | null;
  percentOfRevenue: number | null;
  contractExpiry: string | null;
  yearsAsCustomer: number | null;
}

export interface RevenueSegment {
  segment: string;
  revenue: number | null;
  growthRate: number | null;
  period: string;
}

export interface ExpenseItem {
  category: string;
  subcategory: string | null;
  amount: number | null;
  period: string;
  type: "opex" | "cogs";
}

export interface StaffingEntry {
  department: string;
  role: string | null;
  headcount: number | null;
  totalCost: number | null;
  period: string;
  type: "expense" | "cogs";
}

export interface ModelAssumption {
  category: string;
  key: string;
  value: string;
  description: string | null;
}

export interface ProductRolloutEntry {
  product: string;
  launchDate: string | null;
  revenueImpact: string | null;
  description: string | null;
}

export interface MonthlyFinancial {
  period: string;
  revenue: number | null;
  cogs: number | null;
  grossProfit: number | null;
  operatingExpenses: number | null;
  ebitda: number | null;
  netIncome: number | null;
}

export interface ExtractionResult {
  companyName: string;
  incomeStatements: FiscalYearData[];
  balanceSheets: BalanceSheetData[];
  cashFlows: CashFlowData[];
  kpis: KPIData[];
  dealTerms: DealTermsData | null;
  customerConcentration: CustomerData[];
  managementTeam: Array<{ name: string; title: string; tenure: string | null; background: string | null }>;
  validationIssues: Array<{ field: string; issue: string; severity: "high" | "medium" | "low" }>;
  revenueSegments: RevenueSegment[];
  expenseBreakdown: ExpenseItem[];
  staffingPlan: StaffingEntry[];
  modelAssumptions: ModelAssumption[];
  productRollout: ProductRolloutEntry[];
  monthlyFinancials: MonthlyFinancial[];
}

const EXTRACTION_TOOL = {
  name: "extract_financials",
  description: "Extract structured financial data from deal documents",
  input_schema: {
    type: "object" as const,
    properties: {
      companyName: { type: "string" as const },
      incomeStatements: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            year: { type: "string" as const },
            revenue: { type: ["number", "null"] as any },
            cogs: { type: ["number", "null"] as any },
            grossProfit: { type: ["number", "null"] as any },
            grossMargin: { type: ["number", "null"] as any },
            operatingExpenses: { type: ["number", "null"] as any },
            ebitda: { type: ["number", "null"] as any },
            ebitdaMargin: { type: ["number", "null"] as any },
            depreciation: { type: ["number", "null"] as any },
            amortization: { type: ["number", "null"] as any },
            ebit: { type: ["number", "null"] as any },
            interestExpense: { type: ["number", "null"] as any },
            netIncome: { type: ["number", "null"] as any },
            netMargin: { type: ["number", "null"] as any },
          },
          required: ["year"],
        },
      },
      balanceSheets: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            year: { type: "string" as const },
            totalAssets: { type: ["number", "null"] as any },
            currentAssets: { type: ["number", "null"] as any },
            cash: { type: ["number", "null"] as any },
            accountsReceivable: { type: ["number", "null"] as any },
            inventory: { type: ["number", "null"] as any },
            totalLiabilities: { type: ["number", "null"] as any },
            currentLiabilities: { type: ["number", "null"] as any },
            longTermDebt: { type: ["number", "null"] as any },
            totalEquity: { type: ["number", "null"] as any },
          },
          required: ["year"],
        },
      },
      cashFlows: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            year: { type: "string" as const },
            operatingCashFlow: { type: ["number", "null"] as any },
            capitalExpenditures: { type: ["number", "null"] as any },
            freeCashFlow: { type: ["number", "null"] as any },
            investingCashFlow: { type: ["number", "null"] as any },
            financingCashFlow: { type: ["number", "null"] as any },
          },
          required: ["year"],
        },
      },
      kpis: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            name: { type: "string" as const },
            value: {},
            unit: { type: "string" as const },
            period: { type: "string" as const },
            trend: { type: "string" as const, enum: ["increasing", "decreasing", "stable", "unknown"] },
          },
          required: ["name", "value", "unit", "period", "trend"],
        },
      },
      dealTerms: {
        type: ["object", "null"] as any,
        properties: {
          purchasePrice: { type: ["number", "null"] as any },
          enterpriseValue: { type: ["number", "null"] as any },
          equityValue: { type: ["number", "null"] as any },
          debtAssumption: { type: ["number", "null"] as any },
          earnout: { type: ["string", "null"] as any },
          structure: { type: ["string", "null"] as any },
          financingDetails: { type: ["string", "null"] as any },
        },
      },
      customerConcentration: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            name: { type: "string" as const },
            revenueContribution: { type: ["number", "null"] as any },
            percentOfRevenue: { type: ["number", "null"] as any },
            contractExpiry: { type: ["string", "null"] as any },
            yearsAsCustomer: { type: ["number", "null"] as any },
          },
          required: ["name"],
        },
      },
      managementTeam: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            name: { type: "string" as const },
            title: { type: "string" as const },
            tenure: { type: ["string", "null"] as any },
            background: { type: ["string", "null"] as any },
          },
          required: ["name", "title"],
        },
      },
      revenueSegments: {
        type: "array" as const,
        description: "Revenue broken down by product, service line, or business segment",
        items: {
          type: "object" as const,
          properties: {
            segment: { type: "string" as const },
            revenue: { type: ["number", "null"] as any, description: "Revenue in $000s" },
            growthRate: { type: ["number", "null"] as any, description: "Growth rate as percentage" },
            period: { type: "string" as const, description: "Time period (e.g. '2024', 'Q1 2025')" },
          },
          required: ["segment", "period"],
        },
      },
      expenseBreakdown: {
        type: "array" as const,
        description: "Detailed expense breakdown by department or category (G&A, Sales, Marketing, Clinical Ops, Technology, etc.)",
        items: {
          type: "object" as const,
          properties: {
            category: { type: "string" as const, description: "e.g. General & Administrative, Marketing, Technology, Clinical Operations" },
            subcategory: { type: ["string", "null"] as any, description: "e.g. Rent, Insurance, Office Supplies, Travel" },
            amount: { type: ["number", "null"] as any, description: "Amount in $000s" },
            period: { type: "string" as const },
            type: { type: "string" as const, enum: ["opex", "cogs"] },
          },
          required: ["category", "period", "type"],
        },
      },
      staffingPlan: {
        type: "array" as const,
        description: "Employee/contractor headcount and cost by department. Extract from staffing sheets, org charts, or payroll data.",
        items: {
          type: "object" as const,
          properties: {
            department: { type: "string" as const, description: "e.g. G&A, Clinical Ops, Marketing, Technology, Sales" },
            role: { type: ["string", "null"] as any },
            headcount: { type: ["number", "null"] as any },
            totalCost: { type: ["number", "null"] as any, description: "Total cost in $000s including salary and benefits" },
            period: { type: "string" as const },
            type: { type: "string" as const, enum: ["expense", "cogs"], description: "Whether this staff cost is an operating expense or COGS" },
          },
          required: ["department", "period", "type"],
        },
      },
      modelAssumptions: {
        type: "array" as const,
        description: "All model assumptions found in assumption sheets or documentation (tax rates, growth factors, pricing, benefits rates, etc.)",
        items: {
          type: "object" as const,
          properties: {
            category: { type: "string" as const, description: "e.g. General, Fund Raise, Staffing, Expenses, Taxes & Benefits, Revenue" },
            key: { type: "string" as const },
            value: { type: "string" as const },
            description: { type: ["string", "null"] as any },
          },
          required: ["category", "key", "value"],
        },
      },
      productRollout: {
        type: "array" as const,
        description: "Product or service launch schedule with timing and expected revenue impact",
        items: {
          type: "object" as const,
          properties: {
            product: { type: "string" as const },
            launchDate: { type: ["string", "null"] as any },
            revenueImpact: { type: ["string", "null"] as any, description: "Expected revenue contribution or impact description" },
            description: { type: ["string", "null"] as any },
          },
          required: ["product"],
        },
      },
      monthlyFinancials: {
        type: "array" as const,
        description: "Monthly-level financial data when available (from monthly P&L, cash flow forecast sheets)",
        items: {
          type: "object" as const,
          properties: {
            period: { type: "string" as const, description: "e.g. 'Jan 2025', 'Feb 2025'" },
            revenue: { type: ["number", "null"] as any, description: "Revenue in $000s" },
            cogs: { type: ["number", "null"] as any, description: "COGS in $000s" },
            grossProfit: { type: ["number", "null"] as any, description: "Gross profit in $000s" },
            operatingExpenses: { type: ["number", "null"] as any, description: "OpEx in $000s" },
            ebitda: { type: ["number", "null"] as any, description: "EBITDA in $000s" },
            netIncome: { type: ["number", "null"] as any, description: "Net income in $000s" },
          },
          required: ["period"],
        },
      },
      validationIssues: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            field: { type: "string" as const },
            issue: { type: "string" as const },
            severity: { type: "string" as const, enum: ["high", "medium", "low"] },
          },
          required: ["field", "issue", "severity"],
        },
      },
    },
    required: [
      "companyName", "incomeStatements", "balanceSheets", "cashFlows",
      "kpis", "dealTerms", "customerConcentration", "managementTeam", "validationIssues",
      "revenueSegments", "expenseBreakdown", "staffingPlan", "modelAssumptions", "productRollout", "monthlyFinancials",
    ],
  },
};

export async function extractFinancialData(
  documents: Array<{ id: string; filename: string; extractedText: string | null; category: string }>,
  dealContext: { dealName: string; sector: string }
): Promise<ExtractionResult> {
  const financialCategories = ["financial_statements", "tax_returns", "quality_of_earnings", "pitch_materials", "management_presentation"];
  const financialDocs = documents.filter((d) => financialCategories.includes(d.category));
  const contractDocs = documents.filter((d) => d.category.startsWith("contracts_"));
  const otherDocs = documents.filter((d) => !financialDocs.includes(d) && !contractDocs.includes(d));

  const allRelevantDocs = [...financialDocs, ...contractDocs, ...otherDocs.slice(0, 5)];
  const combinedText = allRelevantDocs
    .map((d) => {
      const isFinancial = financialCategories.includes(d.category);
      const textLimit = isFinancial ? 50000 : 15000;
      return `--- Document: ${d.filename} (${d.category}) ---\n${d.extractedText?.slice(0, textLimit) || "[No text]"}`;
    })
    .join("\n\n");

  const contextWindow = combinedText.slice(0, 350000);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 32000,
    system: `You are a senior financial analyst specializing in PE due diligence. Extract ALL financial data from the provided deal documents with extreme precision and granularity.

Rules:
- All monetary values in thousands (000s) unless clearly stated otherwise. Convert to consistent units.
- Calculate derived metrics (margins, growth rates) where raw data allows.
- Flag any inconsistencies between documents (e.g., revenue in P&L doesn't match cash flow).
- Include data for ALL available fiscal years/periods.
- For KPIs, extract any operational metrics: customer count, churn, ACV, NRR, employee count, etc.
- If deal terms are mentioned anywhere, extract them.

CRITICAL — Extract ALL granular detail available in the documents:
- Revenue by segment/product/service line (revenueSegments): Break down total revenue into its component parts. Extract from worksheets, P&L detail, or revenue schedules.
- Expense breakdown by department/category (expenseBreakdown): Extract G&A, Sales, Marketing, R&D, Clinical Ops, Technology costs, etc. Include subcategories like rent, insurance, travel, legal fees, office supplies when available.
- Staffing plan (staffingPlan): Extract employee/contractor counts, salaries, departments, and whether each is COGS or OpEx. Look for staffing sheets, payroll summaries, or org data.
- Model assumptions (modelAssumptions): Extract EVERY stated assumption — tax rates, payroll tax rates, benefit rates, growth factors, pricing assumptions, accounting methods, fund raise inputs. Look for "Assumptions" sheets or documentation.
- Product rollout schedule (productRollout): Extract product/service launch dates and expected revenue impact. Look for rollout timelines, product roadmaps.
- Monthly financials (monthlyFinancials): When monthly P&L, cash flow, or forecast data is available, extract monthly-level data (especially for the most recent 12-24 months and projections).

The documents may contain Excel spreadsheet data formatted with pipe separators. Parse all sheets thoroughly — financial models often have 5-10+ sheets with critical data distributed across them.

Deal: ${dealContext.dealName} | Sector: ${dealContext.sector}`,
    messages: [
      {
        role: "user",
        content: `Extract all structured financial data from these deal documents:\n\n${contextWindow}`,
      },
    ],
    tools: [EXTRACTION_TOOL],
    tool_choice: { type: "tool", name: "extract_financials" },
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Financial extraction failed: no structured output returned");
  }

  return toolBlock.input as ExtractionResult;
}

export async function validateExtraction(
  extraction: ExtractionResult
): Promise<ExtractionResult> {
  const issues: ExtractionResult["validationIssues"] = [...extraction.validationIssues];

  for (const stmt of extraction.incomeStatements) {
    if (stmt.revenue && stmt.cogs && stmt.grossProfit) {
      const expected = stmt.revenue - stmt.cogs;
      const diff = Math.abs(expected - stmt.grossProfit) / stmt.revenue;
      if (diff > 0.02) {
        issues.push({
          field: `incomeStatement.${stmt.year}.grossProfit`,
          issue: `Gross profit ($${stmt.grossProfit}) doesn't match revenue ($${stmt.revenue}) - COGS ($${stmt.cogs}). Diff: ${(diff * 100).toFixed(1)}%`,
          severity: diff > 0.1 ? "high" : "medium",
        });
      }
    }

    if (stmt.revenue && stmt.ebitdaMargin && stmt.ebitda) {
      const expectedMargin = (stmt.ebitda / stmt.revenue) * 100;
      if (Math.abs(expectedMargin - stmt.ebitdaMargin) > 1) {
        issues.push({
          field: `incomeStatement.${stmt.year}.ebitdaMargin`,
          issue: `EBITDA margin (${stmt.ebitdaMargin}%) doesn't match EBITDA/Revenue calculation (${expectedMargin.toFixed(1)}%)`,
          severity: "medium",
        });
      }
    }
  }

  return { ...extraction, validationIssues: issues };
}

export async function persistExtraction(
  memoId: string,
  dealId: string,
  extraction: ExtractionResult
): Promise<void> {
  const [memoExists] = await db.select({ id: investorMemos.id })
    .from(investorMemos)
    .where(eq(investorMemos.id, memoId));
  if (!memoExists) {
    console.warn(`[FinExtract] Memo ${memoId} no longer exists, skipping extraction persist`);
    return;
  }

  const truncYear = (y?: string) => y ? y.substring(0, 50) : undefined;

  for (const stmt of extraction.incomeStatements) {
    await db.insert(extractedFinancials).values({
      memoId,
      dealId,
      dataType: "income_statement",
      fiscalYear: truncYear(stmt.year),
      structuredData: stmt,
      confidence: 0.85,
    });
  }

  for (const bs of extraction.balanceSheets) {
    await db.insert(extractedFinancials).values({
      memoId,
      dealId,
      dataType: "balance_sheet",
      fiscalYear: truncYear(bs.year),
      structuredData: bs,
      confidence: 0.85,
    });
  }

  for (const cf of extraction.cashFlows) {
    await db.insert(extractedFinancials).values({
      memoId,
      dealId,
      dataType: "cash_flow",
      fiscalYear: truncYear(cf.year),
      structuredData: cf,
      confidence: 0.85,
    });
  }

  if (extraction.kpis.length > 0) {
    await db.insert(extractedFinancials).values({
      memoId,
      dealId,
      dataType: "kpis",
      structuredData: { kpis: extraction.kpis },
      confidence: 0.8,
    });
  }

  if (extraction.dealTerms) {
    await db.insert(extractedFinancials).values({
      memoId,
      dealId,
      dataType: "deal_terms",
      structuredData: extraction.dealTerms,
      confidence: 0.9,
    });
  }

  if (extraction.customerConcentration.length > 0) {
    await db.insert(extractedFinancials).values({
      memoId,
      dealId,
      dataType: "customer_concentration",
      structuredData: { customers: extraction.customerConcentration },
      confidence: 0.8,
    });
  }

  if (extraction.managementTeam.length > 0) {
    await db.insert(extractedFinancials).values({
      memoId,
      dealId,
      dataType: "management_team",
      structuredData: { team: extraction.managementTeam },
      confidence: 0.9,
    });
  }

  if (extraction.revenueSegments?.length > 0) {
    await db.insert(extractedFinancials).values({
      memoId,
      dealId,
      dataType: "revenue_segments",
      structuredData: { segments: extraction.revenueSegments },
      confidence: 0.85,
    });
  }

  if (extraction.expenseBreakdown?.length > 0) {
    await db.insert(extractedFinancials).values({
      memoId,
      dealId,
      dataType: "expense_breakdown",
      structuredData: { expenses: extraction.expenseBreakdown },
      confidence: 0.85,
    });
  }

  if (extraction.staffingPlan?.length > 0) {
    await db.insert(extractedFinancials).values({
      memoId,
      dealId,
      dataType: "staffing_plan",
      structuredData: { staffing: extraction.staffingPlan },
      confidence: 0.8,
    });
  }

  if (extraction.modelAssumptions?.length > 0) {
    await db.insert(extractedFinancials).values({
      memoId,
      dealId,
      dataType: "model_assumptions",
      structuredData: { assumptions: extraction.modelAssumptions },
      confidence: 0.9,
    });
  }

  if (extraction.productRollout?.length > 0) {
    await db.insert(extractedFinancials).values({
      memoId,
      dealId,
      dataType: "product_rollout",
      structuredData: { rollout: extraction.productRollout },
      confidence: 0.8,
    });
  }

  if (extraction.monthlyFinancials?.length > 0) {
    await db.insert(extractedFinancials).values({
      memoId,
      dealId,
      dataType: "monthly_financials",
      structuredData: { monthly: extraction.monthlyFinancials },
      confidence: 0.85,
    });
  }

  if (extraction.validationIssues.length > 0) {
    await db.insert(extractedFinancials).values({
      memoId,
      dealId,
      dataType: "validation_issues",
      structuredData: { issues: extraction.validationIssues },
      hasDiscrepancy: true,
    });
  }
}
