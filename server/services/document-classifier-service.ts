import { GoogleGenAI } from "@google/genai";
import { db } from "../db";
import { 
  documentTypeDefinitions, 
  documentClassifications,
  dealChecklistItems,
  dataRoomDocuments,
  dealChecklists,
  checklistItemDocuments,
  templateItems,
  type DocumentTypeDefinition,
  type InsertDocumentClassification 
} from "@shared/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

export interface ClassificationResult {
  classification: {
    primaryType: string;
    primaryTypeName: string;
    secondaryTypes: { type: string; confidence: number }[];
    confidence: number;
    category: string;
  };
  extraction: {
    parties?: { buyer?: string; seller?: string; tenant?: string; landlord?: string };
    amounts?: { purchasePrice?: number; deposit?: number; rent?: number };
    dates?: { effectiveDate?: string; closingDate?: string; expirationDate?: string };
    metadata?: Record<string, any>;
  };
  checklistMatches: {
    id: string;
    name: string;
    confidence: number;
    slug: string;
  }[];
  autoAssigned: boolean;
  warnings: string[];
}

const CLASSIFICATION_PROMPT = `You are a legal document classification AI specialized in real estate and corporate transactions. Analyze the document content and filename to determine its type and extract key information.

## DOCUMENT TYPES

Based on the document content and filename, classify the document into one of these types:

- loi: Letter of Intent
- term_sheet: Term Sheet  
- psa: Purchase and Sale Agreement
- psa_amendment: Amendment to PSA
- title_commitment: Title Commitment
- title_policy: Title Insurance Policy
- survey: Survey
- deed: Deed (Warranty, Special Warranty, Grant, Quitclaim)
- estoppel: Tenant Estoppel Certificate
- snda: SNDA (Subordination, Non-Disturbance, Attornment)
- rent_roll: Rent Roll
- operating_statement: Operating Statement
- pro_forma: Pro Forma
- lease: Commercial Lease
- lease_amendment: Lease Amendment
- phase_i_esa: Phase I Environmental Site Assessment
- phase_ii_esa: Phase II Environmental Site Assessment
- pca: Property Condition Assessment
- appraisal: Appraisal Report
- zoning_letter: Zoning Letter/Compliance
- bill_of_sale: Bill of Sale
- assignment_of_leases: Assignment of Leases
- closing_certificate: Closing Certificate
- settlement_statement: Settlement Statement
- firpta: FIRPTA Certificate
- entity_docs: Entity Formation Documents
- good_standing: Certificate of Good Standing
- authorizing_resolution: Authorizing Resolution
- insurance_certificate: Certificate of Insurance
- loan_agreement: Loan Agreement
- mortgage: Mortgage/Deed of Trust
- tax_returns: Tax Returns
- service_contract: Service Contract
- unknown: Cannot determine document type

## RESPONSE FORMAT

Respond ONLY with valid JSON in this exact format:
{
  "classification": {
    "primaryType": "type_code",
    "confidence": 0.95,
    "alternativeTypes": [{"type": "type_code", "confidence": 0.3}]
  },
  "extraction": {
    "parties": {
      "buyer": "Name or null",
      "seller": "Name or null",
      "tenant": "Name or null",
      "landlord": "Name or null"
    },
    "amounts": {
      "purchasePrice": null,
      "deposit": null,
      "rent": null
    },
    "dates": {
      "effectiveDate": "YYYY-MM-DD or null",
      "closingDate": "YYYY-MM-DD or null",
      "expirationDate": "YYYY-MM-DD or null"
    },
    "metadata": {}
  },
  "warnings": []
}

## RULES

1. If document has signatures, it's likely EXECUTED
2. If "DRAFT" watermark or says "draft", note this in warnings
3. Amendments should be classified as amendments, not original doc type
4. Pick the most specific type that fits
5. If truly uncertain (<60% confidence), use "unknown"
6. Extract dates in ISO 8601 format (YYYY-MM-DD)
7. Extract amounts as numbers without currency symbols
8. If a field is not found, set to null`;

export class DocumentClassificationService {
  private documentTypes: DocumentTypeDefinition[] = [];

  async loadDocumentTypes(): Promise<void> {
    this.documentTypes = await db.query.documentTypeDefinitions.findMany({
      where: eq(documentTypeDefinitions.isActive, true),
    });
  }

