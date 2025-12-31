import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, sql, desc, asc, gte, lte } from "drizzle-orm";
import { openai } from "../ai";

export interface IssueExtractionProgress {
  caseId: string;
  totalDocuments: number;
  processedDocuments: number;
  issuesFound: number;
  status: "pending" | "processing" | "completed" | "error";
  startTime: Date;
  error?: string;
}

export type IssueTopic = "legal" | "hr" | "contracts" | "finance" | "safety" | "sensitive" | "compliance" | "communications" | "operations" | "other";

export interface ExtractedIssue {
  topic: IssueTopic;
  subtopics: string[];
  issueSummary: string;
  urgencyScore: number;
  sentimentScore: number;
  peopleInvolved: string[];
  organizationsInvolved: string[];
  keywords: string[];
  riskTags: string[];
  riskLevel: "critical" | "high" | "medium" | "low";
  contractReferences: string[];
  locationReferences: string[];
  projectReferences: string[];
  deadlineReferences: string[];
  hasEscalationLanguage: boolean;
  escalationPhrases: string[];
  isAnomaly: boolean;
  anomalyType?: string;
}

const URGENCY_KEYWORDS = {
  high: [
    "urgent", "critical", "important", "immediate", "escalate", "asap", "emergency",
    "crisis", "deadline", "right away", "now", "immediately", "priority", "crucial",
    "time-sensitive", "pressing", "vital", "essential"
  ],
  moderate: [
    "please advise", "following up", "need clarification", "check in", "reminder",
    "update needed", "pending", "awaiting", "review needed", "attention needed"
  ],
  escalation: [
    "don't forward", "do not forward", "take offline", "delete after reading",
    "shouldn't put this in writing", "we need to talk now", "call me",
    "off the record", "confidential", "between us", "keep this quiet",
    "don't share", "do not share", "private", "sensitive matter",
    "potential issue", "concerned about", "worried", "problem with"
  ]
};

const TOPIC_KEYWORDS: Record<IssueTopic, string[]> = {
  legal: ["lawsuit", "litigation", "attorney", "counsel", "legal", "court", "subpoena", "law", "statute", "ruling", "testimony", "deposition", "arbitration", "settlement"],
  hr: ["employee", "termination", "harassment", "discrimination", "performance", "hr", "human resources", "complaint", "misconduct", "behavior", "firing", "hire", "onboarding", "benefits", "grievance"],
  contracts: ["contract", "agreement", "renewal", "liability", "terms", "breach", "obligation", "clause", "amendment", "negotiation", "vendor", "procurement", "nda", "sla"],
  finance: ["payment", "invoice", "budget", "revenue", "expense", "financial", "audit", "accounting", "fiscal", "cost", "price", "tax", "earnings", "margin", "capital"],
  safety: ["safety", "accident", "injury", "hazard", "osha", "incident", "risk", "dangerous", "unsafe", "health", "ehs", "environmental", "spill", "violation"],
  sensitive: ["confidential", "secret", "proprietary", "insider", "private", "personal", "investigation", "whistleblower", "ethics", "hotline"],
  compliance: ["compliance", "regulation", "regulatory", "policy", "procedure", "governance", "sox", "fcpa", "aml", "bsa", "gdpr", "kyc", "due diligence", "anti-corruption"],
  communications: ["email", "message", "meeting", "call", "conference", "memo", "announcement", "briefing", "presentation", "report"],
  operations: ["operations", "process", "workflow", "production", "supply chain", "logistics", "delivery", "shipment", "inventory", "manufacturing", "scheduling"],
  other: []
};

const extractionProgress: Map<string, IssueExtractionProgress> = new Map();
const extractionLocks: Set<string> = new Set();

export function getIssueExtractionProgress(caseId: string): IssueExtractionProgress | null {
  return extractionProgress.get(caseId) || null;
}

