import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import { 
  ambientSessions, 
  ambientTranscripts, 
  ambientSuggestions,
  ambientSessionSummaries,
  cases,
  fileSearchStores,
  communications
} from "@shared/schema";
import { eq, and, desc, gte, or, ilike, sql } from "drizzle-orm";
import { queryFileSearchStore, getFileSearchStoreForCase } from "./file-search-service";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

// Initialize Anthropic client using Replit AI Integrations
const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

export interface BooleanSearchQuery {
  query: string;
  topic: string;
  rationale: string;
  riskLevel: "high" | "medium" | "low";
}

export interface SearchIntent {
  topic: string;
  searchTerms: string[];
  rationale: string;
}

export interface AnalysisResult {
  suggestions: Array<{
    suggestionType: "document" | "email" | "person" | "date" | "topic" | "discrepancy" | "verification" | "summary" | "action_item" | "key_point";
    triggerQuote: string;
    explanation: string;
    userPrompt: string;
    searchQuery: string;
    documentIds?: string[];
    confidence: "high" | "medium" | "low";
  }>;
}

export interface RealtimeSummaryInsight {
  type: "summary" | "action_item" | "key_point";
  content: string;
  context: string;
  confidence: "high" | "medium" | "low";
}

export interface SessionSummary {
  summary: string;
  keyTopics: string[];
  actionItems: string[];
  documentMentions: string[];
}

function extractKeywordsFromText(text: string): string[] {
  const keywords: string[] = [];
  const lowerText = text.toLowerCase();
  
  // Extract capitalized names (potential people names)
  const namePattern = /\b([A-Z][a-z]+)\b/g;
  const names = text.match(namePattern) || [];
  names.forEach(name => {
    if (name.length >= 3 && !['The', 'This', 'That', 'And', 'But', 'For', 'You', 'They', 'Can', 'Get', 'Has', 'Was', 'Are', 'Our', 'All'].includes(name)) {
      keywords.push(name.toLowerCase());
    }
  });
  
  // Financial/legal document keywords
  const docKeywords = [
    'financial', 'financials', 'tax', 'taxes', 'return', 'returns', 
    'quarterly', 'annual', 'report', 'reports', 'audit', 'audited', 'auditor', 'auditors',
    '990', 'budget', 'expense', 'expenses', 'revenue', 'income', 'statement',
    'invoice', 'invoices', 'payment', 'contract', 'agreement', 'records', 'books',
    'kpmg', 'ey', 'deloitte', 'pwc', 'accountant', 'cpa', 'olympic', 'usopc', 'usoc'
  ];
  
  docKeywords.forEach(kw => {
    if (lowerText.includes(kw)) {
      keywords.push(kw);
    }
  });
  
  // Extract email-like terms (usernames)
  const emailPattern = /\b([a-z]+@[a-z]+\.[a-z]+)\b/gi;
  const emails = text.match(emailPattern) || [];
  emails.forEach(email => keywords.push(email.split('@')[0]));
  
  return Array.from(new Set(keywords)).slice(0, 10);
}

// Claude-powered boolean query generation for intelligent document search
export async function generateBooleanSearchQueries(transcriptText: string): Promise<BooleanSearchQuery[]> {
  if (!transcriptText || transcriptText.length < 50) {
    return [];
  }
  
  const prompt = `You are an expert legal compliance analyst reviewing a live meeting transcript. 
Your task is to generate precise search queries that would find relevant documents, emails, or records in a document management system.

TRANSCRIPT (last 60 seconds):
"${transcriptText.substring(0, 3000)}"

Generate up to 3 search queries based on what was discussed. Each query should focus on ONE key topic and use simple boolean structure.

QUERY FORMAT RULES (IMPORTANT - follow exactly):
- Use quoted phrases for exact multi-word matches: "audit report"
- Use AND to require multiple terms: "KPMG" AND "financial"
- Use OR only within parentheses for alternatives: "KPMG" AND ("audit" OR "review")
- Keep queries simple: Term1 AND Term2 AND (Alt1 OR Alt2) - maximum 1 level of nesting
- DO NOT use nested parentheses like ((A AND B) OR C)

Examples of GOOD queries (follow this pattern):
- "KPMG" AND "audit" AND 2023
- "Scott" AND ("payment" OR "invoice")
- "Form 990" AND "tax return"
- financial AND ("quarterly report" OR "annual report")

Examples of BAD queries (DO NOT use):
- ((A AND B) OR C) AND D  <- nested parentheses
- A OR (B AND (C OR D))   <- complex nesting

Return a JSON array with this exact structure:
[
  {
    "query": "the search query string",
    "topic": "brief 2-5 word description",
    "rationale": "why this is relevant",
    "riskLevel": "high" | "medium" | "low"
  }
]

Risk levels:
- "high": potential violations, fraud, cover-ups, deleted records
- "medium": financial irregularities, compliance concerns  
- "low": routine document inquiries

IMPORTANT: Return valid JSON only. If nothing relevant is discussed, return an empty array [].`;

  try {
    console.log(`[AmbientAI-Claude] Generating boolean queries from transcript (${transcriptText.length} chars)`);
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [
        { role: "user", content: prompt }
      ],
    });
    
    // Extract text from all text content blocks
    let responseText = "";
    for (const block of response.content) {
      if (block.type === "text") {
        responseText += block.text;
      }
    }
    
    if (!responseText) {
      console.warn("[AmbientAI-Claude] No text content in response");
      return [];
    }
    
    const cleanedText = responseText.replace(/```json\n?|\n?```/g, "").trim();
    
    console.log(`[AmbientAI-Claude] Raw response: ${cleanedText.substring(0, 300)}`);
    
    let parsed: any[];
    try {
      parsed = JSON.parse(cleanedText);
    } catch (parseError) {
      // Try to repair truncated JSON
      if (cleanedText.startsWith('[')) {
        const lastBrace = cleanedText.lastIndexOf('}');
        if (lastBrace > 0) {
          try {
            parsed = JSON.parse(cleanedText.substring(0, lastBrace + 1) + ']');
          } catch {
            console.warn("[AmbientAI-Claude] Could not repair JSON:", parseError);
            return [];
          }
        } else {
          console.warn("[AmbientAI-Claude] Invalid JSON structure");
          return [];
        }
      } else {
        console.warn("[AmbientAI-Claude] Response is not a JSON array:", cleanedText.substring(0, 100));
        return [];
      }
    }
    
    if (!Array.isArray(parsed)) {
      console.warn("[AmbientAI-Claude] Parsed result is not an array");
      return [];
    }
    
    // Validate each query object has required fields
    const queries: BooleanSearchQuery[] = parsed
      .slice(0, 3)
      .filter((item: any) => {
        const isValid = item && 
          typeof item.query === "string" && 
          item.query.length > 0 &&
          typeof item.topic === "string";
        if (!isValid) {
          console.warn("[AmbientAI-Claude] Skipping invalid query item:", item);
        }
        return isValid;
      })
      .map((item: any) => ({
        query: String(item.query).substring(0, 500),
        topic: String(item.topic || "Search query").substring(0, 100),
        rationale: String(item.rationale || "").substring(0, 300),
        riskLevel: ["high", "medium", "low"].includes(item.riskLevel) ? item.riskLevel : "low",
      }));
    
    console.log(`[AmbientAI-Claude] Generated ${queries.length} valid boolean queries`);
    return queries;
    
  } catch (error) {
    console.error("[AmbientAI-Claude] Boolean query generation failed:", error);
    return [];
  }
}

