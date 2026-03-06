import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export interface Citation {
  title: string;
  url: string;
  snippet: string;
  date?: string;
}

export interface MarketOverview {
  tam: number | null;
  sam: number | null;
  som: number | null;
  tamUnit: string;
  growthRate: number | null;
  growthRateBasis: string;
  marketDrivers: string[];
  marketChallenges: string[];
  sources: Citation[];
}

export interface CompetitorProfile {
  name: string;
  description: string;
  estimatedRevenue: string | null;
  fundingStage: string | null;
  totalFunding: string | null;
  marketPosition: string;
  strengths: string[];
  weaknesses: string[];
  recentNews: string[];
  sources: Citation[];
}

export interface RegulatoryItem {
  name: string;
  description: string;
  impact: "high" | "medium" | "low";
  status: "current" | "pending" | "proposed";
  jurisdiction: string;
  complianceCost: string | null;
}

export interface ComparableDeal {
  date: string;
  buyer: string;
  target: string;
  dealSize: string | null;
  evRevenue: number | null;
  evEbitda: number | null;
  dealType: string;
  sector: string;
  sources: Citation[];
}

export interface IndustryTrend {
  trend: string;
  description: string;
  impact: "positive" | "negative" | "neutral";
  timeframe: "short_term" | "medium_term" | "long_term";
  confidence: "high" | "medium" | "low";
}

export interface IndustryResearch {
  marketOverview: MarketOverview;
  competitors: CompetitorProfile[];
  regulatoryLandscape: RegulatoryItem[];
  recentTransactions: ComparableDeal[];
  industryTrends: IndustryTrend[];
  publicSentiment: {
    overallTone: "positive" | "neutral" | "negative" | "mixed";
    keyThemes: string[];
    notableArticles: Citation[];
  };
  researchConfidence: number;
  totalSourcesConsulted: number;
}

async function webSearch(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    const cseId = process.env.GOOGLE_CSE_ID;

    if (apiKey && cseId) {
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(query)}&num=5`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        return (data.items || []).map((item: any) => ({
          title: item.title || "",
          url: item.link || "",
          snippet: item.snippet || "",
        }));
      }
    }

    const newsApiKey = process.env.NEWS_API_KEY;
    if (newsApiKey) {
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=relevancy&pageSize=5&apiKey=${newsApiKey}`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        return (data.articles || []).map((a: any) => ({
          title: a.title || "",
          url: a.url || "",
          snippet: a.description || "",
        }));
      }
    }

    return [];
  } catch (err) {
    console.error("[IndustryResearch] Web search failed:", err);
    return [];
  }
}

