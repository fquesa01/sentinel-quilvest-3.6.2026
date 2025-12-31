import { openai } from "../ai";
import { storage } from "../storage";
import type { 
  AskCaseRequest, 
  AskCaseResponse, 
  CaseEvidenceItem,
  Communication,
  Interview,
  InterviewResponse,
  IngestedChatMessage,
  Finding,
  InterviewTranscriptSegment,
  LiveInterviewSession
} from "@shared/schema";

interface EvidenceContext {
  documents: { id: string; content: string; metadata: any }[];
  interviews: { id: string; content: string; metadata: any }[];
  chatMessages: { id: string; content: string; metadata: any }[];
  findings: { id: string; content: string; metadata: any }[];
  transcriptSegments: { id: string; content: string; metadata: any }[];
}

function truncateText(text: string, maxLength: number = 500): string {
  if (!text || text.length <= maxLength) return text || "";
  return text.substring(0, maxLength) + "...";
}

function extractRelevantExcerpt(text: string, query: string, contextLength: number = 200): string {
  if (!text) return "";
  
  const lowerText = text.toLowerCase();
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  let bestIndex = -1;
  for (const word of queryWords) {
    const idx = lowerText.indexOf(word);
    if (idx !== -1) {
      bestIndex = idx;
      break;
    }
  }
  
  if (bestIndex === -1) {
    return truncateText(text, contextLength * 2);
  }
  
  const start = Math.max(0, bestIndex - contextLength);
  const end = Math.min(text.length, bestIndex + contextLength);
  
  let excerpt = text.substring(start, end);
  if (start > 0) excerpt = "..." + excerpt;
  if (end < text.length) excerpt = excerpt + "...";
  
  return excerpt;
}

async function gatherCaseEvidence(caseId: string): Promise<EvidenceContext> {
  const [
    communications,
    interviews,
    chatMessagesResult,
    caseFindings,
    liveInterviewSessionsResult,
    interviewsWithResponsesResult
  ] = await Promise.all([
    storage.getCommunications({ caseId }),
    storage.getInterviews({ caseId }),
    storage.getIngestedChatMessages({ caseId }).catch((err) => {
      console.warn("[CaseInvestigation] Could not fetch chat messages (table may not exist):", err.message);
      return [];
    }),
    storage.getFindings(caseId),
    storage.getLiveInterviewSessions({ caseId }).catch((err) => {
      console.warn("[CaseInvestigation] Could not fetch live interview sessions:", err.message);
      return [];
    }),
    storage.getInterviewsWithResponses(caseId).catch((err) => {
      console.warn("[CaseInvestigation] Could not fetch interview responses:", err.message);
      return [];
    }),
  ]);
  
  const chatMessages = chatMessagesResult || [];
  const liveInterviewSessions = liveInterviewSessionsResult || [];
  const interviewsWithResponses = interviewsWithResponsesResult || [];
  
  const responsesByInterviewId = new Map<string, InterviewResponse[]>();
  for (const { interview, responses } of interviewsWithResponses) {
    responsesByInterviewId.set(interview.id, responses);
  }

  const documents = communications.map((doc: Communication) => ({
    id: doc.id,
    content: `Subject: ${doc.subject}\nFrom: ${doc.sender}\nDate: ${doc.timestamp}\n\n${doc.body}`,
    metadata: {
      subject: doc.subject,
      sender: doc.sender,
      recipients: doc.recipients,
      timestamp: doc.timestamp,
      communicationType: doc.communicationType,
    },
  }));

  const interviewData = interviews.map((interview: Interview) => {
    const sections = [
      `Interview with ${interview.intervieweeName || "Unknown"}`,
      `Type: ${interview.interviewType}`,
      `Date: ${interview.scheduledFor}`,
      `Status: ${interview.status}`,
    ];

    if (interview.notes) {
      sections.push(`\nNotes: ${interview.notes}`);
    }

    if (interview.transcriptText) {
      sections.push(`\nTranscript: ${interview.transcriptText}`);
    }

    const responses = responsesByInterviewId.get(interview.id);
    if (responses && responses.length > 0) {
      sections.push(`\n=== QUESTION & ANSWER RESPONSES (${responses.length} responses) ===`);
      for (const resp of responses) {
        const qNum = (resp.questionIndex || 0) + 1;
        sections.push(`\nQ${qNum}: ${resp.questionText || "Question"}`);
        if (resp.transcriptText) {
          sections.push(`A${qNum}: ${resp.transcriptText}`);
        } else {
          sections.push(`A${qNum}: [Response recorded but not yet transcribed]`);
        }
      }
    }

    if (interview.aiSummaryText) {
      sections.push(`\n=== AI INTERVIEW ANALYSIS ===\n${interview.aiSummaryText}`);
    }

    return {
      id: interview.id,
      content: sections.join("\n"),
      metadata: {
        subjectName: interview.intervieweeName,
        subjectTitle: interview.intervieweeEmail,
        interviewType: interview.interviewType,
        scheduledFor: interview.scheduledFor,
        status: interview.status,
        hasAiSummary: !!interview.aiSummaryText,
        responseCount: responses?.length || 0,
      },
    };
  });

  const chatData = chatMessages.map((msg: IngestedChatMessage) => ({
    id: msg.id,
    content: `[${msg.sourceType}] ${msg.senderName || "Unknown"}: ${msg.text || ""}`,
    metadata: {
      platform: msg.sourceType,
      senderName: msg.senderName,
      senderPhone: msg.senderPhone,
      timestamp: msg.sentAt,
      threadId: msg.threadId,
    },
  }));

  const findingsData = caseFindings.map((finding: Finding & { tags: any[]; evidenceLinkCount: number }) => ({
    id: finding.id,
    content: `${finding.title}\n\n${finding.content}`,
    metadata: {
      title: finding.title,
      entryType: finding.entryType,
      isPinned: finding.isPinned,
      authorId: finding.authorId,
    },
  }));

  const interviewMap = new Map(interviews.map(i => [i.id, i]));

  const transcriptSegments: { id: string; content: string; metadata: any }[] = [];
  for (const session of liveInterviewSessions) {
    try {
      const segments = await storage.getInterviewTranscriptSegments(session.id);
      const parentInterview = interviewMap.get(session.interviewId);
      for (const segment of segments) {
        transcriptSegments.push({
          id: segment.id,
          content: `[${segment.speakerName || segment.speakerId || "Unknown"}]: ${segment.text}`,
          metadata: {
            sessionId: session.id,
            speaker: segment.speakerName || segment.speakerId,
            startTime: segment.startTime,
            endTime: segment.endTime,
            sentiment: segment.sentiment,
            riskLevel: segment.riskLevel,
            interviewSubject: parentInterview?.intervieweeName || "Unknown",
          },
        });
      }
    } catch (err) {
      console.error(`[CaseInvestigation] Error fetching transcript segments for session ${session.id}:`, err);
    }
  }

  return {
    documents,
    interviews: interviewData,
    chatMessages: chatData,
    findings: findingsData,
    transcriptSegments,
  };
}