  async classifyAndMatch(
    documentId: string,
    dealId: string,
    content: string,
    filename: string
  ): Promise<ClassificationResult> {
    await this.loadDocumentTypes();

    const filenameHints = this.getFilenameHints(filename);
    const aiClassification = await this.classifyWithAI(content, filename, filenameHints);
    const checklistMatches = await this.findChecklistMatches(dealId, aiClassification.classification.primaryType);

    let autoAssigned = false;
    if (aiClassification.classification.confidence >= 0.85 && checklistMatches.length > 0) {
      const bestMatch = checklistMatches[0];
      await this.linkDocumentToChecklistItem(documentId, bestMatch.id);
      await this.updateChecklistItemStatus(bestMatch.id, documentId);
      autoAssigned = true;
    }

    const docTypeDef = this.documentTypes.find(dt => dt.typeCode === aiClassification.classification.primaryType);
    
    const classificationRecord: InsertDocumentClassification = {
      documentId,
      dealId,
      primaryClassification: aiClassification.classification.primaryType,
      secondaryClassifications: aiClassification.classification.alternativeTypes,
      confidence: aiClassification.classification.confidence,
      matchedChecklistItemId: autoAssigned && checklistMatches.length > 0 ? checklistMatches[0].id : null,
      matchConfidence: checklistMatches.length > 0 ? checklistMatches[0].confidence : null,
      matchMethod: autoAssigned ? 'ai_classification' : null,
      extractedMetadata: aiClassification.extraction.metadata,
      extractedParties: aiClassification.extraction.parties,
      extractedDates: aiClassification.extraction.dates,
      extractedAmounts: aiClassification.extraction.amounts,
    };

    await db.insert(documentClassifications).values(classificationRecord).onConflictDoUpdate({
      target: [documentClassifications.documentId],
      set: classificationRecord,
    });

    return {
      classification: {
        primaryType: aiClassification.classification.primaryType,
        primaryTypeName: docTypeDef?.typeName || aiClassification.classification.primaryType,
        secondaryTypes: aiClassification.classification.alternativeTypes || [],
        confidence: aiClassification.classification.confidence,
        category: docTypeDef?.category || 'unknown',
      },
      extraction: aiClassification.extraction,
      checklistMatches,
      autoAssigned,
      warnings: aiClassification.warnings || [],
    };
  }

  private getFilenameHints(filename: string): string[] {
    const hints: string[] = [];
    const lower = filename.toLowerCase();
    
    for (const docType of this.documentTypes) {
      const patterns = docType.filenamePatterns as string[] | null;
      if (patterns) {
        for (const pattern of patterns) {
          try {
            if (new RegExp(pattern, 'i').test(filename)) {
              hints.push(docType.typeCode);
            }
          } catch {
          }
        }
      }
    }
    
    return hints;
  }

