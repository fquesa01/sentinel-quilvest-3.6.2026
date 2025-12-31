import OpenAI from "openai";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, ilike, or, sql, and, desc } from "drizzle-orm";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export interface GrcRiskContext {
  risks: {
    id: string;
    displayId: string;
    title: string;
    description: string;
    category: string;
    status: string;
    likelihood: string;
    impact: string;
    inherentScore: number;
    residualScore: number | null;
    owner: string | null;
    mitigation: string | null;
  }[];
  controls: {
    id: string;
    controlId: string;
    title: string;
    description: string;
    type: string;
    testStatus: string;
    effectiveness: string | null;
    relatedRiskIds: string[];
  }[];
  incidents: {
    id: string;
    incidentNumber: string;
    title: string;
    description: string;
    severity: string;
    status: string;
    relatedRiskIds: string[];
  }[];
  assessments: {
    id: string;
    assessmentNumber: string;
    title: string;
    type: string;
    status: string;
    inherentScore: number;
    residualScore: number | null;
    findings: string | null;
    recommendations: string | null;
  }[];
  kris: {
    id: string;
    kriCode: string;
    name: string;
    description: string;
    category: string;
    currentValue: number | null;
    alertLevel: string | null;
    trend: string | null;
  }[];
  riskAppetite: {
    id: string;
    category: string;
    appetiteLevel: string;
    statement: string;
    toleranceMin: number | null;
    toleranceMax: number | null;
  }[];
  bowTieAnalyses: {
    id: string;
    analysisNumber: string;
    title: string;
    threatCount: number;
    consequenceCount: number;
    preventiveControlCount: number;
    mitigatingControlCount: number;
  }[];
  bcpPlans: {
    id: string;
    planNumber: string;
    title: string;
    businessFunction: string;
    priority: string;
    status: string;
    rto: number | null;
    rpo: number | null;
  }[];
}

export async function gatherGrcKnowledge(): Promise<GrcRiskContext> {
  const [risks, controls, incidents, assessments, kris, riskAppetite, bowTieAnalyses, bcpPlans] = await Promise.all([
    db.select().from(schema.grcRisks).orderBy(desc(schema.grcRisks.createdAt)).limit(100),
    db.select().from(schema.grcControls).orderBy(desc(schema.grcControls.createdAt)).limit(100),
    db.select().from(schema.grcIncidents).orderBy(desc(schema.grcIncidents.createdAt)).limit(100),
    db.select().from(schema.grcRiskAssessments).orderBy(desc(schema.grcRiskAssessments.createdAt)).limit(50),
    db.select().from(schema.grcKeyRiskIndicators).orderBy(desc(schema.grcKeyRiskIndicators.createdAt)).limit(50),
    db.select().from(schema.grcRiskAppetite).limit(20),
    db.select().from(schema.grcBowTieAnalyses).orderBy(desc(schema.grcBowTieAnalyses.createdAt)).limit(30),
    db.select().from(schema.grcBusinessContinuityPlans).orderBy(desc(schema.grcBusinessContinuityPlans.createdAt)).limit(30),
  ]);

  return {
    risks: risks.map((r, index) => ({
      id: r.id,
      displayId: `RISK-${String(index + 1).padStart(3, "0")}`,
      title: r.riskTitle,
      description: r.riskDescription,
      category: r.category,
      status: r.status,
      likelihood: r.likelihood,
      impact: r.impact,
      inherentScore: r.inherentRiskScore,
      residualScore: r.residualRiskScore,
      owner: r.riskOwner,
      mitigation: r.mitigationStrategy,
    })),
    controls: controls.map(c => ({
      id: c.id,
      controlId: c.controlId,
      title: c.controlTitle,
      description: c.controlDescription || "",
      type: c.controlType,
      testStatus: c.testStatus,
      effectiveness: c.effectiveness,
      relatedRiskIds: (c.relatedRiskIds as string[]) || [],
    })),
    incidents: incidents.map(i => ({
      id: i.id,
      incidentNumber: i.incidentNumber,
      title: i.incidentTitle,
      description: i.incidentDescription || "",
      severity: i.severity,
      status: i.status,
      relatedRiskIds: (i.relatedRiskIds as string[]) || [],
    })),
    assessments: assessments.map(a => ({
      id: a.id,
      assessmentNumber: a.assessmentNumber,
      title: a.assessmentTitle,
      type: a.assessmentType,
      status: a.status,
      inherentScore: a.inherentRiskScore,
      residualScore: a.residualRiskScore,
      findings: a.assessmentFindings,
      recommendations: a.recommendations,
    })),
    kris: kris.map(k => ({
      id: k.id,
      kriCode: k.kriCode,
      name: k.kriName,
      description: k.kriDescription,
      category: k.category,
      currentValue: k.currentValue,
      alertLevel: k.alertLevel,
      trend: k.trend,
    })),
    riskAppetite: riskAppetite.map(r => ({
      id: r.id,
      category: r.category,
      appetiteLevel: r.appetiteLevel,
      statement: r.appetiteStatement,
      toleranceMin: r.toleranceMin,
      toleranceMax: r.toleranceMax,
    })),
    bowTieAnalyses: bowTieAnalyses.map(b => ({
      id: b.id,
      analysisNumber: b.analysisNumber,
      title: b.title,
      threatCount: b.threatCount || 0,
      consequenceCount: b.consequenceCount || 0,
      preventiveControlCount: b.preventiveControlCount || 0,
      mitigatingControlCount: b.mitigatingControlCount || 0,
    })),
    bcpPlans: bcpPlans.map(p => ({
      id: p.id,
      planNumber: p.planNumber,
      title: p.planTitle,
      businessFunction: p.businessFunction,
      priority: p.priority,
      status: p.status,
      rto: p.recoveryTimeObjective,
      rpo: p.recoveryPointObjective,
    })),
  };
}