// Parsed boolean query structure
interface ParsedBooleanQuery {
  andGroups: string[][]; // Each inner array contains terms that are ORed together, outer arrays are ANDed
  phrases: string[]; // Quoted exact phrases
  isSupported: boolean; // Whether the query structure is supported
  simplifiedQuery?: string; // Simplified version if original was unsupported
}

// Validate if a query is in a supported format
function isQuerySupported(query: string): { supported: boolean; reason?: string } {
  // Check for nested parentheses: ((... or (...(
  const nestedParens = /\([^)]*\(/;
  if (nestedParens.test(query)) {
    return { supported: false, reason: "Nested parentheses not supported" };
  }
  
  // Check for OR at top level (not in parentheses): A OR B AND C
  // Supported: A AND (B OR C)
  // Not supported: A OR (B AND C), (A AND B) OR C
  let outsideParens = query;
  // Remove all parenthesized content
  while (outsideParens.includes('(')) {
    outsideParens = outsideParens.replace(/\([^()]*\)/g, ' REMOVED ');
  }
  
  // If there's still OR outside parentheses (not as part of REMOVED), it's not supported
  if (/\bOR\b/i.test(outsideParens)) {
    return { supported: false, reason: "Top-level OR without parentheses not supported" };
  }
  
  return { supported: true };
}

// Simplify an unsupported query by extracting key terms
function simplifyQuery(query: string): string {
  // Extract all quoted phrases
  const phrases = query.match(/"[^"]+"/g) || [];
  
  // Extract unquoted terms (not operators)
  const terms = query
    .replace(/"[^"]+"/g, '') // Remove quoted phrases
    .replace(/\b(AND|OR)\b/gi, ' ') // Remove operators
    .replace(/[()]/g, ' ') // Remove parentheses
    .split(/\s+/)
    .filter(t => t.length >= 2);
  
  // Combine with AND
  const allTerms = [...phrases, ...terms.slice(0, 5)];
  return allTerms.join(' AND ');
}

// Parse boolean query into structured representation
function parseBooleanQuery(query: string): ParsedBooleanQuery {
  const result: ParsedBooleanQuery = { andGroups: [], phrases: [], isSupported: true };
  
  // Check if query is in a supported format
  const validation = isQuerySupported(query);
  if (!validation.supported) {
    console.warn(`[AmbientAI] Query format not fully supported: ${validation.reason}. Simplifying query.`);
    const simplified = simplifyQuery(query);
    console.log(`[AmbientAI] Simplified query: "${simplified}"`);
    result.isSupported = false;
    result.simplifiedQuery = simplified;
    // Parse the simplified query instead
    query = simplified;
  }
  
  // Extract quoted phrases first and replace with placeholders
  const quotedPhrases: string[] = [];
  let processedQuery = query.replace(/"([^"]+)"/g, (match, phrase) => {
    quotedPhrases.push(phrase.trim());
    return `__PHRASE${quotedPhrases.length - 1}__`;
  });
  result.phrases = quotedPhrases;
  
  // Split by AND first (highest precedence in our parsing)
  const andParts = processedQuery.split(/\s+AND\s+/i);
  
  for (const andPart of andParts) {
    // For each AND part, split by OR
    const orTerms = andPart.split(/\s+OR\s+/i);
    const group: string[] = [];
    
    for (let term of orTerms) {
      // Clean up the term
      term = term.replace(/[()]/g, '').trim();
      
      // Check if it's a phrase placeholder
      const phraseMatch = term.match(/__PHRASE(\d+)__/);
      if (phraseMatch) {
        const phraseIndex = parseInt(phraseMatch[1]);
        if (quotedPhrases[phraseIndex]) {
          group.push(quotedPhrases[phraseIndex]);
        }
      } else if (term.length >= 2) {
        group.push(term);
      }
    }
    
    if (group.length > 0) {
      result.andGroups.push(group);
    }
  }
  
  console.log(`[AmbientAI] Parsed query structure:`, JSON.stringify(result));
  return result;
}

