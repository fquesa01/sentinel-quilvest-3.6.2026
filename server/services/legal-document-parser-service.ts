import { GoogleGenAI } from "@google/genai";

// Lazy initialization of AI client to handle missing API key gracefully
let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  if (!process.env.GOOGLE_API_KEY) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  }
  return aiClient;
}

export interface LegalDocumentMetadata {
  title: string | null;
  filingDate: string | null;
  documentType: string | null;
  caseNumber: string | null;
  parties: {
    plaintiffs: string[];
    defendants: string[];
  };
}

/**
 * Extract metadata from legal document text using AI.
 * Identifies document title, filing date, parties, and document type.
 */
export async function extractLegalDocumentMetadata(
  extractedText: string,
  fileName: string
): Promise<LegalDocumentMetadata> {
  const defaultResult: LegalDocumentMetadata = {
    title: null,
    filingDate: null,
    documentType: null,
    caseNumber: null,
    parties: { plaintiffs: [], defendants: [] },
  };

  if (!extractedText || extractedText.trim().length < 50) {
    console.log("[LegalDocParser] Text too short for AI parsing");
    return defaultResult;
  }

  const ai = getAIClient();
  if (!ai) {
    console.log("[LegalDocParser] No GOOGLE_API_KEY available");
    return defaultResult;
  }

  try {
    // Take first portion of document for analysis (header area where metadata typically appears)
    const textSample = extractedText.slice(0, 6000);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [{
          text: `You are a legal document analyst. Extract metadata from this court document.

DOCUMENT TEXT (first portion):
${textSample}

FILE NAME: ${fileName}

Extract and return ONLY a JSON object with these fields:
{
  "title": "The formal document title (e.g., 'Verified Complaint for Injunctive Relief and Damages', 'Motion to Dismiss', 'Answer to Complaint'). Look for the document title/caption, NOT the case name.",
  "filingDate": "The e-filing date or filing date in YYYY-MM-DD format. Look for 'E-Filed', 'Filed', or similar date stamps. Return null if not found.",
  "documentType": "One of: complaint, answer, motion, brief, court_order, discovery, subpoena, settlement, judgment, other",
  "caseNumber": "The case number if visible (e.g., '2025-12345-CA-01'). Return null if not found.",
  "parties": {
    "plaintiffs": ["List of plaintiff names"],
    "defendants": ["List of defendant names"]
  }
}

IMPORTANT:
- For title, find the actual document title like "VERIFIED COMPLAINT FOR INJUNCTIVE RELIEF AND DAMAGES" or "MOTION TO COMPEL DISCOVERY"
- Do NOT use metadata IDs like "DocuSign Envelope ID" as the title
- For filingDate, look for patterns like "E-Filed 05/02/2025" or "Filing # 222351797 E-Filed 05/02/2025"
- Return ONLY valid JSON, no explanation or markdown`
        }]
      }],
      config: {
        maxOutputTokens: 1024,
      }
    });

    const responseText = (response as any).text?.trim() || "";
    
    // Clean up response - remove markdown code blocks if present
    let jsonStr = responseText;
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);
    
    console.log(`[LegalDocParser] Extracted: title="${parsed.title}", date="${parsed.filingDate}", type="${parsed.documentType}"`);

    return {
      title: parsed.title || null,
      filingDate: parsed.filingDate || null,
      documentType: parsed.documentType || null,
      caseNumber: parsed.caseNumber || null,
      parties: {
        plaintiffs: Array.isArray(parsed.parties?.plaintiffs) ? parsed.parties.plaintiffs : [],
        defendants: Array.isArray(parsed.parties?.defendants) ? parsed.parties.defendants : [],
      },
    };
  } catch (error: any) {
    console.error("[LegalDocParser] Error extracting metadata:", error.message);
    return defaultResult;
  }
}

/**
 * Map extracted document type to valid pleading type enum.
 */
export function mapToValidPleadingType(
  extractedType: string | null
): "complaint" | "answer" | "motion" | "brief" | "court_order" | "discovery" | "subpoena" | "settlement" | "judgment" | "other" {
  if (!extractedType) return "other";
  
  const normalized = extractedType.toLowerCase().trim();
  
  const typeMap: Record<string, "complaint" | "answer" | "motion" | "brief" | "court_order" | "discovery" | "subpoena" | "settlement" | "judgment" | "other"> = {
    "complaint": "complaint",
    "answer": "answer",
    "motion": "motion",
    "brief": "brief",
    "court_order": "court_order",
    "order": "court_order",
    "discovery": "discovery",
    "subpoena": "subpoena",
    "settlement": "settlement",
    "judgment": "judgment",
    "other": "other",
  };

  return typeMap[normalized] || "other";
}
