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
    ],
  },
};

export async function extractFinancialData(
  documents: Array<{ id: string; filename: string; extractedText: string | null; category: string }>,
  dealContext: { dealName: string; sector: string }
): Promise<ExtractionResult> {
  const financialDocs = documents.filter((d) =>
    ["financial_statements", "tax_returns", "quality_of_earnings", "pitch_materials", "management_presentation"].includes(d.category)
  );
  const contractDocs = documents.filter((d) => d.category.startsWith("contracts_"));
  const otherDocs = documents.filter((d) => !financialDocs.includes(d) && !contractDocs.includes(d));

  const allRelevantDocs = [...financialDocs, ...contractDocs, ...otherDocs.slice(0, 5)];
  const combinedText = allRelevantDocs
    .map((d) => `--- Document: ${d.filename} (${d.category}) ---\n${d.extractedText?.slice(0, 15000) || "[No text]"}`)
    .join("\n\n");

  const contextWindow = combinedText.slice(0, 180000);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 16000,
    system: `You are a senior financial analyst specializing in PE due diligence. Extract all financial data from the provided deal documents with extreme precision.

Rules:
- All monetary values in thousands (000s) unless clearly stated otherwise. Convert to consistent units.
- Calculate derived metrics (margins, growth rates) where raw data allows.
- Flag any inconsistencies between documents (e.g., revenue in P&L doesn't match cash flow).
- Include data for ALL available fiscal years/periods.
- For KPIs, extract any operational metrics: customer count, churn, ACV, NRR, employee count, etc.
- If deal terms are mentioned anywhere, extract them.

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
