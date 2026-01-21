import { openai } from "../ai";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, desc, and, isNotNull, or, asc } from "drizzle-orm";

function buildContextWithBudget(items: string[], budget: number): string {
  let result = "";
  let charsUsed = 0;
  
  for (const item of items) {
    const entry = item + "\n\n";
    if (charsUsed + entry.length <= budget) {
      result += entry;
      charsUsed += entry.length;
    } else {
      break;
    }
  }
  
  return result.trim();
}

interface DetectedLegalIssue {
  issue: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  sources: string[];
}

interface IncrementalAnalysisResult {
  matterType: string;
  matterTypeConfidence: number;
  detectedLegalIssues: DetectedLegalIssue[];
  aiSummaryText: string;
  keyFacts: string[];
  keyIndividuals: { name: string; role: string }[];
  keyEntities: string[];
  lawMatrix: { law: string; analysis: string }[];
  riskAssessmentText: string;
  suggestedNextSteps: string[];
  regulatorPerspective?: string;
  remediationThemes?: string[];
}

export async function triggerCaseSummaryUpdate(caseId: string, trigger: "recording" | "communication" | "manual") {
  console.log(`[CaseSummaryAutoUpdate] Triggering update for case ${caseId} (trigger: ${trigger})`);
  
  try {
    const caseData = await db.select().from(schema.cases).where(eq(schema.cases.id, caseId)).limit(1);
    if (!caseData.length) {
      console.log(`[CaseSummaryAutoUpdate] Case ${caseId} not found`);
      return null;
    }

    const theCase = caseData[0];
    
    const communications = await db
      .select()
      .from(schema.communications)
      .where(eq(schema.communications.caseId, caseId))
      .limit(50);

    const recordedStatements = await db
      .select()
      .from(schema.recordedStatements)
      .where(
        and(
          eq(schema.recordedStatements.caseId, caseId),
          or(
            isNotNull(schema.recordedStatements.transcriptText),
            isNotNull(schema.recordedStatements.aiSummary)
          )
        )
      )
      .limit(20);

    const interviews = await db
      .select()
      .from(schema.interviews)
      .where(eq(schema.interviews.caseId, caseId))
      .limit(10);

    // Fetch Court Docket documents (court pleadings)
    const courtPleadings = await db
      .select()
      .from(schema.courtPleadings)
      .where(
        and(
          eq(schema.courtPleadings.caseId, caseId),
          isNotNull(schema.courtPleadings.extractedText)
        )
      )
      .orderBy(asc(schema.courtPleadings.filingDate))
      .limit(30);

    const existingAnalysis = await db
      .select()
      .from(schema.caseAIAnalysis)
      .where(eq(schema.caseAIAnalysis.caseId, caseId))
      .limit(1);

    const totalDocuments = communications.length + recordedStatements.length + interviews.length + courtPleadings.length;
    
    if (totalDocuments === 0) {
      console.log(`[CaseSummaryAutoUpdate] No documents to analyze for case ${caseId}`);
      return null;
    }

    console.log(`[CaseSummaryAutoUpdate] Analyzing ${courtPleadings.length} court pleadings, ${communications.length} communications, ${recordedStatements.length} recordings, ${interviews.length} interviews`);

    const analysisResult = await generateIncrementalAnalysis(
      theCase,
      communications,
      recordedStatements,
      interviews,
      courtPleadings,
      existingAnalysis[0] || null
    );

    if (existingAnalysis.length > 0) {
      await db
        .update(schema.caseAIAnalysis)
        .set({
          ...analysisResult,
          documentsAnalyzedCount: totalDocuments,
          lastIncrementalUpdate: new Date(),
          lastGeneratedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.caseAIAnalysis.caseId, caseId));
    } else {
      await db.insert(schema.caseAIAnalysis).values({
        caseId,
        ...analysisResult,
        documentsAnalyzedCount: totalDocuments,
        lastIncrementalUpdate: new Date(),
      });
    }

    console.log(`[CaseSummaryAutoUpdate] Successfully updated case ${caseId} summary`);
    return analysisResult;

  } catch (error) {
    console.error(`[CaseSummaryAutoUpdate] Error updating case ${caseId}:`, error);
    throw error;
  }
}