interface ScoredItem<T> {
  item: T;
  score: number;
  originalIndex: number;
}

function scoreItemByRelevance(content: string, queryTerms: string[]): number {
  if (!content) return 0;
  const lowerContent = content.toLowerCase();
  let score = 0;
  
  for (const term of queryTerms) {
    if (term.length < 2) continue;
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = lowerContent.match(regex);
    if (matches) {
      score += matches.length * (term.length > 4 ? 10 : 5);
    }
  }
  
  return score;
}

function extractQueryTerms(question: string): string[] {
  const stopWords = new Set(['who', 'what', 'where', 'when', 'why', 'how', 'is', 'are', 'was', 'were', 
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about',
    'this', 'that', 'these', 'those', 'it', 'they', 'them', 'their', 'there', 'here', 'can', 'could',
    'would', 'should', 'will', 'has', 'have', 'had', 'do', 'does', 'did', 'be', 'been', 'being']);
  
  const words = question.toLowerCase().split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
  
  const quotedPhrases = question.match(/"([^"]+)"/g)?.map(p => p.replace(/"/g, '').toLowerCase()) || [];
  
  const multiWordNames: string[] = [];
  const cleanQuestion = question.toLowerCase();
  const namePattern = /([a-z]+\s+[a-z]+)/gi;
  let match;
  while ((match = namePattern.exec(cleanQuestion)) !== null) {
    const phrase = match[1];
    const phraseWords = phrase.split(/\s+/);
    if (phraseWords.length === 2 && phraseWords.every(w => w.length > 2 && !stopWords.has(w))) {
      multiWordNames.push(phrase);
    }
  }
  
  const allTerms = [...quotedPhrases, ...multiWordNames, ...words];
  return allTerms.filter((term, index) => allTerms.indexOf(term) === index);
}