// Build SQL condition for a single term (searches across fields)
function buildTermCondition(term: string) {
  return or(
    ilike(communications.subject, `%${term}%`),
    ilike(communications.body, `%${term}%`),
    ilike(communications.sender, `%${term}%`),
    sql`${communications.recipients}::text ILIKE ${'%' + term + '%'}`
  );
}

// Execute boolean search against case documents
export async function executeBooleanSearch(
  caseId: string, 
  booleanQuery: string
): Promise<Array<{ id: string; subject: string | null; sender: string | null; riskLevel: string | null; matchType: string }>> {
  const results: Array<{ id: string; subject: string | null; sender: string | null; riskLevel: string | null; matchType: string }> = [];
  
  try {
    console.log(`[AmbientAI] Executing boolean search in case ${caseId}: ${booleanQuery}`);
    
    const parsed = parseBooleanQuery(booleanQuery);
    
    // If no terms found, return empty
    if (parsed.andGroups.length === 0 && parsed.phrases.length === 0) {
      return results;
    }
    
    // Build the SQL condition respecting AND/OR semantics
    const andConditions: any[] = [];
    
    // Each andGroup represents terms that are ORed together
    for (const orGroup of parsed.andGroups) {
      if (orGroup.length === 1) {
        // Single term, just search for it
        andConditions.push(buildTermCondition(orGroup[0]));
      } else if (orGroup.length > 1) {
        // Multiple terms ORed together
        const orConditions = orGroup.map(term => buildTermCondition(term));
        andConditions.push(or(...orConditions));
      }
    }
    
    // All phrases must match (they're ANDed by default if not in OR groups)
    for (const phrase of parsed.phrases) {
      // Check if phrase was already included in an andGroup
      const alreadyIncluded = parsed.andGroups.some(group => group.includes(phrase));
      if (!alreadyIncluded) {
        andConditions.push(buildTermCondition(phrase));
      }
    }
    
    if (andConditions.length === 0) {
      return results;
    }
    
    // Combine all AND conditions
    const combinedCondition = andConditions.length === 1 
      ? andConditions[0] 
      : and(...andConditions);
    
    const matchingComms = await db
      .select({ 
        id: communications.id, 
        subject: communications.subject,
        sender: communications.sender,
        riskLevel: communications.riskLevel
      })
      .from(communications)
      .where(and(
        eq(communications.caseId, caseId),
        combinedCondition
      ))
      .orderBy(desc(communications.createdAt))
      .limit(15);
    
    console.log(`[AmbientAI] Boolean search found ${matchingComms.length} results`);
    
    const matchType = parsed.andGroups.length > 1 ? "all_groups" : 
                      parsed.andGroups[0]?.length > 1 ? "any_term" : "exact";
    
    return matchingComms.map(c => ({
      id: c.id,
      subject: c.subject,
      sender: c.sender,
      riskLevel: c.riskLevel,
      matchType
    }));
    
  } catch (error) {
    console.error("[AmbientAI] Boolean search failed:", error);
    return results;
  }
}

async function extractSearchIntents(transcriptText: string): Promise<SearchIntent[]> {
  const prompt = `You are analyzing a live meeting transcript for a legal compliance platform.
Extract specific entities and search terms that could help find relevant documents, emails, or records.

TRANSCRIPT:
"${transcriptText.substring(0, 2000)}"

Return a JSON array with up to 3 items. Each item should identify a SPECIFIC topic or entity mentioned.
Focus on:
- People names (e.g., "Scott", "Mike", "Christopher")  
- Organizations (e.g., "KPMG", "USOPC", "EY")
- Document types (e.g., "tax returns", "financials", "990 forms", "quarterly reports")
- Specific topics or subjects discussed

Format each item as:
{"topic":"brief description","searchTerms":["specific","search","terms"],"rationale":"why this is relevant"}

IMPORTANT: Always extract at least one item if the transcript mentions any names, organizations, document types, or specific topics.
Return [] ONLY if the transcript is completely empty or unintelligible.`;

  let aiIntents: SearchIntent[] = [];
  
  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0.3,
        maxOutputTokens: 500,
      },
    });
    
    const responseText = (result as any).candidates?.[0]?.content?.parts?.[0]?.text ?? 
                         (result as any).response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
    const cleanedText = responseText.replace(/```json\n?|\n?```/g, "").trim();
    
    console.log(`[AmbientAI] Raw AI response: ${cleanedText.substring(0, 200)}`);
    
    let parsed: any[];
    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      if (cleanedText.startsWith('[')) {
        const lastBrace = cleanedText.lastIndexOf('}');
        if (lastBrace > 0) {
          try {
            parsed = JSON.parse(cleanedText.substring(0, lastBrace + 1) + ']');
          } catch {
            console.warn("[AmbientAI] Could not repair JSON");
            parsed = [];
          }
        } else {
          parsed = [];
        }
      } else {
        parsed = [];
      }
    }
    
    if (Array.isArray(parsed)) {
      aiIntents = parsed.slice(0, 3).map((item: any) => ({
        topic: String(item.topic || "").substring(0, 100),
        searchTerms: Array.isArray(item.searchTerms) ? item.searchTerms.slice(0, 5).map((t: any) => String(t)) : [],
        rationale: String(item.rationale || "").substring(0, 200),
      })).filter((i: SearchIntent) => i.searchTerms.length > 0);
    }
  } catch (error) {
    console.error("[AmbientAI] AI search intent extraction failed:", error);
  }
  
  // Fallback: extract keywords directly from text if AI didn't find anything
  if (aiIntents.length === 0) {
    console.log("[AmbientAI] AI returned no intents, using fallback keyword extraction");
    const keywords = extractKeywordsFromText(transcriptText);
    if (keywords.length > 0) {
      aiIntents.push({
        topic: "Keywords from conversation",
        searchTerms: keywords,
        rationale: "Extracted from transcript text",
      });
      console.log(`[AmbientAI] Fallback extracted ${keywords.length} keywords: ${keywords.join(', ')}`);
    }
  }
  
  return aiIntents;
}

