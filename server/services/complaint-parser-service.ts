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

const complaintAnalysisPrompt = `You are a senior litigation associate conducting pre-discovery analysis. Thoroughly analyze this complaint and create a comprehensive, case-specific document search strategy.

## PHASE 1: EXTRACT CASE FUNDAMENTALS

### 1.1 Parties & People
Extract from the complaint:
- All plaintiff(s): Full legal names, corporate form, DBAs/aliases
- All defendant(s): Full legal names, corporate form, DBAs/aliases  
- Every individual mentioned by name: Their role, title, which party they're associated with
- Any third parties: Witnesses, agents, vendors, affiliates, subsidiaries

### 1.2 Critical Dates
Extract EVERY date mentioned:
- Contract execution dates
- Alleged breach dates
- Notice dates
- Termination dates
- Deadline dates
- Payment due dates
- The overall time period of the dispute

### 1.3 Monetary Figures
Extract ALL dollar amounts:
- Contract values
- Claimed damages
- Specific payment amounts
- Lost revenue figures
- Any financial figures referenced

### 1.4 Documents Referenced
List every document mentioned or quoted:
- Contracts by name (e.g., "Master Services Agreement", "Employment Agreement")
- Specific communications referenced
- Exhibits attached or referenced
- Any document the complaint quotes from

### 1.5 Specific Terminology
Identify case-specific terms:
- Project names or code names
- Product names
- Internal terminology used
- Defined terms from contracts
- Industry jargon specific to this dispute

---

## PHASE 2: ANALYZE EACH CAUSE OF ACTION

For EACH cause of action in the complaint:

### 2.1 Identification
- Claim number as stated
- Exact title as stated in the complaint
- Legal theory (breach of contract, negligence, fraud, etc.)
- Statutory citation if any
- Which defendant(s) this claim targets

### 2.2 Factual Allegations
Extract the SPECIFIC factual allegations that support this claim:
- Quote or closely paraphrase each relevant paragraph
- Note paragraph numbers (¶) for reference
- Do NOT generalize - use the complaint's actual language

### 2.3 Legal Elements
For the applicable jurisdiction's law, list what must be proven:
- Each required element
- Which specific factual allegations support each element
- Assessment: Is the support strong, moderate, or weak?
- Gaps: What facts are missing or thin?

### 2.4 Anticipated Defenses  
Based on the allegations, what defenses will defendant likely raise?
- Affirmative defenses (statute of limitations, waiver, estoppel, etc.)
- Factual disputes (what will defendant contest?)
- What documents might support defendant's version?

---

## PHASE 3: GENERATE CASE-SPECIFIC BOOLEAN SEARCH TERMS

CRITICAL: Every search term MUST use actual names, dates, amounts, and terminology FROM THIS COMPLAINT. No generic searches.

### Search Term Categories:

**CATEGORY A: Party & People Searches**
Use actual names from the complaint with variations:
- Full name, first initial + last name, last name only
- Common misspellings and OCR errors
- Job titles mentioned
- Email address patterns if inferable
Example: ("John Martinez" OR "J. Martinez" OR "J Martinez" OR "Martinez, John" OR CEO W/3 TechCorp)

**CATEGORY B: Document Searches**
Target specific documents referenced in the complaint:
- Use exact document names from the complaint
- Include common abbreviations
- Include document types
Example: ("Master Services Agreement" OR MSA OR "Services Agreement") AND (TechCorp OR Acme)

**CATEGORY C: Subject Matter Searches**
Use the complaint's actual terminology:
- Project names, product names, code names
- Specific contract provisions referenced
- Issues described in the complaint's language
Example: ("Alpha Platform" OR "Alpha Project" OR "Project Alpha") AND (deliver* OR status OR delay* OR schedul*)

**CATEGORY D: Date-Bounded Searches**
Combine subjects with specific dates from the complaint:
- Use multiple date formats (1/15/24, January 15, Jan 15, 15-Jan)
- Quarter references (Q4, Q1, "fourth quarter")
- Year references where appropriate
Example: (deliver* OR deadline OR launch) W/15 ("December 31" OR "12/31/23" OR "Dec 31" OR "year end" OR "Q4 2023")

**CATEGORY E: Communication Searches**
Find discussions about the disputed issues:
- Combine party names with issue terms
- Look for problem/concern language
- Target negotiation and dispute communications
Example: (Martinez OR "John Martinez") AND (concern* OR problem* OR issue* OR delay* OR discuss*)

**CATEGORY F: Financial/Damages Searches**
Target damages evidence using actual figures:
- Use exact dollar amounts from complaint
- Include payment/invoice terminology
- Financial impact language
Example: ("$2.4 million" OR "$2,400,000" OR "2.4M" OR "contract price") OR (invoice* OR payment* OR outstanding) W/10 (TechCorp OR Alpha OR MSA)

**CATEGORY G: Timeline & Milestone Searches**  
Find schedule and deadline documents:
- Use specific milestones mentioned
- Deadline and schedule language
- Delay and extension discussions
Example: (milestone OR deliverable OR "phase 1" OR "phase 2") AND (Alpha OR TechCorp) AND (date OR deadline OR schedule OR delay*)

### Boolean Syntax:
- AND: Both required → contract AND breach
- OR: Either matches → (agreement OR contract)  
- NOT: Exclude → contract NOT employment
- "Quotes": Exact phrase → "material breach"
- Parentheses: Grouping → (Smith OR Jones) AND contract
- *Wildcard: Word endings → terminat* matches terminate, termination, terminated
- W/n: Within n words → breach W/10 contract
- P/n: Within n paragraphs → breach P/2 damages

### Quality Requirements:
1. EVERY search must include at least one case-specific identifier (name, date, project name, dollar amount)
2. Create BOTH narrow (high precision) and broad (high recall) versions
3. Consider common misspellings for key names
4. Consider multiple date formats
5. Use the exact terminology from the complaint

---

## PHASE 4: PRIVILEGE IDENTIFICATION

Based on what the complaint reveals:
- Are attorneys mentioned? Generate name searches.
- Is legal advice referenced? Generate context searches.
- Are there joint defense or common interest implications?

Generate privilege search terms specific to this case, not generic "attorney OR lawyer" searches.

---

## PHASE 5: CUSTODIAN RECOMMENDATIONS

Based on individuals in the complaint:
- Priority custodians: People directly named in allegations
- Secondary custodians: Supervisors, assistants, department heads likely to have relevant documents

---

## OUTPUT FORMAT

Return valid JSON only (no markdown code blocks):

{
  "caseFundamentals": {
    "plaintiffs": [{"name": "", "type": "", "aliases": [], "keyIndividuals": []}],
    "defendants": [{"name": "", "type": "", "aliases": [], "keyIndividuals": []}],
    "dateRange": {
      "earliest": "YYYY-MM-DD",
      "latest": "YYYY-MM-DD",
      "keyDates": [{"date": "", "event": ""}]
    },
    "monetaryFigures": [{"amount": "", "description": ""}],
    "referencedDocuments": [{"name": "", "type": ""}],
    "caseSpecificTerminology": ["term1", "term2"]
  },
  
  "causesOfAction": [
    {
      "claimNumber": 1,
      "claimTitle": "Exact title from complaint",
      "causeOfAction": "Legal theory name",
      "statutoryBasis": "Citation if any",
      "againstDefendants": ["Defendant names"],
      
      "factualAllegations": [
        {
          "paragraphRef": "¶ XX",
          "allegation": "Exact or close paraphrase from complaint",
          "relevantTo": "Which element this supports"
        }
      ],
      
      "legalElements": [
        {
          "number": 1,
          "element": "Element name",
          "mustProve": "What this element requires",
          "supportingFacts": "Which allegations support this",
          "strength": "strong",
          "gaps": "What's missing",
          "searchTerms": [
            {
              "id": "unique-id",
              "category": "Party",
              "targetElement": "Which element this addresses",
              "term": "THE BOOLEAN SEARCH STRING",
              "precision": "high",
              "recall": "medium", 
              "rationale": "Why this search is relevant",
              "enabled": true,
              "aiGenerated": true
            }
          ]
        }
      ],
      
      "anticipatedDefenses": [
        {
          "defense": "Defense name",
          "likelihood": "high",
          "documentsToFind": "What to search for"
        }
      ],
      
      "searchTerms": [
        {
          "id": "unique-id",
          "category": "Document",
          "targetElement": "Overall claim",
          "term": "THE BOOLEAN SEARCH STRING",
          "precision": "medium",
          "recall": "high", 
          "rationale": "Why this search is relevant to THIS SPECIFIC CASE",
          "enabled": true,
          "aiGenerated": true
        }
      ],
      
      "combinedBoolean": "All search terms combined for this claim"
    }
  ],
  
  "privilegeSearchTerms": [
    {
      "id": "unique-id",
      "privilegeType": "attorney_client",
      "term": "Boolean search string specific to this case",
      "rationale": "Why this applies to this case",
      "enabled": true,
      "aiGenerated": true
    }
  ],
  
  "recommendedCustodians": {
    "priority": [{"name": "", "role": "", "relevance": ""}],
    "secondary": [{"name": "", "role": "", "relevance": ""}]
  }
}

---

## CRITICAL REMINDERS

1. USE THE ACTUAL COMPLAINT LANGUAGE - not generic legal terms
2. EVERY SEARCH TERM must include case-specific identifiers
3. EXTRACT REAL NAMES, DATES, AMOUNTS - do not generalize
4. QUOTE THE COMPLAINT when describing allegations
5. CREATE VARIATIONS for names (misspellings, initials, titles)
6. CREATE VARIATIONS for dates (multiple formats)
7. DO NOT HALLUCINATE - only use facts from the complaint
8. NOTE GAPS where the complaint is thin on facts

---

Now analyze this complaint:

---
`;

