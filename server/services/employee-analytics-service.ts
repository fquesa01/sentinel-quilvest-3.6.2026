import { GoogleGenAI } from "@google/genai";
import { db } from "../db";
import { communications, employeeAnalyticsCache, users } from "@shared/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { openai } from "../ai";

// Validate API key is present
if (!process.env.GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY environment variable is required for analytics");
}

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

export interface EmployeeAnalyticsRequest {
  employeeId: string;
  dateRangeStart: Date;
  dateRangeEnd: Date;
  requestedBy: string; // User ID requesting the analysis
}

export interface TopicCluster {
  topic: string;
  score: number; // Relevance/frequency score (0-100)
  exemplars: string[]; // Sample messages representing the topic
  relatedCommunicationIds: string[];
  keyPhrases: string[];
}

export interface CommunicationPattern {
  topCollaborators: Array<{ name: string; email: string; messageCount: number }>;
  peakHours: number[]; // Hours of day (0-23) with most activity
  avgResponseTime: number | null; // Average response time in minutes
  threadParticipation: number; // Percentage of threads actively participated in
  communicationBreakdown: Record<string, number>; // email, slack, teams, etc.
}

export interface EfficiencyMetrics {
  totalCommunications: number;
  sentMessages: number;
  receivedMessages: number;
  avgDailyMessages: number;
  busyDays: string[]; // Days of week
  communicationVelocity: number; // Messages per hour during peak time
}

export interface SentimentAnalysis {
  overall: "positive" | "neutral" | "negative";
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  timeline: Array<{ date: string; sentiment: string }>;
  stressIndicators: string[]; // Phrases indicating high stress/urgency
}

export interface AnalyticsResult {
  id: string;
  employeeId: string;
  topics: TopicCluster[];
  patterns: CommunicationPattern;
  metrics: EfficiencyMetrics;
  sentiment: SentimentAnalysis;
  dateRangeStart: Date;
  dateRangeEnd: Date;
  status: string;
  createdAt: Date;
}

/**
 * Generate employee communication analytics using Gemini for semantic clustering
 * and OpenAI GPT-5 for executive summary generation
 */