async function searchCaseDocuments(caseId: string, searchTerms: string[]): Promise<string[]> {
  const documentIds: string[] = [];
  
  if (searchTerms.length === 0) return documentIds;
  
  try {
    // Build search conditions for each term
    const validTerms = searchTerms.filter(t => t.length >= 2).slice(0, 8);
    if (validTerms.length === 0) return documentIds;
    
    console.log(`[AmbientAI] Searching case ${caseId} for terms: ${validTerms.join(', ')}`);
    
    // Build individual field conditions for each term, searching across all relevant fields
    const termConditions = validTerms.map((term: string) => 
      or(
        ilike(communications.subject, `%${term}%`),
        ilike(communications.body, `%${term}%`),
        ilike(communications.sender, `%${term}%`),
        sql`${communications.recipients}::text ILIKE ${'%' + term + '%'}`
      )
    );
    
    // Combine term conditions - if only one term, use it directly, otherwise wrap in or()
    const combinedCondition = termConditions.length === 1 
      ? termConditions[0]
      : or(...termConditions);
    
    const matchingComms = await db
      .select({ 
        id: communications.id, 
        subject: communications.subject,
        sender: communications.sender,
        riskLevel: communications.riskLevel
      })
      .from(communications)
      .where(and(
        eq(communications.caseId, caseId),
        combinedCondition
      ))
      .orderBy(desc(communications.createdAt))
      .limit(10);
    
    if (matchingComms.length > 0) {
      console.log(`[AmbientAI] Found ${matchingComms.length} matching documents: ${matchingComms.map(c => c.subject || c.id).join(', ')}`);
      return matchingComms.map(c => c.id);
    } else {
      console.log(`[AmbientAI] No documents found for terms in case ${caseId}`);
    }
  } catch (error) {
    console.error("[AmbientAI] Document search failed:", error);
  }
  
  return documentIds;
}

// Generate real-time summary insights from transcript chunk
export async function generateRealtimeSummaryInsights(
  transcriptText: string
): Promise<RealtimeSummaryInsight[]> {
  if (!transcriptText || transcriptText.length < 100) {
    return [];
  }
  
  const prompt = `Analyze this meeting transcript segment and extract key insights that would be valuable for a legal/compliance professional.

TRANSCRIPT (recent segment):
"${transcriptText.substring(0, 3000)}"

Generate insights in these categories:
1. SUMMARY: A brief 1-2 sentence overview of the main discussion point
2. KEY_POINT: Important facts, decisions, or statements mentioned
3. ACTION_ITEM: Tasks, follow-ups, or next steps mentioned or implied

Return a JSON array with this structure:
[
  {
    "type": "summary" | "key_point" | "action_item",
    "content": "The insight text (keep concise, 1-2 sentences max)",
    "context": "Brief context about why this is important",
    "confidence": "high" | "medium" | "low"
  }
]

Rules:
- Only include genuinely important insights
- Maximum 3-4 insights total
- Be concise and actionable
- If no meaningful insights, return empty array []
- Return valid JSON only`;

  try {
    console.log(`[AmbientAI-Summary] Generating real-time insights from ${transcriptText.length} chars`);
    
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0.3,
        maxOutputTokens: 1000,
      },
    });
    
    const responseText = (result as any).candidates?.[0]?.content?.parts?.[0]?.text ?? 
                         (result as any).response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
    const cleanedText = responseText.replace(/```json\n?|\n?```/g, "").trim();
    
    let parsed: any[];
    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      console.warn("[AmbientAI-Summary] Failed to parse JSON:", cleanedText.substring(0, 100));
      return [];
    }
    
    if (!Array.isArray(parsed)) {
      return [];
    }
    
    const insights: RealtimeSummaryInsight[] = parsed
      .slice(0, 4)
      .filter((item: any) => 
        item && 
        ["summary", "key_point", "action_item"].includes(item.type) &&
        typeof item.content === "string" &&
        item.content.length > 0
      )
      .map((item: any) => ({
        type: item.type as "summary" | "action_item" | "key_point",
        content: String(item.content).substring(0, 300),
        context: String(item.context || "").substring(0, 200),
        confidence: ["high", "medium", "low"].includes(item.confidence) ? item.confidence : "medium",
      }));
    
    console.log(`[AmbientAI-Summary] Generated ${insights.length} real-time insights`);
    return insights;
    
  } catch (error) {
    console.error("[AmbientAI-Summary] Failed to generate insights:", error);
    return [];
  }
}

