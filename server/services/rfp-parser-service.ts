import { GoogleGenAI } from "@google/genai";
import { nanoid } from "nanoid";

export interface ParsedRFP {
  requestNumber: number;
  fullText: string;
  summary: string;
  searchTerms: SearchTerm[];
  combinedBoolean: string;
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

export class RFPParserService {
  async parseRFPDocument(documentText: string): Promise<ParsedRFP[]> {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("Gemini API key not configured");
    }

    const prompt = `You are a legal discovery expert. Analyze this Request for Production document and extract each individual request.

For each request, generate Boolean search terms that would find responsive documents. Follow these guidelines:

## Boolean Search Best Practices:
1. Use AND to require all terms: "contract AND breach AND damages"
2. Use OR for synonyms/alternatives: "(email OR correspondence OR communication)"
3. Use quotation marks for exact phrases: "employment agreement"
4. Use proximity operators where supported: "termination W/10 cause"
5. Use wildcards for variations: "employ*" matches employ, employee, employment, employer
6. Consider common misspellings and abbreviations
7. Think about how the concepts would appear in actual business documents

## For Each RFP Request, Generate:
1. **Primary Terms**: Core concepts that MUST appear (use AND)
2. **Synonym Groups**: Alternative words for the same concept (use OR within parentheses)
3. **Contextual Terms**: Terms that indicate relevance when combined with primary terms
4. **Exclusion Terms**: Terms that might indicate non-responsive documents (use NOT sparingly)

## Example Output for "All documents relating to the termination of John Smith's employment":

Primary Search String:
(terminat* OR discharg* OR "let go" OR fired OR separation) AND (Smith OR "John Smith") AND (employ* OR job OR position OR "human resources" OR HR)

Alternative Searches:
1. "performance review" AND Smith - rationale: termination often preceded by performance issues
2. "exit interview" AND Smith - rationale: exit documentation
3. "severance" AND Smith - rationale: severance discussions indicate termination

Now analyze this document:

---
${documentText.substring(0, 50000)}
---

Return JSON array only (no markdown):
[
  {
    "requestNumber": 1,
    "fullText": "Complete text of the request",
    "summary": "Brief 1-2 sentence summary",
    "searchTerms": [
      {
        "term": "Boolean search string",
        "type": "boolean",
        "enabled": true,
        "aiGenerated": true,
        "rationale": "Why this search term is relevant"
      }
    ],
    "combinedBoolean": "All enabled terms combined with OR"
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
        console.error("[RFPParser] Failed to extract JSON from response:", response.substring(0, 500));
        throw new Error("Failed to parse RFP response - no JSON found");
      }

      const parsed: ParsedRFP[] = JSON.parse(jsonMatch[0]);

      return parsed.map((rfp) => ({
        ...rfp,
        searchTerms: rfp.searchTerms.map((term) => ({
          ...term,
          id: nanoid(),
        })),
      }));
    } catch (error) {
      console.error("[RFPParser] Error parsing RFP document:", error);
      throw error;
    }
  }
}
