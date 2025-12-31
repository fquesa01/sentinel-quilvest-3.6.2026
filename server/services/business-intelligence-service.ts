import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, desc, asc, sql, count } from "drizzle-orm";
import { openai } from "../ai";
import type { BusinessSummary, EntityInvolvement, EntityInvolvementEntry } from "@shared/business-summary-types";
import {
  batchAnalysisSystemPrompt,
  makeBatchAnalysisUserPrompt,
  masterReportSystemPrompt,
  makeMasterReportUserPrompt,
  entityExtractionSystemPrompt,
  makeEntityExtractionUserPrompt,
  type MasterReportParams,
  type EntityExtractionParams
} from "./bi-prompts";

// Progress tracking for long-running analysis
export interface AnalysisProgress {
  stage: string;
  stageNumber: number;
  totalStages: number;
  message: string;
  percentComplete: number;
  startTime: Date;
  estimatedMinutesRemaining?: number;
}

// Comprehensive analytics data structure
export interface CaseAnalytics {
  // Basic stats
  totalCommunications: number;
  totalAttachments: number;
  dateRange: {
    oldest: Date | null;
    newest: Date | null;
    spanDays: number;
  };
  
  // People analytics
  topSenders: Array<{ email: string; name: string; count: number }>;
  topRecipients: Array<{ email: string; name: string; count: number }>;
  allPeople: Array<{ 
    email: string; 
    name: string; 
    asSender: number; 
    asRecipient: number; 
    total: number;
    firstSeen: Date | null;
    lastSeen: Date | null;
  }>;
  
  // Organizations extracted from email domains
  organizations: Array<{ domain: string; count: number; isLikelyCompany: boolean }>;
  
  // Volume analytics
  communicationsByMonth: Array<{ month: string; count: number }>;
  communicationsByType: Array<{ type: string; count: number }>;
  
  // Content for AI analysis
  sampleContent: Array<{
    id: string;
    subject: string;
    body: string;
    sender: string;
    recipients: string[];
    timestamp: Date;
  }>;
}

// Topic analysis result from AI - Enhanced with behavioral and risk indicators
export interface TopicAnalysis {
  mainTopics: Array<{
    topic: string;
    description: string;
    frequency: string;
    sampleSubjects: string[];
  }>;
  keyThemes: string[];
  businessActivities: string[];
  concernsOrRisks: string[];
  executiveSummary: string;
  behavioralIndicators?: {
    trustAndTransparency: string;
    conflictManagement: string;
    accountability: string;
    culturalConcerns: string[];
  };
  operationalRisks?: Array<{
    risk: string;
    severity: string;
    description: string;
  }>;
  recommendations?: Array<{
    category: string;
    recommendation: string;
    priority: string;
  }>;
}

// Entity extraction result from AI - Enhanced with relationships and centrality
export interface EntityExtraction {
  people: Array<{
    name: string;
    role?: string | null;
    organization?: string | null;
    mentionCount: number;
    frequencyCategory?: string;
    personType?: string;
    primaryCounterparties?: string[] | null;
    mainTopics?: string[] | null;
  }>;
  organizations: Array<{
    name: string;
    type?: string | null;
    relationship?: string | null;
    mentionCount: number;
    keyPeople?: string[] | null;
    jurisdiction?: string | null;
  }>;
  locations: Array<{
    name: string;
    context?: string | null;
    businessRelevance?: string | null;
  }>;
  relationships?: {
    personToPerson: Array<{
      person1: string;
      person2: string;
      relationshipType: string;
      frequency: string;
    }>;
    personToOrg: Array<{
      person: string;
      organization: string;
      role: string;
    }>;
    orgToOrg: Array<{
      org1: string;
      org2: string;
      relationshipType: string;
    }>;
  };
  influenceAnalysis?: {
    centralPeople: string[];
    coreInnerCircle: string;
    secondaryCircle: string;
    outliers: string;
  };
}

// Helper function to extract name from email address format
function extractNameFromEmail(emailStr: string): { name: string; email: string } {
  if (!emailStr) return { name: '', email: '' };
  
  // Match "Name <email@domain.com>" format
  const match = emailStr.match(/^([^<]+)<([^>]+)>$/);
  if (match) {
    return { 
      name: match[1].trim().replace(/"/g, ''), 
      email: match[2].toLowerCase().trim() 
    };
  }
  
  // Just an email
  if (emailStr.includes('@')) {
    const email = emailStr.toLowerCase().trim();
    // Try to extract name from email prefix
    const prefix = email.split('@')[0];
    const name = prefix.replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return { name, email };
  }
  
  return { name: emailStr, email: '' };
}

// Helper to extract domain from email
function extractDomain(email: string): string {
  const match = email.match(/@([^>]+)/);
  return match ? match[1].toLowerCase() : '';
}

// Check if domain is likely a company vs personal email
function isLikelyCompanyDomain(domain: string): boolean {
  const personalDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
    'icloud.com', 'me.com', 'mac.com', 'live.com', 'msn.com', 'protonmail.com',
    'mail.com', 'ymail.com', 'rocketmail.com', 'comcast.net', 'verizon.net',
    'att.net', 'sbcglobal.net', 'cox.net', 'charter.net'
  ];
  return !personalDomains.includes(domain.toLowerCase());
}

/**
 * Gather comprehensive analytics from all case communications
 */