export async function analyzeTranscriptChunk(
  sessionId: string,
  recentTranscriptText: string,
  caseId: string | null
): Promise<AnalysisResult> {
  const suggestions: AnalysisResult["suggestions"] = [];
  
  if (!recentTranscriptText || recentTranscriptText.length < 50) {
    return { suggestions };
  }
  
  try {
    // Step 0: Generate real-time summary insights
    const summaryInsights = await generateRealtimeSummaryInsights(recentTranscriptText);
    for (const insight of summaryInsights) {
      suggestions.push({
        suggestionType: insight.type,
        triggerQuote: insight.content,
        explanation: insight.context,
        userPrompt: insight.content,
        searchQuery: "",
        confidence: insight.confidence,
      });
    }
    console.log(`[AmbientAI] Added ${summaryInsights.length} summary insights`);
    
    // Step 1: Extract search intents from the conversation
    const searchIntents = await extractSearchIntents(recentTranscriptText);
    console.log(`[AmbientAI] Extracted ${searchIntents.length} search intents`);
    
    if (searchIntents.length === 0) {
      return { suggestions };
    }
    
    // Step 2: For each intent, search case documents
    for (const intent of searchIntents) {
      let documentIds: string[] = [];
      
      if (caseId) {
        documentIds = await searchCaseDocuments(caseId, intent.searchTerms);
      }
      
      // Only add suggestion if we found documents
      if (documentIds.length > 0) {
        suggestions.push({
          suggestionType: "document",
          triggerQuote: intent.topic,
          explanation: intent.rationale,
          userPrompt: `Found ${documentIds.length} relevant document${documentIds.length > 1 ? 's' : ''} for: "${intent.topic}"`,
          searchQuery: intent.searchTerms.join(" "),
          documentIds,
          confidence: documentIds.length >= 3 ? "high" : documentIds.length >= 2 ? "medium" : "low",
        });
        console.log(`[AmbientAI] Created suggestion for "${intent.topic}" with ${documentIds.length} docs`);
      }
    }
  } catch (error) {
    console.error("[AmbientAI] Analysis failed:", error);
  }
  
  return { suggestions };
}

export async function processAndStoreSuggestions(
  sessionId: string,
  recentTranscriptText: string,
  caseId: string | null,
  timestampMs: number
): Promise<number> {
  const result = await analyzeTranscriptChunk(sessionId, recentTranscriptText, caseId);
  
  if (result.suggestions.length === 0) {
    return 0;
  }
  
  for (const suggestion of result.suggestions) {
    await db.insert(ambientSuggestions).values({
      sessionId,
      suggestionType: suggestion.suggestionType,
      triggerQuote: suggestion.triggerQuote,
      explanation: suggestion.explanation,
      userPrompt: suggestion.userPrompt,
      searchQuery: suggestion.searchQuery,
      documentIds: suggestion.documentIds || null,
      confidence: suggestion.confidence,
      status: "pending",
      timestampMs,
    });
  }
  
  console.log(`[AmbientAI] Stored ${result.suggestions.length} suggestions for session ${sessionId}`);
  return result.suggestions.length;
}

export async function generateSessionSummary(sessionId: string): Promise<SessionSummary> {
  const transcripts = await db
    .select()
    .from(ambientTranscripts)
    .where(eq(ambientTranscripts.sessionId, sessionId))
    .orderBy(ambientTranscripts.timestampMs);
  
  if (transcripts.length === 0) {
    return {
      summary: "No transcript content available for this session.",
      keyTopics: [],
      actionItems: [],
      documentMentions: [],
    };
  }
  
  const fullTranscript = transcripts.map(t => t.content).join(" ");
  
  const summaryPrompt = `You are summarizing a legal/compliance meeting or interview transcript.

Transcript:
"${fullTranscript.substring(0, 15000)}"

Provide a structured summary in JSON format:
{
  "summary": "A 2-3 paragraph executive summary of the key discussion points",
  "keyTopics": ["topic1", "topic2", ...],
  "actionItems": ["action1", "action2", ...],
  "documentMentions": ["any documents, contracts, or evidence mentioned"]
}

Respond ONLY with valid JSON, no other text.`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: summaryPrompt }] }],
      config: {
        temperature: 0.4,
        maxOutputTokens: 2000,
      },
    });
    
    const responseText = (result as any).candidates?.[0]?.content?.parts?.[0]?.text ?? (result as any).response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const cleanedText = responseText.replace(/```json\n?|\n?```/g, "").trim();
    
    const parsed = JSON.parse(cleanedText);
    
    await db.insert(ambientSessionSummaries).values({
      sessionId,
      summaryText: parsed.summary || "",
      keyMoments: parsed.keyTopics?.map((t: string, i: number) => ({ timestamp_ms: i * 1000, description: t, type: "topic" })) || [],
      actionItems: parsed.actionItems?.map((a: string) => ({ description: a, assignee: null, dueDate: null })) || [],
      documentsReferenced: parsed.documentMentions?.map((d: string) => ({ doc_id: null, title: d, status: "mentioned" })) || [],
    });
    
    return {
      summary: parsed.summary || "",
      keyTopics: parsed.keyTopics || [],
      actionItems: parsed.actionItems || [],
      documentMentions: parsed.documentMentions || [],
    };
  } catch (error) {
    console.error("[AmbientAI] Summary generation failed:", error);
    return {
      summary: "Failed to generate summary.",
      keyTopics: [],
      actionItems: [],
      documentMentions: [],
    };
  }
}

