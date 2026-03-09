import OpenAI from "openai";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, or, sql } from "drizzle-orm";
import * as transactionSearchService from "./transaction-search-service";
import * as globalKnowledge from "./global-knowledge-service";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// Helper to format violation type for display
function formatViolationType(type: string): string {
  const typeMap: Record<string, string> = {
    fcpa: "Foreign Corrupt Practices Act (FCPA)",
    antitrust: "Federal Antitrust",
    sox: "Sarbanes-Oxley (SOX)",
    bsa_aml: "Bank Secrecy Act/Anti-Money Laundering (BSA/AML)",
    securities: "Securities Fraud",
    environmental: "Environmental Compliance",
    data_privacy: "Data Privacy",
    employment: "Employment Law",
    trade_sanctions: "Trade Sanctions",
    healthcare: "Healthcare Compliance",
    other: "Other Compliance Matter",
  };
  return typeMap[type] || type;
}

// Helper to format case status for display
function formatCaseStatus(status: string): string {
  const statusMap: Record<string, string> = {
    alert: "Initial Alert",
    inquiry: "Under Inquiry",
    investigation: "Active Investigation",
    remediation: "In Remediation",
    closed: "Closed",
    archived: "Archived",
  };
  return statusMap[status] || status;
}

// Generate a narrative summary about a case
async function generateCaseNarrativeSummary(caseId: string): Promise<string | null> {
  try {
    // Fetch full case details
    const [caseData] = await db.select().from(schema.cases).where(eq(schema.cases.id, caseId)).limit(1);
    if (!caseData) return null;
    
    // Build the narrative parts
    const parts: string[] = [];
    
    // Introduction with case type
    const violationType = formatViolationType(caseData.violationType);
    const status = formatCaseStatus(caseData.status);
    parts.push(`${caseData.title} is a ${violationType} matter currently in ${status} status.`);
    
    // Add description if available
    if (caseData.description) {
      parts.push(caseData.description);
    }
    
    // Add AI analysis summary if available (this is the richest content)
    if (caseData.aiAnalysisSummary) {
      parts.push(caseData.aiAnalysisSummary);
    }
    
    // Add risk information if available
    if (caseData.riskLevel && caseData.riskScore !== null) {
      const riskLabel = caseData.riskLevel.charAt(0).toUpperCase() + caseData.riskLevel.slice(1);
      parts.push(`Risk Assessment: ${riskLabel} risk (score: ${caseData.riskScore}/100).`);
    }
    
    // Add privilege status if relevant
    if (caseData.privilegeStatus === "attorney_client_privileged") {
      parts.push("This matter is protected by attorney-client privilege.");
    }
    
    return parts.join("\n\n");
  } catch (error) {
    console.error("[AvaInterpreter] Error generating case narrative:", error);
    return null;
  }
}

// Common stop words that should be ignored in case/deal searches
const SEARCH_STOP_WORDS = ['case', 'the', 'a', 'an', 'to', 'for', 'of', 'in', 'on', 'at', 'by', 'me', 'my', 'go', 'show', 'take', 'open', 'view', 'see', 'find', 'get', 'transaction', 'deal', 'project'];

// Helper function to search for a case by name and return its ID
async function findCaseByName(caseName: string): Promise<{ id: string; title: string } | null> {
  // Strip punctuation and normalize the search term
  const searchTerm = String(caseName)
    .trim()
    .toLowerCase()
    .replace(/["""''.,!?:;()\[\]{}]/g, '') // Remove common punctuation
    .replace(/\s+/g, ' '); // Normalize multiple spaces to single space
  
  // Filter out single-char words, common stop words, and strip punctuation from each word
  const searchWords = searchTerm
    .split(/\s+/)
    .map(w => w.replace(/[^a-z0-9]/g, '')) // Keep only alphanumeric characters
    .filter(w => w.length > 1 && !SEARCH_STOP_WORDS.includes(w))
    .filter((w, i, arr) => arr.indexOf(w) === i); // Remove duplicates
  
  // First try exact phrase match on title or description
  let matchingCases = await db.select({
    id: schema.cases.id,
    title: schema.cases.title,
  })
  .from(schema.cases)
  .where(
    or(
      sql`LOWER(${schema.cases.title}) LIKE LOWER(${'%' + searchTerm + '%'})`,
      sql`LOWER(${schema.cases.caseNumber}) LIKE LOWER(${'%' + searchTerm + '%'})`,
      sql`LOWER(COALESCE(${schema.cases.description}, '')) LIKE LOWER(${'%' + searchTerm + '%'})`
    )
  )
  .limit(1);
  
  // If no exact match, try requiring ALL words to match in title+description combined
  if (matchingCases.length === 0 && searchWords.length > 0) {
    // Build conditions where each word must appear somewhere in title or description
    const allWordsConditions = searchWords.map(word => 
      sql`(LOWER(${schema.cases.title}) LIKE LOWER(${'%' + word + '%'}) OR LOWER(COALESCE(${schema.cases.description}, '')) LIKE LOWER(${'%' + word + '%'}))`
    );
    
    matchingCases = await db.select({
      id: schema.cases.id,
      title: schema.cases.title,
    })
    .from(schema.cases)
    .where(sql`${sql.join(allWordsConditions, sql` AND `)}`)
    .limit(5);
    
    // Score results by how many words match the title specifically (prefer title matches)
    if (matchingCases.length > 1) {
      const scoredCases = matchingCases.map(c => {
        const titleLower = c.title.toLowerCase();
        let score = 0;
        for (const word of searchWords) {
          if (titleLower.includes(word)) score += 2;
        }
        // Bonus for "sentinel" appearing in title (most specific word)
        if (searchWords.includes('sentinel') && titleLower.includes('sentinel')) score += 5;
        return { ...c, score };
      });
      scoredCases.sort((a, b) => b.score - a.score);
      matchingCases = [scoredCases[0]];
    }
  }
  
  if (matchingCases.length > 0) {
    console.log(`[AvaInterpreter] Found case: ${matchingCases[0].id} - ${matchingCases[0].title}`);
    return matchingCases[0];
  }
  return null;
}

// Helper function to search for a deal/transaction by name and return its ID
async function findDealByName(dealName: string): Promise<{ id: string; title: string } | null> {
  // Strip punctuation and normalize the search term
  const searchTerm = String(dealName)
    .trim()
    .toLowerCase()
    .replace(/["""''.,!?:;()\[\]{}]/g, '') // Remove common punctuation
    .replace(/\s+/g, ' '); // Normalize multiple spaces to single space
  
  // Filter out single-char words, common stop words, and strip punctuation from each word
  const searchWords = searchTerm
    .split(/\s+/)
    .map(w => w.replace(/[^a-z0-9]/g, '')) // Keep only alphanumeric characters
    .filter(w => w.length > 1 && !SEARCH_STOP_WORDS.includes(w))
    .filter((w, i, arr) => arr.indexOf(w) === i); // Remove duplicates
  
  console.log(`[AvaInterpreter] Searching for deal: "${searchTerm}" (words: ${searchWords.join(', ')})`);
  
  // First try exact phrase match on title
  let matchingDeals = await db.select({
    id: schema.deals.id,
    title: schema.deals.title,
  })
  .from(schema.deals)
  .where(
    sql`LOWER(${schema.deals.title}) LIKE LOWER(${'%' + searchTerm + '%'})`
  )
  .limit(1);
  
  // If no exact match, try requiring ALL words to match in title
  if (matchingDeals.length === 0 && searchWords.length > 0) {
    // Build conditions where each word must appear in title
    const allWordsConditions = searchWords.map(word => 
      sql`LOWER(${schema.deals.title}) LIKE LOWER(${'%' + word + '%'})`
    );
    
    matchingDeals = await db.select({
      id: schema.deals.id,
      title: schema.deals.title,
    })
    .from(schema.deals)
    .where(sql`${sql.join(allWordsConditions, sql` AND `)}`)
    .limit(5);
    
    // Score results by how many words match the title
    if (matchingDeals.length > 1) {
      const scoredDeals = matchingDeals.map(d => {
        const titleLower = d.title.toLowerCase();
        let score = 0;
        for (const word of searchWords) {
          if (titleLower.includes(word)) score += 2;
        }
        return { ...d, score };
      });
      scoredDeals.sort((a, b) => b.score - a.score);
      matchingDeals = [scoredDeals[0]];
    }
  }
  
  // If still no match, try ANY word matching (fallback for partial matches)
  if (matchingDeals.length === 0 && searchWords.length > 0) {
    const anyWordConditions = searchWords.map(word => 
      sql`LOWER(${schema.deals.title}) LIKE LOWER(${'%' + word + '%'})`
    );
    
    matchingDeals = await db.select({
      id: schema.deals.id,
      title: schema.deals.title,
    })
    .from(schema.deals)
    .where(sql`${sql.join(anyWordConditions, sql` OR `)}`)
    .limit(5);
    
    // Score results and pick best match
    if (matchingDeals.length > 1) {
      const scoredDeals = matchingDeals.map(d => {
        const titleLower = d.title.toLowerCase();
        let score = 0;
        for (const word of searchWords) {
          if (titleLower.includes(word)) score += 2;
        }
        return { ...d, score };
      });
      scoredDeals.sort((a, b) => b.score - a.score);
      matchingDeals = [scoredDeals[0]];
    }
  }
  
  if (matchingDeals.length > 0) {
    console.log(`[AvaInterpreter] Found deal: ${matchingDeals[0].id} - ${matchingDeals[0].title}`);
    return matchingDeals[0];
  }
  
  console.log(`[AvaInterpreter] No deal found for: "${searchTerm}"`);
  return null;
}