function rankAndSelectEvidence<T extends { content: string }>(
  items: T[],
  queryTerms: string[],
  maxItems: number,
  minRelevantItems: number = 5
): { selected: T[]; originalIndices: number[] } {
  const scored: ScoredItem<T>[] = items.map((item, index) => ({
    item,
    score: scoreItemByRelevance(item.content, queryTerms),
    originalIndex: index,
  }));
  
  scored.sort((a, b) => b.score - a.score);
  
  const relevantItems = scored.filter(s => s.score > 0);
  const irrelevantItems = scored.filter(s => s.score === 0);
  
  const selected: ScoredItem<T>[] = [];
  
  const relevantToTake = Math.min(relevantItems.length, Math.max(minRelevantItems, Math.floor(maxItems * 0.8)));
  selected.push(...relevantItems.slice(0, relevantToTake));
  
  const remainingSlots = maxItems - selected.length;
  if (remainingSlots > 0 && irrelevantItems.length > 0) {
    selected.push(...irrelevantItems.slice(0, remainingSlots));
  }
  
  return {
    selected: selected.map(s => s.item),
    originalIndices: selected.map(s => s.originalIndex),
  };
}

interface RankedEvidence {
  documents: { id: string; content: string; metadata: any }[];
  interviews: { id: string; content: string; metadata: any }[];
  chatMessages: { id: string; content: string; metadata: any }[];
  findings: { id: string; content: string; metadata: any }[];
  transcriptSegments: { id: string; content: string; metadata: any }[];
}

const MAX_TOTAL_CHARS = 60000;
const MAX_DOCS_CHARS = 35000;
const MAX_INTERVIEWS_CHARS = 10000;
const MAX_CHATS_CHARS = 8000;
const MAX_FINDINGS_CHARS = 5000;
const MAX_TRANSCRIPTS_CHARS = 8000;

function buildContextWithBudget(
  items: { id: string; content: string; metadata: any }[],
  prefix: string,
  queryTerms: string[],
  maxTotalChars: number,
  relevantMaxLen: number = 1200,
  otherMaxLen: number = 400
): { context: string; includedItems: { id: string; content: string; metadata: any }[] } {
  const includedItems: { id: string; content: string; metadata: any }[] = [];
  let totalChars = 0;
  const contextParts: string[] = [];
  
  for (let i = 0; i < items.length && totalChars < maxTotalChars; i++) {
    const item = items[i];
    const score = scoreItemByRelevance(item.content, queryTerms);
    const maxLen = score > 0 ? relevantMaxLen : otherMaxLen;
    const truncated = truncateText(item.content, maxLen);
    const entry = `[${prefix}-${i + 1}] ID: ${item.id}\n${truncated}`;
    
    if (totalChars + entry.length > maxTotalChars) break;
    
    contextParts.push(entry);
    includedItems.push(item);
    totalChars += entry.length;
  }
  
  return {
    context: contextParts.join("\n\n"),
    includedItems,
  };
}