export async function generateEmployeeAnalytics(
  request: EmployeeAnalyticsRequest
): Promise<AnalyticsResult> {
  // 1. Check if cached result exists and is still valid
  const cached = await getCachedAnalytics(request.employeeId, request.dateRangeStart, request.dateRangeEnd);
  if (cached && new Date() < new Date(cached.cacheExpiry)) {
    return {
      id: cached.id,
      employeeId: cached.employeeId,
      topics: cached.topics as TopicCluster[],
      patterns: cached.patterns as CommunicationPattern,
      metrics: cached.metrics as EfficiencyMetrics,
      sentiment: cached.sentiment as SentimentAnalysis,
      dateRangeStart: new Date(cached.dateRangeStart),
      dateRangeEnd: new Date(cached.dateRangeEnd),
      status: cached.status,
      createdAt: new Date(cached.createdAt),
    };
  }

  // 2. Fetch employee communications from database
  console.log("[Analytics] Fetching employee with ID:", request.employeeId);
  const employee = await db.select().from(users).where(eq(users.id, request.employeeId)).limit(1);
  if (!employee.length) {
    console.error("[Analytics] Employee not found for ID:", request.employeeId);
    throw new Error("Employee not found");
  }

  const employeeEmail = employee[0].email;
  console.log("[Analytics] Employee email:", employeeEmail);
  console.log("[Analytics] Date range:", request.dateRangeStart, "to", request.dateRangeEnd);

  // Fetch all communications where employee is sender or recipient
  // Note: sender field may contain display name format like '"Name" <email@domain.com>'
  // Extract the email using regex and normalize to lowercase for accurate matching
  // For recipients (jsonb array), use the @> containment operator with case-insensitive match
  const emailLower = employeeEmail.toLowerCase();
  const comms = await db
    .select()
    .from(communications)
    .where(
      and(
        gte(communications.timestamp, request.dateRangeStart),
        lte(communications.timestamp, request.dateRangeEnd),
        sql`(
          CASE 
            WHEN ${communications.sender} ~ '<[^>]+>' THEN
              lower(regexp_replace(${communications.sender}, '.*<([^>]+)>.*', '\\1'))
            ELSE
              lower(${communications.sender})
          END = ${emailLower}
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(${communications.recipients}) AS recipient
            WHERE lower(recipient) = ${emailLower}
          )
        )`
      )
    )
    .orderBy(desc(communications.timestamp));

  console.log("[Analytics] Found", comms.length, "communications for employee");

  if (comms.length === 0) {
    console.error("[Analytics] No communications found for employee:", employeeEmail);
    throw new Error("No communications found for this employee in the specified date range");
  }

  // 3. Extract basic metrics
  const metrics = extractMetrics(comms, employeeEmail);

  // 4. Extract communication patterns
  const patterns = extractPatterns(comms, employeeEmail);

  // 5. Use Gemini embeddings for semantic topic clustering
  const topics = await extractTopicsUsingGemini(comms, employeeEmail);

  // 6. Perform sentiment analysis using OpenAI
  const sentiment = await analyzeSentimentWithOpenAI(comms, employeeEmail);

  // 7. Cache the results (30-day TTL)
  const cacheExpiry = new Date();
  cacheExpiry.setDate(cacheExpiry.getDate() + 30);

  const [cachedResult] = await db
    .insert(employeeAnalyticsCache)
    .values({
      employeeId: request.employeeId,
      dateRangeStart: request.dateRangeStart,
      dateRangeEnd: request.dateRangeEnd,
      topics: topics as any,
      patterns: patterns as any,
      metrics: metrics as any,
      sentiment: sentiment as any,
      status: "completed",
      cacheExpiry,
      requestedBy: request.requestedBy,
    })
    .returning();

  return {
    id: cachedResult.id,
    employeeId: cachedResult.employeeId,
    topics,
    patterns,
    metrics,
    sentiment,
    dateRangeStart: request.dateRangeStart,
    dateRangeEnd: request.dateRangeEnd,
    status: "completed",
    createdAt: new Date(cachedResult.createdAt),
  };
}

/**
 * Helper function to extract and normalize email from sender field
 * Handles both plain email and display name formats like '"Name" <email@domain.com>'
 * Returns lowercase email for accurate case-insensitive comparison
 */
function extractSenderEmail(sender: string): string {
  // Check if sender has display name format with angle brackets
  const match = sender.match(/<([^>]+)>/);
  if (match) {
    return match[1].toLowerCase();
  }
  // Plain email address
  return sender.toLowerCase();
}

/**
 * Helper function to check if a sender field matches the given email
 * Uses case-insensitive comparison after extracting the email address
 */
function senderMatchesEmail(sender: string, email: string): boolean {
  return extractSenderEmail(sender) === email.toLowerCase();
}

/**
 * Get cached analytics if available
 */
async function getCachedAnalytics(employeeId: string, dateStart: Date, dateEnd: Date) {
  const [cached] = await db
    .select()
    .from(employeeAnalyticsCache)
    .where(
      and(
        eq(employeeAnalyticsCache.employeeId, employeeId),
        eq(employeeAnalyticsCache.dateRangeStart, dateStart),
        eq(employeeAnalyticsCache.dateRangeEnd, dateEnd),
        eq(employeeAnalyticsCache.status, "completed")
      )
    )
    .orderBy(desc(employeeAnalyticsCache.createdAt))
    .limit(1);

  return cached || null;
}

/**
 * Extract basic metrics from communications
 */
