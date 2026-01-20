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

/**
 * Extract a balanced JSON structure starting from a given index.
 * Returns the extracted JSON string and its end position, or null if extraction fails.
 */
function extractBalancedJson(text: string, startIndex: number, openChar: string, closeChar: string): { json: string; endIndex: number } | null {
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  
  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }
    
    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === openChar) {
        depth++;
      } else if (char === closeChar) {
        depth--;
        if (depth === 0) {
          return { json: text.substring(startIndex, i + 1), endIndex: i + 1 };
        }
      }
    }
  }
  
  return null;
}

/**
 * Extract the LARGEST valid JSON object from a string.
 * Finds all valid JSON objects and returns the one with the most content.
 * This handles cases where AI returns nested objects and we need the outer one.
 */
function extractFirstJsonObject(text: string): string | null {
  let searchStart = 0;
  let largestJson: string | null = null;
  let largestLength = 0;
  
  while (searchStart < text.length) {
    const startIndex = text.indexOf('{', searchStart);
    if (startIndex === -1) break;
    
    const result = extractBalancedJson(text, startIndex, '{', '}');
    if (result) {
      // Try to parse to verify it's valid JSON
      try {
        JSON.parse(result.json);
        console.log(`[RFPParser] Found valid JSON object at index ${startIndex}, length ${result.json.length}`);
        
        // Keep track of the largest valid JSON we find
        if (result.json.length > largestLength) {
          largestJson = result.json;
          largestLength = result.json.length;
          console.log(`[RFPParser] New largest JSON: ${largestLength} chars`);
        }
        
        // Move past this object to look for more
        searchStart = result.endIndex;
      } catch (e) {
        // This balanced extraction wasn't valid JSON, try next candidate
        console.log(`[RFPParser] Balanced extraction at ${startIndex} wasn't valid JSON, trying next...`);
        searchStart = startIndex + 1;
      }
    } else {
      // Couldn't extract balanced structure, try next opening brace
      searchStart = startIndex + 1;
    }
  }
  
  if (largestJson) {
    console.log(`[RFPParser] Returning largest valid JSON: ${largestLength} chars`);
    return largestJson;
  }
  
  console.error("[RFPParser] No valid JSON object found in response");
  return null;
}

/**
 * Extract embedded RFP request objects from a string.
 * Looks for JSON objects that have requestNumber and searchTerms fields.
 * This is a fallback when the outer JSON structure is corrupted/truncated.
 */
function extractEmbeddedRFPObjects(text: string): ParsedRFP[] {
  const rfpObjects: ParsedRFP[] = [];
  let searchStart = 0;
  
  while (searchStart < text.length) {
    const startIndex = text.indexOf('{', searchStart);
    if (startIndex === -1) break;
    
    const result = extractBalancedJson(text, startIndex, '{', '}');
    if (result) {
      try {
        const obj = JSON.parse(result.json);
        // Check if this looks like an RFP request object
        if (obj.requestNumber !== undefined && obj.searchTerms && Array.isArray(obj.searchTerms)) {
          console.log(`[RFPParser] Found embedded RFP request ${obj.requestNumber} at index ${startIndex}`);
          rfpObjects.push(obj as ParsedRFP);
        }
        searchStart = result.endIndex;
      } catch (e) {
        searchStart = startIndex + 1;
      }
    } else {
      searchStart = startIndex + 1;
    }
  }
  
  // Sort by request number
  rfpObjects.sort((a, b) => a.requestNumber - b.requestNumber);
  
  return rfpObjects;
}

/**
 * Extract the first valid JSON array from a string.
 * Tries multiple candidates until finding one that parses successfully.
 */
function extractFirstJsonArray(text: string): string | null {
  let searchStart = 0;
  
  while (searchStart < text.length) {
    const startIndex = text.indexOf('[', searchStart);
    if (startIndex === -1) break;
    
    const result = extractBalancedJson(text, startIndex, '[', ']');
    if (result) {
      try {
        JSON.parse(result.json);
        console.log(`[RFPParser] Found valid JSON array at index ${startIndex}, length ${result.json.length}`);
        return result.json;
      } catch (e) {
        searchStart = startIndex + 1;
      }
    } else {
      searchStart = startIndex + 1;
    }
  }
  
  console.error("[RFPParser] No valid JSON array found in response");
  return null;
}