async function generateIncrementalAnalysis(
  caseData: any,
  communications: any[],
  recordedStatements: any[],
  interviews: any[],
  courtPleadings: any[],
  existingAnalysis: any | null
): Promise<IncrementalAnalysisResult> {
  
  // Token budget: ~100k tokens available, allocate ~60k chars for all evidence (~15k tokens)
  // Priority: Court pleadings first (primary legal documents), then others
  const TOTAL_EVIDENCE_BUDGET = 60000; // characters
  const COURT_PLEADINGS_BUDGET = 40000; // characters for court docs (priority)
  const OTHER_SOURCES_BUDGET = 20000; // characters for communications, recordings, interviews
  
  // Court Docket documents are the primary source for litigation cases
  // Prioritize complaints, then answers, then motions, then others
  const prioritizedPleadings = [...courtPleadings].sort((a, b) => {
    const priority: Record<string, number> = {
      "complaint": 1, "answer": 2, "motion": 3, "brief": 4, "order": 5,
      "discovery": 6, "judgment": 7, "other": 10
    };
    const aPriority = priority[a.pleadingType || "other"] || 10;
    const bPriority = priority[b.pleadingType || "other"] || 10;
    return aPriority - bPriority;
  });
  
  // Build court pleadings context within budget
  let courtPleadingsContext = "";
  let courtCharsUsed = 0;
  const maxCharsPerDoc = Math.min(4000, Math.floor(COURT_PLEADINGS_BUDGET / Math.max(prioritizedPleadings.length, 1)));
  
  for (const p of prioritizedPleadings) {
    if (courtCharsUsed >= COURT_PLEADINGS_BUDGET) break;
    
    const textPreview = p.extractedText ? p.extractedText.substring(0, maxCharsPerDoc) : "No text extracted";
    const filingDate = p.filingDate ? new Date(p.filingDate).toLocaleDateString() : "Unknown date";
    const entry = `Document: ${p.title || p.fileName}
Type: ${formatPleadingType(p.pleadingType)} | Filed: ${filingDate} | By: ${formatFilingParty(p.filingParty)}
Content:
${textPreview}${p.extractedText && p.extractedText.length > maxCharsPerDoc ? "\n[Truncated...]" : ""}

---

`;
    if (courtCharsUsed + entry.length <= COURT_PLEADINGS_BUDGET) {
      courtPleadingsContext += entry;
      courtCharsUsed += entry.length;
    }
  }

  // Other sources share remaining budget
  const otherSourcesBudget = OTHER_SOURCES_BUDGET;
  const commBudget = Math.floor(otherSourcesBudget * 0.4);
  const recordingBudget = Math.floor(otherSourcesBudget * 0.35);
  const interviewBudget = Math.floor(otherSourcesBudget * 0.25);

  const communicationsContext = buildContextWithBudget(
    communications.slice(0, 20).map((c, i) => 
      `Email ${i + 1}: From ${c.sender} | Subject: ${c.subject || "No subject"} | Preview: ${(c.body || "").substring(0, 300)}...`
    ),
    commBudget
  );

  const recordingsContext = buildContextWithBudget(
    recordedStatements.map((r, i) => {
      const transcriptPreview = r.transcriptText ? r.transcriptText.substring(0, 500) : "No transcript";
      return `Recording ${i + 1}: ${r.title || "Untitled"} (${r.statementType}) by ${r.speakerName || "Unknown"} | Preview: ${transcriptPreview}...`;
    }),
    recordingBudget
  );

  const interviewsContext = buildContextWithBudget(
    interviews.map((i, idx) => {
      const transcriptPreview = i.transcriptText ? i.transcriptText.substring(0, 300) : "No transcript";
      return `Interview ${idx + 1}: ${i.intervieweeName} (${i.interviewType}) | Preview: ${transcriptPreview}...`;
    }),
    interviewBudget
  );

  const existingContext = existingAnalysis ? `
**Previous AI Analysis (to be updated/enhanced):**
- Matter Type: ${existingAnalysis.matterType || "Not determined"}
- Summary: ${existingAnalysis.aiSummaryText || "None"}
- Key Facts: ${JSON.stringify(existingAnalysis.keyFacts || [])}
- Detected Issues: ${JSON.stringify(existingAnalysis.detectedLegalIssues || [])}
` : "";

  const prompt = `You are an expert legal compliance analyst. Analyze the following case evidence and provide a comprehensive analysis.

**CRITICAL TASK: Detect the Matter Type and Legal Issues**

**Case Information:**
- Title: ${caseData.title}
- Violation Type: ${caseData.violationType}
- Status: ${caseData.status}
- Regulatory Body: ${caseData.regulatoryBody || "Not specified"}
- Description: ${caseData.description || "No description provided"}

${existingContext}

**EVIDENCE TO ANALYZE:**

${courtPleadingsContext ? `**Court Docket / Legal Filings (${courtPleadings.length} documents):**
These are the official court filings - complaints, motions, briefs, and other pleadings. Analyze these carefully to understand the legal claims, causes of action, parties, and timeline.

${courtPleadingsContext}
` : "No court filings available."}

${communicationsContext ? `**Communications (${communications.length} emails/messages):**
${communicationsContext}
` : "No communications available."}

${recordingsContext ? `**Recorded Statements & Depositions (${recordedStatements.length} recordings):**
${recordingsContext}
` : "No recordings available."}

${interviewsContext ? `**Interviews (${interviews.length} interviews):**
${interviewsContext}
` : "No interviews available."}

**REQUIRED OUTPUT:**

1. **matterType**: Classify this case into ONE primary category:
   - "litigation_fraud" - Fraud claims in civil litigation
   - "hr_investigation" - HR misconduct, workplace issues
   - "fcpa_violation" - Foreign Corrupt Practices Act violations (bribery, foreign officials)
   - "sexual_harassment" - Sexual harassment or hostile work environment
   - "antitrust" - Competition law, price fixing, monopoly
   - "securities_fraud" - SEC violations, insider trading
   - "bsa_aml" - Bank Secrecy Act, Anti-Money Laundering
   - "data_privacy" - GDPR, CCPA, data breach
   - "environmental" - Environmental regulation violations
   - "product_liability" - Product safety, recalls
   - "contract_dispute" - Breach of contract
   - "regulatory_compliance" - General regulatory matters
   - "internal_investigation" - General internal investigation

2. **matterTypeConfidence**: 0-100 confidence score for the matter type classification

3. **detectedLegalIssues**: Array of specific legal issues found. For EACH issue:
   - "issue": Name of legal issue (e.g., "Breach of Contract", "Fraudulent Misrepresentation", "Quid Pro Quo Harassment", "FCPA Anti-Bribery Violation")
   - "description": Specific explanation of how this issue appears in the evidence
   - "severity": "critical" | "high" | "medium" | "low"
   - "sources": Array of evidence references (e.g., ["Email from John Smith 12/15", "Deposition of Jane Doe"])

4. **aiSummaryText**: Comprehensive narrative summary of the case focusing on:
   - What happened
   - Who is involved
   - Timeline of events
   - Potential liability exposure

5. **keyFacts**: Array of 5-10 key factual findings from the evidence

6. **keyIndividuals**: Array of key individuals with their roles (objects with "name" and "role")

7. **keyEntities**: Array of key companies, organizations, or entities involved

8. **lawMatrix**: Array of applicable laws. For EACH:
   - "law": Full name (e.g., "Foreign Corrupt Practices Act (FCPA)", "Title VII Civil Rights Act")
   - "analysis": How this law applies and potential violations

9. **riskAssessmentText**: Detailed risk assessment narrative

10. **suggestedNextSteps**: Array of recommended next actions

11. **regulatorPerspective**: How regulators would view this case

12. **remediationThemes**: Array of remediation themes

Format as valid JSON with these exact keys.`;

  // Log prompt size for debugging
  const promptLength = prompt.length;
  const estimatedTokens = Math.ceil(promptLength / 4); // rough estimate: 1 token ~4 chars
  console.log(`[CaseSummaryAutoUpdate] Prompt size: ${promptLength} chars (~${estimatedTokens} tokens)`);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 4000,
    });

    const response = JSON.parse(completion.choices[0].message.content || "{}");
    
    return {
      matterType: response.matterType || "internal_investigation",
      matterTypeConfidence: response.matterTypeConfidence || 50,
      detectedLegalIssues: response.detectedLegalIssues || [],
      aiSummaryText: response.aiSummaryText || "",
      keyFacts: response.keyFacts || [],
      keyIndividuals: response.keyIndividuals || [],
      keyEntities: response.keyEntities || [],
      lawMatrix: response.lawMatrix || [],
      riskAssessmentText: response.riskAssessmentText || "",
      suggestedNextSteps: response.suggestedNextSteps || [],
      regulatorPerspective: response.regulatorPerspective,
      remediationThemes: response.remediationThemes,
    };

  } catch (error) {
    console.error("[CaseSummaryAutoUpdate] OpenAI error:", error);
    throw error;
  }
}