export interface AvaInterpretContext {
  userId?: string;
  currentRoute?: string;
  currentCaseId?: string;
  currentCaseName?: string;
  currentTab?: string;
  currentView?: string;
  timezone?: string;
}

export interface AvaInterpretResult {
  mode: "command" | "qa";
  intent?: string;
  parameters?: Record<string, any>;
  assistantMessage: string;
  actionLink?: {
    label: string;
    href: string;
  };
  requiresConfirmation?: boolean;
  followUpQuestion?: string;
}

const NAVIGATION_INTENTS = [
  "navigate_to_case",
  "navigate_to_case_document_review",
  "navigate_to_case_email_filter",
  "navigate_to_case_recordings",
  "navigate_to_statement",
  "navigate_to_my_queue",
  "navigate_to_interviews",
  "navigate_to_chat_conversations",
  "navigate_to_document_sets",
  "navigate_to_findings",
  "navigate_to_cases",
  "navigate_to_communications",
  "navigate_to_timeline",
  "navigate_to_parties",
  "navigate_to_applicable_law",
  "navigate_to_deal",
  "navigate_to_transactions",
  "start_video_conference",
  "navigate_to_relationship_intelligence",
  "navigate_to_contacts",
  "navigate_to_client_intelligence",
  "navigate_to_deal_templates",
  "navigate_to_request_lists",
  "navigate_to_deal_chat",
  "navigate_to_data_rooms",
  "navigate_to_deal_pipeline",
  "navigate_to_due_diligence",
  "navigate_to_privileged_research",
  "navigate_to_calendar",
  "navigate_to_ambient_intelligence",
  "navigate_to_document_review",
  "navigate_to_issue_heatmap",
  "navigate_to_data_lake",
  "navigate_to_collections",
  "navigate_to_background_research",
  "navigate_to_business_intelligence",
  "navigate_to_mailbox",
  "navigate_to_dashboard",
  "navigate_to_analytics",
  "navigate_to_admin",
  "navigate_to_deal_data_room",
  "navigate_to_deal_checklists",
  "navigate_to_investor_memo",
];

const ACTION_INTENTS = [
  "schedule_interview",
  "create_calendar_event",
  "search_documents",
  "search_emails",
  "filter_by_sender",
  "filter_by_date",
  "create_finding",
  "add_tag",
  "draft_note",
  "draft_email",
  "draft_linkedin",
  "create_deal",
  "create_contact",
  "upload_to_data_lake",
  "generate_investment_memo",
  "share_deal",
  "scan_news",
  "create_request_list",
  "create_checklist",
  "start_due_diligence",
  "start_privileged_research",
  "create_collection",
  "run_background_research",
];

const CASE_DATA_INTENTS = [
  "query_case_interview_count",
  "query_case_document_count",
  "query_case_findings_count",
  "query_case_communications_count",
];

