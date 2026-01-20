import { GoogleGenAI } from "@google/genai";
import { nanoid } from "nanoid";

export interface ParsedRFP {
  requestNumber: number;
  fullText: string;
  summary: string;
  documentTypesRequested?: string[];
  subjectMatter?: string[];
  timePeriod?: string;
  targetedEntities?: string[];
  keyTerminology?: string[];
  privilegeLikelihood?: "high" | "medium" | "low";
  searchTerms: SearchTerm[];
  combinedBoolean: string;
}

export interface SearchTerm {
  id: string;
  term: string;
  type?: "boolean" | "phrase" | "proximity" | "wildcard";
  category?: string;
  precision?: "high" | "medium" | "low";
  recall?: "high" | "medium" | "low";
  enabled: boolean;
  aiGenerated: boolean;
  rationale: string;
}

export interface CaseContext {
  caseName: string;
  caseNumber: string;
  plaintiff: string;
  defendant: string;
  respondingParty: string;
  keyIndividuals: { name: string; role: string }[];
  keyDates: { date: string; significance: string }[];
  thirdParties: string[];
  coreDispute: string;
}

export interface PrivilegeSearchTerm {
  id: string;
  relatedRfpNumbers?: number[];
  term: string;
  rationale: string;
  enabled: boolean;
  aiGenerated: boolean;
}

export interface SuggestedCustodian {
  name: string;
  role: string;
  relevantToRfpNumbers: number[];
}

export interface RFPAnalysisResult {
  caseContext: CaseContext;
  rfpRequests: ParsedRFP[];
  privilegeSearchTerms: PrivilegeSearchTerm[];
  suggestedCustodians: SuggestedCustodian[];
}

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

