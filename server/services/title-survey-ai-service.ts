import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
    const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
    if (!apiKey) throw new Error("AI_INTEGRATIONS_ANTHROPIC_API_KEY not configured");
    client = new Anthropic({ apiKey, baseURL: baseURL || undefined });
  }
  return client;
}

async function claudeGenerate(systemPrompt: string, userPrompt: string): Promise<string> {
  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  const block = message.content[0];
  if (block.type === "text") return block.text.trim();
  return "{}";
}

export interface ExtractedSurveyData {
  surveyInfo: {
    surveyNumber?: string;
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
  const systemPrompt = `You are an expert ALTA/NSPS land surveyor and title insurance analyst with decades of experience reading survey plats, site plans, and boundary surveys. You extract structured data from survey document text (often OCR-processed) with extreme precision.

CRITICAL EXTRACTION RULES — read these carefully:

1. SURVEY/PLAN NUMBERS: Look for plan numbers (e.g., "P19-101"), project numbers (e.g., "PSLUSD # 11-346-00"), drawing numbers (e.g., "S-1"), or any identifying survey/plan reference number. Return the primary plan/survey number in surveyNumber.

2. MONUMENT FOUND STATUS — THIS IS THE MOST IMPORTANT RULE:
   - The abbreviation "FND" in survey text means "FOUND" — the monument WAS located in the field.
   - "FND 5/8" R/C LB 4842" means: a 5/8-inch rebar with cap, License Book 4842, was FOUND. Set monumentFound=true.
   - "SET" means a new monument was placed. Set monumentFound=true (it exists).
   - Only set monumentFound=false if the text explicitly says "NOT FOUND", "MISSING", "DESTROYED", or there is no monument reference at all for that corner.
   - For monumentType, extract the full description: "5/8" R/C LB 4842", "iron rod", "concrete monument", "4x4 concrete", etc.

3. BOUNDARY BEARINGS & DISTANCES — EXTRACT ALL OF THEM:
   - Survey documents contain bearings in format like "S 62°07'10\" W" and distances like "86.11'" along each property line.
   - Look for ALL dimension callouts along property boundaries, not just the first one.
   - Dimension callouts may appear as standalone numbers near boundary lines (e.g., "42.18'", "251.86'").
   - Curve data may include arc length, radius, chord bearing, and chord distance — extract what is available.
   - If a boundary line has no explicit bearing/distance but the text mentions dimensions near it, attempt to associate them.

4. IMPROVEMENTS — AVOID DOUBLE-COUNTING:
   - Surveys often have a "Site Data" table with aggregate totals (e.g., "PROPOSED CANOPIES: 1,500 SF").
   - If the survey labels individual items AND provides a Site Data aggregate total, check for consistency.
   - If individual items sum to MORE than the Site Data total, the Site Data total is authoritative — adjust or consolidate the items.
   - Example: if two individual canopy labels show 1,500 SF and 1,000 SF but Site Data says "PROPOSED CANOPIES: 1,500 total", list canopies matching the 1,500 SF total, not 2,500 SF.
   - For each improvement, extract FFE (Finished Floor Elevation) values if present and include in notes (e.g., "FFE 12.19", "FFE = 12.40").

5. SETBACK & ZONING DATA:
   - Extract setbacks from the Site Data table: "FRONT", "SIDES", "REAR" setback values.
   - Note any variance references (e.g., "Variance P19-242 for rear setback").
   - If a setback is non-compliant, set zoningCompliant=false and explain in notes.

6. SURVEYOR vs. LAND PLANNER:
   - The "Surveyor" or "Surveyor of Record" is the surveyorCompany/surveyorName.
   - A "Land Planner" or "Design" firm is NOT the surveyor — do not confuse them.
   - Look for license numbers like "PSM" (Professional Surveyor & Mapper) or "PLS" (Professional Land Surveyor).

7. SUMMARY:
   - Write a comprehensive paragraph suitable for a title examiner covering: property identification, total area, zoning, impervious coverage, existing and proposed improvements, easements, encroachments (or lack thereof), setback compliance with specific measurements, parking compliance, stormwater/drainage features, adjacency, and any title review recommendations.

Return ONLY valid JSON, no markdown formatting.`;

  const prompt = `Extract ALL structured data from the following survey/site plan text. Return a JSON object with this exact structure:

{
  "surveyInfo": {
    "surveyNumber": "Plan/survey/drawing number (e.g., P19-101, S-1) or null",
    "surveyorCompany": "Surveyor firm name or null",
    "surveyorName": "Individual surveyor name or null",
    "surveyorLicense": "License number (PSM/PLS #) or null",
    "certificationDate": "YYYY-MM-DD or null",
    "propertyAddress": "Full street address or null",
    "legalDescription": "Full legal description verbatim or null",
    "totalAreaSqft": number or null,
    "totalAreaAcres": number or null,
    "floodZone": "Flood zone designation or null",
    "floodMapNumber": "FEMA flood map panel number or null"
  },
  "boundaries": [
    {
      "direction": "North/South/East/West/NE/NW/SE/SW",
      "bearing": "S 62°07'10\\" W format — extract exact bearing if available",
      "distanceFt": number — extract exact distance in feet if available,
      "adjoinsDescription": "What this boundary adjoins (road, lot, etc.) with details",
      "monumentType": "Full monument description, e.g. 5/8\\" R/C LB 4842",
      "monumentFound": true if FND/SET/found, false only if explicitly missing,
      "orderIndex": sequential number starting at 0
    }
  ],
  "easements": [
    {
      "easementType": "utility|drainage|access|conservation|sidewalk|ingress_egress|other",
      "locationDescription": "Where on the property and along which boundary",
      "holder": "Entity the easement is reserved for",
      "recordingReference": "Plat Book/Page or OR Book/Page reference",
      "widthFt": number or null,
      "notes": "Additional details including any instrument numbers"
    }
  ],
  "encroachments": [
    {
      "description": "What is encroaching and where",
      "severity": "minor|moderate|major|critical",
      "encroachmentDistanceFt": number,
      "encroachmentDirection": "Direction of encroachment",
      "encroachingElement": "Specific element (fence/structure/etc)",
      "affectedBoundary": "Which boundary line is affected",
      "recommendedAction": "Suggested resolution"
    }
  ],
  "improvements": [
    {
      "improvementType": "Descriptive name (car wash, existing building, canopy, parking, etc.)",
      "approxSqft": number or null — use Site Data totals if they conflict with individual labels,
      "setbackFrontFt": number or null,
      "setbackRearFt": number or null,
      "setbackLeftFt": number or null,
      "setbackRightFt": number or null,
      "zoningCompliant": true/false/null — false if variance was needed,
      "notes": "Include building type, stories, FFE values, materials, variance references, compliance notes"
    }
  ],
  "summary": "Comprehensive paragraph for title examiner — cover property ID, area, zoning, impervious area %, improvements, easements, encroachments, setback compliance with measurements, parking, drainage, adjacency, and recommendations."
}

If no encroachments are visible, return an empty encroachments array. Do NOT invent encroachments that aren't in the text.
Return ONLY valid JSON, no markdown formatting. Use null for missing scalar values, empty array [] for missing lists.

SURVEY TEXT:
${surveyText}`;

  const text = await claudeGenerate(systemPrompt, prompt);
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  const parsed = JSON.parse(cleaned);
  const result: ExtractedSurveyData = {
    surveyInfo: parsed.surveyInfo || {},
    boundaries: Array.isArray(parsed.boundaries) ? parsed.boundaries : [],
    easements: Array.isArray(parsed.easements) ? parsed.easements : [],
    encroachments: Array.isArray(parsed.encroachments) ? parsed.encroachments : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
    summary: typeof parsed.summary === "string" ? parsed.summary : "AI analysis complete.",
  };
  return result;
}

export interface ExceptionAnalysis {
  riskLevel: string;
  riskAssessment: string;
  recommendedActions: string[];
  relatedConsiderations: string[];
  surveyFindings?: string;
}

export async function analyzeException(
  exceptionData: { type: string; scheduleSection: string; description: string; status: string },
  surveyContext?: { easements: unknown[]; encroachments: unknown[]; boundaries: unknown[] },
): Promise<ExceptionAnalysis> {
  let surveySection = "";
  if (surveyContext) {
    surveySection = `\n\nSURVEY DATA FOR CROSS-REFERENCE:
Easements found on survey: ${JSON.stringify(surveyContext.easements)}
Encroachments found on survey: ${JSON.stringify(surveyContext.encroachments)}
Boundary lines: ${JSON.stringify(surveyContext.boundaries)}`;
  }

  const systemPrompt = "You are a title insurance underwriter. Analyze exceptions and provide risk assessments. Return valid JSON only, no markdown formatting.";
  const userPrompt = `Analyze this title exception and provide a risk assessment with recommended clearance actions.

EXCEPTION DETAILS:
- Type: ${exceptionData.type}
- Schedule Section: ${exceptionData.scheduleSection}
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

  const text = await claudeGenerate(systemPrompt, userPrompt);
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  const parsed = JSON.parse(cleaned);
  const result: ExceptionAnalysis = {
    riskLevel: typeof parsed.riskLevel === "string" ? parsed.riskLevel : "medium",
    riskAssessment: typeof parsed.riskAssessment === "string" ? parsed.riskAssessment : "Analysis unavailable.",
    recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [],
    relatedConsiderations: Array.isArray(parsed.relatedConsiderations) ? parsed.relatedConsiderations : [],
    surveyFindings: typeof parsed.surveyFindings === "string" ? parsed.surveyFindings : undefined,
  };
  return result;
}

export interface DiscrepancyResult {
  issueDescription: string;
  severity: string;
  discrepancyType: string;
  relatedExceptionIds: string[];
  recommendedAction: string;
}

export interface SurveyBoundaryData {
  id: string;
  direction: string | null;
  bearing: string | null;
  distanceFt: string | null;
  adjoinsDescription: string | null;
  monumentType: string | null;
  monumentFound: boolean | null;
}

export interface SurveyImprovementData {
  id: string;
  improvementType: string | null;
  setbackFrontFt: string | null;
  setbackRearFt: string | null;
  setbackLeftFt: string | null;
  setbackRightFt: string | null;
  zoningCompliance: string | null;
  zoningDistrict: string | null;
}

export interface SurveyAreaData {
  totalAreaSqft: string | null;
  totalAreaAcres: string | null;
  legalDescription: string | null;
}

export function detectDiscrepancies(
  surveyEasements: Array<{ id: string; easementType: string | null; locationDescription: string | null; holder: string | null; recordingReference: string | null }>,
  exceptions: Array<{ id: string; type: string | null; scheduleSection: string | null; description: string | null; status: string | null }>,
  boundaries?: SurveyBoundaryData[],
  improvements?: SurveyImprovementData[],
  surveyArea?: SurveyAreaData,
): DiscrepancyResult[] {
  const discrepancies: DiscrepancyResult[] = [];
  const schedBExceptions = exceptions.filter(e => e.scheduleSection === "b2_exceptions" || e.scheduleSection === "b1_requirements");

  for (const easement of surveyEasements) {
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

  if (boundaries && boundaries.length > 0) {
    const missingMonuments = boundaries.filter(b => b.monumentFound === false);
    if (missingMonuments.length > 0) {
      discrepancies.push({
        issueDescription: `${missingMonuments.length} boundary monument(s) not found at expected locations: ${missingMonuments.map(m => m.direction || "unspecified direction").join(", ")}`,
        severity: missingMonuments.length > 2 ? "high" : "medium",
        discrepancyType: "boundary_monument_missing",
        relatedExceptionIds: [],
        recommendedAction: "Commission monument re-establishment survey or obtain affidavit from adjacent property owners regarding boundary agreement",
      });
    }

    const boundaryExceptions = schedBExceptions.filter(e => {
      const d = (e.description || "").toLowerCase();
      return ["boundary", "encroach", "overlap", "gap", "adjoining", "adjacent"].some(kw => d.includes(kw));
    });
    for (const exc of boundaryExceptions) {
      const excDesc = (exc.description || "").toLowerCase();
      const relevantBounds = boundaries.filter(b => {
        const adj = (b.adjoinsDescription || "").toLowerCase();
        return adj && excDesc.includes(adj.split(" ")[0]);
      });
      if (relevantBounds.length === 0) {
        discrepancies.push({
          issueDescription: `Schedule B boundary exception may conflict with survey: "${exc.description?.substring(0, 120)}"`,
          severity: "high",
          discrepancyType: "boundary_conflict",
          relatedExceptionIds: [exc.id],
          recommendedAction: "Compare survey boundary lines against deed descriptions referenced in this exception; consider boundary line agreement if overlap confirmed",
        });
      }
    }
  }

  if (improvements && improvements.length > 0) {
    for (const imp of improvements) {
      if (imp.zoningCompliance === "non_compliant" || imp.zoningCompliance === "variance_required") {
        const setbacks = [
          imp.setbackFrontFt ? `front: ${imp.setbackFrontFt}ft` : null,
          imp.setbackRearFt ? `rear: ${imp.setbackRearFt}ft` : null,
          imp.setbackLeftFt ? `left: ${imp.setbackLeftFt}ft` : null,
          imp.setbackRightFt ? `right: ${imp.setbackRightFt}ft` : null,
        ].filter(Boolean).join(", ");

        discrepancies.push({
          issueDescription: `${imp.improvementType || "Structure"} has zoning compliance issue (${imp.zoningCompliance}). Setbacks: ${setbacks || "not specified"}. Zoning: ${imp.zoningDistrict || "unknown"}`,
          severity: imp.zoningCompliance === "non_compliant" ? "critical" : "high",
          discrepancyType: "setback_violation",
          relatedExceptionIds: [],
          recommendedAction: imp.zoningCompliance === "non_compliant"
            ? "Obtain zoning variance or special exception from local authority; consider title endorsement for existing improvements"
            : "Apply for variance from zoning board; obtain confirmation of pre-existing non-conforming use if applicable",
        });
      }

      const minSetback = [imp.setbackFrontFt, imp.setbackRearFt, imp.setbackLeftFt, imp.setbackRightFt]
        .filter(Boolean)
        .map(s => parseFloat(s as string))
        .filter(n => !isNaN(n));
      if (minSetback.length > 0 && Math.min(...minSetback) <= 0) {
        discrepancies.push({
          issueDescription: `${imp.improvementType || "Structure"} has zero or negative setback — indicates improvement extends to or beyond property boundary`,
          severity: "critical",
          discrepancyType: "setback_violation",
          relatedExceptionIds: [],
          recommendedAction: "Immediate review required: improvement may constitute an encroachment onto adjacent property. Obtain encroachment agreement or boundary line adjustment",
        });
      }
    }
  }

  if (surveyArea) {
    const allExcDescs = exceptions.map(e => (e.description || "").toLowerCase()).join(" ");
    if (surveyArea.totalAreaSqft || surveyArea.totalAreaAcres) {
      const areaMatchers = [/(\d+[\.,]?\d*)\s*(square feet|sq\.?\s*ft|sf)/gi, /(\d+[\.,]?\d*)\s*(acres?)/gi];
      for (const regex of areaMatchers) {
        let match;
        while ((match = regex.exec(allExcDescs)) !== null) {
          const excArea = parseFloat(match[1].replace(",", ""));
          const isAcres = match[2].toLowerCase().startsWith("acre");
          const surveyVal = isAcres
            ? parseFloat(surveyArea.totalAreaAcres || "0")
            : parseFloat(surveyArea.totalAreaSqft || "0");
          if (surveyVal > 0 && excArea > 0) {
            const diff = Math.abs(surveyVal - excArea) / surveyVal;
            if (diff > 0.02) {
              discrepancies.push({
                issueDescription: `Area discrepancy: survey shows ${surveyVal} ${isAcres ? "acres" : "sq ft"} but title exception references ${excArea} ${isAcres ? "acres" : "sq ft"} (${(diff * 100).toFixed(1)}% difference)`,
                severity: diff > 0.1 ? "critical" : "high",
                discrepancyType: "area_discrepancy",
                relatedExceptionIds: [],
                recommendedAction: "Reconcile area measurements between survey and deed/title documents; may require legal description correction or boundary resurvey",
              });
            }
          }
        }
      }
    }

    if (surveyArea.legalDescription) {
      const surveyLegal = surveyArea.legalDescription.toLowerCase();
      for (const exc of exceptions) {
        const excDesc = (exc.description || "").toLowerCase();
        if (excDesc.includes("legal description") || excDesc.includes("lot") || excDesc.includes("block")) {
          const surveyLot = surveyLegal.match(/lot\s+(\d+)/i);
          const excLot = excDesc.match(/lot\s+(\d+)/i);
          if (surveyLot && excLot && surveyLot[1] !== excLot[1]) {
            discrepancies.push({
              issueDescription: `Legal description lot number mismatch: survey references Lot ${surveyLot[1]} but exception references Lot ${excLot[1]}`,
              severity: "critical",
              discrepancyType: "legal_description_mismatch",
              relatedExceptionIds: [exc.id],
              recommendedAction: "Verify correct lot identification in both survey and title commitment; may indicate wrong property or recording error",
            });
          }
        }
      }
    }
  }

  return discrepancies;
}