const SYSTEM_PROMPT = `You are Ava, an AI assistant for Sentinel - an investigations, compliance, and e-discovery platform. Your job is to interpret user commands and determine whether they are:
1. A COMMAND to navigate the app, perform an action, OR query case-specific data
2. A Q&A question about compliance, legal matters, or the platform

CRITICAL RULE FOR CASE NAMES:
When extracting case names from user input, you MUST extract the EXACT text the user provided - do NOT substitute with example names.
- If user says "Take me to the Business Intelligence case" → caseName: "Business Intelligence"
- If user says "Open the Skanda case" → caseName: "Skanda"
- If user says "Go to Safety PPE" → caseName: "Safety PPE"
- If user says "How many interviews in the Epstein case" → caseName: "Epstein"
- The system will perform a partial search, so even partial names like "Sentinel" or "HOBAO" will work.
NEVER return example case names from training data. Extract EXACTLY what the user said.

CASE DATA QUERY COMMANDS (respond with mode: "command"):
These are questions about SPECIFIC CASE DATA that require looking up information from the database.
- "How many interviews in the [case name] case?" / "How many people have been interviewed in [case name]?" → query_case_interview_count
- "How many documents in [case name]?" / "What's the document count for [case name]?" → query_case_document_count
- "How many findings in [case name]?" → query_case_findings_count
- "Has anyone been interviewed in the [case name] case?" → query_case_interview_count

NAVIGATION COMMANDS (respond with mode: "command"):
- "Take me to [case name]" / "Open the [case name] case" / "Go to [case name]" → navigate_to_case
- "Go to my queue" / "Show my queue" → navigate_to_my_queue
- "Open interviews" / "Show interviews" → navigate_to_interviews
- "Show me emails between [person] and [person]" → navigate_to_case_email_filter
- "Go to document review" → navigate_to_case_document_review
- "Open chat conversations" → navigate_to_chat_conversations
- "Show document sets" → navigate_to_document_sets
- "Go to findings" / "Show findings" → navigate_to_findings
- "Show all cases" → navigate_to_cases
- "Open timeline" → navigate_to_timeline

EMAIL & DOCUMENT REVIEW NAVIGATION (respond with mode: "command"):
CRITICAL: When the user wants to view, review, or search emails/documents in a case, use navigate_to_case_document_review to go to the dedicated Email & Document Review page.
- "Show me all emails from [person] in the [case name] case" → navigate_to_case_document_review
- "Show me all emails that mention [person] in [case name]" → navigate_to_case_document_review
- "Take me to [person] emails in [case name]" → navigate_to_case_document_review
- "Show emails about [topic] in [case name]" → navigate_to_case_document_review
- "Review documents in [case name]" → navigate_to_case_document_review
- "Take me to any [person] emails in [case name]" → navigate_to_case_document_review
- Parameters for email/document review:
  - caseName: the case name (REQUIRED)
  - emailFilter: object with participants array (optional, extract person names from "from [person]", "to [person]", "mention [person]", "[person] emails")
    - Example: "michael graff emails" → emailFilter: { participants: ["michael graff"] }
  - searchQuery: keyword/topic to search for (optional, extract from "about [topic]", "mentioning [keyword]")

CASE OVERVIEW NAVIGATION WITH SEARCH (respond with mode: "command"):
When the user wants to go to a case overview (not specifically emails/documents), use navigate_to_case.
- "Open [case name] case and search for [keyword]" → navigate_to_case with filterKeyword: "[keyword]"
- "Take me to [case name]" → navigate_to_case
- Parameters:
  - caseName: the case name (REQUIRED)
  - filterKeyword: keyword to search for in the case (optional)

TRANSACTION/DEAL NAVIGATION (respond with mode: "command"):
CRITICAL: When the user says "transaction", "deal", or "project" (not "case"), use navigate_to_deal intent.
- "Take me to the [deal name] transaction" / "Open the [deal name] deal" / "Go to [deal name] project" → navigate_to_deal
- "Take me to [deal name]" (when deal name doesn't contain "case") → navigate_to_deal
- "Show me transactions" / "Open transactions" / "Go to transactions" → navigate_to_transactions
- Parameters: dealName (the transaction/deal name - extract ONLY the name, not the word "transaction" or "deal")
- Example: "Take me to the Ultimate Gamer transaction" → dealName: "Ultimate Gamer"
- Example: "Open the Acme Corp deal" → dealName: "Acme Corp"
- Example: "Go to the Johnson project" → dealName: "Johnson"

PLATFORM NAVIGATION (respond with mode: "command"):
These intents navigate to major platform sections:
- "Go to relationship intelligence" / "Show me the intelligence feed" / "Open my feed" / "Show alerts" → navigate_to_relationship_intelligence
- "Go to contacts" / "Show my contacts" / "Open contacts" → navigate_to_contacts
- "Go to client intelligence" / "Show client intelligence" / "Deal intelligence" → navigate_to_client_intelligence
- "Go to deal templates" / "Show templates" / "Open templates" → navigate_to_deal_templates
- "Go to request lists" / "Show DRL" / "Open request lists" → navigate_to_request_lists
- "Go to deal chat" / "Open deal chat" → navigate_to_deal_chat
- "Go to data rooms" / "Show data rooms" → navigate_to_data_rooms
- "Go to deal pipeline" / "Show pipeline" / "Open pipeline" → navigate_to_deal_pipeline
- "Go to due diligence" / "Show due diligence reports" → navigate_to_due_diligence
- "Go to privileged research" / "Open research" / "Legal research" → navigate_to_privileged_research
- "Go to calendar" / "Show my calendar" / "Open calendar" → navigate_to_calendar
- "Go to ambient intelligence" / "Show meeting intelligence" / "Open ambient" → navigate_to_ambient_intelligence
- "Go to document review" / "Review documents" (without specifying a case) → navigate_to_document_review
- "Go to issue heatmap" / "Show heatmap" / "Open heatmap" → navigate_to_issue_heatmap
- "Go to data lake" / "My data lake" / "Show data lake" / "Open data lake" → navigate_to_data_lake
- "Go to collections" / "Show collections" / "Open collections" → navigate_to_collections
- "Go to background research" / "Run background check" → navigate_to_background_research
- "Go to business intelligence" / "Open BI" / "Show business intelligence" → navigate_to_business_intelligence
- "Go to mailbox" / "Show mailbox" / "Open email" / "Check mail" → navigate_to_mailbox
- "Go to dashboard" / "Show dashboard" / "Open dashboard" / "Home" → navigate_to_dashboard
- "Go to analytics" / "Show analytics" → navigate_to_analytics
- "Go to admin" / "Admin panel" / "Admin dashboard" → navigate_to_admin
- "Go to checklists" / "Show checklists" / "Open checklists" → navigate_to_deal_checklists

DRAFT & CREATE ACTIONS (respond with mode: "command"):
- "Draft a note" / "Write a note" / "Create a note" / "Draft a note about [topic]" → draft_note
  - Parameters: topic (optional - what the note is about), contactName (optional - who it's about), alertId (optional)
  - This navigates to the intelligence feed and triggers the note drafting workflow
- "Draft an email" / "Write an email" / "Compose an email" / "Send an email" / "Draft an email about [topic]" / "Draft an email to [person]" → draft_email
  - Parameters: topic (optional), recipientName (optional), contactName (optional), alertId (optional)
- "Draft a LinkedIn post" / "Write a LinkedIn post" / "Create a LinkedIn post about [topic]" → draft_linkedin
  - Parameters: topic (optional), contactName (optional), alertId (optional)
- "Create a deal" / "New transaction" / "Start a new deal" / "Create a transaction" → create_deal
  - Parameters: title (optional), dealType (optional, e.g., "acquisition", "merger", "lbo")
- "Create a contact" / "Add a contact" / "New contact" / "Add [person] as a contact" → create_contact
  - Parameters: name (optional), company (optional)
- "Upload to data lake" / "Add document to data lake" / "Upload a file" → upload_to_data_lake
- "Generate investment memo" / "Create an investment memo for [deal]" / "Build a memo" → generate_investment_memo
  - Parameters: dealName (optional)
- "Share a deal" / "Share [deal name] with [person]" → share_deal
  - Parameters: dealName (optional), recipientEmail (optional)
- "Scan news" / "Check for news" / "Run a news scan" / "Scan for updates" → scan_news
- "Create a request list" / "New DRL" / "Create DRL" → create_request_list
- "Create a checklist" / "New checklist" → create_checklist
- "Start due diligence" / "Begin due diligence on [deal]" → start_due_diligence
  - Parameters: dealName (optional)
- "Start privileged research" / "New research session" / "Begin legal research" / "Research [topic]" → start_privileged_research
  - Parameters: topic (optional)
- "Create a collection" / "New collection" → create_collection
  - Parameters: name (optional)
- "Run background research" / "Background check on [person/company]" → run_background_research
  - Parameters: targetName (optional), targetType (optional - "person" or "company")

ACTION COMMANDS (respond with mode: "command"):
- "Schedule an interview with [name] for [date/time]" → schedule_interview
- "Search for [query]" → search_documents
- "Find emails from [sender]" → filter_by_sender

CALENDAR EVENT CREATION (respond with mode: "command"):
IMPORTANT: When the user wants to create a meeting, calendar event, appointment, or schedule time with someone, use create_calendar_event intent.
- "Create a meeting with [person] for [date/time]" → create_calendar_event
- "Schedule a meeting between [person] and me for [time]" → create_calendar_event  
- "Add a calendar event for [title] on [date]" → create_calendar_event
- "Set up a call with [person] on [day] at [time]" → create_calendar_event
- "Book a meeting for [date/time]" → create_calendar_event
- "Create an appointment with [person] next [day]" → create_calendar_event
- Parameters:
  - title: meeting/event title (derive from context, e.g., "Meeting with Ed")
  - startTime: date/time string (e.g., "Monday at 9 AM", "tomorrow at 3pm", "next Tuesday at 2:30 PM")
  - attendees: array of attendee names mentioned (extract from "with [person]", "between [person] and me")
  - duration: optional duration in minutes (default 60)
  - eventType: optional type like "meeting", "hearing", "deposition", "client_meeting" (default: "meeting")
- Examples:
  - "Create a meeting between Ed and I for 9:00 AM this upcoming Monday" → title: "Meeting with Ed", startTime: "this Monday at 9:00 AM", attendees: ["Ed"]
  - "Schedule a call with John tomorrow at 2pm" → title: "Call with John", startTime: "tomorrow at 2pm", attendees: ["John"]
  - "Book a client meeting on Friday at 10am" → title: "Client Meeting", startTime: "Friday at 10am", eventType: "client_meeting"

VIDEO CONFERENCE COMMANDS (respond with mode: "command"):
IMPORTANT: When the user wants to start a video call, video conference, or video meeting, use start_video_conference intent.
- "Start a video call" / "Take me to a new video conference" / "Create a video meeting" → start_video_conference
- "Begin a video conference" / "Start video conferencing" / "New video call" → start_video_conference
- "I need a video call" / "Let's do a video meeting" / "Open a video conference" → start_video_conference
- Parameters:
  - title: optional title for the meeting (default: "Quick Video Call")
  - meetingType: optional type like "witness_interview", "deposition", "recorded_statement" (default: "witness_interview")
  - caseId: optional case to associate with (can be inferred from context)
- Example: "Start a video call" → title: "Quick Video Call"
- Example: "Create a deposition video conference" → title: "Deposition Video Call", meetingType: "deposition"

RECORDED STATEMENTS & TRANSCRIPTS (respond with mode: "command"):
CRITICAL: When the user mentions "hearing transcript", "trial transcript", "deposition", "witness statement", "recording", or similar terms, search for recorded statements in that case.
- "Find the [document] transcripts in [case name]" → navigate_to_case_recordings with caseName and searchQuery
- "Show me the hearing transcripts in [case name]" → navigate_to_case_recordings with caseName
- "Take me to the [name] trial transcripts" → navigate_to_case_recordings with caseName derived from [name]
- "Open depositions in [case name]" → navigate_to_case_recordings with caseName
- Parameters:
  - caseName: the case name (REQUIRED) - extract from context
  - searchQuery: optional filter for specific transcripts
- Example: "take me to hand the Actos hearing transcripts" → likely meant "find the Actos hearing transcripts", caseName: "Actos"
- Example: "show me actos trial transcripts" → caseName: "Actos", searchQuery: "trial"

IMPORTANT: Handle typos and casual language gracefully:
- "hand" likely means "find" or nothing
- "gimme" means "give me" / "show me"
- Partial case names should still match (e.g., "Actos" matches "Actos MDL Litigation")

TRANSACTION & DATA ROOM DOCUMENT NAVIGATION (respond with mode: "command"):
- "Take me to the [document name] in [transaction name]" / "Show me the [document name] in the [deal] data room" → navigate_to_data_room_document
- "Find the [document name] document in [transaction]" / "Open the [document] in [deal]" → navigate_to_data_room_document
- "Go to the [document] questionnaire in [transaction]" → navigate_to_data_room_document
- Parameters: documentName (the document to find), dealName (optional - the transaction/deal name)
- Example: "Take me to the Quesada Questionnaire in the Ultimate Gamer transaction" → documentName: "Quesada Questionnaire", dealName: "Ultimate Gamer"
- Example: "Show me the Company Agreement in Ultimate Gamer" → documentName: "Company Agreement", dealName: "Ultimate Gamer"

Q&A QUESTIONS (respond with mode: "qa"):
- Questions about FCPA, SOX, AML, antitrust, or other compliance topics
- Questions about investigation procedures
- Questions asking for advice or guidance
- General questions about the platform's capabilities
- NOTE: If the question is about a SPECIFIC CASE's data (interviews, documents, findings), use a CASE DATA QUERY intent instead

CONTEXT AWARENESS:
- If the user says "interviews" or "findings" without specifying a case, but they're already viewing a case (currentCaseId exists), use that case context
- If a case name is ambiguous, include it in the parameters for the frontend to resolve via partial search

RESPONSE FORMAT:
Return valid JSON with:
{
  "mode": "command" or "qa",
  "intent": "intent_name" (only for commands),
  "parameters": { relevant parameters } (only for commands),
  "assistantMessage": "A friendly confirmation message or answer",
  "actionLink": { "label": "Link text", "href": "/path" } (optional, for commands that create something),
  "requiresConfirmation": true/false (for destructive actions),
  "followUpQuestion": "Question to ask" (if info is missing)
}

EXAMPLES - IMPORTANT: In your response, extract the ACTUAL case name from the user's message, not these example names:

User: "Take me to the Acme Corp investigation"
{
  "mode": "command",
  "intent": "navigate_to_case",
  "parameters": { "caseName": "Acme Corp investigation" },
  "assistantMessage": "Opening the Acme Corp investigation case for you."
}

User: "Open the Sentinel case"
{
  "mode": "command",
  "intent": "navigate_to_case",
  "parameters": { "caseName": "Sentinel" },
  "assistantMessage": "Opening the Sentinel case for you."
}

User: "Go to Business Intelligence"
{
  "mode": "command",
  "intent": "navigate_to_case",
  "parameters": { "caseName": "Business Intelligence" },
  "assistantMessage": "Opening the Business Intelligence case for you."
}

User: "Take me to the Ultimate Gamer transaction"
{
  "mode": "command",
  "intent": "navigate_to_deal",
  "parameters": { "dealName": "Ultimate Gamer" },
  "assistantMessage": "Opening the Ultimate Gamer transaction for you."
}

User: "Open the Acme Corp deal"
{
  "mode": "command",
  "intent": "navigate_to_deal",
  "parameters": { "dealName": "Acme Corp" },
  "assistantMessage": "Opening the Acme Corp deal for you."
}

User: "Go to transactions"
{
  "mode": "command",
  "intent": "navigate_to_transactions",
  "parameters": {},
  "assistantMessage": "Taking you to the transactions list."
}

User: "Show my queue"
{
  "mode": "command",
  "intent": "navigate_to_my_queue",
  "parameters": {},
  "assistantMessage": "Taking you to your queue."
}

User: "Schedule an interview with John Doe tomorrow at 3pm"
{
  "mode": "command",
  "intent": "schedule_interview",
  "parameters": { 
    "intervieweeName": "John Doe",
    "scheduledTime": "tomorrow at 3pm"
  },
  "assistantMessage": "I'll schedule an interview with John Doe for tomorrow at 3pm. What is their email address?",
  "followUpQuestion": "What is John Doe's email address?"
}

User: "Start a video call"
{
  "mode": "command",
  "intent": "start_video_conference",
  "parameters": { "title": "Quick Video Call" },
  "assistantMessage": "Starting a new video conference for you."
}

User: "Take me to a new video conferencing call"
{
  "mode": "command",
  "intent": "start_video_conference",
  "parameters": { "title": "Video Conference" },
  "assistantMessage": "Creating a new video conference and taking you there now."
}

User: "What are the key elements of an FCPA violation?"
{
  "mode": "qa",
  "assistantMessage": "The key elements of an FCPA violation include: 1) A payment or offer to pay, 2) To a foreign official, 3) With corrupt intent, 4) For the purpose of obtaining or retaining business..."
}

CASE DATA QUERY EXAMPLES - Extract the ACTUAL case name from the user's message:

User: "How many interviews in the Epstein case?"
{
  "mode": "command",
  "intent": "query_case_interview_count",
  "parameters": { "caseName": "Epstein" },
  "assistantMessage": "Let me check the interview count for the Epstein case."
}

User: "How many individuals have been interviewed in the Johnson investigation?"
{
  "mode": "command",
  "intent": "query_case_interview_count",
  "parameters": { "caseName": "Johnson investigation" },
  "assistantMessage": "Let me look up how many people have been interviewed in the Johnson investigation."
}

User: "Has anyone been interviewed in the Safety PPE case?"
{
  "mode": "command",
  "intent": "query_case_interview_count",
  "parameters": { "caseName": "Safety PPE" },
  "assistantMessage": "Let me check if any interviews have been conducted for the Safety PPE case."
}

User: "What's the document count for Sentinel?"
{
  "mode": "command",
  "intent": "query_case_document_count",
  "parameters": { "caseName": "Sentinel" },
  "assistantMessage": "Let me check the document count for the Sentinel case."
}

EMAIL & DOCUMENT REVIEW EXAMPLES - Route to the Email & Document Review page:

User: "Show me all emails that mention Mai in the usa wp case"
{
  "mode": "command",
  "intent": "navigate_to_case_document_review",
  "parameters": { 
    "caseName": "usa wp", 
    "emailFilter": { "participants": ["Mai"] }
  },
  "assistantMessage": "Opening Email & Document Review for the USA WP case, filtering for Mai."
}

User: "Take me to any michael graff emails in the usa wp case"
{
  "mode": "command",
  "intent": "navigate_to_case_document_review",
  "parameters": { 
    "caseName": "usa wp", 
    "emailFilter": { "participants": ["michael graff"] }
  },
  "assistantMessage": "Opening Email & Document Review for the USA WP case, showing emails from Michael Graff."
}

User: "Take me to emails from John Smith in the Acme investigation"
{
  "mode": "command",
  "intent": "navigate_to_case_document_review",
  "parameters": { 
    "caseName": "Acme investigation", 
    "emailFilter": { "participants": ["John Smith"] }
  },
  "assistantMessage": "Opening Email & Document Review for the Acme investigation, showing emails from John Smith."
}

User: "Show all communications about compliance in the Safety PPE case"
{
  "mode": "command",
  "intent": "navigate_to_case_document_review",
  "parameters": { 
    "caseName": "Safety PPE", 
    "searchQuery": "compliance"
  },
  "assistantMessage": "Opening Email & Document Review for the Safety PPE case, searching for 'compliance'."
}

User: "Review documents in the Sentinel case"
{
  "mode": "command",
  "intent": "navigate_to_case_document_review",
  "parameters": { 
    "caseName": "Sentinel"
  },
  "assistantMessage": "Opening Email & Document Review for the Sentinel case."
}

PLATFORM NAVIGATION EXAMPLES:

User: "Show me the intelligence feed"
{
  "mode": "command",
  "intent": "navigate_to_relationship_intelligence",
  "parameters": {},
  "assistantMessage": "Opening your intelligence feed."
}

User: "Go to my contacts"
{
  "mode": "command",
  "intent": "navigate_to_contacts",
  "parameters": {},
  "assistantMessage": "Taking you to your contacts."
}

User: "Open the deal pipeline"
{
  "mode": "command",
  "intent": "navigate_to_deal_pipeline",
  "parameters": {},
  "assistantMessage": "Opening the deal pipeline."
}

User: "Go to privileged research"
{
  "mode": "command",
  "intent": "navigate_to_privileged_research",
  "parameters": {},
  "assistantMessage": "Opening privileged research."
}

User: "Show my calendar"
{
  "mode": "command",
  "intent": "navigate_to_calendar",
  "parameters": {},
  "assistantMessage": "Opening your calendar."
}

User: "Go to data lake"
{
  "mode": "command",
  "intent": "navigate_to_data_lake",
  "parameters": {},
  "assistantMessage": "Opening your data lake."
}

User: "Open deal chat"
{
  "mode": "command",
  "intent": "navigate_to_deal_chat",
  "parameters": {},
  "assistantMessage": "Opening deal chat."
}

User: "Go to ambient intelligence"
{
  "mode": "command",
  "intent": "navigate_to_ambient_intelligence",
  "parameters": {},
  "assistantMessage": "Opening ambient intelligence."
}

User: "Open mailbox"
{
  "mode": "command",
  "intent": "navigate_to_mailbox",
  "parameters": {},
  "assistantMessage": "Opening your mailbox."
}

User: "Take me to the dashboard"
{
  "mode": "command",
  "intent": "navigate_to_dashboard",
  "parameters": {},
  "assistantMessage": "Taking you to the dashboard."
}

User: "Show me background research"
{
  "mode": "command",
  "intent": "navigate_to_background_research",
  "parameters": {},
  "assistantMessage": "Opening background research."
}

DRAFT & CREATE EXAMPLES:

User: "Draft a note"
{
  "mode": "command",
  "intent": "draft_note",
  "parameters": {},
  "assistantMessage": "I'll take you to the intelligence feed to draft a note."
}

User: "Draft a note about the quarterly earnings"
{
  "mode": "command",
  "intent": "draft_note",
  "parameters": { "topic": "quarterly earnings" },
  "assistantMessage": "I'll take you to the intelligence feed to draft a note about quarterly earnings."
}

User: "Draft an email to John"
{
  "mode": "command",
  "intent": "draft_email",
  "parameters": { "recipientName": "John" },
  "assistantMessage": "I'll take you to draft an email to John."
}

User: "Write a LinkedIn post about the merger"
{
  "mode": "command",
  "intent": "draft_linkedin",
  "parameters": { "topic": "the merger" },
  "assistantMessage": "I'll take you to draft a LinkedIn post about the merger."
}

User: "Create a new deal"
{
  "mode": "command",
  "intent": "create_deal",
  "parameters": {},
  "assistantMessage": "I'll take you to create a new transaction."
}

User: "Create a deal called Project Phoenix"
{
  "mode": "command",
  "intent": "create_deal",
  "parameters": { "title": "Project Phoenix" },
  "assistantMessage": "I'll take you to create the Project Phoenix transaction."
}

User: "Scan the news"
{
  "mode": "command",
  "intent": "scan_news",
  "parameters": {},
  "assistantMessage": "Starting a news scan for your monitored contacts."
}

User: "Generate an investment memo for Acme Corp"
{
  "mode": "command",
  "intent": "generate_investment_memo",
  "parameters": { "dealName": "Acme Corp" },
  "assistantMessage": "I'll help you generate an investment memo for Acme Corp."
}

User: "Share the Ultimate Gamer deal"
{
  "mode": "command",
  "intent": "share_deal",
  "parameters": { "dealName": "Ultimate Gamer" },
  "assistantMessage": "I'll take you to the Ultimate Gamer deal to share it."
}

User: "Start privileged research about antitrust"
{
  "mode": "command",
  "intent": "start_privileged_research",
  "parameters": { "topic": "antitrust" },
  "assistantMessage": "Starting a privileged research session on antitrust."
}

User: "Run a background check on John Smith"
{
  "mode": "command",
  "intent": "run_background_research",
  "parameters": { "targetName": "John Smith", "targetType": "person" },
  "assistantMessage": "Starting background research on John Smith."
}

User: "Upload to data lake"
{
  "mode": "command",
  "intent": "upload_to_data_lake",
  "parameters": {},
  "assistantMessage": "I'll take you to your data lake to upload documents."
}

User: "Create a request list"
{
  "mode": "command",
  "intent": "create_request_list",
  "parameters": {},
  "assistantMessage": "I'll take you to create a new request list."
}

User: "Add a contact for Jane Doe at Blackrock"
{
  "mode": "command",
  "intent": "create_contact",
  "parameters": { "name": "Jane Doe", "company": "Blackrock" },
  "assistantMessage": "I'll take you to add Jane Doe from Blackrock as a contact."
}

User: "Show me the heatmap"
{
  "mode": "command",
  "intent": "navigate_to_issue_heatmap",
  "parameters": {},
  "assistantMessage": "Opening the issue heatmap."
}

User: "Open due diligence"
{
  "mode": "command",
  "intent": "navigate_to_due_diligence",
  "parameters": {},
  "assistantMessage": "Opening due diligence reports."
}`;