export async function gatherCaseAnalytics(
  caseId: string,
  onProgress?: (progress: AnalysisProgress) => void
): Promise<CaseAnalytics> {
  const startTime = new Date();
  
  // Report progress
  const reportProgress = (stage: string, stageNum: number, totalStages: number, message: string) => {
    if (onProgress) {
      const elapsed = (Date.now() - startTime.getTime()) / 1000 / 60; // minutes
      const progress: AnalysisProgress = {
        stage,
        stageNumber: stageNum,
        totalStages,
        message,
        percentComplete: Math.round((stageNum / totalStages) * 100),
        startTime,
        estimatedMinutesRemaining: stageNum > 0 ? (elapsed / stageNum) * (totalStages - stageNum) : undefined
      };
      onProgress(progress);
    }
  };

  reportProgress('Gathering Data', 1, 8, 'Counting total communications...');

  // Get total count
  const [countResult] = await db
    .select({ count: count() })
    .from(schema.communications)
    .where(eq(schema.communications.caseId, caseId));
  
  const totalCommunications = countResult?.count || 0;
  console.log(`[BI Analytics] Case ${caseId}: Found ${totalCommunications} total communications`);

  reportProgress('Gathering Data', 2, 8, 'Fetching date range...');

  // Get date range
  const [oldestComm] = await db
    .select({ timestamp: schema.communications.timestamp })
    .from(schema.communications)
    .where(eq(schema.communications.caseId, caseId))
    .orderBy(asc(schema.communications.timestamp))
    .limit(1);

  const [newestComm] = await db
    .select({ timestamp: schema.communications.timestamp })
    .from(schema.communications)
    .where(eq(schema.communications.caseId, caseId))
    .orderBy(desc(schema.communications.timestamp))
    .limit(1);

  const oldest = oldestComm?.timestamp || null;
  const newest = newestComm?.timestamp || null;
  const spanDays = oldest && newest 
    ? Math.ceil((newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  console.log(`[BI Analytics] Date range: ${oldest?.toISOString()} to ${newest?.toISOString()} (${spanDays} days)`);

  reportProgress('Analyzing People', 3, 8, 'Extracting senders and recipients...');

  // Fetch all communications to analyze people
  const allComms = await db
    .select({
      id: schema.communications.id,
      sender: schema.communications.sender,
      recipients: schema.communications.recipients,
      timestamp: schema.communications.timestamp,
      subject: schema.communications.subject,
      body: schema.communications.body,
      sourceType: schema.communications.sourceType,
      metadata: schema.communications.metadata,
    })
    .from(schema.communications)
    .where(eq(schema.communications.caseId, caseId));

  // Aggregate sender stats
  const senderMap = new Map<string, { name: string; email: string; count: number; firstSeen: Date | null; lastSeen: Date | null }>();
  const recipientMap = new Map<string, { name: string; email: string; count: number; firstSeen: Date | null; lastSeen: Date | null }>();
  const domainMap = new Map<string, number>();
  const monthMap = new Map<string, number>();
  const typeMap = new Map<string, number>();

  for (const comm of allComms) {
    // Process sender
    if (comm.sender) {
      const { name, email } = extractNameFromEmail(comm.sender);
      const key = email || comm.sender.toLowerCase();
      const existing = senderMap.get(key);
      if (existing) {
        existing.count++;
        if (comm.timestamp && (!existing.firstSeen || comm.timestamp < existing.firstSeen)) {
          existing.firstSeen = comm.timestamp;
        }
        if (comm.timestamp && (!existing.lastSeen || comm.timestamp > existing.lastSeen)) {
          existing.lastSeen = comm.timestamp;
        }
      } else {
        senderMap.set(key, { 
          name: name || key, 
          email: key, 
          count: 1,
          firstSeen: comm.timestamp,
          lastSeen: comm.timestamp
        });
      }
      
      // Track domain
      const domain = extractDomain(key);
      if (domain) {
        domainMap.set(domain, (domainMap.get(domain) || 0) + 1);
      }
    }

    // Process recipients
    if (comm.recipients && Array.isArray(comm.recipients)) {
      for (const recip of comm.recipients) {
        const { name, email } = extractNameFromEmail(recip);
        const key = email || recip.toLowerCase();
        const existing = recipientMap.get(key);
        if (existing) {
          existing.count++;
          if (comm.timestamp && (!existing.firstSeen || comm.timestamp < existing.firstSeen)) {
            existing.firstSeen = comm.timestamp;
          }
          if (comm.timestamp && (!existing.lastSeen || comm.timestamp > existing.lastSeen)) {
            existing.lastSeen = comm.timestamp;
          }
        } else {
          recipientMap.set(key, { 
            name: name || key, 
            email: key, 
            count: 1,
            firstSeen: comm.timestamp,
            lastSeen: comm.timestamp
          });
        }
        
        // Track domain
        const domain = extractDomain(key);
        if (domain) {
          domainMap.set(domain, (domainMap.get(domain) || 0) + 1);
        }
      }
    }

    // Track by month
    if (comm.timestamp) {
      const monthKey = `${comm.timestamp.getFullYear()}-${String(comm.timestamp.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
    }

    // Track by type
    const type = comm.sourceType || 'unknown';
    typeMap.set(type, (typeMap.get(type) || 0) + 1);
  }

  reportProgress('Analyzing People', 4, 8, 'Ranking top communicators...');

  // Convert to sorted arrays
  const topSenders = Array.from(senderMap.entries())
    .map(([_, data]) => ({ email: data.email, name: data.name, count: data.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  const topRecipients = Array.from(recipientMap.entries())
    .map(([_, data]) => ({ email: data.email, name: data.name, count: data.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  // Combine sender and recipient data for all people
  const allPeopleMap = new Map<string, { 
    email: string; name: string; asSender: number; asRecipient: number; 
    firstSeen: Date | null; lastSeen: Date | null;
  }>();

  Array.from(senderMap.entries()).forEach(([key, data]) => {
    allPeopleMap.set(key, {
      email: data.email,
      name: data.name,
      asSender: data.count,
      asRecipient: 0,
      firstSeen: data.firstSeen,
      lastSeen: data.lastSeen
    });
  });

  Array.from(recipientMap.entries()).forEach(([key, data]) => {
    const existing = allPeopleMap.get(key);
    if (existing) {
      existing.asRecipient = data.count;
      if (data.firstSeen && (!existing.firstSeen || data.firstSeen < existing.firstSeen)) {
        existing.firstSeen = data.firstSeen;
      }
      if (data.lastSeen && (!existing.lastSeen || data.lastSeen > existing.lastSeen)) {
        existing.lastSeen = data.lastSeen;
      }
    } else {
      allPeopleMap.set(key, {
        email: data.email,
        name: data.name,
        asSender: 0,
        asRecipient: data.count,
        firstSeen: data.firstSeen,
        lastSeen: data.lastSeen
      });
    }
  });

  const allPeople = Array.from(allPeopleMap.values())
    .map(p => ({ ...p, total: p.asSender + p.asRecipient }))
    .sort((a, b) => b.total - a.total);

  reportProgress('Analyzing Organizations', 5, 8, 'Extracting organization domains...');

  // Organizations from domains
  const organizations = Array.from(domainMap.entries())
    .map(([domain, count]) => ({ 
      domain, 
      count, 
      isLikelyCompany: isLikelyCompanyDomain(domain) 
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 100);

  const communicationsByMonth = Array.from(monthMap.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const communicationsByType = Array.from(typeMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  reportProgress('Preparing Content', 6, 8, 'Selecting representative sample for AI analysis...');

  // Sample content for AI analysis - get a diverse sample
  // Take documents evenly distributed across the time range
  const sampleSize = Math.min(500, totalCommunications); // Analyze up to 500 docs thoroughly
  const sampleContent = allComms
    .filter(c => c.body && c.body.length > 50) // Only meaningful content
    .sort(() => Math.random() - 0.5) // Shuffle
    .slice(0, sampleSize)
    .map(c => ({
      id: c.id,
      subject: c.subject || '',
      body: c.body,
      sender: c.sender || '',
      recipients: Array.isArray(c.recipients) ? c.recipients : [],
      timestamp: c.timestamp || new Date()
    }));

  console.log(`[BI Analytics] Selected ${sampleContent.length} documents for AI analysis`);

  // Warn if we have very few documents with content
  if (sampleContent.length < 10 && totalCommunications > 10) {
    console.warn(`[BI Analytics] Warning: Only ${sampleContent.length} of ${totalCommunications} documents have analyzable content (body > 50 chars)`);
  }

  reportProgress('Preparing Content', 7, 8, 'Compiling analytics summary...');

  // Count attachments from metadata
  let totalAttachments = 0;
  for (const comm of allComms) {
    if (comm.metadata && typeof comm.metadata === 'object') {
      const meta = comm.metadata as Record<string, any>;
      if (meta.attachments && Array.isArray(meta.attachments)) {
        totalAttachments += meta.attachments.length;
      }
    }
  }

  return {
    totalCommunications,
    totalAttachments,
    dateRange: { oldest, newest, spanDays },
    topSenders,
    topRecipients,
    allPeople,
    organizations,
    communicationsByMonth,
    communicationsByType,
    sampleContent
  };
}

/**
 * Analyze topics and themes using AI with thorough batch processing
 */
export async function analyzeTopicsWithAI(
  analytics: CaseAnalytics,
  companyName: string,
  onProgress?: (progress: AnalysisProgress) => void
): Promise<TopicAnalysis> {
  const startTime = new Date();
  
  const reportProgress = (message: string, percentComplete: number) => {
    if (onProgress) {
      onProgress({
        stage: 'AI Topic Analysis',
        stageNumber: 1,
        totalStages: 1,
        message,
        percentComplete,
        startTime
      });
    }
  };

  reportProgress('Preparing content batches for deep analysis...', 10);

  // Guard: Check if we have any sample content to analyze
  if (!analytics.sampleContent || analytics.sampleContent.length === 0) {
    console.log(`[BI Analytics] No sample content available for topic analysis`);
    return {
      mainTopics: [{
        topic: 'Insufficient Content',
        description: 'The case contains communications but none with sufficient body content (>50 characters) for topic analysis.',
        frequency: 'N/A',
        sampleSubjects: []
      }],
      keyThemes: ['Communications present but content too short for analysis'],
      businessActivities: [],
      concernsOrRisks: ['Unable to perform topic analysis - communications lack substantive content'],
      executiveSummary: `This case contains ${analytics.totalCommunications} communications, but the message bodies are too short or empty to perform meaningful topic analysis. The communications may consist primarily of attachments, forwarded messages, or brief responses.`
    };
  }

  // Process in batches to handle large document sets
  const BATCH_SIZE = 50; // Documents per batch
  const batches: string[][] = [];
  
  for (let i = 0; i < analytics.sampleContent.length; i += BATCH_SIZE) {
    const batch = analytics.sampleContent.slice(i, i + BATCH_SIZE);
    const batchText = batch.map((doc, idx) => 
      `[Doc ${i + idx + 1}] Subject: ${doc.subject}\nFrom: ${doc.sender}\nDate: ${doc.timestamp.toISOString()}\nContent: ${doc.body.substring(0, 1500)}`
    ).join('\n\n---\n\n');
    batches.push([batchText]);
  }

  console.log(`[BI Analytics] Processing ${batches.length} batches for topic analysis`);

  // Analyze each batch and collect topics
  const batchSummaries: string[] = [];
  
  for (let i = 0; i < batches.length; i++) {
    const batchContent = batches[i][0];
    const progressPct = 10 + Math.round((i / batches.length) * 70);
    reportProgress(`Analyzing batch ${i + 1} of ${batches.length}...`, progressPct);

    // Retry logic with exponential backoff
    let retries = 0;
    const maxRetries = 3;
    let success = false;
    
    while (!success && retries < maxRetries) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: batchAnalysisSystemPrompt
            },
            {
              role: "user",
              content: makeBatchAnalysisUserPrompt(batchContent)
            }
          ],
          max_tokens: 4000,
          temperature: 0.3
        });

        const summary = response.choices[0]?.message?.content || '';
        if (summary) {
          batchSummaries.push(summary);
        }
        success = true;
      } catch (error: any) {
        retries++;
        console.error(`[BI Analytics] Error processing batch ${i + 1} (attempt ${retries}/${maxRetries}):`, error.message);
        if (retries < maxRetries) {
          const delay = Math.pow(2, retries) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.log(`[BI Analytics] Retrying in ${delay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Small delay between batches to avoid rate limits
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  reportProgress('Synthesizing findings across all batches...', 85);

  // Prepare master report parameters using new comprehensive prompts
  const masterReportParams: MasterReportParams = {
    companyName,
    totalCommunications: analytics.totalCommunications,
    dateRange: `${analytics.dateRange.oldest?.toLocaleDateString() || 'Unknown'} – ${analytics.dateRange.newest?.toLocaleDateString() || 'Unknown'}`,
    batchCount: batches.length,
    topSenders: analytics.topSenders.slice(0, 15).map(s => `${s.name} (${s.count} emails)`).join(', '),
    topRecipients: analytics.topRecipients.slice(0, 15).map(r => `${r.name} (${r.count} emails)`).join(', '),
    topDomains: analytics.organizations.filter(o => o.isLikelyCompany).slice(0, 15).map(o => `${o.domain} (${o.count})`).join(', '),
    batchSummaries: batchSummaries.join('\n\n---\n\n')
  };

  console.log(`[BI Analytics] Generating 18-section master report using new comprehensive prompts from bi-prompts.ts...`);
  console.log(`[BI Analytics] System prompt starts with: "${masterReportSystemPrompt.substring(0, 100)}..."`);
  console.log(`[BI Analytics] User prompt includes ${masterReportParams.batchCount} batch summaries, ${masterReportParams.topSenders.split(',').length} top senders`);
  
  // Generate the FULL 18-section narrative master report WITHOUT JSON schema constraints
  // This allows the AI to follow the prompt structure exactly
  const masterReportResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: masterReportSystemPrompt
      },
      {
        role: "user",
        content: makeMasterReportUserPrompt(masterReportParams)
      }
    ],
    max_tokens: 16000, // Allow for comprehensive report
    temperature: 0.3
  });

  const masterReportContent = masterReportResponse.choices[0]?.message?.content;
  if (!masterReportContent) {
    throw new Error("No master report content received from AI synthesis");
  }
  
  console.log(`[BI Analytics] Master report generated (${masterReportContent.length} chars)`);

  reportProgress('Extracting structured data...', 92);

  // Now extract structured data for backwards compatibility
  // Use a simpler prompt to extract just the structured fields
  const structuredResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a data extraction assistant. Extract structured data from the provided analysis report. Return valid JSON only."
      },
      {
        role: "user",
        content: `Based on this comprehensive analysis report, extract the following structured data as JSON:

REPORT TO EXTRACT FROM:
${masterReportContent}

REQUIRED JSON STRUCTURE:
{
  "mainTopics": [{"topic": "...", "description": "...", "frequency": "High|Medium|Low", "sampleSubjects": ["..."]}],
  "keyThemes": ["..."],
  "businessActivities": ["..."],
  "concernsOrRisks": ["..."],
  "executiveSummary": "...",
  "behavioralIndicators": {
    "trustAndTransparency": "...",
    "conflictManagement": "...",
    "accountability": "...",
    "culturalConcerns": ["..."]
  },
  "operationalRisks": [{"risk": "...", "severity": "High|Medium|Low", "description": "..."}],
  "recommendations": [{"category": "...", "recommendation": "...", "priority": "High|Medium|Low"}]
}

Extract meaningful content from the report for each field. Do not leave any fields empty.`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "topic_analysis",
        strict: true,
        schema: {
          type: "object",
          required: ["mainTopics", "keyThemes", "businessActivities", "concernsOrRisks", "executiveSummary", "behavioralIndicators", "operationalRisks", "recommendations"],
          properties: {
            mainTopics: {
              type: "array",
              items: {
                type: "object",
                required: ["topic", "description", "frequency", "sampleSubjects"],
                properties: {
                  topic: { type: "string" },
                  description: { type: "string" },
                  frequency: { type: "string" },
                  sampleSubjects: { type: "array", items: { type: "string" } }
                },
                additionalProperties: false
              }
            },
            keyThemes: { type: "array", items: { type: "string" } },
            businessActivities: { type: "array", items: { type: "string" } },
            concernsOrRisks: { type: "array", items: { type: "string" } },
            executiveSummary: { type: "string" },
            behavioralIndicators: {
              type: "object",
              required: ["trustAndTransparency", "conflictManagement", "accountability", "culturalConcerns"],
              properties: {
                trustAndTransparency: { type: "string" },
                conflictManagement: { type: "string" },
                accountability: { type: "string" },
                culturalConcerns: { type: "array", items: { type: "string" } }
              },
              additionalProperties: false
            },
            operationalRisks: {
              type: "array",
              items: {
                type: "object",
                required: ["risk", "severity", "description"],
                properties: {
                  risk: { type: "string" },
                  severity: { type: "string" },
                  description: { type: "string" }
                },
                additionalProperties: false
              }
            },
            recommendations: {
              type: "array",
              items: {
                type: "object",
                required: ["category", "recommendation", "priority"],
                properties: {
                  category: { type: "string" },
                  recommendation: { type: "string" },
                  priority: { type: "string" }
                },
                additionalProperties: false
              }
            }
          },
          additionalProperties: false
        }
      }
    },
    max_tokens: 8000,
    temperature: 0.2
  });

  reportProgress('Finalizing topic analysis...', 100);

  const structuredContent = structuredResponse.choices[0]?.message?.content;
  if (!structuredContent) {
    throw new Error("No structured content received from AI extraction");
  }

  const structuredData = JSON.parse(structuredContent) as TopicAnalysis;
  
  // Attach the full master report to the structured data
  (structuredData as any).masterReport = masterReportContent;
  
  // Log confirmation that new prompt was applied
  const hasMasterReport = !!masterReportContent && masterReportContent.length > 0;
  const hasAllSections = masterReportContent.includes('## 1.') && masterReportContent.includes('## 18.');
  console.log(`[BI Analytics] ✓ NEW 18-SECTION PROMPT APPLIED`);
  console.log(`[BI Analytics] Master report generated: ${hasMasterReport ? 'YES' : 'NO'} (${masterReportContent.length} chars)`);
  console.log(`[BI Analytics] Contains all 18 sections: ${hasAllSections ? 'YES' : 'Partial/Unknown'}`);
  console.log(`[BI Analytics] First 200 chars of master report: "${masterReportContent.substring(0, 200)}..."`);
  
  return structuredData;
}

