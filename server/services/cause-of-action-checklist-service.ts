import { db } from "../db";
import { 
  causesOfAction, 
  caseElements, 
  elementSearchTerms, 
  elementEvidence,
  searchTermSets,
  searchTermItems,
  communications,
  courtPleadings,
  type CauseOfAction,
  type CaseElement,
  type ElementEvidence,
  type CauseOfActionChecklist,
  type CaseElementWithEvidence,
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });

export interface GenerateChecklistResult {
  causesOfAction: CauseOfAction[];
  elements: CaseElement[];
  success: boolean;
  error?: string;
}

export interface EvidenceSuggestion {
  documentId: string;
  documentType: string;
  documentTitle: string;
  documentDate?: Date;
  classification: "supporting" | "contradicting" | "neutral";
  confidence: number;
  excerpt: string;
  excerptLocation?: string;
  reasoning: string;
}

export class CauseOfActionChecklistService {
  
  async generateChecklistFromSearchTermSet(
    caseId: string,
    searchTermSetId: string,
    userId?: string
  ): Promise<GenerateChecklistResult> {
    try {
      const [set] = await db
        .select()
        .from(searchTermSets)
        .where(and(
          eq(searchTermSets.id, searchTermSetId),
          eq(searchTermSets.caseId, caseId)
        ));
      
      if (!set) {
        return { causesOfAction: [], elements: [], success: false, error: "Search term set not found" };
      }

      if (set.sourceType !== "complaint") {
        return { causesOfAction: [], elements: [], success: false, error: "Only complaint-based search term sets can generate checklists" };
      }

      const items = await db
        .select()
        .from(searchTermItems)
        .where(eq(searchTermItems.searchTermSetId, searchTermSetId))
        .orderBy(searchTermItems.itemNumber);

      const claimItems = items.filter(item => 
        item.itemType === "complaint_claim" && !item.isPrivilegeCategory
      );

      if (claimItems.length === 0) {
        return { causesOfAction: [], elements: [], success: false, error: "No claims found in search term set" };
      }

      const createdCausesOfAction: CauseOfAction[] = [];
      const createdElements: CaseElement[] = [];

      for (const item of claimItems) {
        const existingCoa = await db
          .select()
          .from(causesOfAction)
          .where(and(
            eq(causesOfAction.caseId, caseId),
            eq(causesOfAction.searchTermItemId, item.id)
          ));

        if (existingCoa.length > 0) {
          createdCausesOfAction.push(existingCoa[0]);
          const existingElements = await db
            .select()
            .from(caseElements)
            .where(eq(caseElements.causeOfActionId, existingCoa[0].id));
          createdElements.push(...existingElements);
          continue;
        }

        const [coa] = await db
          .insert(causesOfAction)
          .values({
            caseId,
            searchTermSetId,
            searchTermItemId: item.id,
            claimNumber: item.itemNumber,
            claimType: item.causeOfAction || `Claim ${item.itemNumber}`,
            claimName: item.causeOfAction || item.summary || `Claim ${item.itemNumber}`,
            fullText: item.fullText,
            createdBy: userId,
          })
          .returning();

        createdCausesOfAction.push(coa);

        const legalElements = item.legalElements as any[] || [];
        
        for (let i = 0; i < legalElements.length; i++) {
          const elem = legalElements[i];
          const [element] = await db
            .insert(caseElements)
            .values({
              caseId,
              causeOfActionId: coa.id,
              elementNumber: elem.number || i + 1,
              elementName: elem.element || `Element ${i + 1}`,
              elementDescription: elem.description || elem.mustProve || "",
              legalStandard: elem.mustProve,
              supportingFacts: elem.supportingFacts,
              gaps: elem.gaps,
              strengthAssessment: elem.strength === "strong" ? "strong" : 
                                  elem.strength === "moderate" ? "moderate" : 
                                  elem.strength === "weak" ? "weak" : "not_evaluated",
              suggestedSearchTerms: elem.searchTerms,
              source: "ai_generated",
            })
            .returning();

          createdElements.push(element);

          if (elem.searchTerms && Array.isArray(elem.searchTerms)) {
            for (const term of elem.searchTerms) {
              await db.insert(elementSearchTerms).values({
                elementId: element.id,
                searchTermText: typeof term === "string" ? term : term.term,
                isPrimary: false,
              });
            }
          }
        }
      }

      return { 
        causesOfAction: createdCausesOfAction, 
        elements: createdElements, 
        success: true 
      };
    } catch (error) {
      console.error("[ChecklistService] Error generating checklist:", error);
      return { 
        causesOfAction: [], 
        elements: [], 
        success: false, 
        error: String(error) 
      };
    }
  }