export async function interpretUserMessage(
  message: string,
  context: AvaInterpretContext
): Promise<AvaInterpretResult> {
  try {
    // First, use global knowledge service to analyze intent and find matches
    const intentAnalysis = await globalKnowledge.analyzeUserIntent(message, {
      userId: context.userId,
      currentCaseId: context.currentCaseId,
    });
    
    console.log(`[AvaInterpreter] Intent analysis: confidence=${intentAnalysis.confidence}, intent=${intentAnalysis.intent}, entities=`, JSON.stringify(intentAnalysis.extractedEntities));
    
    const isCreateDealIntent = /\b(create|new|start|add|make|set up|setup)\b.*\b(deal|transaction)\b/i.test(message);
    const isCreateContactIntent = /\b(create|new|start|add|make|set up|setup)\b.*\b(contact)\b/i.test(message);
    const isCreateCaseIntent = /\b(create|new|start|add|make|set up|setup)\b.*\b(case|matter)\b/i.test(message);
    if (isCreateDealIntent && (intentAnalysis.intent === "go_to_deal" || intentAnalysis.intent === "navigation")) {
      console.log(`[AvaInterpreter] Detected creation intent from message, overriding go_to_deal -> create_deal`);
      const dealName = intentAnalysis.extractedEntities?.dealName;
      return {
        mode: "command",
        intent: "create_deal",
        parameters: { title: dealName || undefined },
        assistantMessage: dealName
          ? `I'll take you to create the "${dealName}" transaction.`
          : "I'll take you to create a new transaction.",
      };
    }
    if (isCreateContactIntent && (intentAnalysis.intent === "go_to_deal" || intentAnalysis.intent === "go_to_case" || intentAnalysis.intent === "navigation")) {
      console.log(`[AvaInterpreter] Detected contact creation intent, overriding -> create_contact`);
      const contactName = intentAnalysis.extractedEntities?.dealName || intentAnalysis.extractedEntities?.caseName;
      return {
        mode: "command",
        intent: "create_contact",
        parameters: { name: contactName || undefined },
        assistantMessage: contactName
          ? `I'll help you create a contact for "${contactName}".`
          : "I'll take you to create a new contact.",
      };
    }
    if (isCreateCaseIntent && (intentAnalysis.intent === "go_to_case")) {
      console.log(`[AvaInterpreter] Detected creation intent from message, overriding go_to_case`);
      const caseName = intentAnalysis.extractedEntities?.caseName;
      return {
        mode: "command",
        intent: "navigate_to_cases",
        parameters: {},
        assistantMessage: caseName
          ? `I'll take you to create a new case. You can set it up from the cases list.`
          : "I'll take you to create a new case.",
      };
    }

    // Reconcile Gemini's extracted entities with actual database records
    let resolvedCase: { id: string; title: string } | null = null;
    let resolvedDeal: { id: string; title: string } | null = null;
    
    if (intentAnalysis.extractedEntities?.caseName) {
      const caseMatch = await globalKnowledge.findBestMatch(intentAnalysis.extractedEntities.caseName, "case");
      if (caseMatch) {
        resolvedCase = { id: caseMatch.id, title: caseMatch.title };
        console.log(`[AvaInterpreter] Reconciled case "${intentAnalysis.extractedEntities.caseName}" -> "${caseMatch.title}" (ID: ${caseMatch.id})`);
      }
    }
    
    if (intentAnalysis.extractedEntities?.dealName) {
      const dealMatch = await globalKnowledge.findBestMatch(intentAnalysis.extractedEntities.dealName, "deal");
      if (dealMatch) {
        resolvedDeal = { id: dealMatch.id, title: dealMatch.title };
        console.log(`[AvaInterpreter] Reconciled deal "${intentAnalysis.extractedEntities.dealName}" -> "${dealMatch.title}" (ID: ${dealMatch.id})`);
      }
    }
    
    // If we found strong matches and have reasonable confidence, use them directly
    // Use reconciled entities if available, otherwise fall back to search results
    if (intentAnalysis.confidence >= 0.6) {
      const topMatch = intentAnalysis.suggestedMatches?.[0];
      const useCase = resolvedCase || (topMatch?.type === "case" ? { id: topMatch.id, title: topMatch.title } : null);
      const useDeal = resolvedDeal || (topMatch?.type === "deal" ? { id: topMatch.id, title: topMatch.title } : null);
      
      // Handle navigation to case
      if ((intentAnalysis.intent === "go_to_case" || intentAnalysis.intent === "navigation") && useCase) {
        console.log(`[AvaInterpreter] High confidence match: navigating to case ${useCase.id}`);
        
        // Generate narrative summary about the case
        const narrative = await generateCaseNarrativeSummary(useCase.id);
        const assistantMessage = narrative 
          ? `${narrative}\n\nOpening the case for you now.`
          : `Opening the ${useCase.title} case for you.`;
        
        return {
          mode: "command",
          intent: "navigate_to_case",
          parameters: {
            caseId: useCase.id,
            caseName: useCase.title,
            resolvedCaseName: useCase.title,
          },
          assistantMessage,
          actionLink: {
            label: `View ${useCase.title}`,
            href: `/cases/${useCase.id}`,
          },
        };
      }
      
      // Handle navigation to deal
      if ((intentAnalysis.intent === "go_to_deal" || intentAnalysis.intent === "navigation") && useDeal) {
        console.log(`[AvaInterpreter] High confidence match: navigating to deal ${useDeal.id}`);
        return {
          mode: "command",
          intent: "navigate_to_deal",
          parameters: {
            dealId: useDeal.id,
            dealName: useDeal.title,
            resolvedDealName: useDeal.title,
          },
          assistantMessage: `Opening the ${useDeal.title} transaction for you.`,
          actionLink: {
            label: `View ${useDeal.title}`,
            href: `/transactions/deals/${useDeal.id}`,
          },
        };
      }
      
      // Handle finding recorded statements
      if ((intentAnalysis.intent === "find_statement" || intentAnalysis.intent === "find_document") && topMatch?.type === "recorded_statement") {
        console.log(`[AvaInterpreter] High confidence match: navigating to recorded statement ${topMatch.id}`);
        const caseId = topMatch.caseId;
        return {
          mode: "command",
          intent: "navigate_to_statement",
          parameters: {
            statementId: topMatch.id,
            statementTitle: topMatch.title,
            caseId,
          },
          assistantMessage: `Found "${topMatch.title}"${topMatch.caseName ? ` in the ${topMatch.caseName} case` : ""}. Opening it for you.`,
          actionLink: {
            label: `View ${topMatch.title}`,
            href: `/statements/${topMatch.id}`,
          },
        };
      }
      
      // Handle go to case recordings (transcripts, depositions, etc.)
      if (intentAnalysis.intent === "go_to_case_recordings" && useCase) {
        console.log(`[AvaInterpreter] High confidence match: navigating to case recordings ${useCase.id}`);
        return {
          mode: "command",
          intent: "navigate_to_case_recordings",
          parameters: {
            caseId: useCase.id,
            caseName: useCase.title,
            resolvedCaseName: useCase.title,
            searchQuery: intentAnalysis.extractedEntities?.statementType || undefined,
          },
          assistantMessage: `Opening the Recordings tab for ${useCase.title}.`,
          actionLink: {
            label: `View Recordings in ${useCase.title}`,
            href: `/cases/${useCase.id}?tab=recordings`,
          },
        };
      }

      // Handle go to GRC risk
      if (intentAnalysis.intent === "go_to_risk") {
        const riskMatch = intentAnalysis.suggestedMatches?.find(m => m.type === "grc_risk");
        if (riskMatch) {
          console.log(`[AvaInterpreter] Navigating to GRC risk: ${riskMatch.id}`);
          return {
            mode: "command",
            intent: "navigate_to_risk",
            parameters: {
              riskId: riskMatch.id,
              riskTitle: riskMatch.title,
            },
            assistantMessage: `Opening the risk details for "${riskMatch.title}".`,
            actionLink: {
              label: `View Risk: ${riskMatch.title}`,
              href: `/risk-management/risk/${riskMatch.id}`,
            },
          };
        }
      }
      
      // Handle starting a video conference
      if (intentAnalysis.intent === "start_video_conference") {
        console.log(`[AvaInterpreter] Creating new video conference`);
        return {
          mode: "command",
          intent: "start_video_conference",
          parameters: {
            title: "Quick Video Call",
            caseId: context.currentCaseId,
          },
          assistantMessage: `Creating a new video conference and taking you there now.`,
        };
      }
    }
    
    // If confidence is low OR intent is unclear OR we failed to resolve entities, ask a clarifying question
    const shouldAskClarification = 
      intentAnalysis.confidence < 0.5 || 
      intentAnalysis.intent === "unclear" ||
      (!resolvedCase && !resolvedDeal && intentAnalysis.suggestedMatches?.length === 0);
    
    if (shouldAskClarification) {
      const clarifyingQuestion = intentAnalysis.clarifyingQuestion || "I'm not sure I understood that. Could you tell me what you're looking for?";
      
      const validMatches = (intentAnalysis.suggestedMatches || []).filter(m => m.id && m.title);
      
      if (validMatches.length > 0) {
        const suggestions = validMatches.slice(0, 3).map(m => 
          `• ${m.type === "case" ? "Case" : m.type === "deal" ? "Transaction" : "Document"}: ${m.title}`
        ).join("\n");
        
        console.log(`[AvaInterpreter] Low confidence (${intentAnalysis.confidence}), asking clarifying question with ${validMatches.length} suggestions`);
        return {
          mode: "qa",
          assistantMessage: `${clarifyingQuestion}\n\nDid you mean one of these?\n${suggestions}`,
          followUpQuestion: clarifyingQuestion,
        };
      }
      
      console.log(`[AvaInterpreter] Low confidence (${intentAnalysis.confidence}), no valid matches, asking clarifying question`);
      return {
        mode: "qa",
        assistantMessage: clarifyingQuestion,
        followUpQuestion: clarifyingQuestion,
      };
    }
    
    // Fall back to GPT-4o interpretation with enhanced context
    const contextInfo = [];
    if (context.currentRoute) contextInfo.push(`Current page: ${context.currentRoute}`);
    if (context.currentCaseId) contextInfo.push(`Viewing case ID: ${context.currentCaseId}`);
    if (context.currentCaseName) contextInfo.push(`Case name: ${context.currentCaseName}`);
    if (context.currentTab) contextInfo.push(`Current tab: ${context.currentTab}`);
    if (context.timezone) contextInfo.push(`User timezone: ${context.timezone}`);
    
    // Add suggested matches to help GPT-4o
    if (intentAnalysis.suggestedMatches && intentAnalysis.suggestedMatches.length > 0) {
      const matchInfo = intentAnalysis.suggestedMatches.slice(0, 5).map(m => 
        `${m.type}: "${m.title}" (ID: ${m.id})`
      ).join(", ");
      contextInfo.push(`Available matches from search: ${matchInfo}`);
    }
    
    // Add extracted entities to help GPT-4o
    if (intentAnalysis.extractedEntities) {
      if (intentAnalysis.extractedEntities.caseName) {
        contextInfo.push(`Extracted case name: "${intentAnalysis.extractedEntities.caseName}"`);
      }
      if (intentAnalysis.extractedEntities.dealName) {
        contextInfo.push(`Extracted deal name: "${intentAnalysis.extractedEntities.dealName}"`);
      }
      if (intentAnalysis.extractedEntities.searchQuery) {
        contextInfo.push(`Corrected query: "${intentAnalysis.extractedEntities.searchQuery}"`);
      }
    }

    const userPrompt = contextInfo.length > 0
      ? `Context:\n${contextInfo.join("\n")}\n\nUser message: "${message}"`
      : `User message: "${message}"`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        mode: "qa",
        assistantMessage: "I'm sorry, I couldn't process your request. Could you please try again?",
      };
    }

    const parsed = JSON.parse(content) as AvaInterpretResult;
    
    // Log extracted parameters for debugging
    if (parsed.mode === "command") {
      console.log(`[AvaInterpreter] Intent: ${parsed.intent}, Parameters:`, JSON.stringify(parsed.parameters));
    }

    if (parsed.mode === "command" && parsed.intent === "navigate_to_case" && parsed.parameters?.caseName) {
      console.log(`[AvaInterpreter] Case name extracted: "${parsed.parameters.caseName}" from user message: "${message}"`);
      
      // Try to find the actual case ID to link directly to the case detail page
      const foundCase = await findCaseByName(parsed.parameters.caseName);
      if (foundCase) {
        // Build URL with optional filter parameters
        let href = `/cases/${foundCase.id}`;
        const queryParams: string[] = [];
        
        // Add filter parameters if present
        if (parsed.parameters.filterPerson) {
          queryParams.push(`filterPerson=${encodeURIComponent(parsed.parameters.filterPerson)}`);
        }
        if (parsed.parameters.filterKeyword) {
          queryParams.push(`filterKeyword=${encodeURIComponent(parsed.parameters.filterKeyword)}`);
        }
        if (parsed.parameters.filterTab) {
          queryParams.push(`tab=${encodeURIComponent(parsed.parameters.filterTab)}`);
        }
        
        if (queryParams.length > 0) {
          href += `?${queryParams.join('&')}`;
        }
        
        parsed.actionLink = {
          label: `View ${foundCase.title}`,
          href,
        };
        // Store the case ID for potential use in the response
        parsed.parameters.caseId = foundCase.id;
        parsed.parameters.resolvedCaseName = foundCase.title;
      } else {
        // Fallback to search URL if case not found
        parsed.actionLink = {
          label: `Search for ${parsed.parameters.caseName}`,
          href: `/cases?search=${encodeURIComponent(parsed.parameters.caseName)}`,
        };
      }
    }
    
    // Handle navigate_to_deal intent - search for the deal/transaction
    if (parsed.mode === "command" && parsed.intent === "navigate_to_deal" && parsed.parameters?.dealName) {
      console.log(`[AvaInterpreter] Deal name extracted: "${parsed.parameters.dealName}" from user message: "${message}"`);
      
      // Try to find the actual deal ID to link directly to the deal detail page
      const foundDeal = await findDealByName(parsed.parameters.dealName);
      if (foundDeal) {
        parsed.actionLink = {
          label: `View ${foundDeal.title}`,
          href: `/transactions/deals/${foundDeal.id}`,
        };
        // Store the deal ID for potential use in the response
        parsed.parameters.dealId = foundDeal.id;
        parsed.parameters.resolvedDealName = foundDeal.title;
        parsed.assistantMessage = `Opening the ${foundDeal.title} transaction for you.`;
      } else {
        // Fallback to transactions list if deal not found
        parsed.assistantMessage = `I couldn't find a transaction matching "${parsed.parameters.dealName}". Try using part of the transaction name or navigate to Transactions to see the list.`;
        parsed.actionLink = {
          label: "Browse Transactions",
          href: "/transactions",
        };
      }
    }
    
    // Handle navigate_to_transactions intent
    if (parsed.mode === "command" && parsed.intent === "navigate_to_transactions") {
      parsed.actionLink = {
        label: "View Transactions",
        href: "/transactions",
      };
    }
    
    // Handle navigate_to_case_recordings intent - for transcripts, depositions, etc.
    if (parsed.mode === "command" && parsed.intent === "navigate_to_case_recordings" && parsed.parameters?.caseName) {
      console.log(`[AvaInterpreter] Case recordings navigation: caseName="${parsed.parameters.caseName}" from message: "${message}"`);
      
      const foundCase = await findCaseByName(parsed.parameters.caseName);
      if (foundCase) {
        let href = `/cases/${foundCase.id}?tab=recordings`;
        if (parsed.parameters.searchQuery) {
          href += `&search=${encodeURIComponent(parsed.parameters.searchQuery)}`;
        }
        
        parsed.actionLink = {
          label: `View Recordings in ${foundCase.title}`,
          href,
        };
        parsed.parameters.caseId = foundCase.id;
        parsed.parameters.resolvedCaseName = foundCase.title;
        parsed.assistantMessage = `Opening the Recordings tab for ${foundCase.title}.`;
      } else {
        parsed.assistantMessage = `I couldn't find a case matching "${parsed.parameters.caseName}". Could you try with a different name?`;
        parsed.actionLink = {
          label: "Browse Cases",
          href: "/cases",
        };
      }
    }
    
    // Log case data query intents
    if (parsed.mode === "command" && parsed.intent?.startsWith("query_case_")) {
      console.log(`[AvaInterpreter] Case data query: intent="${parsed.intent}", caseName="${parsed.parameters?.caseName}" from message: "${message}"`);
    }

    // Handle navigate_to_data_room_document intent - search for the document
    if (parsed.mode === "command" && parsed.intent === "navigate_to_data_room_document" && parsed.parameters?.documentName) {
      console.log(`[AvaInterpreter] Data room document navigation: documentName="${parsed.parameters.documentName}", dealName="${parsed.parameters.dealName}" from message: "${message}"`);
      
      try {
        const result = await transactionSearchService.findDocumentByName(
          parsed.parameters.documentName,
          parsed.parameters.dealName
        );
        
        if (result) {
          // Found the document - create navigation link with document highlighting
          const navUrl = `/transactions/data-rooms/${result.dataRoom.id}?document=${result.document.id}`;
          parsed.actionLink = {
            label: `View ${result.document.fileName}`,
            href: navUrl,
          };
          parsed.parameters.documentId = result.document.id;
          parsed.parameters.dataRoomId = result.dataRoom.id;
          parsed.parameters.dealId = result.deal.id;
          parsed.parameters.resolvedDocumentName = result.document.fileName;
          parsed.parameters.resolvedDealName = result.deal.title;
          parsed.assistantMessage = `Found "${result.document.fileName}" in the ${result.deal.title} data room. I'll take you there now.`;
        } else {
          // Document not found
          parsed.assistantMessage = `I couldn't find a document matching "${parsed.parameters.documentName}"${parsed.parameters.dealName ? ` in the ${parsed.parameters.dealName} transaction` : ''}. Please check the document name and try again.`;
          parsed.actionLink = {
            label: "Browse Transactions",
            href: "/transactions",
          };
        }
      } catch (error) {
        console.error("[AvaInterpreter] Error finding document:", error);
        parsed.assistantMessage = `I had trouble searching for that document. Please try browsing the data room directly.`;
        parsed.actionLink = {
          label: "Browse Transactions",
          href: "/transactions",
        };
      }
    }

    if (parsed.mode === "command" && parsed.intent === "schedule_interview") {
      if (!context.currentCaseId && !parsed.parameters?.caseId) {
        parsed.followUpQuestion = "Which case is this interview for?";
        parsed.assistantMessage = `I can schedule an interview with ${parsed.parameters?.intervieweeName || "the witness"}. Which case should I add it to?`;
      }
    }

    return parsed;
  } catch (error) {
    console.error("[AvaInterpreter] Error interpreting message:", error);
    
    return {
      mode: "qa",
      assistantMessage: "I encountered an error processing your request. Please try rephrasing your question or command.",
    };
  }
}

export interface AvaInteractionLog {
  userId: string;
  timestamp: Date;
  rawMessage: string;
  mode: "command" | "qa";
  intent?: string;
  parameters?: Record<string, any>;
  outcome: "success" | "error" | "pending";
  errorMessage?: string;
}

const interactionLogs: AvaInteractionLog[] = [];

export function logAvaInteraction(log: AvaInteractionLog): void {
  interactionLogs.push(log);
  console.log(`[AvaInteraction] ${log.userId} | ${log.mode} | ${log.intent || "qa"} | ${log.outcome}`);
}

export function getAvaInteractionLogs(userId?: string): AvaInteractionLog[] {
  if (userId) {
    return interactionLogs.filter(log => log.userId === userId);
  }
  return [...interactionLogs];
}
