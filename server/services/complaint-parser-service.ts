import { GoogleGenAI } from "@google/genai";
import { nanoid } from "nanoid";

export interface ParsedClaim {
  claimNumber: number;
  claimTitle: string;
  causeOfAction: string;
  statutoryBasis?: string;
  againstDefendants: string[];
  fullText?: string;
  summary?: string;
  factualAllegations: FactualAllegation[];
  legalElements: LegalElement[];
  anticipatedDefenses: AnticipatedDefense[];
  searchTerms: SearchTerm[];
  combinedBoolean: string;
}

export interface FactualAllegation {
  paragraphRef: string;
  allegation: string;
  relevantTo: string;
  supportsElement?: string;
}

export interface LegalElement {
  number: number;
  element: string;
  mustProve: string;
  supportingFacts: string;
  strength: "strong" | "moderate" | "weak";
  gaps: string;
  description?: string;
  searchTerms: SearchTerm[];
}

export interface AnticipatedDefense {
  defense: string;
  likelihood: "high" | "medium" | "low";
  documentsToFind: string;
}

export interface SearchTerm {
  id: string;
  term: string;
  type?: "boolean" | "phrase" | "proximity" | "wildcard";
  category?: string;
  targetElement?: string;
  precision?: "high" | "medium" | "low";
  recall?: "high" | "medium" | "low";
  enabled: boolean;
  aiGenerated: boolean;
  rationale: string;
}

export interface CaseFundamentals {
  plaintiffs: PartyInfo[];
  defendants: PartyInfo[];
  keyDates: { date: string; event: string }[];
  monetaryFigures: { amount: string; description: string }[];
  referencedDocuments: string[];
  caseTerminology: string[];
}

export interface PartyInfo {
  name: string;
  type?: string;
  aliases: string[];
  keyIndividuals: string[];
}

export interface PrivilegeSearchTerm {
  id: string;
  privilegeType?: "attorney_client" | "work_product";
  term: string;
  rationale: string;
  enabled: boolean;
  aiGenerated: boolean;
}

export interface RecommendedCustodians {
  priority: { name: string; role: string; relevance: string }[];
  secondary: { name: string; role: string; relevance: string }[];
}

export interface ComplaintAnalysisResult {
  caseFundamentals: CaseFundamentals;
  causesOfAction: ParsedClaim[];
  privilegeSearchTerms: PrivilegeSearchTerm[];
  recommendedCustodians: RecommendedCustodians;
}

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

