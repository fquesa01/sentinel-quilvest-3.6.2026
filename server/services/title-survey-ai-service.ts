import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GOOGLE_API_KEY;
let ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!ai) {
    if (!apiKey) throw new Error("GOOGLE_API_KEY not configured");
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export interface ExtractedSurveyData {
  surveyInfo: {
    surveyorCompany?: string;
    surveyorName?: string;
    surveyorLicense?: string;
    certificationDate?: string;
    propertyAddress?: string;
    legalDescription?: string;
    totalAreaSqft?: number;
    totalAreaAcres?: number;
    floodZone?: string;
    floodMapNumber?: string;
  };
  boundaries: Array<{
    direction?: string;
    bearing?: string;
    distanceFt?: number;
    adjoinsDescription?: string;
    monumentType?: string;
    monumentFound?: boolean;
    orderIndex: number;
  }>;
  easements: Array<{
    easementType?: string;
    locationDescription?: string;
    holder?: string;
    recordingReference?: string;
    widthFt?: number;
    notes?: string;
  }>;
  encroachments: Array<{
    description?: string;
    severity?: string;
    encroachmentDistanceFt?: number;
    encroachmentDirection?: string;
    encroachingElement?: string;
    affectedBoundary?: string;
    recommendedAction?: string;
  }>;
  improvements: Array<{
    improvementType?: string;
    approxSqft?: number;
    setbackFrontFt?: number;
    setbackRearFt?: number;
    setbackLeftFt?: number;
    setbackRightFt?: number;
    zoningCompliant?: boolean;
    notes?: string;
  }>;
  summary: string;
}

export async function extractSurveyData(surveyText: string): Promise<ExtractedSurveyData> {
  const genai = getAI();
  const prompt = `You are a title insurance specialist analyzing a property survey document. Extract ALL structured data from the following survey text and return a JSON object with these fields:

{
  "surveyInfo": {
    "surveyorCompany": "string or null",
    "surveyorName": "string or null",
    "surveyorLicense": "string or null",
    "certificationDate": "YYYY-MM-DD or null",
    "propertyAddress": "string or null",
    "legalDescription": "string or null",
    "totalAreaSqft": number or null,
    "totalAreaAcres": number or null,
    "floodZone": "string or null",
    "floodMapNumber": "string or null"
  },
  "boundaries": [
    {
      "direction": "North/South/East/West/NE/NW/SE/SW",
      "bearing": "N 45° 30' 15\" E format",
      "distanceFt": number,
      "adjoinsDescription": "what this boundary adjoins",
      "monumentType": "iron pin/concrete monument/etc",
      "monumentFound": true/false,
      "orderIndex": sequential number starting at 0
    }
  ],
  "easements": [
    {
      "easementType": "utility|drainage|access|conservation|sidewalk|ingress_egress|other",
      "locationDescription": "where on the property",
      "holder": "who holds the easement",
      "recordingReference": "recording book/page info",
      "widthFt": number or null,
      "notes": "additional details"
    }
  ],
  "encroachments": [
    {
      "description": "what is encroaching",
      "severity": "minor|moderate|major|critical",
      "encroachmentDistanceFt": number,
      "encroachmentDirection": "direction of encroachment",
      "encroachingElement": "fence/structure/etc",
      "affectedBoundary": "which boundary is affected",
      "recommendedAction": "suggested resolution"
    }
  ],
  "improvements": [
    {
      "improvementType": "main dwelling/garage/shed/pool/driveway/fence/etc",
      "approxSqft": number or null,
      "setbackFrontFt": number or null,
      "setbackRearFt": number or null,
      "setbackLeftFt": number or null,
      "setbackRightFt": number or null,
      "zoningCompliant": true/false/null,
      "notes": "additional info"
    }
  ],
  "summary": "A comprehensive paragraph summarizing the survey findings, key observations, potential issues, and recommendations for the title examiner."
}

Return ONLY valid JSON, no markdown formatting. If a field has no data, use null for scalar values or empty array for arrays.

SURVEY TEXT:
${surveyText}`;

  const response = await genai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: { temperature: 0.1 },
  });

  const text = response.text?.trim() || "{}";
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned) as ExtractedSurveyData;
}

export interface ExceptionAnalysis {
  riskLevel: string;
  riskAssessment: string;
  recommendedActions: string[];
  relatedConsiderations: string[];
  surveyFindings?: string;
}

