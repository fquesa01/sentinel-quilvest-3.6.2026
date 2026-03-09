import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import {
  investorMemos, memoGenerationRuns, peDeals, peDealDocuments,
  deals, dataRoomDocuments, dataRoomFolders, dataRooms,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { classifyDocuments, updateDocumentCategories } from "./document-classification-service";
import { extractFinancialData, validateExtraction, persistExtraction } from "./financial-extraction-service";
import { conductIndustryResearch, type IndustryResearch } from "./industry-research-service";
import { assessTechInnovation, type TechAssessment } from "./tech-innovation-assessment-service";
import { buildFinancialModel, persistFinancialModel, type FinancialModelOutput } from "./financial-model-service";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

export type ProgressCallback = (stage: string, progress: number, message: string) => void;

const MEMO_SECTIONS = [
  "executive_summary",
  "company_overview",
  "industry_market_analysis",
  "competitive_intelligence",
  "financial_performance",
  "financial_projections",
  "valuation",
  "technology_innovation",
  "value_creation_plan",
  "management_organization",
  "risk_factors",
  "investment_merits",
  "appendix",
] as const;

interface DealDocumentInput {
  id: string;
  filename: string;
  extractedText: string | null;
  category: string;
}

export async function generateInvestorMemo(
  dealId: string,
  sourceType: "pe_deal" | "transaction" | "data_room",
  userId: string,
  onProgress?: ProgressCallback
): Promise<string> {
  const progress = onProgress || (() => {});

  let dealName: string;
  let sector: string;
  let subsector: string | null = null;
  let dealType: string;
  let geography: string;
  let documents: DealDocumentInput[];
  let targetDescription: string | null = null;
  let dealSettings: Record<string, any> = {};

  if (sourceType === "pe_deal") {
    const [deal] = await db.select().from(peDeals).where(eq(peDeals.id, dealId));
    if (!deal) throw new Error(`PE deal ${dealId} not found`);
    dealName = deal.name;
    sector = deal.sector;
    subsector = deal.subsector;
    dealType = deal.dealType;
    geography = deal.geography;
    targetDescription = deal.targetDescription;
    dealSettings = {};

    const docs = await db.select().from(peDealDocuments).where(eq(peDealDocuments.dealId, dealId));
    documents = docs.map((d) => ({
      id: d.id,
      filename: d.filename,
      extractedText: d.extractedText,
      category: d.category || "other",
    }));
  } else {
    const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
    if (!deal) throw new Error(`Deal ${dealId} not found`);
    dealName = deal.title;
    sector = deal.dealType || "General";
    dealType = deal.dealType || "acquisition";
    geography = "United States";
    dealSettings = (deal.settings as Record<string, any>) || {};

    const roomsList = await db.select().from(dataRooms).where(eq(dataRooms.dealId, dealId));
    const allDocs: DealDocumentInput[] = [];
    for (const room of roomsList) {
      const roomDocs = await db.select().from(dataRoomDocuments)
        .where(eq(dataRoomDocuments.dataRoomId, room.id));
      allDocs.push(...roomDocs.map((d) => ({
        id: d.id,
        filename: d.filename,
        extractedText: d.extractedText,
        category: "other",
      })));
    }
    documents = allDocs;
  }

  console.log(`[MemoGen] Starting generation for deal "${dealName}" (${dealId}), sourceType=${sourceType}, ${documents.length} documents`);

  if (documents.length === 0) {
    throw new Error("No documents found for this deal. Upload documents before generating a memo.");
  }

  const [memo] = await db.insert(investorMemos).values({
    dealId,
    sourceType,
    dealName,
    status: "generating",
    generatedBy: userId,
    version: 1,
  }).returning();

  const [run] = await db.insert(memoGenerationRuns).values({
    memoId: memo.id,
    dealId,
    currentStage: "classification",
    status: "running",
    documentsTotal: documents.length,
  }).returning();

  try {
    // Stage 1: Classification
    console.log(`[MemoGen] Stage 1: Classifying ${documents.length} documents...`);
    progress("classification", 10, `Classifying ${documents.length} documents...`);
    await updateRunStage(run.id, "classification", "running");

    const classifications = await classifyDocuments(
      documents,
      { dealName, sector, dealType }
    );
    if (sourceType === "pe_deal") {
      await updateDocumentCategories(classifications);
    }

    const classifiedDocs = documents.map((doc) => {
      const classified = classifications.find((c) => c.documentId === doc.id);
      return { ...doc, category: classified?.category || doc.category };
    });

    await updateRunStage(run.id, "classification", "complete");
    await db.update(memoGenerationRuns).set({
      documentsClassified: classifications.length,
      progress: 15,
    }).where(eq(memoGenerationRuns.id, run.id));

    console.log(`[MemoGen] Classification complete: ${classifications.length} documents classified`);

    // Stages 2-4 run in parallel
    console.log(`[MemoGen] Stages 2-4: Extraction, research, and tech assessment (parallel)...`);
    progress("extraction", 20, "Extracting financials, researching industry, assessing technology...");
    await updateRunStage(run.id, "extraction", "running");
    await updateRunStage(run.id, "research", "running");
    await updateRunStage(run.id, "tech_assessment", "running");

    const [extraction, industryResearch, _] = await Promise.all([
      extractFinancialData(classifiedDocs, { dealName, sector })
        .then(async (result) => {
          const validated = await validateExtraction(result);
          await persistExtraction(memo.id, dealId, validated);
          await updateRunStage(run.id, "extraction", "complete");
          progress("extraction", 40, "Financial data extracted and validated");
          return validated;
        }),

      conductIndustryResearch(
        dealName, sector, subsector, geography,
        targetDescription || `${dealType} deal in ${sector}`
      ).then(async (result) => {
        await updateRunStage(run.id, "research", "complete");
        progress("research", 50, `Industry research complete: ${result.totalSourcesConsulted} sources consulted`);
        return result;
      }).catch(async (err) => {
        console.error("[MemoGen] Industry research failed, continuing:", err);
        await updateRunStage(run.id, "research", "complete");
        return null as IndustryResearch | null;
      }),

      (async () => {
        // Tech assessment needs extraction results, so we delay slightly
        await new Promise((r) => setTimeout(r, 2000));
        return null;
      })(),
    ]);

    // Stage 4: Tech assessment (needs extraction results)
    console.log(`[MemoGen] Stage 4: Tech assessment...`);
    progress("tech_assessment", 55, "Assessing technology and platform synergies...");
    const techAssessment = await assessTechInnovation(
      classifiedDocs,
      extraction,
      industryResearch,
      { dealName, sector, dealType, geography }
    ).catch((err) => {
      console.error("[MemoGen] Tech assessment failed, continuing:", err);
      return null as TechAssessment | null;
    });
    await updateRunStage(run.id, "tech_assessment", "complete");
    progress("tech_assessment", 65, "Technology assessment complete");

    // Stage 5: Financial Model
    console.log(`[MemoGen] Stage 5: Building financial model...`);
    progress("modeling", 70, "Building financial model with 3 scenarios...");
    await updateRunStage(run.id, "modeling", "running");

    const model = await buildFinancialModel(
      extraction, industryResearch, techAssessment,
      { dealName, sector, dealType }
    );
    await persistFinancialModel(memo.id, dealId, model);
    await updateRunStage(run.id, "modeling", "complete");
    progress("modeling", 80, "Financial model complete");

    // Stage 6: Write the memo
    console.log(`[MemoGen] Stage 6: Writing memo sections...`);
    progress("writing", 85, "Writing investor memo...");
    await updateRunStage(run.id, "writing", "running");

    const documentManifest = classifiedDocs.map((d) => ({
      id: d.id,
      filename: d.filename,
      category: d.category,
    }));

    const sections = await writeMemoSections(
      extraction, industryResearch, techAssessment, model,
      { dealName, sector, dealType, geography, targetDescription },
      documentManifest
    );

    const rawOverall = calculateOverallScore(extraction, industryResearch, techAssessment, model);

    await db.update(investorMemos).set({
      status: "review",
      sections: sections as any,
      industryResearch: industryResearch as any,
      techAssessment: techAssessment as any,
      innovationScore: techAssessment?.innovationScore != null ? Math.round(techAssessment.innovationScore) : null,
      overallScore: rawOverall != null ? Math.round(rawOverall) : null,
      executiveSummary: sections.executive_summary?.content || null,
      investmentThesis: extractThesis(sections.executive_summary?.content || ""),
      metadata: {
        documentsProcessed: documents.length,
        totalProcessingTimeMs: Date.now() - (run.startedAt?.getTime() || Date.now()),
        aiModelsUsed: ["claude-sonnet-4-5"],
        researchSourcesCount: industryResearch?.totalSourcesConsulted || 0,
        confidenceScore: industryResearch?.researchConfidence || 70,
      },
      updatedAt: new Date(),
    }).where(eq(investorMemos.id, memo.id));

    if (sourceType !== "pe_deal") {
      try {
        await db.update(deals).set({
          settings: {
            ...dealSettings,
            memoStatus: "generated",
            memoError: null,
          },
        }).where(eq(deals.id, dealId));
      } catch (settingsErr) {
        console.error("[MemoGen] Non-fatal: failed to update deal settings after success:", settingsErr);
      }
    }

    await updateRunStage(run.id, "writing", "complete");
    await db.update(memoGenerationRuns).set({
      currentStage: "complete",
      status: "complete",
      progress: 100,
      completedAt: new Date(),
    }).where(eq(memoGenerationRuns.id, run.id));

    progress("complete", 100, "Investor memo generated successfully");
    return memo.id;

  } catch (error: any) {
    console.error("[MemoGen] Pipeline failed:", error);
    await db.update(investorMemos).set({ status: "failed" }).where(eq(investorMemos.id, memo.id));
    await db.update(memoGenerationRuns).set({
      status: "failed",
      errorMessage: error.message,
    }).where(eq(memoGenerationRuns.id, run.id));
    if (sourceType !== "pe_deal") {
      try {
        await db.update(deals).set({
          settings: {
            ...dealSettings,
            memoStatus: "failed",
            memoError: error.message,
          },
        }).where(eq(deals.id, dealId));
      } catch {}
    }
    throw error;
  }
}

async function writeMemoSections(
  extraction: any,
  research: IndustryResearch | null,
  techAssessment: TechAssessment | null,
  model: FinancialModelOutput,
  context: { dealName: string; sector: string; dealType: string; geography: string; targetDescription: string | null },
  documentManifest?: { id: string; filename: string; category: string }[]
): Promise<Record<string, { title: string; content: string; isEdited: boolean; generatedAt: string }>> {
  const dataPayload = {
    sourceDocuments: documentManifest || [],
    financials: {
      incomeStatements: extraction.incomeStatements,
      kpis: extraction.kpis,
      dealTerms: extraction.dealTerms,
      customers: extraction.customerConcentration,
      management: extraction.managementTeam,
      validationIssues: extraction.validationIssues,
    },
    research: research ? {
      market: research.marketOverview,
      competitors: research.competitors,
      regulations: research.regulatoryLandscape,
      transactions: research.recentTransactions,
      trends: research.industryTrends,
      sentiment: research.publicSentiment,
    } : null,
    techAssessment: techAssessment ? {
      profile: techAssessment.targetTechProfile,
      sentinelSynergies: techAssessment.sentinelSynergies,
      ticketToroSynergies: techAssessment.ticketToroSynergies,
      innovationScore: techAssessment.innovationScore,
      valueCreation: techAssessment.valueCreationEstimate,
      roadmap: techAssessment.implementationRoadmap,
      risks: techAssessment.risks,
    } : null,
    model: {
      assumptions: model.assumptions,
      baseProjections: model.scenarios.base.projections,
      baseValuation: model.scenarios.base.valuation,
      upsideProjections: model.scenarios.upside.projections,
      downsideProjections: model.scenarios.downside.projections,
      sensitivity: model.sensitivityTable,
    },
  };

  const payloadStr = JSON.stringify(dataPayload);
  const truncatedPayload = payloadStr.length > 80000 ? payloadStr.slice(0, 80000) + "...[truncated]" : payloadStr;
  console.log(`[MemoGen] Writing memo with payload size: ${payloadStr.length} chars (${truncatedPayload.length > 80000 ? 'truncated' : 'full'})`);

  const maxRetries = 2;
  let lastError: Error | null = null;
  let response: Anthropic.Messages.Message | null = null;

  const requestParams = {
    model: "claude-sonnet-4-5" as const,
    max_tokens: 16000,
    system: `You are a senior investment professional writing an investor memo for a PE deal. Write in a professional, analytical tone suitable for an investment committee presentation.

The memo should be comprehensive but concise. Use specific numbers from the data. Cite research sources where relevant.

IMPORTANT: Every section must have substantive content. Do NOT leave any section empty. The risk_factors section must be especially detailed — it should expand on ALL risks mentioned in the executive summary and add additional risk categories (financial, operational, market, regulatory, technology, management, deal-specific). Use markdown tables for structured risk data.

CITATIONS: The data payload includes a "sourceDocuments" array containing {id, filename, category} for each document in the deal's data room. You MUST include inline citations throughout every section linking claims, data points, and analysis back to specific source documents. Use markdown link syntax: [Document Name](/api/data-room-documents/DOCUMENT_ID/preview). For example: "Revenue grew 335% ([Q4 2025 Financial Statements](/api/data-room-documents/abc123/preview))". Place citations immediately after the claim they support. Every paragraph with factual claims should have at least one citation. When a data point could come from multiple documents, cite the most specific/relevant one. Use the document filename (cleaned up for readability) as the link text.

Target: ${context.dealName}
Sector: ${context.sector}
Deal type: ${context.dealType}
Geography: ${context.geography}
Description: ${context.targetDescription || "N/A"}`,
    messages: [
      {
        role: "user" as const,
        content: `Write all 13 sections of the investor memo using this data:\n\n${truncatedPayload}`,
      },
    ],
    tools: [
      {
        name: "write_memo" as const,
        description: "Write the complete investor memo sections",
        input_schema: {
          type: "object" as const,
          properties: {
            executive_summary: { type: "string" as const, description: "Executive summary with investment thesis, key highlights, and a Key Risks & Mitigants table" },
            company_overview: { type: "string" as const, description: "Company background, history, products/services, and market position" },
            industry_market_analysis: { type: "string" as const, description: "Industry overview, TAM/SAM/SOM, growth drivers, and market dynamics" },
            competitive_intelligence: { type: "string" as const, description: "Competitive landscape, key competitors, differentiation, and market share" },
            financial_performance: { type: "string" as const, description: "Historical financial analysis with revenue, margins, EBITDA, and key metrics" },
            financial_projections: { type: "string" as const, description: "Forward-looking projections with assumptions and scenario analysis" },
            valuation: { type: "string" as const, description: "Valuation methodology, multiples, DCF analysis, and comparable transactions" },
            technology_innovation: { type: "string" as const, description: "Technology stack assessment, innovation capabilities, and tech risks/opportunities" },
            value_creation_plan: { type: "string" as const, description: "Post-acquisition value creation levers, synergies, and 100-day plan" },
            management_organization: { type: "string" as const, description: "Management team assessment, organizational structure, and key-man risks" },
            risk_factors: { type: "string" as const, description: "COMPREHENSIVE risk factor analysis. Must include ALL risks from the executive summary plus additional detailed risks. Use a markdown table with columns: Risk, Severity (Critical/High/Medium/Low), Category, Description, Mitigation. Include financial risks, operational risks, market risks, regulatory risks, technology risks, management risks, and deal-specific risks. This section must be substantive — at least 8-12 risk factors with detailed descriptions and mitigations." },
            investment_merits: { type: "string" as const, description: "Key investment merits, strengths, and reasons to invest" },
            appendix: { type: "string" as const, description: "Supporting data, methodology notes, and additional detail" },
          },
          required: [
            "executive_summary", "company_overview", "industry_market_analysis",
            "competitive_intelligence", "financial_performance", "financial_projections",
            "valuation", "technology_innovation", "value_creation_plan",
            "management_organization", "risk_factors", "investment_merits", "appendix",
          ],
        },
      },
    ],
    tool_choice: { type: "tool" as const, name: "write_memo" as const },
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const backoffMs = Math.min(10000 * Math.pow(2, attempt - 1), 30000);
      console.log(`[MemoGen] Retry ${attempt}/${maxRetries} after ${backoffMs}ms backoff...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }

    try {
      console.log(`[MemoGen] Starting streaming write (attempt ${attempt + 1})...`);
      const stream = anthropic.messages.stream(requestParams);

      let tokenCount = 0;
      stream.on('text', () => {
        tokenCount++;
        if (tokenCount % 500 === 0) {
          console.log(`[MemoGen] Streaming progress: ~${tokenCount} tokens received...`);
        }
      });

      response = await stream.finalMessage();
      console.log(`[MemoGen] Streaming complete: ${response.usage?.output_tokens || tokenCount} output tokens`);
      break;
    } catch (err: any) {
      lastError = err;
      const isTimeout = err.name === 'APIConnectionTimeoutError' || err.message?.includes('timed out') || err.message?.includes('timeout');
      const isRetryable = isTimeout || err.status === 529 || err.status === 503 || err.status === 500;
      console.error(`[MemoGen] Write attempt ${attempt + 1} failed: ${err.message}`);
      if (!isRetryable || attempt === maxRetries) {
        throw err;
      }
    }
  }

  if (!response) {
    throw lastError || new Error("Memo writing failed after retries");
  }

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Memo writing failed");
  }

  const raw = toolBlock.input as Record<string, string>;
  const now = new Date().toISOString();

  const sectionTitles: Record<string, string> = {
    executive_summary: "Executive Summary",
    company_overview: "Company Overview",
    industry_market_analysis: "Industry & Market Analysis",
    competitive_intelligence: "Competitive Intelligence",
    financial_performance: "Financial Performance",
    financial_projections: "Financial Projections",
    valuation: "Valuation",
    technology_innovation: "Technology & Innovation Assessment",
    value_creation_plan: "Value Creation Plan",
    management_organization: "Management & Organization",
    risk_factors: "Risk Factors",
    investment_merits: "Investment Merits",
    appendix: "Appendix",
  };

  const sections: Record<string, { title: string; content: string; isEdited: boolean; generatedAt: string }> = {};
  for (const key of MEMO_SECTIONS) {
    sections[key] = {
      title: sectionTitles[key] || key,
      content: raw[key] || "",
      isEdited: false,
      generatedAt: now,
    };
  }

  return sections;
}

export async function regenerateSection(
  memoId: string,
  section: string,
  prompt?: string
): Promise<string> {
  const [memo] = await db.select().from(investorMemos).where(eq(investorMemos.id, memoId));
  if (!memo) throw new Error("Memo not found");

  const currentSections = memo.sections as Record<string, any>;
  const currentContent = currentSections[section]?.content || "";

  let contextSections: Record<string, string> = {};
  for (const [key, val] of Object.entries(currentSections)) {
    if (key !== section && (val as any)?.content) {
      contextSections[key] = (val as any).content;
    }
  }

  let documentManifest: { id: string; filename: string; category: string }[] = [];
  try {
    const sourceType = memo.sourceType;
    if (sourceType === "pe_deal") {
      const docs = await db.select({ id: peDealDocuments.id, filename: peDealDocuments.filename, category: peDealDocuments.category })
        .from(peDealDocuments).where(eq(peDealDocuments.dealId, memo.dealId));
      documentManifest = docs.map(d => ({ id: d.id, filename: d.filename, category: d.category || "other" }));
    } else {
      const roomsList = await db.select().from(dataRooms).where(eq(dataRooms.dealId, memo.dealId));
      for (const room of roomsList) {
        const roomDocs = await db.select({ id: dataRoomDocuments.id, filename: dataRoomDocuments.filename })
          .from(dataRoomDocuments).where(eq(dataRoomDocuments.dataRoomId, room.id));
        documentManifest.push(...roomDocs.map(d => ({ id: d.id, filename: d.filename, category: "other" })));
      }
    }
  } catch (e) {
    console.error("[MemoGen] Non-fatal: could not fetch document manifest for regeneration:", e);
  }

  const contextStr = JSON.stringify({
    dealName: memo.dealName,
    research: memo.industryResearch,
    techAssessment: memo.techAssessment,
    otherSections: contextSections,
    sourceDocuments: documentManifest,
  });
  const truncatedContext = contextStr.length > 60000 ? contextStr.slice(0, 60000) + "...[truncated]" : contextStr;

  const sectionDescriptions: Record<string, string> = {
    risk_factors: "Write a COMPREHENSIVE risk factor analysis. Include ALL risks mentioned in the executive summary plus additional detailed risks. Use a markdown table with columns: Risk, Severity (Critical/High/Medium/Low), Category, Description, Mitigation. Include financial risks, operational risks, market risks, regulatory risks, technology risks, management risks, and deal-specific risks. Provide at least 8-12 detailed risk factors.",
  };

  const sectionGuidance = sectionDescriptions[section] || "";
  const defaultInstruction = currentContent.trim().length > 0
    ? "Improve the section with more detail and better analysis."
    : "Generate comprehensive content for this section based on the memo context provided. The section is currently empty and needs full content.";

  const citationInstruction = documentManifest.length > 0
    ? `\n\nCITATIONS: The context includes a "sourceDocuments" array with {id, filename, category}. You MUST include inline citations using markdown link syntax: [Document Name](/api/data-room-documents/DOCUMENT_ID/preview). Place citations after claims they support. Every paragraph with factual claims should have at least one citation.`
    : "";

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4000,
    system: `You are rewriting a section of an investor memo. ${prompt ? `User instruction: ${prompt}` : defaultInstruction}${sectionGuidance ? `\n\nSection requirements: ${sectionGuidance}` : ""}${citationInstruction}`,
    messages: [
      {
        role: "user",
        content: `Current section content:\n\n${currentContent || "(empty — generate from scratch using the context below)"}\n\nContext from the full memo:\n${truncatedContext}`,
      },
    ],
  });

  const newContent = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as any).text)
    .join("");

  currentSections[section] = {
    ...currentSections[section],
    content: newContent,
    isEdited: true,
    editedAt: new Date().toISOString(),
  };

  await db.update(investorMemos).set({
    sections: currentSections as any,
    updatedAt: new Date(),
  }).where(eq(investorMemos.id, memoId));

  return newContent;
}

export async function chatAboutMemo(
  memoId: string,
  userMessage: string
): Promise<{ response: string; actionTaken?: { type: string; section?: string; description: string } }> {
  const [memo] = await db.select().from(investorMemos).where(eq(investorMemos.id, memoId));
  if (!memo) throw new Error("Memo not found");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4000,
    system: `You are an AI assistant helping refine an investor memo for "${memo.dealName}". You can answer questions about the memo, suggest improvements, or modify sections when asked.

Current memo sections: ${JSON.stringify(memo.sections)}
Industry research: ${JSON.stringify(memo.industryResearch)}
Tech assessment: ${JSON.stringify(memo.techAssessment)}`,
    messages: [
      { role: "user", content: userMessage },
    ],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as any).text)
    .join("");

  return { response: text };
}

function calculateOverallScore(
  extraction: any,
  research: IndustryResearch | null,
  tech: TechAssessment | null,
  model: FinancialModelOutput
): number {
  let score = 50;

  const latestYear = extraction.incomeStatements[extraction.incomeStatements.length - 1];
  if (latestYear?.ebitdaMargin && latestYear.ebitdaMargin > 20) score += 10;
  if (latestYear?.revenueGrowth && latestYear.revenueGrowth > 15) score += 10;

  if (research?.marketOverview.growthRate && research.marketOverview.growthRate > 10) score += 5;
  if (research && research.competitors.length <= 5) score += 5;

  if (tech?.innovationScore && tech.innovationScore > 70) score += 10;

  const baseValuation = model.scenarios.base.valuation;
  if (baseValuation.lbo?.irr && baseValuation.lbo.irr > 20) score += 10;

  return Math.min(100, Math.max(0, score));
}

function extractThesis(executiveSummary: string): string {
  const lines = executiveSummary.split("\n").filter((l) => l.trim().length > 0);
  return lines.slice(0, 3).join("\n");
}

async function updateRunStage(runId: string, stage: string, status: string): Promise<void> {
  const [run] = await db.select().from(memoGenerationRuns).where(eq(memoGenerationRuns.id, runId));
  if (!run) return;

  const details = (run.stageDetails || {}) as Record<string, any>;
  details[stage] = {
    ...details[stage],
    status,
    ...(status === "running" ? { startedAt: new Date().toISOString() } : {}),
    ...(status === "complete" ? { completedAt: new Date().toISOString() } : {}),
  };

  await db.update(memoGenerationRuns).set({
    currentStage: stage as any,
    stageDetails: details as any,
  }).where(eq(memoGenerationRuns.id, runId));
}