/**
 * Extract entities (people, organizations, locations) from communications
 */
export async function extractEntitiesWithAI(
  analytics: CaseAnalytics,
  companyName: string,
  onProgress?: (progress: AnalysisProgress) => void
): Promise<EntityExtraction> {
  const startTime = new Date();
  
  const reportProgress = (message: string, percentComplete: number) => {
    if (onProgress) {
      onProgress({
        stage: 'Entity Extraction',
        stageNumber: 1,
        totalStages: 1,
        message,
        percentComplete,
        startTime
      });
    }
  };

  reportProgress('Preparing content for entity extraction...', 10);

  // Guard: Check if we have any sample content to analyze
  if (!analytics.sampleContent || analytics.sampleContent.length === 0) {
    console.log(`[BI Analytics] No sample content available for entity extraction`);
    return {
      people: [],
      organizations: [],
      locations: []
    };
  }

  // Take a sample of content with focus on diversity
  const sample = analytics.sampleContent.slice(0, 200);
  const sampleText = sample.map((doc, idx) => 
    `[${idx + 1}] From: ${doc.sender}\nSubject: ${doc.subject}\n${doc.body.substring(0, 800)}`
  ).join('\n\n---\n\n');

  reportProgress('Extracting entities with AI...', 50);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: entityExtractionSystemPrompt
      },
      {
        role: "user",
        content: makeEntityExtractionUserPrompt({
          companyName,
          sampleDescription: `a representative sample of ${sample.length} communications`,
          docsText: sampleText
        }) + `\n\nIMPORTANT: Return your analysis as structured JSON matching this schema. For each entity, provide enriched information based on your analysis.`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "entity_extraction",
        strict: true,
        schema: {
          type: "object",
          required: ["people", "organizations", "locations", "relationships", "influenceAnalysis"],
          properties: {
            people: {
              type: "array",
              items: {
                type: "object",
                required: ["name", "role", "organization", "mentionCount", "frequencyCategory", "personType", "primaryCounterparties", "mainTopics"],
                properties: {
                  name: { type: "string" },
                  role: { type: ["string", "null"] },
                  organization: { type: ["string", "null"] },
                  mentionCount: { type: "number" },
                  frequencyCategory: { type: "string" },
                  personType: { type: "string" },
                  primaryCounterparties: { type: ["array", "null"], items: { type: "string" } },
                  mainTopics: { type: ["array", "null"], items: { type: "string" } }
                },
                additionalProperties: false
              }
            },
            organizations: {
              type: "array",
              items: {
                type: "object",
                required: ["name", "type", "relationship", "mentionCount", "keyPeople", "jurisdiction"],
                properties: {
                  name: { type: "string" },
                  type: { type: ["string", "null"] },
                  relationship: { type: ["string", "null"] },
                  mentionCount: { type: "number" },
                  keyPeople: { type: ["array", "null"], items: { type: "string" } },
                  jurisdiction: { type: ["string", "null"] }
                },
                additionalProperties: false
              }
            },
            locations: {
              type: "array",
              items: {
                type: "object",
                required: ["name", "context", "businessRelevance"],
                properties: {
                  name: { type: "string" },
                  context: { type: ["string", "null"] },
                  businessRelevance: { type: ["string", "null"] }
                },
                additionalProperties: false
              }
            },
            relationships: {
              type: "object",
              required: ["personToPerson", "personToOrg", "orgToOrg"],
              properties: {
                personToPerson: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["person1", "person2", "relationshipType", "frequency"],
                    properties: {
                      person1: { type: "string" },
                      person2: { type: "string" },
                      relationshipType: { type: "string" },
                      frequency: { type: "string" }
                    },
                    additionalProperties: false
                  }
                },
                personToOrg: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["person", "organization", "role"],
                    properties: {
                      person: { type: "string" },
                      organization: { type: "string" },
                      role: { type: "string" }
                    },
                    additionalProperties: false
                  }
                },
                orgToOrg: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["org1", "org2", "relationshipType"],
                    properties: {
                      org1: { type: "string" },
                      org2: { type: "string" },
                      relationshipType: { type: "string" }
                    },
                    additionalProperties: false
                  }
                }
              },
              additionalProperties: false
            },
            influenceAnalysis: {
              type: "object",
              required: ["centralPeople", "coreInnerCircle", "secondaryCircle", "outliers"],
              properties: {
                centralPeople: { type: "array", items: { type: "string" } },
                coreInnerCircle: { type: "string" },
                secondaryCircle: { type: "string" },
                outliers: { type: "string" }
              },
              additionalProperties: false
            }
          },
          additionalProperties: false
        }
      }
    },
    max_tokens: 8000,
    temperature: 0.2
  });

  reportProgress('Processing entity results...', 100);

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content received from entity extraction");
  }

  return JSON.parse(content) as EntityExtraction;
}