function buildSearchPrompt(question: string, evidence: EvidenceContext): { prompt: string; rankedEvidence: RankedEvidence } {
  const queryTerms = extractQueryTerms(question);
  console.log(`[CaseInvestigation] Query terms extracted: ${queryTerms.join(', ')}`);
  
  const { selected: selectedDocs } = rankAndSelectEvidence(evidence.documents, queryTerms, 50, 20);
  const { selected: selectedInterviews } = rankAndSelectEvidence(evidence.interviews, queryTerms, 10, 5);
  const { selected: selectedChats } = rankAndSelectEvidence(evidence.chatMessages, queryTerms, 30, 10);
  const { selected: selectedFindings } = rankAndSelectEvidence(evidence.findings, queryTerms, 15, 5);
  const { selected: selectedTranscripts } = rankAndSelectEvidence(evidence.transcriptSegments, queryTerms, 30, 10);
  
  const relevantDocCount = selectedDocs.filter(d => scoreItemByRelevance(d.content, queryTerms) > 0).length;
  console.log(`[CaseInvestigation] Relevance ranking: ${relevantDocCount}/${selectedDocs.length} docs match query terms`);
  
  const { context: docContext, includedItems: includedDocs } = buildContextWithBudget(
    selectedDocs, "DOC", queryTerms, MAX_DOCS_CHARS, 1200, 400
  );
  
  const { context: interviewContext, includedItems: includedInterviews } = buildContextWithBudget(
    selectedInterviews, "INT", queryTerms, MAX_INTERVIEWS_CHARS, 800, 600
  );
  
  const { context: chatContext, includedItems: includedChats } = buildContextWithBudget(
    selectedChats, "CHAT", queryTerms, MAX_CHATS_CHARS, 400, 300
  );
  
  const { context: findingsContext, includedItems: includedFindings } = buildContextWithBudget(
    selectedFindings, "FIND", queryTerms, MAX_FINDINGS_CHARS, 500, 400
  );
  
  const { context: transcriptContext, includedItems: includedTranscripts } = buildContextWithBudget(
    selectedTranscripts, "TRANS", queryTerms, MAX_TRANSCRIPTS_CHARS, 400, 300
  );
  
  const totalChars = docContext.length + interviewContext.length + chatContext.length + findingsContext.length + transcriptContext.length;
  console.log(`[CaseInvestigation] Context budget: ${totalChars} chars (max: ${MAX_TOTAL_CHARS}), included: ${includedDocs.length} docs, ${includedInterviews.length} interviews`);

  const prompt = `You are an expert legal investigator analyzing case evidence. Answer the investigator's question based ONLY on the evidence provided below. Be specific and cite evidence by its ID (e.g., [DOC-1], [INT-2], [TRANS-5]).

INVESTIGATOR'S QUESTION:
${question}

===== CASE EVIDENCE =====

--- DOCUMENTS & EMAILS (${evidence.documents.length} total, showing ${includedDocs.length} most relevant) ---
${docContext || "No documents available."}

--- INTERVIEWS (${evidence.interviews.length} total, showing ${includedInterviews.length} most relevant) ---
${interviewContext || "No interviews available."}

--- CHAT MESSAGES (${evidence.chatMessages.length} total, showing ${includedChats.length} most relevant) ---
${chatContext || "No chat messages available."}

--- EXISTING FINDINGS (${evidence.findings.length} total, showing ${includedFindings.length} most relevant) ---
${findingsContext || "No existing findings."}

--- INTERVIEW TRANSCRIPTS (${evidence.transcriptSegments.length} segments, showing ${includedTranscripts.length} most relevant) ---
${transcriptContext || "No transcript segments available."}

===== INSTRUCTIONS =====

1. Analyze ALL evidence carefully to answer the investigator's question
2. Cite specific evidence using the format [DOC-X], [INT-X], [CHAT-X], [FIND-X], or [TRANS-X]
3. Quote relevant passages when helpful
4. If evidence is contradictory, note the contradictions
5. If evidence is insufficient, say so clearly
6. Rate your confidence (0-100) based on the strength of supporting evidence

Respond in JSON format:
{
  "answer": "Your detailed answer here, citing evidence with [DOC-X], [INT-X], etc.",
  "confidence": 85,
  "citedEvidence": [
    {"type": "document", "index": 1, "reason": "Why this evidence is relevant"},
    {"type": "interview", "index": 2, "reason": "Why this evidence is relevant"},
    {"type": "transcript", "index": 5, "reason": "Why this evidence is relevant"}
  ],
  "contradictions": ["Any contradictions found"],
  "gaps": ["Any gaps in the evidence"]
}`;

  const rankedEvidence: RankedEvidence = {
    documents: includedDocs,
    interviews: includedInterviews,
    chatMessages: includedChats,
    findings: includedFindings,
    transcriptSegments: includedTranscripts,
  };

  return { prompt, rankedEvidence };
}