export async function getRecentTranscriptText(
  sessionId: string,
  windowMs: number = 60000
): Promise<string> {
  // Use createdAt for time-based filtering since timestampMs stores relative session time
  const cutoffDate = new Date(Date.now() - windowMs);
  
  const transcripts = await db
    .select()
    .from(ambientTranscripts)
    .where(
      and(
        eq(ambientTranscripts.sessionId, sessionId),
        gte(ambientTranscripts.createdAt, cutoffDate)
      )
    )
    .orderBy(ambientTranscripts.createdAt);
  
  console.log(`[AmbientAI] getRecentTranscriptText: Found ${transcripts.length} transcripts in last ${windowMs/1000}s for session ${sessionId}`);
  
  return transcripts.map(t => t.content).join(" ");
}

export async function summarizeDocumentWithContext(
  documentId: string,
  context: string
): Promise<string> {
  const [doc] = await db
    .select()
    .from(communications)
    .where(eq(communications.id, documentId));
  
  if (!doc) {
    throw new Error("Document not found");
  }
  
  const documentContent = doc.body || doc.subject || "(No content)";
  const documentTitle = doc.subject || "(No subject)";
  const truncatedContent = documentContent.substring(0, 3000);
  
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `You are helping a lawyer during a live meeting. They heard "${context}" and need to quickly understand if this document is relevant.

DOCUMENT: ${documentTitle}
TYPE: ${doc.communicationType || "unknown"}
FROM: ${doc.sender || "Unknown"}
DATE: ${doc.createdAt || "Unknown"}
CONTENT (first 3000 chars):
${truncatedContent}

Provide a 2-3 sentence summary that:
1. States what this document IS (contract, email, invoice, etc.)
2. Highlights anything relevant to "${context}"
3. Notes any red flags or key dates

Be direct. No preamble. Start with "This is a..."`
      }]
    });
    
    const textContent = response.content.find(c => c.type === "text");
    return textContent ? textContent.text : "Unable to generate summary.";
  } catch (error) {
    console.error("[AmbientAI] Error summarizing document:", error);
    throw new Error("Failed to summarize document");
  }
}

export async function triggerAnalysisForSession(
  sessionId: string
): Promise<{ suggestionsGenerated: number }> {
  console.log(`[AmbientAI] triggerAnalysisForSession called for session ${sessionId}`);
  
  const [session] = await db
    .select()
    .from(ambientSessions)
    .where(eq(ambientSessions.id, sessionId));
  
  if (!session) {
    console.log(`[AmbientAI] Session ${sessionId} not found`);
    throw new Error("Session not found");
  }
  
  console.log(`[AmbientAI] Session found, caseId: ${session.caseId}`);
  
  const recentText = await getRecentTranscriptText(sessionId, 120000);
  
  console.log(`[AmbientAI] Recent transcript text length: ${recentText.length} chars`);
  
  if (!recentText || recentText.length < 100) {
    console.log(`[AmbientAI] Insufficient transcript text (< 100 chars), skipping analysis`);
    return { suggestionsGenerated: 0 };
  }
  
  console.log(`[AmbientAI] Analyzing transcript: "${recentText.substring(0, 200)}..."`);
  
  const count = await processAndStoreSuggestions(
    sessionId,
    recentText,
    session.caseId,
    Date.now()
  );
  
  console.log(`[AmbientAI] Analysis complete, generated ${count} suggestions`);
  
  return { suggestionsGenerated: count };
}

// ============================================
// FOCUS ISSUES - Strategic AI Analysis
// ============================================

export interface FocusIssueSuggestion {
  title: string;
  shortName: string;
  rationale: string;
}

export interface FocusIssueResult {
  documentId: string;
  documentType: string;
  documentTitle: string;
  documentDate: string | null;
  preview: string;
  relevance: "contradicts" | "supports" | "pattern" | "impeaches" | "related";
  relevanceNote: string;
  confidence: "high" | "medium" | "low";
  focusIssueId: string;
  focusIssueTitle: string;
}