  private async classifyWithAI(
    content: string,
    filename: string,
    filenameHints: string[]
  ): Promise<{
    classification: { primaryType: string; confidence: number; alternativeTypes: { type: string; confidence: number }[] };
    extraction: ClassificationResult['extraction'];
    warnings: string[];
  }> {
    const truncatedContent = content.slice(0, 15000);
    
    const hintsText = filenameHints.length > 0 
      ? `\n\nFilename pattern suggests possible types: ${filenameHints.join(', ')}` 
      : '';

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
          role: "user",
          parts: [{
            text: `${CLASSIFICATION_PROMPT}

## DOCUMENT TO CLASSIFY

Filename: ${filename}${hintsText}

Content:
${truncatedContent}${content.length > 15000 ? '\n\n[Document truncated...]' : ''}`
          }]
        }],
        config: {
          temperature: 0.1,
          responseMimeType: "application/json",
        }
      });

      let responseText = '';
      if ((response as any).text) {
        responseText = (response as any).text;
      } else if ((response as any).candidates?.length) {
        for (const candidate of (response as any).candidates) {
          if (candidate.content?.parts) {
            for (const part of candidate.content.parts) {
              if (part.text) {
                responseText += part.text;
              }
            }
          }
        }
      }

      const parsed = JSON.parse(responseText);
      
      return {
        classification: {
          primaryType: parsed.classification?.primaryType || 'unknown',
          confidence: parsed.classification?.confidence || 0.5,
          alternativeTypes: parsed.classification?.alternativeTypes || [],
        },
        extraction: {
          parties: parsed.extraction?.parties || {},
          amounts: parsed.extraction?.amounts || {},
          dates: parsed.extraction?.dates || {},
          metadata: parsed.extraction?.metadata || {},
        },
        warnings: parsed.warnings || [],
      };
    } catch (error: any) {
      console.error("AI Classification failed:", error.message);
      
      return {
        classification: {
          primaryType: 'unknown',
          confidence: 0.3,
          alternativeTypes: [],
        },
        extraction: {
          parties: {},
          amounts: {},
          dates: {},
          metadata: {},
        },
        warnings: [`AI classification failed: ${error.message}`],
      };
    }
  }

  private async findChecklistMatches(
    dealId: string,
    documentType: string
  ): Promise<{ id: string; name: string; confidence: number; slug: string }[]> {
    const checklist = await db.query.dealChecklists.findFirst({
      where: eq(dealChecklists.dealId, dealId),
      with: {
        items: {
          with: {
            templateItem: true,
          },
        },
      },
    });

    if (!checklist) return [];

    const docTypeDef = this.documentTypes.find(dt => dt.typeCode === documentType);
    if (!docTypeDef) return [];

    const matches: { id: string; name: string; confidence: number; slug: string }[] = [];
    const defaultSlugs = (docTypeDef.defaultChecklistItemSlugs as string[]) || [];
    const keywords = (docTypeDef.keywords as string[]) || [];

    for (const item of checklist.items as any[]) {
      if (!item.templateItem) continue;

      const slug = item.templateItem.slug || '';
      const itemName = item.templateItem.name || '';
      
      if (defaultSlugs.includes(slug)) {
        matches.push({ id: item.id, name: itemName, confidence: 0.95, slug });
        continue;
      }

      const itemNameLower = itemName.toLowerCase();
      const matchedKeyword = keywords.find(kw => 
        itemNameLower.includes(kw.toLowerCase())
      );
      
      if (matchedKeyword) {
        matches.push({ id: item.id, name: itemName, confidence: 0.75, slug });
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  private async linkDocumentToChecklistItem(
    documentId: string,
    checklistItemId: string
  ): Promise<void> {
    const existingLink = await db.query.checklistItemDocuments.findFirst({
      where: and(
        eq(checklistItemDocuments.checklistItemId, checklistItemId),
        eq(checklistItemDocuments.documentId, documentId),
      ),
    });

    if (!existingLink) {
      await db.insert(checklistItemDocuments).values({
        checklistItemId,
        documentId,
        autoMatched: true,
        confidence: 0.85,
      });
    }
  }

  private async updateChecklistItemStatus(
    checklistItemId: string,
    documentId: string
  ): Promise<void> {
    const item = await db.query.dealChecklistItems.findFirst({
      where: eq(dealChecklistItems.id, checklistItemId),
      with: {
        templateItem: true,
        documents: true,
      },
    }) as any;

    if (!item) return;

    const requiredDocs = item.templateItem?.requiredDocumentCount || 1;
    const currentDocs = (item.documents?.length || 0) + 1;

    if (currentDocs >= requiredDocs) {
      await db.update(dealChecklistItems)
        .set({
          status: 'complete',
          satisfactionMethod: 'document',
          satisfiedAt: new Date(),
        })
        .where(eq(dealChecklistItems.id, checklistItemId));
    } else if (item.status === 'pending') {
      await db.update(dealChecklistItems)
        .set({ status: 'in_progress' })
        .where(eq(dealChecklistItems.id, checklistItemId));
    }
  }

  async reclassifyDocument(
    documentId: string,
    newClassification: string,
    userId: string
  ): Promise<void> {
    const existingClassification = await db.query.documentClassifications.findFirst({
      where: eq(documentClassifications.documentId, documentId),
    });

    if (existingClassification) {
      await db.update(documentClassifications)
        .set({
          wasReclassified: true,
          originalClassification: existingClassification.primaryClassification,
          primaryClassification: newClassification,
          reclassifiedBy: userId,
          matchMethod: 'manual',
        })
        .where(eq(documentClassifications.documentId, documentId));
    }
  }

  async getDocumentTypes(): Promise<DocumentTypeDefinition[]> {
    return db.query.documentTypeDefinitions.findMany({
      where: eq(documentTypeDefinitions.isActive, true),
    });
  }

  async getClassification(documentId: string) {
    return db.query.documentClassifications.findFirst({
      where: eq(documentClassifications.documentId, documentId),
    });
  }

  async getClassificationsForDeal(dealId: string) {
    return db.query.documentClassifications.findMany({
      where: eq(documentClassifications.dealId, dealId),
    });
  }
}

export const documentClassifierService = new DocumentClassificationService();
