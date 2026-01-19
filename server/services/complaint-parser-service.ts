import { GoogleGenAI } from "@google/genai";
import { nanoid } from "nanoid";

export interface ParsedClaim {
  claimNumber: number;
  causeOfAction: string;
  fullText: string;
  summary: string;
  legalElements: LegalElement[];
  searchTerms: SearchTerm[];
  combinedBoolean: string;
}

export interface LegalElement {
  element: string;
  description: string;
  searchTerms: SearchTerm[];
}

export interface SearchTerm {
  id: string;
  term: string;
  type: "boolean" | "phrase" | "proximity" | "wildcard";
  enabled: boolean;
  aiGenerated: boolean;
  rationale: string;
}

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

export class ComplaintParserService {
  async parseComplaint(documentText: string): Promise<ParsedClaim[]> {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("Gemini API key not configured");
    }

    const prompt = `You are a litigation support expert. Analyze this complaint and extract each cause of action/claim.

For each claim, you need to:
1. Identify the cause of action (e.g., "Breach of Contract", "Negligence", "Fraud")
2. Break down the legal elements that must be proven
3. Generate Boolean search terms to find documents that prove each element

## Legal Element Analysis:
For each cause of action, identify what must be proven. Example for Breach of Contract:
- Element 1: Existence of a valid contract
- Element 2: Plaintiff's performance or excuse for non-performance  
- Element 3: Defendant's breach
- Element 4: Damages resulting from breach

## Search Term Generation Strategy:
For proving a case, focus on:
1. **Documentary Evidence**: Contracts, agreements, communications showing obligations
2. **Performance Evidence**: Invoices, deliverables, correspondence showing work done
3. **Breach Evidence**: Complaints, failure notices, deviation from requirements
4. **Damages Evidence**: Financial records, lost revenue, mitigation efforts
5. **Timeline Evidence**: Dates, deadlines, milestone documents

## Boolean Search Best Practices:
- Use AND to require concepts: "contract AND breach"
- Use OR for synonyms: "(agreement OR contract OR understanding)"
- Use phrases: "material breach"
- Use wildcards: "perform*" for perform, performance, performed
- Use proximity: "deliver* W/15 fail*"

Now analyze this complaint:

---
${documentText.substring(0, 50000)}
---

Return JSON array only (no markdown):
[
  {
    "claimNumber": 1,
    "causeOfAction": "Breach of Contract",
    "fullText": "Complete text of the claim from the complaint",
    "summary": "Brief summary of what is alleged",
    "legalElements": [
      {
        "element": "Existence of Valid Contract",
        "description": "Plaintiff must prove a valid contract existed",
        "searchTerms": [
          {
            "term": "(contract OR agreement OR \\"master services agreement\\" OR MSA)",
            "type": "boolean",
            "enabled": true,
            "aiGenerated": true,
            "rationale": "Find the underlying contract documents"
          }
        ]
      }
    ],
    "searchTerms": [
      {
        "term": "Combined search for this entire claim",
        "type": "boolean",
        "enabled": true,
        "aiGenerated": true,
        "rationale": "Overall search for claim-related documents"
      }
    ],
    "combinedBoolean": "All enabled terms for this claim"
  }
]`;

    try {
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      const response = result.text || "";

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error("[ComplaintParser] Failed to extract JSON from response:", response.substring(0, 500));
        throw new Error("Failed to parse complaint response - no JSON found");
      }

      const parsed: ParsedClaim[] = JSON.parse(jsonMatch[0]);

      return parsed.map((claim) => ({
        ...claim,
        searchTerms: claim.searchTerms.map((term) => ({
          ...term,
          id: nanoid(),
        })),
        legalElements: claim.legalElements.map((element) => ({
          ...element,
          searchTerms: element.searchTerms.map((term) => ({
            ...term,
            id: nanoid(),
          })),
        })),
      }));
    } catch (error) {
      console.error("[ComplaintParser] Error parsing complaint:", error);
      throw error;
    }
  }
}
