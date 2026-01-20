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

const complaintAnalysisPrompt = `You are a litigation associate analyzing a complaint to create a document search strategy.

## TASK 1: EXTRACT CASE SPECIFICS

From this complaint, extract:
- **Parties**: All plaintiffs, defendants, and individuals named (include job titles, aliases)
- **Dates**: Every date mentioned (contract dates, breach dates, deadlines, notice dates)
- **Money**: All dollar amounts (contract value, damages claimed, payments)
- **Documents**: Every contract, agreement, or communication referenced by name
- **Terminology**: Project names, product names, defined terms, code names used

## TASK 2: ANALYZE EACH CAUSE OF ACTION

For each claim:
1. Identify the cause of action and which defendants it targets
2. Extract the SPECIFIC factual allegations (quote the complaint, cite paragraph numbers)
3. List the legal elements required to prove this claim
4. Map which allegations support which elements
5. Note gaps where allegations are thin
6. Anticipate likely defenses

## TASK 3: GENERATE BOOLEAN SEARCH TERMS

CRITICAL RULE: Every search term MUST include case-specific identifiers (actual names, dates, amounts, project names) from this complaint. NO generic searches like "contract AND breach."

For each cause of action, create searches for:

**A. Party Searches** - Use actual names with variations:
- Full name, initials, reversed order, common misspellings
- Example: ("John Martinez" OR "J. Martinez" OR "Martinez, John" OR "J Martinez")

**B. Document Searches** - Use exact document names from complaint:
- Example: ("Master Services Agreement" OR "MSA") AND (TechCorp OR Acme)

**C. Subject Searches** - Use complaint's actual terminology:
- Example: ("Alpha Platform" OR "Alpha Project") AND (deliver* OR delay* OR status)

**D. Date Searches** - Use specific dates in multiple formats:
- Example: ("December 31" OR "12/31/23" OR "Dec 31" OR "Q4 2023") W/15 (deadline OR deliver*)

**E. Financial Searches** - Use actual amounts:
- Example: ("$2.4 million" OR "$2,400,000" OR "2.4M") OR (payment* OR invoice*) W/10 TechCorp

**F. Communication Searches** - Party names + issue terms:
- Example: (Martinez) AND (concern* OR problem* OR delay*) AND (Alpha OR deliver*)

Boolean syntax: AND, OR, NOT, "exact phrase", W/n (within n words), * (wildcard)

Create both HIGH PRECISION (narrow, specific) and HIGH RECALL (broader) variants for key searches.

## TASK 4: PRIVILEGE TERMS

Generate privilege searches specific to this case using any attorneys, law firms, or legal departments mentioned.

## TASK 5: CUSTODIANS

Recommend whose documents to search based on individuals named in the complaint.

## OUTPUT FORMAT

Return ONLY valid JSON (no markdown, no explanation):
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
      "claimTitle": "",
      "causeOfAction": "",
      "againstDefendants": [""],
      "factualAllegations": [{"paragraphRef": "¶XX", "allegation": "", "supportsElement": ""}],
      "legalElements": [{"element": "", "supportingFacts": "", "strength": "strong|moderate|weak", "gaps": ""}],
      "anticipatedDefenses": [{"defense": "", "documentsToFind": ""}],
      "searchTerms": [
        {
          "id": "",
          "category": "Party|Document|Subject|Date|Financial|Communication",
          "targetElement": "",
          "term": "BOOLEAN STRING WITH CASE-SPECIFIC IDENTIFIERS",
          "precision": "high|medium|low",
          "rationale": "Why relevant to THIS case",
          "enabled": true,
          "aiGenerated": true
        }
      ]
    }
  ],
  "privilegeSearchTerms": [{"id": "", "term": "", "rationale": "", "enabled": true, "aiGenerated": true}],
  "recommendedCustodians": {"priority": [{"name": "", "role": "", "relevance": ""}], "secondary": []}
}

## RULES
1. QUOTE the complaint - use its exact language
2. Every search term needs case-specific identifiers (names, dates, amounts, project names)
3. Include name variations and misspellings
4. Include date format variations (1/15/24, January 15, Jan 15)
5. Do not hallucinate - only use facts from the complaint
6. Note what's missing, don't invent facts

Analyze this complaint:

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
        model: "gemini-2.0-flash",
        contents: fullPrompt,
        config: {
          maxOutputTokens: 8192,
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
      
      const parsed: ComplaintAnalysisResult = JSON.parse(jsonMatch[0]);
      
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
        model: "gemini-2.0-flash",
        contents: fullPrompt,
        config: {
          maxOutputTokens: 8192,
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

      const parsed: ComplaintAnalysisResult = JSON.parse(jsonMatch[0]);
      
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