/**
 * Generate comprehensive business summary combining all analytics
 */
export async function generateComprehensiveBusinessSummary(
  caseId: string,
  companyName: string,
  userId: string,
  enableWebResearch: boolean = true,
  onProgress?: (progress: AnalysisProgress) => void
): Promise<BusinessSummary> {
  console.log(`[BI Service] Starting comprehensive analysis for case ${caseId}`);
  
  const overallStart = Date.now();
  
  // Stage 1: Gather analytics
  onProgress?.({
    stage: 'Data Collection',
    stageNumber: 1,
    totalStages: 5,
    message: 'Gathering all case communications...',
    percentComplete: 0,
    startTime: new Date()
  });

  const analytics = await gatherCaseAnalytics(caseId, (p) => {
    onProgress?.({
      ...p,
      stage: 'Data Collection',
      stageNumber: 1,
      totalStages: 5,
      percentComplete: Math.round(p.percentComplete * 0.2) // 0-20%
    });
  });

  if (analytics.totalCommunications === 0) {
    throw new Error(`No communications found for this case. Please upload documents first.`);
  }

  console.log(`[BI Service] Analytics gathered: ${analytics.totalCommunications} communications`);

  // Stage 2: Topic Analysis
  onProgress?.({
    stage: 'Topic Analysis',
    stageNumber: 2,
    totalStages: 5,
    message: 'Analyzing topics and themes with AI...',
    percentComplete: 20,
    startTime: new Date()
  });

  const topicAnalysis = await analyzeTopicsWithAI(analytics, companyName, (p) => {
    onProgress?.({
      ...p,
      stage: 'Topic Analysis',
      stageNumber: 2,
      totalStages: 5,
      percentComplete: 20 + Math.round(p.percentComplete * 0.3) // 20-50%
    });
  });

  console.log(`[BI Service] Topic analysis complete: ${topicAnalysis.mainTopics.length} main topics`);

  // Stage 3: Entity Extraction
  onProgress?.({
    stage: 'Entity Extraction',
    stageNumber: 3,
    totalStages: 5,
    message: 'Extracting people and organizations...',
    percentComplete: 50,
    startTime: new Date()
  });

  const entities = await extractEntitiesWithAI(analytics, companyName, (p) => {
    onProgress?.({
      ...p,
      stage: 'Entity Extraction',
      stageNumber: 3,
      totalStages: 5,
      percentComplete: 50 + Math.round(p.percentComplete * 0.2) // 50-70%
    });
  });

  console.log(`[BI Service] Entity extraction complete: ${entities.people.length} people, ${entities.organizations.length} organizations`);

  // Stage 4: Web Research (if enabled)
  let webResearch = null;
  if (enableWebResearch) {
    onProgress?.({
      stage: 'Web Research',
      stageNumber: 4,
      totalStages: 5,
      message: 'Conducting external web research...',
      percentComplete: 70,
      startTime: new Date()
    });

    try {
      // Import and run web research with extracted entities for enhanced litigation search
      const { conductCompanyResearch } = await import('./web-research-service');
      
      // Extract key persons for litigation search (prioritize those with roles/titles)
      const keyPersons = entities.people
        .filter(p => p.role || p.mentionCount > 2)
        .sort((a, b) => b.mentionCount - a.mentionCount)
        .slice(0, 15)
        .map(p => p.name);
      
      // Extract key organizations for litigation search
      const keyOrganizations = entities.organizations
        .filter(o => o.mentionCount > 1)
        .sort((a, b) => b.mentionCount - a.mentionCount)
        .slice(0, 10)
        .map(o => o.name);
      
      console.log(`[BI Service] Passing ${keyPersons.length} key persons and ${keyOrganizations.length} organizations to web research`);
      
      const researchResults = await conductCompanyResearch(companyName, {
        keyPersons,
        keyOrganizations
      });
      
      webResearch = {
        research_date: researchResults.research_date,
        media_coverage: researchResults.media_coverage,
        external_litigation: researchResults.litigation_history,
        regulatory_actions: researchResults.regulatory_actions,
        overall_risk_assessment: researchResults.overall_risk_assessment,
        research_sources: researchResults.research_sources,
        search_method: researchResults.search_method,
      };
      console.log(`[BI Service] Web research complete`);
    } catch (error) {
      console.error('[BI Service] Web research failed:', error);
    }
  }

  // Stage 5: Compile Final Report
  onProgress?.({
    stage: 'Report Generation',
    stageNumber: 5,
    totalStages: 5,
    message: 'Compiling comprehensive business summary...',
    percentComplete: 85,
    startTime: new Date()
  });

  // Build the comprehensive business summary
  const summary: BusinessSummary = {
    meta: {
      company_name: companyName,
      report_date: new Date().toISOString(),
      sources: analytics.sampleContent.slice(0, 50).map((doc, idx) => ({
        id: `doc_${idx + 1}`,
        type: 'email' as const,
        snippet: `${doc.subject} - ${doc.body.substring(0, 100)}...`,
        redaction_reason: null
      })),
      overall_confidence: 0.75
    },
    
    executive_summary: {
      one_paragraph: `${topicAnalysis.executiveSummary}

**Document Overview:** This analysis covers ${analytics.totalCommunications.toLocaleString()} communications spanning from ${analytics.dateRange.oldest?.toLocaleDateString() || 'N/A'} to ${analytics.dateRange.newest?.toLocaleDateString() || 'N/A'} (${analytics.dateRange.spanDays} days). The communications involve ${analytics.allPeople.length} unique individuals across ${analytics.organizations.filter(o => o.isLikelyCompany).length} organizations.

**Top Communicators:** The most active senders are ${analytics.topSenders.slice(0, 5).map(s => `${s.name} (${s.count} emails)`).join(', ')}.`,
      
      top_metrics: {
        revenue_estimate: null,
        clients_count: analytics.organizations.filter(o => o.isLikelyCompany).length,
        geography: entities.locations.slice(0, 5).map(l => l.name).join(', ') || null
      },
      
      top_risks: topicAnalysis.concernsOrRisks.slice(0, 5)
    },
    
    business_lines: topicAnalysis.mainTopics.map(topic => ({
      name: topic.topic,
      description: topic.description,
      data_sources: ['email communications'],
      workflow_summary: topic.frequency,
      estimated_value_per_case: null,
      evidence: topic.sampleSubjects.map((subj, idx) => ({
        source: `doc_${idx + 1}`,
        lines: subj,
        confidence: 0.8
      }))
    })),
    
    corporate_history: {
      timeline: [{
        date: analytics.dateRange.oldest?.toISOString().split('T')[0] || '',
        event: `First communication in corpus`,
        source: null,
        date_certainty: 'day' as const
      }, {
        date: analytics.dateRange.newest?.toISOString().split('T')[0] || '',
        event: `Most recent communication in corpus`,
        source: null,
        date_certainty: 'day' as const
      }],
      entities: entities.organizations.slice(0, 20).map(o => o.name),
      org_chart: entities.people.filter(p => p.role).slice(0, 20).map(p => ({
        name: p.name,
        role: p.role || 'Unknown',
        source: null
      }))
    },
    
    transactions: {
      timeline: []
    },
    
    clients: [],
    
    partners: entities.organizations
      .filter(o => o.relationship)
      .slice(0, 20)
      .map(o => ({
        name: o.name,
        role: o.relationship || o.type || 'Organization',
        documents: []
      })),
    
    tech_stack: {
      summary: null,
      software: [],
      hardware: [],
      tools: []
    },
    
    personnel: {
      summary: `Analysis identified ${analytics.allPeople.length} unique individuals across the communications corpus. The top senders sent ${analytics.topSenders[0]?.count || 0} emails, while the top recipients received ${analytics.topRecipients[0]?.count || 0} emails.`,
      org_structure: null,
      members: [
        // Top senders
        ...analytics.topSenders.slice(0, 25).map(s => ({
          name: s.name,
          title: 'Sender',
          role: `Sent ${s.count} communications`,
          email: s.email,
          department: null,
          source: null,
          is_c_suite: false
        })),
        // Add AI-extracted people with roles
        ...entities.people.filter(p => p.role).slice(0, 25).map(p => ({
          name: p.name,
          title: p.role || 'Unknown',
          role: p.organization || 'Mentioned in communications',
          email: null,
          department: null,
          source: null,
          is_c_suite: /CEO|CFO|COO|CTO|CIO|President|Chief/i.test(p.role || '')
        }))
      ]
    },
    
    litigation_and_risk: {
      active_cases: [],
      regulatory_contacts: []
    },
    
    financials: {
      summary: null
    },
    
    exhibits: [{
      type: 'table',
      title: 'Communication Volume by Month',
      source: 'corpus_analysis',
      page: null
    }],
    
    appendix: {
      glossary: topicAnalysis.keyThemes,
      raw_source_index: analytics.sampleContent.slice(0, 50).map((doc, idx) => 
        `doc_${idx + 1}: ${doc.subject} (${doc.timestamp.toLocaleDateString()})`
      )
    },
    
    // Entity involvement
    entity_involvement: {
      employees: analytics.topSenders.slice(0, 30).map(s => ({
        name: s.name,
        email: s.email,
        role: 'Sender',
        department: null,
        communication_count: s.count,
        document_count: s.count,
        as_sender: s.count,
        as_recipient: analytics.topRecipients.find(r => r.email === s.email)?.count || 0,
        mentioned_in_body: 0,
        first_seen: null,
        last_seen: null
      })),
      third_parties: entities.people.slice(0, 30).map(p => ({
        name: p.name,
        email: null,
        role: p.role || null,
        department: p.organization || null,
        communication_count: p.mentionCount,
        document_count: p.mentionCount,
        as_sender: 0,
        as_recipient: 0,
        mentioned_in_body: p.mentionCount,
        first_seen: null,
        last_seen: null
      })),
      vendors: entities.organizations.slice(0, 20).map(o => ({
        name: o.name,
        email: null,
        role: o.type || 'Organization',
        department: null,
        communication_count: o.mentionCount,
        document_count: o.mentionCount,
        as_sender: 0,
        as_recipient: 0,
        mentioned_in_body: o.mentionCount,
        first_seen: null,
        last_seen: null
      })),
      total_unique_entities: analytics.allPeople.length + entities.organizations.length,
      total_communications_analyzed: analytics.totalCommunications,
      extraction_date: new Date().toISOString()
    },
    
    web_research: webResearch,
    
    // Enhanced analysis sections from comprehensive prompts (with safe null checks)
    behavioral_assessment: topicAnalysis.behavioralIndicators ? {
      trust_and_transparency: topicAnalysis.behavioralIndicators.trustAndTransparency || 'Not assessed',
      conflict_management: topicAnalysis.behavioralIndicators.conflictManagement || 'Not assessed',
      accountability: topicAnalysis.behavioralIndicators.accountability || 'Not assessed',
      cultural_concerns: topicAnalysis.behavioralIndicators.culturalConcerns || []
    } : null,
    
    operational_risks: topicAnalysis.operationalRisks && topicAnalysis.operationalRisks.length > 0 
      ? topicAnalysis.operationalRisks.map(r => ({
          risk: r.risk || 'Unknown risk',
          severity: r.severity || 'medium',
          description: r.description || ''
        })) 
      : null,
    
    recommendations: topicAnalysis.recommendations && topicAnalysis.recommendations.length > 0
      ? topicAnalysis.recommendations.map(r => ({
          category: r.category || 'General',
          recommendation: r.recommendation || '',
          priority: r.priority || 'medium'
        }))
      : null,
    
    relationship_mapping: (entities.relationships && entities.influenceAnalysis) ? {
      person_to_person: (entities.relationships.personToPerson || []).map(r => ({
        person1: r.person1 || '',
        person2: r.person2 || '',
        relationship_type: r.relationshipType || 'Unknown',
        frequency: r.frequency || ''
      })),
      person_to_org: (entities.relationships.personToOrg || []).map(r => ({
        person: r.person || '',
        organization: r.organization || '',
        role: r.role || ''
      })),
      org_to_org: (entities.relationships.orgToOrg || []).map(r => ({
        org1: r.org1 || '',
        org2: r.org2 || '',
        relationship_type: r.relationshipType || 'Unknown'
      })),
      influence_analysis: {
        central_people: entities.influenceAnalysis.centralPeople || [],
        core_inner_circle: entities.influenceAnalysis.coreInnerCircle || '',
        secondary_circle: entities.influenceAnalysis.secondaryCircle || '',
        outliers: entities.influenceAnalysis.outliers || ''
      }
    } : null,
    
    // Full 18-section narrative master report from AI synthesis
    // This is generated using the comprehensive bi-prompts without JSON schema constraints
    master_report: (topicAnalysis as any).masterReport || null
  };

  const elapsed = (Date.now() - overallStart) / 1000 / 60;
  const masterReportLength = summary.master_report?.length || 0;
  console.log(`[BI Service] Comprehensive analysis complete in ${elapsed.toFixed(1)} minutes`);
  console.log(`[BI Service] ✓ Master report attached to BusinessSummary: ${masterReportLength > 0 ? 'YES' : 'NO'} (${masterReportLength} chars)`);

  onProgress?.({
    stage: 'Complete',
    stageNumber: 5,
    totalStages: 5,
    message: `Analysis complete! Processed ${analytics.totalCommunications} communications.`,
    percentComplete: 100,
    startTime: new Date()
  });

  return summary;
}