function extractMetrics(comms: any[], employeeEmail: string): EfficiencyMetrics {
  const sentMessages = comms.filter((c) => senderMatchesEmail(c.sender, employeeEmail)).length;
  const receivedMessages = comms.length - sentMessages;

  // Calculate date range span
  if (comms.length === 0) {
    return {
      totalCommunications: 0,
      sentMessages: 0,
      receivedMessages: 0,
      avgDailyMessages: 0,
      busyDays: [],
      communicationVelocity: 0,
    };
  }

  const firstDate = new Date(comms[comms.length - 1].timestamp);
  const lastDate = new Date(comms[0].timestamp);
  const daySpan = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));

  // Count messages by day of week
  const dayCount: Record<string, number> = {};
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  comms.forEach((c) => {
    const day = daysOfWeek[new Date(c.timestamp).getDay()];
    dayCount[day] = (dayCount[day] || 0) + 1;
  });

  const busyDays = Object.entries(dayCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([day]) => day);

  return {
    totalCommunications: comms.length,
    sentMessages,
    receivedMessages,
    avgDailyMessages: Math.round(comms.length / daySpan),
    busyDays,
    communicationVelocity: Math.round(comms.length / Math.max(1, daySpan * 8)), // Messages per working hour
  };
}

/**
 * Extract communication patterns
 */
function extractPatterns(comms: any[], employeeEmail: string): CommunicationPattern {
  // Top collaborators
  const collaboratorCounts: Record<string, { count: number; name?: string }> = {};
  const emailLower = employeeEmail.toLowerCase();

  comms.forEach((c) => {
    if (senderMatchesEmail(c.sender, employeeEmail)) {
      // Count recipients (case-insensitive comparison)
      (c.recipients || []).forEach((recipient: string) => {
        const recipientLower = recipient.toLowerCase();
        collaboratorCounts[recipientLower] = collaboratorCounts[recipientLower] || { count: 0 };
        collaboratorCounts[recipientLower].count++;
      });
    } else if ((c.recipients || []).some((r: string) => r.toLowerCase() === emailLower)) {
      // Count sender
      const senderEmail = extractSenderEmail(c.sender);
      collaboratorCounts[senderEmail] = collaboratorCounts[senderEmail] || { count: 0 };
      collaboratorCounts[senderEmail].count++;
    }
  });

  const topCollaborators = Object.entries(collaboratorCounts)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([email, data]) => ({
      name: email.split("@")[0],
      email,
      messageCount: data.count,
    }));

  // Peak hours
  const hourCounts: number[] = new Array(24).fill(0);
  comms.forEach((c) => {
    const hour = new Date(c.timestamp).getHours();
    hourCounts[hour]++;
  });

  const peakHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((h) => h.hour);

  // Communication breakdown by type
  const communicationBreakdown: Record<string, number> = {};
  comms.forEach((c) => {
    const type = c.communicationType || "unknown";
    communicationBreakdown[type] = (communicationBreakdown[type] || 0) + 1;
  });

  return {
    topCollaborators,
    peakHours,
    avgResponseTime: null, // Would require threading analysis
    threadParticipation: 0, // Would require threading analysis
    communicationBreakdown,
  };
}

/**
 * Redact PII from text content before sending to external AI providers
 */
function redactPII(text: string): string {
  // Redact email addresses
  let redacted = text.replace(/[\w.-]+@[\w.-]+\.\w+/g, "[EMAIL_REDACTED]");
  
  // Redact phone numbers (various formats)
  redacted = redacted.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[PHONE_REDACTED]");
  
  // Redact SSN-like patterns
  redacted = redacted.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN_REDACTED]");
  
  // Redact credit card-like numbers
  redacted = redacted.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[CC_REDACTED]");
  
  return redacted;
}

/**
 * Extract topics using Gemini embeddings and semantic clustering
 * PRIVACY: Only aggregated/redacted content is sent to Gemini
 */