export function isExtractionRunning(caseId: string): boolean {
  const progress = extractionProgress.get(caseId);
  return extractionLocks.has(caseId) || (progress?.status === "processing");
}

function extractDomain(email: string): string {
  const match = email.match(/@([^@]+)$/);
  return match ? match[1].toLowerCase() : "";
}

function extractEmail(sender: string): string {
  const match = sender.match(/<([^>]+)>/);
  if (match) return match[1].toLowerCase();
  if (sender.includes("@")) return sender.toLowerCase().trim();
  return sender.toLowerCase().trim();
}

function calculateUrgencyScore(text: string): { score: number; escalationPhrases: string[] } {
  const lowerText = text.toLowerCase();
  let score = 0;
  const foundEscalationPhrases: string[] = [];

  for (const keyword of URGENCY_KEYWORDS.high) {
    if (lowerText.includes(keyword)) {
      score += 15;
    }
  }

  for (const keyword of URGENCY_KEYWORDS.moderate) {
    if (lowerText.includes(keyword)) {
      score += 5;
    }
  }

  for (const phrase of URGENCY_KEYWORDS.escalation) {
    if (lowerText.includes(phrase)) {
      score += 20;
      foundEscalationPhrases.push(phrase);
    }
  }

  return {
    score: Math.min(100, score),
    escalationPhrases: foundEscalationPhrases
  };
}

function detectTopicFromKeywords(text: string): IssueTopic {
  const lowerText = text.toLowerCase();
  const topicScores: Record<IssueTopic, number> = {
    legal: 0, hr: 0, contracts: 0, finance: 0, safety: 0, sensitive: 0, 
    compliance: 0, communications: 0, operations: 0, other: 0
  };

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (topic === "other") continue;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        topicScores[topic as IssueTopic] += 1;
      }
    }
  }

  const scoredTopics = Object.entries(topicScores).filter(([t]) => t !== "other");
  const maxTopic = scoredTopics.reduce((a, b) => a[1] > b[1] ? a : b);
  if (maxTopic[1] === 0) return "other";
  return maxTopic[0] as IssueTopic;
}

function calculateRiskLevel(
  urgencyScore: number, 
  hasEscalation: boolean, 
  topic: string,
  escalationPhrases: string[] = []
): "critical" | "high" | "medium" | "low" {
  const lowPriorityTopics = ["communications", "operations", "other"];
  const highPriorityTopics = ["legal", "compliance", "safety", "sensitive"];
  const isHighPriority = highPriorityTopics.includes(topic);
  const isLowPriority = lowPriorityTopics.includes(topic);
  
  const hasSevereEscalation = escalationPhrases.some(phrase => {
    const lower = phrase.toLowerCase();
    return ["delete after reading", "don't forward", "do not forward", "off the record", 
     "we need to talk now", "emergency", "crisis", "delete this", "don't put this in writing",
     "shouldn't put this in writing", "keep this quiet", "between us only"].some(p => lower.includes(p));
  });
  
  if (isHighPriority) {
    if (urgencyScore >= 90) return "critical";
    if (urgencyScore >= 85 && hasSevereEscalation) return "critical";
    if (urgencyScore >= 75) return "high";
    if (urgencyScore >= 60 || hasEscalation) return "high";
    if (urgencyScore >= 40) return "medium";
    return "low";
  }
  
  if (isLowPriority) {
    if (urgencyScore >= 90 && hasSevereEscalation) return "high";
    if (urgencyScore >= 70) return "medium";
    if (urgencyScore >= 50 || hasEscalation) return "medium";
    return "low";
  }
  
  if (urgencyScore >= 85 && hasSevereEscalation) return "high";
  if (urgencyScore >= 70) return "medium";
  if (urgencyScore >= 50 || hasEscalation) return "medium";
  if (urgencyScore >= 30) return "low";
  return "low";
}

