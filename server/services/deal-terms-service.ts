import { GoogleGenAI } from "@google/genai";
import { db } from "../db";
import { 
  dealTerms, 
  dataRoomDocuments,
  dataRooms,
  deals,
  type InsertDealTerms,
  type DealTerms 
} from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

const DEAL_TERMS_EXTRACTION_PROMPT = `You are a legal document analyst extracting deal terms from a Letter of Intent, Term Sheet, or other preliminary agreement for a real estate transaction.

Extract all available terms into a structured format. Be thorough but don't guess - only extract what's clearly stated in the document.

## EXTRACTION CATEGORIES

### 1. Property Information
- Property name/address
- Legal description (if provided)
- Property type (office, retail, multifamily, industrial, land, etc.)
- Square footage / acreage
- Number of units (for multifamily)

### 2. Parties
- Buyer name and entity type
- Seller name and entity type
- Any mentioned representatives, brokers, or attorneys

### 3. Financial Terms
- Purchase price
- Earnest money / deposit amounts
- Deposit schedule (when deposits are due)
- When deposits go "hard" (non-refundable)

### 4. Key Dates & Periods
- Effective date
- Due diligence period (in days or specific date)
- Financing contingency period (if any)
- Closing date or timeframe

### 5. Contingencies
- Due diligence contingency details
- Financing contingency details
- Any other conditions to closing

### 6. Title & Survey
- Title objection period
- Survey requirements
- Who pays for title/survey

### 7. Representations & Warranties
- Any mentioned rep/warranty provisions
- Survival periods
- Caps or baskets

### 8. Special Conditions
- Any unique terms or conditions
- Seller deliverables
- Buyer requirements

## RESPONSE FORMAT

Respond ONLY with valid JSON in this exact format:
{
  "property": {
    "name": "string or null",
    "address": "string or null",
    "city": "string or null",
    "state": "string or null",
    "county": "string or null",
    "zip": "string or null",
    "type": "office|retail|multifamily|industrial|land|mixed_use|hospitality|null",
    "squareFeet": null,
    "acreage": "string or null",
    "units": null,
    "yearBuilt": null
  },
  "parties": {
    "buyer": {
      "name": "string or null",
      "entityType": "llc|lp|corporation|individual|trust|null",
      "stateOfFormation": "string or null",
      "address": "string or null",
      "signerName": "string or null",
      "signerTitle": "string or null"
    },
    "seller": {
      "name": "string or null",
      "entityType": "llc|lp|corporation|individual|trust|null",
      "stateOfFormation": "string or null",
      "address": "string or null",
      "signerName": "string or null",
      "signerTitle": "string or null"
    },
    "escrowAgent": {
      "name": "string or null",
      "address": "string or null",
      "contact": "string or null",
      "email": "string or null"
    }
  },
  "financial": {
    "purchasePrice": "string or null",
    "initialDeposit": "string or null",
    "initialDepositDays": null,
    "additionalDeposit": "string or null",
    "additionalDepositTrigger": "string or null"
  },
  "dates": {
    "effectiveDate": "YYYY-MM-DD or null",
    "dueDiligenceDays": null,
    "dueDiligenceExpiration": "YYYY-MM-DD or null",
    "hasFinancingContingency": false,
    "financingContingencyDays": null,
    "closingDate": "YYYY-MM-DD or null"
  },
  "titleAndSurvey": {
    "titleObjectionDays": null,
    "surveyObjectionDays": null,
    "titleCureDays": null,
    "titleInsuranceAmount": "string or null"
  },
  "repsAndWarranties": {
    "survivalMonths": null,
    "cap": "string or null",
    "basket": "string or null"
  },
  "specialConditions": [],
  "extractionNotes": [],
  "confidence": {
    "overall": 0.85,
    "lowConfidenceFields": []
  }
}

## RULES

1. Extract dates in ISO format (YYYY-MM-DD)
2. Extract dollar amounts as strings (e.g., "2,500,000" or "2.5M")
3. If a term is ambiguous, add to extractionNotes
4. If a term references another document (e.g., "per the PSA"), note this
5. Preserve exact language for legal terms where possible
6. Note if document appears to be non-binding vs binding`;

