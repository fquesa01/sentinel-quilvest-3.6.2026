import Anthropic from "@anthropic-ai/sdk";
import type { ExtractionResult } from "./financial-extraction-service";
import type { IndustryResearch } from "./industry-research-service";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const PLATFORM_CAPABILITIES = {
  sentinel: {
    name: "Sentinel Counsel",
    description: "Enterprise compliance, eDiscovery, and legal operations platform",
    capabilities: {
      compliance: [
        "Automated compliance monitoring across 20+ regulatory frameworks (FCPA, SOX, BSA/AML, GDPR, etc.)",
        "AI-powered violation detection with multi-model intelligence (Claude, GPT, Gemini)",
        "Real-time alert generation with severity scoring and risk heatmaps",
        "Legal hold management and preservation workflows",
        "Whistleblower portal with anonymous intake",
      ],
      ai_analytics: [
        "Multi-model AI engine (Claude 4.6, GPT-5.4, Gemini) with automatic fallback",
        "RAG-powered document search with Gemini indexing",
        "Conversational AI assistant (Ava) for case investigation",
        "Ambient AI intelligence for real-time meeting analysis",
        "AI-powered document review and coding",
      ],
      data_ingestion: [
        "Evidence ingestion pipeline supporting 17 email formats and 9+ chat platforms",
        "Automated OCR for scanned documents",
        "Connector framework for M365, Slack, Dropbox, Google Workspace",
        "Chunked upload for large file processing (up to 500MB)",
        "ZIP extraction and batch processing",
      ],
      ediscovery: [
        "Full eDiscovery workflow: collection, review, production",
        "Bates numbering and privilege review",
        "Document coding forms and reviewer assignment",
        "Boolean and semantic search across evidence",
        "Production set management with redaction",
      ],
      security: [
        "Role-based access control (9 roles) with granular permissions",
        "Comprehensive audit logging",
        "Data room access management with watermarking",
        "Encryption at rest and in transit",
        "SOC 2 Type II compliance-ready architecture",
      ],
    },
  },
  ticketToro: {
    name: "Ticket Toro",
    description: "Live event ticketing and marketplace platform",
    capabilities: {
      commerce: [
        "End-to-end ticketing infrastructure with real-time inventory",
        "Payment processing with multi-gateway support",
        "Dynamic marketplace with buyer/seller matching",
        "White-label ticketing solutions for venues",
        "Mobile-first checkout with Apple Pay / Google Pay",
      ],
      analytics: [
        "Real-time transaction analytics and revenue dashboards",
        "Dynamic pricing intelligence with demand forecasting",
        "Customer segmentation and cohort analysis",
        "Conversion funnel optimization with A/B testing",
        "Revenue attribution and marketing ROI tracking",
      ],
      operations: [
        "Venue management with seating chart builder",
        "Event operations: scheduling, staffing, logistics",
        "Inventory management across primary and secondary markets",
        "Automated fulfillment and delivery tracking",
        "Box office POS integration",
      ],
      customer_experience: [
        "Mobile-first responsive design with PWA support",
        "Real-time push notifications and alerts",
        "Loyalty and rewards program engine",
        "Social sharing and referral system",
        "Customer support ticketing and live chat",
      ],
      data_infrastructure: [
        "Event-driven architecture for real-time processing",
        "Scalable data pipeline handling 10K+ TPS",
        "Data warehouse for historical analytics",
        "API-first design for third-party integrations",
        "CDN-backed asset delivery for global performance",
      ],
    },
  },
};

export interface Synergy {
  platform: "sentinel" | "ticketToro";
  capability: string;
  capabilityArea: string;
  description: string;
  applicabilityScore: number;
  integrationEffort: "low" | "medium" | "high";
  estimatedRevenueImpact: string;
  estimatedCostSavings: string;
  timelineMonths: number;
  implementationSteps: string[];
}