export async function analyzeException(
  exceptionData: { type: string; scheduleType: string; description: string; status: string },
  surveyContext?: { easements: any[]; encroachments: any[]; boundaries: any[] },
): Promise<ExceptionAnalysis> {
  const genai = getAI();
  let surveySection = "";
  if (surveyContext) {
    surveySection = `\n\nSURVEY DATA FOR CROSS-REFERENCE:
Easements found on survey: ${JSON.stringify(surveyContext.easements)}
Encroachments found on survey: ${JSON.stringify(surveyContext.encroachments)}
Boundary lines: ${JSON.stringify(surveyContext.boundaries)}`;
  }

  const prompt = `You are a title insurance underwriter analyzing a title exception. Provide a risk assessment and recommended clearance actions.

EXCEPTION DETAILS:
- Type: ${exceptionData.type}
- Schedule: ${exceptionData.scheduleType}
- Description: ${exceptionData.description}
- Current Status: ${exceptionData.status}${surveySection}

Return a JSON object with:
{
  "riskLevel": "low|medium|high|critical",
  "riskAssessment": "Paragraph explaining the risk this exception poses to the insured.",
  "recommendedActions": ["Step 1 to clear", "Step 2", ...],
  "relatedConsiderations": ["Related legal or practical concern 1", ...],
  "surveyFindings": "If survey data provided, explain how survey data relates to this exception. Otherwise null."
}

Return ONLY valid JSON, no markdown formatting.`;

  const response = await genai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: { temperature: 0.2 },
  });

  const text = response.text?.trim() || "{}";
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned) as ExceptionAnalysis;
}

export interface DiscrepancyResult {
  issueDescription: string;
  severity: string;
  discrepancyType: string;
  relatedExceptionIds: string[];
  recommendedAction: string;
}

export function detectDiscrepancies(
  surveyEasements: Array<{ id: string; easementType: string | null; locationDescription: string | null; holder: string | null; recordingReference: string | null }>,
  exceptions: Array<{ id: string; type: string | null; scheduleType: string | null; description: string | null; status: string | null }>,
): DiscrepancyResult[] {
  const discrepancies: DiscrepancyResult[] = [];
  const schedBExceptions = exceptions.filter(e => e.scheduleType === "schedule_b");

  for (const easement of surveyEasements) {
    const desc = (easement.locationDescription || "").toLowerCase();
    const holder = (easement.holder || "").toLowerCase();
    const ref = (easement.recordingReference || "").toLowerCase();

    const matched = schedBExceptions.find(exc => {
      const excDesc = (exc.description || "").toLowerCase();
      if (ref && excDesc.includes(ref)) return true;
      if (holder && excDesc.includes(holder)) return true;
      const typeKeywords: Record<string, string[]> = {
        utility: ["utility", "electric", "power", "gas", "water", "sewer", "telephone"],
        drainage: ["drainage", "storm", "stormwater"],
        access: ["access", "right of way", "right-of-way", "roadway"],
        conservation: ["conservation", "preservation", "environmental"],
        sidewalk: ["sidewalk", "pedestrian"],
        ingress_egress: ["ingress", "egress", "access"],
      };
      const keywords = typeKeywords[easement.easementType || ""] || [];
      return keywords.some(kw => excDesc.includes(kw));
    });

    if (!matched) {
      discrepancies.push({
        issueDescription: `Survey shows ${easement.easementType || "unknown"} easement (${easement.locationDescription || "location unspecified"}) with no corresponding Schedule B exception`,
        severity: "medium",
        discrepancyType: "easement_missing",
        relatedExceptionIds: [],
        recommendedAction: `Review survey easement for ${easement.holder || "unknown holder"} and determine if a Schedule B exception should be added`,
      });
    }
  }

  for (const exc of schedBExceptions) {
    const excDesc = (exc.description || "").toLowerCase();
    const isEasementException = ["easement", "right of way", "right-of-way", "utility"].some(kw => excDesc.includes(kw));
    if (!isEasementException) continue;

    const matched = surveyEasements.find(e => {
      const ref = (e.recordingReference || "").toLowerCase();
      const holder = (e.holder || "").toLowerCase();
      if (ref && excDesc.includes(ref)) return true;
      if (holder && excDesc.includes(holder)) return true;
      return false;
    });

    if (!matched) {
      discrepancies.push({
        issueDescription: `Schedule B exception mentions easement but no corresponding easement found on survey: "${exc.description?.substring(0, 100)}"`,
        severity: "high",
        discrepancyType: "exception_mismatch",
        relatedExceptionIds: [exc.id],
        recommendedAction: "Verify with surveyor whether this easement exists on the ground and should appear on the survey plat",
      });
    }
  }

  return discrepancies;
}