export interface DealTermsExtractionResult {
  dealTerms: Partial<InsertDealTerms>;
  extractionNotes: string[];
  confidence: {
    overall: number;
    lowConfidenceFields: string[];
  };
  success: boolean;
  error?: string;
}

export class DealTermsService {
  async extractFromDocument(
    dealId: string,
    documentId: string,
    content: string,
    sourceType: 'loi' | 'term_sheet' | 'psa_extraction' = 'loi'
  ): Promise<DealTermsExtractionResult> {
    try {
      const truncatedContent = content.slice(0, 20000);

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
          role: "user",
          parts: [{
            text: `${DEAL_TERMS_EXTRACTION_PROMPT}

## DOCUMENT TO ANALYZE

${truncatedContent}${content.length > 20000 ? '\n\n[Document truncated...]' : ''}`
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

      const dealTermsData: Partial<InsertDealTerms> = {
        dealId,
        sourceType,
        sourceDocumentId: documentId,
        propertyName: parsed.property?.name,
        propertyAddress: parsed.property?.address,
        propertyCity: parsed.property?.city,
        propertyState: parsed.property?.state,
        propertyZip: parsed.property?.zip,
        propertyCounty: parsed.property?.county,
        propertyType: parsed.property?.type,
        squareFeet: parsed.property?.squareFeet,
        acreage: parsed.property?.acreage?.toString(),
        units: parsed.property?.units,
        yearBuilt: parsed.property?.yearBuilt,
        buyerName: parsed.parties?.buyer?.name,
        buyerEntityType: parsed.parties?.buyer?.entityType,
        buyerStateOfFormation: parsed.parties?.buyer?.stateOfFormation,
        buyerAddress: parsed.parties?.buyer?.address,
        buyerSignerName: parsed.parties?.buyer?.signerName,
        buyerSignerTitle: parsed.parties?.buyer?.signerTitle,
        sellerName: parsed.parties?.seller?.name,
        sellerEntityType: parsed.parties?.seller?.entityType,
        sellerStateOfFormation: parsed.parties?.seller?.stateOfFormation,
        sellerAddress: parsed.parties?.seller?.address,
        sellerSignerName: parsed.parties?.seller?.signerName,
        sellerSignerTitle: parsed.parties?.seller?.signerTitle,
        escrowAgentName: parsed.parties?.escrowAgent?.name,
        escrowAgentAddress: parsed.parties?.escrowAgent?.address,
        escrowAgentContact: parsed.parties?.escrowAgent?.contact,
        escrowAgentEmail: parsed.parties?.escrowAgent?.email,
        purchasePrice: parsed.financial?.purchasePrice,
        initialDeposit: parsed.financial?.initialDeposit,
        initialDepositDays: parsed.financial?.initialDepositDays,
        additionalDeposit: parsed.financial?.additionalDeposit,
        additionalDepositTrigger: parsed.financial?.additionalDepositTrigger,
        effectiveDate: parsed.dates?.effectiveDate,
        dueDiligencePeriodDays: parsed.dates?.dueDiligenceDays,
        dueDiligenceExpiration: parsed.dates?.dueDiligenceExpiration,
        hasFinancingContingency: parsed.dates?.hasFinancingContingency || false,
        financingContingencyDays: parsed.dates?.financingContingencyDays,
        closingDate: parsed.dates?.closingDate,
        titleObjectionPeriodDays: parsed.titleAndSurvey?.titleObjectionDays,
        surveyObjectionPeriodDays: parsed.titleAndSurvey?.surveyObjectionDays,
        titleCurePeriodDays: parsed.titleAndSurvey?.titleCureDays,
        titleInsuranceAmount: parsed.titleAndSurvey?.titleInsuranceAmount,
        repsSurvivalMonths: parsed.repsAndWarranties?.survivalMonths,
        repsCap: parsed.repsAndWarranties?.cap,
        repsBasket: parsed.repsAndWarranties?.basket,
        specialConditions: parsed.specialConditions || [],
        additionalTerms: { extractionNotes: parsed.extractionNotes || [] },
      };

      return {
        dealTerms: dealTermsData,
        extractionNotes: parsed.extractionNotes || [],
        confidence: parsed.confidence || { overall: 0.7, lowConfidenceFields: [] },
        success: true,
      };
    } catch (error: any) {
      console.error("Deal terms extraction failed:", error);
      return {
        dealTerms: { dealId, sourceType, sourceDocumentId: documentId },
        extractionNotes: [`Extraction failed: ${error.message}`],
        confidence: { overall: 0, lowConfidenceFields: [] },
        success: false,
        error: error.message,
      };
    }
  }

  async saveDealTerms(terms: InsertDealTerms): Promise<DealTerms> {
    const existing = await db.query.dealTerms.findFirst({
      where: eq(dealTerms.dealId, terms.dealId),
    });

    if (existing) {
      const [updated] = await db.update(dealTerms)
        .set({ ...terms, updatedAt: new Date() })
        .where(eq(dealTerms.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(dealTerms).values(terms).returning();
    return created;
  }

  async getDealTerms(dealId: string): Promise<DealTerms | null> {
    const result = await db.query.dealTerms.findFirst({
      where: eq(dealTerms.dealId, dealId),
    });
    return result || null;
  }

  async updateDealTerms(id: string, updates: Partial<InsertDealTerms>): Promise<DealTerms> {
    const [updated] = await db.update(dealTerms)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dealTerms.id, id))
      .returning();
    return updated;
  }

  calculateCompletionStatus(terms: DealTerms): { complete: number; total: number; percentage: number } {
    const requiredFields = [
      'purchasePrice', 'buyerName', 'sellerName', 'propertyAddress',
      'closingDate', 'dueDiligencePeriodDays', 'initialDeposit'
    ];

    const filledFields = requiredFields.filter(f => (terms as any)[f] != null && (terms as any)[f] !== '');
    
    return {
      complete: filledFields.length,
      total: requiredFields.length,
      percentage: Math.round((filledFields.length / requiredFields.length) * 100),
    };
  }

  async extractFromAllDocuments(dealId: string): Promise<DealTermsExtractionResult> {
    const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
    if (!deal) throw new Error("Deal not found");

    const rooms = await db.select({ id: dataRooms.id })
      .from(dataRooms)
      .where(eq(dataRooms.dealId, dealId));

    if (rooms.length === 0) {
      throw new Error("No data rooms found for this deal");
    }

    const roomIds = rooms.map(r => r.id);
    const docs = await db.select()
      .from(dataRoomDocuments)
      .where(inArray(dataRoomDocuments.dataRoomId, roomIds));

    const docsWithText = docs.filter(d => d.extractedText && d.extractedText.length > 100);
    if (docsWithText.length === 0) {
      throw new Error("No documents with extracted text found. Upload and process documents first.");
    }

    const perDocLimit = Math.min(8000, Math.floor(18000 / docsWithText.length));
    const combinedText = docsWithText
      .map(d => `--- Document: ${d.fileName} ---\n${(d.extractedText || "").slice(0, perDocLimit)}`)
      .join("\n\n");

    console.log(`[DealTerms] Extracting terms from ${docsWithText.length} documents (${combinedText.length} chars) for deal "${deal.title}"`);

    const result = await this.extractFromDocument(dealId, docsWithText[0].id, combinedText, 'psa_extraction');

    if (result.success && result.dealTerms) {
      const existing = await this.getDealTerms(dealId);

      if (existing) {
        const mergedData: Record<string, any> = {};
        for (const [key, value] of Object.entries(result.dealTerms)) {
          if (key === 'dealId' || key === 'sourceType' || key === 'sourceDocumentId') continue;
          if (value != null && value !== '') {
            const existingValue = (existing as any)[key];
            if (existingValue == null || existingValue === '') {
              mergedData[key] = value;
            }
          }
        }
        if (Object.keys(mergedData).length > 0) {
          await this.updateDealTerms(existing.id, mergedData);
        }
      } else {
        await this.saveDealTerms(result.dealTerms as any);
      }
    }

    return result;
  }
}

export const dealTermsService = new DealTermsService();
