import { db } from "../db";
import * as schema from "@shared/schema";
import { sql, or, ilike, desc } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "",
});

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function fuzzyMatch(query: string, target: string, maxDistance: number = 2): boolean {
  const queryLower = query.toLowerCase();
  const targetLower = target.toLowerCase();
  
  if (targetLower.includes(queryLower) || queryLower.includes(targetLower)) {
    return true;
  }
  
  const queryWords = queryLower.split(/\s+/);
  const targetWords = targetLower.split(/\s+/);
  
  for (const qWord of queryWords) {
    if (qWord.length < 3) continue;
    for (const tWord of targetWords) {
      if (tWord.length < 3) continue;
      const distance = levenshteinDistance(qWord, tWord);
      const threshold = Math.max(1, Math.floor(Math.min(qWord.length, tWord.length) / 3));
      if (distance <= threshold) {
        return true;
      }
    }
  }
  return false;
}

export interface GlobalSearchResult {
  type: "case" | "deal" | "document" | "recorded_statement" | "communication" | "interview" | "grc_risk";
  id: string;
  title: string;
  description?: string;
  caseId?: string;
  caseName?: string;
  dealId?: string;
  dealName?: string;
  riskId?: string;
  riskCategory?: string;
  riskScore?: number;
  riskStatus?: string;
  relevanceScore: number;
  matchReason: string;
}

export interface SearchContext {
  userId?: string;
  currentCaseId?: string;
  currentDealId?: string;
}

export interface IntentAnalysis {
  understood: boolean;
  confidence: number;
  intent: string;
  extractedEntities: {
    caseName?: string;
    dealName?: string;
    documentName?: string;
    personName?: string;
    dateRange?: { start?: string; end?: string };
    searchQuery?: string;
    statementType?: string;
  };
  clarifyingQuestion?: string;
  suggestedMatches?: GlobalSearchResult[];
  alternativeInterpretations?: string[];
}