export class ComplaintParserService {
  async parseComplaint(documentText: string): Promise<ParsedClaim[]> {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("Gemini API key not configured");
    }

    const fullPrompt = complaintAnalysisPrompt + documentText.substring(0, 100000) + "\n---";

    try {
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: fullPrompt,
      });
      const response = result.text || "";

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("[ComplaintParser] Failed to extract JSON from response:", response.substring(0, 500));
        throw new Error("Failed to parse complaint response - no JSON found");
      }

      const parsed: ComplaintAnalysisResult = JSON.parse(jsonMatch[0]);

      const claims = parsed.causesOfAction.map((claim) => ({
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

    const fullPrompt = complaintAnalysisPrompt + documentText.substring(0, 100000) + "\n---";

    try {
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: fullPrompt,
      });
      const response = result.text || "";

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("[ComplaintParser] Failed to extract JSON from response:", response.substring(0, 500));
        throw new Error("Failed to parse complaint response - no JSON found");
      }

      const parsed: ComplaintAnalysisResult = JSON.parse(jsonMatch[0]);

      parsed.causesOfAction = parsed.causesOfAction.map((claim) => ({
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

      parsed.recommendedCustodians = parsed.recommendedCustodians || { priority: [], secondary: [] };
      parsed.caseFundamentals = parsed.caseFundamentals || {
        plaintiffs: [],
        defendants: [],
        dateRange: { earliest: "", latest: "", keyDates: [] },
        monetaryFigures: [],
        referencedDocuments: [],
        caseSpecificTerminology: [],
      };

      return parsed;
    } catch (error) {
      console.error("[ComplaintParser] Error parsing complaint:", error);
      throw error;
    }
  }
}