export interface TechProfile {
  currentStack: string[];
  architectureType: string;
  cloudProvider: string | null;
  dataMaturity: "nascent" | "developing" | "established" | "advanced";
  apiCapability: "none" | "basic" | "moderate" | "advanced";
  securityPosture: "weak" | "adequate" | "strong" | "enterprise";
  scalabilityAssessment: string;
  technicalDebt: string;
  teamSize: string | null;
  strengths: string[];
  weaknesses: string[];
}

export interface TechAssessment {
  targetTechProfile: TechProfile;
  sentinelSynergies: Synergy[];
  ticketToroSynergies: Synergy[];
  innovationScore: number;
  valueCreationEstimate: {
    year1: number;
    year2: number;
    year3: number;
    total3Year: number;
  };
  implementationRoadmap: Array<{
    phase: number;
    name: string;
    timeframe: string;
    synergies: string[];
    estimatedValue: number;
  }>;
  risks: Array<{
    risk: string;
    severity: "high" | "medium" | "low";
    mitigation: string;
  }>;
}

export async function assessTechInnovation(
  documents: Array<{ filename: string; extractedText: string | null; category: string }>,
  financials: ExtractionResult,
  industryResearch: IndustryResearch | null,
  dealContext: { dealName: string; sector: string; dealType: string; geography: string }
): Promise<TechAssessment> {
  console.log(`[TechAssessment] Starting assessment for ${dealContext.dealName}`);

  const techDocs = documents.filter((d) =>
    ["technology_documentation", "operational_data", "pitch_materials", "management_presentation", "corporate_docs"].includes(d.category)
  );

  const docContext = techDocs
    .map((d) => `--- ${d.filename} ---\n${d.extractedText?.slice(0, 8000) || "[No text]"}`)
    .join("\n\n")
    .slice(0, 60000);

  const competitorContext = industryResearch?.competitors
    .map((c) => `${c.name}: ${c.description}. Strengths: ${c.strengths.join(", ")}`)
    .join("\n") || "No competitor data available";

  const platformContext = JSON.stringify(PLATFORM_CAPABILITIES, null, 2);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 12000,
    system: `You are a technology due diligence specialist and platform strategy consultant. You are evaluating a target company's technology for a PE acquisition.

Your firm owns two technology platforms that could create value in portfolio companies:

${platformContext}

Evaluate the target's technology and identify specific synergies where deploying Sentinel or Ticket Toro capabilities could:
1. Increase revenue (new products, better pricing, market expansion)
2. Reduce costs (automation, efficiency, consolidation)
3. Reduce risk (compliance, security, operational)
4. Accelerate innovation (faster time-to-market, better data)

Score each synergy on a 1-10 applicability scale. Be realistic about integration effort and timelines.
For value creation estimates, use conservative multiples of the target's current revenue/EBITDA.`,
    messages: [
      {
        role: "user",
        content: `Assess the technology and innovation potential for this acquisition:

Target: ${dealContext.dealName}
Sector: ${dealContext.sector}
Deal Type: ${dealContext.dealType}
Geography: ${dealContext.geography}

Financial context:
- Revenue: ${financials.incomeStatements[0]?.revenue || "Unknown"}
- EBITDA: ${financials.incomeStatements[0]?.ebitda || "Unknown"}
- Employees from KPIs: ${financials.kpis.find((k) => k.name.toLowerCase().includes("employee"))?.value || "Unknown"}

Competitor landscape:
${competitorContext}

Documents from the target:
${docContext}`,
      },
    ],
    tools: [
      {
        name: "tech_assessment",
        description: "Structured technology and innovation assessment",
        input_schema: {
          type: "object" as const,
          properties: {
            targetTechProfile: {
              type: "object" as const,
              properties: {
                currentStack: { type: "array" as const, items: { type: "string" as const } },
                architectureType: { type: "string" as const },
                cloudProvider: { type: ["string", "null"] as any },
                dataMaturity: { type: "string" as const, enum: ["nascent", "developing", "established", "advanced"] },
                apiCapability: { type: "string" as const, enum: ["none", "basic", "moderate", "advanced"] },
                securityPosture: { type: "string" as const, enum: ["weak", "adequate", "strong", "enterprise"] },
                scalabilityAssessment: { type: "string" as const },
                technicalDebt: { type: "string" as const },
                teamSize: { type: ["string", "null"] as any },
                strengths: { type: "array" as const, items: { type: "string" as const } },
                weaknesses: { type: "array" as const, items: { type: "string" as const } },
              },
              required: ["currentStack", "architectureType", "dataMaturity", "apiCapability", "securityPosture", "scalabilityAssessment", "technicalDebt", "strengths", "weaknesses"],
            },
            sentinelSynergies: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  platform: { type: "string" as const, enum: ["sentinel"] },
                  capability: { type: "string" as const },
                  capabilityArea: { type: "string" as const },
                  description: { type: "string" as const },
                  applicabilityScore: { type: "number" as const },
                  integrationEffort: { type: "string" as const, enum: ["low", "medium", "high"] },
                  estimatedRevenueImpact: { type: "string" as const },
                  estimatedCostSavings: { type: "string" as const },
                  timelineMonths: { type: "number" as const },
                  implementationSteps: { type: "array" as const, items: { type: "string" as const } },
                },
                required: ["platform", "capability", "capabilityArea", "description", "applicabilityScore", "integrationEffort", "estimatedRevenueImpact", "estimatedCostSavings", "timelineMonths", "implementationSteps"],
              },
            },
            ticketToroSynergies: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  platform: { type: "string" as const, enum: ["ticketToro"] },
                  capability: { type: "string" as const },
                  capabilityArea: { type: "string" as const },
                  description: { type: "string" as const },
                  applicabilityScore: { type: "number" as const },
                  integrationEffort: { type: "string" as const, enum: ["low", "medium", "high"] },
                  estimatedRevenueImpact: { type: "string" as const },
                  estimatedCostSavings: { type: "string" as const },
                  timelineMonths: { type: "number" as const },
                  implementationSteps: { type: "array" as const, items: { type: "string" as const } },
                },
                required: ["platform", "capability", "capabilityArea", "description", "applicabilityScore", "integrationEffort", "estimatedRevenueImpact", "estimatedCostSavings", "timelineMonths", "implementationSteps"],
              },
            },
            innovationScore: { type: "number" as const },
            valueCreationEstimate: {
              type: "object" as const,
              properties: {
                year1: { type: "number" as const },
                year2: { type: "number" as const },
                year3: { type: "number" as const },
                total3Year: { type: "number" as const },
              },
              required: ["year1", "year2", "year3", "total3Year"],
            },
            implementationRoadmap: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  phase: { type: "number" as const },
                  name: { type: "string" as const },
                  timeframe: { type: "string" as const },
                  synergies: { type: "array" as const, items: { type: "string" as const } },
                  estimatedValue: { type: "number" as const },
                },
                required: ["phase", "name", "timeframe", "synergies", "estimatedValue"],
              },
            },
            risks: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  risk: { type: "string" as const },
                  severity: { type: "string" as const, enum: ["high", "medium", "low"] },
                  mitigation: { type: "string" as const },
                },
                required: ["risk", "severity", "mitigation"],
              },
            },
          },
          required: [
            "targetTechProfile", "sentinelSynergies", "ticketToroSynergies",
            "innovationScore", "valueCreationEstimate", "implementationRoadmap", "risks",
          ],
        },
      },
    ],
    tool_choice: { type: "tool", name: "tech_assessment" },
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Tech assessment failed: no structured output");
  }

  const result = toolBlock.input as TechAssessment;
  console.log(`[TechAssessment] Completed: innovation score ${result.innovationScore}, ${result.sentinelSynergies.length} Sentinel synergies, ${result.ticketToroSynergies.length} TT synergies`);
  return result;
}