// Suggest focus issues from case documents using AI
export async function suggestFocusIssuesFromCase(
  caseId: string,
  context: string = ""
): Promise<FocusIssueSuggestion[]> {
  console.log(`[FocusIssues] Suggesting issues for case ${caseId}`);
  
  try {
    // Get case details
    const [caseData] = await db
      .select()
      .from(cases)
      .where(eq(cases.id, caseId));
    
    if (!caseData) {
      throw new Error("Case not found");
    }
    
    // Get some sample documents from the case to understand context
    const sampleDocs = await db
      .select({
        subject: communications.subject,
        content: communications.body,
      })
      .from(communications)
      .where(eq(communications.caseId, caseId))
      .limit(10);
    
    const docContext = sampleDocs
      .map(d => `Subject: ${d.subject}\nSnippet: ${(d.content || "").substring(0, 200)}`)
      .join("\n\n");
    
    const prompt = `You are a legal investigator preparing for a deposition or interview.

CASE: ${caseData.title}
${caseData.description ? `Description: ${caseData.description}` : ""}
${context ? `Additional context: ${context}` : ""}

SAMPLE DOCUMENTS FROM CASE:
${docContext || "No documents available"}

Based on this case, suggest 3-5 strategic "Focus Issues" that an attorney should track during a deposition or interview. These should be:
1. Specific factual questions that need to be established
2. Potential areas of contradiction or impeachment
3. Timeline or knowledge questions

Return JSON array:
[
  {
    "title": "Full question or issue statement (e.g., 'When did Miller first learn about the missing PPE?')",
    "shortName": "Brief label (e.g., 'Miller Knowledge')",
    "rationale": "Why this issue matters for the investigation"
  }
]`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: prompt
      }]
    });
    
    const textContent = response.content.find(c => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return [];
    }
    
    const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }
    
    const suggestions = JSON.parse(jsonMatch[0]) as FocusIssueSuggestion[];
    console.log(`[FocusIssues] Generated ${suggestions.length} suggestions`);
    return suggestions;
    
  } catch (error) {
    console.error("[FocusIssues] Error suggesting issues:", error);
    throw new Error("Failed to suggest focus issues");
  }
}

// Search for documents related to a specific focus issue
export async function searchForFocusIssue(
  issue: { id: string; title: string; shortName?: string | null; keywords?: string[] | null; caseId?: string | null },
  caseId: string,
  transcriptText: string
): Promise<{ results: FocusIssueResult[]; query: string }> {
  console.log(`[FocusIssues] Searching for issue: ${issue.title.slice(0, 50)}...`);
  
  try {
    // Build a focused query combining issue context with transcript
    const issueKeywords = issue.keywords?.join(" ") || "";
    const combinedContext = `${issue.title} ${issueKeywords} ${transcriptText}`.slice(0, 2000);
    
    // Generate a targeted boolean query for this issue
    const queryPrompt = `Generate a focused search query for finding documents related to this investigation question.

FOCUS ISSUE: ${issue.title}
RECENT DISCUSSION: ${transcriptText.slice(0, 500)}

Generate ONE boolean search query that would find documents relevant to this specific issue.
Use simple format: term1 AND term2 AND (alt1 OR alt2)

Return just the query string, nothing else.`;

    const queryResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 200,
      messages: [{ role: "user", content: queryPrompt }]
    });
    
    const queryContent = queryResponse.content.find(c => c.type === "text");
    const booleanQuery = queryContent && queryContent.type === "text" 
      ? queryContent.text.trim().replace(/^["']|["']$/g, '')
      : issue.title;
    
    console.log(`[FocusIssues] Generated query: ${booleanQuery}`);
    
    // Execute search against case documents
    const searchResults = await executeBooleanSearch(caseId, booleanQuery);
    
    if (searchResults.length === 0) {
      return { results: [], query: booleanQuery };
    }
    
    // Transform search results to match classifyRelevance expected format
    const transformedResults = searchResults.slice(0, 5).map(r => ({
      id: r.id,
      subject: r.subject || "Document",
      snippet: `From: ${r.sender || 'Unknown'} - ${r.subject || 'No subject'}`,
      documentType: r.matchType || "document",
    }));
    
    // Classify relevance for each result
    const classifiedResults = await classifyRelevance(
      transformedResults,
      issue,
      transcriptText
    );
    
    return { results: classifiedResults, query: booleanQuery };
    
  } catch (error) {
    console.error("[FocusIssues] Error searching:", error);
    return { results: [], query: "" };
  }
}

// Search all active focus issues at once
export async function searchAllFocusIssues(
  issues: Array<{ id: string; title: string; shortName?: string | null; keywords?: string[] | null }>,
  caseId: string,
  transcriptText: string
): Promise<FocusIssueResult[]> {
  console.log(`[FocusIssues] Searching ${issues.length} issues`);
  
  const allResults: FocusIssueResult[] = [];
  
  // Process issues in parallel (limit to 3 concurrent)
  const batchSize = 3;
  for (let i = 0; i < issues.length; i += batchSize) {
    const batch = issues.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(issue => searchForFocusIssue(issue, caseId, transcriptText))
    );
    
    batchResults.forEach(result => {
      allResults.push(...result.results);
    });
  }
  
  // Sort by relevance priority: contradicts/impeaches first, then supports, then pattern, then related
  const relevancePriority = { contradicts: 0, impeaches: 1, supports: 2, pattern: 3, related: 4 };
  allResults.sort((a, b) => {
    const priorityDiff = relevancePriority[a.relevance] - relevancePriority[b.relevance];
    if (priorityDiff !== 0) return priorityDiff;
    const confPriority = { high: 0, medium: 1, low: 2 };
    return confPriority[a.confidence] - confPriority[b.confidence];
  });
  
  console.log(`[FocusIssues] Found ${allResults.length} total results`);
  return allResults;
}