function stripMarkdownCodeFences(text: string): string {
  let cleaned = text.trim();
  
  // Remove markdown code fences like ```json ... ``` or ``` ... ```
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '');
  cleaned = cleaned.replace(/\n?```\s*$/i, '');
  
  return cleaned.trim();
}

const rfpAnalysisPrompt = `You are a litigation associate analyzing a Request for Production (RFP) document to create search terms that will find responsive documents.

## TASK 1: EXTRACT CASE CONTEXT

From the RFP document, extract:
- **Case name and number**
- **Parties**: Plaintiff(s), Defendant(s), and the party responding to these RFPs
- **Key individuals**: People mentioned by name (with titles/roles)
- **Key dates**: Any date ranges or specific dates referenced
- **Third parties**: Vendors, customers, affiliates, search firms, etc. mentioned
- **Core dispute**: What is this case about based on the requests?

## TASK 2: PARSE EACH RFP REQUEST

For each numbered Request for Production:
1. Extract the COMPLETE text of the request
2. Identify the specific document types being requested
3. Identify the subject matter/topics covered
4. Identify any time period specified
5. Identify specific people, entities, or transactions targeted
6. Note key phrases and terminology used in the request

## TASK 3: GENERATE BOOLEAN SEARCH TERMS FOR EACH RFP

CRITICAL RULE: Every search term MUST use case-specific identifiers (actual party names, people names, dates, document types, terminology) from this RFP. NO generic searches.

For each RFP request, generate searches targeting:

**A. Document Type Searches** - Target the specific document types requested:
- Use exact document names from the RFP (e.g., "employment agreement", "offer letter")
- Include variations and abbreviations
- Example: ("employment agreement" OR "offer letter" OR "compensation plan" OR "equity grant" OR "bonus" W/5 (plan OR structure))

**B. Person/Entity Searches** - Use actual names from the RFP:
- Full name, initials, last name only, common misspellings
- Combine with document types or subjects
- Example: (Wilmot OR "David Wilmot" OR "D. Wilmot") AND (hire* OR recruit* OR offer OR employment OR compensation)

**C. Subject Matter Searches** - Use the RFP's actual terminology:
- Key concepts and topics from the request
- Industry-specific terms mentioned
- Example: ("laser hair removal" OR "laser service*" OR LHR) AND (launch* OR offer* OR add* OR business W/3 plan)

**D. Time-Bounded Searches** - Use specific dates/periods from RFP:
- Multiple date formats
- Combine with subject matter
- Example: ("November 2024" OR "Nov 2024" OR "11/2024" OR "Q4 2024") AND (Semper OR Wilmot OR "trade secret" OR confidential*)

**E. Relationship/Transaction Searches** - Target specific relationships:
- Between parties mentioned
- With third parties (customers, vendors, etc.)
- Example: (EWC OR "EWC Growth") AND (Semper W/10 (customer* OR client* OR vendor* OR supplier*))

**F. Confidentiality/Restrictive Covenant Searches** (when applicable):
- Non-compete, non-solicitation, confidentiality terms
- Trade secret references
- Example: ("non-compete" OR "noncompete" OR "non-solicitation" OR "restrictive covenant" OR "confidential* agreement") AND (Wilmot OR Semper)

Boolean syntax: AND, OR, NOT, "exact phrase", W/n (within n words), * (wildcard)

Create both NARROW (high precision) and BROAD (high recall) variants for important requests.

## TASK 4: IDENTIFY PRIVILEGE-SENSITIVE REQUESTS

Flag any RFP requests likely to implicate privileged documents and suggest privilege search terms specific to those requests.

## OUTPUT FORMAT

Return ONLY valid JSON (no markdown, no explanation):
{
  "caseContext": {
    "caseName": "",
    "caseNumber": "",
    "plaintiff": "",
    "defendant": "",
    "respondingParty": "",
    "keyIndividuals": [{"name": "", "role": ""}],
    "keyDates": [{"date": "", "significance": ""}],
    "thirdParties": [""],
    "coreDispute": ""
  },
  "rfpRequests": [
    {
      "requestNumber": 1,
      "fullText": "Complete text of the RFP request",
      "summary": "One-sentence summary of what's being requested",
      "documentTypesRequested": [""],
      "subjectMatter": [""],
      "timePeriod": "",
      "targetedEntities": [""],
      "keyTerminology": [""],
      "privilegeLikelihood": "high|medium|low",
      "searchTerms": [
        {
          "id": "",
          "category": "DocumentType|Person|Subject|Date|Relationship|Confidentiality",
          "term": "BOOLEAN STRING WITH CASE-SPECIFIC IDENTIFIERS",
          "precision": "high|medium|low",
          "recall": "high|medium|low",
          "rationale": "Why this search addresses this specific RFP request",
          "enabled": true,
          "aiGenerated": true
        }
      ],
      "combinedBooleanString": "All enabled terms combined with OR"
    }
  ],
  "privilegeSearchTerms": [
    {
      "id": "",
      "relatedRfpNumbers": [1, 3],
      "term": "",
      "rationale": "",
      "enabled": true,
      "aiGenerated": true
    }
  ],
  "suggestedCustodians": [
    {"name": "", "role": "", "relevantToRfpNumbers": [1, 2, 3]}
  ]
}

## RULES
1. Use EXACT terminology from each RFP request
2. Every search term needs case-specific identifiers (names, dates, document types from this case)
3. Include name variations and common misspellings
4. Include date format variations
5. Create separate search term sets for EACH RFP request
6. Tag which RFP number each search term addresses
7. Consider what document types would actually contain the requested information

## EXAMPLE

For RFP: "All Documents relating to Wilmot's employment with you, including but not limited to, all offer letters, employment agreements, consulting agreements, compensation plans, bonus structures, equity grant agreements, and job descriptions"

Generate:
- (Wilmot OR "David Wilmot") AND ("offer letter" OR "employment agreement" OR "consulting agreement")
- (Wilmot OR "David Wilmot") AND (compensation OR salary OR bonus OR equity OR "stock option" OR grant)
- (Wilmot OR "David Wilmot") AND ("job description" OR JD OR role OR duties OR responsibilities)
- (CEO OR "Chief Executive") AND (offer OR hire* OR recruit* OR compensation OR agreement) AND (EWC OR "EWC Growth")

NOT generic searches like:
- employment AND agreement (too broad, not case-specific)
- compensation AND documents (doesn't use actual names)

Analyze this RFP document:

---
`;

export class RFPParserService {
  async parseRFPDocument(documentText: string): Promise<ParsedRFP[]> {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("Gemini API key not configured");
    }

    const fullPrompt = rfpAnalysisPrompt + documentText.substring(0, 80000) + "\n---";

    try {
      console.log(`[RFPParser] Sending ${fullPrompt.length} chars to AI (doc: ${documentText.length} chars)`);
      
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: fullPrompt,
        config: {
          maxOutputTokens: 8192,
          temperature: 0.1,
        }
      });
      const rawResponse = result.text || "";
      
      console.log(`[RFPParser] Received response: ${rawResponse.length} chars`);
      console.log(`[RFPParser] Response preview: ${rawResponse.substring(0, 500)}`);

      // Strip markdown code fences if present
      const response = stripMarkdownCodeFences(rawResponse);
      console.log(`[RFPParser] After cleanup: ${response.length} chars, starts with: ${response.substring(0, 50)}`);

      // Try to parse as full analysis result first
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed: RFPAnalysisResult = JSON.parse(jsonMatch[0]);
          console.log(`[RFPParser] Parsed ${parsed.rfpRequests?.length || 0} RFP requests`);
          
          // Return the rfpRequests array with proper IDs
          return (parsed.rfpRequests || []).map((rfp) => ({
            ...rfp,
            combinedBoolean: rfp.combinedBoolean || (rfp as any).combinedBooleanString || "",
            searchTerms: (rfp.searchTerms || []).map((term) => ({
              ...term,
              id: nanoid(),
              type: term.type || "boolean",
            })),
          }));
        } catch (parseErr) {
          console.error("[RFPParser] Failed to parse as object:", parseErr);
        }
      }

      // Fallback to array format
      const arrayMatch = response.match(/\[[\s\S]*\]/);
      if (!arrayMatch) {
        console.error("[RFPParser] Failed to extract JSON from response:", response.substring(0, 2000));
        throw new Error("Failed to parse RFP response - no JSON found");
      }

      const parsed: ParsedRFP[] = JSON.parse(arrayMatch[0]);
      console.log(`[RFPParser] Parsed ${parsed.length} RFP requests (array format)`);

      return parsed.map((rfp) => ({
        ...rfp,
        combinedBoolean: rfp.combinedBoolean || (rfp as any).combinedBooleanString || "",
        searchTerms: (rfp.searchTerms || []).map((term) => ({
          ...term,
          id: nanoid(),
          type: term.type || "boolean",
        })),
      }));
    } catch (error) {
      console.error("[RFPParser] Error parsing RFP document:", error);
      throw error;
    }
  }

  async parseRFPDocumentFull(documentText: string): Promise<RFPAnalysisResult> {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("Gemini API key not configured");
    }

    const fullPrompt = rfpAnalysisPrompt + documentText.substring(0, 80000) + "\n---";

    try {
      console.log(`[RFPParser] Full parse: Sending ${fullPrompt.length} chars to AI`);
      
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: fullPrompt,
        config: {
          maxOutputTokens: 8192,
          temperature: 0.1,
        }
      });
      const rawResponse = result.text || "";
      
      console.log(`[RFPParser] Full parse response: ${rawResponse.length} chars`);

      // Strip markdown code fences if present
      const response = stripMarkdownCodeFences(rawResponse);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("[RFPParser] Failed to extract JSON from response:", response.substring(0, 2000));
        throw new Error("Failed to parse RFP response - no JSON found");
      }

      const parsed: RFPAnalysisResult = JSON.parse(jsonMatch[0]);
      console.log(`[RFPParser] Full parse: ${parsed.rfpRequests?.length || 0} requests`);

      // Add IDs to all items
      parsed.rfpRequests = (parsed.rfpRequests || []).map((rfp) => ({
        ...rfp,
        combinedBoolean: rfp.combinedBoolean || (rfp as any).combinedBooleanString || "",
        searchTerms: (rfp.searchTerms || []).map((term) => ({
          ...term,
          id: nanoid(),
          type: term.type || "boolean",
        })),
      }));

      parsed.privilegeSearchTerms = (parsed.privilegeSearchTerms || []).map((term) => ({
        ...term,
        id: nanoid(),
      }));

      return parsed;
    } catch (error) {
      console.error("[RFPParser] Error in full parse:", error);
      throw error;
    }
  }
}

export const rfpParserService = new RFPParserService();