export function formatMatterTypeDisplay(matterType: string | null): string {
  if (!matterType) return "Investigation";
  
  const displayMap: Record<string, string> = {
    "litigation_fraud": "Litigation - Fraud",
    "hr_investigation": "HR Investigation",
    "fcpa_violation": "FCPA Violation",
    "sexual_harassment": "Sexual Harassment",
    "antitrust": "Antitrust",
    "securities_fraud": "Securities Fraud",
    "bsa_aml": "BSA/AML",
    "data_privacy": "Data Privacy",
    "environmental": "Environmental",
    "product_liability": "Product Liability",
    "contract_dispute": "Contract Dispute",
    "regulatory_compliance": "Regulatory Compliance",
    "internal_investigation": "Internal Investigation",
  };
  
  return displayMap[matterType] || matterType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function formatPleadingType(type: string | null): string {
  if (!type) return "Document";
  
  const displayMap: Record<string, string> = {
    "complaint": "Complaint",
    "answer": "Answer",
    "motion": "Motion",
    "brief": "Brief",
    "order": "Court Order",
    "discovery": "Discovery",
    "subpoena": "Subpoena",
    "notice": "Notice",
    "stipulation": "Stipulation",
    "judgment": "Judgment",
    "appeal": "Appeal",
    "exhibit": "Exhibit",
    "affidavit": "Affidavit",
    "declaration": "Declaration",
    "other": "Other Filing",
  };
  
  return displayMap[type] || type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function formatFilingParty(party: string | null): string {
  if (!party) return "Unknown";
  
  const displayMap: Record<string, string> = {
    "plaintiff": "Plaintiff",
    "defendant": "Defendant",
    "court": "Court",
    "third_party": "Third Party",
  };
  
  return displayMap[party] || party.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}