async function semanticSearch(query: string, limit: number = 10): Promise<GlobalSearchResult[]> {
  const results: GlobalSearchResult[] = [];
  const normalizedQuery = query.toLowerCase().trim();
  
  const stopWords = ["the", "a", "an", "to", "for", "of", "in", "on", "at", "by", "me", "my", "go", "show", "take", "open", "view", "see", "find", "get", "hand", "give", "bring", "gimme", "want", "need", "please"];
  
  const searchWords = normalizedQuery
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1)
    .filter(w => !stopWords.includes(w));

  if (searchWords.length === 0) {
    return results;
  }

  const cases = await db.select({
    id: schema.cases.id,
    title: schema.cases.title,
    description: schema.cases.description,
    caseNumber: schema.cases.caseNumber,
  })
  .from(schema.cases)
  .limit(50);

  for (const c of cases) {
    const titleLower = (c.title || "").toLowerCase();
    const descLower = (c.description || "").toLowerCase();
    const caseNumLower = (c.caseNumber || "").toLowerCase();
    const combinedText = `${titleLower} ${descLower} ${caseNumLower}`;
    
    let score = 0;
    const matchedWords: string[] = [];
    
    for (const word of searchWords) {
      if (titleLower.includes(word)) {
        score += 15;
        matchedWords.push(word);
      } else if (descLower.includes(word)) {
        score += 8;
        matchedWords.push(word);
      } else if (caseNumLower.includes(word)) {
        score += 5;
        matchedWords.push(word);
      } else if (fuzzyMatch(word, combinedText)) {
        score += 10;
        matchedWords.push(`${word} (fuzzy)`);
      }
    }
    
    if (score > 0) {
      results.push({
        type: "case",
        id: c.id,
        title: c.title,
        description: c.description || undefined,
        relevanceScore: score,
        matchReason: `Matched: ${matchedWords.join(", ")}`,
      });
    }
  }

  const deals = await db.select({
    id: schema.deals.id,
    title: schema.deals.title,
    description: schema.deals.description,
  })
  .from(schema.deals)
  .limit(50);

  for (const d of deals) {
    const titleLower = (d.title || "").toLowerCase();
    const descLower = (d.description || "").toLowerCase();
    const combinedDealText = `${titleLower} ${descLower}`;
    
    let score = 0;
    const matchedWords: string[] = [];
    
    for (const word of searchWords) {
      if (titleLower.includes(word)) {
        score += 15;
        matchedWords.push(word);
      } else if (descLower.includes(word)) {
        score += 8;
        matchedWords.push(word);
      } else if (fuzzyMatch(word, combinedDealText)) {
        score += 10;
        matchedWords.push(`${word} (fuzzy)`);
      }
    }
    
    if (score > 0) {
      results.push({
        type: "deal",
        id: d.id,
        title: d.title,
        description: d.description || undefined,
        relevanceScore: score,
        matchReason: `Matched: ${matchedWords.join(", ")}`,
      });
    }
  }

  const statements = await db.select({
    id: schema.recordedStatements.id,
    title: schema.recordedStatements.title,
    description: schema.recordedStatements.description,
    caseId: schema.recordedStatements.caseId,
    statementType: schema.recordedStatements.statementType,
  })
  .from(schema.recordedStatements)
  .limit(100);

  for (const s of statements) {
    const titleLower = (s.title || "").toLowerCase();
    const descLower = (s.description || "").toLowerCase();
    const combinedStatementText = `${titleLower} ${descLower}`;
    
    let score = 0;
    const matchedWords: string[] = [];
    
    for (const word of searchWords) {
      if (titleLower.includes(word)) {
        score += 15;
        matchedWords.push(word);
      } else if (descLower.includes(word)) {
        score += 8;
        matchedWords.push(word);
      } else if (fuzzyMatch(word, combinedStatementText)) {
        score += 10;
        matchedWords.push(`${word} (fuzzy)`);
      }
    }
    
    if (score > 0) {
      let caseName: string | undefined;
      if (s.caseId) {
        const caseInfo = cases.find(c => c.id === s.caseId);
        caseName = caseInfo?.title;
      }
      
      results.push({
        type: "recorded_statement",
        id: s.id,
        title: s.title,
        description: s.description || undefined,
        caseId: s.caseId || undefined,
        caseName,
        relevanceScore: score,
        matchReason: `Matched: ${matchedWords.join(", ")}`,
      });
    }
  }

  // Search GRC risks
  const grcRisks = await db.select({
    id: schema.grcRisks.id,
    
    riskTitle: schema.grcRisks.riskTitle,
    riskDescription: schema.grcRisks.riskDescription,
    category: schema.grcRisks.category,
    status: schema.grcRisks.status,
    inherentRiskScore: schema.grcRisks.inherentRiskScore,
    riskOwner: schema.grcRisks.riskOwner,
    mitigationStrategy: schema.grcRisks.mitigationStrategy,
  })
  .from(schema.grcRisks)
  .limit(100);

  for (const risk of grcRisks) {
    const titleLower = (risk.riskTitle || "").toLowerCase();
    const descLower = (risk.riskDescription || "").toLowerCase();
    const categoryLower = (risk.category || "").toLowerCase();
    const ownerLower = (risk.riskOwner || "").toLowerCase();
    const mitigationLower = (risk.mitigationStrategy || "").toLowerCase();
    const combinedRiskText = `${titleLower} ${descLower} ${categoryLower} ${ownerLower} ${mitigationLower}`;
    
    let score = 0;
    const matchedWords: string[] = [];
    
    for (const word of searchWords) {
      if (titleLower.includes(word)) {
        score += 15;
        matchedWords.push(word);
      } else if (descLower.includes(word)) {
        score += 10;
        matchedWords.push(word);
      } else if (categoryLower.includes(word)) {
        score += 8;
        matchedWords.push(word);
      } else if (ownerLower.includes(word)) {
        score += 5;
        matchedWords.push(word);
      } else if (mitigationLower.includes(word)) {
        score += 6;
        matchedWords.push(word);
      } else if (fuzzyMatch(word, combinedRiskText)) {
        score += 8;
        matchedWords.push(`${word} (fuzzy)`);
      }
    }
    
    // Boost score for risk-related queries
    if (/risk|compliance|grc|threat|vulnerability|control|mitigation/i.test(normalizedQuery)) {
      score += 5;
    }
    
    if (score > 0) {
      results.push({
        type: "grc_risk",
        id: risk.id,
        title: risk.riskTitle,
        description: risk.riskDescription || undefined,
        riskId: risk.id,
        riskCategory: risk.category,
        riskScore: risk.inherentRiskScore,
        riskStatus: risk.status,
        relevanceScore: score,
        matchReason: `Matched: ${matchedWords.join(", ")}`,
      });
    }
  }

  results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return results.slice(0, limit);
}