const rfpAnalysisPrompt = `You are an expert eDiscovery consultant and litigation support specialist with extensive experience in Relativity, Concordance, Summation, and other major document review platforms. Your task is to generate comprehensive Boolean search strings for document review and tagging.

**INPUT:** I will provide you with discovery requests (Requests for Production, Interrogatories, or Document Requests) from litigation.

**OUTPUT:** For each discovery request, create:

1. **Primary Search String** - A broad Boolean query capturing the core subject matter
2. **Focused/Specific Search Strings** - 2-3 narrower queries targeting specific document types, topics, or angles within the request
3. Use proper Boolean syntax:
   - AND, OR, NOT operators (capitalized)
   - Wildcards (*) for root word expansion (e.g., employ* catches employ, employee, employment, employer)
   - Quotation marks for exact phrases (e.g., "trade secret")
   - Parentheses for grouping
   - Proximity operators where useful (note: w/n format)
4. Consider all named parties, individuals, and entities mentioned
5. Include synonyms and alternative phrasings for key concepts
6. Account for common document types relevant to each request

**STYLE:**
- Platform-agnostic syntax compatible with major eDiscovery tools
- Practical, ready-to-use strings requiring minimal modification
- Balance between precision (avoiding false positives) and recall (capturing relevant documents)

## OUTPUT FORMAT

Return ONLY valid JSON with NO markdown code fences, NO explanation text before or after:

{
  "caseContext": {
    "caseName": "Case name from document caption",
    "caseNumber": "Case number if present",
    "plaintiff": "Plaintiff name(s)",
    "defendant": "Defendant name(s)",
    "respondingParty": "Party responding to these RFPs",
    "keyIndividuals": [{"name": "Person Name", "role": "Title or Role"}],
    "keyDates": [{"date": "Date or range", "significance": "What happened"}],
    "thirdParties": ["Company or person names"],
    "coreDispute": "Brief description of case subject matter"
  },
  "rfpRequests": [
    {
      "requestNumber": 1,
      "fullText": "Complete verbatim text of the RFP request",
      "summary": "One-sentence summary of what is being requested",
      "documentTypesRequested": ["emails", "contracts", "agreements"],
      "subjectMatter": ["employment", "compensation"],
      "timePeriod": "Date range if specified",
      "targetedEntities": ["Names of people or companies targeted"],
      "keyTerminology": ["Key phrases from the request"],
      "privilegeLikelihood": "high",
      "searchTerms": [
        {
          "id": "st1",
          "category": "Primary",
          "term": "(Party1 OR Party2) AND (keyword1 OR keyword2)",
          "precision": "medium",
          "recall": "high",
          "rationale": "Broad search to capture all documents relating to this request",
          "enabled": true,
          "aiGenerated": true
        },
        {
          "id": "st2",
          "category": "DocumentType",
          "term": "(\"employment agreement\" OR \"offer letter\" OR contract*) AND (PersonName)",
          "precision": "high",
          "recall": "medium",
          "rationale": "Focused on specific document types mentioned in request",
          "enabled": true,
          "aiGenerated": true
        },
        {
          "id": "st3",
          "category": "Person",
          "term": "(\"John Smith\" OR \"J. Smith\" OR Smith) AND (employ* OR hire* OR compensation)",
          "precision": "high",
          "recall": "medium",
          "rationale": "Name variations for key individual",
          "enabled": true,
          "aiGenerated": true
        }
      ],
      "combinedBoolean": "(term1) OR (term2) OR (term3)"
    }
  ],
  "privilegeSearchTerms": [
    {
      "id": "priv1",
      "relatedRfpNumbers": [1, 2],
      "term": "(attorney* OR counsel OR \"legal advice\" OR privileged) AND (TopicFromRFP)",
      "rationale": "Identifies potentially privileged communications",
      "enabled": true,
      "aiGenerated": true
    }
  ],
  "suggestedCustodians": [
    {"name": "Person Name", "role": "Title", "relevantToRfpNumbers": [1, 2, 3]}
  ]
}

## CRITICAL RULES
1. Return ONLY the JSON object - no markdown, no backticks, no explanation
2. Every search term MUST include case-specific names, entities, or terminology from the actual RFP
3. Include name variations (full name, initials, last name only)
4. Include date format variations when dates are mentioned
5. Generate 2-4 search terms per RFP request (Primary + Focused variants)
6. The combinedBoolean field should join all enabled search terms with OR

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
          maxOutputTokens: 32768,  // Increased for large RFP documents with many requests
          temperature: 0.1,
        }
      });
      const rawResponse = result.text || "";
      
      console.log(`[RFPParser] Received response: ${rawResponse.length} chars`);
      console.log(`[RFPParser] Response preview: ${rawResponse.substring(0, 500)}`);

      // Strip markdown code fences if present
      const response = stripMarkdownCodeFences(rawResponse);
      console.log(`[RFPParser] After cleanup: ${response.length} chars, starts with: ${response.substring(0, 100)}`);

      // Try to parse as full analysis result first (object format)
      const jsonObject = extractFirstJsonObject(response);
      if (jsonObject) {
        try {
          console.log(`[RFPParser] Extracted JSON object: ${jsonObject.length} chars`);
          const parsed: RFPAnalysisResult = JSON.parse(jsonObject);
          console.log(`[RFPParser] Parsed ${parsed.rfpRequests?.length || 0} RFP requests`);
          
          // Validate that we actually got RFP requests
          if (parsed.rfpRequests && parsed.rfpRequests.length > 0) {
            // Return the rfpRequests array with proper IDs
            return parsed.rfpRequests.map((rfp) => ({
              ...rfp,
              combinedBoolean: rfp.combinedBoolean || (rfp as any).combinedBooleanString || "",
              searchTerms: (rfp.searchTerms || []).map((term) => ({
                ...term,
                id: nanoid(),
                type: term.type || "boolean",
              })),
            }));
          } else {
            console.warn("[RFPParser] Parsed object has no rfpRequests, trying embedded extraction...");
          }
        } catch (parseErr) {
          console.error("[RFPParser] Failed to parse as object:", parseErr);
          console.error("[RFPParser] JSON object preview:", jsonObject.substring(0, 500));
        }
      }

      // Fallback: Try to extract individual RFP request objects embedded in the response
      // This handles cases where the outer JSON structure is corrupted/truncated
      console.log("[RFPParser] Attempting to extract embedded RFP request objects...");
      const embeddedRFPs = extractEmbeddedRFPObjects(response);
      if (embeddedRFPs.length > 0) {
        console.log(`[RFPParser] Extracted ${embeddedRFPs.length} embedded RFP requests`);
        return embeddedRFPs.map((rfp) => ({
          ...rfp,
          combinedBoolean: rfp.combinedBoolean || (rfp as any).combinedBooleanString || "",
          searchTerms: (rfp.searchTerms || []).map((term) => ({
            ...term,
            id: nanoid(),
            type: term.type || "boolean",
          })),
        }));
      }

      // Last fallback: Try array format
      const jsonArray = extractFirstJsonArray(response);
      if (jsonArray) {
        console.log(`[RFPParser] Extracted JSON array: ${jsonArray.length} chars`);
        const parsed: ParsedRFP[] = JSON.parse(jsonArray);
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
      }
      
      console.error("[RFPParser] Failed to extract JSON from response:", response.substring(0, 2000));
      throw new Error("Failed to parse RFP response - no JSON found");
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
          maxOutputTokens: 32768,  // Increased for large RFP documents with many requests
          temperature: 0.1,
        }
      });
      const rawResponse = result.text || "";
      
      console.log(`[RFPParser] Full parse response: ${rawResponse.length} chars`);
      console.log(`[RFPParser] Full parse preview: ${rawResponse.substring(0, 500)}`);

      // Strip markdown code fences if present
      const response = stripMarkdownCodeFences(rawResponse);
      console.log(`[RFPParser] Full parse after cleanup: ${response.length} chars, starts with: ${response.substring(0, 100)}`);

      const jsonObject = extractFirstJsonObject(response);
      if (!jsonObject) {
        console.error("[RFPParser] Failed to extract JSON from response:", response.substring(0, 2000));
        throw new Error("Failed to parse RFP response - no JSON found");
      }

      console.log(`[RFPParser] Full parse extracted JSON: ${jsonObject.length} chars`);
      const parsed: RFPAnalysisResult = JSON.parse(jsonObject);
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
