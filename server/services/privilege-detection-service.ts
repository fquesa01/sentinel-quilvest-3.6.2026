import { GoogleGenAI } from "@google/genai";
import { nanoid } from "nanoid";

export interface SearchTerm {
  id: string;
  term: string;
  type: "boolean" | "phrase" | "proximity" | "wildcard";
  enabled: boolean;
  aiGenerated: boolean;
  rationale: string;
}

export interface PrivilegeCategory {
  id: string;
  categoryName: string;
  privilegeType: string;
  description: string;
  searchTerms: SearchTerm[];
  combinedBoolean: string;
}

export interface PrivilegeSearchTerms {
  categories: PrivilegeCategory[];
}

export interface PrivilegeAnalysisResult {
  isPrivileged: boolean;
  privilegeType: string | null;
  confidence: number;
  basis: string;
  author: string | null;
  authorTitle: string | null;
  recipients: string[];
  documentDate: string | null;
  documentType: string;
  suggestedDescription: string;
}

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

export class PrivilegeDetectionService {

  generatePrivilegeSearchTerms(): PrivilegeSearchTerms {
    return {
      categories: [
        {
          id: nanoid(),
          categoryName: "Attorney-Client Communications",
          privilegeType: "attorney_client",
          description: "Communications between attorney and client for legal advice",
          searchTerms: [
            {
              id: nanoid(),
              term: '(attorney OR lawyer OR counsel OR "legal department" OR "general counsel" OR "outside counsel")',
              type: "boolean",
              enabled: true,
              aiGenerated: true,
              rationale: "Identify communications involving attorneys",
            },
            {
              id: nanoid(),
              term: '("legal advice" OR "attorney-client" OR "privileged" OR "confidential legal")',
              type: "boolean",
              enabled: true,
              aiGenerated: true,
              rationale: "Explicit privilege markers",
            },
            {
              id: nanoid(),
              term: '("Esq" OR "J.D." OR "Attorney at Law" OR "Law Firm" OR "LLP")',
              type: "boolean",
              enabled: true,
              aiGenerated: true,
              rationale: "Attorney identifiers in signatures",
            },
          ],
          combinedBoolean:
            '(attorney OR lawyer OR counsel OR "legal department") OR ("legal advice" OR "attorney-client" OR privileged) OR (Esq OR "Law Firm" OR LLP)',
        },
        {
          id: nanoid(),
          categoryName: "Work Product - Fact",
          privilegeType: "work_product",
          description: "Documents prepared in anticipation of litigation",
          searchTerms: [
            {
              id: nanoid(),
              term: '(litigation OR lawsuit OR "legal action" OR "potential claim" OR dispute)',
              type: "boolean",
              enabled: true,
              aiGenerated: true,
              rationale: "Litigation-related terminology",
            },
            {
              id: nanoid(),
              term: '("work product" OR "prepared for litigation" OR "in anticipation of")',
              type: "boolean",
              enabled: true,
              aiGenerated: true,
              rationale: "Work product indicators",
            },
            {
              id: nanoid(),
              term: '("legal hold" OR "litigation hold" OR "preserve" AND document*)',
              type: "boolean",
              enabled: true,
              aiGenerated: true,
              rationale: "Preservation notices indicate litigation",
            },
          ],
          combinedBoolean:
            '(litigation OR lawsuit OR "legal action") OR ("work product" OR "prepared for litigation") OR ("legal hold" AND preserve)',
        },
        {
          id: nanoid(),
          categoryName: "Work Product - Opinion",
          privilegeType: "work_product_opinion",
          description: "Attorney mental impressions, conclusions, opinions",
          searchTerms: [
            {
              id: nanoid(),
              term: '("legal analysis" OR "legal opinion" OR "legal assessment" OR "legal strategy")',
              type: "boolean",
              enabled: true,
              aiGenerated: true,
              rationale: "Attorney analysis and opinions",
            },
            {
              id: nanoid(),
              term: '("litigation strategy" OR "case strategy" OR "defense strategy" OR "trial preparation")',
              type: "boolean",
              enabled: true,
              aiGenerated: true,
              rationale: "Strategic litigation planning",
            },
          ],
          combinedBoolean:
            '("legal analysis" OR "legal opinion" OR "legal strategy") OR ("litigation strategy" OR "case strategy" OR "trial preparation")',
        },
        {
          id: nanoid(),
          categoryName: "Common Interest / Joint Defense",
          privilegeType: "joint_defense",
          description: "Shared communications under joint defense agreement",
          searchTerms: [
            {
              id: nanoid(),
              term: '("joint defense" OR "common interest" OR "joint privilege" OR "common legal interest")',
              type: "boolean",
              enabled: true,
              aiGenerated: true,
              rationale: "Joint defense agreement references",
            },
            {
              id: nanoid(),
              term: '("JDA" OR "joint defense agreement" OR "common interest agreement")',
              type: "boolean",
              enabled: true,
              aiGenerated: true,
              rationale: "Agreement abbreviations and terms",
            },
          ],
          combinedBoolean:
            '("joint defense" OR "common interest" OR JDA) OR ("joint defense agreement" OR "common interest agreement")',
        },
      ],
    };
  }

  async analyzeDocumentForPrivilege(
    documentText: string,
    documentMetadata: {
      fileName: string;
      author?: string;
      recipients?: string[];
      date?: string;
    }
  ): Promise<PrivilegeAnalysisResult> {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("Gemini API key not configured");
    }

    const prompt = `You are a legal privilege reviewer. Analyze this document for potential attorney-client privilege or work product protection.

## Privilege Analysis Framework:

### Attorney-Client Privilege requires ALL of:
1. Communication between attorney and client (or their agents)
2. Made for purpose of obtaining/providing legal advice
3. Intended to be confidential
4. Privilege not waived

### Work Product Protection requires:
1. Document prepared in anticipation of litigation
2. By or for a party or their representative
3. For trial preparation purposes

### Key Indicators to Look For:
- Attorney names, law firm names, legal department
- Legal advice being sought or provided
- References to litigation, claims, disputes
- "Privileged," "Confidential," or similar markings
- Legal strategy discussions
- Mental impressions or opinions of counsel

## Document Metadata:
- File Name: ${documentMetadata.fileName}
- Author: ${documentMetadata.author || "Unknown"}
- Recipients: ${documentMetadata.recipients?.join(", ") || "Unknown"}
- Date: ${documentMetadata.date || "Unknown"}

## Document Content:
---
${documentText.substring(0, 15000)}
---

Analyze and return JSON only (no markdown):
{
  "isPrivileged": true,
  "privilegeType": "attorney_client",
  "confidence": 0.85,
  "basis": "Detailed explanation of why this is or is not privileged",
  "author": "Extracted author name if identifiable",
  "authorTitle": "Author's title/role if identifiable",
  "recipients": ["List", "of", "recipients"],
  "documentDate": "YYYY-MM-DD or null",
  "documentType": "Email | Memorandum | Letter | Report | Draft | Other",
  "suggestedDescription": "Brief privilege log description (1-2 sentences)"
}`;

    try {
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      const response = result.text || "";

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("[PrivilegeDetection] Failed to extract JSON from response");
        throw new Error("Failed to parse privilege analysis");
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error("[PrivilegeDetection] Error analyzing document:", error);
      throw error;
    }
  }
}