async function extractTopicsUsingGemini(comms: any[], employeeEmail: string): Promise<TopicCluster[]> {
  // Sample communications for topic analysis (limit to avoid token limits)
  const sampleSize = Math.min(comms.length, 50);
  const sampledComms = comms.slice(0, sampleSize);

  // Prepare REDACTED content for Gemini - remove PII and limit content
  const contentText = sampledComms
    .map((c, idx) => {
      const direction = c.sender === employeeEmail ? "SENT" : "RECEIVED";
      // Redact subject and truncate body heavily
      const redactedSubject = redactPII(c.subject || "");
      const redactedBody = redactPII((c.body || "").substring(0, 200)); // Limit to 200 chars
      return `[${idx}] ${direction} - Subject: ${redactedSubject}\nContent Preview: ${redactedBody}...`;
    })
    .join("\n\n---\n\n");

  // Use Gemini to extract and cluster topics
  const model = await ai.models.get("gemini-2.0-flash");
  const response = await model.generateContent({
    contents: [{
      role: "user",
      parts: [{
        text: `Analyze the following employee communications and identify the top 10 topics being discussed. For each topic, provide:
1. Topic name (concise, 2-4 words)
2. Relevance score (0-100, where 100 is most relevant/frequent)
3. Key phrases (3-5 representative phrases)
4. Communication indices that relate to this topic

Communications:
${contentText}

Respond in JSON format:
{
  "topics": [
    {
      "topic": "string",
      "score": number,
      "keyPhrases": ["string"],
      "relatedIndices": [number]
    }
  ]
}`,
      }],
    }],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: "application/json",
    },
  });

  const resultText = response.text;
  let parsed;
  try {
    parsed = JSON.parse(resultText);
  } catch (e) {
    console.error("Failed to parse Gemini response:", resultText);
    return [];
  }

  const topics: TopicCluster[] = (parsed.topics || []).map((t: any) => ({
    topic: t.topic,
    score: t.score,
    keyPhrases: t.keyPhrases || [],
    exemplars: (t.relatedIndices || [])
      .slice(0, 3)
      .map((idx: number) => sampledComms[idx]?.subject || ""),
    relatedCommunicationIds: (t.relatedIndices || [])
      .map((idx: number) => sampledComms[idx]?.id)
      .filter(Boolean),
  }));

  return topics;
}

/**
 * Analyze sentiment using OpenAI GPT-5
 * PRIVACY: Only redacted/minimized content is sent to OpenAI
 */
async function analyzeSentimentWithOpenAI(comms: any[], employeeEmail: string): Promise<SentimentAnalysis> {
  // Sample communications for sentiment analysis
  const sampleSize = Math.min(comms.length, 30);
  const sampledComms = comms.slice(0, sampleSize);

  // REDACT content before sending to OpenAI
  const contentText = sampledComms
    .map((c) => {
      const direction = c.sender === employeeEmail ? "SENT" : "RECEIVED";
      const redactedBody = redactPII((c.body || "").substring(0, 150)); // Limit to 150 chars and redact
      return `${direction}: ${redactedBody}`;
    })
    .join("\n\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [
      {
        role: "system",
        content: `You are an expert at analyzing workplace communication sentiment and stress indicators. Analyze the employee's communication tone and identify stress/urgency patterns.`,
      },
      {
        role: "user",
        content: `Analyze the sentiment of these communications and respond in JSON format:
{
  "overall": "positive" | "neutral" | "negative",
  "positiveCount": number,
  "neutralCount": number,
  "negativeCount": number,
  "stressIndicators": ["string"]
}

Communications:
${contentText}`,
      },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(completion.choices[0].message.content || "{}");

  // Build timeline
  const timeline = sampledComms.map((c) => ({
    date: new Date(c.timestamp).toISOString().split("T")[0],
    sentiment: "neutral", // Simplified for now
  }));

  return {
    overall: result.overall || "neutral",
    positiveCount: result.positiveCount || 0,
    neutralCount: result.neutralCount || 0,
    negativeCount: result.negativeCount || 0,
    timeline,
    stressIndicators: result.stressIndicators || [],
  };
}

/**
 * Get analytics by job ID
 */
export async function getAnalyticsByJobId(jobId: string): Promise<AnalyticsResult | null> {
  const [result] = await db
    .select()
    .from(employeeAnalyticsCache)
    .where(eq(employeeAnalyticsCache.jobId, jobId))
    .limit(1);

  if (!result) {
    return null;
  }

  return {
    id: result.id,
    employeeId: result.employeeId,
    topics: result.topics as TopicCluster[],
    patterns: result.patterns as CommunicationPattern,
    metrics: result.metrics as EfficiencyMetrics,
    sentiment: result.sentiment as SentimentAnalysis,
    dateRangeStart: new Date(result.dateRangeStart),
    dateRangeEnd: new Date(result.dateRangeEnd),
    status: result.status,
    createdAt: new Date(result.createdAt),
  };
}