// Classify document relevance using AI
async function classifyRelevance(
  documents: Array<{ id: string; subject: string; snippet: string; date?: string; documentType?: string }>,
  issue: { id: string; title: string; shortName?: string | null },
  transcriptText: string
): Promise<FocusIssueResult[]> {
  if (documents.length === 0) return [];
  
  const docSummaries = documents.map((d, i) => 
    `[${i + 1}] ${d.subject}: ${d.snippet.slice(0, 300)}`
  ).join("\n\n");
  
  const prompt = `You are a legal analyst classifying documents for relevance to an investigation question.

FOCUS ISSUE: ${issue.title}
RECENT TESTIMONY: "${transcriptText.slice(0, 500)}"

DOCUMENTS:
${docSummaries}

For each document, classify its relevance to the focus issue:
- "contradicts": Document conflicts with or disproves what was said
- "supports": Document confirms or corroborates what was said
- "pattern": Document shows a recurring pattern or similar incident
- "impeaches": Prior statement by the speaker that differs from current testimony
- "related": Generally relevant but no clear support/contradiction

Return JSON array:
[
  {
    "docIndex": 1,
    "relevance": "contradicts",
    "relevanceNote": "Brief explanation of why (1-2 sentences)",
    "confidence": "high"
  }
]`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    });
    
    const textContent = response.content.find(c => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return documents.map(d => ({
        documentId: d.id,
        documentType: d.documentType || "document",
        documentTitle: d.subject,
        documentDate: d.date || null,
        preview: d.snippet.slice(0, 200),
        relevance: "related" as const,
        relevanceNote: "Relevant to the focus issue",
        confidence: "medium" as const,
        focusIssueId: issue.id,
        focusIssueTitle: issue.shortName || issue.title,
      }));
    }
    
    const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return documents.map(d => ({
        documentId: d.id,
        documentType: d.documentType || "document",
        documentTitle: d.subject,
        documentDate: d.date || null,
        preview: d.snippet.slice(0, 200),
        relevance: "related" as const,
        relevanceNote: "Relevant to the focus issue",
        confidence: "medium" as const,
        focusIssueId: issue.id,
        focusIssueTitle: issue.shortName || issue.title,
      }));
    }
    
    const classifications = JSON.parse(jsonMatch[0]) as Array<{
      docIndex: number;
      relevance: string;
      relevanceNote: string;
      confidence: string;
    }>;
    
    return documents.map((d, i) => {
      const classification = classifications.find(c => c.docIndex === i + 1);
      const validRelevance = ["contradicts", "supports", "pattern", "impeaches", "related"];
      const relevance = (classification && validRelevance.includes(classification.relevance))
        ? classification.relevance as "contradicts" | "supports" | "pattern" | "impeaches" | "related"
        : "related";
      
      return {
        documentId: d.id,
        documentType: d.documentType || "document",
        documentTitle: d.subject,
        documentDate: d.date || null,
        preview: d.snippet.slice(0, 200),
        relevance,
        relevanceNote: classification?.relevanceNote || "Relevant to the focus issue",
        confidence: (classification?.confidence as "high" | "medium" | "low") || "medium",
        focusIssueId: issue.id,
        focusIssueTitle: issue.shortName || issue.title,
      };
    });
    
  } catch (error) {
    console.error("[FocusIssues] Error classifying relevance:", error);
    return documents.map(d => ({
      documentId: d.id,
      documentType: d.documentType || "document",
      documentTitle: d.subject,
      documentDate: d.date || null,
      preview: d.snippet.slice(0, 200),
      relevance: "related" as const,
      relevanceNote: "Relevant to the focus issue",
      confidence: "medium" as const,
      focusIssueId: issue.id,
      focusIssueTitle: issue.shortName || issue.title,
    }));
  }
}

// Extract factual allegations from pleading text
export async function extractAllegationsFromText(
  text: string,
  side: "plaintiff" | "defendant"
): Promise<Array<{
  id: string;
  paragraph: string;
  text: string;
  type: string;
  keywords: string[];
  active: boolean;
}>> {
  console.log("[FocusIssues] Extracting allegations from text, side:", side);
  
  const prompt = `You are a legal analyst extracting key factual allegations from a legal pleading.

PLEADING TEXT:
${text.slice(0, 8000)}

Extract the most important factual allegations from this document. Focus on:
- Specific dates, times, and events
- Actions or omissions attributed to parties
- Knowledge or notice allegations
- Causation and damages claims
- Violations of standards or duties

For each allegation, identify:
1. The paragraph number (if present, like "¶ 12" or "12.")
2. The full allegation text
3. The type: "negligence", "notice", "damages", "standard_of_care", "causation", "fraud", "breach", "intent", or "custom"
4. Key keywords for searching (names, dates, specific terms)

Return as JSON array:
[
  {
    "paragraph": "¶ 12",
    "text": "On March 15, 2024, Defendant HOBAO Industries knew or should have known...",
    "type": "negligence",
    "keywords": ["March 15, 2024", "HOBAO Industries", "knew", "should have known"]
  }
]

Extract between 3-10 key allegations. Focus on the most important factual claims.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }]
    });
    
    const textContent = response.content.find(c => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      console.error("[FocusIssues] No text response from AI");
      return [];
    }
    
    const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("[FocusIssues] No JSON array found in response");
      return [];
    }
    
    const extracted = JSON.parse(jsonMatch[0]) as Array<{
      paragraph: string;
      text: string;
      type: string;
      keywords: string[];
    }>;
    
    // Transform to include id and active status
    const allegations = extracted.map((item, index) => ({
      id: `allegation-${Date.now()}-${index}`,
      paragraph: item.paragraph || `¶ ${index + 1}`,
      text: item.text,
      type: item.type || "custom",
      keywords: item.keywords || [],
      active: true,
    }));
    
    console.log(`[FocusIssues] Extracted ${allegations.length} allegations`);
    return allegations;
    
  } catch (error) {
    console.error("[FocusIssues] Error extracting allegations:", error);
    return [];
  }
}