export interface AskGrcRequest {
  question: string;
  riskId?: string;
}

export interface AskGrcResponse {
  answer: string;
  confidence: number;
  citations: {
    type: "risk" | "control" | "incident";
    id: string;
    title: string;
    relevantText?: string;
  }[];
  suggestedActions?: {
    label: string;
    href: string;
  }[];
}

function formatRiskForContext(risk: GrcRiskContext["risks"][0]): string {
  return `[${risk.displayId}] ${risk.title}
Category: ${risk.category} | Status: ${risk.status}
Likelihood: ${risk.likelihood} | Impact: ${risk.impact}
Inherent Risk Score: ${risk.inherentScore}${risk.residualScore ? ` | Residual Score: ${risk.residualScore}` : ""}
Owner: ${risk.owner || "Unassigned"}
Description: ${risk.description}
${risk.mitigation ? `Mitigation Strategy: ${risk.mitigation}` : ""}`;
}

function formatControlForContext(control: GrcRiskContext["controls"][0]): string {
  return `[CONTROL ${control.controlId}] ${control.title}
Type: ${control.type} | Test Status: ${control.testStatus} | Effectiveness: ${control.effectiveness || "Not rated"}
Description: ${control.description}
Mitigates Risks: ${control.relatedRiskIds.length > 0 ? control.relatedRiskIds.join(", ") : "None linked"}`;
}

function formatIncidentForContext(incident: GrcRiskContext["incidents"][0]): string {
  return `[INCIDENT ${incident.incidentNumber}] ${incident.title}
Severity: ${incident.severity} | Status: ${incident.status}
Description: ${incident.description}
Related Risks: ${incident.relatedRiskIds.length > 0 ? incident.relatedRiskIds.join(", ") : "None linked"}`;
}

function scoreRelevance(text: string, queryTerms: string[]): number {
  const lowerText = text.toLowerCase();
  let score = 0;
  for (const term of queryTerms) {
    if (term.length < 2) continue;
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const matches = lowerText.match(regex);
    if (matches) {
      score += matches.length * (term.length > 4 ? 10 : 5);
    }
  }
  return score;
}