function parseAIResponse(responseText: string, rankedEvidence: RankedEvidence, question: string): {
  answer: string;
  confidence: number;
  evidenceItems: CaseEvidenceItem[];
} {
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        answer: responseText,
        confidence: 50,
        evidenceItems: [],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const evidenceItems: CaseEvidenceItem[] = [];

    if (parsed.citedEvidence && Array.isArray(parsed.citedEvidence)) {
      for (const cite of parsed.citedEvidence) {
        const index = (cite.index || 1) - 1;
        
        switch (cite.type) {
          case "document":
            if (rankedEvidence.documents[index]) {
              const doc = rankedEvidence.documents[index];
              evidenceItems.push({
                sourceType: "document",
                sourceId: doc.id,
                title: doc.metadata.subject || "Document",
                excerpt: extractRelevantExcerpt(doc.content, question),
                timestamp: doc.metadata.timestamp?.toString(),
                relevanceScore: parsed.confidence || 70,
                metadata: {
                  sender: doc.metadata.sender,
                  recipient: Array.isArray(doc.metadata.recipients) 
                    ? doc.metadata.recipients[0] 
                    : doc.metadata.recipients,
                },
              });
            }
            break;
          case "interview":
            if (rankedEvidence.interviews[index]) {
              const int = rankedEvidence.interviews[index];
              evidenceItems.push({
                sourceType: "interview",
                sourceId: int.id,
                title: `Interview: ${int.metadata.subjectName || "Unknown"}`,
                excerpt: extractRelevantExcerpt(int.content, question),
                timestamp: int.metadata.scheduledFor?.toString(),
                relevanceScore: parsed.confidence || 70,
                metadata: {
                  interviewSubject: int.metadata.subjectName,
                },
              });
            }
            break;
          case "chat":
          case "chat_message":
            if (rankedEvidence.chatMessages[index]) {
              const chat = rankedEvidence.chatMessages[index];
              evidenceItems.push({
                sourceType: "chat_message",
                sourceId: chat.id,
                title: `${chat.metadata.platform}: ${chat.metadata.senderName}`,
                excerpt: chat.content,
                timestamp: chat.metadata.timestamp?.toString(),
                relevanceScore: parsed.confidence || 70,
                metadata: {
                  sender: chat.metadata.senderName,
                },
              });
            }
            break;
          case "finding":
            if (rankedEvidence.findings[index]) {
              const finding = rankedEvidence.findings[index];
              evidenceItems.push({
                sourceType: "finding",
                sourceId: finding.id,
                title: finding.metadata.title || "Finding",
                excerpt: extractRelevantExcerpt(finding.content, question),
                relevanceScore: parsed.confidence || 70,
                metadata: {
                  findingType: finding.metadata.entryType,
                },
              });
            }
            break;
          case "transcript":
          case "transcript_segment":
            if (rankedEvidence.transcriptSegments[index]) {
              const seg = rankedEvidence.transcriptSegments[index];
              evidenceItems.push({
                sourceType: "transcript_segment",
                sourceId: seg.id,
                title: `Transcript: ${seg.metadata.interviewSubject || "Interview"}`,
                excerpt: seg.content,
                timestamp: seg.metadata.startTime?.toString(),
                relevanceScore: parsed.confidence || 70,
                metadata: {
                  speaker: seg.metadata.speaker,
                  segmentTimestamp: seg.metadata.startTime?.toString(),
                  interviewSubject: seg.metadata.interviewSubject,
                },
              });
            }
            break;
        }
      }
    }

    return {
      answer: parsed.answer || responseText,
      confidence: parsed.confidence || 50,
      evidenceItems,
    };
  } catch (err) {
    console.error("[CaseInvestigation] Error parsing AI response:", err);
    return {
      answer: responseText,
      confidence: 50,
      evidenceItems: [],
    };
  }
}

export async function askAboutCase(
  caseId: string,
  request: AskCaseRequest,
  userId: string
): Promise<AskCaseResponse> {
  const startTime = Date.now();
  
  console.log(`[CaseInvestigation] Processing question for case ${caseId}: "${request.question.substring(0, 100)}..."`);
  
  const evidence = await gatherCaseEvidence(caseId);
  
  console.log(`[CaseInvestigation] Gathered evidence: ${evidence.documents.length} docs, ${evidence.interviews.length} interviews, ${evidence.chatMessages.length} chats, ${evidence.findings.length} findings, ${evidence.transcriptSegments.length} transcript segments`);
  
  const { prompt, rankedEvidence } = buildSearchPrompt(request.question, evidence);
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert legal investigator assistant. Analyze case evidence thoroughly and provide well-cited answers. Always respond in the specified JSON format.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 4000,
    });

    const responseText = completion.choices[0]?.message?.content || "";
    
    const { answer, confidence, evidenceItems } = parseAIResponse(responseText, rankedEvidence, request.question);
    
    const processingTimeMs = Date.now() - startTime;
    
    console.log(`[CaseInvestigation] Completed in ${processingTimeMs}ms: ${evidence.interviews.length} interviews, ${evidence.documents.length} docs, confidence=${confidence}%`);
    
    return {
      answer,
      confidence,
      evidenceItems,
      searchedSources: {
        documents: evidence.documents.length,
        interviews: evidence.interviews.length,
        chatMessages: evidence.chatMessages.length,
        findings: evidence.findings.length,
      },
      processingTimeMs,
    };
  } catch (err: any) {
    console.error("[CaseInvestigation] OpenAI API error:", err);
    // Check for common error types and provide helpful messages
    if (err.status === 502 || err.message?.includes('502')) {
      throw new Error("AI service temporarily unavailable. Please try again in a moment.");
    } else if (err.status === 429 || err.message?.includes('rate')) {
      throw new Error("AI service rate limit reached. Please wait a moment before trying again.");
    } else if (err.status === 503 || err.message?.includes('503')) {
      throw new Error("AI service is overloaded. Please try again in a few seconds.");
    } else if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
      throw new Error("Connection to AI service timed out. Please try again.");
    }
    throw new Error(`AI analysis failed: ${err.message || "Unknown error"}`);
  }
}
