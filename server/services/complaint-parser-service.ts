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
  dateRange: {
    earliest: string;
    latest: string;
    keyDates: { date: string; event: string }[];
  };
  monetaryFigures: { amount: string; description: string }[];
  referencedDocuments: { name: string; type: string }[];
  caseSpecificTerminology: string[];
}

export interface PartyInfo {
  name: string;
  type: string;
  aliases: string[];
  keyIndividuals: string[];
}

export interface PrivilegeSearchTerm {
  id: string;
  privilegeType: "attorney_client" | "work_product";
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

const complaintAnalysisPrompt = `Analyze this legal complaint and extract causes of action with Boolean search terms.

INSTRUCTIONS:
1. Extract each cause of action (claim) from the complaint
2. For each claim, generate Boolean search terms to find relevant documents
3. Use actual party names, dates, and terms from the complaint - NOT generic terms
4. Return ONLY valid JSON - no markdown, no explanation

REQUIRED JSON FORMAT:
{
  "caseFundamentals": {
    "plaintiffs": [{"name": "actual name", "type": "Individual/Company", "aliases": [], "keyIndividuals": []}],
    "defendants": [{"name": "actual name", "type": "Individual/Company", "aliases": [], "keyIndividuals": []}],
    "dateRange": {"earliest": "YYYY-MM-DD", "latest": "YYYY-MM-DD", "keyDates": []},
    "monetaryFigures": [],
    "referencedDocuments": [],
    "caseSpecificTerminology": []
  },
  "causesOfAction": [
    {
      "claimNumber": 1,
      "claimTitle": "Exact title from complaint (e.g., 'Count I: Breach of Contract')",
      "causeOfAction": "Legal theory (e.g., 'Breach of Contract')",
      "statutoryBasis": "citation if any",
      "againstDefendants": ["Defendant Name"],
      "factualAllegations": [
        {"paragraphRef": "¶ XX", "allegation": "Quote from complaint", "relevantTo": "element"}
      ],
      "legalElements": [
        {
          "number": 1,
          "element": "Element name",
          "mustProve": "What plaintiff must prove",
          "supportingFacts": "Facts alleged",
          "strength": "strong",
          "gaps": "What's missing",
          "searchTerms": [
            {"id": "1", "term": "(\"Defendant Name\" OR \"D. Name\") AND (contract OR agreement)", "category": "Party", "targetElement": "Existence of contract", "precision": "high", "recall": "medium", "rationale": "Find documents with defendant name and contract terms", "enabled": true, "aiGenerated": true}
          ]
        }
      ],
      "anticipatedDefenses": [],
      "searchTerms": [
        {"id": "2", "term": "\"Plaintiff Name\" AND \"Defendant Name\" AND (breach OR violat*)", "category": "Core", "targetElement": "Overall claim", "precision": "medium", "recall": "high", "rationale": "Find all documents discussing the alleged breach", "enabled": true, "aiGenerated": true}
      ],
      "combinedBoolean": "Combined search string for this claim"
    }
  ],
  "privilegeSearchTerms": [],
  "recommendedCustodians": {"priority": [], "secondary": []}
}

CRITICAL RULES:
1. USE ACTUAL NAMES from complaint (e.g., "Smith" not "Plaintiff")
2. Include name variations: "John Smith" OR "J. Smith" OR "Smith"
3. Include date variations where relevant
4. Each claim MUST have at least 3 search terms
5. Return ONLY the JSON object - no other text

COMPLAINT TEXT:
`;

export class ComplaintParserService {
  async parseComplaint(documentText: string): Promise<ParsedClaim[]> {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("Gemini API key not configured");
    }

    const fullPrompt = complaintAnalysisPrompt + documentText.substring(0, 80000);

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
      const response = result.text || "";
      
      console.log(`[ComplaintParser] Received response: ${response.length} chars`);
      console.log(`[ComplaintParser] Response preview: ${response.substring(0, 500)}`);

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
        legalElements: (claim.legalElements || []).map((element) => ({
          ...element,
          searchTerms: (element.searchTerms || []).map((term) => ({
            ...term,
            id: nanoid(),
          })),
        })),
        factualAllegations: claim.factualAllegations || [],
        anticipatedDefenses: claim.anticipatedDefenses || [],
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

    const fullPrompt = complaintAnalysisPrompt + documentText.substring(0, 80000);

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
      const response = result.text || "";
      
      console.log(`[ComplaintParser] Full parse response: ${response.length} chars`);

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
        legalElements: (claim.legalElements || []).map((element) => ({
          ...element,
          searchTerms: (element.searchTerms || []).map((term) => ({
            ...term,
            id: nanoid(),
          })),
        })),
        factualAllegations: claim.factualAllegations || [],
        anticipatedDefenses: claim.anticipatedDefenses || [],
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