export async function analyzeUserIntent(
  userMessage: string,
  context: SearchContext
): Promise<IntentAnalysis> {
  const normalizedMessage = userMessage.toLowerCase().trim();
  
  const potentialMatches = await semanticSearch(userMessage, 5);
  
  const hasTranscriptKeywords = /transcript|hearing|deposition|trial|recording|statement/i.test(normalizedMessage);
  const hasCaseKeywords = /case|investigation|litigation|matter/i.test(normalizedMessage);
  const hasDealKeywords = /deal|transaction|project|acquisition|merger/i.test(normalizedMessage);
  const hasRiskKeywords = /risk|grc|compliance|control|mitigation|threat|vulnerability/i.test(normalizedMessage);
  const hasNavigationKeywords = /take|go|open|show|find|bring|view|gimme|hand/i.test(normalizedMessage);
  
  if (potentialMatches.length > 0) {
    const topMatch = potentialMatches[0];
    const highScore = topMatch.relevanceScore >= 15;
    const hasValidId = topMatch.id && topMatch.title;
    
    if (highScore && hasNavigationKeywords && hasValidId) {
      let intent: string = "go_to_case";
      if (topMatch.type === "deal") {
        intent = "go_to_deal";
      } else if (topMatch.type === "recorded_statement") {
        intent = "find_statement";
      } else if (topMatch.type === "grc_risk") {
        intent = "go_to_risk";
      } else if (topMatch.type === "case" && hasTranscriptKeywords) {
        intent = "go_to_case_recordings";
      }
      
      console.log(`[GlobalKnowledge] High confidence match (score=${topMatch.relevanceScore}): ${topMatch.type} "${topMatch.title}" (ID: ${topMatch.id}) -> intent=${intent}`);
      
      return {
        understood: true,
        confidence: Math.min(0.95, 0.7 + (topMatch.relevanceScore / 100)),
        intent,
        extractedEntities: {
          caseName: topMatch.type === "case" ? topMatch.title : topMatch.caseName,
          dealName: topMatch.type === "deal" ? topMatch.title : undefined,
          documentName: undefined,
          searchQuery: hasTranscriptKeywords ? "transcript" : undefined,
          statementType: hasTranscriptKeywords ? "transcript" : undefined,
        },
        suggestedMatches: potentialMatches,
      };
    }
  }
  
  const prompt = `You are Emma, an intelligent AI assistant. Understand the user's request even with typos or casual language.

User's message: "${userMessage}"

System matches found:
${potentialMatches.length > 0 
  ? potentialMatches.slice(0, 3).map(m => `- ${m.type}: "${m.title}"`).join("\n")
  : "No close matches found"}

${context.currentCaseId ? `User is currently in a case.` : ""}

Return JSON with these EXACT values for primaryAction:
- "go_to_case" - navigate to a case
- "go_to_deal" - navigate to a transaction/deal
- "go_to_case_recordings" - go to case recordings/transcripts tab
- "go_to_risk" - navigate to a GRC risk in the risk register
- "find_statement" - find a specific recorded statement
- "find_document" - find a document
- "search_emails" - search communications
- "start_video_conference" - start a new video call/meeting/conference
- "ask_about_risks" - answer questions about GRC risks, controls, incidents
- "ask_question" - general Q&A
- "unclear" - can't determine intent

{
  "understood": true/false,
  "confidence": 0.0-1.0,
  "primaryAction": "go_to_case|go_to_deal|go_to_case_recordings|go_to_risk|find_statement|find_document|search_emails|start_video_conference|ask_about_risks|ask_question|unclear",
  "extractedEntities": {
    "caseName": "case name or null",
    "dealName": "deal name or null",
    "riskName": "risk title or null",
    "statementType": "hearing|deposition|trial|transcript or null",
    "meetingTitle": "optional meeting title or null"
  },
  "clarifyingQuestion": "ask if uncertain, else null"
}

Example: "take me to hand the actos hearing transcripts" -> primaryAction: "go_to_case_recordings", caseName: "Actos"
Example: "show me the cybersecurity risk" -> primaryAction: "go_to_risk", riskName: "cybersecurity"
Example: "start a video call" -> primaryAction: "start_video_conference"
Example: "take me to a new video conferencing call" -> primaryAction: "start_video_conference"`;

  try {
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const responseText = result.text || "{}";
    let analysis;
    try {
      analysis = JSON.parse(responseText);
    } catch (parseError) {
      console.error("[GlobalKnowledge] JSON parse error:", parseError, "Response:", responseText);
      if (potentialMatches.length > 0 && hasNavigationKeywords) {
        return {
          understood: true,
          confidence: 0.6,
          intent: potentialMatches[0].type === "case" ? "go_to_case" : potentialMatches[0].type === "deal" ? "go_to_deal" : "find_statement",
          extractedEntities: {
            caseName: potentialMatches[0].type === "case" ? potentialMatches[0].title : undefined,
          },
          suggestedMatches: potentialMatches,
        };
      }
      throw parseError;
    }
    
    const validIntents = ["go_to_case", "go_to_deal", "go_to_case_recordings", "find_statement", "find_document", "search_emails", "start_video_conference", "ask_question", "unclear"];
    let intent = analysis.primaryAction || "unclear";
    if (!validIntents.includes(intent)) {
      if (intent.includes("video") || intent.includes("conference") || intent.includes("meeting")) intent = "start_video_conference";
      else if (intent.includes("case") || intent === "navigation") intent = "go_to_case";
      else if (intent.includes("deal") || intent.includes("transaction")) intent = "go_to_deal";
      else if (intent.includes("recording") || intent.includes("transcript")) intent = "go_to_case_recordings";
      else intent = "unclear";
    }
    
    const finalConfidence = analysis.confidence ?? (potentialMatches.length > 0 ? 0.6 : 0.3);
    
    let clarifyingQuestion = analysis.clarifyingQuestion || undefined;
    if (!clarifyingQuestion && finalConfidence < 0.5) {
      if (potentialMatches.length > 0) {
        clarifyingQuestion = `Did you mean "${potentialMatches[0].title}"? Please let me know if this is correct.`;
      } else {
        clarifyingQuestion = "I'm not sure I understood. Could you rephrase what you're looking for?";
      }
    }
    
    return {
      understood: analysis.understood ?? (potentialMatches.length > 0),
      confidence: finalConfidence,
      intent,
      extractedEntities: {
        caseName: analysis.extractedEntities?.caseName || undefined,
        dealName: analysis.extractedEntities?.dealName || undefined,
        documentName: analysis.extractedEntities?.documentName || undefined,
        personName: analysis.extractedEntities?.personName || undefined,
        searchQuery: analysis.extractedEntities?.searchQuery || undefined,
        statementType: analysis.extractedEntities?.statementType || undefined,
      },
      clarifyingQuestion,
      suggestedMatches: potentialMatches,
    };
  } catch (error) {
    console.error("[GlobalKnowledge] Intent analysis error:", error);
    
    if (potentialMatches.length > 0) {
      const topMatch = potentialMatches[0];
      if (topMatch.id && topMatch.title) {
        return {
          understood: true,
          confidence: 0.5,
          intent: topMatch.type === "case" ? "go_to_case" : topMatch.type === "deal" ? "go_to_deal" : "find_statement",
          extractedEntities: {
            caseName: topMatch.type === "case" ? topMatch.title : topMatch.caseName,
            dealName: topMatch.type === "deal" ? topMatch.title : undefined,
          },
          clarifyingQuestion: `I found "${topMatch.title}". Is this what you're looking for?`,
          suggestedMatches: potentialMatches,
        };
      }
    }
    
    return {
      understood: false,
      confidence: 0.2,
      intent: "unclear",
      extractedEntities: {},
      clarifyingQuestion: "I'm not sure I understood that. Could you tell me what you're looking for?",
      suggestedMatches: potentialMatches,
    };
  }
}