function extractQueryTerms(question: string): string[] {
  const stopWords = new Set([
    "who", "what", "where", "when", "why", "how", "is", "are", "was", "were",
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of",
    "with", "by", "about", "this", "that", "these", "those", "it", "they",
    "them", "their", "there", "here", "can", "could", "would", "should", "will",
    "has", "have", "had", "do", "does", "did", "be", "been", "being", "our", "my",
  ]);

  return question
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w));
}

function generateFallbackResponse(
  question: string,
  riskStats: { total: number; highRisk: number; mediumRisk: number; lowRisk: number; byCategory: Record<string, number>; byStatus: Record<string, number> },
  topRisks: any[],
  topControls: any[],
  topIncidents: any[]
): string {
  const lowerQ = question.toLowerCase();
  
  // Handle statistics questions
  if (/how many|count|total|number of/i.test(lowerQ)) {
    if (/high/i.test(lowerQ)) {
      return `There are ${riskStats.highRisk} high-risk items (score 15-25) in the risk register.`;
    }
    if (/medium/i.test(lowerQ)) {
      return `There are ${riskStats.mediumRisk} medium-risk items (score 6-14) in the risk register.`;
    }
    if (/low/i.test(lowerQ)) {
      return `There are ${riskStats.lowRisk} low-risk items (score 1-5) in the risk register.`;
    }
    return `The risk register contains ${riskStats.total} risks: ${riskStats.highRisk} high, ${riskStats.mediumRisk} medium, and ${riskStats.lowRisk} low risk.`;
  }
  
  // Handle category questions
  if (/category|categories|by type/i.test(lowerQ)) {
    const categories = Object.entries(riskStats.byCategory)
      .map(([cat, count]) => `${cat}: ${count}`)
      .join(", ");
    return `Risks by category: ${categories || "No risks categorized yet."}`;
  }
  
  // Handle top risks
  if (/top|highest|most.*risk|critical/i.test(lowerQ) && topRisks.length > 0) {
    const topThree = topRisks.slice(0, 3).map(r => 
      `- ${r.displayId}: ${r.title} (Score: ${r.inherentScore}, Status: ${r.status})`
    ).join("\n");
    return `Here are the top risks:\n${topThree}`;
  }
  
  // Default response with summary
  if (topRisks.length > 0) {
    const topRisk = topRisks[0];
    return `Based on your question, the most relevant risk is "${topRisk.title}" (${topRisk.displayId}) with an inherent score of ${topRisk.inherentScore}. The risk register contains ${riskStats.total} total risks.`;
  }
  
  return `The risk register currently contains ${riskStats.total} risks. You can view the full risk register at /risk-management/register.`;
}