  async generateChecklistFromDocument(
    caseId: string,
    sourceDocumentId: string,
    sourceDocumentType: string,
    userId?: string
  ): Promise<GenerateChecklistResult> {
    try {
      const [pleading] = await db
        .select()
        .from(courtPleadings)
        .where(eq(courtPleadings.id, sourceDocumentId));

      if (!pleading) {
        return { causesOfAction: [], elements: [], success: false, error: "Court pleading not found" };
      }

      const documentText = pleading.extractedText || "";
      
      if (!documentText || documentText.length < 100) {
        return { causesOfAction: [], elements: [], success: false, error: "Document has insufficient text for analysis" };
      }

      const prompt = `Analyze this legal complaint document and extract all causes of action with their required legal elements. For each element, generate FACT-SPECIFIC boolean search terms based on the actual parties, dates, events, and facts mentioned in this complaint.

DOCUMENT TEXT:
${documentText.substring(0, 15000)}

Return a JSON object with the following structure:
{
  "causes_of_action": [
    {
      "name": "Breach of Contract",
      "type": "contract", 
      "statute": "Common Law" or specific statute citation,
      "elements": [
        {
          "name": "Existence of Valid Contract",
          "description": "A valid contract must have existed between plaintiff and defendant",
          "legal_standard": "The plaintiff must prove by preponderance of evidence that a valid and enforceable contract existed",
          "search_terms": [
            "(\"Non-Compete Agreement\" OR \"Employment Agreement\") AND (\"Semper Laser\" OR \"SLH\") AND (EWC OR \"Wilmot\")",
            "(contract OR agreement) AND (sign* OR execut*) AND (\"January 2024\" OR \"2024\")"
          ]
        }
      ]
    }
  ]
}

IMPORTANT INSTRUCTIONS FOR SEARCH TERMS:
1. Each element MUST have 2-4 boolean search terms
2. Search terms MUST be FACT-SPECIFIC to this complaint - include actual:
   - Party names (plaintiffs, defendants, companies, individuals)
   - Dates and time periods mentioned in the complaint
   - Specific agreements, contracts, or documents referenced
   - Locations, addresses, or jurisdictions
   - Specific dollar amounts, percentages, or numbers
   - Product names, service descriptions, or trade secrets
   - Names of witnesses or other individuals
3. Use proper boolean syntax: AND, OR, NOT, quotation marks for phrases, wildcards (*), parentheses for grouping
4. DO NOT use generic terms like just "breach" or "contract" - always combine with specific facts from this complaint
5. Each search term should help find documents relevant to proving/disproving that specific element

CAUSE OF ACTION TYPES (use one of): contract, tort, statutory, constitutional, equitable, criminal, administrative

Focus on identifying:
1. Each distinct cause of action or claim
2. The required legal elements for each cause of action
3. Applicable statutes or common law basis
4. The legal standard/burden for each element
5. FACT-SPECIFIC boolean search terms for each element

Return ONLY valid JSON, no markdown formatting.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        return { causesOfAction: [], elements: [], success: false, error: "Failed to parse AI response" };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const createdCausesOfAction: CauseOfAction[] = [];
      const createdElements: CaseElement[] = [];

      for (let i = 0; i < parsed.causes_of_action.length; i++) {
        const coaData = parsed.causes_of_action[i];

        const [insertedCoa] = await db
          .insert(causesOfAction)
          .values({
            caseId,
            claimNumber: i + 1,
            claimName: coaData.name,
            claimType: coaData.type || "tort",
            statutoryBasis: coaData.statute,
            createdBy: userId,
          })
          .returning();

        createdCausesOfAction.push(insertedCoa);

        if (coaData.elements && Array.isArray(coaData.elements)) {
          for (let j = 0; j < coaData.elements.length; j++) {
            const elemData = coaData.elements[j];
            
            // Extract search terms from AI response
            const searchTerms = elemData.search_terms || elemData.searchTerms || [];
            
            const [insertedElement] = await db
              .insert(caseElements)
              .values({
                caseId,
                causeOfActionId: insertedCoa.id,
                elementNumber: j + 1,
                elementName: elemData.name,
                elementDescription: elemData.description || "",
                legalStandard: elemData.legal_standard,
                suggestedSearchTerms: searchTerms,
                strengthAssessment: "not_evaluated",
                createdBy: userId,
              })
              .returning();

            createdElements.push(insertedElement);
            
            // Also store search terms in the elementSearchTerms table for querying
            if (searchTerms && Array.isArray(searchTerms)) {
              for (let k = 0; k < searchTerms.length; k++) {
                const term = searchTerms[k];
                if (term && typeof term === "string") {
                  await db.insert(elementSearchTerms).values({
                    elementId: insertedElement.id,
                    searchTermText: term,
                    isPrimary: k === 0, // First term is primary
                  });
                }
              }
            }
          }
        }
      }

      return { 
        causesOfAction: createdCausesOfAction, 
        elements: createdElements, 
        success: true 
      };
    } catch (error) {
      console.error("[ChecklistService] Error generating checklist from document:", error);
      return { 
        causesOfAction: [], 
        elements: [], 
        success: false, 
        error: String(error) 
      };
    }
  }

  async getCausesOfActionForCase(caseId: string): Promise<CauseOfActionChecklist[]> {
    const coas = await db
      .select()
      .from(causesOfAction)
      .where(eq(causesOfAction.caseId, caseId))
      .orderBy(causesOfAction.claimNumber);

    const checklists: CauseOfActionChecklist[] = [];

    for (const coa of coas) {
      const elements = await db
        .select()
        .from(caseElements)
        .where(eq(caseElements.causeOfActionId, coa.id))
        .orderBy(caseElements.elementNumber);

      const elementsWithEvidence: CaseElementWithEvidence[] = [];
      let elementsSatisfied = 0;
      let criticalGaps = 0;

      for (const element of elements) {
        const evidence = await db
          .select()
          .from(elementEvidence)
          .where(eq(elementEvidence.elementId, element.id));

        const searchTermLinks = await db
          .select()
          .from(elementSearchTerms)
          .where(eq(elementSearchTerms.elementId, element.id));

        const supporting = evidence.filter(e => e.evidenceClassification === "supporting");
        const contradicting = evidence.filter(e => e.evidenceClassification === "contradicting");
        const neutral = evidence.filter(e => e.evidenceClassification === "neutral");

        if (element.strengthAssessment === "strong" || element.strengthAssessment === "moderate") {
          elementsSatisfied++;
        }
        if (element.strengthAssessment === "critical_gap") {
          criticalGaps++;
        }

        elementsWithEvidence.push({
          ...element,
          searchTermLinks,
          supportingEvidence: supporting,
          contradictingEvidence: contradicting,
          neutralEvidence: neutral,
          evidenceCounts: {
            supporting: supporting.length,
            contradicting: contradicting.length,
            neutral: neutral.length,
          },
        });
      }

      const overallStrength = elements.length > 0 
        ? Math.round((elementsSatisfied / elements.length) * 100) 
        : 0;

      checklists.push({
        id: coa.id,
        caseId: coa.caseId,
        claimNumber: coa.claimNumber,
        claimType: coa.claimType,
        claimName: coa.claimName,
        jurisdiction: coa.jurisdiction || undefined,
        statutoryBasis: coa.statutoryBasis || undefined,
        overallStrength,
        elements: elementsWithEvidence,
        elementsSatisfied,
        elementsTotal: elements.length,
        criticalGaps,
      });
    }

    return checklists;
  }

  async getCauseOfActionWithElements(coaId: string): Promise<CauseOfActionChecklist | null> {
    const [coa] = await db
      .select()
      .from(causesOfAction)
      .where(eq(causesOfAction.id, coaId));

    if (!coa) return null;

    const elements = await db
      .select()
      .from(caseElements)
      .where(eq(caseElements.causeOfActionId, coaId))
      .orderBy(caseElements.elementNumber);

    const elementsWithEvidence: CaseElementWithEvidence[] = [];
    let elementsSatisfied = 0;
    let criticalGaps = 0;

    for (const element of elements) {
      const evidence = await db
        .select()
        .from(elementEvidence)
        .where(eq(elementEvidence.elementId, element.id));

      const searchTermLinks = await db
        .select()
        .from(elementSearchTerms)
        .where(eq(elementSearchTerms.elementId, element.id));

      const supporting = evidence.filter(e => e.evidenceClassification === "supporting");
      const contradicting = evidence.filter(e => e.evidenceClassification === "contradicting");
      const neutral = evidence.filter(e => e.evidenceClassification === "neutral");

      if (element.strengthAssessment === "strong" || element.strengthAssessment === "moderate") {
        elementsSatisfied++;
      }
      if (element.strengthAssessment === "critical_gap") {
        criticalGaps++;
      }

      elementsWithEvidence.push({
        ...element,
        searchTermLinks,
        supportingEvidence: supporting,
        contradictingEvidence: contradicting,
        neutralEvidence: neutral,
        evidenceCounts: {
          supporting: supporting.length,
          contradicting: contradicting.length,
          neutral: neutral.length,
        },
      });
    }

    const overallStrength = elements.length > 0 
      ? Math.round((elementsSatisfied / elements.length) * 100) 
      : 0;

    return {
      id: coa.id,
      caseId: coa.caseId,
      claimNumber: coa.claimNumber,
      claimType: coa.claimType,
      claimName: coa.claimName,
      jurisdiction: coa.jurisdiction || undefined,
      statutoryBasis: coa.statutoryBasis || undefined,
      overallStrength,
      elements: elementsWithEvidence,
      elementsSatisfied,
      elementsTotal: elements.length,
      criticalGaps,
    };
  }

  async updateElement(
    elementId: string,
    updates: {
      strengthAssessment?: "not_evaluated" | "strong" | "moderate" | "weak" | "critical_gap";
      attorneyNotes?: string;
      elementName?: string;
      elementDescription?: string;
    }
  ): Promise<CaseElement | null> {
    const [updated] = await db
      .update(caseElements)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(caseElements.id, elementId))
      .returning();

    return updated || null;
  }

  async addEvidenceToElement(
    elementId: string,
    evidence: {
      documentType: "evidence_item" | "email" | "court_filing" | "deposition" | "exhibit" | "interview_transcript" | "external_document" | "communication" | "data_room_document";
      documentId?: string;
      externalReference?: string;
      documentTitle?: string;
      documentDate?: Date;
      evidenceClassification: "supporting" | "contradicting" | "neutral";
      excerpt?: string;
      excerptLocation?: string;
      attorneyNotes?: string;
      isKeyEvidence?: boolean;
    },
    userId?: string
  ): Promise<ElementEvidence | null> {
    const [created] = await db
      .insert(elementEvidence)
      .values({
        elementId,
        ...evidence,
        createdBy: userId,
      })
      .returning();

    return created || null;
  }

  async updateEvidence(
    evidenceId: string,
    updates: {
      evidenceClassification?: "supporting" | "contradicting" | "neutral";
      attorneyNotes?: string;
      isKeyEvidence?: boolean;
      isVerified?: boolean;
    },
    userId?: string
  ): Promise<ElementEvidence | null> {
    const [updated] = await db
      .update(elementEvidence)
      .set({
        ...updates,
        updatedAt: new Date(),
        verifiedBy: updates.isVerified ? userId : undefined,
        verifiedAt: updates.isVerified ? new Date() : undefined,
      })
      .where(eq(elementEvidence.id, evidenceId))
      .returning();

    return updated || null;
  }

  async removeEvidence(evidenceId: string): Promise<boolean> {
    const result = await db
      .delete(elementEvidence)
      .where(eq(elementEvidence.id, evidenceId));
    return true;
  }

  async findRelatedDocuments(
    caseId: string,
    elementId: string
  ): Promise<EvidenceSuggestion[]> {
    const [element] = await db
      .select()
      .from(caseElements)
      .where(eq(caseElements.id, elementId));

    if (!element) return [];

    const searchTermLinks = await db
      .select()
      .from(elementSearchTerms)
      .where(eq(elementSearchTerms.elementId, elementId));

    const searchTermTexts = searchTermLinks
      .map(link => link.searchTermText)
      .filter(Boolean) as string[];

    const existingEvidence = await db
      .select()
      .from(elementEvidence)
      .where(eq(elementEvidence.elementId, elementId));
    const existingDocIds = new Set(existingEvidence.map(e => e.documentId).filter(Boolean));

    const suggestions: EvidenceSuggestion[] = [];

    // Search communications for related content
    const comms = await db
      .select()
      .from(communications)
      .where(eq(communications.caseId, caseId))
      .limit(50);

    for (const comm of comms) {
      if (existingDocIds.has(comm.id.toString())) continue;

      const commText = `${comm.subject || ""} ${comm.content || ""}`.toLowerCase();
      const elementText = `${element.elementName} ${element.elementDescription}`.toLowerCase();
      
      const keywords = elementText.split(/\s+/).filter(w => w.length > 4);
      const matchCount = keywords.filter(kw => commText.includes(kw)).length;
      
      if (matchCount >= 2 || searchTermTexts.some(term => commText.includes(term.toLowerCase()))) {
        suggestions.push({
          documentId: comm.id.toString(),
          documentType: "communication",
          documentTitle: comm.subject || "Communication",
          documentDate: comm.timestamp || undefined,
          classification: "neutral",
          confidence: Math.min(0.9, 0.3 + (matchCount * 0.1)),
          excerpt: comm.content?.substring(0, 200) || "",
          reasoning: `Matches ${matchCount} keywords from element description`,
        });
      }
    }

    const pleadings = await db
      .select()
      .from(courtPleadings)
      .where(eq(courtPleadings.caseId, caseId))
      .limit(20);

    for (const pleading of pleadings) {
      if (existingDocIds.has(pleading.id)) continue;

      const pleadingText = `${pleading.title || ""} ${pleading.extractedText || ""}`.toLowerCase();
      const elementText = `${element.elementName} ${element.elementDescription}`.toLowerCase();
      
      const keywords = elementText.split(/\s+/).filter(w => w.length > 4);
      const matchCount = keywords.filter(kw => pleadingText.includes(kw)).length;
      
      if (matchCount >= 2) {
        suggestions.push({
          documentId: pleading.id,
          documentType: "court_filing",
          documentTitle: pleading.title || "Court Filing",
          documentDate: pleading.filingDate || undefined,
          classification: "neutral",
          confidence: Math.min(0.9, 0.3 + (matchCount * 0.1)),
          excerpt: pleading.extractedText?.substring(0, 200) || "",
          reasoning: `Matches ${matchCount} keywords from element description`,
        });
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 20);
  }

  async analyzeDocumentForElement(
    elementId: string,
    documentId: string,
    documentType: string,
    documentText: string
  ): Promise<{
    classification: "supporting" | "contradicting" | "neutral";
    confidence: number;
    excerpt: string;
    reasoning: string;
  }> {
    const [element] = await db
      .select()
      .from(caseElements)
      .where(eq(caseElements.id, elementId));

    if (!element) {
      throw new Error("Element not found");
    }

    const prompt = `You are analyzing evidence for litigation. Determine whether this document supports, contradicts, or is neutral to a specific legal element.

LEGAL ELEMENT:
Name: ${element.elementName}
Standard: ${element.elementDescription}
${element.legalStandard ? `Legal Standard: ${element.legalStandard}` : ""}
${element.mustProve ? `Must Prove: ${element.mustProve}` : ""}

DOCUMENT TEXT:
"""
${documentText.substring(0, 15000)}
"""

Analyze whether this document:
- SUPPORTING: Provides evidence that the element is satisfied
- CONTRADICTING: Provides evidence against the element
- NEUTRAL: Relevant to the case but doesn't directly affect this element

Respond in JSON format:
{
  "classification": "supporting" | "contradicting" | "neutral",
  "confidence": 0.85,
  "reasoning": "Brief explanation of why this classification...",
  "keyExcerpt": "The most relevant quote from the document (max 300 chars)..."
}`;

    try {
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          maxOutputTokens: 1024,
          temperature: 0.2,
        },
      });

      const responseText = result.text || "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        return {
          classification: "neutral",
          confidence: 0.5,
          excerpt: documentText.substring(0, 200),
          reasoning: "Could not analyze document",
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        classification: parsed.classification || "neutral",
        confidence: parsed.confidence || 0.5,
        excerpt: parsed.keyExcerpt || documentText.substring(0, 200),
        reasoning: parsed.reasoning || "AI analysis",
      };
    } catch (error) {
      console.error("[ChecklistService] Error analyzing document:", error);
      return {
        classification: "neutral",
        confidence: 0.3,
        excerpt: documentText.substring(0, 200),
        reasoning: "Error during analysis",
      };
    }
  }

  async getChecklistSummary(caseId: string): Promise<{
    claims: Array<{
      id: string;
      name: string;
      strength: number;
      elementsSatisfied: number;
      elementsTotal: number;
      criticalGaps: number;
    }>;
    overallCaseStrength: number;
    criticalGapsTotal: number;
  }> {
    const checklists = await this.getCausesOfActionForCase(caseId);

    const claims = checklists.map(coa => ({
      id: coa.id,
      name: coa.claimName,
      strength: coa.overallStrength,
      elementsSatisfied: coa.elementsSatisfied,
      elementsTotal: coa.elementsTotal,
      criticalGaps: coa.criticalGaps,
    }));

    const totalElements = claims.reduce((sum, c) => sum + c.elementsTotal, 0);
    const satisfiedElements = claims.reduce((sum, c) => sum + c.elementsSatisfied, 0);
    const overallCaseStrength = totalElements > 0 
      ? Math.round((satisfiedElements / totalElements) * 100) 
      : 0;
    const criticalGapsTotal = claims.reduce((sum, c) => sum + c.criticalGaps, 0);

    return {
      claims,
      overallCaseStrength,
      criticalGapsTotal,
    };
  }
}
