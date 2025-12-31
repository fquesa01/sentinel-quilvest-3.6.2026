import { openai } from "../ai";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, desc, and, isNotNull, or } from "drizzle-orm";

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

    const existingAnalysis = await db
      .select()
      .from(schema.caseAIAnalysis)
      .where(eq(schema.caseAIAnalysis.caseId, caseId))
      .limit(1);

    const totalDocuments = communications.length + recordedStatements.length + interviews.length;
    
    if (totalDocuments === 0) {
      console.log(`[CaseSummaryAutoUpdate] No documents to analyze for case ${caseId}`);
      return null;
    }

    console.log(`[CaseSummaryAutoUpdate] Analyzing ${communications.length} communications, ${recordedStatements.length} recordings, ${interviews.length} interviews`);

    const analysisResult = await generateIncrementalAnalysis(
      theCase,
      communications,
      recordedStatements,
      interviews,
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
  existingAnalysis: any | null
): Promise<IncrementalAnalysisResult> {
  
  const communicationsContext = communications.slice(0, 30).map((c, i) => 
    `Email ${i + 1}: From ${c.sender} | Subject: ${c.subject || "No subject"} | Preview: ${(c.body || "").substring(0, 400)}...`
  ).join("\n\n");

  const recordingsContext = recordedStatements.map((r, i) => {
    const transcriptPreview = r.transcriptText ? r.transcriptText.substring(0, 800) : "No transcript";
    const summaryText = r.aiSummary || "No AI summary";
    return `Recording ${i + 1}: ${r.title || "Untitled"} (${r.statementType}) by ${r.speakerName || "Unknown"}
Transcript preview: ${transcriptPreview}...
AI Summary: ${summaryText}`;
  }).join("\n\n");

  const interviewsContext = interviews.map((i, idx) => {
    const transcriptPreview = i.transcriptText ? i.transcriptText.substring(0, 500) : "No transcript";
    const summaryText = i.aiSummaryText || "No AI summary";
    return `Interview ${idx + 1}: ${i.intervieweeName} (${i.interviewType})
Status: ${i.status}
Transcript preview: ${transcriptPreview}...
AI Summary: ${summaryText}`;
  }).join("\n\n");

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