async function analyzeIssueWithAI(communications: Array<{ id: string; body: string; subject: string; sender: string; timestamp: Date }>): Promise<ExtractedIssue | null> {
  if (!openai) {
    console.log("[IssueExtraction] OpenAI not available, using keyword-based analysis");
    return null;
  }

  const combinedText = communications.map(c => `Subject: ${c.subject}\n${c.body}`).join("\n---\n").substring(0, 15000);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert compliance analyst extracting issues from corporate communications.
Analyze the following communications and extract the central issue being discussed.

Return a JSON object with:
{
  "topic": "legal" | "hr" | "contracts" | "finance" | "safety" | "sensitive" | "compliance" | "communications" | "operations" | "other",
  "subtopics": ["array", "of", "specific", "subtopics"],
  "issueSummary": "2-3 sentence summary of the main issue",
  "urgencyScore": 0-100,
  "sentimentScore": -100 to 100 (-100 = very negative, 100 = very positive),
  "keywords": ["key", "terms", "discussed"],
  "riskTags": ["potential", "risk", "categories"],
  "contractReferences": ["contract numbers or names mentioned"],
  "locationReferences": ["places mentioned"],
  "projectReferences": ["project names mentioned"],
  "deadlineReferences": ["deadline dates mentioned"]
}

URGENCY SCORING CRITERIA (BE VERY STRICT - most communications should score LOW):
- 0-20 (Low): Routine business communications, meeting requests, status updates, general discussions, FYI emails, newsletters, announcements. This is where 80%+ of emails should fall.
- 21-40 (Moderate): Action items with reasonable deadlines, follow-up requests, pending decisions, general concerns raised. Still routine business.
- 41-60 (Elevated): Explicit deadline pressure, escalation to management, unresolved disputes, compliance questions, performance concerns.
- 61-79 (High): Active disputes requiring immediate attention, regulatory inquiries, formal complaints, missed critical deadlines, threats of legal action.
- 80-89 (Very High): ONLY for active investigations, confirmed policy violations, imminent regulatory action, serious safety incidents, formal legal proceedings.
- 90-100 (Critical): EXTREMELY RARE - reserve ONLY for: active fraud/misconduct discovery, imminent litigation/subpoena, safety emergencies with injury risk, regulatory enforcement actions, or explicit cover-up language like "delete this" or "don't put this in writing".

IMPORTANT: The "communications" and "operations" topics should almost NEVER score above 40 unless there is explicit crisis language. Routine meeting scheduling, project updates, and general business discussions are LOW urgency (0-20).

Topic definitions:
- legal: Lawsuits, litigation, legal counsel, court matters, depositions
- hr: Employee matters, terminations, harassment, discrimination, performance
- contracts: Agreements, vendor negotiations, NDAs, breach of contract
- finance: Payments, budgets, audits, accounting, revenue, expenses
- safety: Workplace safety, accidents, OSHA, environmental hazards
- sensitive: Confidential matters, proprietary info, investigations
- compliance: Regulatory matters, SOX, FCPA, AML, policy violations, governance
- communications: Email discussions, meetings, announcements, internal memos (usually LOW urgency)
- operations: Supply chain, logistics, production, scheduling, workflows (usually LOW urgency)
- other: Topics that don't fit the above categories

Be conservative with urgency scores. Most corporate emails are routine business - score them accordingly.`
        },
        {
          role: "user",
          content: combinedText
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    const validTopics: IssueTopic[] = ["legal", "hr", "contracts", "finance", "safety", "sensitive", "compliance", "communications", "operations", "other"];
    let topic = parsed.topic || "other";
    if (!validTopics.includes(topic)) {
      topic = "other";
    }
    
    return {
      topic: topic as IssueTopic,
      subtopics: parsed.subtopics || [],
      issueSummary: parsed.issueSummary || "",
      urgencyScore: parsed.urgencyScore || 0,
      sentimentScore: parsed.sentimentScore || 0,
      peopleInvolved: [],
      organizationsInvolved: [],
      keywords: parsed.keywords || [],
      riskTags: parsed.riskTags || [],
      riskLevel: "medium",
      contractReferences: parsed.contractReferences || [],
      locationReferences: parsed.locationReferences || [],
      projectReferences: parsed.projectReferences || [],
      deadlineReferences: parsed.deadlineReferences || [],
      hasEscalationLanguage: false,
      escalationPhrases: [],
      isAnomaly: false
    };
  } catch (error) {
    console.error("[IssueExtraction] AI analysis error:", error);
    return null;
  }
}

export async function extractIssuesFromCase(
  caseId: string,
  onProgress?: (progress: IssueExtractionProgress) => void
): Promise<{ success: boolean; issuesFound: number; error?: string }> {
  if (extractionLocks.has(caseId)) {
    console.log(`[IssueExtraction] Extraction already in progress for case ${caseId}, skipping duplicate request`);
    const existingProgress = extractionProgress.get(caseId);
    if (existingProgress) {
      return { success: true, issuesFound: existingProgress.issuesFound };
    }
    return { success: false, issuesFound: 0, error: "Extraction already in progress" };
  }

  extractionLocks.add(caseId);

  const progress: IssueExtractionProgress = {
    caseId,
    totalDocuments: 0,
    processedDocuments: 0,
    issuesFound: 0,
    status: "pending",
    startTime: new Date(),
  };
  extractionProgress.set(caseId, progress);

  try {
    await db.delete(schema.issueCommunicationLinks)
      .where(
        sql`${schema.issueCommunicationLinks.issueId} IN (
          SELECT id FROM case_issues WHERE case_id = ${caseId}
        )`
      );
    await db.delete(schema.caseIssues).where(eq(schema.caseIssues.caseId, caseId));

    const communications = await db
      .select({
        id: schema.communications.id,
        body: schema.communications.body,
        subject: schema.communications.subject,
        sender: schema.communications.sender,
        recipients: schema.communications.recipients,
        timestamp: schema.communications.timestamp,
      })
      .from(schema.communications)
      .where(eq(schema.communications.caseId, caseId))
      .orderBy(asc(schema.communications.timestamp));

    progress.totalDocuments = communications.length;
    progress.status = "processing";
    onProgress?.(progress);

    console.log(`[IssueExtraction] Starting extraction for case ${caseId} with ${communications.length} documents`);

    if (communications.length === 0) {
      progress.status = "completed";
      onProgress?.(progress);
      return { success: true, issuesFound: 0 };
    }

    const issueGroups = new Map<string, typeof communications>();
    
    for (const comm of communications) {
      const fullText = `${comm.subject || ""} ${comm.body || ""}`;
      const topic = detectTopicFromKeywords(fullText);
      
      if (!issueGroups.has(topic)) {
        issueGroups.set(topic, []);
      }
      issueGroups.get(topic)!.push(comm);
    }

    let totalIssuesCreated = 0;

    for (const [topic, groupComms] of Array.from(issueGroups.entries())) {
      if (groupComms.length === 0) continue;

      const allPeople = new Set<string>();
      const allOrgs = new Set<string>();
      const allKeywords = new Set<string>();
      const allEscalationPhrases = new Set<string>();
      let totalUrgency = 0;
      let hasEscalation = false;

      for (const comm of groupComms) {
        const senderEmail = extractEmail(comm.sender);
        if (senderEmail) {
          allPeople.add(senderEmail);
          const domain = extractDomain(senderEmail);
          if (domain) allOrgs.add(domain);
        }

        const recipients = comm.recipients as any[];
        if (Array.isArray(recipients)) {
          for (const r of recipients) {
            const email = typeof r === "string" ? extractEmail(r) : extractEmail(r.email || r.address || "");
            if (email) {
              allPeople.add(email);
              const domain = extractDomain(email);
              if (domain) allOrgs.add(domain);
            }
          }
        }

        const fullText = `${comm.subject || ""} ${comm.body || ""}`;
        const { score, escalationPhrases } = calculateUrgencyScore(fullText);
        totalUrgency += score;
        
        if (escalationPhrases.length > 0) {
          hasEscalation = true;
          escalationPhrases.forEach(p => allEscalationPhrases.add(p));
        }

        for (const [t, keywords] of Object.entries(TOPIC_KEYWORDS)) {
          if (t === topic) {
            for (const kw of keywords) {
              if (fullText.toLowerCase().includes(kw)) {
                allKeywords.add(kw);
              }
            }
          }
        }
      }

      const avgUrgency = Math.round(totalUrgency / groupComms.length);
      const escalationPhrasesArray = Array.from(allEscalationPhrases);

      let aiAnalysis: ExtractedIssue | null = null;
      if (groupComms.length <= 50) {
        aiAnalysis = await analyzeIssueWithAI(groupComms);
      }

      const finalUrgencyScore = aiAnalysis?.urgencyScore ?? avgUrgency;
      const riskLevel = calculateRiskLevel(finalUrgencyScore, hasEscalation, topic, escalationPhrasesArray);

      const timestamps = groupComms.map(c => c.timestamp).filter(Boolean);
      const dateRangeStart = timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : null;
      const dateRangeEnd = timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : null;

      const issueData = {
        caseId,
        topic: topic as any,
        subtopics: aiAnalysis?.subtopics || [],
        issueSummary: aiAnalysis?.issueSummary || `${topic.charAt(0).toUpperCase() + topic.slice(1)} related communications (${groupComms.length} messages)`,
        urgencyScore: finalUrgencyScore,
        sentimentScore: aiAnalysis?.sentimentScore || 0,
        peopleInvolved: Array.from(allPeople),
        organizationsInvolved: Array.from(allOrgs),
        messageVolume: groupComms.length,
        dateRangeStart,
        dateRangeEnd,
        keywords: aiAnalysis?.keywords || Array.from(allKeywords),
        riskTags: aiAnalysis?.riskTags || [topic],
        riskLevel: riskLevel as any,
        contractReferences: aiAnalysis?.contractReferences || [],
        locationReferences: aiAnalysis?.locationReferences || [],
        projectReferences: aiAnalysis?.projectReferences || [],
        deadlineReferences: aiAnalysis?.deadlineReferences || [],
        hasEscalationLanguage: hasEscalation,
        escalationPhrases: Array.from(allEscalationPhrases),
        isAnomaly: false,
        anomalyType: null,
        anomalyScore: 0,
        sourceCommunicationIds: groupComms.map(c => c.id),
        lastAnalyzedAt: new Date(),
        analysisVersion: "1.0.0",
      };

      const [insertedIssue] = await db.insert(schema.caseIssues).values(issueData).returning();

      for (const comm of groupComms) {
        await db.insert(schema.issueCommunicationLinks).values({
          issueId: insertedIssue.id,
          communicationId: comm.id,
          relevanceScore: 100,
        }).onConflictDoNothing();
      }

      totalIssuesCreated++;
      progress.issuesFound = totalIssuesCreated;
      progress.processedDocuments += groupComms.length;
      onProgress?.(progress);

      console.log(`[IssueExtraction] Created issue for topic "${topic}" with ${groupComms.length} messages`);

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    await detectAnomalies(caseId);

    progress.status = "completed";
    onProgress?.(progress);

    console.log(`[IssueExtraction] Completed extraction for case ${caseId}: ${totalIssuesCreated} issues found`);

    return { success: true, issuesFound: totalIssuesCreated };
  } catch (error: any) {
    console.error(`[IssueExtraction] Error extracting issues:`, error);
    progress.status = "error";
    progress.error = error.message;
    onProgress?.(progress);
    return { success: false, issuesFound: 0, error: error.message };
  } finally {
    extractionLocks.delete(caseId);
  }
}

async function detectAnomalies(caseId: string): Promise<void> {
  const issues = await db
    .select()
    .from(schema.caseIssues)
    .where(eq(schema.caseIssues.caseId, caseId));

  if (issues.length === 0) return;

  const avgVolume = issues.reduce((sum, i) => sum + i.messageVolume, 0) / issues.length;
  const avgUrgency = issues.reduce((sum, i) => sum + i.urgencyScore, 0) / issues.length;

  for (const issue of issues) {
    let isAnomaly = false;
    let anomalyType: string | null = null;
    let anomalyScore = 0;

    if (issue.messageVolume > avgVolume * 2) {
      isAnomaly = true;
      anomalyType = "volume_spike";
      anomalyScore = Math.min(100, Math.round((issue.messageVolume / avgVolume) * 30));
    }

    if (issue.urgencyScore > avgUrgency * 1.5 && issue.urgencyScore > 50) {
      isAnomaly = true;
      anomalyType = anomalyType ? `${anomalyType},urgency_spike` : "urgency_spike";
      anomalyScore = Math.max(anomalyScore, Math.round(issue.urgencyScore * 0.8));
    }

    if (issue.hasEscalationLanguage) {
      isAnomaly = true;
      anomalyType = anomalyType ? `${anomalyType},escalation_detected` : "escalation_detected";
      anomalyScore = Math.max(anomalyScore, 70);
    }

    if (isAnomaly) {
      await db
        .update(schema.caseIssues)
        .set({
          isAnomaly,
          anomalyType,
          anomalyScore,
          updatedAt: new Date(),
        })
        .where(eq(schema.caseIssues.id, issue.id));
    }
  }
}

export async function getIssuesByCase(caseId: string): Promise<schema.CaseIssue[]> {
  return db
    .select()
    .from(schema.caseIssues)
    .where(eq(schema.caseIssues.caseId, caseId))
    .orderBy(desc(schema.caseIssues.urgencyScore));
}

export async function getIssuesByPerson(caseId: string, limit = 20): Promise<Array<{ person: string; issues: schema.CaseIssue[] }>> {
  const issues = await getIssuesByCase(caseId);
  
  const personIssueMap = new Map<string, schema.CaseIssue[]>();
  
  for (const issue of issues) {
    const people = (issue.peopleInvolved as string[]) || [];
    for (const person of people) {
      if (!personIssueMap.has(person)) {
        personIssueMap.set(person, []);
      }
      personIssueMap.get(person)!.push(issue);
    }
  }

  return Array.from(personIssueMap.entries())
    .map(([person, issues]) => ({ person, issues }))
    .sort((a, b) => b.issues.length - a.issues.length)
    .slice(0, limit);
}

export async function getIssuesByDomain(caseId: string, limit = 20): Promise<Array<{ domain: string; issues: schema.CaseIssue[] }>> {
  const issues = await getIssuesByCase(caseId);
  
  const domainIssueMap = new Map<string, schema.CaseIssue[]>();
  
  for (const issue of issues) {
    const orgs = (issue.organizationsInvolved as string[]) || [];
    for (const org of orgs) {
      if (!domainIssueMap.has(org)) {
        domainIssueMap.set(org, []);
      }
      domainIssueMap.get(org)!.push(issue);
    }
  }

  return Array.from(domainIssueMap.entries())
    .map(([domain, issues]) => ({ domain, issues }))
    .sort((a, b) => b.issues.length - a.issues.length)
    .slice(0, limit);
}

export async function getIssueUrgencyData(caseId: string): Promise<Array<{ issue: schema.CaseIssue; weeklyData: Array<{ week: string; urgency: number; volume: number }> }>> {
  const issues = await getIssuesByCase(caseId);
  
  return issues.map(issue => ({
    issue,
    weeklyData: []
  }));
}

export async function getIssueTimeline(caseId: string): Promise<Array<{
  date: string;
  issues: Array<{
    id: string;
    topic: string;
    urgencyScore: number;
    sentimentScore: number;
    messageVolume: number;
  }>;
}>> {
  const issues = await getIssuesByCase(caseId);
  
  const timelineMap = new Map<string, typeof issues>();
  
  for (const issue of issues) {
    if (issue.dateRangeStart) {
      const dateKey = issue.dateRangeStart.toISOString().split("T")[0];
      if (!timelineMap.has(dateKey)) {
        timelineMap.set(dateKey, []);
      }
      timelineMap.get(dateKey)!.push(issue);
    }
  }

  return Array.from(timelineMap.entries())
    .map(([date, issues]) => ({
      date,
      issues: issues.map(i => ({
        id: i.id,
        topic: i.topic,
        urgencyScore: i.urgencyScore,
        sentimentScore: i.sentimentScore,
        messageVolume: i.messageVolume,
      }))
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getIssueInsights(caseId: string): Promise<{
  topIssues: Array<{ topic: string; count: number; avgUrgency: number }>;
  highRiskPeople: Array<{ email: string; riskScore: number }>;
  emergingTopics: string[];
  urgencySpikes: Array<{ topic: string; date: string; urgency: number }>;
  anomalies: string[];
  topicDistribution: Record<string, number>;
  riskDistribution: Record<string, number>;
  totalMessages: number;
  totalIssues: number;
}> {
  const issues = await getIssuesByCase(caseId);
  
  const topicDistribution: Record<string, number> = {};
  const topicUrgency: Record<string, { total: number; count: number }> = {};
  const riskDistribution: Record<string, number> = {};
  const personRisk: Record<string, { urgencySum: number; count: number }> = {};
  let totalMessages = 0;

  for (const issue of issues) {
    topicDistribution[issue.topic] = (topicDistribution[issue.topic] || 0) + 1;
    if (!topicUrgency[issue.topic]) {
      topicUrgency[issue.topic] = { total: 0, count: 0 };
    }
    topicUrgency[issue.topic].total += issue.urgencyScore;
    topicUrgency[issue.topic].count += 1;
    riskDistribution[issue.riskLevel] = (riskDistribution[issue.riskLevel] || 0) + 1;
    totalMessages += issue.messageVolume;
    
    const people = (issue.peopleInvolved as string[]) || [];
    for (const person of people) {
      if (!personRisk[person]) {
        personRisk[person] = { urgencySum: 0, count: 0 };
      }
      personRisk[person].urgencySum += issue.urgencyScore;
      personRisk[person].count += 1;
    }
  }

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const emergingIssues = issues.filter(i => i.dateRangeStart && new Date(i.dateRangeStart) > oneWeekAgo);
  const emergingTopics = Array.from(new Set(emergingIssues.map(i => i.topic)));

  const topIssues = Object.entries(topicDistribution)
    .map(([topic, count]) => ({
      topic,
      count,
      avgUrgency: topicUrgency[topic] ? Math.round(topicUrgency[topic].total / topicUrgency[topic].count * 10) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const highRiskPeople = Object.entries(personRisk)
    .map(([email, data]) => ({
      email,
      riskScore: Math.round(data.urgencySum / data.count * 10) / 10,
    }))
    .filter(p => p.riskScore >= 5)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 10);

  const urgencySpikes = issues
    .filter(i => i.urgencyScore >= 80 && i.dateRangeStart)
    .map(i => ({
      topic: i.topic,
      date: i.dateRangeStart!.toISOString().split("T")[0],
      urgency: i.urgencyScore,
    }))
    .slice(0, 5);

  const anomalies = issues
    .filter(i => i.isAnomaly)
    .map(i => `${i.topic}: ${i.anomalyType || "Anomaly detected"} (Urgency: ${i.urgencyScore})`)
    .slice(0, 5);

  return {
    topIssues,
    highRiskPeople,
    emergingTopics,
    urgencySpikes,
    anomalies,
    topicDistribution,
    riskDistribution,
    totalMessages,
    totalIssues: issues.length,
  };
}