export async function conductIndustryResearch(
  targetCompany: string,
  sector: string,
  subsector: string | null,
  geography: string,
  additionalContext: string
): Promise<IndustryResearch> {
  console.log(`[IndustryResearch] Starting research for ${targetCompany} in ${sector}`);

  const searchQueries = [
    `${sector} ${subsector || ""} market size TAM 2025 2026`,
    `${targetCompany} competitors market landscape`,
    `${sector} industry regulation compliance requirements 2026`,
    `${sector} M&A transactions acquisitions 2025 2026 multiples`,
    `${sector} industry trends technology disruption 2026`,
    `${targetCompany} news recent developments`,
    `${sector} ${subsector || ""} growth rate forecast`,
    `${targetCompany} reviews employee glassdoor`,
  ];

  const searchResults = await Promise.all(
    searchQueries.map(async (query) => {
      const results = await webSearch(query);
      return { query, results };
    })
  );

  const allResults = searchResults
    .map((sr) => `Query: "${sr.query}"\nResults:\n${sr.results.map((r) => `- ${r.title}: ${r.snippet} (${r.url})`).join("\n")}`)
    .join("\n\n");

  const totalSources = searchResults.reduce((acc, sr) => acc + sr.results.length, 0);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 12000,
    system: `You are a senior PE research analyst conducting industry due diligence. Synthesize web research results into a structured industry analysis.

Be precise with numbers. If you can't find exact figures, provide reasonable estimates with low confidence. Always cite sources.

Target: ${targetCompany}
Sector: ${sector}${subsector ? ` / ${subsector}` : ""}
Geography: ${geography}
Context: ${additionalContext}`,
    messages: [
      {
        role: "user",
        content: `Synthesize this web research into a comprehensive industry analysis:\n\n${allResults}`,
      },
    ],
    tools: [
      {
        name: "compile_research",
        description: "Compile structured industry research from web search results",
        input_schema: {
          type: "object" as const,
          properties: {
            marketOverview: {
              type: "object" as const,
              properties: {
                tam: { type: ["number", "null"] as any },
                sam: { type: ["number", "null"] as any },
                som: { type: ["number", "null"] as any },
                tamUnit: { type: "string" as const },
                growthRate: { type: ["number", "null"] as any },
                growthRateBasis: { type: "string" as const },
                marketDrivers: { type: "array" as const, items: { type: "string" as const } },
                marketChallenges: { type: "array" as const, items: { type: "string" as const } },
                sources: {
                  type: "array" as const,
                  items: {
                    type: "object" as const,
                    properties: {
                      title: { type: "string" as const },
                      url: { type: "string" as const },
                      snippet: { type: "string" as const },
                    },
                    required: ["title", "url", "snippet"],
                  },
                },
              },
              required: ["tamUnit", "growthRateBasis", "marketDrivers", "marketChallenges", "sources"],
            },
            competitors: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  name: { type: "string" as const },
                  description: { type: "string" as const },
                  estimatedRevenue: { type: ["string", "null"] as any },
                  fundingStage: { type: ["string", "null"] as any },
                  totalFunding: { type: ["string", "null"] as any },
                  marketPosition: { type: "string" as const },
                  strengths: { type: "array" as const, items: { type: "string" as const } },
                  weaknesses: { type: "array" as const, items: { type: "string" as const } },
                  recentNews: { type: "array" as const, items: { type: "string" as const } },
                  sources: {
                    type: "array" as const,
                    items: {
                      type: "object" as const,
                      properties: {
                        title: { type: "string" as const },
                        url: { type: "string" as const },
                        snippet: { type: "string" as const },
                      },
                      required: ["title", "url", "snippet"],
                    },
                  },
                },
                required: ["name", "description", "marketPosition", "strengths", "weaknesses"],
              },
            },
            regulatoryLandscape: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  name: { type: "string" as const },
                  description: { type: "string" as const },
                  impact: { type: "string" as const, enum: ["high", "medium", "low"] },
                  status: { type: "string" as const, enum: ["current", "pending", "proposed"] },
                  jurisdiction: { type: "string" as const },
                  complianceCost: { type: ["string", "null"] as any },
                },
                required: ["name", "description", "impact", "status", "jurisdiction"],
              },
            },
            recentTransactions: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  date: { type: "string" as const },
                  buyer: { type: "string" as const },
                  target: { type: "string" as const },
                  dealSize: { type: ["string", "null"] as any },
                  evRevenue: { type: ["number", "null"] as any },
                  evEbitda: { type: ["number", "null"] as any },
                  dealType: { type: "string" as const },
                  sector: { type: "string" as const },
                  sources: {
                    type: "array" as const,
                    items: {
                      type: "object" as const,
                      properties: {
                        title: { type: "string" as const },
                        url: { type: "string" as const },
                        snippet: { type: "string" as const },
                      },
                      required: ["title", "url", "snippet"],
                    },
                  },
                },
                required: ["date", "buyer", "target", "dealType", "sector"],
              },
            },
            industryTrends: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  trend: { type: "string" as const },
                  description: { type: "string" as const },
                  impact: { type: "string" as const, enum: ["positive", "negative", "neutral"] },
                  timeframe: { type: "string" as const, enum: ["short_term", "medium_term", "long_term"] },
                  confidence: { type: "string" as const, enum: ["high", "medium", "low"] },
                },
                required: ["trend", "description", "impact", "timeframe", "confidence"],
              },
            },
            publicSentiment: {
              type: "object" as const,
              properties: {
                overallTone: { type: "string" as const, enum: ["positive", "neutral", "negative", "mixed"] },
                keyThemes: { type: "array" as const, items: { type: "string" as const } },
                notableArticles: {
                  type: "array" as const,
                  items: {
                    type: "object" as const,
                    properties: {
                      title: { type: "string" as const },
                      url: { type: "string" as const },
                      snippet: { type: "string" as const },
                    },
                    required: ["title", "url", "snippet"],
                  },
                },
              },
              required: ["overallTone", "keyThemes", "notableArticles"],
            },
            researchConfidence: { type: "number" as const },
          },
          required: [
            "marketOverview", "competitors", "regulatoryLandscape",
            "recentTransactions", "industryTrends", "publicSentiment", "researchConfidence",
          ],
        },
      },
    ],
    tool_choice: { type: "tool", name: "compile_research" },
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Industry research synthesis failed");
  }

  const result = toolBlock.input as IndustryResearch;
  result.totalSourcesConsulted = totalSources;

  console.log(`[IndustryResearch] Completed: ${result.competitors.length} competitors, ${result.recentTransactions.length} comps, ${totalSources} sources`);
  return result;
}