function stripMarkdownCodeFences(text: string): string {
  let cleaned = text.trim();
  
  // Remove markdown code fences like ```json ... ``` or ``` ... ```
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '');
  cleaned = cleaned.replace(/\n?```\s*$/i, '');
  
  return cleaned.trim();
}

/**
 * Counts bracket balance in a JSON string.
 */
function countBrackets(str: string): { braces: number; brackets: number; inString: boolean } {
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escaped = false;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (escaped) { escaped = false; continue; }
    if (char === '\\') { escaped = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (!inString) {
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
      else if (char === '[') bracketCount++;
      else if (char === ']') bracketCount--;
    }
  }
  return { braces: braceCount, brackets: bracketCount, inString };
}

/**
 * Finds valid cut points in JSON string (positions after complete elements).
 * These are positions after: }, ], or complete strings (as values)
 */
function findValidCutPoints(str: string): number[] {
  const cutPoints: number[] = [];
  let inString = false;
  let escaped = false;
  let depth = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (escaped) { escaped = false; continue; }
    if (char === '\\') { escaped = true; continue; }
    
    if (char === '"') {
      inString = !inString;
      if (!inString) {
        // Just closed a string - potential cut point
        cutPoints.push(i + 1);
      }
      continue;
    }
    
    if (!inString) {
      if (char === '{' || char === '[') depth++;
      else if (char === '}' || char === ']') {
        depth--;
        cutPoints.push(i + 1);
      }
    }
  }
  return cutPoints;
}

/**
 * Attempts to repair truncated JSON by finding the last valid structure point.
 * Uses binary search on cut points to find the longest valid prefix.
 */
function repairTruncatedJson(jsonStr: string): string {
  console.log(`[JSONRepair] Starting repair of ${jsonStr.length} chars`);
  
  const { braces, brackets, inString } = countBrackets(jsonStr);
  
  // If balanced, no repair needed
  if (braces === 0 && brackets === 0 && !inString) {
    return jsonStr;
  }
  
  console.log(`[JSONRepair] Detected truncation: braces=${braces}, brackets=${brackets}, inString=${inString}`);
  
  // Find valid cut points
  const cutPoints = findValidCutPoints(jsonStr);
  
  // Try from the end, working backwards until we find a point that can be closed
  for (let i = cutPoints.length - 1; i >= 0; i--) {
    const cutPos = cutPoints[i];
    let candidate = jsonStr.substring(0, cutPos);
    
    // Remove trailing comma if present
    candidate = candidate.replace(/,\s*$/, '');
    
    // Count remaining brackets
    const counts = countBrackets(candidate);
    
    // Skip if inside a string
    if (counts.inString) continue;
    
    // Skip if brackets are negative (more closes than opens - shouldn't happen)
    if (counts.braces < 0 || counts.brackets < 0) continue;
    
    // Try to close remaining brackets/braces
    let repaired = candidate;
    for (let j = 0; j < counts.brackets; j++) repaired += ']';
    for (let j = 0; j < counts.braces; j++) repaired += '}';
    
    // Try parsing
    try {
      JSON.parse(repaired);
      console.log(`[JSONRepair] Found valid repair at position ${cutPos}: ${jsonStr.length} -> ${repaired.length} chars`);
      return repaired;
    } catch {
      // Try next cut point
      continue;
    }
  }
  
  // Fallback: just try to close brackets from the end
  console.log(`[JSONRepair] No valid cut point found, attempting simple bracket closure`);
  let repaired = jsonStr;
  
  // Remove trailing incomplete content
  repaired = repaired.replace(/,\s*"[^"]*"?\s*:?[^,}\]]*$/, '');
  repaired = repaired.replace(/,\s*$/, '');
  
  const finalCounts = countBrackets(repaired);
  if (finalCounts.inString) repaired += '"';
  for (let j = 0; j < finalCounts.brackets; j++) repaired += ']';
  for (let j = 0; j < finalCounts.braces; j++) repaired += '}';
  
  console.log(`[JSONRepair] Fallback repair: ${jsonStr.length} -> ${repaired.length} chars`);
  return repaired;
}

/**
 * Safely parses JSON with repair fallback for truncated responses.
 */
function safeParseJson<T>(jsonStr: string): T {
  try {
    return JSON.parse(jsonStr);
  } catch (firstError) {
    console.log(`[JSONRepair] Initial parse failed, attempting repair...`);
    const repaired = repairTruncatedJson(jsonStr);
    try {
      return JSON.parse(repaired);
    } catch (secondError) {
      console.error(`[JSONRepair] Repair failed. Original error:`, firstError);
      console.error(`[JSONRepair] Repaired string ends with:`, repaired.substring(repaired.length - 200));
      throw firstError;
    }
  }
}

const complaintAnalysisPrompt = `You are an elite litigation partner at a top law firm analyzing a complaint to create a comprehensive document search strategy for eDiscovery. Your goal is to generate EXHAUSTIVE Boolean search terms that will surface all relevant documents to prove the case.

## YOUR APPROACH: TWO-PART STRUCTURE

### PART I: CORE FACTUAL ALLEGATIONS
Organize search terms by THEMATIC CATEGORIES based on the complaint's narrative:
- Employment/Engagement timeline
- Contractual agreements (non-compete, NDA, confidentiality)
- Due diligence / M&A processes
- Hiring/recruitment of key individuals
- Overlapping employment/conflicts
- Competitive activity
- Retention of company property
- Communications with third parties

### PART II: ELEMENT-SPECIFIC SEARCHES BY CAUSE OF ACTION
For each Count/Claim, create targeted searches for each legal element that must be proven.

## SEARCH TERM GENERATION RULES

### 1. USE WILDCARDS LIBERALLY
- compet* (matches compete, competition, competitor, competitive)
- employ* (matches employ, employed, employee, employment, employer)
- recruit* (matches recruit, recruited, recruiting, recruitment, recruiter)
- communicat* (matches communicate, communication, communications)

### 2. INCLUDE ALL NAME VARIATIONS
- ("David Wilmot" OR "Wilmot" OR "D. Wilmot" OR "Dave Wilmot")
- ("EWC Growth" OR "EWC Growth Holdings" OR EWC)
- ("North Castle" OR "North Castle Partners" OR NCP)

### 3. INCLUDE DATE VARIATIONS
- (December OR "12/2024" OR "Dec 2024" OR "December 2024")
- ("January 20" OR "1/20/2025" OR "Jan 20" OR "1/20")

### 4. USE PROXIMITY OPERATORS
- (internal W/5 communication*) - words within 5 positions
- (laser W/3 "hair removal") - close proximity matching

### 5. CREATE MULTIPLE SEARCH TERMS PER TOPIC
For each important topic, create 3-5 search terms with different approaches:
- Broad recall search (captures more, may have noise)
- Focused precision search (narrower, more relevant)
- Communication-focused search (emails/messages about topic)
- Document-focused search (formal documents)

## EXAMPLE OUTPUT QUALITY

For an employment/non-compete case, you would generate:

**Employment Timeline & Role:**
\`\`\`
(Wilmot OR "David Wilmot") AND (COO OR "chief operating" OR CEO OR "chief executive" OR hire* OR promot* OR employ* OR position OR title OR role)
\`\`\`

**Access to Confidential Information:**
\`\`\`
(Wilmot OR "David Wilmot") AND (confidential* OR proprietary OR "trade secret*" OR sensitive OR restrict*) AND (access OR view* OR review* OR receiv* OR obtain* OR possess*)
\`\`\`

**Non-Compete Agreement Terms:**
\`\`\`
(Wilmot OR "David Wilmot") AND ("non-compete" OR noncompete OR "non-disclosure" OR NDA OR "confidentiality agreement" OR "restrictive covenant*" OR "non-solicitation")
\`\`\`

**12-Month Non-Compete Period:**
\`\`\`
(Wilmot OR "David Wilmot") AND ("12 month*" OR "twelve month*" OR "1 year" OR "one year") AND (compet* OR restrict* OR prohibit* OR covenant*)
\`\`\`

**Recruitment & Interview Process:**
\`\`\`
(Wilmot OR "David Wilmot") AND (EWC OR "EWC Growth" OR "North Castle") AND (interview* OR recruit* OR hire* OR offer* OR candidate* OR position* OR CEO)
\`\`\`

**Executive Search Firm Involvement:**
\`\`\`
("Flatiron Search" OR "Flatiron Search Partners" OR "executive search" OR headhunt* OR recruiter*) AND (Wilmot OR "David Wilmot" OR EWC OR CEO)
\`\`\`

**Dual Employment / Overlap:**
\`\`\`
(Wilmot OR "David Wilmot") AND (Semper AND EWC) AND (CEO OR "chief executive" OR dual OR both OR simultan* OR overlap* OR concurren*)
\`\`\`

**Competitive Service Launch:**
\`\`\`
(EWC OR "EWC Growth") AND ("laser hair removal" OR "laser hair" OR LHR OR laser) AND (launch* OR add* OR expand* OR introduc* OR offer* OR service* OR announc*)
\`\`\`

### For Trade Secret Claims (Element-Specific):

**Element 1 - Trade Secret Existence:**
\`\`\`
(Semper) AND ("customer list*" OR "client list*" OR customer* OR client*) AND (confidential* OR proprietary OR secret* OR protect*)
\`\`\`

\`\`\`
(Semper) AND (pricing OR price* OR rate* OR cost* OR margin* OR discount*) AND (strateg* OR structure* OR model* OR confidential* OR proprietary)
\`\`\`

**Element 2 - Misappropriation:**
\`\`\`
(Wilmot OR "David Wilmot") AND (EWC OR "North Castle" OR competitor*) AND (disclos* OR share* OR provid* OR transfer* OR communicat* OR reveal*) AND (Semper OR confidential* OR proprietary OR "trade secret*")
\`\`\`

### For Breach of Contract Claims:

**Valid Contract Execution:**
\`\`\`
(Wilmot OR "David Wilmot") AND (sign* OR execut* OR agree* OR acknowledg*) AND ("non-compete" OR "confidentiality agreement" OR "employment agreement")
\`\`\`

**Competition with Plaintiff:**
\`\`\`
(EWC OR "EWC Growth") AND (Semper) AND (compet* OR rival* OR "same market*" OR "same service*" OR "direct compet*" OR "laser hair removal")
\`\`\`

## TASK 1: EXTRACT CASE FUNDAMENTALS

From this complaint, extract:
- **Parties**: All plaintiffs, defendants, and named individuals (include job titles, aliases, variations)
- **Dates**: Every date mentioned with context (contract dates, breach dates, employment dates, deadlines)
- **Money**: All dollar amounts and financial figures
- **Documents**: Every contract, agreement, or document referenced by name
- **Terminology**: Project names, product names, defined terms, code names, service names

## TASK 2: ANALYZE EACH CAUSE OF ACTION

For each Count/Claim in the complaint:
1. Identify the cause of action and statutory basis
2. List which defendants it targets
3. Extract key factual allegations (cite paragraph numbers)
4. List the legal elements required to prove this claim
5. Note gaps where allegations are thin
6. Anticipate likely defenses

## TASK 3: GENERATE COMPREHENSIVE BOOLEAN SEARCH TERMS

Generate 15-25 high-impact search terms organized into logical categories. Quality over quantity - focus on the most important search terms.

**Categories to cover:**
A. Employment/Engagement (timeline, role, responsibilities, access)
B. Contractual Terms (non-compete, NDA, confidentiality, solicitation restrictions)
C. Due Diligence/M&A (if applicable - investor contacts, valuations, strategic alternatives)
D. Recruitment/Hiring (interview process, search firms, offers, start dates)
E. Overlapping/Dual Employment (simultaneous roles, conflicts, transitions)
F. Competitive Activity (competing business, similar services, market overlap)
G. Property/Equipment (devices, laptops, documents retained)
H. Third-Party Communications (investors, clients, vendors, disparagement)
I. Trade Secret Elements (existence, protection measures, misappropriation, use)
J. Contract Breach Elements (valid contract, material breach, damages)
K. Fiduciary Duty Elements (relationship, loyalty, self-dealing)

## TASK 4: PRIVILEGE TERMS

Generate privilege searches using any attorneys, law firms, or legal departments mentioned in the complaint.

## TASK 5: CUSTODIANS

Recommend key custodians based on individuals named, with priority and secondary lists.

## OUTPUT FORMAT

Return ONLY valid JSON (no markdown code fences, no explanation):
{
  "caseFundamentals": {
    "plaintiffs": [{"name": "", "aliases": [], "keyIndividuals": []}],
    "defendants": [{"name": "", "aliases": [], "keyIndividuals": []}],
    "keyDates": [{"date": "YYYY-MM-DD", "event": ""}],
    "monetaryFigures": [{"amount": "", "description": ""}],
    "referencedDocuments": [""],
    "caseTerminology": [""]
  },
  "causesOfAction": [
    {
      "claimNumber": 1,
      "claimTitle": "Descriptive title for the claim",
      "causeOfAction": "Legal cause of action name",
      "statutoryBasis": "Statute or common law basis",
      "againstDefendants": ["Defendant 1", "Defendant 2"],
      "summary": "Brief narrative summary of the claim",
      "factualAllegations": [{"paragraphRef": "¶XX", "allegation": "Quote from complaint", "supportsElement": "Which element this supports"}],
      "legalElements": [
        {
          "number": 1,
          "element": "Element name",
          "description": "What must be proven",
          "mustProve": "Specific proof required",
          "supportingFacts": "Facts from complaint supporting this",
          "strength": "strong|moderate|weak",
          "gaps": "What's missing or weak",
          "searchTerms": [
            {
              "id": "",
              "term": "BOOLEAN SEARCH STRING",
              "type": "boolean",
              "category": "Element-specific",
              "targetElement": "Element 1: Trade Secret Existence",
              "precision": "high|medium|low",
              "recall": "high|medium|low",
              "rationale": "Brief - what this searches for",
              "enabled": true,
              "aiGenerated": true
            }
          ]
        }
      ],
      "anticipatedDefenses": [{"defense": "", "likelihood": "high|medium|low", "documentsToFind": ""}],
      "searchTerms": [
        {
          "id": "",
          "term": "BOOLEAN SEARCH STRING WITH WILDCARDS AND VARIATIONS",
          "type": "boolean|phrase|proximity|wildcard",
          "category": "Employment|Contract|Competition|Communication|Trade Secret|etc",
          "targetElement": "Which claim element this supports",
          "precision": "high|medium|low",
          "recall": "high|medium|low",
          "rationale": "Brief - what documents this targets",
          "enabled": true,
          "aiGenerated": true
        }
      ],
      "combinedBoolean": "All search terms combined with OR for comprehensive search"
    }
  ],
  "privilegeSearchTerms": [{"id": "", "privilegeType": "attorney_client|work_product", "term": "", "rationale": "", "enabled": true, "aiGenerated": true}],
  "recommendedCustodians": {"priority": [{"name": "", "role": "", "relevance": ""}], "secondary": [{"name": "", "role": "", "relevance": ""}]}
}

## CRITICAL RULES
1. Generate 15-25 high-impact search terms - quality over quantity
2. Every search term MUST include case-specific identifiers (actual party names, dates, amounts)
3. Use wildcards liberally (* for truncation)
4. Include name variations and alternate spellings
5. Include date format variations (1/15/24, January 15, Jan 15, "1/15/2024")
6. Keep rationales BRIEF (1 sentence max) - just state what the search targets
7. Group search terms logically by theme and by claim element
8. Do not hallucinate - only use facts stated in the complaint
9. Keep the JSON output COMPACT - avoid verbose descriptions

Analyze this complaint and generate comprehensive search terms:

---
`;

export class ComplaintParserService {
  async parseComplaint(documentText: string): Promise<ParsedClaim[]> {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("Gemini API key not configured");
    }

    const fullPrompt = complaintAnalysisPrompt + documentText.substring(0, 80000) + "\n---";

    try {
      console.log(`[ComplaintParser] Sending ${fullPrompt.length} chars to AI (doc: ${documentText.length} chars)`);
      
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
        config: {
          maxOutputTokens: 65536,
          temperature: 0.1,
        }
      });
      const rawResponse = result.text || "";
      
      console.log(`[ComplaintParser] Received response: ${rawResponse.length} chars`);
      console.log(`[ComplaintParser] Response preview: ${rawResponse.substring(0, 500)}`);

      // Strip markdown code fences if present
      const response = stripMarkdownCodeFences(rawResponse);
      console.log(`[ComplaintParser] After cleanup: ${response.length} chars, starts with: ${response.substring(0, 50)}`);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("[ComplaintParser] Failed to extract JSON from response:", response.substring(0, 2000));
        throw new Error("Failed to parse complaint response - no JSON found");
      }

      console.log(`[ComplaintParser] JSON extracted: ${jsonMatch[0].length} chars`);
      
      const parsed: ComplaintAnalysisResult = safeParseJson<ComplaintAnalysisResult>(jsonMatch[0]);
      
      console.log(`[ComplaintParser] Parsed causesOfAction count: ${parsed.causesOfAction?.length || 0}`);
      if (parsed.causesOfAction && parsed.causesOfAction.length > 0) {
        console.log(`[ComplaintParser] First claim: ${JSON.stringify(parsed.causesOfAction[0]).substring(0, 500)}`);
      }

      const claims = (parsed.causesOfAction || []).map((claim) => ({
        ...claim,
        searchTerms: (claim.searchTerms || []).map((term) => ({
          ...term,
          id: nanoid(),
        })),
        legalElements: (claim.legalElements || []).map((element, idx) => ({
          ...element,
          number: element.number || idx + 1,
          mustProve: element.mustProve || element.element || "",
          searchTerms: (element.searchTerms || []).map((term) => ({
            ...term,
            id: nanoid(),
          })),
        })),
        factualAllegations: (claim.factualAllegations || []).map((fa) => ({
          ...fa,
          relevantTo: fa.relevantTo || fa.supportsElement || "",
        })),
        anticipatedDefenses: (claim.anticipatedDefenses || []).map((def) => ({
          ...def,
          likelihood: def.likelihood || "medium",
        })),
        againstDefendants: claim.againstDefendants || [],
        combinedBoolean: claim.combinedBoolean || "",
      }));

      return claims;
    } catch (error) {
      console.error("[ComplaintParser] Error parsing complaint:", error);
      throw error;
    }
  }

  async parseComplaintFull(documentText: string): Promise<ComplaintAnalysisResult> {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("Gemini API key not configured");
    }

    const fullPrompt = complaintAnalysisPrompt + documentText.substring(0, 80000) + "\n---";

    try {
      console.log(`[ComplaintParser] Full parse: Sending ${fullPrompt.length} chars to AI`);
      
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
        config: {
          maxOutputTokens: 65536,
          temperature: 0.1,
        }
      });
      const rawResponse = result.text || "";
      
      console.log(`[ComplaintParser] Full parse response: ${rawResponse.length} chars`);

      // Strip markdown code fences if present
      const response = stripMarkdownCodeFences(rawResponse);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("[ComplaintParser] Failed to extract JSON from response:", response.substring(0, 2000));
        throw new Error("Failed to parse complaint response - no JSON found");
      }

      const parsed: ComplaintAnalysisResult = safeParseJson<ComplaintAnalysisResult>(jsonMatch[0]);
      
      console.log(`[ComplaintParser] Full parse causesOfAction count: ${parsed.causesOfAction?.length || 0}`);

      parsed.causesOfAction = (parsed.causesOfAction || []).map((claim) => ({
        ...claim,
        searchTerms: (claim.searchTerms || []).map((term) => ({
          ...term,
          id: nanoid(),
        })),
        legalElements: (claim.legalElements || []).map((element, idx) => ({
          ...element,
          number: element.number || idx + 1,
          mustProve: element.mustProve || element.element || "",
          searchTerms: (element.searchTerms || []).map((term) => ({
            ...term,
            id: nanoid(),
          })),
        })),
        factualAllegations: (claim.factualAllegations || []).map((fa) => ({
          ...fa,
          relevantTo: fa.relevantTo || fa.supportsElement || "",
        })),
        anticipatedDefenses: (claim.anticipatedDefenses || []).map((def) => ({
          ...def,
          likelihood: def.likelihood || "medium",
        })),
        againstDefendants: claim.againstDefendants || [],
        combinedBoolean: claim.combinedBoolean || "",
      }));

      parsed.privilegeSearchTerms = (parsed.privilegeSearchTerms || []).map((term) => ({
        ...term,
        id: nanoid(),
      }));

      return parsed;
    } catch (error) {
      console.error("[ComplaintParser] Error in full parse:", error);
      throw error;
    }
  }
}

export const complaintParserService = new ComplaintParserService();