export async function askAboutGrc(
  request: AskGrcRequest,
  userId: string
): Promise<AskGrcResponse> {
  const knowledge = await gatherGrcKnowledge();
  const queryTerms = extractQueryTerms(request.question);

  // Score and rank risks by relevance
  const scoredRisks = knowledge.risks.map((r) => ({
    ...r,
    score: scoreRelevance(formatRiskForContext(r), queryTerms),
  }));
  scoredRisks.sort((a, b) => b.score - a.score);

  // Score and rank controls
  const scoredControls = knowledge.controls.map((c) => ({
    ...c,
    score: scoreRelevance(formatControlForContext(c), queryTerms),
  }));
  scoredControls.sort((a, b) => b.score - a.score);

  // Score and rank incidents
  const scoredIncidents = knowledge.incidents.map((i) => ({
    ...i,
    score: scoreRelevance(formatIncidentForContext(i), queryTerms),
  }));
  scoredIncidents.sort((a, b) => b.score - a.score);

  // Take top relevant items for context
  const topRisks = scoredRisks.slice(0, 10);
  const topControls = scoredControls.slice(0, 5);
  const topIncidents = scoredIncidents.slice(0, 5);

  // Build context for AI
  const riskContext = topRisks.map(formatRiskForContext).join("\n\n");
  const controlContext = topControls.map(formatControlForContext).join("\n\n");
  const incidentContext = topIncidents.map(formatIncidentForContext).join("\n\n");

  // Get statistics
  const riskStats = {
    total: knowledge.risks.length,
    byCategory: {} as Record<string, number>,
    byStatus: {} as Record<string, number>,
    highRisk: knowledge.risks.filter((r) => r.inherentScore >= 15).length,
    mediumRisk: knowledge.risks.filter((r) => r.inherentScore >= 6 && r.inherentScore < 15).length,
    lowRisk: knowledge.risks.filter((r) => r.inherentScore < 6).length,
  };

  for (const r of knowledge.risks) {
    riskStats.byCategory[r.category] = (riskStats.byCategory[r.category] || 0) + 1;
    riskStats.byStatus[r.status] = (riskStats.byStatus[r.status] || 0) + 1;
  }

  const assessmentContext = knowledge.assessments.slice(0, 5).map(a => 
    `[${a.assessmentNumber}] ${a.title} - Type: ${a.type}, Status: ${a.status}, Inherent Score: ${a.inherentScore}${a.residualScore ? `, Residual: ${a.residualScore}` : ""}`
  ).join("\n");

  const kriContext = knowledge.kris.slice(0, 5).map(k => 
    `[${k.kriCode}] ${k.name} - Category: ${k.category}, Current: ${k.currentValue ?? "N/A"}, Alert: ${k.alertLevel || "normal"}, Trend: ${k.trend || "unknown"}`
  ).join("\n");

  const appetiteContext = knowledge.riskAppetite.map(r => 
    `${r.category}: ${r.appetiteLevel} - Tolerance: ${r.toleranceMin ?? "?"}-${r.toleranceMax ?? "?"}`
  ).join("\n");

  const bowTieContext = knowledge.bowTieAnalyses.slice(0, 5).map(b => 
    `[${b.analysisNumber}] ${b.title} - Threats: ${b.threatCount}, Preventive Controls: ${b.preventiveControlCount}, Mitigating Controls: ${b.mitigatingControlCount}, Consequences: ${b.consequenceCount}`
  ).join("\n");

  const bcpContext = knowledge.bcpPlans.slice(0, 5).map(p => 
    `[${p.planNumber}] ${p.title} - Function: ${p.businessFunction}, Priority: ${p.priority}, Status: ${p.status}, RTO: ${p.rto ? p.rto + "h" : "N/A"}, RPO: ${p.rpo ? p.rpo + "h" : "N/A"}`
  ).join("\n");

  const systemPrompt = `You are Emma, an AI assistant specializing in Governance, Risk & Compliance (GRC) for the Sentinel Counsel LLP platform. 
You have access to the organization's comprehensive GRC data including risks, controls, incidents, assessments, KRIs, risk appetite, bow-tie analyses, and business continuity plans.

RISK REGISTER SUMMARY:
- Total Risks: ${riskStats.total}
- High Risk (score 15-25): ${riskStats.highRisk}
- Medium Risk (score 6-14): ${riskStats.mediumRisk}
- Low Risk (score 1-5): ${riskStats.lowRisk}
- By Category: ${JSON.stringify(riskStats.byCategory)}
- By Status: ${JSON.stringify(riskStats.byStatus)}

RELEVANT RISKS:
${riskContext || "No risks in the system yet."}

RELEVANT CONTROLS:
${controlContext || "No controls in the system yet."}

RELEVANT INCIDENTS:
${incidentContext || "No incidents in the system yet."}

RISK ASSESSMENTS (${knowledge.assessments.length} total):
${assessmentContext || "No assessments yet."}

KEY RISK INDICATORS (${knowledge.kris.length} total):
${kriContext || "No KRIs defined yet."}

RISK APPETITE BY CATEGORY:
${appetiteContext || "No risk appetite definitions yet."}

BOW-TIE ANALYSES (${knowledge.bowTieAnalyses.length} total):
${bowTieContext || "No bow-tie analyses yet."}

BUSINESS CONTINUITY PLANS (${knowledge.bcpPlans.length} total):
${bcpContext || "No BCP plans yet."}

Answer the user's question about GRC based on this comprehensive data.
- Be specific and cite IDs (risk IDs, assessment numbers, KRI codes, BCP plan numbers) when relevant
- If asked about trends, statistics, or specific metrics, use the summary data
- Suggest actions: View assessment at /risk-management/assessments/[id], KRI at /risk-management/kris/[id], BCP at /risk-management/bcp/[id]
- Be concise but thorough
- If you don't have enough information, say so honestly`;

  // Generate AI response with fallback for missing credentials
  let answer: string;
  
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) {
    // Fallback response when AI is not available
    answer = generateFallbackResponse(request.question, riskStats, topRisks, topControls, topIncidents);
  } else {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: request.question },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });
      answer = response.choices[0]?.message?.content || "I couldn't generate a response.";
    } catch (error: any) {
      console.error("[GrcKnowledge] OpenAI API error:", error.message);
      answer = generateFallbackResponse(request.question, riskStats, topRisks, topControls, topIncidents);
    }
  }

  // Build citations from top relevant items
  const citations: AskGrcResponse["citations"] = [];
  
  for (const r of topRisks.filter((r) => r.score > 0).slice(0, 3)) {
    citations.push({
      type: "risk",
      id: r.id,
      title: `${r.displayId}: ${r.title}`,
      relevantText: r.description.slice(0, 200),
    });
  }

  for (const c of topControls.filter((c) => c.score > 0).slice(0, 2)) {
    citations.push({
      type: "control",
      id: c.id,
      title: `${c.controlId}: ${c.title}`,
      relevantText: c.description.slice(0, 200),
    });
  }

  for (const i of topIncidents.filter((i) => i.score > 0).slice(0, 2)) {
    citations.push({
      type: "incident",
      id: i.id,
      title: `${i.incidentNumber}: ${i.title}`,
      relevantText: i.description.slice(0, 200),
    });
  }

  // Suggest actions based on the question
  const suggestedActions: AskGrcResponse["suggestedActions"] = [];
  
  if (/risk.*register|all.*risk|view.*risk/i.test(request.question)) {
    suggestedActions.push({ label: "View Risk Register", href: "/risk-management/register" });
  }
  if (/dashboard|overview|summary/i.test(request.question)) {
    suggestedActions.push({ label: "View Risk Dashboard", href: "/risk-management/dashboard" });
  }
  if (topRisks.length > 0 && topRisks[0].score > 10) {
    suggestedActions.push({
      label: `View ${topRisks[0].displayId}`,
      href: `/risk-management/risk/${topRisks[0].id}`,
    });
  }

  return {
    answer,
    confidence: topRisks.some((r) => r.score > 10) ? 0.85 : 0.6,
    citations,
    suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined,
  };
}

export async function findRiskByName(riskName: string): Promise<{ id: string; title: string } | null> {
  const searchTerm = riskName.trim().toLowerCase();
  
  // Try exact match first
  const exactMatch = await db.select({
    id: schema.grcRisks.id,
    title: schema.grcRisks.riskTitle,
  })
  .from(schema.grcRisks)
  .where(
    or(
      sql`LOWER(${schema.grcRisks.riskTitle}) LIKE LOWER(${'%' + searchTerm + '%'})`,
      sql`LOWER(${schema.grcRisks.id}) LIKE LOWER(${'%' + searchTerm + '%'})`,
      sql`LOWER(${schema.grcRisks.category}) LIKE LOWER(${'%' + searchTerm + '%'})`
    )
  )
  .limit(1);

  if (exactMatch.length > 0) {
    return exactMatch[0];
  }

  return null;
}