export async function findBestMatch(
  query: string,
  entityType?: "case" | "deal" | "document" | "recorded_statement"
): Promise<GlobalSearchResult | null> {
  const results = await semanticSearch(query, 10);
  
  if (entityType) {
    const filtered = results.filter(r => r.type === entityType);
    return filtered[0] || null;
  }
  
  return results[0] || null;
}

export async function searchAllData(
  query: string,
  options?: {
    types?: ("case" | "deal" | "document" | "recorded_statement" | "communication")[];
    caseId?: string;
    limit?: number;
  }
): Promise<GlobalSearchResult[]> {
  const results = await semanticSearch(query, options?.limit || 20);
  
  if (options?.types && options.types.length > 0) {
    return results.filter(r => options.types!.includes(r.type as any));
  }
  
  if (options?.caseId) {
    return results.filter(r => !r.caseId || r.caseId === options.caseId);
  }
  
  return results;
}

export async function getCaseWithDocuments(caseId: string): Promise<{
  case: { id: string; title: string; description?: string } | null;
  statements: { id: string; title: string; statementType: string }[];
  interviewCount: number;
  documentCount: number;
}> {
  const caseData = await db.select({
    id: schema.cases.id,
    title: schema.cases.title,
    description: schema.cases.description,
  })
  .from(schema.cases)
  .where(sql`${schema.cases.id} = ${caseId}`)
  .limit(1);

  if (caseData.length === 0) {
    return { case: null, statements: [], interviewCount: 0, documentCount: 0 };
  }

  const statements = await db.select({
    id: schema.recordedStatements.id,
    title: schema.recordedStatements.title,
    statementType: schema.recordedStatements.statementType,
  })
  .from(schema.recordedStatements)
  .where(sql`${schema.recordedStatements.caseId} = ${caseId}`);

  const interviews = await db.select({ id: schema.interviews.id })
    .from(schema.interviews)
    .where(sql`${schema.interviews.caseId} = ${caseId}`);

  const communications = await db.select({ id: schema.communications.id })
    .from(schema.communications)
    .where(sql`${schema.communications.caseId} = ${caseId}`);

  return {
    case: caseData[0],
    statements: statements.map(s => ({
      id: s.id,
      title: s.title,
      statementType: s.statementType || "other",
    })),
    interviewCount: interviews.length,
    documentCount: communications.length + statements.length,
  };
}
